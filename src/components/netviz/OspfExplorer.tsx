import { useState } from 'react'
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import { cn } from '../../lib/utils'

const STEPS = [
  {
    title: 'Hello: descubrir vecinos',
    text: 'R1, R2 y R3 se envían Hellos multicast (224.0.0.5) cada 10 s por sus enlaces del área 0. Si coinciden área, máscara, timers e intervalo Dead (40 s), pasan a vecinos. R3 además habla con R4 en el área 1.',
    lsdb: [] as string[],
    routes: [] as string[],
  },
  {
    title: 'Adyacencias y LSAs',
    text: 'Los vecinos intercambian descripciones de base de datos y se piden lo que les falta. Cada router genera su Router-LSA (enlaces + costes) y R3, como ABR, genera además Summary-LSAs hacia el área 1 describiendo lo que hay fuera.',
    lsdb: ['Router-LSA de R1 ( enlaces: R2 coste 10, R3 coste 10 )', 'Router-LSA de R2 ( enlaces: R1 coste 10, R3 coste 1 )', 'Router-LSA de R3 ( enlaces: R1 coste 10, R2 coste 1, R4 coste 10 )', 'Router-LSA de R4 ( enlace: R3 coste 10 )', 'Summary-LSA de R3 → área 1 ( resume el área 0 )'],
    routes: [] as string[],
  },
  {
    title: 'SPF (Dijkstra) en cada router',
    text: 'Con la LSDB idéntica, cada router ejecuta Dijkstra con ÉL como raíz y calcula el coste mínimo a cada destino. Ejemplo desde R4: a R3 = 10; a R2 = 10+1 = 11 (vía R3); a R1 = 10+10 = 20 por el enlace directo R3–R1 (la vía R3→R2→R1 sumaría 10+1+10 = 21 y Dijkstra la descarta). Topología simplificada punto a punto: en un segmento broadcast real habría además DR y Network-LSA tipo 2.',
    lsdb: ['Router-LSA de R1', 'Router-LSA de R2', 'Router-LSA de R3', 'Router-LSA de R4 ( enlace: R3 coste 10 )', 'Summary-LSA de R3 → área 1'],
    routes: ['O IA 10.0.0.0/24 vía R3, coste 10', 'O IA 10.0.12.0/24 vía R3, coste 11', 'O IA 10.0.13.0/24 vía R3, coste 20'],
  },
  {
    title: 'Tabla de rutas instalada',
    text: 'R4 instala las rutas con next-hop R3. Si cae el enlace R2–R3 (coste 1), los routers inundan LSAs actualizados, todos recalculan SPF y las tablas convergen sin bucles: esa es la ventaja del estado de enlace frente a vector-distancia.',
    lsdb: ['Router-LSA de R1', 'Router-LSA de R2', 'Router-LSA de R3', 'Router-LSA de R4', 'Summary-LSA de R3 → área 1'],
    routes: ['O IA 10.0.0.0/24 [110/10] vía 10.0.34.3', 'O IA 10.0.12.0/24 [110/11] vía 10.0.34.3', 'O IA 10.0.13.0/24 [110/20] vía 10.0.34.3', 'C 10.0.34.0/24 conectada'],
  },
]

