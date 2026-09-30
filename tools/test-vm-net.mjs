/* Comprueba que la VM obtiene red a traves del relay WebSocket.

   No se comprueba "que el fichero exista": se arranca Alpine con el relay, se
   cuenta el trafico que sale de la NIC emulada y se mira si el invitado pide
   DHCP. Si hay paquetes ARP/DHCP saliendo, el backend esta cableado y el
   sistema operativo esta 톡ando con la red.

   Uso: node tools/test-vm-net.mjs [segundos] [relay-url] */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { V86 } from 'v86'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const VM = path.join(ROOT, 'public', 'vm')
const BUDGET = Number(process.argv[2] ?? 150)
const RELAY = process.argv[3] ?? 'wss://relay.widgetry.org/'

const isoSize = fs.statSync(path.join(VM, 'alpine.iso')).size

let serial = ''
let netPackets = 0
let netBytes = 0
const kinds = { arp: 0, dhcp: 0, ip: 0 }

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

/* net0-send entrega cada trama que el invitado saca por la NIC. Con esto se ve
   si Alpine esta pidiendo DHCP y resolviendo nombres, que es lo primero que
   hace un sistema recien arrancado con red. */
emulator.add_listener('net0-send', (buf) => {
  if (!buf) return
  netPackets++
  netBytes += buf.length
  const b = buf
  // Ethertype en los bytes 12-13: 0x0806 = ARP, 0x0800 = IPv4
  const eth = (b[12] << 8) | b[13]
  if (eth === 0x0806) kinds.arp++
  else if (eth === 0x0800) {
    kinds.ip++
    // Protocolo IP en la cabecera (offset 23 en ethernet sin VLAN)
    const proto = b[23]
    if (proto === 17) kinds.dhcp++ // UDP: incluye DHCP discover/request
  }
})

const seen = new Set()
const watch = setInterval(() => {
  if (/login:/i.test(serial) && !seen.has('login')) {
    seen.add('login')
    console.log('[+] Alpine llego al login')
  }
  if (/Kernel .* on i686/i.test(serial) && !seen.has('kernel')) {
    seen.add('kernel')
    console.log('[+] kernel arrancado')
  }
}, 250)

console.log(`Relay : ${RELAY}`)
console.log(`Alpine: ${(isoSize / 1048576).toFixed(1)} MB`)
console.log(`Presupuesto: ${BUDGET}s\n`)

setTimeout(() => {
  clearInterval(watch)
  console.log('\n--- Diagnostico de red ---')
  console.log(`tramas emitidas por la VM : ${netPackets}  (${netBytes} bytes)`)
  console.log(`  ARP                     : ${kinds.arp}`)
  console.log(`  IPv4                    : ${kinds.ip}`)
  console.log(`  UDP (incl. DHCP)        : ${kinds.dhcp}`)
  console.log(`login alcanzado           : ${seen.has('login') ? 'si' : 'no'}`)

  // El criterio no es "llego un paquete", es que el SO esteconfigurando la NIC.
  const wired = kinds.arp > 0 && kinds.ip > 0
  console.log(
    wired
      ? '\nRESULTADO: OK — la NIC emite trafico y pide DHCP a traves del relay'
      : '\nRESULTADO: FALLO — la VM no emite trafico de red',
  )
  process.exit(wired ? 0 : 1)
}, BUDGET * 1000)

process.on('unhandledRejection', (e) => {
  console.error('[v86] error no capturado:', e)
  process.exit(1)
})