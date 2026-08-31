import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  BookOpen,
  Bug,
  CheckCircle2,
  CircleDashed,
  Clock,
  Flame,
  Gauge,
  Trophy,
  Hammer,
  LayoutGrid,
  Monitor,
  MapPin,
  PackageSearch,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import { REGISTRY, stepUnits, totalUnits, getSection } from '../data/registry'
import { useApp } from '../context/AppContext'
import { navigate } from '../lib/router'
import { formatMinutes } from '../lib/utils'
import Breadcrumbs, { PageHeader } from '../components/Breadcrumbs'
import Tooltip from '../components/Tooltip'
import { cn } from '../lib/utils'

function useStats() {
  const { isDone, builderConfig, lastSection } = useApp()
  return useMemo(() => {
    const total = totalUnits()
    let doneCount = 0
    const sectionState = new Map<string, { done: number; total: number; complete: boolean }>()
    for (const s of REGISTRY) {
      const units = stepUnits(s)
      const d = units.filter((u) => isDone(u)).length
      doneCount += d
      sectionState.set(s.id, { done: d, total: units.length, complete: d === units.length && units.length > 0 })
    }
    const pct = total ? Math.round((doneCount / total) * 100) : 0

    let minutesLeft = 0
    for (const s of REGISTRY) {
      const st = sectionState.get(s.id)!
      if (!st.complete) minutesLeft += s.minutes
    }

    const ranks: [number, string][] = [
      [0, 'Novato'],
      [8, 'Aprendiz'],
      [20, 'Operador'],
      [45, 'Administrador'],
      [80, 'Arquitecto de sistemas'],
    ]
    let rank = 'Novato'
    for (const [threshold, name] of ranks) if (doneCount >= threshold) rank = name

    return { total, doneCount, pct, minutesLeft, rank, sectionState }
  }, [isDone])
}

const MILESTONES: { label: string; sectionId?: string }[] = [
  { label: 'ISO descargada y USB listo', sectionId: 'preparation' },
  { label: 'Sistema base instalado', sectionId: 'installation' },
  { label: 'Primer arranque validado', sectionId: 'first-boot' },
  { label: 'Red funcionando', sectionId: 'network' },
  { label: 'Drivers y GPU listos', sectionId: 'gpu' },
  { label: 'Entorno gráfico operativo', sectionId: 'desktop' },
  { label: 'Personalización aplicada', sectionId: 'customization' },
  { label: 'Aplicaciones esenciales', sectionId: 'pacman' },
  { label: 'Optimización y mantenimiento', sectionId: 'optimization' },
  { label: 'Sistema terminado' },
]

