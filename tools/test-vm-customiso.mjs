/* Verifica la ISO personalizada: arranca, ve extra-pkgs en el CD e instala
   TODO sin red (inbrowser). Si esto sale, los paquetes estan "dentro".

   Uso: node tools/test-vm-customiso.mjs [segundos] [ruta-iso] */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { V86 } from 'v86'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const VM = path.join(ROOT, 'public', 'vm')
const BUDGET = Number(process.argv[2] ?? 300)
const ISO = process.argv[3] ?? 'C:/Users/Artur/AppData/Local/Temp/opencode/alpine-custom.iso'
const isoSize = fs.statSync(ISO).size
const t0 = Date.now()
const at = () => `+${((Date.now() - t0) / 1000).toFixed(0)}s`

let serial = ''
const emulator = new V86({
  wasm_path: path.join(VM, 'v86.wasm'),
  memory_size: 256 * 1024 * 1024, // igual que el navegador: evita falsos ENOSPC
  vga_memory_size: 2 * 1024 * 1024,
  bios: { url: path.join(VM, 'seabios.bin') },
  vga_bios: { url: path.join(VM, 'vgabios.bin') },
  cdrom: { url: ISO, async: false },
  autostart: true,
  boot_order: 0x123,
  disable_speaker: true,
  disable_mouse: true,
  net_device: { type: 'virtio', relay_url: 'inbrowser' }, // SIN red a proposito
})

emulator.add_listener('serial0-output-byte', (v) => {
  if (typeof v === 'number') serial += String.fromCharCode(v)
})
const send = (c) => { console.log(`[>] ${c.slice(0, 80)} (${at()})`); emulator.serial0_send(c + '\r') }

let entered = false
let started = false
const drive = setInterval(() => {
  if (!entered && /login:/i.test(serial)) { entered = true; send('root'); return }
  if (entered && !started && /:~#/m.test(serial)) {
    started = true
    console.log(`[+] shell (${at()})`)
    send('ls /media/cdrom/extra-pkgs/ | wc -l')
    setTimeout(() => send('apk add --allow-untrusted --force-non-repository --no-network /media/cdrom/extra-pkgs/*.apk 2>&1 | tail -6'), 8000)
    setTimeout(() => send('which vim nano zip tree htop curl git man'), 90000)
    setTimeout(() => send('vim --version | head -1; nano --version | head -1; git --version'), 100000)
  }
}, 400)

console.log(`ISO: ${(isoSize / 1048576).toFixed(1)} MB\nPresupuesto: ${BUDGET}s (SIN red)\n`)

setTimeout(() => {
  clearInterval(drive)
  console.log('\n=========== PANTALLA FINAL ===========')
  console.log(serial.slice(-2800))
  console.log('======================================')
  const checks = {
    'extra-pkgs en CD': /extra-pkgs/.test(serial),
    'apk instalo': /OK:/.test(serial) && !/ERROR/.test(serial.slice(-1500)),
    'vim': /\/usr\/bin\/vim/.test(serial),
    'nano': /\/usr\/bin\/nano/.test(serial),
    'git': /git version/.test(serial),
  }
  for (const [k, v] of Object.entries(checks)) console.log(`${v ? '[+]' : '[-]'} ${k}`)
  console.log(Object.values(checks).every(Boolean) ? '\nRESULTADO: OK' : '\nRESULTADO: FALLO')
  process.exit(Object.values(checks).every(Boolean) ? 0 : 1)
}, BUDGET * 1000)
process.on('unhandledRejection', (e) => { console.error('[v86]', e); process.exit(1) })
