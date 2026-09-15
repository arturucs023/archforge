import { useState } from 'react'
import { cn } from '../../lib/utils'

const LAYERS = [
  {
    id: 'app',
    name: 'Aplicación (L5–L7)',
    pdu: 'Datos',
    color: 'emerald',
    desc: 'El programa genera los datos: una petición HTTP, un mensaje DNS, un fichero. Todavía no hay cabeceras de red: solo la carga útil.',
    header: '— (los datos son la carga útil)',
  },
  {
    id: 'tcp',
    name: 'Transporte (L4)',
    pdu: 'Segmento',
    color: 'sky',
    desc: 'TCP añade su cabecera (puertos origen/destino, nº de secuencia, flags) y trocea en segmentos. UDP genera datagramas: también lleva puertos, pero sin secuencia ni fiabilidad (por eso la PDU de UDP no se llama segmento).',
    header: 'Puerto origen 52344 → puerto destino 443 · SEQ 1000 · flags SYN',
  },
  {
    id: 'ip',
    name: 'Red (L3)',
    pdu: 'Paquete',
    color: 'amber',
    desc: 'IP envuelve cada segmento con su cabecera: dirección origen y destino, TTL, protocolo. Aquí nace el paquete y aquí se decide el encaminamiento.',
    header: 'IP origen 192.168.1.10 → IP destino 93.184.216.34 · TTL 64 · protocolo TCP',
  },
  {
    id: 'eth',
    name: 'Enlace (L2)',
    pdu: 'Trama (frame)',
    color: 'violet',
    desc: 'Ethernet envuelve el paquete con MAC origen/destino y FCS de integridad. Solo sirve para el siguiente salto físico: cada router la quita y construye una nueva.',
    header: 'MAC origen aa:bb:cc:11:22:33 → MAC destino (gateway) dd:ee:ff:44:55:66 · FCS',
  },
]

const COLOR: Record<string, string> = {
  emerald: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300',
  sky: 'border-sky-500/50 bg-sky-500/10 text-sky-300',
  amber: 'border-amber-500/50 bg-amber-500/10 text-amber-300',
  violet: 'border-violet-500/50 bg-violet-500/10 text-violet-300',
}

export default function EncapDiagram() {
  const [sel, setSel] = useState(3)
  const layer = LAYERS[sel]
  return (
    <div>
      <p className="text-xs leading-relaxed text-zinc-400">
        Pulsa cada capa para ver qué cabecera añade. El orden es siempre de arriba abajo al enviar (encapsulación)
        y al revés al recibir (desencapsulación). La capa física (bits en cable/fibra/radio) queda fuera del diagrama.
      </p>
      <div className="mt-3 space-y-1.5">
        {LAYERS.map((l, i) => (
          <button
            key={l.id}
            onClick={() => setSel(i)}
            aria-pressed={i === sel}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-all',
              i === sel ? COLOR[l.color] : 'border-zinc-800 bg-ink-900/60 text-zinc-400 hover:border-zinc-600',
            )}
          >
            <span className="font-mono text-[10px] uppercase tracking-widest opacity-70">L{i === 0 ? '5–7' : i === 1 ? '4' : i === 2 ? '3' : '2'}</span>
            <span className="font-medium">{l.name}</span>
            <span className="ml-auto rounded bg-black/30 px-2 py-0.5 font-mono text-[11px]">PDU: {l.pdu}</span>
          </button>
        ))}
      </div>
      <div className="mt-3 rounded-lg border border-zinc-800 bg-black/40 p-3" aria-live="polite">
        <p className="font-mono text-[11px] uppercase tracking-widest text-zinc-500">Cabecera que añade {layer.name}</p>
        <p className="mt-1 font-mono text-xs leading-relaxed text-zinc-200">{layer.header}</p>
        <p className="mt-2 text-xs leading-relaxed text-zinc-400">{layer.desc}</p>
      </div>
    </div>
  )
}
