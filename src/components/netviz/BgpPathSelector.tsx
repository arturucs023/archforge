import { useState } from 'react'
import { ChevronLeft, ChevronRight, RotateCcw, Trophy } from 'lucide-react'
import { cn } from '../../lib/utils'

interface Path {
  id: string
  via: string
  localPref: number
  asPath: string
  asLen: number
  origin: string
  med: number
}

const PATHS: Path[] = [
  { id: 'A', via: 'vecino AS200', localPref: 200, asPath: '200 → 500', asLen: 2, origin: 'IGP', med: 0 },
  { id: 'B', via: 'vecino AS300', localPref: 200, asPath: '300 → 400 → 500', asLen: 3, origin: 'IGP', med: 0 },
  { id: 'C', via: 'vecino AS400', localPref: 100, asPath: '400 → 500', asLen: 2, origin: 'EGP', med: 0 },
]

const STEPS = [
  {
    title: 'Punto de partida: 3 rutas al mismo prefijo',
    text: 'Nuestro AS100 recibe 203.0.113.0/24 por tres vecinos distintos. BGP no elige por "más rápido": aplica su algoritmo de decisión atributo por atributo, en orden estricto. Solo se pasa al siguiente criterio si hay empate.',
    alive: ['A', 'B', 'C'],
    highlight: null as string | null,
  },
  {
    title: 'Criterio 1 — LOCAL_PREF más alto',
    text: 'LOCAL_PREF es local al AS y lo fija nuestra política (p. ej. preferir un proveedor barato). A y B tienen 200; C solo 100 → C queda eliminada aunque su AS_PATH sea corto. Decisión administrativa antes que técnica.',
    alive: ['A', 'B'],
    highlight: 'localPref',
  },
  {
    title: 'Criterio 2 — AS_PATH más corto',
    text: 'Entre A ([200, 500], longitud 2) y B ([300, 400, 500], longitud 3) gana A. El AS_PATH además sirve para evitar bucles: si un AS ve su propio número en el camino, descarta el anuncio.',
    alive: ['A'],
    highlight: 'asLen',
  },
  {
    title: 'Ganadora: ruta A (el resto de criterios no harían falta)',
    text: 'Como ya hay una única superviviente, BGP no evalúa ORIGIN (IGP > EGP > incompleta), ni MED, ni eBGP-sobre-iBGP, ni IGP-cost, ni Router-ID. Nota: el MED solo se compara entre rutas del MISMO AS vecino (por eso aquí vale 0 en las tres). A se instala en la tabla y se anuncia solo a clientes, nunca de vuelta a proveedores ni a los peers de los que se aprendió (regla valley-free).',
    alive: ['A'],
    highlight: null,
  },
]

export default function BgpPathSelector() {
  const [idx, setIdx] = useState(0)
  const step = STEPS[idx]
  return (
    <div>
      <p className="text-xs leading-relaxed text-zinc-400">
        Destino: <span className="font-mono text-zinc-200">203.0.113.0/24</span> (origen: AS500).
        Avanza para ver cómo BGP elimina candidatas criterio a criterio. Diagrama lógico (no topología física):
        cada letra es una ruta aprendida por un vecino distinto.
      </p>
      <svg viewBox="0 0 400 140" role="img" aria-label="AS100 recibe la ruta A por AS200, B por AS300 y C por AS400; el origen es AS500" className="mt-3 w-full rounded-lg border border-zinc-800 bg-black/40">
        {[
          { x: 200, y: 100, n: 'AS100', s: 'nosotros', c: '#38bdf8' },
          { x: 70, y: 35, n: 'AS200', s: '', c: '#52525b' },
          { x: 200, y: 35, n: 'AS300', s: '', c: '#52525b' },
          { x: 330, y: 35, n: 'AS400', s: '', c: '#52525b' },
        ].map((a) => (
          <g key={a.n}>
            <ellipse cx={a.x} cy={a.y} rx={38} ry={20} fill="#09090b" stroke={a.c} strokeWidth={a.n === 'AS100' ? 2 : 1.5} />
            <text x={a.x} y={a.y + 1} textAnchor="middle" fontSize={11} fontWeight="bold" fill="#f4f4f5">{a.n}</text>
            {a.s && <text x={a.x} y={a.y + 32} textAnchor="middle" fontSize={8} fill="#a1a1aa" fontFamily="monospace">{a.s}</text>}
          </g>
        ))}
        <ellipse cx={330} cy={100} rx={30} ry={16} fill="#09090b" stroke="#52525b" strokeWidth={1} strokeDasharray="4 3" />
        <text x={330} y={104} textAnchor="middle" fontSize={10} fill="#a1a1aa" fontFamily="monospace">AS500</text>
        <line x1={85} y1={52} x2={175} y2={88} stroke="#52525b" strokeWidth={2} />
        <line x1={200} y1={55} x2={200} y2={80} stroke="#52525b" strokeWidth={2} />
        <line x1={315} y1={52} x2={225} y2={88} stroke="#52525b" strokeWidth={2} />
        <text x={105} y={80} fontSize={10} fill="#6ee7b7" fontFamily="monospace">A</text>
        <text x={208} y={70} fontSize={10} fill="#6ee7b7" fontFamily="monospace">B</text>
        <text x={288} y={80} fontSize={10} fill="#6ee7b7" fontFamily="monospace">C</text>
      </svg>
      <div className="mt-3 overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full min-w-[520px] text-left font-mono text-[11px]">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/70 text-zinc-400">
              <th className="px-2.5 py-1.5">Ruta</th>
              <th className="px-2.5 py-1.5">LOCAL_PREF</th>
              <th className="px-2.5 py-1.5">AS_PATH (long.)</th>
              <th className="px-2.5 py-1.5">ORIGIN</th>
              <th className="px-2.5 py-1.5">MED</th>
              <th className="px-2.5 py-1.5">Estado</th>
            </tr>
          </thead>
          <tbody>
            {PATHS.map((pth) => {
              const alive = step.alive.includes(pth.id)
              return (
                <tr key={pth.id} className={cn('border-b border-zinc-800/50 last:border-0', alive ? 'text-zinc-200' : 'text-zinc-600 line-through opacity-60')}>
                  <td className="px-2.5 py-1.5 font-bold">
                    {pth.id} <span className="font-normal text-zinc-500">({pth.via})</span>
                    {idx === 3 && pth.id === 'A' && <Trophy className="ml-1 inline h-3.5 w-3.5 text-amber-400" />}
                  </td>
                  <td className={cn('px-2.5 py-1.5', step.highlight === 'localPref' && alive && 'bg-sky-500/15 text-sky-200')}>{pth.localPref}</td>
                  <td className={cn('px-2.5 py-1.5', step.highlight === 'asLen' && alive && 'bg-sky-500/15 text-sky-200')}>{pth.asPath} ({pth.asLen})</td>
                  <td className="px-2.5 py-1.5">{pth.origin}</td>
                  <td className="px-2.5 py-1.5">{pth.med}</td>
                  <td className="px-2.5 py-1.5">{alive ? '✓ candidata' : '✕ eliminada'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
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
