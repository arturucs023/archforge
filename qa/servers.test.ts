/* QA SERVIDORES: integridad de datos, integración CLI, laboratorios, seguridad. */
import { SERVER_COURSES, getServerCourse, courseProgress, realModules, serverLabDoneId, serverModuleDoneId } from '../src/data/servers'
import { PROBLEMS } from '../src/data/troubleshooting'
import { COMMANDS } from '../src/data/cmdcenter/entries'
import { SECTIONS } from '../src/data/sections'
import { ShellSession } from '../src/cli/engine'
import * as fsMod from 'fs'

let fails = 0
const ok = (cond: boolean, label: string): void => {
  if (!cond) fails++
  console.log(`${cond ? 'ok  ' : 'FALLO'} ${label}`)
}

/* ------------------------------ 1. integridad datos ------------------------------ */

const courseIds = new Set(SERVER_COURSES.map((c) => c.id))
ok(courseIds.size === SERVER_COURSES.length, 'ids de curso únicos')
ok(['dns', 'dhcp', 'ftp', 'ssh', 'nginx', 'apache', 'samba', 'nfs'].every((id) => courseIds.has(id)), 'existen los 8 cursos exigidos')

for (const c of SERVER_COURSES) {
  const modIds = c.modules.map((m) => m.id)
  ok(new Set(modIds).size === modIds.length, `[${c.id}] ids de módulo únicos (${modIds.length})`)
  ok(c.lab && typeof c.lab.validate === 'function', `[${c.id}] laboratorio con validador`)
  ok(c.tagline.length > 30, `[${c.id}] tagline descriptivo`)
  // cheatsheet: cada id debe existir en COMMANDS
  for (const cid of c.cheatsheetIds) {
    const found = COMMANDS.some((cmd2) => cmd2.id === cid)
    if (!found) fails++
    if (!found) console.log(`FALLO [${c.id}] cheatsheet id inexistente: ${cid}`)
  }
  ok(true, `[${c.id}] cheatsheetIds válidos (${c.cheatsheetIds.join(', ')})`)
  // troubleshooting: cada problemId debe existir en PROBLEMS
  for (const pid of c.problemIds) {
    const found = PROBLEMS.some((pr) => pr.id === pid)
    if (!found) fails++
    if (!found) console.log(`FALLO [${c.id}] problemId inexistente: ${pid}`)
  }
  ok(true, `[${c.id}] problemIds válidos (${c.problemIds.length})`)
  // prereqs apuntan a secciones reales o a rutas de herramienta conocidas
  const toolRoutes = ['/terminal', '/bash', '/learn', '/commands']
  for (const pr of c.prereqs) {
    const secOk = pr.to.startsWith('/section/') && SECTIONS.some((s) => s.id === pr.to.replace('/section/', ''))
    const toolOk = toolRoutes.includes(pr.to)
    if (!secOk && !toolOk) fails++
    if (!secOk && !toolOk) console.log(`FALLO [${c.id}] prereq roto: ${pr.to}`)
  }
  ok(true, `[${c.id}] prereqs válidos (${c.prereqs.length})`)
  // bloques no vacíos en módulos reales (el marcador 'laboratorio' se excluye del contenido)
  const mods = realModules(c)
  ok(mods.every((m) => m.blocks.length >= 3), `[${c.id}] todos los módulos tienen contenido sustancial (${mods.length})`)
  ok(!mods.some((m) => m.id === 'laboratorio'), `[${c.id}] marcador laboratorio excluido de los módulos reales`)
}

// problemas de servidor presentes y categorizados
const serverProblems = PROBLEMS.filter((p) => p.category === 'Servidores')
ok(serverProblems.length >= 18, `problemas de servidores registrados (${serverProblems.length})`)

/* ------------------------- 2. integración CLI: servicios ------------------------- */

function run(sess: ShellSession, line: string): string {
  return sess.execute(line).map((l) => `${l.kind === 'err' ? '[E] ' : ''}${l.text}`).join('\n')
}
function drainAll(s: ShellSession): void { s.drain() }

{
  const s = new ShellSession()
  run(s, 'sudo pacman -S --noconfirm nginx iproute2')
  run(s, 'systemctl status nginx'); drainAll(s)
  ok(!s.state.services?.nginx?.active, 'sin sudo no arranca servicios')
  run(s, 'sudo systemctl enable --now nginx'); drainAll(s)
  ok(s.state.services?.nginx?.active === true && s.state.services?.nginx?.enabled === true, 'enable --now arranca+habilita')
  const ss = run(s, 'ss -tlnp'); drainAll(s)
  ok(ss.includes(':80'), 'ss refleja puerto del servicio activo')
  run(s, 'sudo systemctl stop nginx'); drainAll(s)
  ok(!s.state.services?.nginx?.active, 'stop detiene el servicio')
  const ssEmpty = run(s, 'ss -tlnp'); drainAll(s)
  ok(!ssEmpty.includes(':80'), 'ss deja de listar el puerto tras stop')
}

