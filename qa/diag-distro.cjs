/* Diagnóstico del bug: distro + ping + labs */
const { ShellSession } = require('../src/cli/engine')
const { REGISTRY } = require('../src/cli/commands')

// 1. ¿está ping registrado?
console.log('ping registrado:', typeof REGISTRY['ping'])
console.log('total comandos en REGISTRY:', Object.keys(REGISTRY).length)

// 2. reproducir el flujo del laboratorio DNS
globalThis.__AF_DEBUG = false
const s = new ShellSession()
s.distro = 'arch'

// seed como hace rootSeed
s.state.user = 'root'
try { s.vfs.writeFile('/etc/resolv.conf', 'nameserver 10.9.9.9\noptions timeout:1\n') } catch(e) { console.log('seed err:', e.message) }
s.state.user = 'user'

// ejecutar ping 8.8.8.8
const r1 = s.execute('ping -c2 8.8.8.8')
console.log('\nping 8.8.8.8:')
for (const l of r1) console.log(`  [${l.kind}] ${l.text}`)

// ejecutar cat /etc/resolv.conf
const r2 = s.execute('cat /etc/resolv.conf')
console.log('\ncat resolv.conf:')
for (const l of r2) console.log(`  [${l.kind}] ${l.text}`)

// 3. cambiar distro y verificar gate
s.setDistro('debian')
console.log('\ndistro ahora:', s.distro)

const e1 = []
for (const t of s.execute('pacman -Q')) { if (t.kind === 'err') e1.push(t.text) }
console.log('pacman -Q err:', e1.join(''))

const o1 = []
for (const t of s.execute('apt update')) { if (t.kind === 'out') o1.push(t.text) }
console.log('apt update (sin sudo):', o1.join(' | ').slice(0, 80))

// volver a arch
s.setDistro('arch')
const o2 = []
for (const t of s.execute('pacman -Q')) { if (t.kind === 'out') o2.push(t.text) }
console.log('pacman -Q tras volver a arch:', o2.join(' ').slice(0, 60))
