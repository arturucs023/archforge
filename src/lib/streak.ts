/* Racha de aprendizaje: lógica PURA de días consecutivos con fecha LOCAL.
   La registra el contexto al completar contenido real (markDone), nunca por visitar páginas. */

export interface LearningStreakState {
  learningStreak: number
  /** clave local YYYY-MM-DD del último día con actividad */
  lastLearningDay?: string
  longestLearningStreak: number
}

/** Clave de día en zona horaria LOCAL (no UTC) para decidir si dos actividades son el mismo día */
export function localDayKey(d: Date = new Date()): string {
  const p = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/**
 * Registra una actividad educativa ocurrida en `now`.
 * - mismo día ya registrado → estado intacto (no suma otra vez)
 * - ayer registrado          → racha + 1
 * - hueco de ≥2 días         → reinicia a 1
 * - mejor racha solo crece
 */
export function registerActivity<T extends LearningStreakState>(prev: T, now: Date = new Date()): T {
  const today = localDayKey(now)
  if (prev.lastLearningDay === today) return prev

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const consecutive = prev.lastLearningDay === localDayKey(yesterday)

  const learningStreak = consecutive ? prev.learningStreak + 1 : 1
  return {
    ...prev,
    learningStreak,
    lastLearningDay: today,
    longestLearningStreak: Math.max(prev.longestLearningStreak, learningStreak),
  }
}
