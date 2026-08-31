import { ShellSession } from '../src/cli/engine'
import { uncoveredCommands } from '../src/cli/help'

const s = new ShellSession()
const out = s.execute('help')
const text = out.map((l) => l.text).join('\n')

let fails = 0
const ok = (c: boolean, label: string) => { if (!c) fails++; console.log(`${c ? 'ok  ' : 'FALLO'} ${label}`) }

ok(out.some((l) => l.kind === 'out' && l.text.includes('Comandos disponibles')), 'help existe y responde')
for (const cmd of ['systemctl', 'journalctl', 'dig', 'nslookup', 'ss -tulpn', 'ssh-copy-id', 'pacman', 'grep', 'chmod']) {
  ok(text.includes(cmd), `help lista: ${cmd}`)
}
// en arch no deben aparecer los ítems exclusivos de debian
const archText = out.map((l) => l.text).join('\n')
ok(!/  apt update/.test(archText), 'arch oculta ítems de apt (gate por distro)')

const d = new ShellSession(); d.setDistro('debian')
const dt = d.execute('help').map((l) => l.text).join('\n')
ok(dt.includes('apt update'), 'ubuntu muestra apt')
ok(!/\bpacman -Syu/.test(dt), 'ubuntu oculta pacman')

const extraArch = uncoveredCommands('arch')
console.log('sin cubrir (arch):', extraArch.join(', ') || '(ninguno)')
ok(extraArch.length <= 2, 'cobertura de grupos casi completa')
ok(extraArch.every((c) => !['systemctl','journalctl','dig','nslookup','ss','ssh','ssh-keygen','ssh-copy-id'].includes(c)), 'los comandos nuevos están representados en help')

// el autocompletado también debe conocer systemctl
const comp = s.complete('syst')
ok(comp?.value.includes('systemctl') ?? false, 'autocompletado conoce systemctl')

console.log(fails === 0 ? '\nHELP + LISTA COMANDOS: TODO OK' : `\n${fails} FALLOS`)
process.exit(fails === 0 ? 0 : 1)
