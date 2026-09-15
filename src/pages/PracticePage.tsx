import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Award, CheckCircle2, FlaskConical, Map as MapIcon, PackageSearch, Timer } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { navigate } from '../lib/router'
import Breadcrumbs, { PageHeader } from '../components/Breadcrumbs'
import QuestionRunner from '../components/practice/QuestionRunner'
import KnowledgeTree from '../components/practice/KnowledgeTree'
import PacketInspector from '../components/practice/PacketInspector'
import type { PracticeQuestion } from '../data/practice/types'
import { CHALLENGES } from '../data/practice/challenges'
import { QUESTION_MAP } from '../data/practice/bank'
import { getSection } from '../data/registry'
import {
  buildTree, catLabel, challengeProgress, isChallengeDone, practiceStats,
  sampleExam, usePractice,
} from '../lib/practice'
import type { PracticeState } from '../lib/practice'
import type { ExamResult } from '../data/practice/types'
import { cn } from '../lib/utils'

type Tab = 'retos' | 'examen' | 'mapa' | 'inspector'

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function PracticePage() {
  const { isDone, longestLearningStreak } = useApp()
  const { practice, recordAnswer, recordExam } = usePractice()
  const [tab, setTab] = useState<Tab>('retos')

  useEffect(() => {
    document.title = 'Practicar — ArchForge'
  }, [])

  const stats = useMemo(() => practiceStats(practice), [practice])
  const tree = useMemo(() => buildTree(isDone, practice), [isDone, practice])

  return (
    <div className="animate-fade-in">
      <Breadcrumbs items={[{ label: 'Practicar' }]} />
      <PageHeader
        icon={<FlaskConical className="h-6 w-6" />}
        title="Practicar"
        subtitle="Del contenido a la comprobación: retos por tema, modo examen, mapa de conocimientos, inspector de paquetes y constructor de comandos. Todo local, sin servidores."
      />

      {/* resumen */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard value={`${stats.challengesDone}/${stats.challengesTotal}`} label="Retos completados" />
        <StatCard value={`${stats.accuracy}%`} label={`Precisión (${stats.answered} respuestas)`} />
        <StatCard value={stats.examsTaken > 0 ? `${stats.examsTaken} · mejor ${stats.bestScore}` : '—'} label="Exámenes" />
        <StatCard value={longestLearningStreak > 0 ? `🔥 ${longestLearningStreak} días` : '—'} label="Mejor racha" />
      </div>

      {/* tabs */}
      <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Modos de práctica">
        {(
          [
            ['retos', 'Retos'],
            ['examen', 'Modo examen'],
            ['mapa', 'Mapa de conocimientos'],
            ['inspector', 'Packet Inspector'],
          ] as [Tab, string][]
        ).map(([t, label]) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn(
              'rounded-lg border px-3.5 py-1.5 text-xs font-medium transition-colors',
              tab === t
                ? 'border-sky-500/50 bg-sky-500/10 text-sky-300'
                : 'border-zinc-800 bg-ink-900/60 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'retos' && <ChallengesTab practice={practice} onAnswer={recordAnswer} />}
      {tab === 'examen' && <ExamTab onAnswer={recordAnswer} onExam={recordExam} />}
      {tab === 'mapa' && <KnowledgeTree tree={tree} />}
      {tab === 'inspector' && <PacketInspector />}
    </div>
  )
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-ink-900/70 p-4">
      <div className="truncate font-mono text-xl font-bold text-zinc-50">{value}</div>
      <div className="mt-1 text-xs text-zinc-500">{label}</div>
    </div>
  )
}

/* --------------------------------- RETOS --------------------------------- */

function ChallengesTab({ practice, onAnswer }: { practice: PracticeState; onAnswer: (qid: string, ok: boolean) => void }) {
  const [sel, setSel] = useState<string | null>(null)
  const ch = CHALLENGES.find((c) => c.id === sel) ?? null

  if (!ch) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CHALLENGES.map((c) => {
          const p = challengeProgress(practice, c.id)
          const done = p.done === p.total
          const section = getSection(c.sectionId)
          return (
            <button
              key={c.id}
              onClick={() => setSel(c.id)}
              className={cn(
                'group rounded-2xl border p-4 text-left transition-colors',
                done ? 'border-emerald-600/40 bg-emerald-500/[0.05] hover:border-emerald-500/60' : 'border-zinc-800 bg-ink-900/70 hover:border-sky-500/40',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-md border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-sky-300">
                  {catLabel(c.cat)}
                </span>
                {done
                  ? <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase text-emerald-400"><CheckCircle2 className="h-3 w-3" /> listo</span>
                  : <span className="font-mono text-[10px] tabular-nums text-zinc-600">{p.done}/{p.total}</span>}
              </div>
              <div className="mt-2 text-sm font-semibold text-zinc-100 group-hover:text-sky-200">{c.title}</div>
              <div className="mt-0.5 text-xs text-zinc-500">{p.total} preguntas · repasa en {section?.title ?? c.sectionId}</div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-zinc-800">
                <span className={cn('block h-full rounded-full', done ? 'bg-emerald-500' : 'bg-sky-500')} style={{ width: `${p.total ? Math.round((p.done / p.total) * 100) : 0}%` }} />
              </div>
            </button>
          )
        })}
      </div>
    )
  }

  return <ChallengeDetail practice={practice} challengeId={ch.id} onBack={() => setSel(null)} onAnswer={onAnswer} onPick={setSel} />
}

function ChallengeDetail({ practice, challengeId, onBack, onAnswer, onPick }: {
  practice: PracticeState
  challengeId: string
  onBack: () => void
  onAnswer: (qid: string, ok: boolean) => void
  onPick: (id: string) => void
}) {
  const ch = CHALLENGES.find((c) => c.id === challengeId)!
  const [idx, setIdx] = useState(0)
  const questions = ch.questions.map((id) => QUESTION_MAP.get(id)).filter((q): q is PracticeQuestion => !!q)
  const q = questions[Math.min(idx, questions.length - 1)]
  const section = getSection(ch.sectionId)
  const complete = isChallengeDone(practice, ch.id)
  const pos = CHALLENGES.findIndex((c) => c.id === ch.id)
  const next = CHALLENGES[(pos + 1) % CHALLENGES.length]

  if (questions.length === 0) return null

  return (
    <div>
      <button onClick={onBack} className="mb-3 inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-sky-300">
        <ArrowLeft className="h-3.5 w-3.5" /> Todos los retos
      </button>

      {complete && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-600/40 bg-emerald-500/[0.07] p-4">
          <Award className="h-6 w-6 shrink-0 text-emerald-300" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-emerald-200">Reto completado: {ch.title}</p>
            <p className="text-xs text-zinc-400">Puedes reintentarlo o seguir con el siguiente.</p>
          </div>
          <button onClick={() => section && navigate(`/section/${section.id}`)} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-sky-500/50 hover:text-sky-300">
            Repasar unidad
          </button>
          <button onClick={() => { onPick(next.id); setIdx(0) }} className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/50 bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-sky-200 hover:bg-sky-500/20">
            Siguiente reto: {next.title} <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <QuestionRunner
        key={`${ch.id}-${q.id}`}
        q={q}
        mode="practice"
        indexLabel={`${idx + 1}/${questions.length}`}
        onDone={onAnswer}
        onNext={idx + 1 < questions.length ? () => setIdx(idx + 1) : undefined}
        nextLabel="Siguiente pregunta"
      />

      <div className="mt-3 flex items-center justify-between">
        <button
          disabled={idx === 0}
          onClick={() => setIdx(idx - 1)}
          className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-500 disabled:opacity-40"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Anterior
        </button>
        <span className="font-mono text-[11px] text-zinc-600">{catLabel(ch.cat)} · {ch.title}</span>
        <button
          disabled={idx + 1 >= questions.length}
          onClick={() => setIdx(idx + 1)}
          className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-500 disabled:opacity-40"
        >
          Siguiente <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

/* --------------------------------- EXAMEN ---------------------------------- */

type ExamPhase = 'idle' | 'run' | 'done'

function ExamTab({ onAnswer, onExam }: { onAnswer: (qid: string, ok: boolean) => void; onExam: (r: ExamResult) => void }) {
  const [phase, setPhase] = useState<ExamPhase>('idle')
  const [questions, setQuestions] = useState<PracticeQuestion[]>([])
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, boolean>>({})
  const [seconds, setSeconds] = useState(0)
  const [result, setResult] = useState<ExamResult | null>(null)

  useEffect(() => {
    if (phase !== 'run') return
    const t = window.setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => window.clearInterval(t)
  }, [phase])

  const start = () => {
    setQuestions(sampleExam(20))
    setIdx(0)
    setAnswers({})
    setSeconds(0)
    setResult(null)
    setPhase('run')
  }

  const answer = (qid: string, ok: boolean) => {
    onAnswer(qid, ok)
    setAnswers((a) => ({ ...a, [qid]: ok }))
  }

  const finish = (finalAnswers: Record<string, boolean>, secs: number) => {
    const okCount = questions.filter((q) => finalAnswers[q.id]).length
    const byCat: ExamResult['byCat'] = {}
    for (const q of questions) {
      const b = byCat[q.cat] ?? { ok: 0, total: 0 }
      b.total += 1
      if (finalAnswers[q.id]) b.ok += 1
      byCat[q.cat] = b
    }
    const res: ExamResult = {
      at: Date.now(),
      total: questions.length,
      ok: okCount,
      byCat,
      failed: questions.filter((q) => !finalAnswers[q.id]).map((q) => q.id),
      seconds: secs,
    }
    setResult(res)
    onExam(res)
    setPhase('done')
  }

  if (phase === 'idle') {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-ink-900/70 p-5 sm:p-6">
        <h3 className="flex items-center gap-2 text-base font-semibold text-zinc-100"><Timer className="h-5 w-5 text-sky-400" /> Modo examen</h3>
        <ul className="mt-3 space-y-1.5 text-sm leading-relaxed text-zinc-400">
          <li>· 20 preguntas de todas las categorías, sin explicaciones hasta el final.</li>
          <li>· Cuenta el tiempo transcurrido (sin límite: es autoevaluación, no presión).</li>
          <li>· Al terminar verás nota, resultados por categoría y qué repasar con enlaces.</li>
          <li>· Tus respuestas también alimentan retos, precisión y logros.</li>
        </ul>
        <button onClick={start} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-sky-500/50 bg-sky-500/10 px-5 py-2.5 text-sm font-medium text-sky-200 hover:bg-sky-500/20">
          Empezar examen <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    )
  }

  if (phase === 'run' && questions.length > 0) {
    const q = questions[Math.min(idx, questions.length - 1)]
    const last = idx + 1 >= questions.length
    return (
      <div>
        <div className="mb-3 flex items-center gap-3 rounded-xl border border-zinc-800 bg-ink-900/60 px-4 py-2.5">
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-zinc-400">Examen</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
            <span className="block h-full rounded-full bg-sky-500" style={{ width: `${Math.round(((idx + 1) / questions.length) * 100)}%` }} />
          </div>
          <span className="font-mono text-xs tabular-nums text-zinc-400">{idx + 1}/{questions.length}</span>
          <span className="inline-flex items-center gap-1 font-mono text-xs tabular-nums text-zinc-400"><Timer className="h-3.5 w-3.5" />{fmtTime(seconds)}</span>
        </div>
        <QuestionRunner
          key={q.id}
          q={q}
          mode="exam"
          indexLabel={`${idx + 1}/${questions.length}`}
          onDone={answer}
          onNext={() => { if (last) finish({ ...answers, [q.id]: answers[q.id] ?? false }, seconds); else setIdx(idx + 1) }}
          nextLabel={last ? 'Terminar examen' : 'Siguiente'}
        />
      </div>
    )
  }

  if (phase === 'done' && result) {
    return <ExamResults result={result} onRetry={start} />
  }

  return null
}

function ExamResults({ result, onRetry }: { result: ExamResult; onRetry: () => void }) {
  const pct = result.total ? Math.round((result.ok / result.total) * 100) : 0
  const failedSections = [...new Set(
    result.failed
      .map((id) => QUESTION_MAP.get(id))
      .filter((q): q is PracticeQuestion => !!q)
      .map((q) => q.sectionId),
  )]
    .map((id) => getSection(id))
    .filter((s): s is NonNullable<typeof s> => !!s)

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-800 bg-ink-900/70 p-5 text-center sm:p-6">
        <p className="font-mono text-[11px] uppercase tracking-widest text-zinc-500">Resultado</p>
        <p className="mt-1 font-mono text-4xl font-bold text-zinc-50">{result.ok}<span className="text-lg text-zinc-500">/{result.total}</span></p>
        <p className="mt-1 text-sm text-zinc-400">{pct}% · {fmtTime(result.seconds)} empleados</p>
        <p className="mt-2 text-sm font-medium text-sky-300">
          {pct >= 90 ? 'Excelente: dominio sólido.' : pct >= 70 ? 'Bien encaminado: repasa los fallos.' : 'Base en construcción: repasa las unidades indicadas.'}
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-ink-900/70 p-5">
        <h4 className="mb-3 font-mono text-[11px] font-bold uppercase tracking-widest text-zinc-400">Por categoría</h4>
        <div className="grid gap-2 sm:grid-cols-2">
          {Object.entries(result.byCat).map(([cat, v]) => (
            <div key={cat} className="flex items-center gap-2">
              <span className="w-24 shrink-0 truncate text-xs text-zinc-400">{catLabel(cat as PracticeQuestion['cat'])}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
                <span className={cn('block h-full rounded-full', v.ok === v.total ? 'bg-emerald-500' : 'bg-sky-500')} style={{ width: `${v.total ? Math.round((v.ok / v.total) * 100) : 0}%` }} />
              </span>
              <span className="w-10 shrink-0 text-right font-mono text-[11px] tabular-nums text-zinc-500">{v.ok}/{v.total}</span>
            </div>
          ))}
        </div>
      </div>

      {failedSections.length > 0 && (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.04] p-5">
          <h4 className="mb-1 font-mono text-[11px] font-bold uppercase tracking-widest text-amber-300">Necesitas repasar</h4>
          <div className="mt-2 flex flex-wrap gap-2">
            {failedSections.map((s) => (
              <button
                key={s.id}
                onClick={() => navigate(`/section/${s.id}`)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 px-3 py-2 text-left text-sm text-zinc-200 hover:border-sky-500/50 hover:text-sky-200"
              >
                <PackageSearch className="h-3.5 w-3.5 text-zinc-500" />
                {s.title}
              </button>
            ))}
          </div>
        </div>
      )}

      <button onClick={onRetry} className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-sky-500/50 hover:text-sky-300">
        Nuevo examen
      </button>
    </div>
  )
}
