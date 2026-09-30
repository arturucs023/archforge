/* Diagnostico de red DENTRO de Alpine: pregunta al propio invitado cual es el
   estado de su interfaz, sus rutas y su DNS. Es la unica forma fiable de
   saber por que falla, porque desde fuera solo vemos tramas.

   Comprueba tambien si hay TCP real (apk va por TCP; ping usa ICMP, que los
   relays suelen bloquear — no sirve como prueba de internet).

   Uso: node tools/test-vm-net-diag.mjs [segundos] [relay-url] */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { V86 } from 'v86'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const VM = path.join(ROOT, 'public', 'vm')
const BUDGET = Number(process.argv[2] ?? 260)
const RELAY = process.argv[3] ?? 'wss://relay.widgetry.org/'
const isoSize = fs.statSync(path.join(VM, 'alpine.iso')).size

let serial = ''
let stage = 0
const answers = {}

const NativeWS = globalThis.WebSocket
let wsOpened = false
class TracingWS extends NativeWS {
  constructor(...a) {
    super(...a)
    this.addEventListener('open', () => { wsOpened = true; console.log(`[ws] relay abierto`) })
    this.addEventListener('error', () => console.log('[ws] error'))
  }
}
globalThis.WebSocket = TracingWS

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

/* Secuencia: primero login, luego reconocimiento (que interfaz hay?), y solo
   despues la configuracion — porque si la interfaz no se llama eth0, hacer
   "ip link set eth0 up" a ciegas es perder el tiempo. */
const PROBE = 'ip -o link show'
const CONFIGURE = [
  'modprobe virtio_net',
  'setup-interfaces -a -r 2>&1 | tail -5',
  'udhcpc -i eth0 -n -q -t 10 -T 3 2>&1 | tail -8',
]
const CHECKS = [
  'ip -o addr show | tr -s " "',
  'ip route',
  'cat /etc/resolv.conf',
  'wget -q -T 20 -O- http://dl-cdn.alpinelinux.org/alpine/ >/dev/null && echo TCP_OK || echo TCP_FAIL',
]

let entered = false
let probeDone = false
let iface = 'eth0'
let cfgAt = 0

const send = (c) => emulator.serial0_send(c + '\r')

const drive = setInterval(() => {
  if (!entered && /login:/i.test(serial)) {
    entered = true
    console.log('[+] login')
    send('root')
    return
  }
  if (entered && !probeDone && /:~#/m.test(serial)) {
    probeDone = true
    console.log('[+] shell -> reconociendo interfaces')
    send(PROBE)
    return
  }
  // Al ver la salida del probe, tomamos el nombre real de la interfaz
  if (probeDone && stage === 0 && /link/.test(serial.slice(-800))) {
    const m = /(\d+):\s+([a-z0-9]+):/.exec(serial.slice(-800))
    if (m && m[2] !== 'lo') {
      iface = m[2]
      console.log(`[+] interfaz detectada: ${iface}`)
      stage = 1
      cfgAt = Date.now()
      send(`modprobe virtio_net`)
      setTimeout(() => send(`setup-interfaces -a -r 2>&1 | tail -3`), 5000)
      setTimeout(() => send(`udhcpc -i ${iface} -n -q -t 10 -T 3 2>&1 | tail -8`), 14000)
      setTimeout(() => {
        CHECKS.forEach((c, i) => setTimeout(() => { answers[c] = ''; send(c) }, i * 9000))
      }, 40000)
    }
  }
}, 400)

console.log(`Relay: ${RELAY}\nPresupuesto: ${BUDGET}s\n`)

setTimeout(() => {
  clearInterval(drive)
  console.log('\n================ PANTALLA DEL INVITADO ================')
  console.log(serial.slice(-2600))
  console.log('=====================================================')
  console.log(`\nrelay abierto : ${wsOpened}`)
  console.log(`interfaz usada: ${iface}`)
  console.log(`contiene TCP_OK: ${/TCP_OK/.test(serial) ? 'si' : 'no'}`)
  console.log(`contiene TCP_FAIL: ${/TCP_FAIL/.test(serial) ? 'si' : 'no'}`)
  process.exit(0)
}, BUDGET * 1000)

process.on('unhandledRejection', (e) => { console.error('[v86]', e); process.exit(1) })