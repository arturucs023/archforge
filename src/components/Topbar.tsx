import { useEffect, useState } from 'react'
import { Clock as ClockIcon, Menu, Search, Settings as SettingsIcon, User, UserCog } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { LEVEL_LABEL } from '../types'
import type { Level } from '../types'
import { navigate, useRoute } from '../lib/router'
import { cn } from '../lib/utils'
import Tooltip from './Tooltip'

export default function Topbar({ onMenu, showOnDesktop = false }: { onMenu: () => void; showOnDesktop?: boolean }) {
  const { shellMode, setShellMode, level, setLevel, setSearchOpen } = useApp()
  const route = useRoute()
  const settingsActive = route.segments[0] === 'settings'

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-zinc-800/80 bg-ink-950/85 px-3 backdrop-blur-md sm:px-5">
      <button
        onClick={onMenu}
        className={cn('rounded-lg border border-zinc-800 p-2 text-zinc-400 transition-colors hover:text-zinc-200', !showOnDesktop && 'lg:hidden')}
        aria-label="Abrir menú"
      >
        <Menu className="h-4 w-4" />
      </button>

      {/* Logo compacto cuando la barra lateral está plegada → volver al inicio */}
      {showOnDesktop && (
        <button
          onClick={() => navigate('/')}
          aria-label="Volver al inicio"
          title="Inicio"
          className="flex shrink-0 items-center gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-zinc-800/60"
        >
          <svg viewBox="0 0 32 32" className="h-6 w-6" aria-hidden>
            <rect width="32" height="32" rx="7" fill="#0d0d15" stroke="#2e2e42" />
            <path d="M16 5L4 26h24L16 5z" fill="none" stroke="#38bdf8" strokeWidth="2.4" strokeLinejoin="round" />
            <path d="M13 19h6M14.5 21.5h3" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="hidden font-mono text-sm font-bold tracking-tight text-zinc-50 sm:inline">ArchForge</span>
        </button>
      )}

      {/* Búsqueda global */}
      <button
        onClick={() => setSearchOpen(true)}
        className="group flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border border-zinc-800 bg-ink-850 px-3 text-left text-sm text-zinc-500 transition-colors hover:border-zinc-600 sm:max-w-md"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="truncate">Buscar comandos, problemas, conceptos…</span>
        <kbd className="ml-auto hidden shrink-0 rounded border border-zinc-700 bg-zinc-800/70 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400 sm:inline">
          Ctrl K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-2">
        {/* Racha de aprendizaje (solo si ya hay actividad) */}
        <StreakTopbar />

        {/* Reloj local en tiempo real */}
        <Clock />

        {/* Modo de shell */}
        <div className="flex items-center overflow-hidden rounded-lg border border-zinc-800" role="radiogroup" aria-label="Modo de comandos">
          <ShellModeButton
            active={shellMode === 'user'}
            onClick={() => setShellMode('user')}
            icon={<User className="h-3.5 w-3.5" />}
            hint='Los comandos se muestran como usuario normal con el prefijo $ (usa sudo cuando haga falta).'
          >
            Usuario
          </ShellModeButton>
          <ShellModeButton
            active={shellMode === 'root'}
            onClick={() => setShellMode('root')}
            icon={<UserCog className="h-3.5 w-3.5" />}
            hint='Los comandos con sudo se muestran sin sudo, con el prefijo # (ya eres root). El resto no cambia.'
          >
            Root
          </ShellModeButton>
        </div>

        {/* Nivel de aprendizaje */}
        <div className="relative group/lvl hidden md:block">
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value as Level)}
            aria-label="Nivel de aprendizaje"
            className="h-9 cursor-pointer appearance-none rounded-lg border border-zinc-800 bg-ink-850 pl-3 pr-7 text-xs font-medium text-zinc-300 outline-none transition-colors hover:border-zinc-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 [&>option]:bg-ink-900"
          >
            <option value="beginner">{LEVEL_LABEL.beginner}</option>
            <option value="intermediate">{LEVEL_LABEL.intermediate}</option>
            <option value="expert">{LEVEL_LABEL.expert}</option>
          </select>
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-zinc-600">▾</span>
          <Tooltip>
            Principiante: máximo detalle paso a paso. Intermedio: añade profundización técnica. Experto: incluye el funcionamiento interno de Linux.
          </Tooltip>
        </div>

        {/* Ajustes */}
        <span className="relative inline-flex">
          <button
            onClick={() => navigate('/settings')}
            aria-label="Ajustes"
            aria-current={settingsActive ? 'page' : undefined}
            title="Ajustes"
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-lg border transition-colors',
              settingsActive
                ? 'border-sky-500/60 bg-sky-500/10 text-sky-300'
                : 'border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200',
            )}
          >
            <SettingsIcon className="h-4 w-4" />
          </button>
        </span>
      </div>
    </header>
  )
}

