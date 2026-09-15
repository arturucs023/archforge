import { useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'
import { cn } from '../../lib/utils'

type Scenario = 'pat' | 'static' | 'pfwd'

const SCENARIOS: Record<
  Scenario,
  {
    label: string
    desc: string
    before: { src: string; sport: string; dst: string; dport: string }
    after: { src: string; sport: string; dst: string; dport: string }
    table: string[][]
    note: string
  }
> = {
  pat: {
    label: 'PAT (sobrecarga)',
    desc: 'Varios PCs privados comparten UNA IP pública. El router distingue cada flujo por el puerto de origen que asigna.',
    before: { src: '192.168.1.10', sport: '52344', dst: '93.184.216.34', dport: '443' },
    after: { src: '203.0.113.5', sport: '61001', dst: '93.184.216.34', dport: '443' },
    table: [
      ['192.168.1.10:52344', '203.0.113.5:61001', '93.184.216.34:443'],
      ['192.168.1.11:52344', '203.0.113.5:61002', '93.184.216.34:443'],
      ['192.168.1.10:53210', '203.0.113.5:61003', '142.250.72.14:80'],
    ],
    note: 'Fíjate: dos PCs usan el mismo puerto 52344, pero el NAT les da puertos públicos distintos (61001 vs 61002). Por eso la respuesta vuelve al PC correcto.',
  },
  static: {
    label: 'NAT estático 1:1',
    desc: 'Un servidor interno siempre se presenta con la misma IP pública. Por defecto los puertos NO cambian.',
    before: { src: '192.168.1.80', sport: '53210', dst: '93.184.216.34', dport: '80' },
    after: { src: '203.0.113.80', sport: '53210', dst: '93.184.216.34', dport: '80' },
    table: [['192.168.1.80', '203.0.113.80', 'fija 1:1']],
    note: 'Solo cambia la IP, nunca el puerto (salvo static-PAT explícito). Consume una IP pública por servidor: no escala, por eso hoy se prefiere PAT + port forwarding.',
  },
  pfwd: {
    label: 'Port forwarding (DNAT)',
    desc: 'El tráfico que LLEGA a la IP pública en un puerto concreto se redirige a un servidor interno. Aquí cambia el DESTINO, no el origen.',
    before: { src: '198.51.100.9', sport: '51234', dst: '203.0.113.5', dport: '8080' },
    after: { src: '198.51.100.9', sport: '51234', dst: '192.168.1.80', dport: '80' },
    table: [['cualquiera → 203.0.113.5:8080', 'redirigir a', '192.168.1.80:80']],
    note: 'Es NAT de destino (DNAT): la regla es estática y solo afecta a ese puerto. El resto del tráfico entrante se descarta por falta de mapeo (no por política de seguridad: eso no sustituye a un firewall stateful).',
  },
}

function AddrPart({ hot, children }: { hot: boolean; children: ReactNode }) {
  return <span className={cn('rounded px-1', hot && 'bg-amber-500/25 text-amber-200')}>{children}</span>
}

function Packet({ title, src, sport, dst, dport, hotSrcIp, hotSrcPort, hotDstIp, hotDstPort }: {
  title: string; src: string; sport: string; dst: string; dport: string
  hotSrcIp?: boolean; hotSrcPort?: boolean; hotDstIp?: boolean; hotDstPort?: boolean
}) {
  return (
    <div className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-black/40 p-2.5 font-mono text-[11px]">
      <p className="mb-1.5 text-[10px] uppercase tracking-widest text-zinc-500">{title}</p>
      <div className="break-all rounded px-2 py-1 text-zinc-300">
        SRC <AddrPart hot={!!hotSrcIp}>{src}</AddrPart>:<AddrPart hot={!!hotSrcPort}>{sport}</AddrPart>
      </div>
      <div className="mt-1 break-all rounded px-2 py-1 text-zinc-300">
        DST <AddrPart hot={!!hotDstIp}>{dst}</AddrPart>:<AddrPart hot={!!hotDstPort}>{dport}</AddrPart>
      </div>
    </div>
  )
}

export default function NatTranslator() {
  const [sc, setSc] = useState<Scenario>('pat')
  const s = SCENARIOS[sc]
  /* qué partes cambian según escenario: PAT cambia IP+puerto origen; estático solo IP; DNAT destino */
  const hot = sc === 'pfwd'
    ? { hotDstIp: true, hotDstPort: true }
    : sc === 'static'
      ? { hotSrcIp: true }
      : { hotSrcIp: true, hotSrcPort: true }
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(SCENARIOS) as Scenario[]).map((k) => (
          <button
            key={k}
            onClick={() => setSc(k)}
            aria-pressed={sc === k}
            className={cn(
              'rounded-lg border px-3 py-1.5 text-xs font-medium',
              sc === k ? 'border-sky-500/60 bg-sky-500/10 text-sky-200' : 'border-zinc-800 text-zinc-400 hover:border-zinc-600',
            )}
          >
            {SCENARIOS[k].label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-zinc-400">{s.desc}</p>
      <div className="mt-3 flex flex-col items-stretch gap-2 sm:flex-row" aria-live="polite">
        <Packet title="Antes del NAT" src={s.before.src} sport={s.before.sport} dst={s.before.dst} dport={s.before.dport} />
        <div className="flex flex-row items-center justify-center gap-1 text-sky-400 sm:flex-col">
          <ArrowRight className="h-5 w-5 rotate-90 sm:rotate-0" />
          <span className="font-mono text-[9px] uppercase">NAT</span>
        </div>
        <Packet title="Después del NAT" src={s.after.src} sport={s.after.sport} dst={s.after.dst} dport={s.after.dport} {...hot} />
      </div>
      <div className="mt-3 overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full min-w-[420px] text-left font-mono text-[11px]">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/70 text-zinc-400">
              <th className="px-2.5 py-1.5">Inside (privado)</th>
              <th className="px-2.5 py-1.5">Outside (público)</th>
              <th className="px-2.5 py-1.5">Destino / regla</th>
            </tr>
          </thead>
          <tbody>
            {s.table.map((r, i) => (
              <tr key={i} className="border-b border-zinc-800/50 text-zinc-300 last:border-0 odd:bg-zinc-900/20">
                {r.map((c, j) => (
                  <td key={j} className="px-2.5 py-1.5">{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-zinc-400">
        <span className="text-amber-300">Lo que cambia, en ámbar.</span> {s.note}
      </p>
    </div>
  )
}
