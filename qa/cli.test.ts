/* QA iteración 4: motor de la CLI simulada — escenarios completos sin UI. */
import { ShellSession } from '../src/cli/engine'
import type { TermLine } from '../src/cli/engine'
import { LABS } from '../src/cli/labs'
import { VFS } from '../src/cli/fs'

let failures = 0
const fail = (m: string) => { failures++; console.error('FALLO ' + m) }
const ok = (m: string) => console.log('ok   ' + m)

let __last: TermLine[] = []
function fresh(): ShellSession {
  return new ShellSession()
}
function run(s: ShellSession, ...lines: string[]): void {
  __last = []
  for (const l of lines) {
    const out = s.execute(l)
    if (out.length > 0) __last = out
  }
}
function allLines(s?: ShellSession): string {
  void s
  return __last.map((l) => '[' + l.kind + '] ' + l.text).join('\n')
}
function lastOut(s?: ShellSession): string {
  void s
  return __last.filter((l) => l.kind === 'out').map((l) => l.text).join('\n')
}

/* ------------------------- navegación y FS básico ------------------------- */

{
  const s = fresh()
  run(s, 'pwd')
  if (!lastOut(s).includes('/home/user')) fail('pwd inicial incorrecto: ' + lastOut(s)); else ok('pwd')

  run(s, 'mkdir test', 'cd test', 'pwd')
  const o1 = lastOut(s)
  if (!o1.includes('/home/user/test')) fail('mkdir+cd no mantiene estado'); else ok('mkdir+cd persistente')

  run(s, 'touch archivo.txt', 'ls')
  if (!lastOut(s).includes('archivo.txt')) fail('touch+ls no muestra el archivo'); else ok('touch+ls')

  run(s, 'rm archivo.txt', 'cd ..', 'rmdir test')
  if (s.vfs.exists('/home/user/test')) fail('rmdir no borró'); else ok('rmdir')

  // rutas absolutas/relativas/~ / .. / .
  run(s, 'cd /home/user/projects', 'cd ../Documents', 'pwd')
  if (!lastOut(s).includes('/home/user/Documents')) fail('cd .. relativo falla'); else ok('cd ../Documents')
  run(s, 'cd ~/projects', 'pwd')
  if (!lastOut(s).includes('/home/user/projects')) fail('cd ~ no funciona'); else ok('cd ~/projects')
  run(s, 'cd .', 'pwd')
  if (!lastOut(s).includes('projects')) fail('cd . cambia de sitio'); else ok('cd .')
}

/* --------------------------------- cp/mv/rm --------------------------------- */

{
  const s = fresh()
  run(s, 'cp notes.txt copia.txt', 'cat copia.txt')
  if (!lastOut(s).includes('estudiar bash')) fail('cp+cat falla'); else ok('cp')

  run(s, 'mv copia.txt renombrada.txt', 'ls')
  const ls = lastOut(s)
  if (ls.includes('copia.txt') || !ls.includes('renombrada.txt')) fail('mv no renombró'); else ok('mv')

  run(s, 'rm renombrada.txt', 'ls')
  if (lastOut(s).includes('renombrada.txt')) fail('rm no eliminó'); else ok('rm')

  // errores realistas
  run(s, 'rm fantasma.txt')
  const errs = s.drain().filter((l) => l.kind === 'err').map((l) => l.text).join('')
  if (!errs.includes("No such file or directory")) fail('error rm poco realista: ' + errs); else ok('rm error realista')
  run(s, 'comando-inventado')
  const e2 = s.drain().filter((l) => l.kind === 'err').map((l) => l.text).join('')
  if (!e2.includes('command not found')) fail('command not found ausente'); else ok('command not found')
}

/* --------------------------------- ls -la --------------------------------- */

{
  const s = fresh()
  run(s, 'ls -la /etc')
  const outp = lastOut(s)
  if (!outp.includes('-rw-r--r--') || !outp.includes('root root')) fail('ls -l sin formato POSIX: ' + outp.slice(0, 80)); else ok('ls -la formato largo con dueños')
}

/* --------------------------------- chmod --------------------------------- */

{
  const s = fresh()
  run(s, 'chmod 755 notes.txt', 'ls -l notes.txt')
  const o = lastOut(s)
  if (!o.includes('rwxr-xr-x')) fail('chmod 755 no refleja rwxr-xr-x'); else ok('chmod 755 → rwxr-xr-x')
  run(s, 'chmod 644 notes.txt', 'ls -l notes.txt')
  if (!lastOut(s).includes('rw-r--r--')) fail('chmod 644 incorrecto'); else ok('chmod 644 → rw-r--r--')
  run(s, 'chmod +x notes.txt && ls -l notes.txt')
  {
    const all = s.drain().map((l) => `[${l.kind}] ${l.text}`).join('\n')
    if (!all.includes('-rwx')) fail('chmod +x no añade ejecución → ' + JSON.stringify(all.slice(0, 200))); else ok('chmod +x')
  }
}

