/* Prueba de la configuracion de red, con reintentos y verificacion.

   Secuencia probada y razonada, no adivinada:
   - El kernel virt de Alpine lleva virtio_net COMPILADO (no es modulo), asi
     que no hace falta modprobe y este falla con "module not found".
   - Por tanto: levantar la interfaz y pedir IP con margenes amplios.
   - udhcpc se reintenta si tras el primer intento no hay IP.
   - Se mide con wget (TCP), no con ping (ICMP): los relays no reenvian ICMP.

   Uso: node tools/test-vm-net2.mjs [segundos] [relay-url] */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { V86 } from 'v86'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const VM = path.join(ROOT, 'public', 'vm')
const BUDGET = Number(process.argv[2] ?? 300)
const RELAY = process.argv[3] ?? 'wss://relay.widgetry.org/'
const isoSize = fs.statSync(path.join(VM, 'alpine.iso')).size

let serial = ''
const marks = []
const NativeWS = globalThis.WebSocket
let wsOpened = false
class TracingWS extends NativeWS {
  constructor(...a) {
    super(...a)
    this.addEventListener('open', () => { wsOpened = true; console.log(`[ws] relay abierto +${((Date.now() - t0) / 1000).toFixed(1)}s`) })
    this.addEventListener('error', () => console.log('[ws] error'))
  }
}
globalThis.WebSocket = TracingWS
const t0 = Date.now()
const at = () => `+${((Date.now() - t0) / 1000).toFixed(1)}s`

const emulator = new V86({
  wasm_path: path.join(VM, 'v86.wasm'),
  memory_size: 64 * 1024 * 1024,
  vga_memory_size: 2 * 1024 * 1024,
  bios: { url: path.join(VM, 'seabios.bin') },
  vga_bios: { url: path.join(VM, 'vgabios.bin') },
  cdrom: { url: path.join(VM, 'alpine.iso'), async: true, size: isoSize },
  autostart: true,
  boot_order: 0x123,
  disable_speaker: true,
  disable_mouse: true,
  net_device: { type: 'virtio', relay_url: RELAY },
})

emulator.add_listener('serial0-output-byte', (v) => {
  if (typeof v === 'number') serial += String.fromCharCode(v)
})

const send = (c) => { console.log(`[>] ${c}  (${at()})`); emulator.serial0_send(c + '\r') }

let entered = false
let started = false

const drive = setInterval(() => {
  if (!entered && /login:/i.test(serial)) {
    entered = true
    send('root')
    return
  }
  if (entered && !started && /:~#/m.test(serial)) {
    started = true
    console.log(`[+] shell listo (${at()})`)
    // Sin modprobe: virtio_net ya esta en el kernel. Margen amplio para DHCP.
    send('ip link set eth0 up')
    setTimeout(() => send('udhcpc -i eth0 -q -t 25 -T 5 -A 3'), 4000)
    setTimeout(() => { marks.push(['addr', serial.slice(-700)]); send('ip -o addr show eth0 | tr -s " "') }, 45000)
    setTimeout(() => { marks.push(['route', serial.slice(-500)]); send('ip route') }, 52000)
    // wget = TCP de verdad. ping = ICMP, que el relay no reenvia.
    setTimeout(() => send('wget -q -T 25 -O /dev/null http://dl-cdn.alpinelinux.org/alpine/ && echo TCP_OK || echo TCP_FAIL'), 60000)
    setTimeout(() => send('ping -c 2 -W 3 10.5.14.1 2>&1 | tail -2'), 95000)
    setTimeout(() => send('nslookup dl-cdn.alpinelinux.org 2>&1 | tail -4'), 115000)
  }
}, 400)

console.log(`Relay: ${RELAY}\nPresupuesto: ${BUDGET}s\n`)

setTimeout(() => {
  clearInterval(drive)
  console.log('\n=============== PANTALLA FINAL ===============')
  console.log(serial.slice(-3000))
  console.log('==============================================')
  console.log(`\nrelay abierto: ${wsOpened ? 'si' : 'no'}`)
  console.log(`lease DHCP   : ${/lease of/i.test(serial) ? 'CONCEDIDA' : 'no'}`)
  const ip = /lease of (\d+\.\d+\.\d+\.\d+)/i.exec(serial)
  if (ip) console.log(`IP            : ${ip[1]}`)
  console.log(`ruta default  : ${/default via/i.test(serial) ? 'si' : 'no'}`)
  console.log(`TCP (wget)    : ${/TCP_OK/.test(serial) ? 'OK' : /TCP_FAIL/.test(serial) ? 'FALLO' : 'sin respuesta'}`)
  process.exit(0)
}, BUDGET * 1000)

process.on('unhandledRejection', (e) => { console.error('[v86]', e); process.exit(1) })