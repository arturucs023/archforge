const { ShellSession } = require('../src/cli/engine')
function dump(s, label) {
  console.log('──', label)
  for (const l of s.drain()) console.log(`  [${l.kind}] ${l.text}`)
}

// lab08 exacto
const a = new ShellSession()
a.execute("sed -i.bak 's/bob/robert/g' projects/data.txt")
dump(a, 'lab08 sed')
try { console.log('data:', JSON.stringify(a.vfs.readFile('/home/user/projects/data.txt'))) } catch (e) { console.log('read err', e.message) }
console.log('bak exists:', !!a.vfs.get('/home/user/projects/data.txt.bak'))

// scriptarg
const h = new ShellSession()
h.execute("printf '#!/usr/bin/env bash\\nnombre=\"${1:-mundo}\"\\necho \"Hola, $nombre\"\\n' > scripts/hello2.sh")
h.execute('chmod +x scripts/hello2.sh')
dump(h, 'tras chmod')
h.execute('./scripts/hello2.sh')
dump(h, 'run sin args')
h.execute('./scripts/hello2.sh ArchForge')
dump(h, 'run con args')

// arith
const n = new ShellSession()
n.execute('N=7')
n.execute('echo "$((N*6))"')
dump(n, 'arith')

// awk cond
const w = new ShellSession()
w.execute("awk '$3 >= 78 {print $2}' projects/data.txt")
dump(w, 'awk cond')
