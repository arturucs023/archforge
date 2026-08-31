import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../lib/utils'

export interface BreakdownToken {
  token: string
  meaning: string
}

/** Descomposición interactiva: cada parte es clicable y resalta su explicación. */
export default function CommandBreakdown({ tokens }: { tokens: BreakdownToken[] }) {
  const [active, setActive] = useState<number | null>(null)
  return (
    <div className="rounded-xl border border-zinc-800 bg-ink-900/70 p-4">
      <div className="mb-3 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">
        Descomponer — pulsa cada parte
      </div>
      <div className="flex flex-wrap gap-2">
        {tokens.map((t, i) => (
          <button
            key={i}
            onClick={() => setActive(active === i ? null : i)}
            aria-pressed={active === i}
            className={cn(
              'rounded-lg border px-2.5 py-1 font-mono text-xs font-semibold transition-all',
              active === i
                ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-200'
                : 'border-zinc-700 bg-zinc-800/60 text-sky-300 hover:border-sky-500/40',
            )}
          >
            {t.token}
          </button>
        ))}
      </div>
      <ul className="mt-3 space-y-1.5">
        {tokens.map((t, i) => (
          <li
            key={i}
            className={cn(
              'flex flex-col gap-0.5 rounded-lg px-2 py-1.5 transition-colors sm:flex-row sm:gap-3',
              active === i ? 'bg-emerald-500/10' : '',
            )}
          >
            <span className="shrink-0 font-mono text-xs font-bold text-sky-300 sm:w-40 sm:truncate">{t.token}</span>
            <span className="text-xs leading-relaxed text-zinc-400">→ {t.meaning}</span>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex items-center gap-1 text-[10px] text-zinc-600">
        <ChevronDown className="h-3 w-3" /> toca un token para resaltar su significado
      </div>
    </div>
  )
}
