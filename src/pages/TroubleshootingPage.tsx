import { useEffect, useMemo, useState } from 'react'
import { Bug, CheckCircle2, Search, Stethoscope } from 'lucide-react'
import { PROBLEMS } from '../data/troubleshooting'
import Breadcrumbs, { PageHeader } from '../components/Breadcrumbs'
import Blocks from '../components/Blocks'
import Wizard from '../components/Wizard'
import DiagnosticScenarios from '../components/DiagnosticScenarios'
import { cn } from '../lib/utils'
import { useApp } from '../context/AppContext'

const LEVEL_META = {
  facil: { label: 'Fácil', dot: 'bg-emerald-400', chip: 'border-emerald-500/40 text-emerald-300' },
  intermedio: { label: 'Intermedio', dot: 'bg-amber-400', chip: 'border-amber-500/40 text-amber-300' },
  avanzado: { label: 'Avanzado', dot: 'bg-rose-400', chip: 'border-rose-500/40 text-rose-300' },
} as const


export default function TroubleshootingPage({ problemId }: { problemId?: string }) {
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<string | null>(null)
  const [lvl, setLvl] = useState<'todas' | 'facil' | 'intermedio' | 'avanzado'>('todas')
  const { isDone } = useApp()

  useEffect(() => {
    if (!problemId) return
    window.setTimeout(() => {
      document.getElementById(`problem-${problemId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
  }, [problemId])

  const categories = useMemo(() => Array.from(new Set(PROBLEMS.map((p) => p.category))), [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return PROBLEMS.filter((p) => {
      if (lvl !== 'todas' && p.level !== lvl) return false
      if (cat && p.category !== cat) return false
      if (!q) return true
      return (
        p.title.toLowerCase().includes(q) ||
        p.symptoms.some((s) => s.toLowerCase().includes(q)) ||
        p.causes.some((c) => c.toLowerCase().includes(q)) ||
        p.category.toLowerCase().includes(q)
      )
    })
  }, [query, cat, lvl])

  return (
    <div className="animate-fade-in">
      <Breadcrumbs items={[{ label: 'Solución de problemas' }]} />
      <PageHeader
        icon={<Bug className="h-6 w-6" />}
        title="Buscador de problemas"
        subtitle="Busca por síntoma, filtra por nivel y categoría, usa el diagnóstico guiado o practica en un escenario real dentro de la CLI simulada."
      />

      {/* Modo diagnóstico */}
      <section className="mb-8 rounded-2xl border border-teal-500/30 bg-gradient-to-br from-teal-500/10 to-transparent p-5">
        <h2 className="flex items-center gap-2 text-base font-bold text-zinc-50">
          🩺 Diagnóstico
          <span className="rounded-md border border-teal-500/40 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-teal-300">CLI virtual</span>
        </h2>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-zinc-400">
          Escenarios rotos a propósito: diagnostica paso a paso con comandos reales dentro del entorno simulado y valida cada hallazgo antes de pasar al siguiente.
        </p>
        <div className="mt-4"><DiagnosticScenarios /></div>
      </section>

      <h2 id="lista" className="mb-3 font-mono text-xs font-bold uppercase tracking-widest text-zinc-500">Lista completa ({PROBLEMS.length} problemas)</h2>

      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="p. ej. «no tengo internet», «disco lleno», «sudo no funciona»…"
          className="w-full rounded-2xl border border-zinc-700 bg-ink-900 py-3.5 pl-11 pr-4 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-sky-500/60"
        />
      </div>

      <section className="mb-6">
        <Wizard />
      </section>

      {/* Filtro por nivel */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">nivel:</span>
        {(['todas', 'facil', 'intermedio', 'avanzado'] as const).map((l) => (
          <button
            key={l}
            onClick={() => setLvl(l)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-colors',
              lvl === l ? 'border-sky-500/50 bg-sky-500/10 text-sky-300' : 'border-zinc-800 text-zinc-400 hover:border-zinc-600',
            )}
          >
            {l !== 'todas' && <span className={cn('inline-block h-1.5 w-1.5 rounded-full', LEVEL_META[l].dot)} />}
            {l === 'todas' ? 'Todos los niveles' : LEVEL_META[l].label}
          </button>
        ))}
      </div>
      <h2 id="lista" className="mb-3 font-mono text-xs font-bold uppercase tracking-widest text-zinc-500">Lista completa de problemas</h2>
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setCat(null)}
          className={cn('rounded-lg border px-3 py-1 text-xs transition-colors', !cat ? 'border-sky-500/50 bg-sky-500/10 text-sky-300' : 'border-zinc-800 text-zinc-400 hover:border-zinc-600')}
        >
          Todos ({PROBLEMS.length})
        </button>
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c === cat ? null : c)}
            className={cn('rounded-lg border px-3 py-1 text-xs transition-colors', cat === c ? 'border-sky-500/50 bg-sky-500/10 text-sky-300' : 'border-zinc-800 text-zinc-400 hover:border-zinc-600')}
          >
            {c}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="rounded-xl border border-zinc-800 bg-ink-900/60 p-6 text-center text-sm text-zinc-500">
          Sin coincidencias. Prueba con otras palabras («wifi», «audio», «arranque»…) o consulta la wiki oficial.
        </p>
      )}

      <div className="space-y-5">
        {filtered.map((pr) => (
          <ProblemCard key={pr.id} id={pr.id} />
        ))}
      </div>
    </div>
  )
}

import type { Problem } from '../types'

const SEV_STYLE: Record<Problem['severity'], string> = {
  low: 'border-emerald-500/30 text-emerald-300',
  medium: 'border-amber-500/30 text-amber-300',
  high: 'border-rose-500/30 text-rose-300',
}

function ProblemCard({ id }: { id: string }) {
  const pr = PROBLEMS.find((x) => x.id === id)!
  const [open, setOpen] = useState(false)
  const { isDone, toggleDone } = useApp()
  const resolved = isDone(`prob:${pr.id}`)
  const sevLabel = { low: 'Impacto bajo', medium: 'Impacto medio', high: 'Impacto alto' }[pr.severity]

  return (
    <article id={`problem-${pr.id}`} className={cn('scroll-mt-24 overflow-hidden rounded-2xl border bg-ink-900/70', open ? 'border-zinc-600' : 'border-zinc-800')}>
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-3 p-4 text-left sm:p-5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800/50">
          <Stethoscope className="h-4 w-4 text-sky-400" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-zinc-100">{pr.title}</span>
          <span className="mt-0.5 block truncate text-xs text-zinc-500">{pr.symptoms.slice(0, 2).join(' · ')}</span>
        </span>
        <span className={cn('hidden shrink-0 rounded-md border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider sm:inline', SEV_STYLE[pr.severity])}>
          {sevLabel}
        </span>
        <span className={cn('hidden shrink-0 items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider sm:inline-flex', LEVEL_META[pr.level]?.chip ?? '')}>
          <span className={cn('inline-block h-1.5 w-1.5 rounded-full', LEVEL_META[pr.level]?.dot ?? '')} />
          {LEVEL_META[pr.level]?.label ?? pr.level}
        </span>
        <button
          role="checkbox"
          aria-checked={resolved}
          onClick={(e) => { e.stopPropagation(); toggleDone(`prob:${pr.id}`) }}
          title={resolved ? 'Marcar como no resuelto' : 'Marcar problema como resuelto'}
          className={cn(
            'flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors',
            resolved ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300' : 'border-zinc-700 text-transparent hover:border-emerald-500/60',
          )}
        >
          <CheckCircle2 className="h-4 w-4" />
        </button>
      </button>

      {open && (
        <div className="space-y-5 border-t border-zinc-800 p-4 sm:p-6 animate-fade-in">
          <section>
            <H>Síntomas</H>
            <ul className="space-y-1 text-sm text-zinc-300">
              {pr.symptoms.map((s, i) => <li key={i} className="flex gap-2"><span className="text-rose-400">▸</span>{s}</li>)}
            </ul>
          </section>

          <section>
            <H>Causas posibles</H>
            <ul className="space-y-1 text-sm text-zinc-300">
              {pr.causes.map((c, i) => <li key={i} className="flex gap-2"><span className="text-amber-400">▸</span>{c}</li>)}
            </ul>
          </section>

          <section>
            <H>Diagnóstico — en este orden</H>
            <Blocks blocks={pr.diagnose} />
          </section>

          {pr.solutions.map((sol, i) => (
            <section key={i} className="rounded-xl border border-zinc-800 bg-black/20 p-4">
              <h4 className="mb-3 flex items-center gap-2 font-semibold text-emerald-300">
                <span className="font-mono text-xs">SOLUCIÓN {String(i + 1).padStart(2, '0')}</span>
                <span className="text-sm font-medium text-zinc-200">{sol.title}</span>
              </h4>
              <Blocks blocks={sol.blocks} />
            </section>
          ))}

          {pr.alternatives && pr.alternatives.length > 0 && (
            <section className="rounded-xl border border-violet-500/25 bg-violet-500/[0.04] p-4">
              <H violet>Alternativas</H>
              <ul className="space-y-1 text-sm text-zinc-300">
                {pr.alternatives.map((a, i) => <li key={i} className="flex gap-2"><span className="text-violet-400">▸</span>{a}</li>)}
              </ul>
            </section>
          )}

          <section className="flex gap-2.5 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3">
            <span className="mt-0.5 font-mono text-[11px] font-bold uppercase tracking-wider text-emerald-300 shrink-0">Comprobación final</span>
            <p className="text-sm leading-relaxed text-zinc-300">{pr.finalCheck}</p>
          </section>
        </div>
      )}
    </article>
  )
}

function H({ children, violet }: { children: React.ReactNode; violet?: boolean }) {
  return (
    <h4 className={cn('mb-2 font-mono text-xs font-bold uppercase tracking-widest', violet ? 'text-violet-300' : 'text-zinc-400')}>
      {children}
    </h4>
  )
}
