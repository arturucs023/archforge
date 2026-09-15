/* Tipos del sistema de práctica v1.2 ("Learn by Doing").
   Preguntas declarativas + validación local. Sin backend. */

export type PracticeCat =
  | 'linux'
  | 'bash'
  | 'redes'
  | 'ipv4'
  | 'subnetting'
  | 'vlsm'
  | 'ipv6'
  | 'vlan'
  | 'stp'
  | 'routing'
  | 'ospf'
  | 'bgp'
  | 'nat'

export type PracticeDiff = 'beginner' | 'intermediate' | 'advanced'

export const PRACTICE_CATS: { id: PracticeCat; label: string }[] = [
  { id: 'linux', label: 'Linux' },
  { id: 'bash', label: 'Bash' },
  { id: 'redes', label: 'Redes' },
  { id: 'ipv4', label: 'IPv4' },
  { id: 'subnetting', label: 'Subnetting' },
  { id: 'vlsm', label: 'VLSM' },
  { id: 'ipv6', label: 'IPv6' },
  { id: 'vlan', label: 'VLAN' },
  { id: 'stp', label: 'STP' },
  { id: 'routing', label: 'Routing' },
  { id: 'ospf', label: 'OSPF' },
  { id: 'bgp', label: 'BGP' },
  { id: 'nat', label: 'NAT' },
]

export const PRACTICE_DIFF_LABEL: Record<PracticeDiff, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
}

export interface ChoiceOption {
  text: string
  why: string
}

export interface PracticeQuestionBase {
  id: string
  cat: PracticeCat
  diff: PracticeDiff
  prompt: string
  /** contexto monoespaciado opcional (salida de terminal, tabla…) */
  context?: string
  explain: string
  /** solución correcta mostrada tras responder (texto libre) */
  solution: string
  /** id de sección existente para repasar */
  sectionId: string
}

export interface ChoiceQuestion extends PracticeQuestionBase {
  kind: 'choice'
  options: ChoiceOption[]
  answer: number
}

export interface NumericQuestion extends PracticeQuestionBase {
  kind: 'numeric'
  /** valor correcto; se compara como número con tolerancia */
  answer: number
  tolerance?: number
  /** sufijo mostrado junto al input (p. ej. "hosts") */
  unit?: string
}

export interface TextQuestion extends PracticeQuestionBase {
  kind: 'text'
  /** respuestas aceptadas (normalizadas: minúsculas, espacios colapsados) */
  accept: string[]
  placeholder?: string
}

export interface SubnetQuestion extends PracticeQuestionBase {
  kind: 'subnet'
  /** etiquetas de cada fila (p. ej. "LAN 60 hosts") */
  rows: string[]
  /** CIDR esperados en el mismo orden ("192.168.10.0/26") */
  expected: string[]
}

export type PracticeQuestion = ChoiceQuestion | NumericQuestion | TextQuestion | SubnetQuestion

export interface Challenge {
  id: string
  title: string
  cat: PracticeCat
  /** ids de preguntas del banco, en orden progresivo */
  questions: string[]
  sectionId: string
}

export interface ExamResult {
  at: number
  total: number
  ok: number
  /** aciertos por categoría */
  byCat: Partial<Record<PracticeCat, { ok: number; total: number }>>
  /** ids de preguntas falladas */
  failed: string[]
  seconds: number
}
