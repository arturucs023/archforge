import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  Bug,
  Flame,
  GraduationCap,
  Hammer,
  SquareTerminal,
  Wrench,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { navigate } from '../lib/router'
import { allAreas } from '../lib/progress'
import ProgressBar from '../components/ProgressBar'
import { cn } from '../lib/utils'

const OPTIONS = [
  {
    to: '/arch',
    icon: Flame,
    emoji: '🏗️',
    title: 'Aprender Arch Linux',
    desc: 'Instala Arch Linux desde cero y construye tu propio sistema.',
    cta: 'Empezar →',
    accent: 'sky' as const,
  },
  {
    to: '/commands',
    icon: SquareTerminal,
    emoji: '📚',
    title: 'Comandos Linux',
    desc: 'Aprende y consulta comandos de Linux con una cheatsheet interactiva para Arch, Debian y Ubuntu.',
    cta: 'Explorar comandos →',
    accent: 'emerald' as const,
  },
  {
    to: '/bash',
    icon: SquareTerminal,
    emoji: '🐚',
    title: 'Curso de Bash',
    desc: 'Aprende Bash desde cero y automatiza Linux mediante scripts.',
    cta: 'Empezar curso →',
    accent: 'teal' as const,
  },
  {
    to: '/learn',
    icon: GraduationCap,
    emoji: '🧠',
    title: 'Aprender Linux',
    desc: 'Aprende los fundamentos de Linux y entiende qué ocurre realmente detrás de cada comando.',
    cta: 'Empezar aprendizaje →',
    accent: 'violet' as const,
  },
  {
    to: '/terminal',
    icon: SquareTerminal,
    emoji: '🧪',
    title: 'Laboratorios CLI',
    desc: 'Practica en una terminal Linux simulada con laboratorios validados paso a paso.',
    cta: 'Abrir terminal →',
    accent: 'cyan' as const,
  },
  {
    to: '/troubleshooting',
    icon: Wrench,
    emoji: '🛠️',
    title: 'Solucionar un problema',
    desc: 'Diagnostica problemas habituales de Linux paso a paso.',
    cta: 'Buscar problema →',
    accent: 'amber' as const,
  },
  {
    to: '/builder',
    icon: Hammer,
    emoji: '⚙️',
    title: 'Construir mi sistema',
    desc: 'Elige hardware, filesystem, escritorio, shell y objetivo y crea una configuración personalizada.',
    cta: 'Crear configuración →',
    accent: 'rose' as const,
  },
]

