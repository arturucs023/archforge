import { useMemo, useState } from 'react'
import { ChevronDown, Hammer, Monitor, PanelLeftClose, Scale, Activity, LayoutDashboard, Server, SquareTerminal, GraduationCap, FlaskConical } from 'lucide-react'
import { GROUPS, SECTIONS } from '../data/sections'
import { REGISTRY, stepUnits } from '../data/registry'
import { SERVER_COURSES, courseProgress, serverLabDoneId, serverModuleDoneId } from '../data/servers'
import { getIcon } from '../lib/icons'
import { navigate, useRoute } from '../lib/router'
import { useApp } from '../context/AppContext'
import { cn } from '../lib/utils'

const TOOLS: { id: string; label: string; icon: typeof Hammer; to: string; desc: string }[] = [
  { id: 'builder', label: 'Arch Builder', icon: Hammer, to: '/builder', desc: 'Genera tu ruta personalizada' },
  { id: 'commands', label: 'Command Center', icon: SquareTerminal, to: '/commands', desc: 'Cheatsheet Arch · Debian · Ubuntu' },
  { id: 'bash-course', label: 'Curso de Bash', icon: SquareTerminal, to: '/bash', desc: '27 módulos + proyectos' },
  { id: 'learn', label: 'Aprender Linux', icon: GraduationCap, to: '/learn', desc: 'Fundamentos con ejercicios' },
  { id: 'servers', label: 'Servicios y servidores', icon: Server, to: '/servers', desc: '9 cursos: DNS, SSH, Nginx…' },
  { id: 'vm-real', label: 'Linux real (VM)', icon: Monitor, to: '/vm', desc: '🖥️ Terminal Alpine real' },
  { id: 'terminal', label: 'Terminal interactiva', icon: FlaskConical, to: '/terminal', desc: 'CLI simulada + laboratorios' },
  { id: 'compare', label: 'Comparador', icon: Scale, to: '/compare', desc: 'ext4 vs Btrfs, KDE vs GNOME…' },
  { id: 'status-checker', label: 'Comprobador de estado', icon: Activity, to: '/status-checker', desc: '¿Está funcionando mi sistema?' },
]