/** Racha compacta en la Topbar: visible solo con actividad, tooltip al hover/focus. */
function StreakTopbar() {
  const { learningStreak, longestLearningStreak } = useApp()
  if (learningStreak <= 0) return null
  const diasTxt = `${learningStreak} día${learningStreak === 1 ? '' : 's'}`
  const aria = `Racha de aprendizaje: ${diasTxt}. Mejor racha: ${longestLearningStreak} días.`

  return (
    <span className="group/badge relative inline-flex rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400" tabIndex={0} role="status" aria-label={aria}>
      <span
        title={aria}
        className="flex h-9 items-center gap-1 px-2 font-mono text-xs tabular-nums text-zinc-400"
      >
        <span aria-hidden>🔥</span>
        <span className="hidden sm:inline">{diasTxt}</span>
        <span className="sm:hidden">{learningStreak}</span>
      </span>
      <span aria-hidden className="contents">
        <Tooltip>
          <span className="block font-semibold">🔥 Racha de aprendizaje</span>
          <span className="mt-0.5 block">Llevas {diasTxt} aprendiendo consecutivamente.</span>
          <span className="mt-0.5 block text-amber-300">🏆 Mejor racha: {longestLearningStreak} días</span>
        </Tooltip>
      </span>
    </span>
  )
}

/** Reloj local 24 h (HH:MM:SS, HH:MM en pantallas estrechas) con fecha española al hover/focus. */
function Clock() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const p = (n: number): string => String(n).padStart(2, '0')
  const time = `${p(now.getHours())}:${p(now.getMinutes())}:${p(now.getSeconds())}`
  const dateLong = capitalizeEs(
    now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
  )
  const aria = `Hora local: ${time}. ${dateLong}`

  return (
    <span className="group/badge relative inline-flex rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400" tabIndex={0}>
      <time
        dateTime={now.toISOString()}
        aria-label={aria}
        title={aria}
        className="flex h-9 items-center gap-1.5 px-2 font-mono text-xs tabular-nums text-zinc-400"
      >
        <ClockIcon className="h-3.5 w-3.5 shrink-0 text-sky-400" aria-hidden />
        <span>
          {p(now.getHours())}:{p(now.getMinutes())}
          <span className="hidden sm:inline">:{p(now.getSeconds())}</span>
        </span>
      </time>
      <span aria-hidden className="contents">
        <Tooltip>{dateLong}</Tooltip>
      </span>
    </span>
  )
}

function capitalizeEs(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function ShellModeButton({
  active,
  onClick,
  children,
  icon,
  hint,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  icon: React.ReactNode
  hint: string
}) {
  return (
    <span className="group/badge relative inline-flex">
      <button
        role="radio"
        aria-checked={active}
        onClick={onClick}
        className={cn(
          'inline-flex h-9 items-center gap-1.5 px-2.5 font-mono text-xs font-medium transition-colors',
          active ? 'bg-sky-500/15 text-sky-300' : 'text-zinc-500 hover:text-zinc-300',
        )}
      >
        {icon}
        <span className="hidden sm:inline">{children}</span>
      </button>
      <Tooltip>{hint}</Tooltip>
    </span>
  )
}
