import { useState } from 'react'
import { Check, ChevronDown, CircleAlert, Crosshair, ListChecks, Target, Wrench } from 'lucide-react'
import type { Step } from '../types'
import { useApp } from '../context/AppContext'
import { cn } from '../lib/utils'
import Blocks from './Blocks'
import { Badge } from './Badge'

export default function StepCard({ step, index }: { step: Step; index: number }) {
  const { isDone, toggleDone } = useApp()
  const [open, setOpen] = useState(true)
  const [openErrors, setOpenErrors] = useState(false)
  const done = isDone(step.id)

  return (
    <article
      id={`step-${step.id}`}
      className={cn(
        'scroll-mt-24 rounded-2xl border bg-ink-900/70 transition-colors',
        done ? 'border-emerald-600/30' : 'border-zinc-800',
      )}
    >
      {/* Cabecera */}
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 p-4 sm:p-5">
        <button
          role="checkbox"
          aria-checked={done}
          onClick={() => toggleDone(step.id)}
          title={done ? 'Marcar como pendiente' : 'Marcar paso como completado'}
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400',
            done
              ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
              : 'border-zinc-700 bg-zinc-800/50 text-transparent hover:border-sky-500/60 hover:text-sky-500/50',
          )}
        >
          <Check className="h-4 w-4" strokeWidth={3} />
        </button>

        <span className="font-mono text-sm font-bold text-zinc-500">
          {String(index).padStart(2, '0')}
        </span>

        <h3 className={cn('min-w-0 flex-1 text-base font-semibold', done ? 'text-zinc-500 line-through decoration-zinc-600' : 'text-zinc-100')}>
          {step.title}
        </h3>

        <Badge importance={step.importance} />
        {step.minutes && (
          <span className="hidden font-mono text-xs text-zinc-500 sm:inline">~{step.minutes} min</span>
        )}

        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="rounded-md border border-zinc-800 p-1 text-zinc-500 transition-colors hover:border-zinc-600 hover:text-zinc-300"
          title={open ? 'Contraer' : 'Expandir'}
        >
          <ChevronDown className={cn('h-4 w-4 transition-transform', !open && '-rotate-90')} />
        </button>
      </header>

      {open && (
        <div className="space-y-5 border-t border-zinc-800/70 p-4 pt-4 sm:p-5 animate-fade-in">
          {/* Objetivo */}
          <div className="flex gap-2.5 rounded-xl border border-sky-500/20 bg-sky-500/5 p-3">
            <Target className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
            <p className="text-sm leading-relaxed text-zinc-300">
              <span className="mr-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-sky-300">Objetivo</span>
              {step.goal}
            </p>
          </div>

          {/* Contenido */}
          <Blocks blocks={step.blocks} />

          {/* Resultado esperado */}
          {step.expect && (
            <div className="flex gap-2.5 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3">
              <Crosshair className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              <p className="text-sm leading-relaxed text-zinc-300">
                <span className="mr-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-emerald-300">Resultado esperado</span>
                {step.expect}
              </p>
            </div>
          )}

          {/* Comprobación */}
          {step.verify && step.verify.length > 0 && (
            <section>
              <h4 className="mb-2 flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-zinc-400">
                <ListChecks className="h-4 w-4 text-emerald-400" /> Comprobar que funcionó
              </h4>
              <Blocks blocks={step.verify} />
            </section>
          )}

          {/* Errores frecuentes */}
          {step.errors && step.errors.length > 0 && (
            <section className="rounded-xl border border-amber-500/25 bg-amber-500/[0.04]">
              <button
                onClick={() => setOpenErrors((v) => !v)}
                className="flex w-full items-center gap-2 px-4 py-3 text-left"
              >
                <CircleAlert className="h-4 w-4 shrink-0 text-amber-400" />
                <span className="text-sm font-medium text-amber-200">
                  Errores frecuentes ({step.errors.length})
                </span>
                <ChevronDown className={cn('ml-auto h-4 w-4 text-amber-400 transition-transform', openErrors && 'rotate-180')} />
              </button>
              {openErrors && (
                <ul className="space-y-3 px-4 pb-4">
                  {step.errors.map((e, i) => (
                    <li key={i} className="rounded-lg border border-zinc-800 bg-ink-900/60 p-3">
                      <p className="text-sm font-medium text-zinc-200">{e.symptom}</p>
                      {e.cause && <p className="mt-1 text-xs leading-relaxed text-zinc-500">Causa probable: {e.cause}</p>}
                      <p className="mt-1.5 text-xs leading-relaxed text-emerald-300/90">Solución: {e.fix}</p>
                      {e.fixBlocks && <div className="mt-2"><Blocks blocks={e.fixBlocks} /></div>}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {/* Alternativas */}
          {step.alternatives && step.alternatives.length > 0 && (
            <section className="rounded-xl border border-violet-500/25 bg-violet-500/[0.04] p-4">
              <h4 className="mb-2 flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-violet-300">
                <Wrench className="h-4 w-4" /> Alternativas
              </h4>
              <Blocks blocks={step.alternatives} />
            </section>
          )}
        </div>
      )}
    </article>
  )
}
