/* 🖥️ Servicios y servidores: índice de cursos, curso con módulos, módulo individual y laboratorio.
   Reutiliza Blocks (copy buttons), Quiz, ProgressBar, VirtualTerminal y el sistema de progreso global. */

import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpenCheck, Check, FlaskConical, GraduationCap, ShieldCheck, Target } from 'lucide-react'
import { SERVER_COURSES, COURSE_MAP, courseProgress, getServerCourse, getServerModule, nextPendingModule, realModules, serverLabDoneId, serverModuleDoneId } from '../data/servers'
import type { RelatedLink, ServerCourse, ServerModule } from '../data/servers/types'
import { ShellSession } from '../cli/engine'
import Blocks from '../components/Blocks'
import Breadcrumbs, { PageHeader } from '../components/Breadcrumbs'
import ProgressBar from '../components/ProgressBar'
import QuizView from '../components/Quiz'
import VirtualTerminal from '../components/VirtualTerminal'
import { useApp } from '../context/AppContext'
import { navigate } from '../lib/router'
import { cn } from '../lib/utils'

const LEVEL_DOT: Record<string, string> = {
  beginner: 'bg-emerald-400',
  intermediate: 'bg-amber-400',
  expert: 'bg-rose-400',
}
const LEVEL_LABEL: Record<string, string> = {
  beginner: 'Básico',
  intermediate: 'Intermedio',
  expert: 'Avanzado',
}

export default function ServersPage({ courseId, moduleId }: { courseId?: string; moduleId?: string }) {
  const course = courseId ? getServerCourse(courseId) : undefined
  if (!course) return <ServersIndex />
  const mod = moduleId ? getServerModule(course.id, moduleId) : undefined
  if (moduleId === 'lab') return <LabView course={course} />
  if (mod) return <ModuleView course={course} module={mod} />
  return <CourseView course={course} />
}

/* ============================== ÍNDICE GENERAL ============================== */

