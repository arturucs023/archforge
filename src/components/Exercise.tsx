import { useState } from 'react'
import { Check, CheckCircle2, Eye, RotateCcw, XCircle } from 'lucide-react'
import type { BashExercise } from '../data/bashcourse/types'
import Blocks from './Blocks'
import { cmd } from '../data/helpers'
import type { Block } from '../types'
import { useApp } from '../context/AppContext'
import { cn } from '../lib/utils'

function normalizeAnswer(s: string): string {
  return s
    .trim()
    .replace(/^\$\s+/, '')
    .replace(/\s+/g, ' ')
    .replace(/["']/g, '')
    .toLowerCase()
}

const KIND_LABEL: Record<string, string> = {
  choice: 'Elige la correcta',
  write: 'Escribe el comando',
  predict: 'Predice la salida',
}

export default function Exercise({ ex }: { ex: BashExercise }) {
  const { isDone, markDone } = useApp()
  const [picked, setPicked] = useState<number | null>(null)
  const [text, setText] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [correct, setCorrect] = useState(false)
  const [showSolution, setShowSolution] = useState(false)

  const solvedBefore = isDone(`bashex:${ex.id}`)

  const submit = () => {
    let ok = false
    if ((ex.kind === 'choice' || ex.kind === 'predict') && picked !== null) {
      ok = picked === ex.answer
    } else if (ex.kind === 'write') {
      const norm = normalizeAnswer(text)
      ok = (ex.accept ?? []).some((a) => normalizeAnswer(a) === norm)
      // tolerar variantes sin comillas si el aceptado las lleva y viceversa
      if (!ok && (ex.accept ?? []).some((a) => normalizeAnswer(a).replace(/ /g, '') === norm.replace(/ /g, ''))) ok = true
    }
    setSubmitted(true)
    setCorrect(ok)
    if (ok) markDone(`bashex:${ex.id}`, true)
  }

  const retry = () => {
    setSubmitted(false)
    setCorrect(false)
    setPicked(null)
    setText('')
    setShowSolution(false)
  }

  return (
    <section id={`bashex-${ex.id}`} className="scroll-mt-24 overflow-hidden rounded-2xl border border-sky-500/30 bg-gradient-to-br from-sky-500/10 to-transparent">
      <header className="flex flex-wrap items-center gap-2 px-5 pt-4">
        <span className="rounded-md border border-sky-500/40 bg-sky-500/15 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-sky-300">
          Ejercicio · {KIND_LABEL[ex.kind]}
        </span>
        {solvedBefore && (
          <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-emerald-400">
            <CheckCircle2 className="h-3 w-3" /> resuelto
          </span>
        )}
      </header>

      <div className="px-5 pb-5 pt-2.5">
        <p className="text-sm font-semibold leading-relaxed text-zinc-100">{ex.question}</p>

        {ex.context && (
          <pre className={cn('mt-2.5 overflow-x-auto rounded-lg border border-zinc-800 bg-black/50 px-3 py-2 font-mono text-xs leading-6 text-zinc-300', ex.contextCaption ? '' : '')}>
            {ex.contextCaption && <div className="mb-1 font-mono text-[9px] uppercase tracking-widest text-zinc-600">{ex.contextCaption}</div>}
            {ex.context}
          </pre>
        )}

        {/* Opciones choice/predict */}
        {(ex.kind === 'choice' || ex.kind === 'predict') && ex.options && (
          <ul className="mt-3 space-y-2">
            {ex.options.map((opt, i) => {
              const isAnswer = i === ex.answer
              const isPicked = picked === i
              let cls = 'border-zinc-800 bg-ink-900/60 hover:border-zinc-600'
              if (!submitted && isPicked) cls = 'border-sky-500/60 bg-sky-500/10'
              if (submitted) {
                if (isAnswer) cls = 'border-emerald-500/60 bg-emerald-500/10'
                else if (isPicked) cls = 'border-rose-500/60 bg-rose-500/10'
                else cls = 'border-zinc-800/70 bg-ink-900/40 opacity-60'
              }
              return (
                <li key={i}>
                  <button
                    onClick={() => !submitted && setPicked(i)}
                    disabled={submitted}
                    aria-pressed={isPicked}
                    className={cn('flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors disabled:cursor-default', cls)}
                  >
                    <span className="mt-0.5 font-mono text-xs font-bold text-zinc-500">{'ABCD'[i]}.</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-mono text-sm text-zinc-200">{opt.text}</span>
                      {submitted && (
                        <span className={cn('mt-1.5 block text-xs leading-relaxed', isAnswer ? 'text-emerald-300/90' : 'text-zinc-400')}>
                          {isAnswer ? '✓ ' : '✗ '}
                          {opt.why}
                        </span>
                      )}
                    </span>
                    {submitted && (isAnswer ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> : isPicked ? <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" /> : null)}
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        {/* Entrada write */}
        {ex.kind === 'write' && !submitted && (
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder={ex.placeholder ?? '$ escribe aquí tu comando…'}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            aria-label="Tu respuesta"
            className="mt-3 w-full rounded-xl border border-zinc-700 bg-black/50 px-4 py-2.5 font-mono text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-700 focus:border-sky-500/60"
          />
        )}

        {/* Resultado write */}
        {submitted && ex.kind === 'write' && (
          <p className={cn('mt-3 text-sm font-medium', correct ? 'text-emerald-300' : 'text-rose-300')}>
            {correct ? '¡Exacto! Comando correcto.' : 'No es la respuesta esperada — revisa la pista y reintenta, o mira la solución.'}
          </p>
        )}

        {/* Acciones */}
        {!submitted ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={submit}
              disabled={ex.kind === 'write' ? text.trim() === '' : picked === null}
              className="inline-flex items-center gap-2 rounded-lg border border-sky-500/50 bg-sky-500/15 px-4 py-2 text-sm font-medium text-sky-200 transition-colors hover:bg-sky-500/25 disabled:opacity-40"
            >
              <Check className="h-4 w-4" /> Comprobar
            </button>
            <button
              onClick={() => setShowSolution(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-400 transition-colors hover:text-zinc-200"
            >
              <Eye className="h-3.5 w-3.5" /> Ver solución
            </button>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {ex.kind === 'write' || ex.kind === 'predict' ? (
              <span className={cn('font-mono text-xs', correct ? 'text-emerald-300' : 'text-zinc-400')}>
                {correct ? '✓ superado' : 'pendiente'}
              </span>
            ) : (
              <span className={cn('text-sm font-medium', correct ? 'text-emerald-300' : 'text-rose-300')}>
                {correct ? '¡Correcto!' : 'No era esa — lee las explicaciones.'}
              </span>
            )}
            <button onClick={retry} className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-500">
              <RotateCcw className="h-3.5 w-3.5" /> Reintentar
            </button>
          </div>
        )}

        {/* Solución explicada */}
        {showSolution && (
          <div className="mt-4 space-y-3 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.05] p-4 animate-fade-in">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-300">Solución explicada</p>
            <Blocks blocks={[cmd({ caption: 'respuesta' }, ...ex.solutionLines)] as Block[]} />
            <p className="text-sm leading-relaxed text-zinc-300">{ex.explanation}</p>
            {!correct && submitted === false && null}
            {ex.kind === 'write' && !correct && submitted && (
              <button onClick={() => { retry() }} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-500">
                Intentarlo de nuevo ahora que vi la solución
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
