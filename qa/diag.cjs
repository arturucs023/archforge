const { ShellSession } = require('../src/cli/engine')

function dump(s, label) {
  console.log('──', label)
  for (const l of s.drain()) console.log(`  [${l.kind}] ${l.text}`)
}

// caso 1: touch+ls
const a = new ShellSession()
for (const c of ['mkdir t1', 'cd t1', 'touch archivo.txt', 'ls']) a.execute(c)
dump(a, 'touch+ls')
console.log('fs keys:', Object.keys(a.serialize().vfs.nodes).filter((k) => k.includes('t1')))

// caso 2: sed
const b = new ShellSession()
b.execute("sed 's/bob/robert/' projects/data.txt")
dump(b, 'sed básico')

// caso 3: awk
const c = new ShellSession()
c.execute("awk '{print $1}' projects/data.txt")
dump(c, 'awk print $1')

// caso 4: grep | wc
const d = new ShellSession()
d.execute('grep -i error /var/log/app.log | wc -l')
dump(d, 'grep|wc')

// caso 5: >>
const e = new ShellSession()
e.execute("echo 'línea única' > redir.txt")
e.execute("echo 'segunda' >> redir.txt")
e.execute('wc -l redir.txt')
dump(e, 'redirecciones')

// caso 6: variables y $( )
const f = new ShellSession()
f.execute('CURSO=Bash')
f.execute('echo "curso=$CURSO"')
dump(f, 'variables')
const g = new ShellSession()
g.execute('ARCH=$(date +%Y)')
g.execute('echo "año=$ARCH"')
dump(g, 'command subst')

// caso 7: script
const h = new ShellSession()
h.execute('printf \'#!/usr/bin/env bash\\nnombre="${1:-mundo}"\\necho "Hola, $nombre"\\n\' > scripts/hello2.sh')
h.execute('./scripts/hello2.sh')
dump(h, 'script default')
