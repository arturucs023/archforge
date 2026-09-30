/* Prueba la idea clave: la VM instala los .apk servidos por el propio sitio,
   usando el backend "fetch" de v86.

   Por que deberia funcionar: v86 traduce las peticiones HTTP del invitado a
   fetch() del navegador. Como los .apk se sirven desde el MISMO origen que la
   pagina, el navegador no aplica CORS y no hace falta relay de terceros.

   Uso: node tools/test-vm-fetchpkgs.mjs [segundos] [base-url] */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { V86 } from 'v86'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const VM = path.join(ROOT, 'public', 'vm')
const BUDGET = Number(process.argv[2] ?? 280)
const BASE = process.argv[3] ?? 'http://127.0.0.1:8080/archforge'
const isoSize = fs.statSync(path.join(VM, 'alpine.iso')).size

const pkgs = JSON.parse(fs.readFileSync(path.join(VM, 'pkgs', 'pkgs.json'), 'utf8'))
let serial = ''
const t0 = Date.now()
const at = () => `+${((Date.now() - t0) / 1000).toFixed(0)}s`

let fetchCalls = 0
const NativeWS = globalThis.WebSocket
class TracingWS extends NativeWS {
  constructor(...a) { super(...a); this.addEventListener('error', () => {}) }
}
globalThis.WebSocket = TracingWS
const nativeFetch = globalThis.fetch
globalThis.fetch = function (input, init) {
  const u = typeof input === 'string' ? input : input?.url ?? String(input)
  if (String(u).includes('.apk')) {
    fetchCalls++
    console.log(`[fetch] ${at()} ${u}`)
  }
  return nativeFetch.apply(this, arguments)
}

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
  // Backend fetch: el navegador hace las descargas. Sin relay ni terceros.
  net_device: { type: 'virtio', relay_url: 'fetch' },
})

emulator.add_listener('serial0-output-byte', (v) => {
  if (typeof v === 'number') serial += String.fromCharCode(v)
})

const send = (c) => { console.log(`[>] ${c.slice(0, 70)} (${at()})`); emulator.serial0_send(c + '\r') }

let entered = false
let started = false
const urls = pkgs.files.map((f) => `${BASE}/vm/pkgs/${f}`).join(' ')

const drive = setInterval(() => {
  if (!entered && /login:/i.test(serial)) { entered = true; send('root'); return }
  if (entered && !started && /:~#/m.test(serial)) {
    started = true
    console.log(`[+] shell (${at()})`)
    // El backend fetch tambien necesita la interfaz arriba y con IP: sin esto
    // el invitado no tiene ruta y wget falla con "Network unreachable".
    send('ip link set eth0 up')
    setTimeout(() => send('udhcpc -i eth0 -q -t 20 -T 4 -A 2'), 4000)
    setTimeout(() => send('ip -o addr show eth0 | tr -s " "'), 25000)
    // Descargar con wget y luego instalar desde disco: apk con URLs sueltas
    // las trata como nombres de paquete si no hay indice de donde sacarlas.
    setTimeout(() => send(`cd /tmp && wget -q -T 25 ${urls} ; ls -l /tmp/*.apk`), 35000)
    setTimeout(() => send('apk add --allow-untrusted /tmp/nano-9.2-r0.apk /tmp/vim-9.2.1091-r0.apk 2>&1 | tail -8'), 110000)
    setTimeout(() => send('which nano vim less'), 160000)
    setTimeout(() => send('nano --version | head -1; vim --version | head -1'), 180000)
  }
}, 400)

console.log(`Base: ${BASE}\nPresupuesto: ${BUDGET}s\n`)

setTimeout(() => {
  clearInterval(drive)
  console.log('\n=========== PANTALLA FINAL ===========')
  console.log(serial.slice(-3000))
  console.log('======================================')
  console.log(`\nfetch() de .apk   : ${fetchCalls}`)
  console.log(`wget descarga ok   : ${/WGET_FAIL/.test(serial) ? 'NO' : 'si'}`)
  console.log(`nano en /usr/bin   : ${/\/usr\/bin\/nano/.test(serial) ? 'SI' : 'no'}`)
  console.log(`vim en /usr/bin    : ${/\/usr\/bin\/vim/.test(serial) ? 'SI' : 'no'}`)
  process.exit(0)
}, BUDGET * 1000)

process.on('unhandledRejection', (e) => { console.error('[v86]', e); process.exit(1) })