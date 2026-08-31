const { ShellSession } = require('../src/cli/engine')
globalThis.__AF_DEBUG = true
const w = new ShellSession()
w.execute("awk '$3 >= 78 {print $2}' projects/data.txt")
for (const l of w.drain()) console.log(`  [${l.kind}] ${l.text}`)
