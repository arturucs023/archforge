import { Info, Lightbulb, OctagonAlert, TriangleAlert } from 'lucide-react'
import type { CalloutVariant } from '../types'
import { cn } from '../lib/utils'

const STYLES: Record<CalloutVariant, { wrap: string; icon: typeof Info; label: string; iconColor: string }> = {
  info: {
    wrap: 'border-sky-500/30 bg-sky-500/5',
    icon: Info,
    label: 'INFO',
    iconColor: 'text-sky-400',
  },
  tip: {
    wrap: 'border-emerald-500/30 bg-emerald-500/5',
    icon: Lightbulb,
    label: 'TIP',
    iconColor: 'text-emerald-400',
  },
  warning: {
    wrap: 'border-amber-500/30 bg-amber-500/5',
    icon: TriangleAlert,
    label: 'ADVERTENCIA',
    iconColor: 'text-amber-400',
  },
  danger: {
    wrap: 'border-rose-500/40 bg-rose-500/5',
    icon: OctagonAlert,
    label: 'PELIGRO',
    iconColor: 'text-rose-400',
  },
}

export default function Callout({ variant, title, text }: { variant: CalloutVariant; title?: string; text: string }) {
  const s = STYLES[variant]
  const Icon = s.icon
  return (
    <div className={cn('flex gap-3 rounded-xl border p-4 animate-fade-in', s.wrap)}>
      <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', s.iconColor)} aria-hidden />
      <div className="min-w-0">
        <div className={cn('font-mono text-[11px] font-bold tracking-widest', s.iconColor)}>{s.label}{title ? ` — ${title}` : ''}</div>
        <p className="mt-1 text-sm leading-relaxed text-zinc-300">{text}</p>
      </div>
    </div>
  )
}
