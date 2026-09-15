import { useState } from 'react'
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import { cn } from '../../lib/utils'

const STEPS = [
  {
    title: 'Topología inicial: hay un bucle',
    text: 'Tres switches unidos en triángulo. Si los tres reenviaran por todos los puertos, cada broadcast daría vueltas eternas (broadcast storm) y las tablas MAC oscilarían entre puertos. STP debe romper el bucle bloqueando UN puerto.',
  },
  {
    title: 'Paso 1 — Elección del Root Bridge',
    text: 'Cada switch anuncia su Bridge ID (prioridad + MAC) en BPDUs. Gana el BID más bajo: S1 (4096:…:01) < S2 (8192:…:02) < S3 (32768:…:03). S1 es el Root Bridge; todos sus puertos serán Designated y pasarán a forwarding.',
  },
  {
    title: 'Paso 2 — Elección de Root Ports',
    text: 'Cada switch NO raíz elige UN Root Port: el de menor coste hacia el Root. S2: directo a S1 (coste 4) frente a vía S3 (4+19=23) → puerto hacia S1. S3: directo a S1 (coste 4) frente a vía S2 (19+4=23) → puerto hacia S1.',
  },
  {
    title: 'Paso 3 — Elección de Designated Ports',
    text: 'En cada segmento, el switch con menor coste hacia el Root pone su puerto en Designated (forwarding). Segmentos S1–S2 y S1–S3: gana S1 (coste 0). Segmento S2–S3: empate de coste (4 = 4) → desempata el menor Bridge ID → S2. El puerto de S3 hacia S2 queda Blocked.',
  },
  {
    title: 'Resultado: bucle roto, convergencia',
    text: 'S3–S2 bloqueado (ámbar): no reenvía tramas pero sigue escuchando BPDUs. Si el enlace S1–S3 cayera, STP recalcularía y ese puerto pasaría por Listening → Learning → Forwarding. Puertos hacia PCs usarían PortFast para saltar la espera.',
  },
]

