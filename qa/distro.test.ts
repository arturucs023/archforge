/* QA iteración 7: cambio de distribución reactivo, aislamiento de comandos,
   gestores de paquetes, y verificación de seguridad. */
import { ShellSession } from '../src/cli/engine'
import { LABS } from '../src/cli/labs'
import { isPkgInstalled } from '../src/cli/packages'
import { COMMANDS } from '../src/data/cmdcenter/entries'

let failures = 0
const fail = (m: string) => { failures++; console.error('FALLO ' + m) }
const ok = (m: string) => console.log('ok   ' + m)

function collect(s: ShellSession, ...lines: string[]): string {
  let acc = ''
  for (const l of lines) for (const t of s.execute(l)) acc += `[${t.kind}] ${t.text}\n`
  return acc
}
function outOf(s: ShellSession, ...lines: string[]): string {
  let acc = ''
  for (const l of lines) for (const t of s.execute(l)) if (t.kind === 'out') acc += t.text + '\n'
  return acc
}
function errOf(s: ShellSession, ...lines: string[]): string {
  let acc = ''
  for (const l of lines) for (const t of s.execute(l)) if (t.kind === 'err') acc += t.text + '\n'
  return acc
}

/* ─────────── CAMBIO DE DISTRIBUCIÓN REACTIVO SIN RECARGA ─────────── */

{
  const s = new ShellSession()
  s.distro = 'arch'

  // Arch: pacman funciona
  const q1 = outOf(s, 'pacman -Q')
  if (!q1.includes('linux')) fail('arch pacman -Q no lista paquetes'); else ok('arch: pacman -Q funciona')

  // cambiar a Ubuntu SIN recargar
  s.distro = 'debian'
  // pacman ya no existe
  const e1 = errOf(s, 'pacman -Q')
  if (!e1.includes('pacman: command not found')) fail(`ubuntu: pacman debería ser command not found → ${e1}`); else ok('ubuntu: pacman = command not found')

  // apt sí funciona en Ubuntu
  const o1 = outOf(s, 'sudo apt update')
  if (!o1.includes('Leyendo lista de paquetes... Hecho')) fail('ubuntu: apt update no funciona'); else ok('ubuntu: apt update funciona')

  // volver a Arch SIN recargar
  s.distro = 'arch'
  // apt ya no existe
  const e2 = errOf(s, 'apt update')
  if (!e2.includes('apt: command not found')) fail('arch: apt debería ser command not found'); else ok('arch: apt = command not found')
  // pacman vuelve a funcionar
  const o2 = outOf(s, 'pacman -Q')
  if (!o2.includes('linux')) fail('arch: pacman -Q no funciona tras volver'); else ok('arch: pacman -Q funciona tras volver')

  // triple cambio
  s.distro = 'debian'; s.distro = 'arch'; s.distro = 'debian'; s.distro = 'arch'
  const e3 = errOf(s, 'apt search git')
  if (!e3.includes('apt: command not found')) fail('triple cambio: apt sigue visible'); else ok('triple cambio arch↔debian↔arch↔debian: gate consistente')

  ok('cambio de distribución reactivo sin recarga ✓')
}

/* ─────────── WHICH / TYPE RESPETAN LA DISTRIBUCIÓN ─────────── */

{
  const s = new ShellSession()
  s.distro = 'arch'
  const wArch = outOf(s, 'which pacman; which apt')
  if (!wArch.includes('/usr/bin/pacman')) fail('which pacman en Arch'); else ok('arch: which pacman OK')
  if (!wArch.includes('not found') && !wArch.includes('apt')) {
    // which apt no debe dar resultado en arch
  }
  s.distro = 'debian'
  const wDeb = outOf(s, 'which apt; which pacman')
  if (!wDeb.includes('/usr/bin/apt')) fail('ubuntu: which apt'); else ok('ubuntu: which apt OK')
  if (wDeb.includes('/usr/bin/pacman')) fail('ubuntu: which pacman no debería existir'); else ok('ubuntu: which pacman no existe ✓')
}

{
  const s = new ShellSession()
  s.distro = 'arch'
  const tArch = outOf(s, 'type pacman; type apt')
  if (!tArch.includes('pacman')) fail('type pacman en Arch'); else ok('arch: type pacman')
  s.distro = 'debian'
  const tDeb = outOf(s, 'type pacman')
  if (!tDeb.includes('not found')) fail('debian: type pacman debería fallar'); else ok('debian: type pacman = not found')
}

/* ─────────── AUTOCOMPLETADO RESPETA DISTRIBUCIÓN ─────────── */