function ServersIndex() {
  const { isDone } = useApp()
  useEffect(() => { document.title = '🖥️ Servicios y servidores — ArchForge' }, [])

  const totals = useMemo(() => {
    let done = 0
    let total = 0
    let modulesCount = 0
    for (const c of SERVER_COURSES) {
      const p = courseProgress(c, isDone)
      done += p.done
      total += p.total
      modulesCount += realModules(c).length
    }
    return { done, total, modulesCount, pct: total ? Math.round((done / total) * 100) : 0 }
  }, [isDone])

  return (
    <div className="animate-fade-in">
      <Breadcrumbs items={[{ label: 'Servicios y servidores' }]} />
      <PageHeader
        title="Servicios y servidores Linux"
        subtitle="Cursos interactivos completos para instalar, configurar, asegurar y diagnosticar servicios reales. Cada curso sigue la ruta concepto → instalación → configuración → arranque → pruebas → seguridad → troubleshooting → laboratorio práctico en la terminal virtual."
        icon={<span className="text-2xl" aria-hidden>🖥️</span>}
        actions={
          <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-ink-900/70 px-4 py-2">
            <ProgressBar value={totals.done} max={totals.total} className="w-28" />
            <span className="font-mono text-xs tabular-nums text-zinc-400">{totals.pct}%</span>
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="cursos" value={String(SERVER_COURSES.length)} />
        <Stat label="módulos" value={String(totals.modulesCount)} />
        <Stat label="laboratorios" value={String(SERVER_COURSES.length)} />
        <Stat label="completados" value={`${totals.done}/${totals.total}`} />
      </div>

      <p className="mb-4 max-w-3xl text-sm leading-relaxed text-zinc-400">
        Todo se practica en la <button onClick={() => navigate('/terminal')} className="text-sky-400 underline decoration-dotted hover:text-sky-300">terminal virtual</button> de ArchForge:
        systemctl, journalctl, dig y ss funcionan sobre servicios simulados reales — sin tocar tu ordenador. Arch y Ubuntu muestran sus variantes cuando difieren.
      </p>

      <div className="grid gap-3 md:grid-cols-2">
        {SERVER_COURSES.map((c) => (
          <CourseCard key={c.id} course={c} />
        ))}
      </div>
    </div>
  )
}

function CourseCard({ course }: { course: ServerCourse }) {
  const { isDone } = useApp()
  const p = courseProgress(course, isDone)
  const started = p.done > 0
  const completed = p.done === p.total
  const pending = nextPendingModule(course, isDone)

  const status = completed
    ? { label: 'Completado', cls: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' }
    : started
      ? { label: 'En progreso', cls: 'border-sky-500/40 bg-sky-500/10 text-sky-300' }
      : { label: 'No iniciado', cls: 'border-zinc-700 text-zinc-400' }

  return (
    <article
      className={cn(
        'group flex flex-col rounded-2xl border bg-ink-900/70 p-5 transition-colors',
        completed ? 'border-emerald-700/40' : started ? 'border-sky-500/30' : 'border-zinc-800 hover:border-zinc-600',
      )}
    >
      <header className="flex items-start gap-3">
        <span className="text-3xl leading-none" aria-hidden>{course.icon}</span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-zinc-50">{course.title}</h2>
          <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-zinc-400">{course.tagline}</p>
        </div>
        <span className={cn('shrink-0 rounded-md border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider', status.cls)}>{status.label}</span>
      </header>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
        <span className="inline-flex items-center gap-1.5"><span className={cn('inline-block h-2 w-2 rounded-full', LEVEL_DOT[course.level])} />{LEVEL_LABEL[course.level]}</span>
        <span>·</span>
        <span>{realModules(course).length} módulos + lab</span>
        <span>·</span>
        <span>~{Math.round(course.minutes / 60)} h</span>
        <span>·</span>
        <span className="normal-case">{course.recommended.map((d) => (d === 'arch' ? '🐧 Arch' : '🟠 Ubuntu')).join(' · ')}</span>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <ProgressBar value={p.done} max={p.total} className="flex-1" />
        <span className="font-mono text-[11px] tabular-nums text-zinc-500">{p.done}/{p.total}</span>
      </div>

      <footer className="mt-4 flex items-center gap-2">
        <button
          onClick={() => navigate(`/servers/${course.id}${pending ? `/${pending.id}` : ''}`)}
          className={cn(
            'inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors',
            completed
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20'
              : 'border-sky-500/40 bg-sky-500/10 text-sky-200 hover:bg-sky-500/20',
          )}
        >
          {completed ? (<><BookOpenCheck className="h-3.5 w-3.5" /> Repasar curso</>) : started ? (<><ArrowRight className="h-3.5 w-3.5" /> Continuar curso</>) : (<><GraduationCap className="h-3.5 w-3.5" /> Empezar curso</>)}
        </button>
        {!completed && (
          <button
            onClick={() => navigate(`/servers/${course.id}/lab`)}
            title="Ir al laboratorio"
            className="rounded-lg border border-teal-500/40 bg-teal-500/10 px-2.5 py-2 text-teal-300 transition-colors hover:bg-teal-500/20"
          >
            <FlaskConical className="h-3.5 w-3.5" />
          </button>
        )}
      </footer>
    </article>
  )
}

/* ============================== VISTA DE CURSO ============================== */

function CourseView({ course }: { course: ServerCourse }) {
  const { isDone } = useApp()
  useEffect(() => { document.title = `${course.icon} ${course.title} — ArchForge` }, [course.id])

  const p = courseProgress(course, isDone)
  const pending = nextPendingModule(course, isDone)
  const mods = realModules(course)
  const allModulesDone = mods.every((m) => isDone(serverModuleDoneId(course.id, m.id)))
  const showContinue = !allModulesDone || !isDone(serverLabDoneId(course.id))

  return (
    <div className="animate-fade-in">
      <Breadcrumbs items={[{ label: 'Servicios y servidores', to: '/servers' }, { label: course.title }]} />
      <PageHeader
        title={`${course.icon} ${course.title}`}
        subtitle={course.tagline}
        icon={
          <span className={cn('inline-block rounded-full', LEVEL_DOT[course.level], 'h-3.5 w-3.5')} aria-hidden />
        }
        actions={
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-zinc-400">
              <span className={cn('inline-block h-2 w-2 rounded-full', LEVEL_DOT[course.level])} />{LEVEL_LABEL[course.level]} · ~{Math.round(course.minutes / 60)} h
            </span>
            {showContinue && (
              <button
                onClick={() => navigate(allModulesDone ? `/servers/${course.id}/lab` : `/servers/${course.id}/${pending!.id}`)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-sky-200 transition-colors hover:bg-sky-500/20"
              >
                <ArrowRight className="h-3.5 w-3.5" /> {p.done > 0 ? 'Continuar curso' : 'Empezar curso'}
              </button>
            )}
          </div>
        }
      />

      {/* Progreso */}
      <div className="mb-6 flex items-center gap-4 rounded-xl border border-zinc-800 bg-ink-900/70 p-4">
        <ProgressBar value={p.done} max={p.total} className="flex-1" />
        <span className="font-mono text-xs tabular-nums text-zinc-400">{p.done}/{p.total} · {p.pct}%</span>
      </div>

      {/* Prerrequisitos */}
      {course.prereqs.length > 0 && (
        <section className="mb-6 rounded-xl border border-violet-500/25 bg-violet-500/[0.05] p-4">
          <H violet>Antes de continuar, recomendamos</H>
          <div className="flex flex-wrap gap-2">
            {course.prereqs.map((pr) => (
              <a key={pr.to} href={`#${pr.to}`} className="inline-flex items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-200 transition-colors hover:bg-violet-500/20">
                {pr.label}
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Módulos */}
      <ol className="space-y-2">
        {mods.map((m) => (
          <ModuleRow key={m.id} course={course} module={m} />
        ))}
      </ol>

      {/* Laboratorio */}
      <h2 className="mb-3 mt-8 flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-zinc-500">
        <FlaskConical className="h-4 w-4 text-teal-400" /> Laboratorio final
      </h2>
      <LabRow course={course} />

      {/* Cheatsheet + Troubleshooting */}
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <section className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.05] p-4">
          <H green>Comandos relacionados en Cheatsheet</H>
          <div className="flex flex-wrap gap-2">
            {course.cheatsheetIds.map((id) => (
              <a key={id} href={`#/commands?focus=${encodeURIComponent(id)}`} className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 font-mono text-[11px] text-emerald-200 hover:bg-emerald-500/20">
                📖 {id}
              </a>
            ))}
          </div>
        </section>
        <section className="rounded-xl border border-amber-500/25 bg-amber-500/[0.05] p-4">
          <H amber>¿Algo no funciona?</H>
          <p className="mb-2 text-xs leading-relaxed text-zinc-400">Problemas específicos de este servicio en el Solucionador:</p>
          <div className="flex flex-wrap gap-2">
            {course.problemIds.map((pid) => (
              <a key={pid} href={`#/troubleshooting/${pid}`} className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-200 hover:bg-amber-500/20">
                🩺 {problemShort(pid)}
              </a>
            ))}
          </div>
        </section>
      </div>

      {/* Recomendación contextual basada en contenido relacionado */}
      <RelatedBox items={course.related ?? []} />

      <p className="mt-8 text-center text-[11px] leading-relaxed text-zinc-600">
        Arch es rolling release: los detalles concretos (versiones, rutas de paquetes, opciones retiradas) pueden variar con el tiempo. Ante diferencias, manda journalctl y la wiki oficial.
      </p>
    </div>
  )
}

function ModuleRow({ course, module: m }: { course: ServerCourse; module: ServerModule }) {
  const { isDone, markDone } = useApp()
  const doneId = serverModuleDoneId(course.id, m.id)
  const done = isDone(doneId)
  return (
    <li>
      <div
        className={cn(
          'group flex items-center gap-3 rounded-xl border p-3.5 transition-colors',
          done ? 'border-emerald-700/40 bg-emerald-500/[0.04]' : 'border-zinc-800 bg-ink-900/70 hover:border-sky-500/40',
        )}
      >
        <button onClick={() => navigate(`/servers/${course.id}/${m.id}`)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <span className="w-7 shrink-0 text-center font-mono text-sm font-bold text-zinc-600">{m.num}</span>
          <span
            role="checkbox"
            aria-checked={done}
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); markDone(doneId, !done); e.currentTarget.focus() }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); markDone(doneId, !done) } }}
            title="Marcar módulo completado"
            className={cn(
              'flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md border transition-colors',
              done ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300' : 'border-zinc-700 text-transparent hover:border-sky-500/60',
            )}
          >
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
          </span>
          <span className="min-w-0 flex-1">
            <span className={cn('block truncate text-sm font-medium', done ? 'text-zinc-500' : 'text-zinc-100')}>{m.title}</span>
            <span className="flex items-center gap-2 text-[11px] text-zinc-500">
              {m.level && (
                <span className="inline-flex items-center gap-1">
                  <span className={cn('inline-block h-1.5 w-1.5 rounded-full', LEVEL_DOT[m.level])} aria-hidden />
                  {LEVEL_LABEL[m.level]}
                </span>
              )}
              <span className="truncate">{m.goals[0]}</span>
            </span>
          </span>
        </button>
        <span className="hidden shrink-0 font-mono text-[10px] text-zinc-600 sm:inline">~{m.minutes} min</span>
        <button onClick={() => navigate(`/servers/${course.id}/${m.id}`)} className="shrink-0 rounded-md border border-zinc-800 p-1.5 text-zinc-500 transition-colors hover:border-sky-500/40 hover:text-sky-300" title={`Abrir módulo ${m.num}`}>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </li>
  )
}

function LabRow({ course }: { course: ServerCourse }) {
  const { isDone, markDone } = useApp()
  const doneId = serverLabDoneId(course.id)
  const done = isDone(doneId)
  return (
    <div
      id={`lab-${course.id}`}
      className={cn('flex items-center gap-3 rounded-xl border p-3.5 transition-colors', done ? 'border-emerald-700/40 bg-emerald-500/[0.05]' : 'border-teal-500/30 bg-gradient-to-r from-teal-500/[0.07] to-transparent')}
    >
      <span className="w-7 shrink-0 text-center font-mono text-sm font-bold text-teal-400">LAB</span>
      <span
        role="checkbox"
        aria-checked={done}
        tabIndex={0}
        onClick={() => markDone(doneId, !done)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); markDone(doneId, !done) } }}
        title="Marcar laboratorio completado"
        className={cn('flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md border transition-colors', done ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300' : 'border-zinc-700 text-transparent hover:border-teal-500/60')}
      >
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
      <button onClick={() => navigate(`/servers/${course.id}/lab`)} className="min-w-0 flex-1 text-left">
        <span className={cn('block truncate text-sm font-medium', done ? 'text-zinc-500' : 'text-zinc-100')}>🧪 {course.lab.objective.slice(0, 80)}…</span>
        <span className="block truncate font-mono text-[11px] text-zinc-500">validación por estado final en la terminal virtual</span>
      </button>
      <button onClick={() => navigate(`/servers/${course.id}/lab`)} className="shrink-0 rounded-lg border border-teal-500/40 bg-teal-500/10 px-3 py-1.5 text-xs font-medium text-teal-200 transition-colors hover:bg-teal-500/20">
        Abrir laboratorio
      </button>
    </div>
  )
}

