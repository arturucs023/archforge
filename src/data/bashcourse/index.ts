import type { BashLesson } from './types'
import { MODULES_1 } from './modules-1'
import { MODULES_2 } from './modules-2'
import { MODULES_3 } from './modules-3'
import { MODULES_4 } from './modules-4'
import { MODULES_5 } from './modules-5'
import { MODULES_6 } from './modules-6'
import { BASH_PROJECTS } from './projects'

export const BASH_MODULES: BashLesson[] = [
  ...MODULES_1,
  ...MODULES_2,
  ...MODULES_3,
  ...MODULES_4,
  ...MODULES_5,
  ...MODULES_6,
]

export function getBashLesson(id: string): BashLesson | undefined {
  return BASH_MODULES.find((m) => m.id === id)
}

export { BASH_PROJECTS }

export const BASH_TOTAL_UNITS =
  BASH_MODULES.length + BASH_PROJECTS.length
