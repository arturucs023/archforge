import { useState } from 'react'
import { ArrowRight, CheckCircle2, RotateCcw, XCircle } from 'lucide-react'
import type { PracticeQuestion } from '../../data/practice/types'
import { PRACTICE_DIFF_LABEL } from '../../data/practice/types'
import { catLabel } from '../../lib/practice'
import { getSection } from '../../data/registry'
import { navigate } from '../../lib/router'
import { cn } from '../../lib/utils'

export function normText(s: string): string {
  return s.toLowerCase().replace(/["'`]/g, '').replace(/\s+/g, ' ').trim().replace(/;+\s*$/, '')
}

export function normCidr(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '')
}

export function checkAnswer(q: PracticeQuestion, given: unknown): boolean {
  switch (q.kind) {
    case 'choice':
      return given === q.answer
    case 'numeric': {
      const n = typeof given === 'number' ? given : parseFloat(String(given).replace(',', '.'))
      if (!Number.isFinite(n)) return false
      return Math.abs(n - q.answer) <= (q.tolerance ?? 0)
    }
    case 'text':
      return q.accept.some((a) => normText(a) === normText(String(given ?? '')))
    case 'subnet': {
      if (!Array.isArray(given) || given.length !== q.expected.length) return false
      return q.expected.every((exp, i) => normCidr(exp) === normCidr(String(given[i] ?? '')))
    }
  }
}

interface Props {
  q: PracticeQuestion
  mode: 'practice' | 'exam'
  /** se llama UNA vez por pregunta (primer intento) */
  onDone?: (qid: string, ok: boolean) => void
  onNext?: () => void
  nextLabel?: string
  indexLabel?: string
}

export default function QuestionRunner({ q, mode, onDone, onNext, nextLabel, indexLabel }: Props) {
  const [choice, setChoice] = useState<number | null>(null)
  const [text, setText] = useState('')
  const [rows, setRows] = useState<string[]>(() => (q.kind === 'subnet' ? q.rows.map(() => '') : []))
  const [submitted, setSubmitted] = useState(false)
  const [ok, setOk] = useState(false)
  const [recorded, setRecorded] = useState(false)

  const canSubmit =
    !submitted &&
    (q.kind === 'choice' ? choice !== null : q.kind === 'subnet' ? rows.some((r) => r.trim() !== '') : text.trim() !== '')

  const submit = () => {
    if (!canSubmit) return
    const given = q.kind === 'choice' ? choice : q.kind === 'subnet' ? rows : text
    const res = checkAnswer(q, given)
    setOk(res)
    setSubmitted(true)
    if (!recorded) {
      setRecorded(true)
      onDone?.(q.id, res)
    }
  }

  const retry = () => {
    setChoice(null)
    setText('')
    setRows(q.kind === 'subnet' ? q.rows.map(() => '') : [])
    setSubmitted(false)
  }

  const section = getSection(q.sectionId)
  const exam = mode === 'exam'

  return (
    <section className="rounded-2xl border border-zinc-800 bg-ink-900/70 p-5 animate-fade-in" aria-label={`Pregunta${indexLabel ? ` ${indexLabel}` : ''}`}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded-md border border-sky-500/40 bg-sky-500/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-sky-300">
          {catLabel(q.cat)}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">{PRACTICE_DIFF_LABEL[q.diff]}</span>
        {indexLabel && <span className="ml-auto font-mono text-[10px] tabular-nums text-zinc-500">{indexLabel}</span>}
      </div>

      {q.context && (
        <pre className="mb-3 overflow-x-auto rounded-lg border border-zinc-800 bg-black/40 px-3 py-2 font-mono text-xs leading-6 text-zinc-300">{q.context}</pre>
      )}
      <h4 className="text-sm font-semibold leading-relaxed text-zinc-100">{q.prompt}</h4>

      {/* ---------- choice ---------- */}
      {q.kind === 'choice' && (
        <ul className="mt-3 space-y-2">
          {q.options.map((opt, i) => {
            const isAnswer = i === q.answer
            const isPicked = choice === i
            let cls = 'border-zinc-800 bg-ink-900/60 hover:border-zinc-600'
            if (!submitted && isPicked) cls = 'border-sky-500/60 bg-sky-500/10'
            if (submitted && !exam) {
              if (isAnswer) cls = 'border-emerald-500/60 bg-emerald-500/10'
              else if (isPicked) cls = 'border-rose-500/60 bg-rose-500/10'
              else cls = 'border-zinc-800/70 bg-ink-900/40 opacity-70'
            }
            if (submitted && exam && isPicked) cls = 'border-zinc-600 bg-zinc-800/60'
            return (
              <li key={i}>
                <button
                  onClick={() => !submitted && setChoice(i)}
                  disabled={submitted}
                  aria-pressed={isPicked}
                  className={cn('flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors disabled:cursor-default', cls)}
                >
                  <span className="mt-0.5 font-mono text-xs font-bold text-zinc-500">{'ABCD'[i]}.</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono text-sm text-zinc-200">{opt.text}</span>
                    {submitted && !exam && (
                      <span className={cn('mt-1.5 block text-xs leading-relaxed', isAnswer ? 'text-emerald-300/90' : 'text-zinc-400')}>
                        {isAnswer ? '✓ Correcto: ' : '✗ '}
                        {opt.why}
                      </span>
                    )}
                  </span>
                  {submitted && !exam && (isAnswer ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> : isPicked ? <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" /> : null)}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {/* ---------- numeric / text ---------- */}
      {(q.kind === 'numeric' || q.kind === 'text') && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
            disabled={submitted && exam}
            inputMode={q.kind === 'numeric' ? 'decimal' : 'text'}
            placeholder={q.kind === 'text' ? (q.placeholder ?? 'tu respuesta…') : 'número…'}
            aria-label="Tu respuesta"
            className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-black/40 px-3 py-2 font-mono text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-sky-500/60 disabled:opacity-60"
          />
          {q.kind === 'numeric' && q.unit && <span className="font-mono text-xs text-zinc-500">{q.unit}</span>}
        </div>
      )}

      {/* ---------- subnet ---------- */}
      {q.kind === 'subnet' && (
        <div className="mt-3 space-y-2">
          {q.rows.map((label, i) => {
            const expected = q.expected[i]
            const good = submitted && !exam && normCidr(rows[i] ?? '') === normCidr(expected)
            const bad = submitted && !exam && (rows[i] ?? '').trim() !== '' && !good
            return (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <span className="w-32 shrink-0 truncate text-xs text-zinc-400">{label}</span>
                <input
                  value={rows[i] ?? ''}
                  onChange={(e) => setRows((r) => r.map((v, j) => (j === i ? e.target.value : v)))}
                  onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
                  disabled={submitted && exam}
                  placeholder="192.168.x.x/xx"
                  aria-label={`Subred para ${label}`}
                  className={cn(
                    'min-w-0 flex-1 rounded-lg border bg-black/40 px-3 py-2 font-mono text-sm text-zinc-100 outline-none placeholder:text-zinc-600 disabled:opacity-60',
                    good ? 'border-emerald-500/60' : bad ? 'border-rose-500/60' : 'border-zinc-700 focus:border-sky-500/60',
                  )}
                />
                {good && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-label="Correcto" />}
                {bad && <XCircle className="h-4 w-4 shrink-0 text-rose-400" aria-label="Incorrecto" />}
              </div>
            )
          })}
        </div>
      )}

      {/* ---------- acciones ---------- */}
      {!submitted ? (
        <button
          onClick={submit}
          disabled={!canSubmit}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-sky-500/50 bg-sky-500/10 px-4 py-2 text-sm font-medium text-sky-200 transition-colors hover:bg-sky-500/20 disabled:opacity-40"
        >
          {exam ? 'Responder y seguir' : 'Comprobar respuesta'}
        </button>
      ) : exam ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="text-sm text-zinc-400">Respuesta registrada.</span>
          {onNext && (
            <button onClick={onNext} className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/50 bg-sky-500/10 px-4 py-2 text-sm font-medium text-sky-200 hover:bg-sky-500/20">
              {nextLabel ?? 'Siguiente'} <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className={cn('flex items-center gap-2 rounded-xl border p-3', ok ? 'border-emerald-500/40 bg-emerald-500/[0.07]' : 'border-rose-500/40 bg-rose-500/[0.07]')}>
            {ok ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" /> : <XCircle className="h-5 w-5 shrink-0 text-rose-400" />}
            <div className="text-sm">
              <p className={cn('font-semibold', ok ? 'text-emerald-200' : 'text-rose-200')}>{ok ? '¡Correcto!' : 'Todavía no.'}</p>
              <p className="mt-0.5 leading-relaxed text-zinc-300">{q.explain}</p>
              <p className="mt-1 font-mono text-xs text-zinc-400">Solución: {q.solution}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={retry} className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-500">
              <RotateCcw className="h-3.5 w-3.5" /> Reintentar
            </button>
            {section && (
              <button onClick={() => navigate(`/section/${section.id}`)} className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-sky-500/50 hover:text-sky-300">
                Repasar: {section.title} <ArrowRight className="h-3 w-3" />
              </button>
            )}
            {onNext && (
              <button onClick={onNext} className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/50 bg-sky-500/10 px-4 py-1.5 text-xs font-medium text-sky-200 hover:bg-sky-500/20">
                {nextLabel ?? 'Siguiente'} <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