/* ------------------------------ usuarios/root ------------------------------ */

{
  const s = fresh()
  run(s, 'whoami')
  if (!lastOut(s).includes('user')) fail('whoami user'); else ok('whoami=user')
  run(s, 'echo hola > /etc/prohibido.txt')
  const err = s.drain().filter((l) => l.kind === 'err').map((l) => l.text).join('')
  if (!err.includes('Permission denied')) fail('escritura en /etc como user debería denegarse'); else ok('permission denied en /etc')
  run(s, 'sudo touch /etc/prohibido.txt', 'sudo whoami')
  const o = lastOut(s)
  if (!o.includes('root')) fail('sudo whoami ≠root'); else ok('sudo eleva a root (educativo)')
  run(s, 'su', 'whoami')
  if (!lastOut(s).includes('root')) fail('su no cambia a root'); else ok('su → root')
  // prompt root
  const p = s.prompt()
  if (!p.includes('root') || !p.endsWith('#')) fail('prompt root mal formado: ' + p); else ok('prompt root #')
  run(s, 'exit-like-noop', 'useradd x') // useradd no registrado → command not found (aceptable educativamente)
  s.drain()
}

/* ----------------------------------- grep ----------------------------------- */

{
  const s = fresh()
  run(s, 'grep ERROR /var/log/app.log')
  const o = lastOut(s)
  if ((o.match(/ERROR/g) ?? []).length !== 3) fail('grep ERROR debería dar 3 líneas: ' + JSON.stringify(o)); else ok('grep ERROR ×3')
  run(s, 'grep -i error /var/log/app.log | wc -l')
  if (!lastOut(s).trim().endsWith('3')) fail('grep -i + wc -l ≠3: ' + lastOut(s)); else ok('pipe grep|wc -l = 3 (insensible)')
  run(s, 'grep -n ERROR /var/log/app.log')
  if (!lastOut(s).includes('3:2026-01-01 09:10 ERROR')) fail('grep -n sin numeración correcta'); else ok('grep -n numeración')
  run(s, 'grep -v INFO /var/log/app.log | wc -l')
  const v = parseInt(lastOut(s).trim().split('\n').pop() ?? '0', 10)
  if (v === 0) fail('grep -v vacío inesperado'); else ok('grep -v filtra inverso (' + v + ')')
  run(s, 'grep -c INFO /var/log/app.log')
  if (!lastOut(s).trim().endsWith('3')) fail('grep -c INFO ≠3'); else ok('grep -c')
  run(s, 'grep -w user /etc/passwd')
  if (!lastOut(s).includes('user:x:1000')) fail('grep -w user'); else ok('grep -w palabra completa')
  run(s, 'grep -E "ERROR|WARNING" /var/log/app.log | wc -l')
  const e = parseInt(lastOut(s).trim(), 10)
  if (e < 4) fail('grep -E alternancia insuficiente: ' + e); else ok('grep -E alternancia (' + e + ')')
}

/* ------------------------------------ sed ------------------------------------ */

{
  const s = fresh()
  run(s, "sed 's/bob/robert/' projects/data.txt")
  let o = lastOut(s)
  if (!o.includes('robert') || o.includes('bob')) fail('sed básico: ' + o); else ok('sed sustitución básica')
  run(s, "echo 'hola mundo hola' | sed 's/hola/hey/'")
  o = lastOut(s)
  if (!o.includes('hey mundo hola')) fail('s/// primera ocurrencia: ' + o); else ok('sed 1ª ocurrencia')
  run(s, "echo 'hola mundo hola' | sed 's/hola/hey/g'")
  {
    const dbg = allLines(s)
    if (!dbg.includes('hey mundo hey')) fail('sed g global: ' + JSON.stringify(dbg)); else ok('sed g global')
  }
  run(s, "printf 'uno\\ndos\\ntres\\ncuatro\\ncinco\\n' > n.txt", "sed -n '2,4p' n.txt")
  o = lastOut(s)
  if (!(o.includes('dos') && o.includes('cuatro') && !o.includes('uno'))) fail('sed rango 2,4p: ' + o); else ok('sed -n rango p')
  run(s, "sed '/tres/d' n.txt")
  o = lastOut(s)
  if (o.includes('tres')) fail('sed /pat/d no borra'); else ok('sed delete por patrón')
  run(s, "sed -i.bak 's/dos/DOS/' n.txt", 'cat n.txt', 'cat n.txt.bak')
  const all = s.drain().map((l) => '[' + l.kind + '] ' + l.text).join('\n')
  if (!all.includes('DOS') || !all.includes('[out] dos')) fail('sed -i.bak: ' + JSON.stringify(all.slice(0, 300))); else ok('sed -i con .bak')
}