export default function StpSimulator() {
  const [idx, setIdx] = useState(0)
  const rootKnown = idx >= 1
  const rpKnown = idx >= 2
  const done = idx >= 3
  const converged = idx >= 4

  const portState = (sw: string, to: string): 'fwd' | 'blk' | 'unk' => {
    if (idx === 0) return 'unk'
    if (sw === 'S1') return 'fwd' // el Root reenvía por todos sus puertos (son Designated)
    if ((sw === 'S2' && to === 'S1') || (sw === 'S3' && to === 'S1')) return rpKnown ? 'fwd' : 'unk'
    if (sw === 'S2' && to === 'S3') return done ? 'fwd' : 'unk'
    if (sw === 'S3' && to === 'S2') return done ? 'blk' : 'unk'
    return 'unk'
  }

  const portLabel = (sw: string, to: string): string => {
    if (sw === 'S1') return rootKnown ? 'DP' : '?'
    if ((sw === 'S2' && to === 'S1') || (sw === 'S3' && to === 'S1')) return rpKnown ? 'RP' : '?'
    if (sw === 'S2' && to === 'S3') return done ? 'DP' : '?'
    if (sw === 'S3' && to === 'S2') return done ? 'BLK' : '?'
    return '?'
  }

  const Port = ({ sw, to, x, y, label }: { sw: string; to: string; x: number; y: number; label: string }) => {
    const st = portState(sw, to)
    return (
      <g>
        <circle
          cx={x}
          cy={y}
          r={9}
          className={cn(st === 'fwd' ? 'fill-emerald-500' : st === 'blk' ? 'fill-amber-500' : 'fill-zinc-600')}
          stroke="#0b0e14"
          strokeWidth={2}
        />
        <text x={x} y={y + 3.5} textAnchor="middle" fontSize={8} fontWeight="bold" fill="#0b0e14">
          {st === 'fwd' ? '✓' : st === 'blk' ? '✕' : '·'}
        </text>
        <text x={x} y={y - 13} textAnchor="middle" fontSize={8} fill="#a1a1aa" fontFamily="monospace">
          {label}
        </text>
      </g>
    )
  }

  const Switch = ({ x, y, name, bid, isRoot }: { x: number; y: number; name: string; bid: string; isRoot: boolean }) => (
    <g>
      <rect
        x={x - 52}
        y={y - 24}
        width={104}
        height={48}
        rx={10}
        className={cn(isRoot && rootKnown ? 'fill-sky-500/25 stroke-sky-400' : 'fill-zinc-900 stroke-zinc-600')}
        strokeWidth={isRoot && rootKnown ? 2.5 : 1.5}
      />
      <text x={x} y={y - 4} textAnchor="middle" fontSize={13} fontWeight="bold" fill="#f4f4f5">
        {name} {isRoot && rootKnown ? '👑' : ''}
      </text>
      <text x={x} y={y + 12} textAnchor="middle" fontSize={9} fill="#a1a1aa" fontFamily="monospace">
        {bid}
      </text>
    </g>
  )

  return (
    <div>
      <p className="text-xs leading-relaxed text-zinc-400">
        Triángulo S1–S2–S3. Costes: S1–S2 = 4, S1–S3 = 4, S2–S3 = 19 (enlace lento).
        Avanza para ver cómo STP elige Root, Root Ports y el puerto bloqueado.
      </p>
      <svg viewBox="0 0 400 250" role="img" aria-label="Triángulo STP: S1 raíz arriba, S2 y S3 abajo; el enlace S2-S3 se bloquea en S3" className="mt-3 w-full rounded-lg border border-zinc-800 bg-black/40">
        {/* enlaces */}
        <line x1={200} y1={60} x2={80} y2={190} stroke="#52525b" strokeWidth={3} />
        <line x1={200} y1={60} x2={320} y2={190} stroke="#52525b" strokeWidth={3} />
        <line x1={80} y1={190} x2={320} y2={190} stroke={done ? '#a16207' : '#52525b'} strokeWidth={3} strokeDasharray={done ? '7 5' : undefined} />
        <text x={128} y={118} fontSize={9} fill="#71717a" fontFamily="monospace">coste 4</text>
        <text x={258} y={118} fontSize={9} fill="#71717a" fontFamily="monospace">coste 4</text>
        <text x={200} y={208} fontSize={9} fill={done ? '#fbbf24' : '#71717a'} fontFamily="monospace" textAnchor="middle">
          coste 19 {done ? (converged ? '· BLOQUEADO en S3 ✓ estable' : '· BLOQUEADO en S3') : ''}
        </text>
        {converged && (
          <g>
            <rect x={118} y={8} width={164} height={20} rx={10} fill="#065f46" opacity={0.9} />
            <text x={200} y={22} textAnchor="middle" fontSize={10} fontWeight="bold" fill="#a7f3d0">
              ✓ topología estable
            </text>
          </g>
        )}
        <Switch x={200} y={55} name="S1" bid="4096:…:01" isRoot />
        <Switch x={80} y={185} name="S2" bid="8192:…:02" isRoot={false} />
        <Switch x={320} y={185} name="S3" bid="32768:…:03" isRoot={false} />
        <Port sw="S1" to="S2" x={158} y={104} label={portLabel('S1', 'S2')} />
        <Port sw="S1" to="S3" x={242} y={104} label={portLabel('S1', 'S3')} />
        <Port sw="S2" to="S1" x={118} y={148} label={portLabel('S2', 'S1')} />
        <Port sw="S3" to="S1" x={282} y={148} label={portLabel('S3', 'S1')} />
        <Port sw="S2" to="S3" x={152} y={190} label={portLabel('S2', 'S3')} />
        <Port sw="S3" to="S2" x={248} y={190} label={portLabel('S3', 'S2')} />
      </svg>
      <div className="mt-1 flex items-center gap-3 font-mono text-[10px] text-zinc-500">
        <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> forwarding</span>
        <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> blocked</span>
        <span>RP = Root Port · DP = Designated Port</span>
      </div>
      <div className="mt-3 rounded-lg border border-zinc-800 bg-black/40 p-3" aria-live="polite">
        <p className="text-sm font-semibold text-zinc-100">
          Paso {idx + 1}/{STEPS.length} · {STEPS[idx].title}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-zinc-400">{STEPS[idx].text}</p>
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
