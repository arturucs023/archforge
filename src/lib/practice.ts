import { useCallback, useEffect, useState } from 'react'
import type { ExamResult, PracticeCat, PracticeQuestion } from '../data/practice/types'
import { BANK } from '../data/practice/bank'
import { CHALLENGES } from '../data/practice/challenges'
import { GROUPS } from '../data/sections'
import { REGISTRY, getSection, stepUnits } from '../data/registry'
import { COMMANDS } from '../data/cmdcenter/entries'

/* Práctica v1.2: progreso SEPARADO del mapa `done` principal (no altera % globales).
   Clave propia con validación al cargar. Todo derivable y determinista. */

const PRACTICE_KEY = 'archforge:practice:v1'

export interface AnswerRec {
  ok: boolean
  tries: number
  at: number
}

export interface PracticeState {
  answers: Record<string, AnswerRec>
  exams: ExamResult[]
}

function validRec(r: unknown): r is AnswerRec {
  if (!r || typeof r !== 'object') return false
  const o = r as Record<string, unknown>
  return typeof o.ok === 'boolean' && typeof o.tries === 'number' && typeof o.at === 'number'
}

function validExam(e: unknown): e is ExamResult {
  if (!e || typeof e !== 'object') return false
  const o = e as Record<string, unknown>
  return typeof o.at === 'number' && typeof o.total === 'number' && typeof o.ok === 'number' && Array.isArray(o.failed)
}

export function loadPractice(): PracticeState {
  try {
    const raw = localStorage.getItem(PRACTICE_KEY)
    if (raw) {
      const p = JSON.parse(raw) as Partial<PracticeState>
      const answers: Record<string, AnswerRec> = {}
      if (p.answers && typeof p.answers === 'object') {
        for (const [k, v] of Object.entries(p.answers)) if (validRec(v)) answers[k] = v
      }
      const exams = Array.isArray(p.exams) ? p.exams.filter(validExam) : []
      return { answers, exams }
    }
  } catch { /* corrupto → limpio */ }
  return { answers: {}, exams: [] }
}

export function usePractice() {
  const [state, setState] = useState<PracticeState>(loadPractice)

  useEffect(() => {
    try { localStorage.setItem(PRACTICE_KEY, JSON.stringify(state)) } catch { /* noop */ }
  }, [state])

  const recordAnswer = useCallback((qid: string, ok: boolean) => {
    setState((s) => {
      const prev = s.answers[qid]
      return {
        ...s,
        answers: { ...s.answers, [qid]: { ok: prev ? prev.ok || ok : ok, tries: (prev?.tries ?? 0) + 1, at: Date.now() } },
      }
    })
  }, [])

  const recordExam = useCallback((res: ExamResult) => {
    setState((s) => ({ ...s, exams: [...s.exams, res].slice(-20) }))
  }, [])

  const resetPractice = useCallback(() => setState({ answers: {}, exams: [] }), [])

  return { practice: state, recordAnswer, recordExam, resetPractice }
}

/* ------------------------------- Estadísticas ------------------------------ */

export function questionOk(state: PracticeState, qid: string): boolean {
  return state.answers[qid]?.ok === true
}

export function challengeProgress(state: PracticeState, challengeId: string): { done: number; total: number } {
  const ch = CHALLENGES.find((c) => c.id === challengeId)
  if (!ch) return { done: 0, total: 0 }
  const done = ch.questions.filter((q) => questionOk(state, q)).length
  return { done, total: ch.questions.length }
}

export function isChallengeDone(state: PracticeState, challengeId: string): boolean {
  const p = challengeProgress(state, challengeId)
  return p.total > 0 && p.done === p.total
}

export interface PracticeStats {
  answered: number
  correct: number
  accuracy: number
  challengesDone: number
  challengesTotal: number
  examsTaken: number
  bestScore: number
}

