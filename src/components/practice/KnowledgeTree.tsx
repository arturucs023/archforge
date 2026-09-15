import { useState } from 'react'
import { CheckCircle2, ChevronDown, CircleDashed, Trophy } from 'lucide-react'
import type { TreeGroup } from '../../lib/practice'
import { navigate } from '../../lib/router'
import { cn } from '../../lib/utils'

const STATE_META = {
  mastered: { label: 'Dominado', cls: 'border-amber-500/50 bg-amber-500/10 text-amber-300' },
  done: { label: 'Completado', cls: 'border-emerald-500/40 bg-emerald-500/[0.07] text-emerald-300' },
  started: { label: 'En progreso', cls: 'border-sky-500/40 bg-sky-500/[0.07] text-sky-300' },
  todo: { label: 'No iniciado', cls: 'border-zinc-800 text-zinc-500' },
} as const

export default function KnowledgeTree({ tree }: { tree: TreeGroup[] }) {
  const [open, setOpen] = useState<Record<string, boolean>>(() => Object.fromEntries(tree.map((g) => [g.id, true])))

  return (
    <div className="space-y-3">
      <p className="text-xs leading-relaxed text-zinc-500">
        Construido a partir de los grupos y unidades reales de ArchForge. <span className="text-amber-300/90">Dominado</span> = unidad completa + sus retos superados.
      </p>
      {tree.map((g) => {
        const pct = g.total ? Math.round((g.done / g.total) * 100) : 0
        const expanded = open[g.id] ?? true
        return (
          <div key={g.id} className="overflow-hidden rounded-2xl border border-zinc-800 bg-ink-900/70">
            <button
              onClick={() => setOpen((o) => ({ ...o, [g.id]: !expanded }))}
              aria-expanded={expanded}
              className="flex w-full items-center gap-3 p-4 text-left"
            >
              <ChevronDown className={cn('h-4 w-4 shrink-0 text-zinc-500 transition-transform', !expanded && '-rotate-90')} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-zinc-100">{g.label}</span>
                <span className="mt-1 block h-1 overflow-hidden rounded-full bg-zinc-800">
                  <span className="block h-full rounded-full bg-sky-500" style={{ width: `${pct}%` }} />
                </span>
              </span>
              <span className="shrink-0 font-mono text-[11px] tabular-nums text-zinc-500">{g.done}/{g.total} · {pct}%</span>
            </button>
            {expanded && (
              <ul className="space-y-px border-t border-zinc-800/60 p-2">
                {g.sections.map((s) => {
                  const m = STATE_META[s.state]
                  return (
                    <li key={s.id}>
                      <button
                        onClick={() => navigate(`/section/${s.id}`)}
                        title={`${s.title} — ${m.label} (${s.done}/${s.total})`}
                        className="group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-zinc-800/60"
                      >
                        <span aria-hidden className="font-mono text-[10px] text-zinc-700">└─</span>
                        <span className="min-w-0 flex-1 truncate text-[13px] text-zinc-300 group-hover:text-zinc-100">{s.title}</span>
                        <span className={cn('hidden shrink-0 rounded-md border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider sm:inline', m.cls)}>
                          {m.label}
                        </span>
                        {s.state === 'done' || s.state === 'mastered' ? (
                          s.state === 'mastered'
                            ? <Trophy className="h-3.5 w-3.5 shrink-0 text-amber-400" aria-label="Dominado" />
                            : <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" aria-label="Completado" />
                        ) : s.state === 'started' ? (
                          <span className="shrink-0 font-mono text-[10px] tabular-nums text-sky-400">{s.done}/{s.total}</span>
                        ) : (
                          <CircleDashed className="h-3.5 w-3.5 shrink-0 text-zinc-700" aria-label="No iniciado" />
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )
      })}
    </div>
  )
}
