import { useState } from 'react'
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import { cn } from '../../lib/utils'

interface Paso {
  titulo: string
  que: string
  tablas: { nombre: string; cols: string[]; filas: string[][]; pk?: string }[]
  arregla: string
}

const PASOS: Paso[] = [
  {
    titulo: 'Tabla única (sin normalizar)',
    que: 'Un alumno guarda sus cursos en UNA celda («BD, Redes») y el profesor se repite por cada curso. No hay PK clara.',
    tablas: [{
      nombre: 'matriculas', cols: ['alumno', 'cursos', 'profesor'],
      filas: [['Ana', 'BD, Redes', 'Luis'], ['Bruno', 'BD', 'Luis']],
    }],
    arregla: 'Problemas: valores no atómicos, profesor repetido (si Luis cambia de despacho, ¿cuántas filas tocas?), y no puedes dar de alta un curso sin alumnos.',
  },
  {
    titulo: '→ 1FN: valores atómicos + PK',
    que: 'Una fila por (alumno, curso). PK compuesta (alumno, curso). Ya es 1FN.',
    tablas: [{
      nombre: 'matriculas', cols: ['alumno*', 'curso*', 'profesor', 'nota'],
      filas: [['Ana', 'BD', 'Luis', '9'], ['Ana', 'Redes', 'Eva', '7'], ['Bruno', 'BD', 'Luis', '8']],
      pk: 'PK = (alumno, curso)',
    }],
    arregla: 'Se arregla lo atómico, pero profesor depende solo de CURSO (parte de la PK): dependencia parcial. Luis sigue repetido.',
  },
  {
    titulo: '→ 2FN: fuera dependencias parciales',
    que: 'curso → profesor sale a su tabla CURSOS. matriculas queda con lo que depende de TODA la clave.',
    tablas: [
      {
        nombre: 'matriculas', cols: ['alumno*', 'curso*', 'nota'],
        filas: [['Ana', 'BD', '9'], ['Ana', 'Redes', '7'], ['Bruno', 'BD', '8']],
        pk: 'PK = (alumno, curso)',
      },
      {
        nombre: 'cursos', cols: ['curso*', 'profesor', 'despacho'],
        filas: [['BD', 'Luis', 'A1'], ['Redes', 'Eva', 'B2']],
        pk: 'PK = curso',
      },
    ],
    arregla: 'Se arregla la parcialidad. Queda lo transitivo: despacho depende de profesor, que no es clave.',
  },
  {
    titulo: '→ 3FN: fuera dependencias transitivas',
    que: 'profesor → despacho sale a PROFESORES. Cada dato vive en un solo sitio: 3FN.',
    tablas: [
      {
        nombre: 'matriculas', cols: ['alumno*', 'curso*', 'nota'],
        filas: [['Ana', 'BD', '9'], ['Ana', 'Redes', '7'], ['Bruno', 'BD', '8']],
        pk: 'PK = (alumno, curso)',
      },
      {
        nombre: 'cursos', cols: ['curso*', 'profesor → FK'],
        filas: [['BD', 'Luis'], ['Redes', 'Eva']],
        pk: 'PK = curso',
      },
      {
        nombre: 'profesores', cols: ['profesor*', 'despacho'],
        filas: [['Luis', 'A1'], ['Eva', 'B2']],
        pk: 'PK = profesor',
      },
    ],
    arregla: '3FN: cambiar el despacho de Luis toca UNA fila. Borrar la última matrícula de BD ya no borra el curso. Insertar un profesor sin cursos, posible.',
  },
]

export default function NormalizationVisualizer() {
  const [idx, setIdx] = useState(0)
  const p = PASOS[idx]
  return (
    <div>
      <p className="text-xs leading-relaxed text-zinc-400">
        Una matrícula mal diseñada, normalizada paso a paso. Avanza y fíjate en qué dependencia desaparece en cada nivel.
      </p>
      <div className="mt-3 space-y-2" aria-live="polite">
        {p.tablas.map((t) => (
          <div key={t.nombre} className="overflow-x-auto rounded-lg border border-zinc-800">
            <p className="border-b border-zinc-800 bg-zinc-900/60 px-2.5 py-1 font-mono text-[11px] font-bold text-sky-300">
              {t.nombre} {t.pk && <span className="ml-1 font-normal text-zinc-500">{t.pk}</span>}
            </p>
            <table className="w-full min-w-[320px] text-left font-mono text-[11px]">
              <thead>
                <tr className="border-b border-zinc-800/60 text-zinc-500">
                  {t.cols.map((c) => <th key={c} className="px-2.5 py-1 font-normal">{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {t.filas.map((f, i) => (
                  <tr key={i} className="border-b border-zinc-800/40 text-zinc-300 last:border-0 odd:bg-zinc-900/20">
                    {f.map((c, j) => <td key={j} className="px-2.5 py-1">{c}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-lg border border-zinc-800 bg-black/40 p-3">
        <p className="text-sm font-semibold text-zinc-100">Paso {idx + 1}/{PASOS.length} · {p.titulo}</p>
        <p className="mt-1 text-xs leading-relaxed text-zinc-400">{p.que}</p>
        <p className="mt-1.5 text-xs leading-relaxed"><span className="font-semibold text-emerald-300">Se arregla: </span><span className="text-zinc-300">{p.arregla}</span></p>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button onClick={() => setIdx(0)} className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-300 hover:border-sky-500/50">
          <RotateCcw className="h-3 w-3" /> Reiniciar
        </button>
        <div className="ml-auto flex gap-2">
          <button disabled={idx === 0} onClick={() => setIdx(idx - 1)} className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-300 hover:border-sky-500/50 disabled:opacity-40">
            <ChevronLeft className="h-3 w-3" /> Anterior
          </button>
          <button disabled={idx === PASOS.length - 1} onClick={() => setIdx(idx + 1)} className={cn('inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs disabled:opacity-40', 'border-sky-500/50 bg-sky-500/10 text-sky-200 hover:bg-sky-500/20')}>
            Siguiente <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  )
}
