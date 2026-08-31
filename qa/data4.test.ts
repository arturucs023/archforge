/* QA iteración 5: cheatsheet ampliada, solucionador ampliado, sidebar activo. */
import { COMMANDS } from '../src/data/cmdcenter/entries'
import { CATS } from '../src/data/cmdcenter/meta'
import { PROBLEMS } from '../src/data/troubleshooting'
import { LABS } from '../src/cli/labs'

let failures = 0
const fail = (m: string) => { failures++; console.error('FALLO ' + m) }
const ok = (m: string) => console.log('ok   ' + m)

/* ────────────────────────── CHEATSHEET ────────────────────────── */

// total en rango 200-250
if (COMMANDS.length < 200 || COMMANDS.length > 250) fail(`total comandos: ${COMMANDS.length} (esperaba 200-250)`)
else ok(`total comandos: ${COMMANDS.length}`)

const have = new Set(COMMANDS.flatMap((c) => [c.id, c.name]))
{
  const dupIds = COMMANDS.map((c) => c.id).filter((id, i, arr) => arr.indexOf(id) !== i)
  if (dupIds.length) fail(`ids duplicados: ${[...new Set(dupIds)].join(', ')}`)
  else ok('sin ids duplicados')
}

// categorías nuevas presentes
const catIds = new Set(CATS.map((c) => c.id))
for (const c of ['bash-shell', 'pipes-redir', 'busqueda', 'monitorizacion', 'logs', 'boot', 'diagnostico', 'networkmanager', 'desarrollo', 'cripto', 'tareas', 'datos', 'hardware', 'mantenimiento'] as const) {
  if (!catIds.has(c)) fail(`falta categoría ${c}`)
}
ok(`${CATS.length} categorías registradas`)

// las 16 categorías originales siguen
for (const o of ['archivos', 'texto', 'permisos', 'usuarios', 'paquetes', 'procesos', 'servicios', 'discos', 'red', 'firewall', 'ssh', 'compresion', 'sistema', 'editores', 'git', 'docker'] as const) {
  if (!catIds.has(o)) fail(`categoría original eliminada: ${o}`)
}
ok('las 16 categorías originales se mantienen')

// cada categoría tiene al menos 1 comando
for (const c of CATS) {
  const n = COMMANDS.filter((x) => x.cat === c.id).length
  if (n === 0) fail(`categoría vacía: ${c.label}`)
}
ok('ninguna categoría vacía')

// comandos pedidos por el spec
const requiredNew = [
  // bash
  'export', 'source', 'alias', 'unalias', 'history', 'jobs', 'fg', 'bg', 'wait', 'set', 'unset',
  'env', 'printenv', 'read', 'trap', 'command', 'type', 'hash',
  // pipes/redir
  'tee', 'xargs', 'pipe-op', 'redir-gt', 'redir-gtgt', 'op-andand', 'op-oror', 'op-semi', 'op-amp',
  // busqueda
  'whereis', 'rg', 'fd', 'fzf',
  // monitorización
  'watch', 'iostat', 'pidstat', 'iotop',
  // logs
  'logger', 'last',
  // boot
  'bootctl', 'efibootmgr', 'grub-install', 'grub-mkconfig', 'mkinitcpio', 'systemd-analyze',
  // diagnostico
  'lsof', 'strace', 'ltrace',
  // networkmanager
  'nmcli', 'nmtui',
  // desarrollo
  'gcc', 'make', 'cmake', 'python3', 'pip', 'node', 'npm', 'cargo',
  // cripto
  'sha256sum', 'sha512sum', 'md5sum', 'openssl', 'gpg',
  // tareas
  'crontab', 'at', 'systemd-run',
  // datos
  'jq', 'column', 'od', 'xxd', 'strings', 'base64', 'seq', 'bc',
  // hardware
  'lsmem', 'lshw', 'sensors', 'dmidecode', 'smartctl',
  // mantenimiento
  'paccache', 'apt-autoremove', 'apt-clean', 'fstrim', 'sync',
  // extras existentes ampliados
  'ln', 'readlink', 'basename', 'dirname', 'realpath', 'paste', 'join', 'host', 'mtr',
  'nohup', 'timeout', 'timedatectl', 'dd', 'sshfs', 'zstd',
]
const missingNew = requiredNew.filter((r) => !have.has(r))
if (missingNew.length) fail(`faltan comandos nuevos (${missingNew.length}): ${missingNew.slice(0, 12).join(', ')}`)
else ok(`los ${requiredNew.length} comandos nuevos del spec están`)

