import { useEffect, useMemo, useState } from 'react'
import { Activity, CheckCircle2, Search, TriangleAlert } from 'lucide-react'
import { DIAG_COMMANDS } from '../data/statusChecks'
import Breadcrumbs, { PageHeader } from '../components/Breadcrumbs'
import { cn } from '../lib/utils'
import { useApp } from '../context/AppContext'
import { useRoute } from '../lib/router'

export default function StatusCheckerPage() {
  const [query, setQuery] = useState('')
  const route = useRoute()
  const { setSearchOpen } = useApp()

  // ?q=cmd llega desde la búsqueda global (también al navegar dentro de la página)
  useEffect(() => {
    if (route.query.q) setQuery(route.query.q)
  }, [route.query.q])

  const normalizedQuery = query.trim().toLowerCase()
  const exact = useMemo(() => {
    if (!normalizedQuery) return undefined
    return DIAG_COMMANDS.find((d) => d.cmd.toLowerCase() === normalizedQuery)
  }, [normalizedQuery])

  const matches = useMemo(() => {
    if (!normalizedQuery || exact) return []
    return DIAG_COMMANDS.filter(
      (d) =>
        d.cmd.toLowerCase().includes(normalizedQuery) ||
        d.what.toLowerCase().includes(normalizedQuery) ||
        d.category.toLowerCase().includes(normalizedQuery),
    ).slice(0, 6)
  }, [normalizedQuery, exact])

  const categories = useMemo(() => Array.from(new Set(DIAG_COMMANDS.map((d) => d.category))), [])
  const [cat, setCat] = useState<string | null>(null)

  return (
    <div className="animate-fade-in">
      <Breadcrumbs items={[{ label: 'Comprobador de estado' }]} />
      <PageHeader
        icon={<Activity className="h-6 w-6" />}
        title="¿Está funcionando correctamente?"
        subtitle="Herramienta educativa: introduce un comando de diagnóstico y ArchForge te explica qué hace, qué información devuelve, cómo leerla y qué señales distinguen un sistema sano de uno con problemas. Nada se ejecuta en tu navegador: aprende a interpretarlo tú mismo en tu terminal."
      />

      {/* Entrada */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Escribe un comando… p. ej. lsblk, ip addr, systemctl --failed, df -h"
          className="w-full rounded-2xl border border-zinc-700 bg-ink-900 py-3.5 pl-11 pr-4 font-mono text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-sky-500/60"
          spellCheck={false}
          aria-label="Comando a diagnosticar"
        />
      </div>

      {/* Sugerencias por categoría */}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => setCat(null)}
          className={cn('rounded-lg border px-3 py-1 text-xs transition-colors', !cat ? 'border-sky-500/50 bg-sky-500/10 text-sky-300' : 'border-zinc-800 text-zinc-400 hover:border-zinc-600')}
        >
          Todos
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

      {/* Resultado exacto */}
      {exact && (
        <div className="mt-5">
          <DiagCard cmd={exact} expanded />
        </div>
      )}

      {/* Sin coincidencia exacta */}
      {!exact && normalizedQuery && (
        <div className="mt-5 rounded-2xl border border-zinc-800 bg-ink-900/70 p-5">
          <p className="text-sm leading-relaxed text-zinc-400">
            No tengo una ficha educativa para <code className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-xs text-zinc-200">{query.trim()}</code>.
            {matches.length > 0 ? ' Quizá buscabas:' : (
              <>
                {' '}Prueba con uno de los comandos del catálogo, o usa{' '}
                <button onClick={() => setSearchOpen(true)} className="font-medium text-sky-400 hover:text-sky-300">la búsqueda global (Ctrl K)</button>.
              </>
            )}
          </p>
          {matches.length > 0 && (
            <ul className="mt-3 space-y-1">
              {matches.map((m) => (
                <li key={m.id}>
                  <button onClick={() => setQuery(m.cmd)} className="font-mono text-xs text-sky-400 hover:text-sky-300">→ {m.cmd}</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Catálogo */}
      <section className="mt-8">
        <h2 className="mb-3 font-mono text-xs font-bold uppercase tracking-widest text-zinc-500">Catálogo de diagnóstico</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {DIAG_COMMANDS.filter((d) => !cat || d.category === cat).map((d) => (
            <DiagCard key={d.id} cmd={d} onPick={(q) => setQuery(q)} />
          ))}
        </div>
      </section>
    </div>
  )
}

function DiagCard({ cmd: d, expanded, onPick }: { cmd: typeof DIAG_COMMANDS[0]; expanded?: boolean; onPick?: (q: string) => void }) {
  const [open, setOpen] = useState(!!expanded)
  return (
    <article className={cn('overflow-hidden rounded-2xl border bg-ink-900/70', open ? 'border-sky-500/40' : 'border-zinc-800')}>
      <header className="flex items-center gap-3 p-4">
        <code className="min-w-0 flex-1 truncate font-mono text-sm font-semibold text-emerald-300">{d.cmd}</code>
        <span className="shrink-0 rounded-md border border-zinc-700/60 bg-zinc-800/50 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-zinc-400">
          {d.category}
        </span>
        {onPick && !open && (
          <button onClick={() => onPick(d.cmd)} className="shrink-0 rounded-md border border-zinc-700 px-2 py-1 font-mono text-[10px] text-zinc-400 hover:border-sky-500/40 hover:text-sky-300">
            analizar
          </button>
        )}
        {!onPick && (
          <button onClick={() => setOpen((v) => !v)} className="shrink-0 rounded-md border border-zinc-700 px-2 py-1 font-mono text-[10px] text-zinc-400 hover:border-sky-500/40 hover:text-sky-300">
            {open ? 'cerrar' : 'abrir'}
          </button>
        )}
      </header>

      {open && (
        <div className="space-y-4 border-t border-zinc-800 p-4 animate-fade-in">
          <p className="text-sm leading-relaxed text-zinc-300">{d.what}</p>

          <div>
            <h4 className="mb-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">Salida de ejemplo</h4>
            <pre className="overflow-x-auto rounded-xl border border-zinc-800 bg-black/40 p-3 font-mono text-xs leading-6 text-zinc-400">{d.sample.join('\n')}</pre>
          </div>

          <div>
            <h4 className="mb-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">Cómo interpretarla</h4>
            <ul className="space-y-1 text-xs leading-relaxed text-zinc-400">
              {d.reading.map((r, i) => (
                <li key={i} className="flex gap-2"><span className="text-sky-400">·</span>{r}</li>
              ))}
            </ul>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3">
              <h4 className="mb-1.5 flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" /> Señales de que todo va bien
              </h4>
              <ul className="space-y-1 text-xs leading-relaxed text-zinc-400">
                {d.healthy.map((r, i) => <li key={i}>✓ {r}</li>)}
              </ul>
            </div>
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3">
              <h4 className="mb-1.5 flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-amber-300">
                <TriangleAlert className="h-3.5 w-3.5" /> Señales de alarma
              </h4>
              <ul className="space-y-1 text-xs leading-relaxed text-zinc-400">
                {d.warning.map((r, i) => <li key={i}>⚠ {r}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}
    </article>
  )
}
