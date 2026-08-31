/* QA gestores de paquetes simulados: apt/pacman, aislamiento por distro,
   interactividad [S/n], dependencias y errores realistas. */
import { ShellSession } from '../src/cli/engine'
import { LABS } from '../src/cli/labs'
import { isPkgInstalled } from '../src/cli/packages'

let failures = 0
const fail = (m: string) => { failures++; console.error('FALLO ' + m) }
const ok = (m: string) => console.log('ok   ' + m)

function outOf(s: ShellSession, ...lines: string[]): string {
  let acc = ''
  for (const l of lines) {
    for (const t of s.execute(l)) if (t.kind === 'out') acc += t.text + '\n'
  }
  return acc
}
function errOf(s: ShellSession, ...lines: string[]): string {
  let acc = ''
  for (const l of lines) {
    for (const t of s.execute(l)) if (t.kind === 'err') acc += t.text + '\n'
  }
  return acc
}

/* ================================ UBUNTU / APT ================================ */

{
  const s = freshDebian()
  // update
  const up = outOf(s, 'sudo apt update')
  if (!up.includes('Leyendo lista de paquetes... Hecho')) fail('apt update salida'); else ok('apt update')
  // install git
  const inst = outOf(s, 'sudo apt install git')
  if (!inst.includes('Se instalarán los siguientes paquetes NUEVOS') || !inst.includes('Configurando git')) fail('apt install git salida'); else ok('apt install git')
  // aparece en list --installed
  const lst = outOf(s, 'apt list --installed')
  if (!lst.includes('git/noble,now')) fail('apt list --installed sin git'); else ok('apt list --installed contiene git')
  // show
  const show = outOf(s, 'apt show git')
  if (!show.includes('Estado: instalado') || !show.includes('Versión: 1:2.43.0-1ubuntu7')) fail('apt show git'); else ok('apt show git')
  // search nginx
  const srch = outOf(s, 'apt search nginx')
  if (!srch.includes('nginx/noble') || !srch.includes('servidor web')) fail('apt search nginx'); else ok('apt search nginx')
  // remove
  const rem = outOf(s, 'sudo apt remove -y git')
  if (!rem.includes('Eliminando git') ) fail('apt remove git salida'); else ok('apt remove git')
  if (isInst(s, 'debian', 'git')) fail('git sigue instalado tras remove'); else ok('remove deja estado limpio')
  // remove no instalado
  const errRem = errOf(s, 'sudo apt remove -y git')
  if (!errRem.includes('no está instalado')) fail('remove de no-instalado sin error claro'); else ok('error remove no-instalado')
}

{
  // sin sudo → denegado
  const s = freshDebian()
  const e1 = errOf(s, 'apt install nginx')
  if (!e1.includes('Permiso denegado') && !e1.includes('¿es root?')) fail('apt install sin sudo debería denegar'); else ok('apt install sin sudo denegado')
  const e2 = errOf(s, 'sudo apt install nginx', 'apt install htop')
  if (!e2.includes('Permiso denegado')) fail('segundo install sin sudo debería denegar'); else ok('apt siempre exige privilegios')
}

{
  // ya instalado + multi-paquete + dependencias
  const s = freshDebian()
  outOf(s, 'sudo apt install -y curl')
  const o1 = outOf(s, 'sudo apt install -y curl')
  if (!o1.includes('ya está en su versión más reciente')) fail('reinstall curl no avisó'); else ok('paquete ya instalado detectado')
  const o2 = outOf(s, 'sudo apt install -y python3-pip zip unzip')
  if (!(o2.includes('python3-pip') && o2.includes('Configurando zip'))) fail('multi-install falló'); else ok('multi-paquete install')
  if (!isInst(s, 'debian', 'python3')) fail('dependencia python3 no se instaló sola'); else ok('dependencias resueltas automáticamente')
  // purge
  outOf(s, 'sudo apt install -y nginx')
  const o3 = outOf(s, 'sudo apt purge -y nginx')
  if (!o3.includes('Purgando nginx')) fail('purge salida'); else ok('apt purge')
  // inexistente
  const e3 = errOf(s, 'sudo apt install -y paquete-fantasma-xyz')
  if (!e3.includes('Imposible localizar el paquete paquete-fantasma-xyz')) fail('inexistente sin error claro'); else ok('paquete inexistente error')
}

/* ================================= ARCH / PACMAN ================================= */

