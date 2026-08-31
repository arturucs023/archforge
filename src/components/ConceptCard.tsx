import { Check } from 'lucide-react'
import type { Concept } from '../data/learnData'
import { useApp } from '../context/AppContext'
import { cn } from '../lib/utils'

export default function ConceptCard({ concept }: { concept: Concept }) {
  const { isDone, toggleDone } = useApp()
  const read = isDone(`learn:${concept.id}`)
  return (
    <article className={cn('group relative overflow-hidden rounded-2xl border bg-ink-900/70 p-5 transition-colors', read ? 'border-emerald-700/40' : 'border-zinc-800 hover:border-violet-500/40')}>
      <a href={`#/learn/${concept.id}`} className="absolute inset-0" aria-label={concept.title} />
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-zinc-100 group-hover:text-violet-200">{concept.title}</h3>
        <button
          role="checkbox"
          aria-checked={read}
          onClick={(e) => { e.preventDefault(); toggleDone(`learn:${concept.id}`) }}
          title={read ? 'Marcar como no leído' : 'Marcar concepto como leído'}
          className={cn(
            'relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors',
            read ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300' : 'border-zinc-700 text-transparent hover:border-violet-500/60',
          )}
        >
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </button>
      </div>
      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-zinc-400">{concept.simple}</p>
      <div className="mt-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-zinc-600">
        <span>{concept.relatedCmds.slice(0, 3).join(' · ')}</span>
        {concept.quiz && <span className="ml-auto rounded border border-violet-500/30 px-1.5 py-0.5 text-violet-400">quiz</span>}
      </div>
    </article>
  )
}
