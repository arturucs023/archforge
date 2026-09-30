/* Comprueba si se pueden instalar paquetes SIN internet, leyendo el repositorio
   que la propia ISO de Alpine trae en el CD.

   Si funciona, el laboratorio podria incluir nano/vim/tar/gzip sin depender del
   relay ni de apk add por red: mucho mas rapido y sin trafico de terceros.

   Uso: node tools/test-vm-pkgs.mjs [segundos] */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { V86 } from 'v86'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const VM = path.join(ROOT, 'public', 'vm')
const BUDGET = Number(process.argv[2] ?? 280)
const isoSize = fs.statSync(path.join(VM, 'alpine.iso')).size

let serial = ''
const t0 = Date.now()
const at = () => `+${((Date.now() - t0) / 1000).toFixed(0)}s`

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
  // Aislada a proposito: queremos probar que el CD basta por si solo.
  net_device: { type: 'virtio', relay_url: 'inbrowser' },
})

emulator.add_listener('serial0-output-byte', (v) => {
  if (typeof v === 'number') serial += String.fromCharCode(v)
})

const send = (c) => { console.log(`[>] ${c} (${at()})`); emulator.serial0_send(c + '\r') }

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
    console.log(`[+] shell (${at()})`)
    // 1) Que repositorio apunta la ISO
    send('cat /etc/apk/repositories')
    setTimeout(() => send('ls /media/ 2>&1; ls /media/cdrom/apks 2>&1 | head -3'), 4000)
    // 2) Si el CD trae repo, instalar desde ahi sin tocar la red
    setTimeout(() => send('apk add --no-network nano vim tar gzip 2>&1 | tail -12'), 9000)
    // 3) Comprobacion
    setTimeout(() => send('which nano vim tar gzip; echo "---"; nano --version | head -1'), 60000)
    setTimeout(() => send('vim --version | head -1; tar --version | head -1'), 95000)
  }
}, 400)

console.log(`Presupuesto: ${BUDGET}s — red AISLADA (inbrowser)\n`)

setTimeout(() => {
  clearInterval(drive)
  console.log('\n=========== PANTALLA FINAL ===========')
  console.log(serial.slice(-3200))
  console.log('======================================')
  console.log(`\nrepo en el CD     : ${/media\/cdrom/.test(serial) ? 'SI' : 'no'}`)
  console.log(`nano instalado    : ${/\/usr\/bin\/nano/.test(serial) ? 'si' : 'no'}`)
  console.log(`vim instalado     : ${/\/usr\/bin\/vim/.test(serial) ? 'si' : 'no'}`)
  console.log(`tar/gzip          : ${/\/usr\/bin\/(tar|gzip)/.test(serial) ? 'si' : 'no'}`)
  process.exit(0)
}, BUDGET * 1000)

process.on('unhandledRejection', (e) => { console.error('[v86]', e); process.exit(1) })