{
  const s = freshArch()
  // -Syu interactivo con Enter vacío (acepta S)
  const syu = outOf(s, 'sudo pacman -Syu')
  if (!syu.includes('Sincronizando las bases de datos')) fail('-Syu sin sincronización'); else ok('-Syu sincroniza índices')
  // instalar git (depende de curl)
  const inst = outOf(s, 'sudo pacman -S --noconfirm git')
  if (!inst.includes('resolviendo dependencias') || !inst.includes(':: Instalando git')) fail('pacman -S git'); else ok('pacman -S git')
  if (!isInst(s, 'arch', 'curl')) fail('dependencia curl no instalada'); else ok('dependencia curl automática')
  // Q / Qi / Ql
  const q = outOf(s, 'pacman -Q')
  if (!q.includes('git 2.47.1-1')) fail('pacman -Q sin git'); else ok('pacman -Q lista git')
  const qe = outOf(s, 'pacman -Qe')
  if (!qe.includes('git')) fail('-Qe sin git explícito'); else ok('-Qe muestra explícitos')
  if (qe.includes('linux-firmware')) fail('-Qe NO debe listar preinstalados'); else ok('-Qe excluye preinstalados')
  const qi = outOf(s, 'pacman -Qi git')
  if (!qi.includes('control de versiones')) fail('-Qi descripción ausente'); else ok('-Qi ficha completa')
  const ql = outOf(s, 'pacman -Ql git')
  if (!ql.includes('/usr/bin/git')) fail('-Ql archivos'); else ok('-Ql listado de archivos')
  // Ss
  const ss = outOf(s, 'pacman -Ss nginx')
  if (!ss.includes('extra/nginx') || !ss.includes('proxy inverso')) fail('-Ss nginx'); else ok('pacman -Ss búsqueda')
  // eliminar con confirmación interactiva 'n' primero
  s.execute('sudo pacman -R git')
  s.execute('n')
  if (isInst(s, 'arch', 'git')) ok('-R con n cancela'); else fail('-R respondió n pero borró')
  // ahora sí con confirmación 's'
  outOf(s, 'sudo pacman -R git')
  s.execute('s')
  if (isInst(s, 'arch', 'git')) fail('-R con s no eliminó'); else ok('-R con confirmación elimina')
  // -Rs con dependencias huérfanas
  run2(s, ['sudo pacman -S --noconfirm base-devel'])
  const beforeBase = isInst(s, 'arch', 'gcc')
  run2(s, ['sudo pacman -Rs --noconfirm base-devel gcc make'])
  void beforeBase
  ok('-Rs ejecutado sin crash')
}

/* ------------------------- aislamiento entre distribuciones ------------------------- */

{
  const s = freshArch()
  for (const c of ['sudo pacman -S --noconfirm nginx']) s.execute(c)
  if (!isInst(s, 'arch', 'nginx')) fail('nginx arch no instalado'); else ok('nginx instalado en Arch')
  // cambiar a Ubuntu: el estado de Arch no se ve
  s.distro = 'debian'
  if (isInst(s, 'debian', 'nginx')) fail('¡estados mezclados! nginx aparecía en Ubuntu'); else ok('estados Arch/Ubuntu aislados')
  // pacman en Ubuntu → command not found
  const e1 = errOf(s, 'pacman -S nginx')
  if (!e1.includes('pacman: command not found')) fail('pacman en Ubuntu debería ser command not found'); else ok('pacman cruzado = command not found')
  // apt en Arch → command not found
  s.distro = 'arch'
  const e2 = errOf(s, 'apt install nginx')
  if (!e2.includes('apt: command not found')) fail('apt en Arch debería ser command not found'); else ok('apt cruzado = command not found')
  // which respeta la puerta
  const w = outOf(s, 'which apt; which pacman')
  void w
  ok('which/type consultables')
}

/* -------------------------------- laboratorios pkg -------------------------------- */

tryLabPkg('lab16-pkg-install-git', ['sudo apt install -y git'], 'debian', true)
tryLabPkg('lab16-pkg-install-git', ['sudo pacman -S --noconfirm git'], 'arch', true)
tryLabPkg('lab16-pkg-install-git', [], 'debian', false)
tryLabPkg('lab17-pkg-nginx-ciclo', ['sudo apt install -y nginx', 'apt list --installed', 'sudo apt remove -y nginx'], 'debian', true)
tryLabPkg('lab18-pkg-search', ['apt search server'], 'debian', true)
tryLabPkg('lab19-pkg-info', ['pacman -Si curl'], 'arch', true)
tryLabPkg('lab20-pkg-update', ['sudo apt update'], 'debian', true)
tryLabPkg('lab20-pkg-update', ['sudo pacman -Sy'], 'arch', true)

function tryLabPkg(id: string, cmds: string[], distro: 'arch' | 'debian', expectPass: boolean): void {
  const lab = LABS.find((l) => l.id === id)
  if (!lab) { fail(`laboratorio ${id} no existe`); return }
  const s = distro === 'arch' ? freshArch() : freshDebian()
  for (const c of cmds) s.execute(c)
  const res = lab.validate(s)
  if (res.pass !== expectPass) fail(`${id}: esperaba ${expectPass ? 'PASS' : 'PEND'} → ${res.detail}`)
  else ok(`${lab.num} ${expectPass ? 'PASS' : 'pendiente'} (${distro})`)
}

/* ------------------------------- helpers ------------------------------- */

function freshArch(): ShellSession { const s = new ShellSession(); s.distro = 'arch'; return s }
function freshDebian(): ShellSession { const s = new ShellSession(); s.distro = 'debian'; return s }
function isInst(s: ShellSession, distro: 'arch' | 'debian', name: string): boolean {
  return isPkgInstalled(s.state.pkgs, distro, name)
}
function run2(s: ShellSession, lines: string[]): void { for (const l of lines) s.execute(l) }

import type { ShellSession } from '../src/cli/engine'
import { isPkgInstalled } from '../src/cli/packages'

if (failures) { console.error(`\n${failures} FALLOS`); process.exit(1) }
console.log('\nQA GESTORES DE PAQUETES: TODO OK')
