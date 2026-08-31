const fs = require('fs')
const p = 'src/data/cmdcenter/entries.ts'
let s = fs.readFileSync(p, 'utf8')

// ── 1. recategorizar comandos MOVIDOS a las nuevas categorías ──
const moves = {
  find: 'busqueda', locate: 'busqueda', grep: 'busqueda',
  which: 'busqueda',
  ps: 'monitorizacion', top: 'monitorizacion', htop: 'monitorizacion', btop: 'monitorizacion',
  free: 'monitorizacion', uptime: 'monitorizacion', vmstat: 'monitorizacion', df: 'monitorizacion', du: 'monitorizacion',
  journalctl: 'logs', dmesg: 'logs',
  stat: 'diagnostico', file: 'diagnostico',
  lspci: 'hardware', lsusb: 'hardware', lscpu: 'hardware',
  history: 'bash-shell', alias: 'bash-shell', export: 'bash-shell', unset: 'bash-shell',
  env: 'bash-shell', printenv: 'bash-shell', type: 'bash-shell', command: 'bash-shell',
}
let movedCount = 0
for (const [id, newCat] of Object.entries(moves)) {
  const re = new RegExp("(id: '" + id + "',[^\\n]*cat: ')([a-z-]+)(')")
  if (re.test(s)) { s = s.replace(re, '$1' + newCat + '$3'); movedCount++ }
}

// ── 2. importar los comandos EXTRA y exportar la unión ──
s = s.replace(
  "import type { CommandEntry } from './meta'",
  "import type { CommandEntry } from './meta'\nimport { EXTRA_COMMANDS } from './entries-extra'"
)
// renombrar array actual y exportar la unión al final
s = s.replace('export const COMMANDS: CommandEntry[] = [', 'const CORE_COMMANDS: CommandEntry[] = [')
if (!s.includes('EXTRA_COMMANDS } from')) console.error('IMPORT FALLÓ')

// cerrar: sustituir el ÚLTIMO ']' de cierre del array por la exportación
const lastBracket = s.lastIndexOf(']')
s = s.slice(0, lastBracket) + ']\n\nexport const COMMANDS: CommandEntry[] = [...CORE_COMMANDS, ...EXTRA_COMMANDS]\n'

fs.writeFileSync(p, s)
console.log('movidos:', movedCount, '| union export:', s.includes('...CORE_COMMANDS, ...EXTRA_COMMANDS'))
