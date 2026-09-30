/* Comprueba que se puede escribir DENTRO de Alpine por el teclado emulado y
   que el shell responde. De esto depende que se pueda automatizar la
   configuracion de red (modprobe virtio_net) al arrancar.

   Envio "root" + Enter y despues "uname -s" + Enter, y leo lo que el
   invitado responde por el puerto serie.

   Uso: node tools/test-vm-input.mjs [segundos] */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { V86 } from 'v86'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const VM = path.join(ROOT, 'public', 'vm')
const BUDGET = Number(process.argv[2] ?? 170)
const isoSize = fs.statSync(path.join(VM, 'alpine.iso')).size

let serial = ''
let loggedIn = false
let sentLogin = false
let sentCmd = false

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
})

emulator.add_listener('serial0-output-byte', (v) => {
  if (typeof v === 'number') serial += String.fromCharCode(v)
})

/* IMPORTANTE: el login de Alpine corre en ttyS0, o sea lee del PUERTO SERIE.
   keyboard_send_text/scancodes van al teclado PS/2, que alimenta la consola
   VGA — otro canal distinto. Para escribir en un terminal serie hay que usar
   serial0_send. Esto es justo lo que hace la consola xterm del navegador al
   pulsar una tecla, asi que el usuario final si puede escribir. */
const type = (line) => emulator.serial0_send(line + '\r')

let sawShell = false

const drive = setInterval(() => {
  if (!loggedIn && /login:/i.test(serial)) {
    loggedIn = true
    console.log('[+] login detectado — escribiendo "root" por el puerto serie')
    setTimeout(() => type('root'), 1500)
    return
  }
  if (loggedIn && !sentLogin && /:~#/m.test(serial)) {
    sentLogin = true
    console.log('[+] shell conseguido — enviando comando')
    setTimeout(() => type('uname -srm'), 2000)
    sentCmd = true
  }
  if (sentCmd && !sawShell && /Linux/i.test(serial.slice(-300))) {
    sawShell = true
    console.log('[+] el invitado respondio al comando')
  }
}, 400)

console.log(`Presupuesto: ${BUDGET}s — arrancando...\n`)

setTimeout(() => {
  clearInterval(drive)
  console.log('\n--- Diagnostico de teclado ---')
  console.log(`login enviado : ${sentLogin}`)
  console.log(`comando enviado: ${sentCmd}`)
  console.log(`respuesta     : ${sawShell ? 'si' : 'no'}`)
  console.log('\n--- ultimos 600 chars del puerto serie ---')
  console.log(serial.slice(-600))
  console.log('--- fin ---')
  console.log(sawShell ? '\nRESULTADO: OK — se puede escribir en el invitado' : '\nRESULTADO: FALLO — no hay entrada de teclado')
  process.exit(sawShell ? 0 : 1)
}, BUDGET * 1000)

process.on('unhandledRejection', (e) => {
  console.error('[v86] error no capturado:', e)
  process.exit(1)
})