export default function Sidebar({ open, onClose, hidden = false, onToggle }: { open: boolean; onClose: () => void; hidden?: boolean; onToggle?: () => void }) {
  const { isDone } = useApp()
  const route = useRoute()
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})

  /** herramienta/sección activa derivada de la ruta actual */
  const activeToolId = useMemo(() => {
    switch (route.segments[0]) {
      case undefined: return 'inicio'
      case 'arch': return 'arch'
      case 'commands': return 'commands'
      case 'learn': return 'learn'
      case 'bash': return 'bash-course'
      case 'servers': return 'servers'
      case 'vm': return 'vm-real'
      case 'terminal': return 'terminal'
      case 'troubleshooting': return 'troubleshooting'
      case 'section':
        if (route.segments[1] === 'troubleshooting') return 'troubleshooting'
        return null
      default: return null
    }
  }, [route])

  /** sección activa cuando la ruta es /section/:id */
  const activeSectionId = route.segments[0] === 'section' ? (route.segments[1] ?? null) : null

  const toggleGroup = (g: string): void => setCollapsedGroups((c) => ({ ...c, [g]: !c[g] }))

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden" onClick={onClose} aria-hidden />}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-zinc-800/80 bg-ink-900 transition-transform duration-200 lg:z-20',
          open || !hidden ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-label="Navegación principal"
        aria-hidden={hidden && !open}
      >
        {/* Logo + botón plegar */}
        <div className="flex items-center gap-3 border-b border-zinc-800/80 pl-5 pr-3 py-4">
          <button onClick={() => { navigate('/'); onClose() }} className="flex min-w-0 flex-1 items-center gap-3 text-left">
            <svg viewBox="0 0 32 32" className="h-9 w-9 shrink-0" aria-hidden>
              <rect width="32" height="32" rx="7" fill="#0d0d15" stroke="#2e2e42" />
              <path d="M16 5L4 26h24L16 5z" fill="none" stroke="#38bdf8" strokeWidth="2.4" strokeLinejoin="round" />
              <path d="M13 19h6M14.5 21.5h3" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="min-w-0">
              <span className="block font-mono text-lg font-bold leading-tight tracking-tight text-zinc-50">ArchForge</span>
              <span className="block font-mono text-[10px] uppercase tracking-widest text-sky-400/80">forja tu arch</span>
            </span>
          </button>
          {onToggle && (
            <button
              onClick={onToggle}
              aria-label={hidden ? 'Abrir barra lateral' : 'Cerrar barra lateral'}
              aria-expanded={!hidden}
              title={hidden ? 'Abrir barra lateral' : 'Cerrar barra lateral'}
              className="shrink-0 rounded-lg border border-transparent p-2 text-zinc-500 transition-colors hover:border-zinc-700 hover:text-zinc-200"
            >
              <PanelLeftClose className="h-[18px] w-[18px]" />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto scroll-smooth px-3 py-3 [scrollbar-width:thin]">
          <SidebarLink
            label="Inicio"
            icon={LayoutDashboard}
            active={activeToolId === 'inicio'}
            onClick={() => { navigate('/'); onClose() }}
          />
          <SidebarLink
            label="Arch Linux desde cero"
            icon={getIcon('installation')}
            active={activeToolId === 'arch'}
            onClick={() => { navigate('/arch'); onClose() }}
          />

          {GROUPS.filter((g) => g.id !== 'inicio').map((group) => {
            const sections = SECTIONS.filter((s) => s.group === group.id)
            const collapsed = collapsedGroups[group.id]
            const total = sections.reduce((acc, s) => {
              const sec = REGISTRY.find((r) => r.id === s.id)!
              return acc + stepUnits(sec).length
            }, 0)
            const completed = sections.reduce((acc, s) => {
              const sec = REGISTRY.find((r) => r.id === s.id)!
              return acc + stepUnits(sec).filter((u) => isDone(u)).length
            }, 0)
            const pct = total ? Math.round((completed / total) * 100) : 0

            /** el grupo de la sección activa nunca se colapsa automáticamente */
            const groupHasActive = !collapsed && sections.some((s) => s.id === activeSectionId)

            return (
              <div key={group.id} className="mt-3">
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left"
                  aria-expanded={!collapsed}
                >
                  <ChevronDown className={cn('h-3 w-3 shrink-0 text-zinc-600 transition-transform', collapsed && '-rotate-90')} />
                  <span className={cn('flex-1 font-mono text-[10px] font-bold uppercase tracking-widest', groupHasActive ? 'text-sky-400/90' : 'text-zinc-500')}>{group.label}</span>
                  <span className="font-mono text-[10px] tabular-nums text-zinc-600">{completed}/{total}</span>
                  <span className="h-1 w-8 overflow-hidden rounded-full bg-zinc-800">
                    <span
                      className={cn('block h-full rounded-full transition-all', pct === 100 ? 'bg-emerald-500' : 'bg-sky-500')}
                      style={{ width: `${pct}%` }}
                    />
                  </span>
                </button>
                {!collapsed && (
                  <ul className="mt-0.5 space-y-px pl-1">
                    {sections.map((s) => {
                      const Icon = getIcon(s.icon)
                      const sec = REGISTRY.find((r) => r.id === s.id)!
                      const units = stepUnits(sec)
                      const allDone = units.every((u) => isDone(u))
                      const someDone = units.some((u) => isDone(u))
                      const isActiveSection = activeSectionId === s.id
                      return (
                        <li key={s.id}>
                          <SidebarSectionLink
                            id={s.id}
                            label={s.title}
                            icon={Icon}
                            done={allDone}
                            started={someDone}
                            active={isActiveSection}
                            onClick={() => { navigate(`/section/${s.id}`); onClose() }}
                          />
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )
          })}

          {/* Herramientas */}
          <div className="mt-4">
            <div className="px-2 pb-1 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">Herramientas</div>
            <ul className="space-y-px">
              {TOOLS.map((t) => {
                const isActive = activeToolId === t.id ||
                  (t.id === 'troubleshooting' && route.segments[0] === 'troubleshooting')
                return (
                  <li key={t.id}>
                    <ToolButton tool={t} active={isActive} onNavigate={onClose} />
                    {t.id === 'servers' && route.segments[0] === 'servers' && (
                      <ul className="mt-0.5 mb-1 space-y-px border-l border-zinc-800 pl-3 ml-4">
                        {SERVER_COURSES.map((c) => {
                          const p = courseProgress(c, isDone)
                          const courseActive = route.segments[1] === c.id
                          return (
                            <li key={c.id}>
                              <button
                                onClick={() => { navigate(`/servers/${c.id}`); onClose() }}
                                aria-current={courseActive ? 'page' : undefined}
                                title={`${c.title} — ${p.done}/${p.total}`}
                                className={cn(
                                  'group relative flex w-full items-center gap-2 rounded-lg py-1.5 pl-2 pr-2 text-left transition-colors',
                                  courseActive ? 'bg-sky-500/10' : 'hover:bg-zinc-800/60',
                                )}
                              >
                                {courseActive && <span className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-sky-400" aria-hidden />}
                                <span aria-hidden className="shrink-0 text-[11px]">{c.icon}</span>
                                <span className={cn('min-w-0 flex-1 truncate text-[12.5px]', courseActive ? 'font-semibold text-sky-200' : p.done === p.total ? 'text-emerald-300/70' : 'text-zinc-400 group-hover:text-zinc-200')}>
                                  {c.title.replace('Servidor web ', '').replace('Servidor ', '')}
                                </span>
                                {p.done === p.total
                                  ? <CheckSmall />
                                  : <span className="shrink-0 font-mono text-[9px] tabular-nums text-zinc-600">{p.done}/{p.total}</span>}
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </li>
                )
              })}
              <li>
                <SidebarLink
                  label="Solución de problemas"
                  icon={getIcon('troubleshooting')}
                  active={activeToolId === 'troubleshooting'}
                  onClick={() => { navigate('/troubleshooting'); onClose() }}
                />
              </li>
            </ul>
          </div>
        </nav>

        {/* Pie */}
        <div className="border-t border-zinc-800/80 px-5 py-3 text-[11px] leading-relaxed text-zinc-600">
          Guía educativa independiente.
          <br />
          Verifica siempre la <span className="text-zinc-500">wiki.archlinux.org</span>.
        </div>
      </aside>
    </>
  )
}

function ToolButton({ tool, active, onNavigate }: { tool: { id: string; label: string; icon: typeof Hammer; to: string; desc: string }; active: boolean; onNavigate: () => void }) {
  const Icon = tool.icon
  return (
    <button
      onClick={() => { navigate(tool.to); onNavigate() }}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group relative flex w-full items-center gap-2.5 rounded-lg py-2 pl-3 pr-2 text-left transition-colors',
        active ? 'bg-sky-500/10' : 'hover:bg-zinc-800/60',
      )}
    >
      {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-sky-400" aria-hidden />}
      <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-sky-300' : 'text-violet-400/90')} />
      <span className="min-w-0 flex-1">
        <span className={cn('block truncate text-[13px] font-medium', active ? 'text-sky-200' : 'text-zinc-300')}>{tool.label}</span>
        <span className="block truncate text-[11px] text-zinc-600">{tool.desc}</span>
      </span>
    </button>
  )
}

function SidebarLink({
  label,
  icon: Icon,
  onClick,
  active,
}: {
  label: string
  icon: typeof Hammer
  onClick: () => void
  active?: boolean
}) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group relative flex w-full items-center gap-2.5 rounded-lg py-2 pl-3 pr-2 text-left transition-colors',
        active ? 'bg-sky-500/10' : 'hover:bg-zinc-800/60',
      )}
    >
      {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-sky-400" aria-hidden />}
      <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-sky-300' : 'text-sky-400')} />
      <span className={cn('truncate text-[13px] font-medium', active ? 'font-semibold text-sky-200' : 'text-zinc-300')}>{label}</span>
    </button>
  )
}

function SidebarSectionLink({
  label,
  icon: Icon,
  done,
  started,
  active,
  onClick,
}: {
  id: string
  label: string
  icon: typeof Hammer
  done: boolean
  started: boolean
  active?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group relative flex w-full items-center gap-2 rounded-lg py-1.5 pl-3 pr-2 text-left transition-colors',
        active ? 'bg-sky-500/10' : 'hover:bg-zinc-800/60',
      )}
    >
      {active && <span className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-sky-400" aria-hidden />}
      <Icon className={cn('h-3.5 w-3.5 shrink-0', active ? 'text-sky-300' : done ? 'text-emerald-400' : started ? 'text-sky-400' : 'text-zinc-500')} />
      <span className={cn('min-w-0 flex-1 truncate text-[13px]', active ? 'font-semibold text-sky-200' : done ? 'text-emerald-300/70' : 'text-zinc-400 group-hover:text-zinc-200')}>
        {label}
      </span>
      {done && <CheckSmall />}
    </button>
  )
}

function CheckSmall() {
  return (
    <svg viewBox="0 0 12 12" className="h-3 w-3 shrink-0 text-emerald-400" aria-hidden>
      <path d="M2 6.5l2.5 2.5L10 3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
