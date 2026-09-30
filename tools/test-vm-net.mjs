/* Prueba de extremo a extremo: arranca Alpine, entra como root, carga el driver
   virtio_net y comprueba si la VM consigue salir a internet por el relay.

   Es la prueba que decide si la casilla "internet" sirve de algo.

   Uso: node tools/test-vm-net.mjs [segundos] [relay-url] */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { V86 } from 'v86'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const VM = path.join(ROOT, 'public', 'vm')
const BUDGET = Number(process.argv[2] ?? 200)
const RELAY = process.argv[3] ?? 'wss://relay.widgetry.org/'
const isoSize = fs.statSync(path.join(VM, 'alpine.iso')).size

/* Instrumentamos WebSocket: v86 solo abre conexion cuando el invitado manda
   su primer paquete, asi que saber si se abre es la senal de que la NIC ya
   esta hablando con el relay. */
const NativeWS = globalThis.WebSocket
let wsOpened = false
class TracingWS extends NativeWS {
  constructor(...args) {
    super(...args)
    this.addEventListener('open', () => { wsOpened = true; console.log(`[ws] relay abierto -> ${args[0]}`) })
    this.addEventListener('error', () => console.log(`[ws] error -> ${args[0]}`))
  }
}
globalThis.WebSocket = TracingWS

let serial = ''
let entered = false
let sent = false
let netPackets = 0
const kinds = { arp: 0, ip: 0, udp: 0, tcp: 0 }

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

emulator.add_listener('net0-send', (b) => {
  if (!b) return
  netPackets++
  const eth = (b[12] << 8) | b[13]
  if (eth === 0x0806) kinds.arp++
  else if (eth === 0x0800) {
    kinds.ip++
    const proto = b[23]
    if (proto === 17) kinds.udp++
    else if (proto === 6) kinds.tcp++
  }
})

/* Mismo guion que VmBrowserLab: login automatico y carga del driver. */
const SETUP = ['modprobe virtio_net', 'ip link set eth0 up', 'udhcpc -i eth0 -q -t 8 -T 2']

const drive = setInterval(() => {
  if (!entered && /login:/i.test(serial)) {
    entered = true
    console.log('[+] login -> root')
    emulator.serial0_send('root\r')
    return
  }
  if (entered && !sent && /:~#/m.test(serial)) {
    sent = true
    console.log('[+] shell listo -> cargando driver de red')
    SETUP.forEach((c, i) => setTimeout(() => emulator.serial0_send(c + '\r'), 1500 + i * 6000))
  }
}, 400)

console.log(`Relay : ${RELAY}`)
console.log(`Presupuesto: ${BUDGET}s\n`)

setTimeout(() => {
  clearInterval(drive)
  console.log('\n--- Diagnostico de red ---')
  console.log(`login automatico  : ${sent ? 'si' : 'no'}`)
  console.log(`relay abierto     : ${wsOpened ? 'si' : 'NO'}`)
  console.log(`tramas de la VM   : ${netPackets}`)
  console.log(`  ARP / IP / UDP / TCP : ${kinds.arp} / ${kinds.ip} / ${kinds.udp} / ${kinds.tcp}`)

  // Si el invitado escribio una IP, el DHCP del relay funciono.
  const ip = /lease of (\d+\.\d+\.\d+\.\d+)/i.exec(serial)
  if (ip) console.log(`IP obtenida por DHCP: ${ip[1]}`)

  const ok = wsOpened && netPackets > 0
  console.log(ok
    ? '\nRESULTADO: OK — la VM tiene red a traves del relay'
    : '\nRESULTADO: FALLO — la VM sigue sin salida')
  process.exit(ok ? 0 : 1)
}, BUDGET * 1000)

process.on('unhandledRejection', (e) => {
  console.error('[v86] error no capturado:', e)
  process.exit(1)
})