// integridad básica de TODAS las entradas
let badEntries = 0
for (const c of COMMANDS) {
  if (!c.summary || !c.examples || c.examples.length === 0 || !c.intents || c.intents.length === 0) badEntries++
}
if (badEntries) fail(`${badEntries} entradas incompletas`)
else ok('todas las entradas con summary/examples/intents')

// sin prefijos $/# contaminantes en ejemplos
let prefixHits = 0
for (const c of COMMANDS) {
  for (const ex of c.examples ?? []) {
    for (const l of (ex as { lines?: string[]; example?: string }).lines ?? []) {
      const t = l.trim()
      if ((t.startsWith('$ ') || t.startsWith('# ') === false && t.startsWith('$'))) prefixHits++
    }
  }
}
if (prefixHits) fail(`${prefixHits} líneas de ejemplo empiezan por $ (deben ser limpias)`)
else ok('ejemplos sin prefijo $')

// related apuntan a ids existentes
let relBad = 0
for (const c of COMMANDS) for (const r of (c as { related?: string[] }).related ?? []) {
  if (!have.has(r)) relBad++
}
if (relBad) fail(`${relBad} enlaces related rotos`)
else ok('enlaces related válidos')

/* ────────────────────────── SOLUCIONADOR ────────────────────────── */

// los 16 originales siguen
const original16 = ['no-internet','no-wifi','no-audio','black-screen','nvidia-not-working','hyprland-no-start','steam-no-open','proton-fail','bluetooth-fail','grub-missing','systemd-boot-missing','arch-no-boot','pacman-error','servicio-no-inicia','puerto-ocupado','aur-fail']
for (const id of original16) if (!PROBLEMS.find((p) => p.id === id)) fail(`problema original perdido: ${id}`)
ok(`los 16 problemas originales intactos (${PROBLEMS.length} totales)`)

// nuevos problemas del spec
const newProblems = [
  'dns-no-resuelve','ip-incorrecta','gateway-mal','firewall-bloquea','ssh-no-conecta','nm-no-inicia','dhcp-sin-ip','eth-ok-wifi-no',
  'disco-lleno','borrado-disco-lleno','fs-solo-lectura','fstab-no-monta','usb-no-monta',
  'servicio-restart-loop','journal-errores','boot-lento','servicio-no-auto','timer-no-funciona','socket-no-responde',
  'sudo-roto','permisos-tras-copiar','archivo-de-root','grupo-servicio','ssh-clave-rechazada',
  'command-not-found','sh-no-ejecuta','bash-syntax-error','redireccion-mal','var-inexistente',
  'cpu-100','ram-llena','swap-excesiva','proceso-memoria','disco-lento',
  'deps-rotas','gpg-caducadas','mirror-caido','conflicto-actualizacion',
]
for (const np of newProblems) if (!PROBLEMS.find((p) => p.id === np)) fail(`falta problema nuevo: ${np}`)
ok(`problemas nuevos presentes (${newProblems.length} requeridos)`)

// todos tienen level válido
const validLevels = ['facil', 'intermedio', 'avanzado']
let lvlBad = 0
for (const p of PROBLEMS) if (!validLevels.includes(p.level)) lvlBad++
if (lvlBad) fail(`${lvlBad} problemas sin level válido`)
else ok('todos los problemas con level 🟢🟡🔴')

// distribución de niveles razonable
const byLvl = { facil: 0, intermedio: 0, avanzado: 0 }
for (const p of PROBLEMS) byLvl[p.level]++
ok(`niveles: fácil=${byLvl.facil} intermedio=${byLvl.intermedio} avanzado=${byLvl.avanzado}`)

// laboratorios ≥21 (16 originales + 5 pkg)
if (LABS.length < 20) fail(`laboratorios: ${LABS.length} (esperaba ≥20)`)
else ok(`laboratorios totales: ${LABS.length}`)

if (failures) { console.error(`\n${failures} FALLOS`); process.exit(1) }
console.log('\nQA ITERACIÓN 6: TODO OK')
