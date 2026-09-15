import { useState } from 'react'
import { cn } from '../../lib/utils'

interface Ent {
  id: string
  nombre: string
  x: number
  y: number
  attrs: { n: string; rol: string }[]
  rels: string[]
}

const ENTS: Ent[] = [
  {
    id: 'est', nombre: 'ESTUDIANTE', x: 85, y: 90,
    attrs: [
      { n: 'id_estudiante', rol: 'PK' },
      { n: 'nombre', rol: '' },
      { n: 'email', rol: 'UNIQUE' },
    ],
    rels: ['Se matricula en N cursos (1:N hacia MATRÍCULA)', 'Tiene UN expediente (1:1, FK + UNIQUE)'],
  },
  {
    id: 'mat', nombre: 'MATRÍCULA', x: 230, y: 90,
    attrs: [
      { n: 'id_estudiante → FK', rol: 'PK/FK' },
      { n: 'id_curso → FK', rol: 'PK/FK' },
      { n: 'nota', rol: '' },
    ],
    rels: ['Resuelve la N:M Estudiante↔Curso (tabla intermedia)', 'Su PK es compuesta: ambas FK'],
  },
  {
    id: 'cur', nombre: 'CURSO', x: 375, y: 90,
    attrs: [
      { n: 'id_curso', rol: 'PK' },
      { n: 'titulo', rol: '' },
      { n: 'id_profesor → FK', rol: 'FK' },
    ],
    rels: ['Lo imparte UN profesor (N:1 hacia PROFESOR)', 'Tiene N matrículas (1:N)'],
  },
  {
    id: 'prof', nombre: 'PROFESOR', x: 230, y: 195,
    attrs: [
      { n: 'id_profesor', rol: 'PK' },
      { n: 'nombre', rol: '' },
      { n: 'despacho', rol: '' },
    ],
    rels: ['Imparte N cursos (1:N hacia CURSO)'],
  },
]

export default function ErDiagram() {
  const [sel, setSel] = useState('mat')
  const e = ENTS.find((x) => x.id === sel) ?? ENTS[0]

  return (
    <div>
      <p className="text-xs leading-relaxed text-zinc-400">
        Pulsa cada entidad: atributos con su rol (PK/FK/UNIQUE) y las relaciones con cardinalidad. El rombo N:M se convierte en tabla.
      </p>
      <svg viewBox="0 0 460 250" role="img" aria-label="Diagrama ER: Estudiante y Curso unidos N:M mediante Matrícula; Profesor imparte cursos 1:N" className="mt-3 w-full rounded-lg border border-zinc-800 bg-black/40">
        <line x1={141} y1={90} x2={174} y2={90} stroke="#52525b" strokeWidth={2.5} />
        <line x1={286} y1={90} x2={319} y2={90} stroke="#52525b" strokeWidth={2.5} />
        <line x1={340} y1={117} x2={272} y2={168} stroke="#52525b" strokeWidth={2.5} strokeDasharray="6 5" />
        <text x={148} y={78} fontSize={11} fill="#a1a1aa" fontFamily="monospace">1:N</text>
        <text x={294} y={78} fontSize={11} fill="#a1a1aa" fontFamily="monospace">N:1</text>
        <text x={308} y={146} fontSize={11} fill="#a1a1aa" fontFamily="monospace">1:N</text>
        {ENTS.map((n) => {
          const active = n.id === sel
          return (
            <g key={n.id} onClick={() => setSel(n.id)} className="cursor-pointer" role="button" aria-label={`Ver ${n.nombre}`} tabIndex={0}
              onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') setSel(n.id) }}>
              <rect
                x={n.x - 56} y={n.y - 27} width={112} height={54} rx={9}
                className={cn(active ? 'fill-sky-500/25 stroke-sky-400' : 'fill-zinc-900 stroke-zinc-600')}
                strokeWidth={active ? 2.5 : 1.5}
              />
              <text x={n.x} y={n.y - 2} textAnchor="middle" fontSize={14} fontWeight="bold" fill="#f4f4f5">{n.nombre}</text>
              <text x={n.x} y={n.y + 16} textAnchor="middle" fontSize={10} fill="#a1a1aa" fontFamily="monospace">
                {n.id === 'mat' ? 'N:M → tabla' : 'entidad fuerte'}
              </text>
            </g>
          )
        })}
      </svg>
      <div className="mt-1 flex flex-wrap gap-1.5" role="group" aria-label="Entidad">
        {ENTS.map((n) => (
          <button
            key={n.id}
            onClick={() => setSel(n.id)}
            aria-pressed={sel === n.id}
            className={cn(
              'rounded-lg border px-2.5 py-1 font-mono text-[11px] transition-colors',
              sel === n.id ? 'border-sky-500/60 bg-sky-500/10 text-sky-200' : 'border-zinc-800 text-zinc-400 hover:border-zinc-600',
            )}
          >
            {n.nombre}
          </button>
        ))}
      </div>
      <div className="mt-3 rounded-lg border border-zinc-800 bg-black/40 p-3" aria-live="polite">
        <p className="font-mono text-xs font-bold text-zinc-100">{e.nombre}</p>
        <ul className="mt-1.5 space-y-1">
          {e.attrs.map((a) => (
            <li key={a.n} className="flex items-center gap-2 font-mono text-[11px]">
              <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-bold', a.rol.includes('PK') ? 'bg-sky-500/15 text-sky-300' : a.rol.includes('FK') ? 'bg-violet-500/15 text-violet-300' : a.rol ? 'bg-amber-500/15 text-amber-300' : 'bg-zinc-800 text-zinc-500')}>
                {a.rol || '·'}
              </span>
              <span className="text-zinc-300">{a.n}</span>
            </li>
          ))}
        </ul>
        <ul className="mt-2 space-y-1">
          {e.rels.map((r) => (
            <li key={r} className="flex gap-2 text-xs leading-relaxed text-zinc-400">
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-sm bg-sky-400/70" />
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
