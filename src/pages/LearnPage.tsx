import { useEffect, useMemo } from 'react'
import { ArrowLeft, ArrowRight, GraduationCap, TerminalSquare } from 'lucide-react'
import { CONCEPTS } from '../data/learnData'
import type { Concept } from '../data/learnData'
import Breadcrumbs, { PageHeader } from '../components/Breadcrumbs'
import ConceptCard from '../components/ConceptCard'
import Quiz from '../components/Quiz'
import Blocks from '../components/Blocks'
import { cmd } from '../data/helpers'
import type { Block } from '../types'
import { useApp } from '../context/AppContext'
import { navigate } from '../lib/router'

export default function LearnPage({ conceptId }: { conceptId?: string }) {
  const { isDone } = useApp()

  useEffect(() => {
    document.title = conceptId
      ? `${CONCEPTS.find((c) => c.id === conceptId)?.title ?? 'Aprender Linux'} — ArchForge`
      : 'Aprender Linux — ArchForge'
  }, [conceptId])

  const readCount = useMemo(() => CONCEPTS.filter((c) => isDone(`learn:${c.id}`)).length, [isDone])

  if (conceptId) {
    const idx = CONCEPTS.findIndex((c) => c.id === conceptId)
    const concept = idx >= 0 ? CONCEPTS[idx] : undefined
    if (!concept) {
      return (
        <div className="py-20 text-center text-zinc-400">
          Concepto no encontrado. <button className="text-sky-400" onClick={() => navigate('/learn')}>Volver a Aprender Linux</button>
        </div>
      )
    }
    return <ConceptDetail concept={concept} index={idx} />
  }

  return (
    <div className="animate-fade-in">
      <Breadcrumbs items={[{ label: 'Aprender Linux' }]} />
      <PageHeader
        icon={<GraduationCap className="h-6 w-6" />}
        title="Aprender Linux"
        subtitle="Los fundamentos explicados en dos niveles: primero sencillo, luego técnico. Cada concepto trae ejemplo ejecutable, comandos relacionados y ejercicios cuando tienen sentido."
        actions={
          <span className="rounded-lg border border-zinc-800 bg-ink-900/70 px-3 py-1.5 font-mono text-xs tabular-nums text-zinc-400">
            {readCount}/{CONCEPTS.length} leídos
          </span>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {CONCEPTS.map((c) => (
          <ConceptCard key={c.id} concept={c} />
        ))}
      </div>
    </div>
  )
}

function ConceptDetail({ concept, index }: { concept: Concept; index: number }) {
  const { isDone, markDone } = useApp()
  const prev: Concept | undefined = CONCEPTS[index - 1]
  const next: Concept | undefined = CONCEPTS[index + 1]

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [concept.id])

  return (
    <div className="animate-fade-in" key={concept.id}>
      <Breadcrumbs items={[{ label: 'Aprender Linux', to: '/learn' }, { label: concept.title }]} />

      {/* Marcar como leído */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <button onClick={() => navigate('/learn')} className="inline-flex items-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-sky-300">
          <ArrowLeft className="h-3.5 w-3.5" /> Todos los conceptos
        </button>
        <ReadToggle id={concept.id} />
      </div>

      <PageHeader icon={<GraduationCap className="h-6 w-6" />} title={concept.title} />

      <article className="space-y-5 rounded-2xl border border-violet-500/25 bg-ink-900/70 p-5 sm:p-7">
        {/* Explicación sencilla */}
        <section>
          <H>Sin tecnicismos</H>
          <p className="text-[15px] leading-relaxed text-zinc-200">{concept.simple}</p>
        </section>

        {/* Explicación técnica */}
        <section>
          <H>En profundidad</H>
          <p className="text-sm leading-relaxed text-zinc-300">{concept.technical}</p>
        </section>

        {/* Ejemplo */}
        <section>
          <H>Ejemplo real</H>
          <Blocks blocks={[cmd({}, ...concept.exampleLines)] as Block[]} />
        </section>

        {/* Comandos relacionados */}
        <section>
          <H>Comandos relacionados</H>
          <div className="flex flex-wrap gap-2">
            {concept.relatedCmds.map((r) => (
              <a key={r} href={`#/commands?focus=${encodeURIComponent(r)}`} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-600/30 bg-emerald-500/[0.07] px-2.5 py-1 font-mono text-xs text-emerald-300 transition-colors hover:border-emerald-500/60">
                <TerminalSquare className="h-3 w-3" /> {r}
              </a>
            ))}
          </div>
        </section>

        {/* Ejercicio */}
        {concept.quiz && (
          <section>
            <H>Ponlo a prueba</H>
            <Quiz quiz={concept.quiz} />
          </section>
        )}

        {!concept.quiz && !isDone(`learn:${concept.id}`) && (
          <p className="rounded-xl border border-dashed border-zinc-700 px-4 py-3 text-center text-xs leading-relaxed text-zinc-500">
            Este concepto no lleva ejercicio: marca «leído» arriba cuando lo domines.
          </p>
        )}
      </article>

      {/* Anterior / siguiente */}
      <nav className="mt-8 grid gap-3 sm:grid-cols-2">
        {prev ? (
          <button onClick={() => navigate(`/learn/${prev.id}`)} className="group rounded-xl border border-zinc-800 bg-ink-900/70 p-4 text-left transition-colors hover:border-zinc-600">
            <span className="flex items-center gap-1.5 text-xs text-zinc-500"><ArrowLeft className="h-3.5 w-3.5" /> Anterior</span>
            <span className="mt-1 block truncate text-sm font-semibold text-zinc-200 group-hover:text-violet-300">{prev.title}</span>
          </button>
        ) : <span />}
        {next ? (
          <button onClick={() => navigate(`/learn/${next.id}`)} className="group rounded-xl border border-zinc-800 bg-ink-900/70 p-4 text-right transition-colors hover:border-zinc-600">
            <span className="flex items-center justify-end gap-1.5 text-xs text-zinc-500">Siguiente <ArrowRight className="h-3.5 w-3.5" /></span>
            <span className="mt-1 block truncate text-sm font-semibold text-zinc-200 group-hover:text-violet-300">{next.title}</span>
          </button>
        ) : (
          <div className="flex items-center justify-center rounded-xl border border-emerald-600/30 bg-emerald-500/5 p-4 text-sm text-emerald-300">
            Has recorrido todos los fundamentos. Al terminal con la práctica.
          </div>
        )}
      </nav>
    </div>
  )
}

import { Check } from 'lucide-react'
function ReadToggle({ id }: { id: string }) {
  const { isDone, toggleDone } = useApp()
  const read = isDone(`learn:${id}`)
  return (
    <button
      role="checkbox"
      aria-checked={read}
      onClick={() => toggleDone(`learn:${id}`)}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
        read ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300' : 'border-zinc-700 text-zinc-400 hover:border-emerald-500/40 hover:text-emerald-300'
      }`}
    >
      <Check className="h-3.5 w-3.5" /> {read ? 'Leído' : 'Marcar leído'}
    </button>
  )
}

function H({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-violet-300">{children}</h3>
}
