import type { Block, Level, QuizData } from '../../types'
import type { ShellSession } from '../../cli/engine'

export interface ServerModule {
  id: string
  num: string
  title: string
  minutes: number
  goals: string[]
  blocks: Block[]
  quiz?: QuizData
  /** dificultad propia del módulo (para cursos con progresión básico→intermedio) */
  level?: Level
}

export interface ServerLabCheck {
  pass: boolean
  detail: string
}

export interface ServerLab {
  objective: string
  intro?: string
  seedFiles?: Record<string, string>
  tasks: string[]
  hints: string[]
  validate(session: ShellSession): ServerLabCheck
}

export interface PrereqLink {
  label: string
  icon: string
  to: string
}

/** Recomendación contextual basada en contenido realmente relacionado */
export interface RelatedLink {
  label: string
  /** 'course' → /servers/:id · 'section' → /section/:id */
  kind: 'course' | 'section'
  to: string
}

export interface ServerCourse {
  id: string
  icon: string
  title: string
  tagline: string
  level: Level
  /** distribuciones recomendadas para aprender este servicio */
  recommended: ('arch' | 'debian')[]
  minutes: number
  keywords: string[]
  prereqs: PrereqLink[]
  /** ids del Command Center enlazados con «Ver en Cheatsheet» */
  cheatsheetIds: string[]
  /** ids de problemas del solucionador relacionados */
  problemIds: string[]
  modules: ServerModule[]
  lab: ServerLab
  /** «También te puede interesar»: relaciones reales con otros cursos/secciones */
  related?: RelatedLink[]
  /**
   * Laboratorios EXTERNOS: se realizan en la máquina real del usuario (VM),
   * no en la CLI simulada de ArchForge. La UI oculta la terminal y el botón
   * Comprobar, y la finalización es manual mediante el checkbox.
   */
  virtual?: boolean
}

export function srvModule(
  id: string,
  num: string,
  title: string,
  minutes: number,
  goals: string[],
  blocks: Block[],
  opts?: { quiz?: QuizData; level?: Level },
): ServerModule {
  return { id, num, title, minutes, goals, blocks, ...opts }
}