{
  // DNS end-to-end en la sesión persistente
  const s = new ShellSession()
  run(s, 'sudo pacman -S --noconfirm bind')
  run(s, 'su')
  run(s, 'mkdir -p /etc/named/zones')
  run(s, `printf '$ORIGIN archforge.local\\nserver IN A 192.168.1.10\\nwww IN CNAME server\\n@ IN NS ns\\nns IN A 192.168.1.10\\n' > /etc/named/zones/db.archforge.local`)
  run(s, 'systemctl start named'); drainAll(s)
  const a = s.execute('dig @127.0.0.1 server.archforge.local +short').filter((l) => l.kind === 'out').map((l) => l.text).join('\n'); drainAll(s)
  ok(a.trim() === '192.168.1.10', `dig A resuelve (${a.trim()})`)
  const cn = s.execute('dig @127.0.0.1 www.archforge.local +short').filter((l) => l.kind === 'out').map((l) => l.text).join('\n'); drainAll(s)
  ok(cn.includes('192.168.1.10') && cn.trim().split('\n').length >= 2, 'CNAME encadena hasta el A')
  const nx = s.execute('dig @127.0.0.1 fantasma.archforge.local +short').filter((l) => l.kind === 'out' || l.kind === 'err').map((l) => l.text).join('\n'); drainAll(s)
  ok(nx.trim() === '', 'nombre ausente → vacío (NXDOMAIN)')
  run(s, 'su user')
}

{
  // SSH completo
  const s = new ShellSession()
  run(s, 'sudo pacman -S --noconfirm openssh')
  const refused = run(s, 'ssh user@localhost'); drainAll(s)
  ok(refused.includes('Connection refused'), 'ssh sin sshd → refused')
  run(s, 'sudo systemctl start sshd'); drainAll(s)
  run(s, 'ssh-keygen -t ed25519'); drainAll(s)
  run(s, 'ssh-copy-id user@localhost'); drainAll(s)
  const conn = run(s, 'ssh user@localhost'); drainAll(s)
  ok(conn.includes('publickey'), 'ssh autentica por publickey tras copy-id')
}

/* -------------------- 3. validadores de laboratorios (8 cursos) ------------------- */

interface Step { line: string }

const LAB_FLOWS: Record<string, Step[]> = {
  dns: [
    { line: 'sudo pacman -S --noconfirm bind' },
    { line: 'su' },
    { line: 'mkdir -p /etc/named/zones' },
    { line: `printf '$ORIGIN archforge.local\\nserver IN A 192.168.1.10\\nwww IN CNAME server\\n' > /etc/named/zones/db.archforge.local` },
    { line: 'systemctl start named' },
  ],
  dhcp: [
    { line: 'sudo pacman -S --noconfirm dhcp' },
    { line: 'su' },
    { line: 'mkdir -p /etc/dhcp' },
    { line: `printf 'subnet 192.168.1.0 netmask 255.255.255.0 {\\n range 192.168.1.100 192.168.1.200;\\n option routers 192.168.1.1;\\n option domain-name-servers 192.168.1.10;\\n}\\n' > /etc/dhcp/dhcpd.conf` },
    { line: 'systemctl start dhcpd' },
  ],
  ftp: [
    { line: 'sudo pacman -S --noconfirm vsftpd' },
    { line: 'su' },
    { line: `printf 'local_enable=YES\\nwrite_enable=YES\\nchroot_local_user=YES\\npasv_min_port=40000\\npasv_max_port=40100\\n' > /etc/vsftpd.conf` },
    { line: 'systemctl start vsftpd' },
  ],
  ssh: [
    { line: 'sudo pacman -S --noconfirm openssh' },
    { line: 'ssh-keygen -t ed25519' },
    { line: 'su' },
    { line: 'systemctl start sshd' },
    { line: 'exit' },
    { line: 'ssh-copy-id user@localhost' },
  ],
  nginx: [
    { line: 'sudo pacman -S --noconfirm nginx' },
    { line: 'su' },
    { line: 'mkdir -p /var/www/archforge /etc/nginx/conf.d' },
    { line: `echo '<h1>ArchForge</h1>' > /var/www/archforge/index.html` },
    { line: `printf 'server { listen 80; server_name www.archforge.local; root /var/www/archforge; index index.html; }\\n' > /etc/nginx/conf.d/archforge.conf` },
    { line: 'systemctl start nginx' },
  ],
  apache: [
    { line: 'sudo pacman -S --noconfirm apache' },
    { line: 'su' },
    { line: 'mkdir -p /srv/www/archforge /etc/httpd/conf/extra' },
    { line: `echo '<h1>Apache ArchForge</h1>' > /srv/www/archforge/index.html` },
    { line: `printf '<VirtualHost *:80>\\n ServerName www.archforge.local\\n DocumentRoot "/srv/www/archforge"\\n</VirtualHost>\\n' > /etc/httpd/conf/extra/archforge.conf` },
    { line: 'systemctl start httpd' },
  ],
  samba: [
    { line: 'sudo pacman -S --noconfirm samba' },
    { line: 'su' },
    { line: 'mkdir -p /srv/samba/publico /etc/samba' },
    { line: 'chmod 2775 /srv/samba/publico' },
    { line: `printf '[global]\\n workgroup = WORKGROUP\\n\\n[publico]\\n path = /srv/samba/publico\\n read only = no\\n' > /etc/samba/smb.conf` },
    { line: 'systemctl start smb' },
  ],
  nfs: [
    { line: 'sudo pacman -S --noconfirm nfs-utils' },
    { line: 'su' },
    { line: 'mkdir -p /srv/nfs/publico' },
    { line: 'chown nobody:nobody /srv/nfs/publico' },
    { line: 'chmod 2775 /srv/nfs/publico' },
    { line: `echo '/srv/nfs/publico 192.168.1.0/24(rw,sync,no_subtree_check)' > /etc/exports` },
    { line: 'systemctl enable --now nfs-server' },
  ],
}

