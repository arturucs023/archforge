const { ShellSession } = require('../src/cli/engine')
;globalThis.__AF_DEBUG = true
const h = new ShellSession()
h.execute("printf '#!/usr/bin/env bash\\nnombre=\"${1:-mundo}\"\\necho \"Hola, $nombre\"\\n' > scripts/hello2.sh")
h.execute('cat scripts/hello2.sh')
h.execute('./scripts/hello2.sh')
for (const l of h.drain()) console.log(`  [${l.kind}] ${l.text}`)
;globalThis.__AF_DEBUG = false
