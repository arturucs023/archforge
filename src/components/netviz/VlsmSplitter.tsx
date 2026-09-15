import { useState } from 'react'
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import { cn } from '../../lib/utils'

interface VlsmStep {
  name: string
  hostsNeeded: number
  hostsUsable: number
  prefix: number
  subnet: string
  range: string
  broadcast: string
  explain: string
  usedBits: number
}

/* Diseño previo calculado para 192.168.10.0/24, ordenado de mayor a menor. */
const STEPS: VlsmStep[] = [
  {
    name: 'LAN Ventas — 100 hosts',
    hostsNeeded: 100,
    hostsUsable: 126,
    prefix: 25,
    subnet: '192.168.10.0/25',
    range: '192.168.10.1 – 192.168.10.126',
    broadcast: '192.168.10.127',
    explain:
      'Se empieza por la red MÁS GRANDE. 100 hosts necesitan 7 bits de host (2⁷−2 = 126 ≥ 100). Se toma la primera mitad del /24: 192.168.10.0/25 (0–127). Queda libre 192.168.10.128/25.',
    usedBits: 50,
  },
  {
    name: 'LAN Ingeniería — 50 hosts',
    hostsNeeded: 50,
    hostsUsable: 62,
    prefix: 26,
    subnet: '192.168.10.128/26',
    range: '192.168.10.129 – 192.168.10.190',
    broadcast: '192.168.10.191',
    explain:
      '50 hosts necesitan 6 bits (2⁶−2 = 62 ≥ 50). Se divide el bloque libre 128/25 en dos /26 y se toma el primero: 128/26 (128–191). Queda libre 192.168.10.192/26.',
    usedBits: 75,
  },
  {
    name: 'LAN Dirección — 25 hosts',
    hostsNeeded: 25,
    hostsUsable: 30,
    prefix: 27,
    subnet: '192.168.10.192/27',
    range: '192.168.10.193 – 192.168.10.222',
    broadcast: '192.168.10.223',
    explain:
      '25 hosts necesitan 5 bits (2⁵−2 = 30 ≥ 25). Se divide el bloque libre 192/26 en dos /27 y se toma el primero: 192/27 (192–223). Queda libre 192.168.10.224/27.',
    usedBits: 87.5,
  },
  {
    name: 'Enlace WAN-1 — 2 hosts',
    hostsNeeded: 2,
    hostsUsable: 2,
    prefix: 30,
    subnet: '192.168.10.224/30',
    range: '192.168.10.225 – 192.168.10.226',
    broadcast: '192.168.10.227',
    explain:
      'Un enlace punto a punto solo necesita 2 direcciones: un /30 (2²−2 = 2). Se toma del bloque libre 224/27 el primer /30: 224/30. Quedan libres 228/30, 232/30… hasta 252/30.',
    usedBits: 89.1,
  },
  {
    name: 'Enlace WAN-2 — 2 hosts',
    hostsNeeded: 2,
    hostsUsable: 2,
    prefix: 30,
    subnet: '192.168.10.228/30',
    range: '192.168.10.229 – 192.168.10.230',
    broadcast: '192.168.10.231',
    explain:
      'El siguiente /30 libre es 228/30. Observa el desperdicio evitado: con FLSM dimensionado a la LAN mayor (/25) necesitarías cinco /25 (640 direcciones, ni caben en este /24); con FLSM a /26 ni siquiera cubrirías los 100 hosts. VLSM ajusta cada subred a su necesidad real.',
    usedBits: 90.6,
  },
]

const BAR_COLORS = ['bg-sky-500/70', 'bg-emerald-500/70', 'bg-amber-500/70', 'bg-violet-500/70', 'bg-rose-500/70']
const BAR_WIDTHS = [50, 25, 12.5, 1.56, 1.56]

export default function VlsmSplitter() {
  const [idx, setIdx] = useState(0)
  const step = STEPS[idx]
  return (
    <div>
      <p className="text-xs leading-relaxed text-zinc-400">
        Bloque inicial: <span className="font-mono text-zinc-200">192.168.10.0/24</span> (256 direcciones).
        Avanza paso a paso: siempre se ordena de mayor a menor y se subdivide el espacio libre.
      </p>

      {/* Barra de división progresiva */}
      <div className="mt-3">
        <div className="flex h-9 w-full overflow-hidden rounded-lg border border-zinc-700">
          {STEPS.map((s, i) => (
            <div
              key={s.subnet}
              style={{ width: `${BAR_WIDTHS[i]}%` }}
              title={`${s.name}: ${s.subnet}`}
              className={cn(
                'flex items-center justify-center font-mono text-[9px] transition-all',
                BAR_COLORS[i],
                i <= idx ? 'opacity-100' : 'opacity-15',
                i === idx && 'ring-2 ring-inset ring-white/60',
              )}
            >
              {BAR_WIDTHS[i] > 8 && <span className="text-black/70">/{s.prefix}</span>}
            </div>
          ))}
          <div className="flex-1 bg-zinc-800/50" title="Espacio aún libre" />
        </div>
        <div className="mt-1 flex justify-between font-mono text-[10px] text-zinc-500" aria-hidden>
          <span>.0</span>
          <span>.64</span>
          <span>.128</span>
          <span>.192</span>
          <span>.224</span>
          <span>.255</span>
        </div>
        <p className="mt-0.5 font-mono text-[10px] text-zinc-600">Eje esquemático: los /30 finales son diminutos a escala real (1,56 % cada uno).</p>
      </div>

      {/* Paso actual */}
      <div className="mt-3 rounded-lg border border-zinc-800 bg-black/40 p-3" aria-live="polite">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-zinc-100">
            Paso {idx + 1}/{STEPS.length} · {step.name}
          </p>
          <span className={cn('rounded px-2 py-0.5 font-mono text-[11px] text-black/80', BAR_COLORS[idx])}>{step.subnet}</span>
        </div>
        <div className="mt-2 grid gap-1.5 font-mono text-[11px] sm:grid-cols-3">
          <div className="rounded bg-zinc-900/70 px-2 py-1.5"><span className="text-zinc-500">red / prefijo</span><br /><span className="text-zinc-200">{step.subnet}</span></div>
          <div className="rounded bg-zinc-900/70 px-2 py-1.5"><span className="text-zinc-500">rango útil</span><br /><span className="text-zinc-200">{step.range}</span></div>
          <div className="rounded bg-zinc-900/70 px-2 py-1.5"><span className="text-zinc-500">broadcast</span><br /><span className="text-zinc-200">{step.broadcast}</span></div>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-zinc-400">{step.explain}</p>
        <p className="mt-1.5 font-mono text-[11px] text-zinc-500">
          Necesita {step.hostsNeeded} hosts → ofrece {step.hostsUsable} útiles · espacio del /24 usado: {step.usedBits}%
        </p>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={() => setIdx(0)}
          className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-300 hover:border-sky-500/50"
        >
          <RotateCcw className="h-3 w-3" /> Reiniciar
        </button>
        <div className="ml-auto flex gap-2">
          <button
            disabled={idx === 0}
            onClick={() => setIdx(idx - 1)}
            className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-300 hover:border-sky-500/50 disabled:opacity-40"
          >
            <ChevronLeft className="h-3 w-3" /> Anterior
          </button>
          <button
            disabled={idx === STEPS.length - 1}
            onClick={() => setIdx(idx + 1)}
            className="inline-flex items-center gap-1 rounded-lg border border-sky-500/50 bg-sky-500/10 px-2.5 py-1.5 text-xs text-sky-200 hover:bg-sky-500/20 disabled:opacity-40"
          >
            Siguiente <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  )
}
