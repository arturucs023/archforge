import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpenCheck, Check, ChevronDown, Target } from 'lucide-react'
import { BASH_MODULES, BASH_PROJECTS, getBashLesson } from '../data/bashcourse'
import type { BashLesson } from '../data/bashcourse/types'
import { BASH_LEVEL_LABEL } from '../data/bashcourse/types'
import Blocks from '../components/Blocks'
import CommandBreakdown from '../components/CommandBreakdown'
import VirtualTerminal from '../components/VirtualTerminal'
import Quiz from '../components/Quiz'
import Exercise from '../components/Exercise'
import ProgressBar from '../components/ProgressBar'
import FileBlockView from '../components/FileBlock'
import { cmd, file } from '../data/helpers'
import type { Block } from '../types'
import Breadcrumbs, { PageHeader } from '../components/Breadcrumbs'
import { useApp } from '../context/AppContext'
import { navigate } from '../lib/router'
import { cn } from '../lib/utils'

const LEVEL_DOT: Record<string, string> = {
  beginner: 'bg-emerald-400',
  intermediate: 'bg-amber-400',
  expert: 'bg-rose-400',
}

export default function BashCoursePage({ lessonId }: { lessonId?: string }) {
  const lesson = lessonId ? getBashLesson(lessonId) : undefined
  if (lesson) return <LessonView lesson={lesson} />
  return <CourseIndex />
}

/* ============================== ÍNDICE DEL CURSO ============================== */

function CourseIndex() {
  const { isDone, markDone } = useApp()

  useEffect(() => {
    document.title = 'Curso completo de Bash — ArchForge'
  }, [])

  const doneModules = useMemo(() => BASH_MODULES.filter((m) => isDone(`bash:${m.id}`)).length, [isDone])
  const doneProjects = useMemo(() => BASH_PROJECTS.filter((p) => isDone(`bashproj:${p.id}`)).length, [isDone])
  const total = BASH_MODULES.length + BASH_PROJECTS.length
  const pct = total ? Math.round(((doneModules + doneProjects) / total) * 100) : 0

  return (
    <div className="animate-fade-in">
      <Breadcrumbs items={[{ label: 'Curso de Bash' }]} />
      <PageHeader
        title="Curso completo de Bash"
        subtitle="Desde cero hasta escribir scripts útiles para administrar Linux: cada módulo combina explicación progresiva, práctica en terminal simulada, ejercicios con solución explicada y retos."
        icon={<span className="text-2xl" aria-hidden>🐚</span>}
        actions={
          <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-ink-900/70 px-4 py-2">
            <ProgressBar value={doneModules + doneProjects} max={total} className="w-28" />
            <span className="font-mono text-xs tabular-nums text-zinc-400">{pct}%</span>
          </div>
        }
      />

      {/* Resumen numérico */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="módulos" value={`${doneModules}/${BASH_MODULES.length}`} />
        <Stat label="proyectos" value={`${doneProjects}/${BASH_PROJECTS.length}`} />
        <Stat label="ejercicios" value="por módulo" />
        <Stat label="nivel final" value="Avanzado" />
      </div>

      {/* Módulos */}
      <h2 className="mb-3 flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-zinc-500">
        <BookOpenCheck className="h-4 w-4 text-sky-400" /> Módulos
      </h2>
      <ol className="mb-8 space-y-2">
        {BASH_MODULES.map((m, i) => (
          <li key={m.id}>
            <button
              onClick={() => navigate(`/bash/${m.id}`)}
              className={cn(
                'group flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition-colors',
                isDone(`bash:${m.id}`) ? 'border-emerald-700/40 bg-emerald-500/[0.04]' : 'border-zinc-800 bg-ink-900/70 hover:border-sky-500/40',
              )}
            >
              <span className="w-8 shrink-0 text-center font-mono text-sm font-bold text-zinc-600">{m.num}</span>
              <span
                role="checkbox"
                aria-checked={isDone(`bash:${m.id}`)}
                onClick={(e) => { e.stopPropagation(); markDone(`bash:${m.id}`, !isDone(`bash:${m.id}`)) }}
                title="Marcar módulo completado"
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors',
                  isDone(`bash:${m.id}`) ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300' : 'border-zinc-700 text-transparent hover:border-sky-500/60',
                )}
              >
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn('block truncate text-sm font-medium', isDone(`bash:${m.id}`) ? 'text-zinc-500' : 'text-zinc-100')}>{m.title}</span>
                <span className="block truncate text-[11px] text-zinc-500">{m.goals[0]}</span>
              </span>
              <LevelBadge level={m.level} />
              <span className="hidden shrink-0 font-mono text-[10px] text-zinc-600 sm:inline">~{m.minutes} min</span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-zinc-600 group-hover:text-sky-400" />
            </button>
          </li>
        ))}
      </ol>

      {/* Proyectos */}
      <h2 className="mb-3 flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-zinc-500">
        <Target className="h-4 w-4 text-violet-400" /> Proyectos progresivos
      </h2>
      <p className="mb-3 text-xs leading-relaxed text-zinc-500">
        Aplica lo aprendido construyendo herramientas reales. Cada proyecto lista requisitos y trae esqueleto de partida más solución completa para comparar.
      </p>
      <ol className="space-y-2 pb-4">
        {BASH_PROJECTS.map((p) => {
          const done = isDone(`bashproj:${p.id}`)
          return (
            <li key={p.id}>
              <ProjectCard projectId={p.id} done={done} onToggle={() => markDone(`bashproj:${p.id}`, !done)} />
            </li>
          )
        })}
      </ol>

      <p className="pt-2 text-center text-[11px] leading-relaxed text-zinc-600">
        Consejo: resuelve primero con TU intento; compara después con la solución y ejecuta shellcheck sobre la tuya.
      </p>
    </div>
  )
}

