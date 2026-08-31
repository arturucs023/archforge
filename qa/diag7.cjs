const { ShellSession } = require('../src/cli/engine')
globalThis.__AF_DEBUG = true
const h = new ShellSession()
h.execute("printf '#!/usr/bin/env bash\\nnombre=\"${1:-mundo}\"\\necho \"Hola, $nombre\"\\n' > scripts/hello2.sh")
h.execute('chmod +x scripts/hello2.sh')
console.log('── run sin args')
for (const l of h.execute('./scripts/hello2.sh')) console.log(`  [${l.kind}] ${l.text}`)
console.log('── run con args')
for (const l of h.execute('./scripts/hello2.sh ArchForge')) console.log(`  [${l.kind}] ${l.text}`)
globalThis.__AF_DEBUG = false
