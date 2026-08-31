import { useState } from 'react'
import { Check, Minus, Scale, X } from 'lucide-react'
import { COMPARISONS } from '../data/comparisons'
import Breadcrumbs, { PageHeader } from '../components/Breadcrumbs'
import { LevelDots } from '../components/Badge'
import { navigate } from '../lib/router'
import { cn } from '../lib/utils'

export default function ComparePage({ cmpId }: { cmpId?: string }) {
  const current = COMPARISONS.find((c) => c.id === cmpId) ?? COMPARISONS[0]

  return (
    <div className="animate-fade-in">
      <Breadcrumbs items={[{ label: 'Comparador de decisiones' }, ...(cmpId ? [{ label: current.title }] : [])]} />
      <PageHeader
        icon={<Scale className="h-6 w-6" />}
        title="Comparador de decisiones"
        subtitle="Las elecciones importantes al configurar Arch, enfrentadas con honestidad: dificultad, ventajas, desventajas y para quién tiene sentido cada opción."
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {COMPARISONS.map((c) => (
          <button
            key={c.id}
            onClick={() => navigate(`/compare/${c.id}`)}
            className={cn(
              'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
              c.id === current.id
                ? 'border-violet-500/50 bg-violet-500/10 text-violet-200'
                : 'border-zinc-800 bg-ink-900/60 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200',
            )}
          >
            {c.title}
          </button>
        ))}
      </div>

      <section className="rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-500/10 to-transparent p-5">
        <p className="font-mono text-[11px] uppercase tracking-widest text-violet-300">{current.question}</p>
        <h2 className="mt-1 text-xl font-bold text-zinc-50">{current.title}</h2>
        <p className="mt-3 max-w-4xl text-sm leading-relaxed text-zinc-300">
          <span className="mr-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-violet-300">Veredicto</span>
          {current.verdict}
        </p>
      </section>

      {/* Tarjetas por opción */}
      <div className={cn('mt-5 grid gap-4', current.options.length > 2 ? 'lg:grid-cols-3' : 'md:grid-cols-2')}>
        {current.options.map((o) => (
          <article key={o.id} className="rounded-2xl border border-zinc-800 bg-ink-900/70 p-5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-lg font-bold text-zinc-100">{o.name}</h3>
              <span className="flex items-center gap-1.5" title={`Dificultad ${o.difficulty}/5`}>
                <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">dificultad</span>
                <LevelDots n={o.difficulty} />
              </span>
            </div>

            <div className="mt-4 space-y-3">
              <ProsCons items={o.pros} good />
              <ProsCons items={o.cons} />
            </div>

            <dl className="mt-4 space-y-2 border-t border-zinc-800 pt-4 text-xs leading-relaxed">
              <Row k="Rendimiento" v={o.performance} />
              <Row k="Compatibilidad" v={o.compatibility} />
              <Row k="Mantenimiento" v={o.maintenance} />
            </dl>

            <div className="mt-4 rounded-lg border border-sky-500/25 bg-sky-500/5 p-3 text-xs leading-relaxed text-zinc-300">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-sky-300">Recomendado para</span>
              <br />
              {o.recommendedFor}
            </div>
          </article>
        ))}
      </div>

      {/* Tabla resumen */}
      <section className="mt-6 overflow-x-auto rounded-2xl border border-zinc-800">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/70">
              <th className="px-4 py-2.5 font-mono text-xs uppercase tracking-wider text-zinc-400">Criterio</th>
              {current.options.map((o) => (
                <th key={o.id} className="px-4 py-2.5 font-semibold text-zinc-200">{o.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(
              [
                ['Dificultad', (o: typeof current.options[0]) => `${o.difficulty}/5`],
                ['Rendimiento', (o: typeof current.options[0]) => o.performance],
                ['Compatibilidad', (o: typeof current.options[0]) => o.compatibility],
                ['Mantenimiento', (o: typeof current.options[0]) => o.maintenance],
                ['Para quién', (o: typeof current.options[0]) => o.recommendedFor],
              ] as const
            ).map(([label, fn], i) => (
              <tr key={i} className="border-b border-zinc-800/50 last:border-0 odd:bg-zinc-900/20">
                <td className="px-4 py-2.5 font-medium text-zinc-300">{label}</td>
                {current.options.map((o) => (
                  <td key={o.id} className="px-4 py-2.5 align-top text-xs leading-relaxed text-zinc-400">{fn(o)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="inline font-mono text-[10px] uppercase tracking-wider text-zinc-500">{k}: </dt>
      <dd className="inline text-zinc-400">{v}</dd>
    </div>
  )
}

function ProsCons({ items, good }: { items: string[]; good?: boolean }) {
  const Icon = good ? Check : X
  return (
    <ul className="space-y-1.5">
      {items.map((it, i) => (
        <li key={i} className="flex items-start gap-2 text-xs leading-relaxed">
          <Icon className={cn('mt-0.5 h-3 w-3 shrink-0', good ? 'text-emerald-400' : 'text-rose-400')} strokeWidth={3} />
          <span className="text-zinc-400">{it}</span>
        </li>
      ))}
      {items.length === 0 && (
        <li className="flex items-center gap-2 text-xs text-zinc-600">
          <Minus className="h-3 w-3" /> sin puntos destacables
        </li>
      )}
    </ul>
  )
}
