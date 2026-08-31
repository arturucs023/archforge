import type { BuilderResult, Section, SectionContent } from '../types'
import { SECTIONS } from './sections'
import { fundamentals } from './content/fundamentals'
import { installation } from './content/installation'
import { packages } from './content/packages'
import { systemCore } from './content/systemCore'
import { desktops } from './content/desktops'
import { shells } from './content/shells'
import { tools } from './content/tools'
import { devopsGaming } from './content/devopsGaming'
import { maintenance } from './content/maintenance'
import { expert } from './content/expert'

const CONTENT = {
  ...fundamentals,
  ...packages,
  ...systemCore,
  ...desktops,
  ...shells,
  ...tools,
  ...devopsGaming,
  ...maintenance,
  ...expert,
} as Record<string, SectionContent>
CONTENT['installation'] = installation

/** Todas las secciones con su contenido fusionado, en el orden del sidebar. */
export const REGISTRY: Section[] = SECTIONS.map((meta) => ({
  ...meta,
  ...(CONTENT[meta.id] ?? {}),
}))

export function getSection(id: string): Section | undefined {
  return REGISTRY.find((s) => s.id === id)
}

export function prevNextSection(id: string): { prev?: Section; next?: Section } {
  const i = REGISTRY.findIndex((s) => s.id === id)
  return { prev: i > 0 ? REGISTRY[i - 1] : undefined, next: i >= 0 && i < REGISTRY.length - 1 ? REGISTRY[i + 1] : undefined }
}

/** Unidad de progreso: cada paso cuenta; las secciones sin pasos cuentan como 1. */
export function stepUnits(s: Section): string[] {
  if (s.steps && s.steps.length > 0) return s.steps.map((st) => st.id)
  return [`${s.id}::section`]
}

export function totalUnits(): number {
  return REGISTRY.reduce((acc, s) => acc + stepUnits(s).length, 0)
}

/* ------------------------------- Arch Builder ------------------------------- */

let builderModule: Promise<{ buildGuide: (cfg: import('../types').BuilderConfig) => BuilderResult }> | null = null

export async function loadBuilder() {
  if (!builderModule) {
    builderModule = import('./builderLogic')
  }
  return builderModule
}