export default function OspfExplorer() {
  const [idx, setIdx] = useState(0)
  const step = STEPS[idx]
  return (
    <div>
      <p className="text-xs leading-relaxed text-zinc-400">
        R1–R2–R3 en el área 0 (backbone); R4 en el área 1 colgando de R3 (ABR). Costes OSPF sobre los enlaces.
        Pulsa para ver qué ocurre dentro de los routers cuando aprenden rutas.
      </p>
      <svg viewBox="0 0 400 170" role="img" aria-label="Topología OSPF: R1, R2 y R3 en área 0; R4 en área 1 vía R3" className="mt-3 w-full rounded-lg border border-zinc-800 bg-black/40">
        {/* enlaces */}
        <line x1={90} y1={85} x2={200} y2={45} stroke="#52525b" strokeWidth={3} />
        <line x1={90} y1={85} x2={200} y2={125} stroke="#52525b" strokeWidth={3} />
        <line x1={200} y1={45} x2={200} y2={125} stroke="#38bdf8" strokeWidth={3} />
        <line x1={200} y1={125} x2={315} y2={85} stroke="#a78bfa" strokeWidth={3} strokeDasharray="7 4" />
        {[
          { x: 70, y: 85, n: 'R1', a: 'área 0', c: '#38bdf8' },
          { x: 200, y: 45, n: 'R2', a: 'área 0', c: '#38bdf8' },
          { x: 200, y: 125, n: 'R3', a: 'ABR', c: '#fbbf24' },
          { x: 330, y: 85, n: 'R4', a: 'área 1', c: '#a78bfa' },
        ].map((r) => (
          <g key={r.n}>
            <circle cx={r.x} cy={r.y} r={22} fill="#09090b" stroke={r.c} strokeWidth={2} />
            <text x={r.x} y={r.y + 1} textAnchor="middle" fontSize={11} fontWeight="bold" fill="#f4f4f5">{r.n}</text>
            <text x={r.x} y={r.y + 34} textAnchor="middle" fontSize={8} fill="#a1a1aa" fontFamily="monospace">{r.a}</text>
          </g>
        ))}
        {/* etiquetas de enlace: después de los nodos para quedar encima, en zonas libres */}
        <text x={175} y={50} textAnchor="end" fontSize={8} fill="#71717a" fontFamily="monospace">10 · 10.0.12.0/24</text>
        <text x={175} y={132} textAnchor="end" fontSize={8} fill="#71717a" fontFamily="monospace">10 · 10.0.13.0/24</text>
        <text x={208} y={88} fontSize={8} fill="#38bdf8" fontFamily="monospace">1 · 10.0.23.0/24</text>
        <text x={222} y={146} fontSize={8} fill="#a78bfa" fontFamily="monospace">10 · 10.0.34.0/24 (área 1)</text>
        <g fontSize={9} fontFamily="monospace" fill="#6ee7b7">
          <text x={200} y={18} textAnchor="middle">{idx === 0 ? '📡 Hellos a 224.0.0.5 …' : '⟷ LSA …'}</text>
        </g>
      </svg>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <div className="rounded-lg border border-zinc-800 bg-black/40 p-2.5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">LSDB de R4 ({step.lsdb.length} LSAs)</p>
          {step.lsdb.length === 0 ? (
            <p className="mt-1 font-mono text-[11px] text-zinc-600">vacía — aún no hay adyacencias</p>
          ) : (
            <ul className="mt-1 space-y-1">
              {step.lsdb.map((l) => (
                <li key={l} className={cn('rounded bg-zinc-900/70 px-2 py-1 font-mono text-[11px] text-emerald-300', idx >= 2 && 'animate-fade-in')}>{l}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-lg border border-zinc-800 bg-black/40 p-2.5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">Tabla de rutas de R4</p>
          {step.routes.length === 0 ? (
            <p className="mt-1 font-mono text-[11px] text-zinc-600">sin rutas OSPF todavía</p>
          ) : (
            <ul className="mt-1 space-y-1">
              {step.routes.map((l) => (
                <li key={l} className="rounded bg-zinc-900/70 px-2 py-1 font-mono text-[11px] text-sky-300">{l}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="mt-3 rounded-lg border border-zinc-800 bg-black/40 p-3" aria-live="polite">
        <p className="text-sm font-semibold text-zinc-100">Paso {idx + 1}/{STEPS.length} · {step.title}</p>
        <p className="mt-1 text-xs leading-relaxed text-zinc-400">{step.text}</p>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button onClick={() => setIdx(0)} className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-300 hover:border-sky-500/50">
          <RotateCcw className="h-3 w-3" /> Reiniciar
        </button>
        <div className="ml-auto flex gap-2">
          <button disabled={idx === 0} onClick={() => setIdx(idx - 1)} className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-300 hover:border-sky-500/50 disabled:opacity-40">
            <ChevronLeft className="h-3 w-3" /> Anterior
          </button>
          <button disabled={idx === STEPS.length - 1} onClick={() => setIdx(idx + 1)} className="inline-flex items-center gap-1 rounded-lg border border-sky-500/50 bg-sky-500/10 px-2.5 py-1.5 text-xs text-sky-200 hover:bg-sky-500/20 disabled:opacity-40">
            Siguiente <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  )
}