function ProjectCard({ projectId, done, onToggle }: { projectId: string; done: boolean; onToggle: () => void }) {
  const p = BASH_PROJECTS.find((x) => x.id === projectId)!
  const [open, setOpen] = useState(false)
  return (
    <article
      id={`proj-${p.id}`}
      className={cn('scroll-mt-24 overflow-hidden rounded-xl border bg-ink-900/70', done ? 'border-emerald-700/40' : open ? 'border-violet-500/40' : 'border-zinc-800')}
    >
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 p-3.5">
        <span className={cn('font-mono text-sm font-bold', p.final ? 'text-violet-300' : 'text-zinc-500')}>{p.num}</span>
        <button onClick={() => setOpen((v) => !v)} aria-expanded={open} className="min-w-0 flex-1 text-left">
          <span className={cn('block truncate text-sm font-medium', done ? 'text-zinc-500' : 'text-zinc-100')}>
            {p.title}
            {p.final && <span className="ml-2 rounded border border-violet-500/40 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-violet-300">final</span>}
          </span>
        </button>
        <LevelBadge level={p.level} />
        <span className="hidden font-mono text-[10px] text-zinc-600 sm:inline">~{p.minutes} min</span>
        <button
          role="checkbox"
          aria-checked={done}
          onClick={onToggle}
          title="Marcar proyecto completado"
          className={cn(
            'flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors',
            done ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300' : 'border-zinc-700 text-transparent hover:border-violet-500/60',
          )}
        >
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </button>
        <button onClick={() => setOpen((v) => !v)} aria-expanded={open} className="shrink-0 rounded-md border border-zinc-800 p-1 text-zinc-500 hover:text-zinc-200">
          <ChevronDown className={cn('h-4 w-4 transition-transform', !open && '-rotate-90')} />
        </button>
      </header>

      {open && (
        <div className="space-y-5 border-t border-zinc-800/70 p-4 sm:p-5 animate-fade-in">
          <p className="text-sm leading-relaxed text-zinc-300">{p.goal}</p>

          <section>
            <H>Requisitos</H>
            <ul className="space-y-1.5 pl-1 text-sm text-zinc-300">
              {p.requirements.map((r, i) => (
                <li key={i} className="flex gap-2"><span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-sm bg-violet-400/70" />{r}</li>
              ))}
            </ul>
          </section>

          <section>
            <H>Conceptos que practicas</H>
            <div className="flex flex-wrap gap-1.5">
              {p.concepts.map((c) => (
                <a key={c} href={`#/bash/${slugify(c)}`} className="rounded-md border border-zinc-700 bg-zinc-800/50 px-2 py-0.5 font-mono text-[10px] text-zinc-300 hover:border-sky-500/40 hover:text-sky-300">{c}</a>
              ))}
            </div>
          </section>

          <section>
            <H>Esqueleto de partida</H>
            <FileBlockView block={file(p.starter.filename, p.starter.content)} />
          </section>

          <section>
            <H>Solución completa (compárala, no la copies a ciegas)</H>
            <FileBlockView block={file(p.solution.filename, p.solution.content)} />
          </section>

          <section>
            <H>Cómo verificar que funciona</H>
            <Blocks blocks={[cmd({}, ...p.verify)] as Block[]} />
          </section>
        </div>
      )}
    </article>
  )
}

