import { useState } from 'react'
import { cn } from '../../lib/utils'

interface Emp { id: number; nombre: string; depto: string; salario: number }

const EMPLEADOS: Emp[] = [
  { id: 1, nombre: 'Ana', depto: 'Ventas', salario: 2200 },
  { id: 2, nombre: 'Bruno', depto: 'Ingeniería', salario: 3100 },
  { id: 3, nombre: 'Carla', depto: 'Ventas', salario: 2500 },
  { id: 4, nombre: 'Dani', depto: 'Ingeniería', salario: 2900 },
  { id: 5, nombre: 'Elena', depto: 'RRHH', salario: 2100 },
  { id: 6, nombre: 'Fede', depto: 'Ventas', salario: 1900 },
]

type Orden = 'ninguno' | 'asc' | 'desc'

export default function SqlQueryVisualizer() {
  const [depto, setDepto] = useState('Todos')
  const [orden, setOrden] = useState<Orden>('ninguno')
  const [limite, setLimite] = useState(6)

  let rows = EMPLEADOS.filter((e) => depto === 'Todos' || e.depto === depto)
  const trasWhere = rows.length
  if (orden !== 'ninguno') rows = [...rows].sort((a, b) => (orden === 'asc' ? a.salario - b.salario : b.salario - a.salario))
  rows = rows.slice(0, limite)

  const sql = `SELECT nombre, depto, salario\nFROM empleados${depto === 'Todos' ? '' : `\nWHERE depto = '${depto}'`}${orden === 'ninguno' ? '' : `\nORDER BY salario ${orden === 'asc' ? 'ASC' : 'DESC'}`}\nLIMIT ${limite};`

  const opt = 'rounded-lg border px-2.5 py-1.5 font-mono text-[11px] transition-colors'

  return (
    <div>
      <p className="text-xs leading-relaxed text-zinc-400">
        Tabla <span className="font-mono text-zinc-200">empleados</span> ({EMPLEADOS.length} filas). Toca cada cláusula y observa qué filas sobreviven, en qué orden y cuántas.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <div>
          <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-amber-300">WHERE depto</p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtro por departamento">
            {['Todos', 'Ventas', 'Ingeniería', 'RRHH'].map((d) => (
              <button key={d} onClick={() => setDepto(d)} aria-pressed={depto === d} className={cn(opt, depto === d ? 'border-amber-500/60 bg-amber-500/10 text-amber-200' : 'border-zinc-800 text-zinc-400 hover:border-zinc-600')}>{d}</button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-sky-300">ORDER BY salario</p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Orden">
            {([['ninguno', '—'], ['asc', 'ASC'], ['desc', 'DESC']] as [Orden, string][]).map(([v, l]) => (
              <button key={v} onClick={() => setOrden(v)} aria-pressed={orden === v} className={cn(opt, orden === v ? 'border-sky-500/60 bg-sky-500/10 text-sky-200' : 'border-zinc-800 text-zinc-400 hover:border-zinc-600')}>{l}</button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-emerald-300">LIMIT {limite}</p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Límite de filas">
            {[2, 3, 6].map((n) => (
              <button key={n} onClick={() => setLimite(n)} aria-pressed={limite === n} className={cn(opt, limite === n ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-200' : 'border-zinc-800 text-zinc-400 hover:border-zinc-600')}>{n}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <pre className="overflow-x-auto rounded-lg border border-zinc-800 bg-black/40 p-3 font-mono text-[11px] leading-6 text-zinc-200">{sql}</pre>
        <div className="overflow-x-auto rounded-lg border border-zinc-800" aria-live="polite">
          <table className="w-full text-left font-mono text-[11px]">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/70 text-zinc-400">
                <th className="px-2.5 py-1.5">nombre</th><th className="px-2.5 py-1.5">depto</th><th className="px-2.5 py-1.5">salario</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-zinc-800/50 text-zinc-300 last:border-0 odd:bg-zinc-900/20">
                  <td className="px-2.5 py-1.5">{r.nombre}</td><td className="px-2.5 py-1.5">{r.depto}</td><td className="px-2.5 py-1.5">{r.salario}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={3} className="px-2.5 py-2 text-zinc-600">0 filas: el WHERE no dejó pasar a nadie.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <p className="mt-2 font-mono text-[11px] text-zinc-500">
        {EMPLEADOS.length} filas → WHERE deja {trasWhere} → LIMIT entrega {rows.length}.
        {orden === 'ninguno' && ' Sin ORDER BY, el orden NO está garantizado.'}
      </p>
    </div>
  )
}
