import { useEffect, useRef, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { cn } from '../../lib/utils'

const TOTAL = 1_000_000
const OBJETIVO = 847_201
const PASO_SCAN = 50_000
const NIVELES_BTREE = 3

export default function IndexVisualizer() {
  const [modo, setModo] = useState<'nadie' | 'scan' | 'bptree'>('nadie')
  const [vistos, setVistos] = useState(0)
  const [saltos, setSaltos] = useState(0)
  const [hecho, setHecho] = useState(false)
  const timer = useRef<number | null>(null)

  const parar = () => {
    if (timer.current !== null) { window.clearInterval(timer.current); timer.current = null }
  }
  useEffect(() => parar, [])

  const buscar = (m: 'scan' | 'bptree') => {
    parar()
    setHecho(false)
    if (m === 'scan') {
      setModo('scan'); setVistos(0); setSaltos(0)
      timer.current = window.setInterval(() => {
        setVistos((v) => {
          const nv = Math.min(v + PASO_SCAN, OBJETIVO)
          if (nv >= OBJETIVO) { parar(); setHecho(true) }
          return nv
        })
      }, 110)
    } else {
      setModo('bptree'); setVistos(0); setSaltos(0)
      timer.current = window.setInterval(() => {
        setSaltos((s) => {
          if (s + 1 >= NIVELES_BTREE) { parar(); setHecho(true) }
          return Math.min(s + 1, NIVELES_BTREE)
        })
      }, 450)
    }
  }

  const pctScan = Math.min(100, (vistos / TOTAL) * 100)

  return (
    <div>
      <p className="text-xs leading-relaxed text-zinc-400">
        Tabla <span className="font-mono text-zinc-200">pedidos</span> con {TOTAL.toLocaleString('es-ES')} filas. Busca el pedido <span className="font-mono text-zinc-200">id = {OBJETIVO.toLocaleString('es-ES')}</span> de las dos formas y cuenta el trabajo.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={() => buscar('scan')} className={cn('rounded-lg border px-3 py-1.5 font-mono text-xs transition-colors', modo === 'scan' ? 'border-amber-500/60 bg-amber-500/10 text-amber-200' : 'border-zinc-800 text-zinc-400 hover:border-zinc-600')}>
          Buscar SIN índice (Seq Scan)
        </button>
        <button onClick={() => buscar('bptree')} className={cn('rounded-lg border px-3 py-1.5 font-mono text-xs transition-colors', modo === 'bptree' ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-200' : 'border-zinc-800 text-zinc-400 hover:border-zinc-600')}>
          Buscar CON índice B-tree
        </button>
        <button onClick={() => { parar(); setModo('nadie'); setVistos(0); setSaltos(0); setHecho(false) }} className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 px-2.5 py-1.5 font-mono text-xs text-zinc-400 hover:border-zinc-500">
          <RotateCcw className="h-3 w-3" /> Reset
        </button>
      </div>

      <div className="mt-3 rounded-lg border border-zinc-800 bg-black/40 p-3" aria-live="polite">
        {modo === 'nadie' && <p className="font-mono text-[11px] text-zinc-600">Elige un modo de búsqueda.</p>}
        {modo === 'scan' && (
          <div>
            <div className="flex justify-between font-mono text-[11px] text-zinc-400">
              <span>Escaneando fila a fila…</span><span className="tabular-nums">{vistos.toLocaleString('es-ES')} / {TOTAL.toLocaleString('es-ES')}</span>
            </div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-zinc-800">
              <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${pctScan}%` }} />
            </div>
            <p className="mt-1.5 font-mono text-[11px] text-zinc-500">
              {hecho ? `✓ Encontrado tras revisar ${vistos.toLocaleString('es-ES')} filas. Sin índice, el coste crece con la tabla.` : 'Cada bloque leído es I/O real.'}
            </p>
          </div>
        )}
        {modo === 'bptree' && (
          <div>
            <div className="flex items-center gap-1.5">
              {['raíz', 'intermedio', 'hoja → fila'].map((n, i) => (
                <div key={n} className="flex flex-1 items-center gap-1.5">
                  <div className={cn('flex-1 rounded-lg border px-2 py-1.5 text-center font-mono text-[11px]', i < saltos ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-200' : 'border-zinc-800 text-zinc-600')}>
                    {n}
                  </div>
                  {i < 2 && <span className="text-zinc-700">→</span>}
                </div>
              ))}
            </div>
            <p className="mt-1.5 font-mono text-[11px] text-zinc-500">
              {hecho ? `✓ Encontrado en ${NIVELES_BTREE} saltos. El coste crece con log(N), no con N.` : 'Bajando por el árbol ordenado…'}
            </p>
          </div>
        )}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-zinc-500">
        Por eso se indexa lo que filtras/unes/ordenas… y por eso cada índice ralentiza las escrituras: no son gratis.
      </p>
    </div>
  )
}
