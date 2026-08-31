import type { Importance } from '../types'
import { IMPORTANCE_LABEL } from '../types'
import { cn } from '../lib/utils'
import Tooltip from './Tooltip'

const STYLES: Record<Importance, string> = {
  required: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
  recommended: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  optional: 'bg-zinc-500/10 text-zinc-400 border-zinc-600/40',
  alternative: 'bg-violet-500/10 text-violet-300 border-violet-500/30',
  experimental: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  danger: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
}

const HINTS: Record<Importance, string> = {
  required: 'Imprescindible para que el sistema funcione correctamente.',
  recommended: 'Fuertemente aconsejado para la mayoría de usuarios.',
  optional: 'Depende de tus preferencias o hardware.',
  alternative: 'Camino equivalente al principal; elige uno.',
  experimental: 'Funciona pero puede cambiar o romperse entre versiones.',
  danger: 'Puede causar pérdida de datos. Lee antes de ejecutar.',
}

export function Badge({ importance }: { importance: Importance }) {
  return (
    <span className="group/badge relative inline-flex">
      <span className={cn('inline-flex cursor-help items-center rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider', STYLES[importance])}>
        {IMPORTANCE_LABEL[importance]}
      </span>
      <Tooltip>{HINTS[importance]}</Tooltip>
    </span>
  )
}

export function Chip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-md border border-zinc-700/60 bg-zinc-800/50 px-2 py-0.5 text-xs text-zinc-300', className)}>
      {children}
    </span>
  )
}

export function LevelDots({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center gap-1" aria-label={`Nivel ${n} de 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={cn('h-1.5 w-1.5 rounded-full', i < n ? 'bg-sky-400' : 'bg-zinc-700')} />
      ))}
    </span>
  )
}
