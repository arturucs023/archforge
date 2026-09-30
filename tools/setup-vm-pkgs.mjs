/* Descarga los .apk que la VM instalara al arrancar.

   Por que estan en el sitio y no en la ISO: la imagen alpine-virt no incluye
   nano ni vim (apk add --no-network nano vim -> "no such package"), y meterlos
   dentro de la ISO obligaria a reconstruirla.

   Que se sirvan por HTTP y no en un disco: v86 tiene un backend "fetch" que
   traduce las peticiones HTTP del invitado a fetch() del navegador. Como los
   ficheros estan en el MISMO origen que la pagina (GitHub Pages), el navegador
   no aplica CORS y no hace falta ningun relay de terceros.

   Uso: node tools/setup-vm-pkgs.mjs [--force] */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'public', 'vm', 'pkgs')
const SERIES = '3.24'

/* alpine-virt ya trae busybox, que cubre tar y gzip. Faltan los editores y
   las utilidades que el usuario quiere para practicar. */
const WANTED = [
  { name: 'nano', repo: 'main' },
  { name: 'vim', repo: 'community' },
  { name: 'less', repo: 'main' },
  { name: 'nano-syntax', repo: 'community' },
]

const force = process.argv.includes('--force')
fs.mkdirSync(OUT, { recursive: true })

/* APKINDEX.tar.gz es un TAR comprimido: hay que quitar el gzip y luego sacar
   el fichero APKINDEX de dentro del tar (encabezado de 512 bytes). */
function extractApkIndex(buf) {
  let off = 0
  while (off + 512 <= buf.length) {
    const name = buf.toString('utf8', off, off + 100).replace(/\0.*$/, '').trim()
    const sizeField = buf.toString('latin1', off + 124, off + 136).replace(/\0.*$/, '').trim()
    const size = parseInt(sizeField, 8) || 0
    const dataStart = off + 512
    if (name === 'APKINDEX') return buf.toString('latin1', dataStart, dataStart + size)
    off = dataStart + Math.ceil(size / 512) * 512
  }
  throw new Error('APKINDEX no encontrado dentro del tar')
}

async function resolve(repo, name) {
  const url = `https://dl-cdn.alpinelinux.org/alpine/v${SERIES}/${repo}/x86/APKINDEX.tar.gz`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`APKINDEX ${repo}: HTTP ${res.status}`)
  const text = extractApkIndex(gunzipSync(Buffer.from(await res.arrayBuffer())))
  const rec = text.split('\n\n').find((r) => new RegExp(`^P:${name}$`, 'm').test(r))
  if (!rec) throw new Error(`no encuentro ${name} en ${repo}`)
  // El indice no trae el nombre de fichero: se compone con P + V, que es la
  // convencion de Alpine: nano-9.2-r0.apk
  const version = /^V:(.+)$/m.exec(rec)?.[1]?.trim()
  if (!version) throw new Error(`${name}: el registro no trae version`)
  const file = `${name}-${version}.apk`
  return {
    file,
    version,
    size: Number(/^S:(\d+)$/m.exec(rec)?.[1] ?? 0),
    url: `https://dl-cdn.alpinelinux.org/alpine/v${SERIES}/${repo}/x86/${file}`,
  }
}

console.log('Descargando paquetes extra para la VM:\n')
let total = 0
const files = []

for (const w of WANTED) {
  let meta
  try {
    meta = await resolve(w.repo, w.name)
  } catch (e) {
    console.log(`  ! ${w.name}: ${e.message} (se omite)`)
    continue
  }
  const dest = path.join(OUT, meta.file)
  if (force || !fs.existsSync(dest) || fs.statSync(dest).size !== meta.size) {
    process.stdout.write(`  > ${meta.file} (${(meta.size / 1024).toFixed(0)} KB) ... `)
    const r = await fetch(meta.url)
    if (!r.ok) throw new Error(`${meta.file}: HTTP ${r.status}`)
    fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer()))
    process.stdout.write('listo\n')
  } else {
    console.log(`  = ${meta.file} ya estaba`)
  }
  files.push(meta.file)
  total += meta.size
}

/* apk resuelve dependencias leyendo el indice; por defecto busca en el repo.
   Con --allow-untrusted acepta los .apk sueltos que le pasemos por URL. */
const manifest = { alpine: SERIES, arch: 'x86', files, bytes: total }
fs.writeFileSync(path.join(OUT, 'pkgs.json'), JSON.stringify(manifest, null, 2))

console.log(`\nTotal: ${(total / 1024).toFixed(0)} KB en ${files.length} paquetes`)
console.log(`URL base: <sitio>/vm/pkgs/`)
console.log(`Instalar en la VM: apk add --allow-untrusted <url>/nano-<ver>.apk <url>/vim-<ver>.apk ...`)