export function practiceStats(state: PracticeState): PracticeStats {
  const recs = Object.values(state.answers)
  const answered = recs.length
  const correct = recs.filter((r) => r.ok).length
  const challengesDone = CHALLENGES.filter((c) => isChallengeDone(state, c.id)).length
  const best = state.exams.reduce((m, e) => Math.max(m, e.total ? Math.round((e.ok / e.total) * 100) : 0), 0)
  return {
    answered,
    correct,
    accuracy: answered ? Math.round((correct / answered) * 100) : 0,
    challengesDone,
    challengesTotal: CHALLENGES.length,
    examsTaken: state.exams.length,
    bestScore: best,
  }
}

/* --------------------------------- Logros ---------------------------------- */

export interface Achievement {
  id: string
  label: string
  desc: string
  unlocked: boolean
}

export function sectionComplete(isDone: (id: string) => boolean, sectionId: string): boolean {
  const s = getSection(sectionId)
  if (!s) return false
  const units = stepUnits(s)
  return units.length > 0 && units.every((u) => isDone(u))
}

export function achievements(
  isDone: (id: string) => boolean,
  state: PracticeState,
  longestStreak: number,
): Achievement[] {
  const st = practiceStats(state)
  const anyUnit = REGISTRY.some((s) => stepUnits(s).some((u) => isDone(u)))
  const cmdDone = COMMANDS.filter((c) => isDone(`cmd:${c.id}`)).length
  const defs: Achievement[] = [
    { id: 'primer-paso', label: 'Primer paso', desc: 'Completa tu primera unidad de contenido.', unlocked: anyUnit },
    { id: 'primer-comando', label: 'Primer comando', desc: 'Marca tu primer comando como aprendido.', unlocked: cmdDone >= 1 },
    { id: 'diez-comandos', label: '10 comandos', desc: 'Aprende 10 comandos del Cheatsheet.', unlocked: cmdDone >= 10 },
    { id: 'cincuenta-comandos', label: '50 comandos', desc: 'Aprende 50 comandos del Cheatsheet.', unlocked: cmdDone >= 50 },
    { id: 'primer-reto', label: 'Primer reto', desc: 'Supera todas las preguntas de un reto.', unlocked: st.challengesDone >= 1 },
    { id: 'diez-retos', label: '10 retos', desc: 'Completa 10 retos de práctica.', unlocked: st.challengesDone >= 10 },
    { id: 'precision-80', label: 'Precisión 80%', desc: 'Mantén ≥80% de acierto con 10+ respuestas.', unlocked: st.answered >= 10 && st.accuracy >= 80 },
    { id: 'racha-7', label: 'Racha de 7 días', desc: 'Aprende 7 días seguidos.', unlocked: longestStreak >= 7 },
    { id: 'ospf-dominado', label: 'OSPF dominado', desc: 'Completa la unidad OSPF en profundidad.', unlocked: sectionComplete(isDone, 'net-ospf') },
    { id: 'vlsm-reto', label: 'VLSM resuelto', desc: 'Completa el reto de diseño VLSM.', unlocked: isChallengeDone(state, 'ch-vlsm') },
    { id: 'primer-examen', label: 'Primer examen', desc: 'Termina tu primer modo examen.', unlocked: st.examsTaken >= 1 },
    { id: 'examen-90', label: 'Examen 90+', desc: 'Saca 90 o más en un examen.', unlocked: st.bestScore >= 90 },
  ]
  return defs
}

/* ------------------------------ Recomendación ------------------------------ */

export interface Recommendation {
  sectionId: string
  title: string
  reason: string
  basis: string[]
}

/** Determinista y explicable: continuar lo pendiente, si no el primer
    pendiente del itinerario con su base ya dominada como contexto. */