export default function Dashboard() {
  const stats = useStats()
  const { isDone, builderConfig, lastSection, resetProgress } = useApp()

  useEffect(() => {
    document.title = 'Arch Linux desde cero — ArchForge'
  }, [])

  const milestoneStates = MILESTONES.map((m) => ({
    ...m,
    complete: m.sectionId ? (stats.sectionState.get(m.sectionId)?.complete ?? false) : false,
  }))
  const firstPending = milestoneStates.findIndex((m) => !m.complete)

  const continueTarget = lastSection ?? 'installation'

  return (
    <div className="animate-fade-in">
      <Breadcrumbs items={[{ label: 'Arch Linux desde cero' }]} />
      <PageHeader
        title="Arch Linux desde cero"
        subtitle="Tu camino desde la ISO recién arrancada hasta un sistema seguro, personalizado y a tu medida. Marca cada paso a medida que lo completes: tu progreso se guarda en este navegador."
        icon={<Flame className="h-6 w-6" />}
        actions={
          <div className="flex items-center gap-2">
            <StreakBadge />
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-sky-500/50 hover:text-sky-300"
              title="Volver a la pantalla principal de ArchForge"
            >
              ← Inicio
            </button>
          </div>
        }
      />

      {/* Tarjetas de estado */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard>
          <div className="flex items-center gap-4">
            <ProgressRing pct={stats.pct} />
            <div>
              <div className="font-mono text-2xl font-bold text-zinc-50">{stats.pct}%</div>
              <div className="text-xs text-zinc-500">Progreso general</div>
            </div>
          </div>
        </StatCard>
        <StatCard>
          <div className="font-mono text-2xl font-bold text-zinc-50">{stats.doneCount}<span className="text-base text-zinc-600">/{stats.total}</span></div>
          <div className="mt-1 flex items-center gap-1 text-xs text-zinc-500"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Pasos completados</div>
        </StatCard>
        <StatCard>
          <div className="font-mono text-2xl font-bold text-zinc-50">{formatMinutes(stats.minutesLeft)}</div>
          <div className="mt-1 flex items-center gap-1 text-xs text-zinc-500"><Clock className="h-3.5 w-3.5 text-sky-400" /> Tiempo estimado restante</div>
        </StatCard>
        <StatCard>
          <div className="truncate font-mono text-xl font-bold text-sky-300">{stats.rank}</div>
          <div className="mt-1 flex items-center gap-1 text-xs text-zinc-500"><Gauge className="h-3.5 w-3.5 text-violet-400" /> Tu nivel actual</div>
        </StatCard>
      </div>

      {/* Acciones rápidas */}
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <ActionCard
          title={lastSection ? `Continuar: ${getSection(continueTarget)?.title}` : 'Empezar la instalación'}
          desc={lastSection ? 'Retoma justo donde lo dejaste.' : '31 pasos explicados desde cero.'}
          onClick={() => navigate(`/section/${continueTarget}`)}
          primary
        />
        <ActionCard title="Arch Builder" desc="Genera una ruta personalizada según tu hardware y escritorio." onClick={() => navigate('/builder')} icon={<Hammer className="h-5 w-5" />} />
        <ActionCard title="🖥️ Linux real" desc="Tu VM Alpine: terminal real, efímera y aislada." onClick={() => navigate('/vm')} icon={<Monitor className="h-5 w-5" />} />
        <ActionCard title="¿Un problema?" desc="Buscador de fallos frecuentes con diagnóstico ordenado." onClick={() => navigate('/troubleshooting')} icon={<Bug className="h-5 w-5" />} />
      </div>

      {/* Config elegida */}
      <section className="mt-6 rounded-2xl border border-zinc-800 bg-ink-900/70 p-5">
        <h2 className="mb-3 flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-zinc-400">
          <LayoutGrid className="h-4 w-4 text-sky-400" /> Configuración elegida
        </h2>
        {builderConfig ? (
          <div className="flex flex-wrap items-center gap-2">
            {[
              ['GPU', builderConfig.cpu.toUpperCase()],
              ['FS', builderConfig.fs],
              ['Bootloader', builderConfig.bootloader],
              ['Escritorio', builderConfig.de],
              ['DM', builderConfig.dm],
              ['Shell', builderConfig.shell],
              ['Uso', builderConfig.use],
            ].map(([k, v]) => (
              <span key={k as string} className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/50 px-2.5 py-1 text-xs">
                <span className="text-zinc-500">{k}:</span>
                <span className="font-mono font-semibold text-zinc-200">{v}</span>
              </span>
            ))}
            <button onClick={() => navigate('/builder')} className="ml-1 text-xs font-medium text-sky-400 hover:text-sky-300">
              editar →
            </button>
          </div>
        ) : (
          <p className="text-sm text-zinc-400">
            Aún no has generado tu configuración.{' '}
            <button onClick={() => navigate('/builder')} className="font-medium text-sky-400 hover:text-sky-300">
              Abre el Arch Builder
            </button>{' '}
            para adaptar toda la guía a tu hardware.
          </p>
        )}
      </section>

      {/* Ruta visual */}
      <section className="mt-6 rounded-2xl border border-zinc-800 bg-ink-900/70 p-5 sm:p-6">
        <h2 className="mb-5 flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-zinc-400">
          <MapPin className="h-4 w-4 text-sky-400" /> La ruta completa
        </h2>
        <ol className="relative space-y-0 pl-2">
          {milestoneStates.map((m, i) => {
            const state = m.complete ? 'done' : i === firstPending ? 'current' : 'pending'
            return (
              <li key={i} className="relative flex gap-4 pb-6 last:pb-0">
                {/* línea */}
                {i < milestoneStates.length - 1 && (
                  <span aria-hidden className={cn('absolute left-[9px] top-5 h-full w-px', m.complete ? 'bg-emerald-500/40' : 'bg-zinc-800')} />
                )}
                <span
                  aria-hidden
                  className={cn(
                    'z-10 mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                    state === 'done' && 'border-emerald-500 bg-emerald-500/20',
                    state === 'current' && 'border-sky-400 bg-sky-500/20 shadow-[0_0_12px_rgba(56,189,248,.5)]',
                    state === 'pending' && 'border-zinc-700 bg-ink-900',
                  )}
                >
                  {state === 'done' ? (
                    <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 text-emerald-400"><path d="M2 6.5l2.5 2.5L10 3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  ) : state === 'current' ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                  ) : (
                    <CircleDashed className="h-3 w-3 text-zinc-700" />
                  )}
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <span
                    className={cn(
                      'text-sm font-medium',
                      state === 'done' ? 'text-emerald-300/80' : state === 'current' ? 'text-zinc-100' : 'text-zinc-500',
                    )}
                  >
                    {m.label}
                  </span>
                  {m.sectionId && (
                    <button
                      onClick={() => navigate(`/section/${m.sectionId}`)}
                      className="ml-2 inline-flex items-center gap-0.5 align-middle text-xs text-sky-500/80 hover:text-sky-300"
                    >
                      ir <ArrowRight className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      </section>

      {/* Accesos rápidos */}
      <section className="mt-6">
        <h2 className="mb-3 flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-zinc-400">
          <BookOpen className="h-4 w-4 text-sky-400" /> Accesos rápidos
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {['installation', 'pacman', 'aur', 'gaming', 'security', 'troubleshooting'].map((id) => {
            const s = getSection(id)!
            const st = stats.sectionState.get(id)
            return (
              <button
                key={id}
                onClick={() => navigate(`/section/${id}`)}
                className="group rounded-xl border border-zinc-800 bg-ink-900/70 p-4 text-left transition-colors hover:border-sky-500/40"
              >
                <div className="flex items-center justify-between">
                  <PackageSearch className="h-4 w-4 text-zinc-500 group-hover:text-sky-400" />
                  {st?.complete ? (
                    <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-400">completada</span>
                  ) : (
                    <span className="font-mono text-[10px] tabular-nums text-zinc-600">
                      {st?.done}/{st?.total}
                    </span>
                  )}
                </div>
                <div className="mt-2 text-sm font-semibold text-zinc-200">{s.title}</div>
                <div className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-zinc-500">{s.lead}</div>
              </button>
            )
          })}
        </div>
      </section>

      <section className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-800/60 bg-ink-900/40 p-4">
        <p className="text-xs leading-relaxed text-zinc-500">
          Consejo: usa <kbd className="rounded border border-zinc-700 bg-zinc-800/70 px-1.5 py-0.5 font-mono text-[10px]">Ctrl K</kbd> para buscar
          cualquier comando o problema desde cualquier página.
        </p>
        <ConfirmReset onReset={resetProgress} />
      </section>
    </div>
  )
}

/** Indicador compacto de racha de aprendizaje con tooltip accesible (hover y teclado). */
function StreakBadge() {
  const { learningStreak, longestLearningStreak } = useApp()
  const sinActividad = learningStreak <= 0
  const diasTxt = `${learningStreak} día${learningStreak === 1 ? '' : 's'}`
  const aria = sinActividad
    ? 'Racha de aprendizaje: todavía sin actividad. Completa una unidad o laboratorio para empezar.'
    : `Racha de aprendizaje: ${diasTxt}. Mejor racha: ${longestLearningStreak} días.`

  return (
    <span className="group/badge relative inline-flex rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400" tabIndex={0} role="status" aria-label={aria}>
      <span
        title={aria}
        className="inline-flex h-[34px] items-center gap-1.5 rounded-lg border border-zinc-800 bg-ink-900/70 px-3 font-mono text-xs text-zinc-300"
      >
        🔥 <span>{sinActividad ? 'Empieza tu racha' : diasTxt}</span>
        {!sinActividad && longestLearningStreak > 0 && (
          <span className="hidden items-center gap-1 border-l border-zinc-700 pl-2 text-zinc-500 sm:inline-flex">
            <Trophy className="h-3 w-3 text-amber-400" aria-hidden /> {longestLearningStreak}
          </span>
        )}
      </span>
      <span aria-hidden className="contents">
        <Tooltip>
          <span className="block font-semibold">🔥 Racha de aprendizaje</span>
          <span className="mt-0.5 block">{sinActividad ? 'Completa tu primera unidad, laboratorio o problema para empezar.' : `Llevas ${diasTxt} aprendiendo consecutivamente.`}</span>
          <span className="mt-0.5 block text-amber-300">🏆 Mejor racha: {longestLearningStreak} días</span>
        </Tooltip>
      </span>
    </span>
  )
}

function StatCard({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-zinc-800 bg-ink-900/70 p-4">{children}</div>
}

function ProgressRing({ pct }: { pct: number }) {
  const r = 22
  const c = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 56 56" className="h-14 w-14 shrink-0 -rotate-90">
      <circle cx="28" cy="28" r={r} fill="none" stroke="#27272a" strokeWidth="5" />
      <circle
        cx="28"
        cy="28"
        r={r}
        fill="none"
        style={{ stroke: pct === 100 ? '#10b981' : 'rgb(var(--af-sky-400))' }}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={`${(pct / 100) * c} ${c}`}
        className="transition-all duration-700"
      />
      <circle cx="28" cy="28" r="13" fill="none" stroke="transparent" strokeWidth="5" />
    </svg>
  )
}

function ActionCard({
  title,
  desc,
  onClick,
  primary,
  icon,
}: {
  title: string
  desc: string
  onClick: () => void
  primary?: boolean
  icon?: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'group flex items-start gap-3 rounded-2xl border p-4 text-left transition-colors',
        primary
          ? 'border-sky-500/40 bg-gradient-to-br from-sky-500/15 to-sky-500/[0.03] hover:border-sky-400/60'
          : 'border-zinc-800 bg-ink-900/70 hover:border-zinc-600',
      )}
    >
      {icon && <span className="mt-0.5 text-violet-400">{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className={cn('block truncate text-sm font-semibold', primary ? 'text-sky-200' : 'text-zinc-200')}>{title}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-zinc-500">{desc}</span>
      </span>
      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-zinc-600 transition-transform group-hover:translate-x-0.5 group-hover:text-sky-400" />
    </button>
  )
}

function ConfirmReset({ onReset }: { onReset: () => void }) {
  const [confirming, setConfirming] = useState(false)
  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-rose-500/50 hover:text-rose-300"
      >
        <RotateCcw className="h-3.5 w-3.5" /> Reiniciar progreso
      </button>
    )
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-2 text-xs">
      <span className="text-zinc-400">¿Seguro? Se borrará todo.</span>
      <button
        onClick={() => { onReset(); setConfirming(false) }}
        className="inline-flex items-center gap-1 rounded-lg border border-rose-500/50 bg-rose-500/10 px-3 py-1.5 font-medium text-rose-300 hover:bg-rose-500/20"
      >
        <Trash2 className="h-3.5 w-3.5" /> Sí, borrar
      </button>
      <button onClick={() => setConfirming(false)} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-zinc-400 hover:text-zinc-200">
        Cancelar
      </button>
    </span>
  )
}
