/* QA iteración 3: Curso de Bash — estructura, validez y cobertura. */
import { BASH_MODULES, BASH_PROJECTS } from '../src/data/bashcourse'

let failures = 0
const fail = (m: string) => { failures++; console.error('FALLO ' + m) }
const ok = (m: string) => console.log('ok   ' + m)

// 1. 27 módulos numerados en orden
if (BASH_MODULES.length !== 27) fail(`módulos: ${BASH_MODULES.length} (esperaba 27)`)
else ok('27 módulos')
const expectedNums = Array.from({ length: 27 }, (_, i) => String(i + 1).padStart(2, '0'))
BASH_MODULES.forEach((m, i) => {
  if (m.num !== expectedNums[i]) fail(`orden: posición ${i} tiene num=${m.num}, esperaba ${expectedNums[i]}`)
})
ok('numeración 01..27 secuencial')

// 2. Estructura completa por módulo
let exercises = 0
for (const m of BASH_MODULES) {
  if (!m.id || !m.title || m.goals.length === 0 || m.simple.length === 0 || m.summary.length === 0) fail(`${m.id}: campos base incompletos`)
  if (m.exercises.length === 0) fail(`${m.id}: sin ejercicios`)
  exercises += m.exercises.length
  for (const e of m.exercises) {
    if (e.kind === 'write' && (!e.accept || e.accept.length === 0)) fail(`${e.id}: write sin accept`)
    if ((e.kind === 'choice' || e.kind === 'predict') && (e.options?.length ?? 0) !== 4) fail(`${e.id}: opciones != 4`)
    if ((e.kind === 'choice' || e.kind === 'predict') && typeof e.answer !== 'number') fail(`${e.id}: sin answer`)
    for (const o of e.options ?? []) if (!o.why) fail(`${e.id}: opción sin why`)
    if (e.solutionLines.length === 0) fail(`${e.id}: sin solución`)
    if (!e.explanation) fail(`${e.id}: sin explicación`)
  }
}
ok(`estructura correcta · ${exercises} ejercicios totales`)

// 3. Ids únicos de ejercicios
const exIds = new Set<string>()
for (const m of BASH_MODULES) for (const e of m.exercises) {
  if (exIds.has(e.id)) fail(`ejercicio duplicado: ${e.id}`)
  exIds.add(e.id)
}
ok('ids de ejercicio únicos')

// 4. Niveles válidos + distribución razonable
const levels = { beginner: 0, intermediate: 0, expert: 0 }
for (const m of BASH_MODULES) levels[m.level]++
if (levels.beginner < 6 || levels.expert < 5) fail('distribución de niveles pobre')
ok(`niveles: P=${levels.beginner} I=${levels.intermediate} A=${levels.expert}`)

// 5. Validez bash básica: ninguna línea EJECUTABLE de ejemplos empieza por $ o # comando
//    (las que empiezan por '# ' son comentarios intencionados del sistema cmd())
let bad = 0
for (const m of BASH_MODULES) {
  const allLines: string[][] = [
    ...(m.examples ?? []).map((e) => e.lines),
    ...m.exercises.map((e) => e.solutionLines),
    m.challenge ? [m.challenge.solutionLines.join('\n')] : [],
  ]
  void allLines
  for (const ex of m.examples ?? []) for (const l of ex.lines) {
    if (l.startsWith('$ ') || l === '$') bad++
  }
  for (const e of m.exercises) for (const l of e.solutionLines) if (l.startsWith('$ ')) bad++
  if (m.challenge) for (const l of m.challenge.solutionLines) if (l.startsWith('$ ')) bad++
}
if (bad) fail(`${bad} líneas con prefijo $ contaminado`)
else ok('ejemplos/soluciones sin prefijos $')

// 6. Proyectos: 9 (8 + final), con starter/solution/verify
if (BASH_PROJECTS.length !== 9) fail(`proyectos: ${BASH_PROJECTS.length} (esperaba 9)`)
else ok('9 proyectos (8 progresivos + final)')
for (const p of BASH_PROJECTS) {
  if (!p.starter.content || !p.solution.content || p.verify.length === 0) fail(`${p.id}: incompleto`)
  if (p.final === true && p.num !== 'PF') fail(`${p.id}: marcado final sin num PF`)
}
const pf = BASH_PROJECTS.find((p) => p.final)
if (!pf) fail('falta proyecto FINAL')
else ok('proyecto final presente: ' + pf.title)

// 7. El proyecto final integra conceptos exigidos
const pfConcepts = pf ? pf.concepts.join(' ').toLowerCase() : ''
for (const req of ['todo el curso']) {
  if (!pfConcepts.includes(req)) fail(`final sin «${req}»`)
}
ok('proyecto final declarado integrador')

// 8. Módulos clave con profundidad extra (grep, sed, awk, regex, seguridad, shellcheck)
for (const id of ['grep', 'sed', 'awk', 'regex', 'seguridad-bash', 'shellcheck']) {
  const m = BASH_MODULES.find((x) => x.id === id)
  if (!m) fail(`falta módulo clave ${id}`)
  else if ((m.examples?.length ?? 0) < 4) fail(`${id}: profundidad insuficiente (${m.examples?.length} ejemplos)`)
}
ok('módulos grep/sed/awk/regex/seguridad/shellcheck con profundidad')

// 9. Terminal simulada presente en módulos prácticos tempranos
for (const id of ['que-es-bash', 'primeros-comandos', 'comillas-expansion', 'operadores-redirecciones']) {
  const m = BASH_MODULES.find((x) => x.id === id)
  if (!m?.sim) fail(`${id} debería incluir terminal simulada`)
}
ok('terminal simulada en fundamentos')

if (failures) { console.error(`\n${failures} FALLOS`); process.exit(1) }
console.log('\nQA CURSO BASH: TODO OK')
