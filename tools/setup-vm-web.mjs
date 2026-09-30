/* Descarga los recursos que necesita el laboratorio VM en el navegador (v86).
   No se versionan en git: los baja el build de GitHub Pages.

   Uso: node tools/setup-vm-web.mjs            (descarga lo que falte)
        node tools/setup-vm-web.mjs --force    (redescarga todo)

   Recursos en public/vm/:
     v86.wasm      — modulo WebAssembly del emulador (copiado de node_modules)
     seabios.bin   — BIOS del emulador
     vgabios.bin   — BIOS de video
     alpine.iso    — Alpine Linux virt 3.24 (live, arranca sin instalar) */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'public', 'vm')

/* IMPORTANTE — la ISO debe ser de 32 bits (x86), no x86_64.
   v86 emula una CPU x86 de 32 bits: no implementa las extensiones de 64 bits.
   Con la ISO de 64 bits el kernel se detiene al arrancar con
   "This kernel requires an x86-64 CPU, but only detected an i686 CPU".
   La variante i386 de Alpine pesa además menos (~49 MB). */
const ALPINE_SERIES = '3.24'
const ALPINE_VERSION = '3.24.2'
const ALPINE_ISO = `alpine-virt-${ALPINE_VERSION}-x86.iso`
const ALPINE_URL = `https://dl-cdn.alpinelinux.org/alpine/v${ALPINE_SERIES}/releases/x86/${ALPINE_ISO}`

const FILES = [
  { name: 'seabios.bin', url: 'https://raw.githubusercontent.com/copy/v86/master/bios/seabios.bin' },
  { name: 'vgabios.bin', url: 'https://raw.githubusercontent.com/copy/v86/master/bios/vgabios.bin' },
  { name: 'alpine.iso', url: ALPINE_URL },
]

const force = process.argv.includes('--force')
fs.mkdirSync(OUT, { recursive: true })

function fmt(bytes) {
  return bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`
}

async function download(name, url) {
  const dest = path.join(OUT, name)

  if (!force && fs.existsSync(dest) && fs.statSync(dest).size > 0) {
    console.log(`  = ${name} ya existe (${fmt(fs.statSync(dest).size)})`)
    return
  }

  process.stdout.write(`  > ${name} ... `)
  const res = await fetch(url, { redirect: 'follow' })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`)

  const total = Number(res.headers.get('content-length') ?? 0)
  const tmp = dest + '.part'
  const out = fs.createWriteStream(tmp)
  let got = 0
  let lastTick = 0

  for await (const chunk of res.body) {
    got += chunk.length
    if (!out.write(chunk)) await new Promise((r) => out.once('drain', r))
    // Imprime progreso como mucho cada 250 ms para no inundar la salida
    const now = Date.now()
    if (now - lastTick > 250) {
      lastTick = now
      const pct = total ? Math.round((got / total) * 100) : 0
      process.stdout.write(`\r  > ${name} ${pct}% (${fmt(got)})   `)
    }
  }
  await new Promise((r) => out.end(r))
  fs.renameSync(tmp, dest)
  console.log(`\r  > ${name} listo — ${fmt(fs.statSync(dest).size)}        `)
}

/* El .wasm del emulador viaja con el paquete npm: lo copiamos a public/
   para servirlo como fichero estatico y que v86 lo cargue por URL. */
function copyWasm() {
  const src = path.join(ROOT, 'node_modules', 'v86', 'build', 'v86.wasm')
  const dest = path.join(OUT, 'v86.wasm')
  if (!fs.existsSync(src)) throw new Error('falta node_modules/v86 — ejecuta npm install primero')
  fs.copyFileSync(src, dest)
  console.log(`  > v86.wasm copiado — ${fmt(fs.statSync(dest).size)}`)
}

console.log('Preparando recursos del laboratorio VM (v86 + Alpine)\n')
copyWasm()
for (const f of FILES) await download(f.name, f.url)

/* v86 necesita el tamano exacto de la ISO para poder pedirla por rangos
   (GitHub Pages responde 206). En vez de dejar el numero a mano —que se
   desincroniza en cuanto Alpine publica otra version— lo escribimos aqui
   y el frontend lo lee de este manifiesto. */
const isoPath = path.join(OUT, 'alpine.iso')
const manifest = {
  alpine: ALPINE_VERSION,
  isoBytes: fs.statSync(isoPath).size,
  wasmBytes: fs.statSync(path.join(OUT, 'v86.wasm')).size,
}
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2))
console.log(`\nListo. Imagen: ${ALPINE_ISO} (Alpine ${ALPINE_VERSION})`)
console.log(`Tamano ISO registrado: ${manifest.isoBytes} bytes`)
console.log(`Total en disco: ${fmt(fs.readdirSync(OUT).reduce((n, f) => n + fs.statSync(path.join(OUT, f)).size, 0))}`)