/* ============================== VISTA DE MÓDULO ============================== */

function ModuleView({ course, module: mod }: { course: ServerCourse; module: ServerModule }) {
  const { isDone, markDone } = useApp()
  const mods = realModules(course)
  const idx = mods.findIndex((m) => m.id === mod.id)
  const prev = idx > 0 ? mods[idx - 1] : undefined
  const next = idx < mods.length - 1 ? mods[idx + 1] : undefined
  const doneId = serverModuleDoneId(course.id, mod.id)
  const done = isDone(doneId)

  useEffect(() => {
    document.title = `${mod.num}. ${mod.title} — ${course.title} · ArchForge`
    window.scrollTo({ top: 0 })
  }, [mod.id, course.id])

  return (
    <div key={mod.id} className="animate-fade-in">
      <Breadcrumbs items={[{ label: 'Servicios y servidores', to: '/servers' }, { label: course.title, to: `/servers/${course.id}` }, { label: `${mod.num}. ${mod.title}` }]} />

      <PageHeader
        title={`${mod.num}. ${mod.title}`}
        icon={<span className="text-lg" aria-hidden>{course.icon}</span>}
        actions={
          <div className="flex items-center gap-2">
            <span className="hidden font-mono text-[10px] uppercase tracking-wider text-zinc-500 sm:inline">{course.title}</span>
            <button
              role="checkbox"
              aria-checked={done}
              onClick={() => markDone(doneId, !done)}
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

      <article className="space-y-6 rounded-2xl border border-zinc-800 bg-ink-900/70 p-5 sm:p-7">
        <section>
          <H icon={<Target className="h-3.5 w-3.5" />}>Objetivos de este módulo</H>
          <ul className="space-y-1 pl-1 text-sm text-zinc-300">
            {mod.goals.map((g, i) => (
              <li key={i} className="flex gap-2"><span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-sm bg-sky-400/70" />{g}</li>
            ))}
          </ul>
        </section>

        <Blocks blocks={mod.blocks} />

        {mod.quiz && (
          <section>
            <H icon={<GraduationCap className="h-3.5 w-3.5" />}>Pregunta de comprensión</H>
            <QuizView quiz={mod.quiz} />
          </section>
        )}

        <section className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.05] p-4">
          <H green>¿Terminaste este módulo?</H>
          <div className="flex flex-wrap items-center gap-3">
            {!done && (
              <button
                onClick={() => markDone(doneId, true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-medium text-emerald-200 hover:bg-emerald-500/20"
              >
                <CheckSmall /> He terminado este módulo
              </button>
            )}
            {next ? (
              <button onClick={() => navigate(`/servers/${course.id}/${next.id}`)} className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/40 bg-sky-500/10 px-3.5 py-1.5 text-xs font-medium text-sky-200 hover:bg-sky-500/20">
                Siguiente: {next.num}. {next.title} <ArrowRight className="h-3 w-3" />
              </button>
            ) : (
              <button onClick={() => navigate(`/servers/${course.id}/lab`)} className="inline-flex items-center gap-1.5 rounded-lg border border-teal-500/40 bg-teal-500/10 px-3.5 py-1.5 text-xs font-medium text-teal-200 hover:bg-teal-500/20">
                Último módulo superado → al laboratorio <FlaskConical className="h-3 w-3" />
              </button>
            )}
          </div>
        </section>
      </article>

      {/* Navegación */}
      <nav className="mt-8 grid gap-3 sm:grid-cols-2">
        {prev ? (
          <button onClick={() => navigate(`/servers/${course.id}/${prev.id}`)} className="group rounded-xl border border-zinc-800 bg-ink-900/70 p-4 text-left transition-colors hover:border-zinc-600">
            <span className="flex items-center gap-1.5 text-xs text-zinc-500"><ArrowLeft className="h-3.5 w-3.5" /> Anterior</span>
            <span className="mt-1 block truncate text-sm font-semibold text-zinc-200 group-hover:text-sky-300">{prev.num}. {prev.title}</span>
          </button>
        ) : (
          <button onClick={() => navigate(`/servers/${course.id}`)} className="group rounded-xl border border-zinc-800 bg-ink-900/70 p-4 text-left transition-colors hover:border-zinc-600">
            <span className="flex items-center gap-1.5 text-xs text-zinc-500"><ArrowLeft className="h-3.5 w-3.5" /> Índice del curso</span>
            <span className="mt-1 block truncate text-sm font-semibold text-zinc-200 group-hover:text-sky-300">Todos los módulos</span>
          </button>
        )}
        {next ? (
          <button onClick={() => navigate(`/servers/${course.id}/${next.id}`)} className="group rounded-xl border border-zinc-800 bg-ink-900/70 p-4 text-right transition-colors hover:border-zinc-600">
            <span className="flex items-center justify-end gap-1.5 text-xs text-zinc-500">Siguiente <ArrowRight className="h-3.5 w-3.5" /></span>
            <span className="mt-1 block truncate text-sm font-semibold text-zinc-200 group-hover:text-sky-300">{next.num}. {next.title}</span>
          </button>
        ) : (
          <button onClick={() => navigate(`/servers/${course.id}/lab`)} className="group rounded-xl border border-teal-600/30 bg-teal-500/5 p-4 text-right transition-colors hover:border-teal-500/50">
            <span className="flex items-center justify-end gap-1.5 text-xs text-teal-400">Fin de los módulos <ArrowRight className="h-3.5 w-3.5" /></span>
            <span className="mt-1 block text-sm font-semibold text-teal-200">🧪 Laboratorio final del curso</span>
          </button>
        )}
      </nav>
    </div>
  )
}

/* ============================== VISTA LABORATORIO ============================== */

function LabView({ course }: { course: ServerCourse }) {
  const { isDone, markDone } = useApp()
  const [result, setResult] = useState<{ pass: boolean; detail: string } | null>(null)
  const [showHints, setShowHints] = useState(false)
  const done = isDone(serverLabDoneId(course.id))
  const sessionRef = useRef<ShellSession | null>(null)
  if (!sessionRef.current) {
    sessionRef.current = new ShellSession()
    sessionRef.current.setDistro('arch')
  }
  const session = sessionRef.current!

  useEffect(() => {
    document.title = `🧪 Laboratorio ${course.title} — ArchForge`
    window.scrollTo({ top: 0 })
  }, [course.id])
  useEffect(() => { setResult(null); setShowHints(false) }, [course.id])

  return (
    <div className="animate-fade-in">
      <Breadcrumbs items={[{ label: 'Servicios y servidores', to: '/servers' }, { label: course.title, to: `/servers/${course.id}` }, { label: 'Laboratorio' }]} />
      <PageHeader
        title={`🧪 Laboratorio — ${course.title}`}
        subtitle={course.lab.objective}
        icon={<FlaskConical className="h-5 w-5 text-teal-400" />}
      />

      <div className="mb-4 flex items-center gap-3 rounded-xl border border-teal-500/30 bg-teal-500/[0.06] px-4 py-3">
        <Target className="h-4 w-4 shrink-0 text-teal-300" />
        <p className="font-mono text-xs leading-relaxed text-teal-100/90">{course.lab.intro ?? 'Valida el ESTADO FINAL del entorno virtual, no los comandos exactos.'}</p>
      </div>

      {course.virtual ? (
        /* Laboratorios EXTERNOS: se ejecutan en la VM real del usuario */
        <>
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-sky-500/30 bg-sky-500/[0.06] px-4 py-3">
            <span className="text-lg leading-none" aria-hidden>🖥️</span>
            <p className="text-sm leading-relaxed text-zinc-300">
              Este curso se practica <strong className="text-sky-200">en tu propia máquina virtual</strong>.
              ArchForge no ejecuta ni valida nada aquí: sigue los pasos de cada LAB (módulos LAB 01–12),
              verifica con las comprobaciones incluidas y marca el progreso manualmente.
              Tu snapshot es tu red de seguridad.
            </p>
          </div>
          <section className="rounded-xl border border-zinc-800 bg-ink-900/60 p-4">
            <h3 className="mb-2 font-mono text-xs font-bold uppercase tracking-widest text-zinc-400">Cómo trabajar estos laboratorios</h3>
            <ul className="space-y-1.5 text-sm text-zinc-300">
              {course.lab.tasks.map((t, i) => (
                <li key={i} className="flex gap-2"><span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-sm bg-teal-400/70" aria-hidden />{t}</li>
              ))}
            </ul>
          </section>
        </>
      ) : (
        <VirtualTerminal
          session={session}
          seedFiles={course.lab.seedFiles}
          intro={`Laboratorio ${course.icon} ${course.title} — entorno aislado de práctica.`}
          tasks={course.lab.tasks}
          height="26rem"
        />
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {!course.virtual && (
          <button onClick={() => setResult(course.lab.validate(session))} className="rounded-lg border border-teal-500/50 bg-teal-500/15 px-4 py-2 text-sm font-medium text-teal-200 transition-colors hover:bg-teal-500/25">Comprobar mi servidor</button>
        )}
        {course.virtual && (
          <button
            onClick={() => markDone(serverLabDoneId(course.id), !done)}
            aria-pressed={done}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
              done ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300' : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20',
            )}
          >
            <ShieldCheck className="h-3.5 w-3.5" /> {done ? 'Proyecto completado ✓' : 'Marcar proyecto como completado'}
          </button>
        )}
        {!showHints && (
          <button onClick={() => setShowHints(true)} className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:border-zinc-500">Pistas ({course.lab.hints.length})</button>
        )}
        {result?.pass && !done && (
          <button onClick={() => markDone(serverLabDoneId(course.id), true)} className="rounded-lg border border-emerald-500/50 bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-200 hover:bg-emerald-500/25">Registrar en mi progreso</button>
        )}
        {done && <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-emerald-400"><ShieldCheck className="h-3.5 w-3.5" /> completado</span>}
      </div>

      {showHints && (
        <ul className="mt-3 space-y-1 animate-fade-in rounded-xl border border-zinc-800 bg-ink-900/70 p-4">
          {course.lab.hints.map((h2, i) => (
            <li key={i} className="font-mono text-xs text-zinc-400">$ {h2}</li>
          ))}
        </ul>
      )}

      {result && (
        <div className={cn('mt-4 rounded-xl border p-4 animate-fade-in', result.pass ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-amber-500/30 bg-amber-500/[0.06]')}>
          {result.pass ? (
            <p className="flex items-center gap-2 text-sm font-medium text-emerald-200"><CheckSmall /> ✓ Laboratorio superado — {result.detail}</p>
          ) : (
            <p className="text-sm text-amber-200">Aún no: {result.detail}</p>
          )}
        </div>
      )}

      {/* Recomendación contextual justo tras completar el lab */}
      {result?.pass && <RelatedBox items={course.related ?? []} />}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <a href={`#/troubleshooting`} className="rounded-xl border border-amber-500/25 bg-amber-500/[0.05] p-4 transition-colors hover:border-amber-500/40">
          <p className="text-sm font-medium text-amber-200">🩺 ¿Algo no funciona como esperabas?</p>
          <p className="mt-1 text-xs text-zinc-400">El solucionador tiene fichas paso a paso para los fallos típicos de {course.title.toLowerCase()}.</p>
        </a>
        <a href={`#/commands?focus=${encodeURIComponent(course.cheatsheetIds[0] ?? 'systemctl')}`} className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.05] p-4 transition-colors hover:border-emerald-500/40">
          <p className="text-sm font-medium text-emerald-200">📖 Consulta la cheatsheet</p>
          <p className="mt-1 text-xs text-zinc-400">Los comandos clave del curso ({course.cheatsheetIds.join(', ')}) con ejemplos listos para copiar.</p>
        </a>
      </div>
    </div>
  )
}

function CheckSmall() {
  return <svg viewBox="0 0 12 12" className="h-3.5 w-3.5 shrink-0" aria-hidden><path d="M2 6.5l2.5 2.5L10 3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-ink-900/70 p-4">
      <div className="font-mono text-xl font-bold text-zinc-50">{value}</div>
      <div className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-zinc-600">{label}</div>
    </div>
  )
}

type HProps = { children: React.ReactNode; green?: boolean; amber?: boolean; violet?: boolean; icon?: React.ReactNode }
function H({ children, green, amber, violet, icon }: HProps) {
  return (
    <h3 className={cn('mb-2 flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-widest', green ? 'text-emerald-300' : amber ? 'text-amber-300' : violet ? 'text-violet-300' : 'text-sky-300')}>
      {icon}{children}
    </h3>
  )
}

/** «💡 También te puede interesar»: chips con enlaces a cursos y secciones relacionadas */
function RelatedBox({ items }: { items: RelatedLink[] }) {
  if (!items.length) return null
  return (
    <section aria-label="También te puede interesar" className="mt-4 rounded-xl border border-zinc-800 bg-ink-900/60 p-4">
      <h3 className="mb-2.5 font-mono text-xs font-bold uppercase tracking-widest text-zinc-400">💡 También te puede interesar</h3>
      <div className="flex flex-wrap gap-2">
        {items.map((r) => {
          const href = r.kind === 'course' ? `#/servers/${r.to}` : `#/section/${r.to}`
          const courseMeta = r.kind === 'course' ? COURSE_MAP.get(r.to) : undefined
          return (
            <a
              key={`${r.kind}:${r.to}`}
              href={href}
              title={r.kind === 'course' ? `Curso: ${courseMeta?.title ?? r.label}` : 'Sección de la guía'}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/40 px-3 py-1.5 text-[13px] font-medium text-zinc-300 transition-colors hover:border-sky-500/50 hover:text-sky-300"
            >
              {r.label}
              <ArrowRight className="h-3 w-3 opacity-60" aria-hidden />
            </a>
          )
        })}
      </div>
    </section>
  )
}

function problemShort(id: string): string {  const map: Record<string, string> = {
    'srv-dns-no-responde': 'DNS no responde',
    'srv-dns-zona-no-carga': 'Zona no carga',
    'srv-dns-registro-no-resuelve': 'Registro no resuelve',
    'srv-dns-local-si-remoto-no': 'Local sí, remoto no',
    'srv-dhcp-cliente-sin-ip': 'Cliente sin IP',
    'srv-dhcp-no-inicia': 'DHCP no inicia',
    'srv-dhcp-rango-agotado': 'Rango agotado',
    'srv-ftp-login-falla': 'Login FTP falla',
    'srv-ftp-pasivo-bloqueado': 'Pasivo bloqueado',
    'srv-ssh-refused': 'Connection refused',
    'srv-ssh-permission-denied': 'Permission denied',
    'srv-ssh-clave-rechazada': 'Clave rechazada',
    'srv-nginx-no-inicia': 'Nginx no inicia',
    'srv-puerto-80-ocupado': 'Puerto 80 ocupado',
    'srv-nginx-config-invalida': 'Config inválida',
    'srv-nginx-permisos-403': 'Permisos 403',
    'srv-apache-no-inicia': 'Apache no inicia',
    'srv-samba-acceso-denegado': 'Acceso denegado',
    'srv-samba-no-visible': 'No aparece en Red',
    'srv-nfs-mount-failed': 'Mount falla',
    'srv-nfs-permisos': 'Permisos NFS',
  }
  return map[id] ?? id
}

