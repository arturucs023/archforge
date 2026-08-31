import { useState } from 'react'
import { CheckCircle2, RotateCcw, XCircle } from 'lucide-react'
import type { QuizData } from '../types'
import { useApp } from '../context/AppContext'
import { cn } from '../lib/utils'

const DIFF_LABEL = { beginner: 'Principiante', intermediate: 'Intermedio', expert: 'Experto' } as const

export default function Quiz({ quiz }: { quiz: QuizData }) {
  const { isDone, markDone, level } = useApp()
  const [selected, setSelected] = useState<number | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const solvedBefore = isDone(`quiz:${quiz.id}`)

  const submit = () => {
    if (selected === null) return
    setSubmitted(true)
    if (selected === quiz.answer) markDone(`quiz:${quiz.id}`, true)
  }

  const retry = () => {
    setSelected(null)
    setSubmitted(false)
  }

  return (
    <section id={`quiz-${quiz.id}`} className="scroll-mt-24 rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 to-transparent p-5 animate-fade-in">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded-md border border-violet-500/40 bg-violet-500/15 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-violet-300">
          Ejercicio
        </span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">{DIFF_LABEL[quiz.difficulty]}</span>
        {solvedBefore && (
          <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-emerald-400">
            <CheckCircle2 className="h-3 w-3" /> resuelto
          </span>
        )}
      </div>

      {quiz.context && <p className="mb-2 font-mono text-xs leading-relaxed text-zinc-400">{quiz.context}</p>}
      <h4 className="text-sm font-semibold text-zinc-100">{quiz.question}</h4>

      <ul className="mt-3 space-y-2">
        {quiz.options.map((opt, i) => {
          const isAnswer = i === quiz.answer
          const isPicked = selected === i
          let cls = 'border-zinc-800 bg-ink-900/60 hover:border-zinc-600'
          if (!submitted && isPicked) cls = 'border-sky-500/60 bg-sky-500/10'
          if (submitted) {
            if (isAnswer) cls = 'border-emerald-500/60 bg-emerald-500/10'
            else if (isPicked) cls = 'border-rose-500/60 bg-rose-500/10'
            else cls = 'border-zinc-800/70 bg-ink-900/40 opacity-70'
          }
          return (
            <li key={i}>
              <button
                onClick={() => !submitted && setSelected(i)}
                disabled={submitted}
                aria-pressed={isPicked}
                className={cn('flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors disabled:cursor-default', cls)}
              >
                <span className="mt-0.5 font-mono text-xs font-bold text-zinc-500">{'ABCD'[i]}.</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-mono text-sm text-zinc-200">{opt.text}</span>
                  {submitted && (
                    <span className={cn('mt-1.5 block text-xs leading-relaxed', isAnswer ? 'text-emerald-300/90' : 'text-zinc-400')}>
                      {isAnswer ? '✓ Correcto: ' : '✗ '}
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

      {!submitted ? (
        <button
          onClick={submit}
          disabled={selected === null}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-violet-500/50 bg-violet-500/15 px-4 py-2 text-sm font-medium text-violet-200 transition-colors hover:bg-violet-500/25 disabled:opacity-40"
        >
          Comprobar respuesta
        </button>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className={cn('text-sm font-medium', selected === quiz.answer ? 'text-emerald-300' : 'text-rose-300')}>
            {selected === quiz.answer ? '¡Correcto! Ejercicio superado.' : 'No era esa. Lee las explicaciones y reintenta.'}
          </span>
          <button onClick={retry} className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-500">
            <RotateCcw className="h-3.5 w-3.5" /> Reintentar
          </button>
        </div>
      )}
      {level !== 'beginner' && submitted && selected === quiz.answer && quiz.options[quiz.answer] && (
        <p className="mt-2 text-xs leading-relaxed text-zinc-500">Nivel de detalle completo desbloqueado arriba en las explicaciones por opción.</p>
      )}
    </section>
  )
}
