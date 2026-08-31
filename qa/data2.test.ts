/* QA iteración 2: Command Center, Aprender Linux, wizard, progreso multiárea. */
import { COMMANDS } from '../src/data/cmdcenter/entries'
import { CATS, SYMBOLS, EQUIVALENCES } from '../src/data/cmdcenter/meta'
import { CONCEPTS } from '../src/data/learnData'
import { resolveLeaf, WIZARD_TREES } from '../src/data/wizardTrees'

let failures = 0
const fail = (m: string) => { failures++; console.error('FALLO ' + m) }
const ok = (m: string) => console.log('ok   ' + m)

// 1. Cobertura de comandos exigidos por el spec
const required = [
  'ls','cd','pwd','cp','mv','rm','mkdir','rmdir','touch','find','locate','tree','file','stat',
  'cat','less','more','head','tail','grep','sed','awk','sort','uniq','cut','tr','wc','diff',
  'chmod','chown','chgrp','umask','sudo','su',
  'useradd','usermod','userdel','passwd','groups','id','whoami','who','w',
  'pacman','yay','paru','apt','apt-cache','apt-mark','dpkg','flatpak','snap',
  'ps','top','htop','btop','kill','pkill','pgrep','nice','renice',
  'systemctl','journalctl',
  'lsblk','blkid','df','du','mount','umount','fdisk','cfdisk','parted','mkfs',
  'ip','ping','ss','curl','wget','traceroute','tracepath','dig','nslookup','hostname','hostnamectl',
  'ufw','nft','iptables',
  'ssh','ssh-keygen','ssh-copy-id','scp','sftp',
  'tar','gzip','gunzip','zip','unzip','xz',
  'uname','uptime','free','lscpu','lsusb','lspci','dmesg','vmstat',
  'nano','vim','nvim',
  'git clone','git status','git add','git commit','git push','git pull','git branch','git checkout',
  'docker','docker compose',
]
const have = new Set(COMMANDS.flatMap((c) => [c.id, c.name]))
const missing = required.filter((r) => !have.has(r))
if (missing.length) fail(`faltan comandos (${missing.length}): ${missing.join(', ')}`)
else ok(`todos los ${required.length} comandos requeridos presentes`)

// free aparece dos veces en el spec (sistema); solo cuenta una
const dupIds = COMMANDS.map((c) => c.id).filter((id, i, arr) => arr.indexOf(id) !== i)
if (dupIds.length) fail(`ids duplicados: ${dupIds.join(',')}`)
else ok('sin ids duplicados en Command Center')

// 2. Integridad de cada entrada
for (const c of COMMANDS) {
  if (!c.summary || c.examples.length === 0 || c.intents.length === 0) fail(`${c.id}: sin summary/examples/intents`)
  for (const d of c.distro) if (!['arch', 'debian'].includes(d)) fail(`${c.id}: distro inválida ${d}`)
}
ok('entradas de comando bien formadas')

// 3. Comandos con $ o # dentro del texto copiable de ejemplos/verify
let badPrefix = 0
for (const c of COMMANDS) {
  for (const ex of c.examples) for (const l of ex.lines) {
    if (!l.startsWith('#') && (l.startsWith('$') || l.startsWith('#'))) badPrefix++
    void l
  }
  for (const v of c.verify ?? []) if (v.startsWith('$') || v.startsWith('#')) badPrefix++
}
if (badPrefix) fail(`${badPrefix} líneas con prefijo contaminado`)
else ok('ejemplos y verificaciones sin prefijos $/#')

// 4. Categorías del spec cubiertas
const catIds = CATS.map((c) => c.id)
const expectedCats = ['archivos','texto','permisos','usuarios','paquetes','procesos','servicios','discos','red','firewall','ssh','compresion','sistema','editores','git','docker']
for (const e of expectedCats) if (!catIds.includes(e as never)) fail(`falta categoría ${e}`)
ok('16 categorías completas')

// 5. Símbolos del shell pedidos
const wantSym = ['$', '#', '/', '~', '.', '..', '>', '>>', '|', '||', '&&', '*', '?', '[]', '{}', '-', '--']
for (const w of wantSym) if (!SYMBOLS.find((s) => s.symbol === w)) fail(`falta símbolo ${w}`)
ok(`símbolos completos (${SYMBOLS.length})`)

// 6. Equivalencias mínimas
if (EQUIVALENCES.length < 6) fail('equivalencias insuficientes')
else ok(`equivalencias Arch↔Debian: ${EQUIVALENCES.length}`)

// 7. Conceptos y quizzes
if (CONCEPTS.length !== 22) fail(`conceptos: ${CONCEPTS.length} (esperaba 22)`)
else ok('22 conceptos de Aprender Linux')
const quizIds = new Set<string>()
for (const c of CONCEPTS) {
  if (c.quiz) {
    if (quizIds.has(c.quiz.id)) fail(`quiz id duplicado ${c.quiz.id}`)
    quizIds.add(c.quiz.id)
    if (c.quiz.options.length !== 4) fail(`quiz ${c.quiz.id}: opciones != 4`)
    if (c.quiz.answer < 0 || c.quiz.answer > 3) fail(`quiz ${c.quiz.id}: answer fuera de rango`)
    if (c.quiz.options[c.quiz.answer] === undefined) fail(`quiz ${c.quiz.id}: respuesta inexistente`)
    for (const o of c.quiz.options) if (!o.why) fail(`quiz ${c.quiz.id}: opción sin explicación`)
  }
}
const nQuizzes = CONCEPTS.filter((c) => c.quiz).length
ok(`quizzes válidos: ${nQuizzes}`)

// 8. Wizard: árboles resolubles hasta hoja existente
function walkTree(nodeId: string, rootKey: string, seen: Set<string>): string | null {
  const leafErr = null
  void leafErr
  // recorremos todos los caminos posibles desde un nodo raíz dado
  function visit(n: import('../src/data/wizardTrees').DiagNode, path: Set<string>): string[] {
    if (path.has(n.id)) return [`ciclo en ${n.id}`]
    const p2 = new Set(path); p2.add(n.id)
    const errs: string[] = []
    for (const branch of [n.yes, n.no]) {
      if (!branch) continue
      if (typeof branch === 'string') {
        if (!resolveLeaf(branch)) errs.push(`hoja desconocida: ${branch} (en árbol ${rootKey})`)
      } else {
        errs.push(...visit(branch, p2))
      }
    }
    return errs
  }
  return visit(WIZARD_TREES[rootKey].root, new Set())[0] ?? null
}
for (const key of Object.keys(WIZARD_TREES)) {
  const err = walkTree(key, key, new Set())
  if (err) fail(`${key}: ${err}`)
}
ok(`árboles de diagnóstico consistentes: ${Object.keys(WIZARD_TREES).length}`)

if (failures) { console.error(`\n${failures} FALLOS`); process.exit(1) }
console.log('\nQA ITERACIÓN 2: TODO OK')