export function recommendNext(
  isDone: (id: string) => boolean,
  lastSection?: string,
): Recommendation | null {
  const stateOf = (id: string): 'done' | 'started' | 'todo' => {
    const s = getSection(id)
    if (!s) return 'todo'
    const units = stepUnits(s)
    const d = units.filter((u) => isDone(u)).length
    if (d === units.length && units.length > 0) return 'done'
    return d > 0 ? 'started' : 'todo'
  }
  if (lastSection && getSection(lastSection) && stateOf(lastSection) !== 'done') {
    const s = getSection(lastSection)!
    return {
      sectionId: s.id,
      title: s.title,
      reason: stateOf(lastSection) === 'started' ? 'La dejaste a medias: continúa donde lo dejaste.' : 'Tu última visita: empieza por aquí.',
      basis: [],
    }
  }
  for (const s of REGISTRY) {
    if (stateOf(s.id) === 'done') continue
    const basis = (s.related ?? [])
      .filter((r) => stateOf(r) === 'done')
      .map((r) => getSection(r)?.title ?? r)
      .slice(0, 3)
    return {
      sectionId: s.id,
      title: s.title,
      reason: 'Es el siguiente paso del itinerario: ya tienes la base para empezarlo.',
      basis,
    }
  }
  return null
}

/* --------------------------------- Examen ---------------------------------- */

export function sampleExam(n = 20): PracticeQuestion[] {
  const byCat = new Map<string, PracticeQuestion[]>()
  for (const q of BANK) {
    const arr = byCat.get(q.cat) ?? []
    arr.push(q)
    byCat.set(q.cat, arr)
  }
  const picked: PracticeQuestion[] = []
  const used = new Set<string>()
  // 1 por categoría para cubrir el temario…
  for (const [, arr] of byCat) {
    const q = arr[Math.floor(Math.random() * arr.length)]
    picked.push(q)
    used.add(q.id)
  }
  // …relleno aleatorio hasta n
  const rest = BANK.filter((q) => !used.has(q.id))
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[rest[i], rest[j]] = [rest[j], rest[i]]
  }
  for (const q of rest) {
    if (picked.length >= n) break
    picked.push(q)
  }
  // mezcla final
  for (let i = picked.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[picked[i], picked[j]] = [picked[j], picked[i]]
  }
  return picked.slice(0, n)
}

/* ------------------------------ Árbol de saber ----------------------------- */

export type NodeState = 'done' | 'started' | 'todo' | 'mastered'

export interface TreeSection {
  id: string
  title: string
  state: NodeState
  done: number
  total: number
}

export interface TreeGroup {
  id: string
  label: string
  sections: TreeSection[]
  done: number
  total: number
}

export function buildTree(isDone: (id: string) => boolean, state: PracticeState): TreeGroup[] {
  return GROUPS.filter((g) => g.id !== 'inicio').map((g) => {
    const sections: TreeSection[] = REGISTRY.filter((s) => s.group === g.id).map((s) => {
      const units = stepUnits(s)
      const done = units.filter((u) => isDone(u)).length
      const complete = units.length > 0 && done === units.length
      const linked = CHALLENGES.filter((c) => c.sectionId === s.id)
      const mastered = complete && linked.length > 0 && linked.every((c) => isChallengeDone(state, c.id))
      const st: NodeState = mastered ? 'mastered' : complete ? 'done' : done > 0 ? 'started' : 'todo'
      return { id: s.id, title: s.title, state: st, done, total: units.length }
    })
    return {
      id: g.id,
      label: g.label,
      sections,
      done: sections.reduce((a, s) => a + s.done, 0),
      total: sections.reduce((a, s) => a + s.total, 0),
    }
  })
}

export function catLabel(cat: PracticeCat): string {
  return (
    {
      linux: 'Linux', bash: 'Bash', redes: 'Redes', ipv4: 'IPv4', subnetting: 'Subnetting',
      vlsm: 'VLSM', ipv6: 'IPv6', vlan: 'VLAN', stp: 'STP', routing: 'Routing',
      ospf: 'OSPF', bgp: 'BGP', nat: 'NAT',
    } as Record<PracticeCat, string>
  )[cat]
}
