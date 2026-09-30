/* Resuelve el cierre de dependencias de los paquetes extra de la VM y los descarga.

   Contexto: la ISO alpine-virt no trae nano ni vim. En vez de pedirlos por red
   (lento y con relay de por medio), se inyectan en la propia ISO (ver
   tools/build-custom-iso.sh) y la VM los instala desde el CD, sin internet.

   Que hace este script (funciona en cualquier SO, solo necesita red al CDN):
   1. Lee el APKINDEX de la ISO base (extraido con wsl-list-apks / CI) para
      saber que YA esta disponible en el CD.
   2. Baja el APKINDEX de main + community (x86, 3.24) y construye el mapa
      nombre/provides -> paquete.
   3. BFS desde los paquetes pedidos, siguiendo D: (dependencias).
   4. Resta lo que ya trae la ISO: solo descarga lo NUEVO.
   5. Descarga los .apk a public/vm/extra-pkgs/ + manifiesto extra-pkgs.json.

   Uso: node tools/resolve-vm-pkgs.mjs [--force]
        node tools/resolve-vm-pkgs.mjs --iso-index <ruta APKINDEX.tar.gz> */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'public', 'vm', 'extra-pkgs')
const SERIES = '3.24'
const ARCH = 'x86'

/* Paquetes pedidos por el usuario. "man" no existe como paquete: el binario
   /usr/bin/man lo da mandoc y las paginas el paquete man-pages. */
const WANTED = [
  'vim', 'nano', 'zip', 'bzip2', 'gzip', 'tree',
  'mandoc', 'man-pages', 'htop', 'curl', 'git',
]
const REPOS = ['main', 'community']

const force = process.argv.includes('--force')
const isoIndexArg = process.argv.indexOf('--iso-index')
const ISO_INDEX = isoIndexArg >= 0
  ? path.resolve(process.argv[isoIndexArg + 1])
  : path.join(process.env.TEMP ?? '/tmp', 'opencode', 'iso-APKINDEX.tar.gz')

/* APKINDEX.tar.gz es un TAR con gzip: saca el fichero APKINDEX de dentro. */
function extractApkIndex(buf) {
  let off = 0
  while (off + 512 <= buf.length) {
    const name = buf.toString('utf8', off, off + 100).replace(/\0.*$/, '').trim()
    const sizeField = buf.toString('latin1', off + 124, off + 136).replace(/\0.*$/, '').trim()
    const size = parseInt(sizeField, 8) || 0
    const dataStart = off + 512
    if (name === 'APKINDEX' || name.endsWith('/APKINDEX')) {
      return buf.toString('latin1', dataStart, dataStart + size)
    }
    off = dataStart + Math.ceil(size / 512) * 512
  }
  throw new Error('APKINDEX no encontrado dentro del tar')
}

function parseIndex(text) {
  return text.split('\n\n').filter((r) => /^P:/m.test(r)).map((rec) => {
    const get = (k) => {
      const m = new RegExp(`^${k}:(.+)$`, 'm').exec(rec)
      return m ? m[1].trim() : ''
    }
    return {
      p: get('P'),
      v: get('V'),
      size: Number(get('S') || 0),
      deps: get('D').split(/\s+/).filter(Boolean),
      provides: get('p').split(/\s+/).filter(Boolean).map((s) => s.split('=')[0]),
    }
  })
}

async function fetchIndex(repo) {
  const url = `https://dl-cdn.alpinelinux.org/alpine/v${SERIES}/${repo}/${ARCH}/APKINDEX.tar.gz`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`APKINDEX ${repo}: HTTP ${res.status}`)
  return parseIndex(extractApkIndex(gunzipSync(Buffer.from(await res.arrayBuffer()))))
}

/* Un token de dependencia puede llevar version (musl>=1.2) o ser un provide
   (so:lib.so.1, cmd:foo, /bin/sh). Devuelve el nombre base para buscar. */
function depKey(token) {
  if (token.startsWith('!')) return null // conflicto: no se descarga
  return token.split(/[<>=~]/)[0]
}

const isoText = extractApkIndex(gunzipSync(fs.readFileSync(ISO_INDEX)))
const isoNames = new Set(parseIndex(isoText).map((r) => r.p))
console.log(`La ISO base ya trae ${isoNames.size} paquetes`)

const byName = new Map() // P -> record
const byProvide = new Map() // provide -> record
for (const repo of REPOS) {
  const recs = await fetchIndex(repo)
  console.log(`Indice ${repo}: ${recs.length} paquetes`)
  for (const r of recs) {
    if (!byName.has(r.p)) byName.set(r.p, { ...r, repo })
    for (const pv of r.provides) {
      if (!byProvide.has(pv)) byProvide.set(pv, r.p)
    }
  }
}

/* BFS del cierre */
const closure = new Map() // P -> record
const queue = [...WANTED]
const unresolved = new Set()
while (queue.length) {
  const name = queue.shift()
  if (closure.has(name) || isoNames.has(name)) continue
  const rec = byName.get(name)
  if (!rec) {
    // Puede ser un provide (so:, cmd:) en vez de un nombre de paquete
    const provider = byProvide.get(name)
    if (provider && !closure.has(provider) && !isoNames.has(provider)) {
      queue.push(provider)
    } else if (!provider) {
      unresolved.add(name)
    }
    continue
  }
  closure.set(name, rec)
  for (const d of rec.deps) {
    const key = depKey(d)
    if (!key || closure.has(key) || isoNames.has(key)) continue
    if (byName.has(key)) queue.push(key)
    else {
      const provider = byProvide.get(key)
      if (provider) queue.push(provider)
      else unresolved.add(key)
    }
  }
}

console.log(`\nCierre total: ${closure.size} paquetes nuevos (la ISO cubre el resto)`)
if (unresolved.size) {
  console.log('Sin resolver (se asume preinstalado en el live: busybox, musl...):')
  for (const u of unresolved) console.log(`  ? ${u}`)
}

/* Descarga */
fs.mkdirSync(OUT, { recursive: true })
let total = 0
const files = []
for (const [name, rec] of [...closure.entries()].sort(([a], [b]) => a.localeCompare(b))) {
  const file = `${name}-${rec.v}.apk`
  const url = `https://dl-cdn.alpinelinux.org/alpine/v${SERIES}/${rec.repo}/${ARCH}/${file}`
  const dest = path.join(OUT, file)
  if (!force && fs.existsSync(dest) && fs.statSync(dest).size === rec.size) {
    console.log(`  = ${file} ya estaba`)
  } else {
    process.stdout.write(`  > ${file} (${(rec.size / 1024).toFixed(0)} KB) ... `)
    const r = await fetch(url)
    if (!r.ok) throw new Error(`${file}: HTTP ${r.status}`)
    fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer()))
    process.stdout.write('listo\n')
  }
  files.push(file)
  total += rec.size
}

const manifest = { alpine: SERIES, arch: ARCH, wanted: WANTED, files, bytes: total }
fs.writeFileSync(path.join(OUT, 'extra-pkgs.json'), JSON.stringify(manifest, null, 2))
console.log(`\n${files.length} paquetes, ${(total / 1048576).toFixed(2)} MB en public/vm/extra-pkgs/`)
