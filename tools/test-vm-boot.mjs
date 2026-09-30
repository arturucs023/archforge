/* Prueba de arranque real: levanta la ISO de Alpine en v86, lee su pantalla de
   texto y comprueba que llega al login.

   No es un simulacro — es el mismo emulador WebAssembly que corre en la web,
   con la misma ISO, servido por HTTP como en GitHub Pages. Si el kernel llega
   al prompt aqui, tambien llegara en el navegador.

   Uso:
     node tools/serve-pages.cjs                              (en otra terminal)
     node tools/test-vm-boot.mjs [segundos] [base-url]
*/
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { V86 } from 'v86'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const isoSize = fs.statSync(path.join(ROOT, 'public', 'vm', 'alpine.iso')).size
const BUDGET = Number(process.argv[2] ?? 240)
const BASE = process.argv[3] ?? 'http://127.0.0.1:8080/archforge'

/* v86 en modo sin ventana emite 'screen-set-size' y 'screen-put-char' en vez
   de pintar un canvas, asi que reconstruimos la consola de texto a mano. */
let cols = 80
let rows = 25
const screen = []

function put(row, col, chr) {
  // El emulador puede escribir antes de que llegue 'screen-set-size', asi que
  // las filas se crean bajo demanda en lugar de fiarse del evento.
  while (screen.length <= row) screen.push(new Array(cols))
  if (!screen[row]) screen[row] = new Array(cols)
  if (col >= cols) return
  screen[row][col] = chr >= 32 && chr < 127 ? String.fromCharCode(chr) : ' '
}
function dump() {
  return screen.map((r) => (r || []).join('').replace(/\s+$/, '')).filter((l) => l.length)
}

console.log(`Alpine  : ${(isoSize / 1048576).toFixed(1)} MB`)
console.log(`Servidor: ${BASE}`)
console.log(`Presupuesto: ${BUDGET}s\n`)

const VM = path.join(ROOT, 'public', 'vm')

/* En Node v86 resuelve TODOS los recursos con fs.readFile (no usa fetch), asi
   que aqui van rutas de disco. El camino por HTTP con peticiones por rango que
   usa el navegador se comprueba aparte con tools/serve-pages.cjs, que ya
   responde 206 igual que GitHub Pages. */
const emulator = new V86({
  wasm_path: path.join(VM, 'v86.wasm'),
  memory_size: 64 * 1024 * 1024,
  vga_memory_size: 2 * 1024 * 1024,
  bios: { url: path.join(VM, 'seabios.bin') },
  vga_bios: { url: path.join(VM, 'vgabios.bin') },
  cdrom: { url: path.join(VM, 'alpine.iso'), async: true, size: isoSize },
  autostart: true,
  boot_order: 0x123, // CD primero
  disable_speaker: true,
  disable_mouse: true,
  disable_keyboard: false,
})

/* Contadores y volcados: si la pantalla sale vacia hay que saber si el
   emulador esta pintando o si el kernel paso a un modo que no emite texto. */
let chars = 0
let resizes = 0
let serial = ''
let lastSerialAt = 0

emulator.add_listener('screen-set-size', ([w, h]) => {
  cols = w; rows = h
  resizes++
  console.log(`[v86] screen-set-size -> ${w}x${h} (${resizes})`)
  screen.length = 0
  for (let i = 0; i < h; i++) screen.push(new Array(w))
})

emulator.add_listener('screen-put-char', ([row, col, chr]) => {
  chars++
  put(row, col, chr)
})

/* Puerto serie: si el kernel se configura con console=ttyS0, aqui sale. */
emulator.add_listener('serial0-output-byte', (v) => {
  if (typeof v === 'number') serial += String.fromCharCode(v)
  lastSerialAt = Date.now()
})

emulator.add_listener('emulator-ready', () => console.log('[v86] emulador listo'))
emulator.add_listener('emulator-started', () => console.log('[v86] ejecucion iniciada\n'))
emulator.add_listener('download-error', (e) => console.error('[v86] error de descarga:', e))

const poll = setInterval(() => {
  // El kernel de Alpine imprime por el puerto serie (ttyS0) y su framebuffer
  // pasa a modo grafico, asi que la senal de vida fiable es la serie.
  if (/login:/i.test(serial)) loggedIn = true
}, 400)

/* Senales de arranque de Alpine, en el orden en que aparecen. */
const MARKS = [
  [/Welcome to Alpine/i, 'banner de Alpine por serie'],
  [/Kernel .* on i686/i, 'kernel arrancado en i686'],
  [/login:/i, 'prompt de login'],
]

/* Los avisos se comprueban a intervalos, no en cada tick: solo lo que no se ha
   visto todavia. */
const watchSerial = setInterval(() => {
  for (const [re, label] of MARKS) {
    if (re.test(serial) && !seen.has(label)) {
      seen.add(label)
      console.log(`[+] ${label}`)
    }
  }
}, 400)

const seen = new Set()
let loggedIn = false

/* En Alpine no hay contrasena: basta con escribir root y pulsar Enter. */
const login = setInterval(() => {
  if (!loggedIn) return
  clearInterval(login)
  console.log('[>] enviando login root...')
  emulator.keyboard_send_text('root')
  emulator.keyboard_send_keys([0x1c])
  setTimeout(() => {
    emulator.keyboard_send_text('uname -srm; cat /etc/alpine-release')
    emulator.keyboard_send_keys([0x1c])
  }, 6000)
}, 800)

setTimeout(() => {
  clearInterval(poll); clearInterval(watchSerial); clearInterval(login)
  console.log('\n--- Diagnostico ---')
  console.log(`caracteres escritos : ${chars}`)
  console.log(`cambios de pantalla: ${resizes}  (${cols}x${rows})`)
  console.log(`bytes por serie    : ${serial.length}`)
  console.log('\n--- Pantalla final ---')
  console.log(dump().join('\n') || '(vacia)')
  if (serial) {
    console.log('\n--- Puerto serie ---')
    console.log(serial.slice(-1500))
  }
  console.log('--- Fin ---')
  console.log(
    loggedIn
      ? '\nRESULTADO: OK — Alpine arranca y muestra login'
      : '\nRESULTADO: FALLO — no se alcanzo el login',
  )
  process.exit(loggedIn ? 0 : 1)
}, BUDGET * 1000)

/* autostart:true ya arranca el emulador cuando esta listo. Llamar a run()
   aqui competiria con esa inicializacion asincrona (el wasm todavia no ha
   llegado) y aborta con this.v86 undefined. */
process.on('unhandledRejection', (e) => {
  console.error('[v86] error no capturado:', e)
  process.exit(1)
})