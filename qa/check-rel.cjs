const { COMMANDS } = require('../src/data/cmdcenter/entries')

const have = new Set(COMMANDS.map((c) => c.id))
let bad = 0
for (const c of COMMANDS) {
  const rel = c.related || []
  for (const r of rel) {
    if (!have.has(r)) {
      bad++
      console.error('related roto:', c.id, '→', r)
    }
  }
}
if (bad > 0) { console.error(bad, 'rotos'); process.exit(1) }
console.log('todos los related OK')