const ACCENT = {
  sky: { border: 'hover:border-sky-500/50', icon: 'text-sky-400 bg-sky-500/10 border-sky-500/30', btn: 'border-sky-500/50 text-sky-300 hover:bg-sky-500/15', bar: 'bg-sky-500' },
  emerald: { border: 'hover:border-emerald-500/50', icon: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', btn: 'border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/15', bar: 'bg-emerald-500' },
  teal: { border: 'hover:border-teal-500/50', icon: 'text-teal-400 bg-teal-500/10 border-teal-500/30', btn: 'border-teal-500/50 text-teal-300 hover:bg-teal-500/15', bar: 'bg-teal-500' },
  cyan: { border: 'hover:border-cyan-500/50', icon: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30', btn: 'border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/15', bar: 'bg-cyan-500' },
  violet: { border: 'hover:border-violet-500/50', icon: 'text-violet-400 bg-violet-500/10 border-violet-500/30', btn: 'border-violet-500/50 text-violet-300 hover:bg-violet-500/15', bar: 'bg-violet-500' },
  amber: { border: 'hover:border-amber-500/50', icon: 'text-amber-400 bg-amber-500/10 border-amber-500/30', btn: 'border-amber-500/50 text-amber-300 hover:bg-amber-500/15', bar: 'bg-amber-500' },
  rose: { border: 'hover:border-rose-500/50', icon: 'text-rose-400 bg-rose-500/10 border-rose-500/30', btn: 'border-rose-500/50 text-rose-300 hover:bg-rose-500/15', bar: 'bg-rose-500' },
}

export default function HomePage() {
  const { welcomeDone, setWelcomeDone, isDone, lastPath, lastLabel, lastSection, lastVisitAt } = useApp()

  const areas = useMemo(() => allAreas(isDone), [isDone])
  const globalDone = areas.reduce((a, s) => a + s.done, 0)
  const globalTotal = areas.reduce((a, s) => a + s.total, 0)
  const hasActivity = globalDone > 0 || !!lastPath

  useEffect(() => {
    document.title = 'ArchForge — Learn Linux. Build Arch. Master the terminal.'
  }, [])

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <header className="pb-1 text-center">
        <div className="mx-auto flex w-fit items-center gap-3">
          <svg viewBox="0 0 32 32" className="h-10 w-10" aria-hidden>
            <rect width="32" height="32" rx="7" fill="#0d0d15" stroke="#2e2e42" />
            <path d="M16 5L4 26h24L16 5z" fill="none" stroke="#38bdf8" strokeWidth="2.4" strokeLinejoin="round" />
            <path d="M13 19h6M14.5 21.5h3" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <h1 className="font-mono text-3xl font-bold tracking-tight text-zinc-50 sm:text-4xl">ArchForge</h1>
        </div>
        <TypewriterSubtitle />

        {/* Progreso global */}
        <div className="mx-auto mt-2 flex max-w-xs items-center justify-center gap-2 rounded-full border border-zinc-800 bg-ink-900/70 px-3 py-1.5">
          <Flame className="h-3.5 w-3.5 shrink-0 text-orange-400" />
          <ProgressBar value={globalDone} max={globalTotal} className="flex-1" />
          <span className="font-mono text-[11px] tabular-nums text-zinc-400">{globalTotal ? Math.round((globalDone / globalTotal) * 100) : 0}%</span>
        </div>
      </header>

      {/* Bienvenida de retorno */}
      {welcomeDone && hasActivity && (
        <section className="mx-auto mb-3 max-w-3xl animate-fade-in rounded-2xl border border-emerald-600/30 bg-emerald-500/[0.06] p-4 sm:p-5">
          <h2 className="text-base font-semibold text-emerald-200">Bienvenido de nuevo.</h2>
          <p className="mt-0.5 text-sm text-zinc-400">Continúa donde lo dejaste.</p>
          <button
            onClick={() => navigate(lastPath || (lastSection ? `/section/${lastSection}` : '/arch'))}
            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-200 transition-colors hover:bg-emerald-500/20"
          >
            {lastLabel || 'Continuar'} <ArrowRight className="h-4 w-4" />
          </button>
          {typeof lastVisitAt === 'number' && (
            <p className="mt-2 font-mono text-[11px] text-zinc-500">
              Última visita: <RelativeTime timestamp={lastVisitAt} />
            </p>
          )}
        </section>
      )}

      {/* Opciones principales */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {OPTIONS.map((o) => {
          const A = ACCENT[o.accent]
          const Icon = o.icon
          return (
            <article
              key={o.to}
              onClick={() => navigate(o.to)}
              className={cn(
                'group flex cursor-pointer flex-col rounded-2xl border border-zinc-800 bg-ink-900/70 p-4 transition-all hover:-translate-y-0.5',
                A.border,
              )}
              role="link"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate(o.to)}
            >
              <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl border text-lg', A.icon)}>
                <span aria-hidden>{o.emoji}</span>
              </div>
              <h3 className="mt-3 font-mono text-base font-bold tracking-tight text-zinc-50">{o.title}</h3>
              <p className="mt-1 flex-1 text-sm leading-relaxed text-zinc-400">{o.desc}</p>
              {o.to === '/bash' && (() => {
                const bash = areas.find((a) => a.id === 'bash')
                return bash && bash.done > 0 ? (
                  <span className="mt-2 block">
                    <ProgressBar value={bash.done} max={bash.total} color={ACCENT.teal.bar} />
                    <span className="mt-1 block font-mono text-[10px] tabular-nums text-zinc-600">{bash.done}/{bash.total} · en curso</span>
                  </span>
                ) : null
              })()}
              <button
                onClick={(e) => { e.stopPropagation(); navigate(o.to) }}
                tabIndex={-1}
                className={cn('mt-3 inline-flex w-fit items-center gap-1.5 rounded-lg border px-3.5 py-1.5 text-xs font-medium transition-colors', A.btn)}
              >
                {o.cta}
              </button>
            </article>
          )
        })}

        {/* Tarjeta extra: herramientas */}
        <article
          onClick={() => navigate('/settings')}
          className="group flex cursor-pointer flex-col rounded-2xl border border-dashed border-zinc-700/70 bg-transparent p-4 transition-colors hover:border-zinc-500"
          role="link"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && navigate('/settings')}
        >
          <Bug className="h-5 w-5 text-zinc-600 group-hover:text-zinc-400" />
          <h3 className="mt-auto pt-3 font-mono text-sm font-semibold text-zinc-400">Progreso, ajustes y exportar datos</h3>
          <p className="mt-1 text-xs leading-relaxed text-zinc-600">Tu avance se guarda en este navegador. Gestiónalo en Ajustes.</p>
        </article>
      </div>

      {/* Barras por área */}
      <section className="mt-8">
        <h2 className="mb-3 flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-zinc-500">
          Tu progreso por área
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {areas.map((a) => (
            <button
              key={a.id}
              onClick={() => navigate(a.to)}
              className="rounded-xl border border-zinc-800 bg-ink-900/60 p-4 text-left transition-colors hover:border-zinc-600"
            >
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-medium text-zinc-200">{a.label}</span>
                <span className="font-mono text-xs tabular-nums text-zinc-500">
                  {a.total ? Math.round((a.done / a.total) * 100) : 0}%
                </span>
              </div>
              <ProgressBar value={a.done} max={a.total} color={AREA_BAR[a.id]} />
              <div className="mt-1.5 font-mono text-[10px] tabular-nums text-zinc-600">{a.done}/{a.total}</div>
            </button>
          ))}
        </div>
      </section>

      {!welcomeDone && <WelcomeModal onDone={() => setWelcomeDone(true)} />}
    </div>
  )
}

