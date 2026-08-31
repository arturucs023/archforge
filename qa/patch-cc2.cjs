const fs = require('fs')
const p = 'src/pages/CommandCenterPage.tsx'
let s = fs.readFileSync(p, 'utf8')

// extraer el bloque de imports que quedó a mitad de archivo
const startMarker = "\nimport { COMMANDS } from '../data/cmdcenter/entries'"
const start = s.indexOf(startMarker)
if (start === -1) { console.error('no marker'); process.exit(1) }
// encontrar el final: última línea de import consecutiva
const end = s.indexOf("\n\ntype Tab =", start)
const importBlock = s.slice(start, end)
s = s.slice(0, start) + s.slice(end)

// insertar tras la línea 4 (imports de meta)
const anchor = "import type { CatId } from '../data/cmdcenter/meta'\n"
const anchorIdx = s.indexOf(anchor) + anchor.length
s = s.slice(0, anchorIdx) + importBlock.trimStart() + '\n' + s.slice(anchorIdx)

fs.writeFileSync(p, s)
console.log('imports movidos al inicio:', s.indexOf('COMMANDS } from') < s.indexOf('const PKG_CONCEPTS'))
