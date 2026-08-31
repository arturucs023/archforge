/* QA CURSO VM: integridad, referencias, separación de distros, progreso y avisos. */
import * as fsMod from 'fs'
import { SERVER_COURSES, getServerCourse, realModules, courseProgress } from '../src/data/servers'
import { COMMANDS } from '../src/data/cmdcenter/entries'
import { PROBLEMS } from '../src/data/troubleshooting'
import { SECTIONS } from '../src/data/sections'

let fails = 0
const ok = (cond: boolean, label: string): void => {
  if (!cond) fails++
  console.log(`${cond ? 'ok  ' : 'FALLO'} ${label}`)
}

const vm = getServerCourse('vm')
ok(vm !== undefined, 'curso vm registrado')
if (!vm) process.exit(1)

/* ---------------- 1. estructura e integridad de módulos ---------------- */
{
  const mods = realModules(vm)
  ok(mods.length >= 26, `módulos totales (${mods.length}: 13 conceptos + 12 LABs + proyecto)`)
  const ids = mods.map((m) => m.id)
  ok(new Set(ids).size === ids.length, 'ids únicos')
  ok(mods.every((m) => m.blocks.length >= 3), 'todos los módulos con contenido real')
  ok(mods.every((m) => typeof m.level === 'string'), 'dificultad presente en cada módulo')
  const labMods = mods.filter((m) => m.id.startsWith('lab'))
  ok(labMods.length === 11, `11 laboratorios Alpine (${labMods.length})`)
  ok(mods.some((m) => m.id === 'apk') && mods.some((m) => m.id === 'servicios-openrc'), 'módulos apk y OpenRC presentes')
  ok(mods.some((m) => m.id === 'restablecer-laboratorio'), 'módulo «restablecer laboratorio» presente')
  // labs Alpine NO usan gestores ajenos (Alpine ≠ Arch ≠ Debian)
  const alpineCmds = JSON.stringify(labMods.map((m) => m.blocks.filter((b) => b.type === 'command').map((b) => b.lines)))
  ok(!alpineCmds.includes('pacman -S') && !alpineCmds.includes('apt install') && !alpineCmds.includes('systemctl start'), 'labs Alpine sin pacman/apt/systemctl')
  ok(ids.includes('proyecto-final'), 'proyecto final presente')
}

/* ------------------- 2. curso EXTERNO (VM real) ------------------- */
ok(vm.virtual === true, 'marcado como virtual (labs en la máquina del usuario)')
ok(vm.lab.intro?.includes('EN TU MÁQUINA VIRTUAL'), 'aviso explícito de ejecución real')
{
  const page = fsMod.readFileSync('src/pages/ServersPage.tsx', 'utf8')
  ok(page.includes('course.virtual ?'), 'LabView ramifica según course.virtual')
  ok(!/virtual \?[\s\S]{0,200}Comprobar mi servidor/.test(page), 'cursos virtuales NO muestran botón Comprobar')
}

/* ------------- 3. referencias: cheatsheet/solucionador/secciones ------------- */
for (const cid of vm.cheatsheetIds) {
  ok(COMMANDS.some((c) => c.id === cid), `cheatsheet id válido: ${cid}`)
}
for (const pid of vm.problemIds) {
  ok(PROBLEMS.some((p2) => p2.id === pid), `solucionador id válido: ${pid}`)
}
for (const pr of vm.prereqs) {
  if (pr.to.startsWith('/section/')) {
    ok(SECTIONS.some((s) => s.id === pr.to.replace('/section/', '')), `prereq sección válida: ${pr.to}`)
  }
}
for (const r of vm.related ?? []) {
  if (r.kind === 'course') ok(SERVER_COURSES.some((c) => c.id === r.to), `related curso válido: ${r.to}`)
  else ok(SECTIONS.some((s) => s.id === r.to), `related sección válida: ${r.to}`)
}

/* -------- 4. separación de distribuciones dentro de cada bloque -------- */
let mezclados = 0
for (const m of realModules(vm)) {
  for (const b of m.blocks) {
    if (b.type !== 'command') continue
    const text = b.lines.map((l) => (l.kind === 'run' ? l.user : '')).join('\n')
    const hasArch = /pacman -S\b|pacman -Syu/.test(text)
    const hasDeb = /\bapt install\b|\bapt update\b|\bapt-get\b/.test(text)
    if (hasArch && hasDeb) {
      mezclados++
      console.log(`   bloque mixto en ${m.id}: ${text.slice(0, 60).replace(/\n/g, ' | ')}`)
    }
  }
}
ok(mezclados === 0, 'ningún comando block mezcla pacman con apt')

/* ---------------- 5. comparadores y avisos sandbox ---------------- */
{
  const allText = JSON.stringify(realModules(vm).map((m) => m.blocks))
  ok(allText.includes('ext4 o Btrfs') || allText.includes('comparador'), 'referencia al comparador de filesystems')
  ok(allText.includes('systemd-boot'), 'mención bootloader alternativo (GRUB/systemd-boot)')
  ok(allText.includes('no ejecuta nada') || allText.includes('NO ejecutar') || allText.includes('no ejecuta ni valida'), 'aviso: ArchForge no maneja VMs reales')
  ok(JSON.stringify(vm).includes('los comandos son reales'), 'advertencia clave del módulo 01 presente')
}

/* ---------------- 6. progreso integrado ---------------- */
{
  const p = courseProgress(vm, () => false)
  ok(p.total === realModules(vm).length + 1 && p.done === 0, 'progreso arranca a cero e incluye lab/proyecto')
  // el índice global lo cuenta automáticamente por estar en SERVER_COURSES
  ok(SERVER_COURSES[0]?.id === 'vm', 'vm encabeza la lista de cursos (apartado puerta de entrada)')
}

console.log(fails === 0 ? '\nQA CURSO VM: TODO OK' : `\nQA CURSO VM: ${fails} FALLOS`)
process.exit(fails === 0 ? 0 : 1)
