import type { VFS } from './fs'
import type { ShellState } from './state'

export interface DiagStep {
  prompt: string
  hint: string
  validate(s: ShellSessionLike): { ok: boolean; detail: string }
}

export interface DiagScenario {
  id: string
  title: string
  level: 'facil' | 'intermedio' | 'avanzado'
  brief: string
  rootSeed?(vfs: VFS): void
  steps: DiagStep[]
}

export interface ShellSessionLike {
  vfs: import('./fs').VFS
  state: ShellState
}
