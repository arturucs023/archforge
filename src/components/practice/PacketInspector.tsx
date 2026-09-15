import { useState } from 'react'
import { ArrowDown, ArrowRight } from 'lucide-react'
import { PACKET_SCENARIOS } from '../../data/practice/packets'
import { cn } from '../../lib/utils'

export default function PacketInspector() {
  const [sel, setSel] = useState(PACKET_SCENARIOS[0].id)
  const [msg, setMsg] = useState(0)
  const sc = PACKET_SCENARIOS.find((s) => s.id === sel) ?? PACKET_SCENARIOS[0]
  const m = sc.messages[Math.min(msg, sc.messages.length - 1)]

  const pick = (id: string) => {
    setSel(id)
    setMsg(0)
  }

  return (
    <div>
      <p className="text-xs leading-relaxed text-zinc-400">
        Simulación visual (nada real): elige un protocolo, avanza mensaje a mensaje y pulsa cada uno para ver sus campos por capa.
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Protocolo a inspeccionar">
        {PACKET_SCENARIOS.map((s) => (
          <button
            key={s.id}
            onClick={() => pick(s.id)}
            aria-pressed={sel === s.id}
            className={cn(
              'rounded-lg border px-2.5 py-1.5 font-mono text-xs transition-colors',
              sel === s.id ? 'border-sky-500/60 bg-sky-500/10 text-sky-200' : 'border-zinc-800 text-zinc-400 hover:border-zinc-600',
            )}
          >
            {s.protocol}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-zinc-800 bg-ink-900/70 p-4">
        <h4 className="text-sm font-semibold text-zinc-100">{sc.title}</h4>
        <p className="mt-1 text-xs leading-relaxed text-zinc-400">{sc.story}</p>

        {/* flujo de mensajes */}
        <ol className="mt-3 flex flex-col gap-1.5">
          {sc.messages.map((mm, i) => {
            const active = i === Math.min(msg, sc.messages.length - 1)
            return (
              <li key={i} className="flex items-center gap-2">
                {i > 0 && <ArrowDown className="ml-6 h-3 w-3 shrink-0 text-zinc-700" aria-hidden />}
                <button
                  onClick={() => setMsg(i)}
                  aria-current={active}
                  className={cn(
                    'flex min-w-0 flex-1 items-center gap-2 rounded-xl border px-3 py-2 text-left transition-colors',
                    active ? 'border-sky-500/60 bg-sky-500/10' : 'border-zinc-800 bg-black/30 hover:border-zinc-600',
                  )}
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-zinc-800 font-mono text-[10px] text-zinc-300">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate font-mono text-xs text-zinc-200">
                    {mm.from} <ArrowRight className="inline h-3 w-3 text-zinc-600" /> {mm.to}
                  </span>
                  <span className={cn('shrink-0 font-mono text-[11px]', active ? 'text-sky-300' : 'text-zinc-500')}>{mm.label}</span>
                </button>
              </li>
            )
          })}
        </ol>

        {/* detalle del mensaje */}
        <div className="mt-3 rounded-xl border border-sky-500/25 bg-black/40 p-3" aria-live="polite">
          <p className="font-mono text-xs text-sky-200">
            {m.from} → {m.to} · {m.label}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-400">{m.note}</p>
          <div className="mt-2 space-y-2">
            {m.layers.map((l) => (
              <div key={l.name} className="overflow-hidden rounded-lg border border-zinc-800">
                <p className="border-b border-zinc-800 bg-zinc-900/60 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                  {l.name}
                </p>
                <dl>
                  {l.fields.map((f) => (
                    <div key={f.k} className={cn('flex flex-wrap gap-x-3 gap-y-0.5 px-2.5 py-1.5 font-mono text-[11px]', f.hot ? 'bg-amber-500/[0.07]' : 'odd:bg-zinc-900/30')}>
                      <dt className={cn('shrink-0', f.hot ? 'font-semibold text-amber-200' : 'text-zinc-500')}>{f.k}</dt>
                      <dd className={cn('min-w-0 flex-1 break-all', f.hot ? 'text-amber-100' : 'text-zinc-300')}>{f.v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
          <p className="mt-2 font-mono text-[10px] text-zinc-600">Lo resaltado en ámbar es lo que debes mirar primero en cada capa.</p>
        </div>
      </div>
    </div>
  )
}