import { AREA_META } from '../lib/progress'

/* ===================== Subtítulo de portada con escritura =====================
   Se escribe una sola vez por carga de la app (flag a nivel de módulo: volver
   a la portada más tarde muestra el texto completo). El texto íntegro está
   disponible para lectores via aria-label y la copia invisible reserva el
   espacio final → cero layout shift. Respeta prefers-reduced-motion. */

const HERO_SUB = 'Learn Linux. Build Arch. Master the terminal.'
let heroPlayed = false

function TypewriterSubtitle() {
  const reduceMotion = useMemo(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
    [],
  )
  // decisiones SOLO en inicializadores de estado: estables ante re-montajes (StrictMode)
  const animate = !heroPlayed && !reduceMotion
  const [count, setCount] = useState<number>(() => (animate ? 0 : HERO_SUB.length))
  const [cursorOn, setCursorOn] = useState<boolean>(animate)

  useEffect(() => {
    if (!cursorOn) return
    heroPlayed = true
    const MS_PER_CHAR = 40
    const start = performance.now()
    let raf = 0
    let hideTimer: number | undefined

    const step = (t: number): void => {
      const n = Math.min(HERO_SUB.length, Math.floor((t - start) / MS_PER_CHAR))
      setCount(n)
      if (n >= HERO_SUB.length) {
        // terminó: el cursor se desvanece suavemente
        hideTimer = window.setTimeout(() => setCursorOn(false), 700)
        return
      }
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)

    return () => {
      cancelAnimationFrame(raf)
      if (hideTimer !== undefined) window.clearTimeout(hideTimer)
    }
  }, [cursorOn])

  return (
    <p
      aria-label={HERO_SUB}
      className="mx-auto mt-3 grid w-fit justify-items-start font-mono text-sm uppercase tracking-[0.25em] text-sky-400/90"
    >
      {/* copia invisible: fija el ancho final → sin layout shift ni overflow */}
      <span aria-hidden className="invisible col-start-1 row-start-1 whitespace-nowrap">
        {HERO_SUB}
      </span>
      <span aria-hidden className="col-start-1 row-start-1 whitespace-nowrap">
        {HERO_SUB.slice(0, count)}
        <span className={cn('transition-opacity duration-500', cursorOn ? 'opacity-100' : 'opacity-0')}>
          ▌
        </span>
      </span>
    </p>
  )
}

