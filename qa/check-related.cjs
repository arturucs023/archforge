/* QA iteración 6: verificar enlaces related apuntan a ids existentes */
import { COMMANDS } from '../src/data/cmdcenter/entries'

const have = new Set(COMMANDS.map((c) => c.id))
let bad = 0
for (const c of COMMANDS) {
  for (const r of (c as { related?: string[] }).related ?? []) {
    if (!have.has(r)) {
      bad++
      console.error('related roto:', c.id, '→', r)
    }
  }
}
if (bad > 0) process.exit(1)
console.log('todos los related OK')
