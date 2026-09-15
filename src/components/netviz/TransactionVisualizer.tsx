import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { cn } from '../../lib/utils'

type Fase = 'reposo' | 'abierta' | 'modificada' | 'confirmada' | 'revertida'

const INICIAL = 1000
const DELTA = 200

export default function TransactionVisualizer() {
  const [fase, setFase] = useState<Fase>('reposo')
  const comprometido = fase === 'confirmada' ? INICIAL - DELTA : INICIAL
  const visible = fase === 'modificada' ? INICIAL - DELTA : comprometido

  const paso = (f: Fase) => setFase(f)
  const reset = () => setFase('reposo')

  const btn = 'rounded-lg border px-3 py-1.5 font-mono text-xs transition-colors disabled:opacity-40'
  const hist = [
    { f: 'reposo' as Fase, t: 'Reposo: saldo visible = comprometido' },
    { f: 'abierta' as Fase, t: 'BEGIN: empieza la transacción (aún no cambia nada)' },
    { f: 'modificada' as Fase, t: `UPDATE: tu sesión ve ${INICIAL - DELTA}, el resto sigue viendo ${comprometido}` },
    { f: 'confirmada' as Fase, t: 'COMMIT: el cambio es definitivo y durable' },
    { f: 'revertida' as Fase, t: 'ROLLBACK: como si el UPDATE nunca hubiera ocurrido' },
  ]
  const orden: Fase[] = ['reposo', 'abierta', 'modificada', 'confirmada', 'revertida']
  const activa = (f: Fase) => {
    if (fase === f) return true
    if (f === 'confirmada' || f === 'revertida') return false
    return orden.indexOf(f) < orden.indexOf(fase === 'confirmada' || fase === 'revertida' ? 'modificada' : fase)
  }

  return (
    <div>
      <p className="text-xs leading-relaxed text-zinc-400">
        Cuenta con saldo <span className="font-mono text-zinc-200">{INICIAL}</span>. Resta {DELTA} dentro de una transacción y decide el final. Observa qué ve cada uno.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-black/40 p-3 text-center">
          <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">Saldo comprometido (todos)</p>
          <p className="mt-1 font-mono text-2xl font-bold text-zinc-100 tabular-nums">{comprometido}</p>
        </div>
        <div className="rounded-xl border border-sky-500/25 bg-sky-500/5 p-3 text-center">
          <p className="font-mono text-[10px] uppercase tracking-widest text-sky-300/80">Lo que ve TU sesión</p>
          <p className="mt-1 font-mono text-2xl font-bold text-sky-200 tabular-nums" aria-live="polite">{visible}</p>
        </div>
      </div>

      <ol className="mt-3 space-y-1">
        {hist.map((h) => (
          <li
            key={h.f}
            className={cn(
              'flex items-center gap-2.5 rounded-lg border px-3 py-2 font-mono text-[11px]',
              activa(h.f) ? 'border-sky-500/40 bg-sky-500/[0.07] text-zinc-200' : 'border-zinc-800/70 text-zinc-600',
            )}
            aria-current={fase === h.f}
          >
            <span className={cn('flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[9px]', activa(h.f) ? 'border-sky-400 text-sky-300' : 'border-zinc-700 text-zinc-700')}>
              {activa(h.f) ? '●' : '○'}
            </span>
            {h.t}
          </li>
        ))}
      </ol>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <button disabled={fase !== 'reposo'} onClick={() => paso('abierta')} className={cn(btn, 'border-zinc-700 text-zinc-200 hover:border-sky-500/50')}>BEGIN</button>
        <button disabled={fase !== 'abierta'} onClick={() => paso('modificada')} className={cn(btn, 'border-zinc-700 text-zinc-200 hover:border-sky-500/50')}>UPDATE saldo − {DELTA}</button>
        <button disabled={fase !== 'modificada'} onClick={() => paso('confirmada')} className={cn(btn, 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20')}>COMMIT</button>
        <button disabled={fase !== 'modificada'} onClick={() => paso('revertida')} className={cn(btn, 'border-amber-500/50 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20')}>ROLLBACK</button>
        <button onClick={reset} className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 px-2.5 py-1.5 font-mono text-xs text-zinc-400 hover:border-zinc-500">
          <RotateCcw className="h-3 w-3" /> Reset
        </button>
      </div>
      {(fase === 'confirmada' || fase === 'revertida') && (
        <p className="mt-2 rounded-lg border border-zinc-800 bg-black/40 p-2.5 text-xs leading-relaxed text-zinc-400 animate-fade-in">
          {fase === 'confirmada'
            ? 'COMMIT + WAL = durable: ni un apagón lo deshace. Así se garantiza la D de ACID.'
            : 'ROLLBACK = atomicidad: o todo o nada. Por eso las transferencias van siempre en transacción.'}
        </p>
      )}
    </div>
  )
}