/** Tiempo relativo EN VIVO: se recalcula solo cada 30 s («hace 2 horas»…). */
export function RelativeTime({ timestamp }: { timestamp: number }) {
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 30_000)
    return () => window.clearInterval(id)
  }, [])

  const label = relativeLabel(timestamp)
  return <span title={new Date(timestamp).toLocaleString()}>{label}</span>
}

function relativeLabel(ts: number): string {
  const diff = Math.max(0, Date.now() - ts)
  const min = Math.floor(diff / 60_000)
  if (min < 1) return 'hace unos segundos'
  if (min === 1) return 'hace 1 minuto'
  if (min < 60) return `hace ${min} minutos`
  const h = Math.floor(min / 60)
  if (h === 1) return 'hace 1 hora'
  if (h < 24) return `hace ${h} horas`
  const d = Math.floor(h / 24)
  if (d === 1) return 'hace 1 día'
  if (d < 30) return `hace ${d} días`
  const mes = Math.floor(d / 30)
  if (mes === 1) return 'hace 1 mes'
  if (mes < 12) return `hace ${mes} meses`
  return new Date(ts).toLocaleDateString()
}
const AREA_BAR: Record<string, string> = {
  arch: AREA_META.arch.color,
  commands: AREA_META.commands.color,
  learn: AREA_META.learn.color,
  troubleshooting: AREA_META.troubleshooting.color,
}

function WelcomeModal({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-4 pt-10 pb-10" role="dialog" aria-modal="true" aria-label="¿Qué quieres hacer?">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onDone} />
      <div className="relative w-full max-w-lg rounded-2xl border border-zinc-700 bg-ink-850 p-5 shadow-2xl shadow-black/60 animate-scale-in">
        <h2 className="font-mono text-xl font-bold text-zinc-50">¿Qué quieres hacer?</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Elige un punto de partida. Podrás cambiar cuando quieras y tu progreso se guarda automáticamente.
        </p>
        <ul className="mt-5 space-y-2">
          {OPTIONS.map((o) => {
            const Icon = o.icon
            return (
              <li key={o.to}>
                <button
                  onClick={() => { onDone(); navigate(o.to) }}
                  className="group flex w-full items-center gap-3 rounded-xl border border-zinc-800 bg-ink-900/70 p-3.5 text-left transition-colors hover:border-sky-500/40"
                >
                  <Icon className="h-5 w-5 shrink-0 text-sky-400" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-zinc-100">{o.title}</span>
                    <span className="block truncate text-xs text-zinc-500">{o.desc}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-zinc-600 transition-transform group-hover:translate-x-0.5 group-hover:text-sky-400" />
                </button>
              </li>
            )
          })}
        </ul>
        <button onClick={onDone} className="mt-5 w-full rounded-lg py-2 text-center text-xs text-zinc-500 transition-colors hover:text-zinc-300">
          Explorar por mi cuenta →
        </button>
      </div>
    </div>
  )
}
