const { ShellSession } = require('../src/cli/engine')
function dump(s, label) {
  console.log('──', label)
  for (const l of s.drain()) console.log(`  [${l.kind}] ${l.text}`)
}
const b = new ShellSession()
b.execute("echo 'hola mundo hola' | sed 's/hola/hey/g'")
dump(b, 'sed g pipeline')

const c = new ShellSession()
c.execute("sed -i.bak 's/bob/robert/g' projects/data.txt")
dump(c, 'sed -i.bak')

const d = new ShellSession()
d.execute("awk '{print $1}' projects/data.txt")
dump(d, 'awk')

const e2 = new ShellSession()
e2.execute('N=7')
e2.execute('echo "$((N*6))"')
dump(e2, 'arith')

const h = new ShellSession()
h.execute("printf '#!/usr/bin/env bash\\nnombre=\"${1:-mundo}\"\\necho \"Hola, $nombre\"\\n' > scripts/hello2.sh")
h.execute('chmod +x scripts/hello2.sh')
h.execute('./scripts/hello2.sh')
h.execute('./scripts/hello2.sh ArchForge')
dump(h, 'script con chmod')
