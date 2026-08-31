import type { AreaId } from '../types'
import { REGISTRY, stepUnits } from '../data/registry'
import { COMMANDS } from '../data/cmdcenter/entries'
import { CONCEPTS } from '../data/learnData'
import { PROBLEMS } from '../data/troubleshooting'
import { BASH_MODULES, BASH_PROJECTS } from '../data/bashcourse'
import { LABS } from '../cli/labs'
import { SERVER_COURSES, courseProgress } from '../data/servers'

export interface AreaStat {
  id: AreaId
  label: string
  done: number
  total: number
  to: string
}

export function areaTotal(area: AreaId): number {
  switch (area) {
    case 'arch':
      return REGISTRY.reduce((acc, s) => acc + stepUnits(s).length, 0)
    case 'commands':
      return COMMANDS.length
    case 'learn':
      return CONCEPTS.length + CONCEPTS.reduce((acc, c) => acc + (c.quiz ? 1 : 0), 0)
    case 'troubleshooting':
      return PROBLEMS.length
    case 'bash':
      return BASH_MODULES.length + BASH_PROJECTS.length
    case 'labs':
      return LABS.length
    case 'servers':
      return SERVER_COURSES.reduce((acc, c) => acc + c.modules.length + 1, 0)
  }
}

export function areaDone(area: AreaId, isDone: (id: string) => boolean): number {
  let n = 0
  switch (area) {
    case 'arch':
      for (const s of REGISTRY) for (const u of stepUnits(s)) if (isDone(u)) n++
      return n
    case 'commands':
      for (const c of COMMANDS) if (isDone(`cmd:${c.id}`)) n++
      return n
    case 'learn':
      for (const c of CONCEPTS) {
        if (isDone(`learn:${c.id}`)) n++
        if (c.quiz && isDone(`quiz:${c.quiz.id}`)) n++
      }
      return n
    case 'troubleshooting':
      for (const p of PROBLEMS) if (isDone(`prob:${p.id}`)) n++
      return n
    case 'bash': {
      for (const m of BASH_MODULES) if (isDone(`bash:${m.id}`)) n++
      for (const p of BASH_PROJECTS) if (isDone(`bashproj:${p.id}`)) n++
      return n
    }
    case 'labs': {
      for (const l of LABS) if (isDone(`lab:${l.id}`)) n++
      return n
    }
    case 'servers': {
      for (const c of SERVER_COURSES) {
        const p = courseProgress(c, isDone)
        n += p.done
      }
      return n
    }
  }
}

export const AREA_META: Record<AreaId, { label: string; to: string; color: string }> = {
  arch: { label: 'Arch Linux desde cero', to: '/arch', color: 'bg-sky-500' },
  commands: { label: 'Linux Command Center', to: '/commands', color: 'bg-emerald-500' },
  learn: { label: 'Fundamentos Linux', to: '/learn', color: 'bg-violet-500' },
  bash: { label: 'Curso de Bash', to: '/bash', color: 'bg-teal-500' },
  labs: { label: 'Laboratorios CLI', to: '/terminal', color: 'bg-cyan-500' },
  troubleshooting: { label: 'Troubleshooting', to: '/troubleshooting', color: 'bg-amber-500' },
  servers: { label: 'Servicios y servidores', to: '/servers', color: 'bg-cyan-400' },
}

export function allAreas(isDone: (id: string) => boolean): AreaStat[] {
  const order: AreaId[] = ['arch', 'commands', 'learn', 'bash', 'servers', 'labs', 'troubleshooting']
  return order.map((id) => ({
    id,
    label: AREA_META[id].label,
    to: AREA_META[id].to,
    done: areaDone(id, isDone),
    total: areaTotal(id),
  }))
}