for (const course of SERVER_COURSES) {
  // cursos EXTERNOS (VM real): sin flujo CLI ni validación simulada
  if (course.virtual) {
    const freshVm = new ShellSession()
    freshVm.setDistro('arch')
    ok(course.lab.validate(freshVm).pass === false, `[lab ${course.id}] curso externo: validador informativo, no simulado`)
    continue
  }
  // 3a: sesión limpia DEBE fallar (valida estado final real, no humo)
  const fresh = new ShellSession()
  fresh.setDistro('arch')
  const rFresh = course.lab.validate(fresh)
  ok(rFresh.pass === false, `[lab ${course.id}] falla en entorno limpio: ${rFresh.detail.slice(0, 60)}…`)

  // 3b: ejecutar flujo → DEBE pasar
  const s = new ShellSession()
  s.setDistro('arch')
  let lastOut = ''
  for (const st of LAB_FLOWS[course.id]) lastOut = run(s, st.line)
  drainAll(s)
  if (course.id === 'dns') {
    // la validación del lab lanza dig dentro; asegurar resolv limpio no necesario por @127.0.0.1
  }
  const r = course.lab.validate(s)
  if (!r.pass) {
    fails++
    console.log(`FALLO [lab ${course.id}] debería pasar tras el flujo: ${r.detail}\n   última salida: ${lastOut.slice(-160)}`)
  } else {
    console.log(`ok   [lab ${course.id}] valida estado final correcto`)
  }
}

/* --------------------------- 4. progreso coherente --------------------------- */
{
  const fakeDone = (id: string): boolean => id === serverModuleDoneId('ssh', 'que-es-ssh')
  const ssh = getServerCourse('ssh')!
  const p1 = courseProgress(ssh, fakeDone)
  ok(p1.done === 1 && p1.total === realModules(ssh).length + 1, 'progreso cuenta módulos reales + lab')
  ok(serverLabDoneId('ssh').startsWith('srvlab:'), 'prefijo de lab consistente')
}

/* ------------------------------- 5. seguridad CLI ------------------------------- */
{
  const filesToScan: string[] = []
  const walk = (dir: string): void => {
    for (const f of fsMod.readdirSync(dir)) {
      const full = dir + '\\' + f
      if (fsMod.statSync(full).isDirectory()) walk(full)
      else if (/\.(ts|tsx)$/.test(f)) filesToScan.push(full)
    }
  }
  walk('src/cli')
  walk('src/data/servers')
  // contratos reales: sin eval/Function como llamada, sin child_process, sin require de node:*
  const bannedCall = /(^|[^.\w])(eval|Function)\s*\(/          // eval( y Function( pero NO .exec( ni comentarios
  const bannedImport = /child_process|require\(['"]node:|process\.binding|\bspawn(Sync)?\s*\(|\bfetch\s*\(/
  const stripCommentsAndStrings = (src: string): string =>
    src
      .replace(/\/\*[\s\S]*?\*\//g, '')                          // /* … */
      .split('\n')
      .map((l) => l.replace(/\/\/.*$/, '').replace(/`[^`]*`/g, '').replace(/'[^']*'/g, '').replace(/"[^"]*"/g, ''))
      .join('\n')
  const offenders: string[] = []
  for (const f of filesToScan) {
    const clean = stripCommentsAndStrings(fsMod.readFileSync(f, 'utf8'))
    if (bannedCall.test(clean) || bannedImport.test(clean)) offenders.push(f)
  }
  ok(offenders.length === 0, `CLI 100% simulada sin acceso a sistema real (${filesToScan.length} ficheros escaneados)${offenders.length ? ' — ofensores: ' + offenders.join(', ') : ''}`)
}

console.log(fails === 0 ? '\nQA SERVIDORES: TODO OK' : `\nQA SERVIDORES: ${fails} FALLOS`)
process.exit(fails === 0 ? 0 : 1)
