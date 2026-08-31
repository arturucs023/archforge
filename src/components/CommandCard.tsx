import { useState } from 'react'
import { Check, ChevronDown, ChevronRight } from 'lucide-react'
import type { CommandEntry } from '../data/cmdcenter/meta'
import { DISTRO_LABEL } from '../data/cmdcenter/meta'
import { cmd } from '../data/helpers'
import type { Block } from '../types'
import Blocks from './Blocks'
import CommandBreakdown from './CommandBreakdown'
import { useApp } from '../context/AppContext'
import { cn } from '../lib/utils'

function Section({
  label,
  children,
  defaultOpen,
}: {
  label: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(!!defaultOpen)
  return (
    <div className="border-t border-zinc-800/70">
      <button onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors hover:text-sky-300">
        <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-zinc-400">{label}</span>
        <ChevronDown className={cn('ml-auto h-3.5 w-3.5 text-zinc-500 transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className="px-4 pb-4 animate-fade-in">{children}</div>}
    </div>
  )
}

export default function CommandCard({ entry, defaultOpen }: { entry: CommandEntry; defaultOpen?: boolean }) {
  const { isDone, toggleDone } = useApp()
  const [open, setOpen] = useState(!!defaultOpen)
  const learned = isDone(`cmd:${entry.id}`)
  const id = `cmd-${entry.id}`

  return (
    <article id={id} data-cmd-id={entry.id} className={cn('scroll-mt-24 overflow-hidden rounded-2xl border bg-ink-900/70 transition-colors', open ? 'border-zinc-600' : 'border-zinc-800', learned && 'border-emerald-700/40')}>
      {/* Cabecera */}
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 p-4">
        <button
          role="checkbox"
          aria-checked={learned}
          onClick={() => toggleDone(`cmd:${entry.id}`)}
          title={learned ? 'Marcar como no aprendido' : 'Marcar comando como aprendido'}
          className={cn(
            'flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors',
            learned ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300' : 'border-zinc-700 text-transparent hover:border-sky-500/60',
          )}
        >
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </button>

        <code className={cn('font-mono text-base font-bold', learned ? 'text-emerald-300/80' : 'text-emerald-300')}>{entry.name}</code>

        <span className="hidden rounded border border-zinc-700/60 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-zinc-500 sm:inline">
          {entry.distro.map((d) => DISTRO_LABEL[d]).join(' · ')}
        </span>

        <p className="min-w-0 flex-1 basis-full truncate text-xs text-zinc-400 sm:basis-auto">{entry.summary}</p>

        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-md border border-zinc-800 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
        >
          {open ? <>menos <ChevronDown className="h-3 w-3" /></> : <>más <ChevronRight className="h-3 w-3" /></>}
        </button>
      </header>

      {/* Ejemplos siempre visibles cuando está abierto */}
      {open && (
        <div className="space-y-3 px-4 pb-4 animate-fade-in">
          {entry.examples.map((ex, i) => (
            <Blocks key={i} blocks={[cmd({ caption: ex.desc }, ...ex.lines)] as Block[]} />
          ))}
          {entry.warnNote && (
            <div className="flex gap-2 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-3">
              <span aria-hidden>⚠️</span>
              <p className="text-xs leading-relaxed text-amber-200">{entry.warnNote}</p>
            </div>
          )}
          {entry.breakdown && entry.breakdown.length > 0 && (
            <CommandBreakdown tokens={entry.breakdown} />
          )}
        </div>
      )}

      {/* Secciones profundas */}
      {open && (entry.whatHappens || entry.expected || entry.verify?.length || entry.errors?.length || entry.alternatives?.length) && (
        <div className="border-t border-zinc-800/70">
          {entry.whatHappens && (
            <Section label="¿Qué ocurre por dentro?">
              <p className="text-sm leading-relaxed text-zinc-300">{entry.whatHappens}</p>
            </Section>
          )}
          {entry.expected && (
            <Section label="Resultado esperado">
              <p className="text-sm leading-relaxed text-zinc-300">{entry.expected}</p>
            </Section>
          )}
          {entry.verify && entry.verify.length > 0 && (
            <Section label="Comprobar">
              <Blocks blocks={[cmd({}, ...entry.verify)] as Block[]} />
            </Section>
          )}
          {entry.errors && entry.errors.length > 0 && (
            <Section label={`Errores frecuentes (${entry.errors.length})`}>
              <ul className="space-y-2.5">
                {entry.errors.map((e, i) => (
                  <li key={i} className="rounded-lg border border-amber-500/25 bg-amber-500/[0.05] p-3">
                    <p className="font-mono text-xs font-semibold text-amber-200">{e.symptom}</p>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-300">Solución: {e.fix}</p>
                  </li>
                ))}
              </ul>
            </Section>
          )}
          {entry.alternatives && entry.alternatives.length > 0 && (
            <Section label="Alternativas">
              <ul className="space-y-1.5">
                {entry.alternatives.map((a, i) => (
                  <li key={i} className="flex flex-wrap items-baseline gap-x-2 text-sm">
                    <code className="rounded bg-zinc-800/70 px-1.5 py-0.5 font-mono text-xs text-violet-300">{a.name}</code>
                    <span className="text-xs text-zinc-400">{a.note}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {entry.related && entry.related.length > 0 && (
            <Section label="Relacionado">
              <div className="flex flex-wrap items-center gap-2">
                {entry.related.map((rid, i) => (
                  <span key={rid} className="inline-flex items-center gap-2">
                    {i > 0 && <span className="text-zinc-600">↓</span>}
                    <a
                      href={`#/commands?focus=${encodeURIComponent(rid)}`}
                      className="rounded-lg border border-teal-500/30 bg-teal-500/[0.07] px-2.5 py-1 font-mono text-xs text-teal-300 transition-colors hover:border-teal-500/60"
                      onClick={(ev) => ev.stopPropagation()}
                    >
                      {rid}
                    </a>
                  </span>
                ))}
              </div>
              <p className="mt-1.5 text-[10px] text-zinc-600">descubre herramientas que suelen usarse juntas</p>
            </Section>
          )}
        </div>
      )}
    </article>
  )
}
