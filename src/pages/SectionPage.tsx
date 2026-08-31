import { useEffect } from 'react'
import { ArrowLeft, ArrowRight, CircleCheck } from 'lucide-react'
import type { Section } from '../types'
import { LEVEL_LABEL } from '../types'
import { getSection, prevNextSection, stepUnits } from '../data/registry'
import { getIcon } from '../lib/icons'
import { useApp } from '../context/AppContext'
import { navigate } from '../lib/router'
import Breadcrumbs, { PageHeader } from '../components/Breadcrumbs'
import StepCard from '../components/StepCard'
import Blocks from '../components/Blocks'
import { Badge, Chip } from '../components/Badge'
import { formatMinutes } from '../lib/utils'

export default function SectionPage({ sectionId, focusStep }: { sectionId: string; focusStep?: string }) {
  const { isDone, markDone, setLastVisit } = useApp()
  const section = getSection(sectionId)

  useEffect(() => {
    if (!section) return
    setLastVisit(section.id)
    document.title = `${section.title} — ArchForge`
  }, [section, setLastVisit])

  useEffect(() => {
    if (section && focusStep) {
      // pequeño retardo para permitir el render
      const t = window.setTimeout(() => {
        document.getElementById(`step-${focusStep}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 60)
      return () => window.clearTimeout(t)
    }
  }, [section, focusStep])

  if (!section) {
    return (
      <div className="py-20 text-center text-zinc-400">
        Sección no encontrada.{' '}
        <button className="text-sky-400" onClick={() => navigate('/')}>Volver al dashboard</button>
      </div>
    )
  }

  return <SectionView key={section.id} section={section} focusStep={focusStep} isDone={isDone} markDone={markDone} />
}

function SectionView({
  section,
  focusStep,
  isDone,
  markDone,
}: {
  section: Section
  focusStep?: string
  isDone: (id: string) => boolean
  markDone: (id: string, v: boolean) => void
}) {
  const steps = section.steps ?? []
  const units = stepUnits(section)
  const doneCount = units.filter((u) => isDone(u)).length
  const allDone = doneCount === units.length && units.length > 0
  const { prev, next } = prevNextSection(section.id)

  const toggleAll = () => {
    const target = !allDone
    for (const u of units) markDone(u, target)
  }

  return (
    <div className="animate-fade-in">
      <Breadcrumbs items={[{ label: section.title }]} />

      <PageHeader
        title={section.title}
        subtitle={section.lead}
        icon={<SectionIcon id={section.icon} />}
        actions={
          <button
            onClick={toggleAll}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              allDone
                ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                : 'border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:border-emerald-500/40 hover:text-emerald-300'
            }`}
          >
            <CircleCheck className="h-4 w-4" />
            {allDone ? 'Sección completada' : `Marcar sección (${doneCount}/${units.length})`}
          </button>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Chip>~{formatMinutes(section.minutes)}</Chip>
        <Chip>Nivel: {LEVEL_LABEL[section.level]}</Chip>
        {steps.length > 0 && (
          <Chip>
            <span className="h-2 w-2 overflow-hidden rounded-full bg-zinc-700">
              <span className="block h-full bg-sky-500" style={{ width: `${Math.round((doneCount / units.length) * 100)}%` }} />
            </span>
            {steps.length} pasos · {doneCount} hechos
          </Chip>
        )}
        {(section.keywords ?? []).slice(0, 4).map((k) => (
          <Chip key={k} className="text-zinc-500">{k}</Chip>
        ))}
      </div>

      {/* Contenido en pasos */}
      {steps.length > 0 ? (
        <div className="space-y-4">
          {steps.map((st, i) => (
            <StepCard key={st.id} step={st} index={i + 1} />
          ))}
        </div>
      ) : (
        <article className="rounded-2xl border border-zinc-800 bg-ink-900/70 p-5 sm:p-7">
          <Blocks blocks={section.blocks} />
        </article>
      )}

      {/* Relacionadas */}
      {section.related && section.related.length > 0 && (
        <section className="mt-8">
          <h3 className="mb-3 font-mono text-xs font-bold uppercase tracking-widest text-zinc-500">Secciones relacionadas</h3>
          <div className="flex flex-wrap gap-2">
            {section.related.map((r) => {
              const rel = getSection(r)
              if (!rel) return null
              return (
                <button
                  key={r}
                  onClick={() => navigate(`/section/${r}`)}
                  className="group flex items-center gap-2 rounded-xl border border-zinc-800 bg-ink-900/70 px-3.5 py-2.5 text-left transition-colors hover:border-sky-500/40"
                >
                  <Badge importance={rel.level === 'beginner' ? 'recommended' : 'optional'} />
                  <span className="text-sm text-zinc-300 group-hover:text-sky-300">{rel.title}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-zinc-600 group-hover:text-sky-400" />
                </button>
              )
            })}
          </div>
        </section>
      )}

      {/* Anterior / siguiente */}
      <nav className="mt-10 grid gap-3 sm:grid-cols-2" aria-label="Navegación entre secciones">
        {prev ? (
          <button onClick={() => navigate(`/section/${prev.id}`)} className="group rounded-xl border border-zinc-800 bg-ink-900/70 p-4 text-left transition-colors hover:border-zinc-600">
            <span className="flex items-center gap-1.5 text-xs text-zinc-500"><ArrowLeft className="h-3.5 w-3.5" /> Anterior</span>
            <span className="mt-1 block truncate text-sm font-semibold text-zinc-200 group-hover:text-sky-300">{prev.title}</span>
          </button>
        ) : <span />}
        {next ? (
          <button onClick={() => navigate(`/section/${next.id}`)} className="group rounded-xl border border-zinc-800 bg-ink-900/70 p-4 text-right transition-colors hover:border-zinc-600 sm:text-right">
            <span className="flex items-center justify-end gap-1.5 text-xs text-zinc-500">Siguiente <ArrowRight className="h-3.5 w-3.5" /></span>
            <span className="mt-1 block truncate text-sm font-semibold text-zinc-200 group-hover:text-sky-300">{next.title}</span>
          </button>
        ) : (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-600/30 bg-emerald-500/5 p-4 text-sm text-emerald-300">
            <CircleCheck className="h-4 w-4" /> Has llegado al final de la guía. ¡Enhorabuena!
          </div>
        )}
      </nav>
    </div>
  )
}

function SectionIcon({ id }: { id: string }) {
  const Icon = getIcon(id)
  return <Icon className="h-6 w-6" />
}