{
  const s = new ShellSession()
  s.distro = 'arch'
  const r1 = s.complete('pac')
  if (!r1 || !r1.value.includes('pacman')) fail('autocompletado pac en Arch'); else ok('autocompletado: pac→pacman en Arch')

  const r2 = s.complete('ap')
  if (r2 && r2.value.includes('apt')) fail('autocompletado sugirió apt en Arch'); else ok('autocompletado NO sugiere apt en Arch')

  s.distro = 'debian'
  const r3 = s.complete('ap')
  if (!r3 || !r3.value.includes('apt')) fail('autocompletado ap en Ubuntu'); else ok('autocompletado: ap→apt en Ubuntu')
}

/* ─────────── ESTADO DE PAQUETES AISLADO POR DISTRO ─────────── */

{
  const s = new ShellSession()
  s.distro = 'arch'
  outOf(s, 'sudo pacman -S --noconfirm nginx')
  if (!isPkgInstalled(s.state.pkgs, 'arch', 'nginx')) fail('nginx no instalado en Arch'); else ok('nginx instalado en Arch')

  s.distro = 'debian'
  if (isPkgInstalled(s.state.pkgs, 'debian', 'nginx')) fail('¡nginx filtró a Ubuntu!'); else ok('nginx NO aparece en Ubuntu (aislamiento)')

  outOf(s, 'sudo apt install -y nginx')
  if (!isPkgInstalled(s.state.pkgs, 'debian', 'nginx')) fail('nginx no instalado en Ubuntu'); else ok('nginx instalado en Ubuntu independientemente')

  // verificar que Arch sigue teniendo su nginx
  s.distro = 'arch'
  if (!isPkgInstalled(s.state.pkgs, 'arch', 'nginx')) fail('nginx desapareció de Arch'); else ok('nginx de Arch intacto tras instalar en Ubuntu')
}

/* ─────────── COMANDOS COMUNES FUNCIONAN EN AMBAS ─────────── */

for (const distro of ['arch', 'debian'] as const) {
  const s = new ShellSession()
  s.distro = distro
  const cmds = ['pwd', 'ls', 'echo hola', 'cat /etc/os-release', 'whoami', 'date']
  let allOk = true
  for (const c of cmds) {
    const o = outOf(s, c)
    if (!o && c !== 'clear') allOk = false
  }
  if (allOk) ok(`comandos comunes funcionan en ${distro}`)
  else fail(`comandos comunes fallan en ${distro}`)
}

/* ─────────── PENDING ASK CANCELADO AL CAMBIAR DISTRO ─────────── */

{
  const s = freshArchPkg()
  // iniciar instalación sin --noconfirm → genera pendingAsk
  s.execute('sudo pacman -S nginx')
  if (!s.hasPendingAsk()) fail('-S sin --noconfirm debería generar pendingAsk')
  else {
    // cambiar distro cancela la pregunta
    s.setDistro('debian')
    if (s.hasPendingAsk()) fail('pendingAsk no se canceló al cambiar distro')
    else ok('pendingAsk cancelada al cambiar distro')
    // y la respuesta del usuario NO instala nada de Arch
    const o = outOf(s, 'sudo apt update')
    if (!o.includes('Leyendo')) fail('apt no funciona en debian'); else ok('apt funcional tras cancelación')
  }
}

function freshArchPkg(): ShellSession {
  const s = new ShellSession()
  s.distro = 'arch'
  return s
}

/* ─────────── SEGURIDAD ─────────── */

{
  const files = [
    'src/cli/engine.ts', 'src/cli/commands.ts', 'src/cli/interpreter.ts',
    'src/cli/parser.ts', 'src/cli/pkggate.ts', 'src/cli/packages.ts',
    'src/components/VirtualTerminal.tsx',
  ]
  const forbidden = [/\beval\s*\(/, /\bFunction\s*\(/, /child_process/, /process\.(stdout|stdin|exit)/]
  let hits = 0
  for (const f of files) {
    const raw = require('fs').readFileSync(f, 'utf8')
    const text = raw.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((l) => l.replace(/(^|[^:])\/\/.*$/, '$1')).join('\n')
    for (const re of forbidden) if (re.test(text)) hits++
  }
  if (hits) fail(`${hits} patrones peligrosos en CLI`)
  else ok('sin patrones peligrosos en la CLI')
}

if (failures) { console.error(`\n${failures} FALLOS`); process.exit(1) }
console.log('\nQA DISTRIBUCIÓN + PAQUETES: TODO OK')
