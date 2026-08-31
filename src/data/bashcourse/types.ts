import type { QuizData } from '../../types'

export type BashLevel = 'beginner' | 'intermediate' | 'expert'

export const BASH_LEVEL_LABEL: Record<BashLevel, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  expert: 'Avanzado',
}

export interface BashExample {
  caption?: string
  lines: string[]
}

export interface BashBreakdown {
  caption?: string
  tokens: { token: string; meaning: string }[]
}

export type ExerciseKind = 'choice' | 'write' | 'predict'

export interface BashExercise {
  id: string
  kind: ExerciseKind
  question: string
  /** código o salida que se muestra antes de la pregunta */
  context?: string
  contextCaption?: string
  options?: { text: string; why: string }[]
  answer?: number
  /** respuestas normalizadas aceptadas para kind='write' */
  accept?: string[]
  placeholder?: string
  solutionLines: string[]
  explanation: string
}

export interface BashChallenge {
  text: string
  hints: string[]
  solutionLines: string[]
}

export interface SimSpec {
  intro?: string
  /** ficheros del FS virtual: clave = ruta absoluta */
  files?: Record<string, string>
  tasks: string[]
}

export interface KeyCommand {
  name: string
  syntax: string
  what: string
  exit?: string
}

export interface BashLesson {
  id: string
  num: string
  title: string
  level: BashLevel
  minutes: number
  goals: string[]
  simple: string[]
  technical?: string[]
  keyCommands?: KeyCommand[]
  examples?: BashExample[]
  breakdowns?: BashBreakdown[]
  sim?: SimSpec
  exercises: BashExercise[]
  challenge?: BashChallenge
  summary: string[]
}

export interface BashProject {
  id: string
  num: string
  title: string
  level: BashLevel
  minutes: number
  goal: string
  requirements: string[]
  concepts: string[]
  starter: { filename: string; content: string }
  solution: { filename: string; content: string }
  verify: string[]
  final?: boolean
}
