import { useEffect } from 'react'
import { Eraser, FlaskConical, RotateCcw, ShieldCheck } from 'lucide-react'
import VirtualTerminal, { LabsPanel } from '../components/VirtualTerminal'
import CliVsRealNotice from '../components/CliVsRealNotice'
import Breadcrumbs, { PageHeader } from '../components/Breadcrumbs'
import { useApp } from '../context/AppContext'
import { COMMAND_GROUPS } from '../cli/help'
import { cn } from '../lib/utils'

type Mode = 'libre' | 'labs'

export default function TerminalPage() {
  const [mode, setMode] = useLocalState<Mode>('archforge:term-mode', 'libre')
  const { isDone } = useApp()

  useEffect(() => {
    document.title = 'Terminal interactiva — ArchForge'
  }, [])

  return (
    <div className="animate-fade-in">
      <Breadcrumbs items={[{ label: 'Terminal interactiva' }]} />
      <PageHeader
        title="ArchForge CLI"
        subtitle="Entorno Linux simulado y completamente aislado dentro de la aplicación: filesystem virtual, permisos, pipes, redirecciones, grep/sed/awk y scripts. Nada de esto ejecuta nada en tu equipo."
        icon={<ShieldCheck className="h-6 w-6 text-emerald-400" />}
      />

      {/* Aviso de sandbox */}
      <p className="mb-5 flex items-start gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] px-4 py-3 text-sm leading-relaxed text-zinc-300">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
        Esta terminal es un entorno Linux simulado. No tiene acceso a tu ordenador real.
      </p>

      {/* Tabs modo */}
      <div className="mb-5 flex gap-2">
        {(
          [
            ['libre', 'Terminal libre'],
            ['labs', 'Laboratorios'],
          ] as [Mode, string][]
        ).map(([m, label]) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-1.5 text-xs font-medium transition-colors',
              mode === m ? 'border-teal-500/50 bg-teal-500/10 text-teal-300' : 'border-zinc-800 bg-ink-900/60 text-zinc-400 hover:border-zinc-600',
            )}
          >
            {m === 'labs' && <FlaskConical className="h-3.5 w-3.5" />}
            {label}
          </button>
        ))}
      </div>

      {mode === 'libre' ? (
        <>
          <VirtualTerminal height="26rem" />
          <section className="mt-5 rounded-xl border border-zinc-800 bg-ink-900/60 p-4">
            <h3 className="mb-3 font-mono text-xs font-bold uppercase tracking-widest text-zinc-500">Comandos disponibles</h3>
            <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {COMMAND_GROUPS.map((g) => (
                <div key={g.label}>
                  <h4 className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-zinc-600">{g.label}</h4>
                  <div className="flex flex-wrap gap-x-2 gap-y-1">
                    {g.items.map((c) => (
                      <span key={c} className="rounded bg-zinc-800/60 px-1.5 py-0.5 font-mono text-[11px] leading-5 text-zinc-400">{c}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 flex items-center gap-2 text-[11px] text-zinc-600">
              <Eraser className="h-3 w-3" /> escribe help en la terminal para esta lista siempre actualizada · Ctrl+L limpiar · Ctrl+C cancelar · Tab autocompletar · ↑↓ historial · el estado persiste en este navegador
            </p>
          </section>
        </>
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <VirtualTerminal height="24rem" intro="Modo laboratorio: completa el objetivo del panel derecho y pulsa Comprobar." />
          <aside className="rounded-2xl border border-teal-500/20 bg-ink-900/70 p-4">
            <LabsPanel />
          </aside>
        </div>
      )}

      {/* progreso resumido */}
      <p className="mt-6 text-center font-mono text-[11px] text-zinc-600">
        laboratorios completados: {LABS.filter((l) => isDone(`lab:${l.id}`)).length}/{LABS.length} · integrado con tu progreso global
      </p>

      {/* Aviso educativo: CLI simulada vs Linux real */}
      <CliVsRealNotice />
    </div>
  )
}


import { LABS } from '../cli/labs'

import { useState } from 'react'
function useLocalState<T>(key: string, initial: T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(() => {
    try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : initial } catch { return initial }
  })
  const set = (nv: T): void => {
    setV(nv)
    try { localStorage.setItem(key, JSON.stringify(nv)) } catch { /* noop */ }
  }
  return [v, set]
}