/* ------------------------------------ awk ------------------------------------ */

{
  const s = fresh()
  run(s, "awk '{print $1}' projects/data.txt")
  const o = lastOut(s).split('\n')
  if (!(o[0] === 'id' && o.includes('1') && o.includes('3'))) fail('awk1: ' + JSON.stringify(allLines(s))); else ok('awk $1 (columna id)')
  run(s, "awk '$3 >= 78 {print $2}' projects/data.txt")
  const names = lastOut(s).split('\n').filter(Boolean)
  if (!(names.length === 2 && names.includes('ana') && names.includes('carol'))) fail('awk cond ≥78: ' + JSON.stringify(names)); else ok('awk condición ≥78 (ana y carol, cabecera excluida)')
  run(s, "awk -F: '$1 == \"user\" {print $6}' /etc/passwd")
  if (!lastOut(s).includes('/home/user')) fail('awk -F: + comparación string'); else ok('awk -F: y ==')
  run(s, "awk '{s+=$1} END {print s}' projects/data.txt")
  if (!lastOut(s).includes('6')) fail('awk acumulador END: ' + lastOut(s)); else ok('awk suma + END')
  run(s, "awk 'NR==2 {print NF}' projects/data.txt")
  if (lastOut(s).trim() !== '3') fail('awk NR/NF: ' + lastOut(s)); else ok('awk NR/NF')
}

/* ------------------------------- pipes y redirs ------------------------------- */

{
  const s = fresh()
  run(s, 'ls /usr/bin | grep sed')
  if (!lastOut(s).includes('sed')) fail('pipe ls|grep'); else ok('pipe ls|grep')
  run(s, "echo 'línea única' > redir.txt", 'cat redir.txt')
  if (!lastOut(s).includes('línea única')) fail('> echo no escribió'); else ok('> escribe')
  run(s, "echo 'segunda' >> redir.txt", 'wc -l redir.txt')
  if (parseInt(lastOut(s).trim()) !== 2) fail('>> no añadió línea: ' + lastOut(s)); else ok('>> añade')
  run(s, 'cat < redir.txt')
  if (!lastOut(s).includes('línea')) fail('< stdin desde fichero'); else ok('< stdin')
  run(s, 'find /no-existe -name x 2> errores.txt', 'cat errores.txt')
  if (!lastOut(s).includes('No such file or directory')) fail('2> no capturó stderr'); else ok('2> stderr a fichero')
  run(s, 'true && echo encadenado-ok || echo nunca')
  if (!lastOut(s).includes('encadenado-ok')) fail('&& || lógica'); else ok('&& y ||')
}

/* ------------------------------- variables bash ------------------------------- */

{
  const s = fresh()
  run(s, 'CURSO=Bash', 'echo "Estoy en el curso de $CURSO"')
  if (!lastOut(s).includes('curso de Bash')) fail('variable + expansión: ' + lastOut(s)); else ok('variables + expansión doble comilla')
  run(s, "echo 'literal $CURSO'")
  if (lastOut(s).includes('Bash')) fail('comillas simples deben bloquear expansión'); else ok('comillas simples literales')
  run(s, 'N=7', 'echo "$((N*6))"')
  {
    const dbg = allLines(s)
    if (!dbg.includes('42')) fail('$(( )) aritmética: ' + JSON.stringify(dbg.slice(0, 300))); else ok('aritmética $(( ))')
  }
  run(s, 'ARCH=$(date +%Y)', 'echo "año=$ARCH"')
  if (!lastOut(s).match(/año=\d{4}/)) fail('$(cmd) substitution: ' + lastOut(s)); else ok('command substitution $(date)')
}

/* --------------------------------- scripts --------------------------------- */

{
  const s = fresh()
  run(
    s,
    "printf '#!/usr/bin/env bash\\nnombre=\"${1:-mundo}\"\\necho \"Hola, $nombre\"\\n' > scripts/hello2.sh",
    'chmod +x scripts/hello2.sh',
    './scripts/hello2.sh',
  )
  if (!lastOut(s).includes('Hola, mundo')) fail('script sin args: ' + lastOut(s)); else ok('script ejecutado ./ con default')
  run(s, './scripts/hello2.sh ArchForge')
  if (!lastOut(s).includes('Hola, ArchForge')) fail('scriptarg: ' + JSON.stringify(allLines(s))); else ok('script con argumento $1')
}

{
  // script con if + for
  const s = fresh()
  run(
    s,
    "printf '#!/usr/bin/env bash\\nfor f in uno dos tres; do\\n  echo \"item: $f\"\\ndone\\nif [ 5 -gt 2 ]; then\\n  echo mayor\\nfi\\n' > scripts/demo.sh",
    'bash scripts/demo.sh',
  )
  const o = lastOut(s)
  if (!(o.includes('item: uno') && o.includes('item: tres') && o.includes('mayor'))) fail('for+if en script: ' + o); else ok('script con for + if')
}

