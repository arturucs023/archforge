import { useState } from 'react'
import { cn } from '../../lib/utils'

interface Autor { id: number; nombre: string }
interface Libro { id: number; autorId: number | null; titulo: string }

const AUTORES: Autor[] = [
  { id: 1, nombre: 'Ana' },
  { id: 2, nombre: 'Bruno' },
  { id: 3, nombre: 'Carla' },
]
const LIBROS: Libro[] = [
  { id: 101, autorId: 1, titulo: 'SQL fácil' },
  { id: 102, autorId: 2, titulo: 'Linux total' },
  { id: 103, autorId: 2, titulo: 'Redes' },
  { id: 104, autorId: 99, titulo: 'Huérfano' },
]

type Join = 'INNER' | 'LEFT' | 'RIGHT' | 'CROSS'

interface Fila { autor: string | null; libro: string | null; pareja: boolean }

function filas(join: Join): Fila[] {
  const porAutor = new Map<number, Libro[]>()
  for (const l of LIBROS) {
    const arr = porAutor.get(l.autorId ?? -1) ?? []
    arr.push(l)
    porAutor.set(l.autorId ?? -1, arr)
  }
  if (join === 'CROSS') {
    const out: Fila[] = []
    for (const a of AUTORES) for (const l of LIBROS) out.push({ autor: a.nombre, libro: l.titulo, pareja: a.id === l.autorId })
    return out
  }
  if (join === 'RIGHT') {
    return LIBROS.map((l) => {
      const a = AUTORES.find((x) => x.id === l.autorId)
      return { autor: a ? a.nombre : null, libro: l.titulo, pareja: !!a }
    })
  }
  // INNER y LEFT parten de autores
  const out: Fila[] = []
  for (const a of AUTORES) {
    const libros = porAutor.get(a.id) ?? []
    if (libros.length === 0) {
      if (join === 'LEFT') out.push({ autor: a.nombre, libro: null, pareja: false })
    } else for (const l of libros) out.push({ autor: a.nombre, libro: l.titulo, pareja: true })
  }
  return out
}

const DESC: Record<Join, string> = {
  INNER: 'Solo parejas autor=libro. Carla (sin libros) y Huérfano (sin autor) desaparecen.',
  LEFT: 'Todos los autores (izquierda). Carla sobrevive con libro NULL.',
  RIGHT: 'Todos los libros (derecha). Huérfano sobrevive con autor NULL.',
  CROSS: 'Todo × todo: 3×4 = 12 filas. Sin ON: normalmente un accidente.',
}

export default function JoinVisualizer() {
  const [join, setJoin] = useState<Join>('INNER')
  const rows = filas(join)

  return (
    <div>
      <div className="grid gap-2 sm:grid-cols-2">
        <MiniTable titulo="autores" filas={AUTORES.map((a) => `${a.id} · ${a.nombre}`)} />
        <MiniTable titulo="libros (autor_id)" filas={LIBROS.map((l) => `${l.id} · ${l.titulo} → ${l.autorId}`)} />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Tipo de JOIN">
        {(Object.keys(DESC) as Join[]).map((j) => (
          <button
            key={j}
            onClick={() => setJoin(j)}
            aria-pressed={join === j}
            className={cn(
              'rounded-lg border px-3 py-1.5 font-mono text-xs transition-colors',
              join === j ? 'border-sky-500/60 bg-sky-500/10 text-sky-200' : 'border-zinc-800 text-zinc-400 hover:border-zinc-600',
            )}
          >
            {j === 'CROSS' ? 'CROSS JOIN' : `${j} JOIN`}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-zinc-400">{DESC[join]}</p>
      <div className="mt-2 overflow-x-auto rounded-lg border border-zinc-800" aria-live="polite">
        <table className="w-full min-w-[320px] text-left font-mono text-[11px]">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/70 text-zinc-400">
              <th className="px-2.5 py-1.5">autor</th><th className="px-2.5 py-1.5">libro</th><th className="px-2.5 py-1.5 text-right">{rows.length} filas</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={cn('border-b border-zinc-800/50 last:border-0', r.pareja ? 'text-zinc-300 odd:bg-zinc-900/20' : 'bg-amber-500/[0.07] text-amber-200')}>
                <td className="px-2.5 py-1.5">{r.autor ?? <span className="text-zinc-600">NULL</span>}</td>
                <td className="px-2.5 py-1.5">{r.libro ?? <span className="text-zinc-600">NULL</span>}</td>
                <td className="px-2.5 py-1.5 text-right text-zinc-600">{r.pareja ? '' : 'sin pareja'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function MiniTable({ titulo, filas }: { titulo: string; filas: string[] }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-black/30 p-2.5">
      <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-zinc-500">{titulo}</p>
      <ul className="space-y-0.5 font-mono text-[11px] text-zinc-300">
        {filas.map((f) => <li key={f}>{f}</li>)}
      </ul>
    </div>
  )
}
