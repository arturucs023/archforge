const { ShellSession } = require('../src/cli/engine')

function dump(s, label) {
  console.log('──', label)
  for (const l of s.drain()) console.log(`  [${l.kind}] ${l.text}`)
}

const b = new ShellSession()
b.execute("echo 'hola mundo hola' | sed 's/hola/hey/g'")
dump(b, 'sed g global')

const c = new ShellSession()
c.execute("awk '{print $1}' projects/data.txt")
dump(c, 'awk print $1')

const d = new ShellSession()
d.execute('ls /usr/bin | grep sed')
dump(d, 'pipe ls|grep')

const e2 = new ShellSession()
e2.execute('N=7')
e2.execute('echo "$((N*6))"')
dump(e2, 'aritmetica')

const f = new ShellSession()
f.execute('ARCH=$(date +%Y)')
f.execute('echo "año=$ARCH"')
dump(f, 'cmdsub')

const h = new ShellSession()
h.execute('printf \'#!/usr/bin/env bash\\nnombre="${1:-mundo}"\\necho "Hola, $nombre"\\n\' > scripts/hello2.sh')
h.execute('./scripts/hello2.sh')
dump(h, 'script default')

const i2 = new ShellSession()
i2.execute('chmod +x notes.txt && ls -l notes.txt')
dump(i2, 'chmod +x')