/* --------------------------------- historial/Tab --------------------------------- */

{
  const s = fresh()
  run(s, 'pwd', 'ls')
  run(s, 'history')
  const o = lastOut(s)
  if (!o.includes('pwd') || !o.includes('history')) fail('history incompleto'); else ok('history')
  // Tab comando
  const c1 = s.complete('mkd')
  if (!c1 || !c1.value.startsWith('mkdir')) fail('Tab comando mkd→mkdir'); else ok('Tab completa comandos')
  // Tab ruta
  const c2 = s.complete('cd Doc')
  if (!c2 || !c2.value.includes('Documents/')) fail('Tab ruta Doc→Documents/'); else ok('Tab completa rutas con /')
}

/* --------------------------------- laboratorios --------------------------------- */

function tryLab(id: string, steps: string[], expectPass: boolean): void {
  const s = fresh()
  run(s, ...steps)
  const lab = LABS.find((l) => l.id === id)!
  const res = lab.validate(s)
  if (res.pass !== expectPass) fail(`${id}: esperaba ${expectPass ? 'PASS' : 'FAIL'} → ${res.detail}`)
  else ok(`lab ${lab.num} ${expectPass ? 'valida PASS' : 'detecta pendiente'}`)
}

tryLab('lab01', ['cd /home/user/projects', 'ls'], true)
tryLab('lab01', ['pwd'], false)
tryLab('lab02', ['mkdir practica', 'touch practica/demo.txt', 'cp notes.txt practica/'], true)
tryLab('lab03', ['touch projects/run.sh', 'chmod 755 projects/run.sh', 'ls -l'], true)
tryLab('lab04', ['find /var -name "*.log"'], true)
tryLab('lab05', ['grep -n ERROR /var/log/app.log', 'grep -ci warning /var/log/app.log'], true)
tryLab('lab06', ['grep sshd /var/log/syslog | wc -l'], true)
tryLab('lab07', ['date > fecha.txt', 'uptime >> fecha.txt'], true)
tryLab('lab08', ["sed -i.bak 's/bob/robert/g' projects/data.txt"], true)
tryLab('lab10', ['CURSO=Bash', 'echo "Estoy en el curso de $CURSO"'], true)
tryLab('lab12', ['mkdir -p curso/semana{1..3}'], true)

// brace expansion debe crear las tres carpetas realmente
{
  const s = fresh()
  run(s, 'mkdir -p curso/semana{1..3}', 'ls curso')
  const o = lastOut(s)
  if (!(o.includes('semana1') && o.includes('semana3'))) fail('brace expansion mkdir: ' + o); else ok('brace expansion {1..3}')
}

/* --------------------------- seguridad del sandbox --------------------------- */

{
  const src = [
    'src/cli/engine.ts', 'src/cli/commands.ts', 'src/cli/interpreter.ts', 'src/cli/parser.ts', 'src/cli/labs.ts', 'src/components/VirtualTerminal.tsx',
  ]
  const forbidden = [/\beval\s*\(/, /\bFunction\s*\(/, /child_process/, /\bexec\s*\(\s*['"`]/, /process\.(stdout|stdin)/, /require\s*\(\s*['"][^.'"]/]
  let hits = 0
  for (const f of src) {
    const raw = require('fs').readFileSync(f, 'utf8')
    const text = raw
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .map((l) => l.replace(/(^|[^:])\/\/.*$/, '$1'))
      .join('\n')
    for (const re of forbidden) {
      if (re.test(text)) { hits++; console.error('   patrón prohibido en ' + f + ': ' + re) }
    }
  }
  if (hits) fail(`sandbox: ${hits} patrones peligrosos`)
  else ok('sin eval/exec/child_process/procesos reales en la CLI')
}

/* ------------------------------ persistencia ------------------------------ */

{
  const s = fresh()
  run(s, 'mkdir persistencia', 'touch persistencia/marcador.txt', 'export MI_VAR=42')
  const snap = s.serialize()
  const revived = ShellSession.load(JSON.parse(JSON.stringify(snap)))
  const allOut: string[] = []
  for (const l of ['cd persistencia', 'pwd', 'echo "$MI_VAR"', 'ls']) {
    for (const t of revived.execute(l)) if (t.kind === 'out') allOut.push(t.text)
  }
  const o = allOut
  if (!o[0].includes('/home/user/persistencia') || !o.some((x) => x === '42') || !o.some((x) => x === 'marcador.txt'))
    fail('serialización/restore incompleta: ' + JSON.stringify(o))
  else ok('estado serializable y restaurado (fs+env)')
}

if (failures) { console.error(`\n${failures} FALLOS`); process.exit(1) }
console.log('\nQA CLI: TODO OK')