function slugify(s: string): string {
  const map: Record<string, string> = {
    scripts: 'scripts', shebang: 'scripts', 'chmod +x': 'scripts', echo: 'primeros-comandos',
    argumentos: 'argumentos', case: 'condicionales', aritmética: 'comillas-expansion',
    'exit codes': 'exit-codes', stderr: 'operadores-redirecciones', 'arrays/globbing': 'arrays',
    getopts: 'bash-avanzado', find: 'grep', 'grep -rn --': 'grep', 'awk begin/end acumuladores': 'awk',
    'free/df/ps': 'procesos-curso', 'printf formato': 'primeros-comandos', 'tar czvf + exclude': 'pipes',
    'mktemp/trap': 'manejo-errores', 'todo el curso': 'bash-avanzado',
  }
  return map[s.toLowerCase()] ?? 'variables'
}

/* ================================ LECCIÓN ================================ */

function LessonView({ lesson }: { lesson: BashLesson }) {
  const { isDone, markDone, level } = useApp()
  const idx = BASH_MODULES.findIndex((m) => m.id === lesson.id)
  const prev = idx > 0 ? BASH_MODULES[idx - 1] : undefined
  const next = idx < BASH_MODULES.length - 1 ? BASH_MODULES[idx + 1] : undefined
  const done = isDone(`bash:${lesson.id}`)

  useEffect(() => {
    document.title = `${lesson.num}. ${lesson.title} — Curso Bash · ArchForge`
    window.scrollTo({ top: 0 })
  }, [lesson.id])

  const showTechnical = level !== 'beginner'

  return (
    <div key={lesson.id} className="animate-fade-in">
      <Breadcrumbs items={[{ label: 'Curso de Bash', to: '/bash' }, { label: `${lesson.num}. ${lesson.title}` }]} />

      <PageHeader
        title={`${lesson.num}. ${lesson.title}`}
        icon={<LevelDot level={lesson.level} />}
        actions={
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-zinc-400">
              <LevelDot level={lesson.level} small /> {BASH_LEVEL_LABEL[lesson.level]} · ~{lesson.minutes} min
            </span>
            <button
              role="checkbox"
              aria-checked={done}
              onClick={() => markDone(`bash:${lesson.id}`, !done)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                done ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300' : 'border-zinc-700 text-zinc-300 hover:border-emerald-500/40 hover:text-emerald-300',
              )}
            >
              <Check className="h-3.5 w-3.5" /> {done ? 'Completado' : 'Marcar completado'}
            </button>
          </div>
        }
      />

      <article className="space-y-7 rounded-2xl border border-zinc-800 bg-ink-900/70 p-5 sm:p-7">
        {/* Objetivos */}
        <section>
          <H icon={<Target className="h-3.5 w-3.5" />}>Objetivos</H>
          <ul className="space-y-1 pl-1 text-sm text-zinc-300">
            {lesson.goals.map((g, i) => (
              <li key={i} className="flex gap-2"><span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-sm bg-sky-400/70" />{g}</li>
            ))}
          </ul>
        </section>

        {/* 1. Explicación sencilla */}
        <section>
          <H>Explicación sencilla</H>
          <div className="space-y-2.5">
            {lesson.simple.map((t, i) => (
              <p key={i} className="text-[15px] leading-relaxed text-zinc-200">{t}</p>
            ))}
          </div>
        </section>

        {/* 2. Explicación técnica (intermedio+) */}
        {lesson.technical && showTechnical && (
          <section className="rounded-xl border border-violet-500/25 bg-violet-500/[0.05] p-4 animate-fade-in">
            <H violet>Explicación técnica</H>
            <div className="space-y-2.5">
              {lesson.technical.map((t, i) => (
                <p key={i} className="text-sm leading-relaxed text-zinc-300">{t}</p>
              ))}
            </div>
          </section>
        )}

        {/* Comandos clave */}
        {lesson.keyCommands && lesson.keyCommands.length > 0 && (
          <section>
            <H>Comandos clave</H>
            <div className="space-y-2">
              {lesson.keyCommands.map((k, i) => (
                <div key={i} className="rounded-xl border border-zinc-800 bg-black/25 p-3">
                  <code className="font-mono text-sm font-bold text-emerald-300">{k.name}</code>
                  <span className="ml-2 font-mono text-xs text-zinc-500">{k.syntax}</span>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-300">{k.what}</p>
                  {k.exit && <p className="mt-1 font-mono text-[11px] text-zinc-500">exit: {k.exit}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 3. Ejemplo */}
        {lesson.examples && lesson.examples.length > 0 && (
          <section>
            <H>Ejemplos</H>
            <div className="space-y-4">
              {lesson.examples.map((ex, i) => (
                <Blocks key={i} blocks={[cmd({ caption: ex.caption }, ...ex.lines)] as Block[]} />
              ))}
            </div>
          </section>
        )}

        {/* 4. Descomposición */}
        {lesson.breakdowns && lesson.breakdowns.length > 0 && (
          <section>
            <H>Descomposición del código</H>
            <div className="space-y-4">
              {lesson.breakdowns.map((b, i) => (
                <CommandBreakdown key={i} tokens={b.tokens} />
              ))}
            </div>
          </section>
        )}

        {/* 5. Terminal simulada */}
        {lesson.sim && (
          <section>
            <H>Practica aquí</H>
            <VirtualTerminal isolated height="20rem" seedFiles={lesson.sim.files} tasks={lesson.sim.tasks} intro={lesson.sim.intro} />
            <p className="mt-2 text-right">
              <a href="#/vm" className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-200 transition-colors hover:bg-emerald-500/20">
                🖥️ Practicar en Linux real
              </a>
            </p>
          </section>
        )}

        {/* 6. Pregunta de comprensión */}
        {lesson.exercises.filter((e) => e.kind === 'choice').length > 0 && (
          <section>
            <H>Pregunta de comprensión</H>
            <div className="space-y-4">
              {lesson.exercises.filter((e) => e.kind === 'choice').map((e) => (
                <Exercise key={e.id} ex={e} />
              ))}
            </div>
          </section>
        )}

        {/* 7+8. Ejercicio práctico + solución */}
        {lesson.exercises.filter((e) => e.kind !== 'choice').length > 0 && (
          <section>
            <H>Ejercicios prácticos</H>
            <div className="space-y-4">
              {lesson.exercises.filter((e) => e.kind !== 'choice').map((e) => (
                <Exercise key={e.id} ex={e} />
              ))}
            </div>
          </section>
        )}

        {/* 9. Mini reto */}
        {lesson.challenge && (
          <section className="overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-transparent">
            <header className="flex items-center gap-2 px-5 pt-4">
              <span className="rounded-md border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-amber-300">Mini reto</span>
            </header>
            <ChallengeBody challenge={lesson.challenge} />
          </section>
        )}

        {/* 10. Resumen */}
        <section className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.05] p-4">
          <H green>Resumen</H>
          <ul className="space-y-1.5 text-sm leading-relaxed text-zinc-300">
            {lesson.summary.map((s, i) => (
              <li key={i} className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />{s}</li>
            ))}
          </ul>
          {!done && (
            <button
              onClick={() => markDone(lesson.id === '' ? '' : `bash:${lesson.id}`, true)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-medium text-emerald-200 hover:bg-emerald-500/20"
            >
              <CheckCircleSmall /> He terminado este módulo
            </button>
          )}
        </section>
      </article>

      {/* Navegación entre lecciones */}
      <nav className="mt-8 grid gap-3 sm:grid-cols-2">
        {prev ? (
          <button onClick={() => navigate(`/bash/${prev.id}`)} className="group rounded-xl border border-zinc-800 bg-ink-900/70 p-4 text-left transition-colors hover:border-zinc-600">
            <span className="flex items-center gap-1.5 text-xs text-zinc-500"><ArrowLeft className="h-3.5 w-3.5" /> Anterior</span>
            <span className="mt-1 block truncate text-sm font-semibold text-zinc-200 group-hover:text-sky-300">{prev.num}. {prev.title}</span>
          </button>
        ) : (
          <button onClick={() => navigate('/bash')} className="group rounded-xl border border-zinc-800 bg-ink-900/70 p-4 text-left transition-colors hover:border-zinc-600">
            <span className="flex items-center gap-1.5 text-xs text-zinc-500"><ArrowLeft className="h-3.5 w-3.5" /> Índice</span>
            <span className="mt-1 block truncate text-sm font-semibold text-zinc-200 group-hover:text-sky-300">Todos los módulos</span>
          </button>
        )}
        {next ? (
          <button onClick={() => navigate(`/bash/${next.id}`)} className="group rounded-xl border border-zinc-800 bg-ink-900/70 p-4 text-right transition-colors hover:border-zinc-600">
            <span className="flex items-center justify-end gap-1.5 text-xs text-zinc-500">Siguiente <ArrowRight className="h-3.5 w-3.5" /></span>
            <span className="mt-1 block truncate text-sm font-semibold text-zinc-200 group-hover:text-sky-300">{next.num}. {next.title}</span>
          </button>
        ) : (
          <button onClick={() => navigate('/bash')} className="group rounded-xl border border-emerald-600/30 bg-emerald-500/5 p-4 text-right transition-colors">
            <span className="flex items-center justify-end gap-1.5 text-xs text-emerald-400">Fin del curso <ArrowRight className="h-3.5 w-3.5" /></span>
            <span className="mt-1 block text-sm font-semibold text-emerald-200">¡Enhorabuena! Repasa proyectos o vuelve al índice.</span>
          </button>
        )}
      </nav>
    </div>
  )
}

import { CircleCheck } from 'lucide-react'
function CheckCircleSmall() {
  return <CircleCheck className="h-3.5 w-3.5" />
}

import { Lightbulb } from 'lucide-react'
function ChallengeBody({ challenge }: { challenge: import('../data/bashcourse/types').BashChallenge }) {
  const [showHints, setShowHints] = useState(false)
  const [showSol, setShowSol] = useState(false)
  return (
    <div className="px-5 pb-5 pt-2.5">
      <p className="text-sm leading-relaxed text-zinc-100">{challenge.text}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {!showHints && (
          <button onClick={() => setShowHints(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-200 hover:bg-amber-500/20">
            <Lightbulb className="h-3.5 w-3.5" /> Ver pistas ({challenge.hints.length})
          </button>
        )}
        {!showSol && (
          <button onClick={() => setShowSol(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-500">
            <EyeIcon /> Ver solución
          </button>
        )}
      </div>
      {showHints && (
        <ul className="mt-3 space-y-1 animate-fade-in">
          {challenge.hints.map((h, i) => (
            <li key={i} className="flex gap-2 text-sm text-zinc-300"><Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />{h}</li>
          ))}
        </ul>
      )}
      {showSol && (
        <div className="mt-3 animate-fade-in">
          <Blocks blocks={[cmd({ caption: 'solución del reto' }, ...challenge.solutionLines)] as Block[]} />
        </div>
      )}
    </div>
  )
}

function EyeIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
}

function LevelDot({ level, small }: { level: string; small?: boolean }) {
  void small
  return <span className={cn('inline-block rounded-full', LEVEL_DOT[level] ?? 'bg-zinc-500', 'h-3 w-3')} aria-hidden />
}

function LevelBadge({ level }: { level: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-zinc-700/60 bg-zinc-800/40 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-zinc-400">
      <span className={cn('inline-block h-2 w-2 rounded-full', LEVEL_DOT[level])} />
      {{ beginner: 'P', intermediate: 'I', expert: 'A' }[level]}
    </span>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-ink-900/70 p-4">
      <div className="font-mono text-xl font-bold text-zinc-50">{value}</div>
      <div className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-zinc-600">{label}</div>
    </div>
  )
}

function H({ children, violet, green, icon }: { children: React.ReactNode; violet?: boolean; green?: boolean; icon?: React.ReactNode }) {
  return (
    <h3 className={cn('mb-2 flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-widest', violet ? 'text-violet-300' : green ? 'text-emerald-300' : 'text-sky-300')}>
      {icon}{children}
    </h3>
  )
}
