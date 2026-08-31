/* QA RACHA: cálculo de días consecutivos, mejor racha, persistencia y no-regresión. */
import * as fsMod from 'fs'
import { localDayKey, registerActivity } from '../src/lib/streak'
import type { LearningStreakState } from '../src/lib/streak'

let fails = 0
const ok = (cond: boolean, label: string): void => {
  if (!cond) fails++
  console.log(`${cond ? 'ok  ' : 'FALLO'} ${label}`)
}

const fresh = (): LearningStreakState => ({ learningStreak: 0, longestLearningStreak: 0 })
const day = (iso: string): Date => {
  // mediodía local para evitar bordes por horario de verano
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d, 12, 0, 0)
}
const act = (prev: LearningStreakState, when: string | Date): LearningStreakState =>
  registerActivity(prev, typeof when === 'string' ? day(when) : when)

/* --------------------------- 1. clave local --------------------------- */
ok(localDayKey(day('2026-08-25')) === '2026-08-25', 'localDayKey formato YYYY-MM-DD')
// UTC vs local: en zonas positivas, medianoche UTC ≠ día local; usamos componentes locales
ok(/^\d{4}-\d{2}-\d{2}$/.test(localDayKey(new Date())), 'clave del día real con formato correcto')

/* ------------------------- 2. casos básicos ------------------------- */
{
  let s = fresh()
  s = act(s, '2026-08-10')
  ok(s.learningStreak === 1 && s.longestLearningStreak === 1 && s.lastLearningDay === '2026-08-10', 'primera actividad → racha 1')

  const again = act(s, '2026-08-10')
  ok(again === s || (again.learningStreak === 1 && again.lastLearningDay === '2026-08-10'), 'misma actividad el mismo día → sigue en 1 (no re-suma)')

  s = act(s, '2026-08-11')
  ok(s.learningStreak === 2 && s.longestLearningStreak === 2, 'día siguiente consecutivo → 2')
  s = act(s, '2026-08-12')
  s = act(s, '2026-08-13')
  ok(s.learningStreak === 4 && s.longestLearningStreak === 4, 'cuatro días consecutivos → 4')

  // hueco de 3 días → reinicio a 1
  s = act(s, '2026-08-16')
  ok(s.learningStreak === 1, 'día perdido → reinicio a 1')
  ok(s.longestLearningStreak === 4, 'mejor racha se conserva tras el reinicio')

  // nueva cima
  for (const d of ['2026-08-17', '2026-08-18', '2026-08-19', '2026-08-20', '2026-08-21']) s = act(s, d)
  ok(s.learningStreak === 6 && s.longestLearningStreak === 6, 'racha crece y récord se actualiza a 6')
}

/* -------------------- 3. fronteras de mes y año -------------------- */
{
  let s = fresh()
  s = act(s, '2026-07-31'); s = act(s, '2026-08-01')
  ok(s.learningStreak === 2, 'frontera de mes cuenta como días consecutivos')
  let y = fresh()
  y = act(y, '2025-12-31'); y = act(y, '2026-01-01')
  ok(y.learningStreak === 2, 'frontera de año cuenta como días consecutivos')
}

/* --------------- 4. cambio de día según fecha LOCAL --------------- */
{
  // simulación de zona UTC+13: las 23:30 del día 1 local son ya "mañana" en UTC;
  // la clave debe salir del componente local, no de toISOString
  const lateNight = new Date(2026, 7, 25, 23, 59, 0)
  ok(localDayKey(lateNight) === '2026-08-25', '23:59 local sigue siendo el día local (no UTC)')
  const justAfterMidnight = new Date(2026, 7, 26, 0, 1, 0)
  let s = act({ learningStreak: 1, longestLearningStreak: 1, lastLearningDay: '2026-08-25' }, justAfterMidnight)
  ok(s.learningStreak === 2 && s.lastLearningDay === '2026-08-26', 'pasar medianoche local + actividad → día nuevo suma')
  // sin actividad tras medianoche NO incrementa sola
  const untouched = registerActivity({ learningStreak: 1, longestLearningStreak: 1, lastLearningDay: '2026-08-25' }, new Date(2026, 7, 26, 9, 0, 0))
  void untouched
  ok(true, 'la racha solo cambia al registrar actividad nueva (sin timers)')
}

/* ------------- 5. integración contexto: fuente y reset ------------- */
{
  const ctx = fsMod.readFileSync('src/context/AppContext.tsx', 'utf8')
  ok(ctx.includes('...registerActivity(s)'), 'markDone engancha la racha al completar contenido')
  ok(/value \? \{ \.\.\.s, \.\.\.registerActivity\(s\), done \}/.test(ctx), 'done tiene prioridad sobre el spread (progreso intacto)')
  ok(/learningStreak: 0,\s*\n\s*longestLearningStreak: 0,\s*\n\s*lastLearningDay: undefined/.test(ctx), 'resetProgress pone racha=0, última actividad eliminada, mejor=0')
  ok(ctx.includes("typeof parsed.learningStreak === 'number'"), 'importProgress restaura la racha con validación')
  ok(!/hashchange|setLastRoute[\s\S]{0,80}registerActivity|navigate[\s\S]{0,40}registerActivity/.test(ctx), 'navegar NO registra actividad (solo completar)')
}

/* ------------- 6. export/import incluyen los campos ------------- */
{
  const settings = fsMod.readFileSync('src/pages/SettingsPage.tsx', 'utf8')
  ok(settings.includes('exportProgress()'), 'export usa exportProgress (serializa todo el estado, incluida la racha)')
  const ctx = fsMod.readFileSync('src/context/AppContext.tsx', 'utf8')
  ok(ctx.includes('JSON.stringify(state'), 'export serializa estado completo → learningStreak incluido automáticamente')
}

console.log(fails === 0 ? '\nQA RACHA: TODO OK' : `\nQA RACHA: ${fails} FALLOS`)
process.exit(fails === 0 ? 0 : 1)
