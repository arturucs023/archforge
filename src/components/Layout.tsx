import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import SearchModal from './SearchModal'
import { useRoute } from '../lib/router'
import { useApp } from '../context/AppContext'
import { cn } from '../lib/utils'

const LABELS: Record<string, string> = {
  arch: 'Arch Linux desde cero',
  commands: 'Linux Command Center',
  learn: 'Aprender Linux',
  troubleshooting: 'Solución de problemas',
  builder: 'Arch Builder',
  compare: 'Comparador',
  'status-checker': 'Comprobador de estado',
  settings: 'Ajustes',
}

function RouteTracker() {
  const route = useRoute()
  const { setLastRoute } = useApp()
  useEffect(() => {
    if (route.path === '/' || route.path === '') return
    const head = route.segments[0] ?? ''
    let label = LABELS[head]
    if (!label) {
      if (head === 'section') {
        label = route.segments[1]?.charAt(0).toUpperCase() + (route.segments[1]?.slice(1) ?? '')
      } else {
        return
      }
    }
    setLastRoute('#' + route.path, `Continuar en ${label}`)
  }, [route.path, setLastRoute])
  return null
}

const SB_HIDDEN_KEY = 'archforge:sidebar-hidden'

export default function Layout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)
  /** escritorio: ¿barra lateral plegada? persiste en localStorage */
  const [desktopHidden, setDesktopHidden] = useState<boolean>(() => {
    try { return localStorage.getItem(SB_HIDDEN_KEY) === '1' } catch { return false }
  })
  /** animación de arranque: solo la primera carga; se retira al terminar para
      no dejar filter/transform residuales (romperían position:fixed) */
  const [booting, setBooting] = useState<boolean>(() => {
    try { return !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches } catch { return true }
  })

  const toggleSidebar = () => {
    setMenuOpen(false)
    setDesktopHidden((v) => {
      const nv = !v
      try { localStorage.setItem(SB_HIDDEN_KEY, nv ? '1' : '0') } catch { /* noop */ }
      return nv
    })
  }

  useEffect(() => {
    const close = () => setMenuOpen(false)
    window.addEventListener('hashchange', close)
    return () => window.removeEventListener('hashchange', close)
  }, [])

  return (
    <div
      className={cn('min-h-screen bg-ink-950', booting && 'af-boot')}
      onAnimationEnd={(e) => {
        if (e.target === e.currentTarget && e.animationName === 'afBoot') setBooting(false)
      }}
    >
      <RouteTracker />
      {/* Resplandor decorativo */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 z-0 h-72"
        style={{ background: 'radial-gradient(640px 220px at 22% -10%, rgba(56,189,248,0.07), transparent)' }}
      />
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} hidden={desktopHidden} onToggle={toggleSidebar} />
      <div className={cn('relative z-10 transition-[padding] duration-200', !desktopHidden && 'lg:pl-72')}>
        <Topbar onMenu={() => { desktopHidden ? toggleSidebar() : setMenuOpen(true) }} showOnDesktop={desktopHidden} />
        <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-10 lg:py-8">{children}</main>        <footer className="mx-auto w-full max-w-5xl px-4 pb-8 pt-4 text-center text-xs leading-relaxed text-zinc-600 sm:px-6 lg:px-10">
          ArchForge · guía educativa independiente · no afiliada a Arch Linux™ · los procedimientos pueden cambiar con el tiempo:
          contrasta con la wiki oficial cuando dudes.
        </footer>
      </div>
      <SearchModal />
      <ScrollTopButton />
    </div>
  )
}

/** Botón flotante «volver arriba»: aparece tras desplazarse y respeta reduced-motion. */
function ScrollTopButton() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 420)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const toTop = () => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
  }

  return (
    <button
      onClick={toTop}
      aria-label="Volver a la parte superior"
      title="Volver arriba"
      className={cn(
        'fixed bottom-5 right-5 z-30 flex h-10 w-10 items-center justify-center rounded-xl border border-sky-500/40 bg-ink-900/90 text-sky-300 shadow-lg shadow-black/40 backdrop-blur transition-all duration-200 hover:border-sky-400/70 hover:bg-sky-500/15 hover:text-sky-200',
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0',
      )}
    >
      <ArrowUp className="h-4 w-4" strokeWidth={2.4} />
    </button>
  )
}
