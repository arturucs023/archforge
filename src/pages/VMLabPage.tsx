/* Linux real (VM) — terminal xterm.js ↔ WebSocket ↔ SSH ↔ Alpine.
   xterm.js es la terminal estándar de VS Code: renderiza ANSI real,
   cursor nativo, soporte GPU (WebGL), auto-resize.
   El shell remoto hace echo y muestra PS1 — xterm.js lo pinta todo. */

import { useEffect, useRef, useState } from 'react'
import { SquareTerminal } from 'lucide-react'
import Breadcrumbs, { PageHeader } from '../components/Breadcrumbs'
import CliVsRealNotice from '../components/CliVsRealNotice'
import { cn } from '../lib/utils'

type VmState = 'unknown' | 'stopped' | 'starting' | 'running' | 'resetting' | 'unavailable'

const WS_URL = 'ws://127.0.0.1:7860/vm-terminal'

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve()
    const s = document.createElement('script')
    s.src = src
    s.onload = () => resolve()
    s.onerror = () => reject(new Error(`No se pudo cargar ${src}`))
    document.head.appendChild(s)
  })
}

function loadCSS(href: string): Promise<void> {
  return new Promise((resolve) => {
    if (document.querySelector(`link[href="${href}"]`)) return resolve()
    const l = document.createElement('link')
    l.rel = 'stylesheet'; l.href = href
    l.onload = () => resolve(); l.onerror = () => resolve()
    document.head.appendChild(l)
  })
}

declare global {
  interface Window {
    Terminal?: any
    FitAddon?: any
    WebglAddon?: any
    WebLinksAddon?: any
  }
}

export default function VMLabPage() {
  const [state, setState] = useState<VmState>('unknown')
  const [libError, setLibError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const termRef = useRef<any>(null)
  const holderRef = useRef<HTMLDivElement>(null)
  const stateRef = useRef<VmState>('unknown')
  const fitAddonRef = useRef<any>(null)

  /* ---------- estado del backend (poll ligero) + auto-conexión ---------- */
  useEffect(() => {
    let alive = true
    let wasConnected = false
    const poll = async () => {
      try {
        const r = await fetch('http://127.0.0.1:7860/api/vm/status')
        const j = await r.json()
        if (alive && stateRef.current !== 'starting' && stateRef.current !== 'resetting') {
          if (j.qemuAvailable === false) {
            setState('unavailable'); stateRef.current = 'unavailable'
          } else {
            setState(j.state as VmState); stateRef.current = j.state as VmState
          }
          // Auto-conectar si la VM ya está corriendo (auto-start del servidor)
          if (j.state === 'running' && !wasConnected && termRef.current) {
            wasConnected = true
            connectWs()
          }
        }
      } catch {
        if (alive && !['starting', 'resetting'].includes(stateRef.current)) {
          setState('stopped'); stateRef.current = 'stopped'
        }
      }
    }
    poll()
    const id = window.setInterval(poll, 2000)
    return () => { alive = false; window.clearInterval(id) }
  }, [])

  /* ---------- inicializar xterm.js ---------- */
  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        // Cargar xterm.js desde CDN
        await loadScript('https://cdn.jsdelivr.net/npm/@xterm/xterm@5.5.0/lib/xterm.min.js')
        await loadCSS('https://cdn.jsdelivr.net/npm/@xterm/xterm@5.5.0/css/xterm.min.css')
        await loadScript('https://cdn.jsdelivr.net/npm/@xterm/addon-fit@0.10.0/lib/addon-fit.min.js')
        await loadScript('https://cdn.jsdelivr.net/npm/@xterm/addon-web-links@0.11.0/lib/addon-web-links.min.js')

        if (cancelled || !holderRef.current || !window.Terminal) return

        const term = new window.Terminal({
          cursorBlink: true,
          cursorStyle: 'bar',
          cursorWidth: 2,
          fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', Consolas, 'Courier New', monospace",
          fontSize: 14,
          lineHeight: 1.35,
          letterSpacing: 0.3,
          theme: {
            background: '#0b0e14',
            foreground: '#d4d4d8',
            cursor: '#38bdf8',
            cursorAccent: '#0b0e14',
            selectionBackground: 'rgba(56, 189, 248, 0.25)',
            selectionForeground: '#ffffff',
            black: '#1e1e2e',
            red: '#f38ba8',
            green: '#a6e3a1',
            yellow: '#f9e2af',
            blue: '#89b4fa',
            magenta: '#f5c2e7',
            cyan: '#94e2d5',
            white: '#d4d4d8',
            brightBlack: '#585b70',
            brightRed: '#f38ba8',
            brightGreen: '#a6e3a1',
            brightYellow: '#f9e2af',
            brightBlue: '#89b4fa',
            brightMagenta: '#f5c2e7',
            brightCyan: '#94e2d5',
            brightWhite: '#ffffff',
          },
          allowProposedApi: true,
          scrollback: 10000,
          smoothScroll: true,
          convertEol: true,
        })

        // FitAddon para auto-resize
        const FitAddon = window.FitAddon?.FitAddon
        const fitAddon = FitAddon ? new FitAddon() : null
        if (fitAddon) {
          term.loadAddon(fitAddon)
          fitAddonRef.current = fitAddon
        }

        // WebLinksAddon para clickear URLs
        const WebLinksAddon = window.WebLinksAddon?.WebLinksAddon
        if (WebLinksAddon) {
          term.loadAddon(new WebLinksAddon())
        }

        // WebGL addon si disponible
        try {
          const WebglAddon = window.WebglAddon?.WebglAddon
          if (WebglAddon) {
            const webglAddon = new WebglAddon()
            webglAddon.onContextLoss(() => { webglAddon.dispose() })
            term.loadAddon(webglAddon)
          }
        } catch { /* fallback a canvas */ }

        term.open(holderRef.current)
        termRef.current = term

        // Esperar a que xterm.js renderice antes de hacer fit
        await new Promise(r => setTimeout(r, 100))
        if (fitAddon && !cancelled) {
          try { fitAddon.fit() } catch {}
        }

        setReady(true)
        // El backend envía el prompt y el banner al conectar
        connectWs()
      } catch (e) {
        if (!cancelled) setLibError((e as Error).message)
      }
    })()

    // ResizeObserver para auto-fit
    const ro = new ResizeObserver(() => {
      if (fitAddonRef.current && termRef.current && !cancelled) {
        try { fitAddonRef.current.fit() } catch {}
      }
    })
    if (holderRef.current) ro.observe(holderRef.current)

    return () => {
      cancelled = true
      ro.disconnect()
      if (termRef.current) {
        try { termRef.current.dispose() } catch {}
        termRef.current = null
      }
    }
  }, [])

  /* ---------- WebSocket ---------- */
  const connectWs = () => {
    if (wsRef.current && wsRef.current.readyState <= 1) return
    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => {
      // resize terminal to match current dimensions
      if (fitAddonRef.current && termRef.current) {
        try { fitAddonRef.current.fit() } catch {}
        const dims = fitAddonRef.current.proposeDimensions()
        if (dims) {
          ws.send(JSON.stringify({ type: 'resize', cols: dims.cols, rows: dims.rows }))
        }
      }
    }

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data)
        if (msg.type === 'status') {
          setState(msg.state as VmState); stateRef.current = msg.state as VmState
        } else if (msg.type === 'data' && termRef.current) {
          termRef.current.write(msg.data as string)
        }
      } catch { /* fragmento no-JSON ignorado */ }
    }
    ws.onclose = () => { wsRef.current = null }
  }

  /* ---------- input del usuario → WebSocket → SSH ---------- */
  useEffect(() => {
    if (!termRef.current || !ready) return
    const term = termRef.current

    const disposable = term.onData((data: string) => {
      // Asegurar WebSocket conectado antes de enviar
      if (!wsRef.current || wsRef.current.readyState > 1) {
        connectWs()
        // Esperar a que se abra antes de enviar
        const trySend = () => {
          if (wsRef.current && wsRef.current.readyState === 1) {
            wsRef.current.send(JSON.stringify({ type: 'input', data }))
          } else {
            setTimeout(trySend, 50)
          }
        }
        trySend()
      } else {
        wsRef.current.send(JSON.stringify({ type: 'input', data }))
      }
    })

    return () => { disposable.dispose() }
  }, [ready])

  /* ---------- resize -> informar al backend ---------- */
  useEffect(() => {
    if (!termRef.current || !ready) return
    const term = termRef.current

    const disposable = term.onResize(({ cols, rows }: { cols: number; rows: number }) => {
      wsRef.current?.send(JSON.stringify({ type: 'resize', cols, rows }))
    })

    return () => { disposable.dispose() }
  }, [ready])

  const vmAction = (action: 'open' | 'reset' | 'stop') => {
    connectWs()
    setTimeout(() => wsRef.current?.send(JSON.stringify({ type: action })), 250)
    if (action === 'open' && termRef.current) {
      termRef.current.clear()
      termRef.current.writeln('\x1b[38;2;56;189;248m> Arrancando Alpine... (30-45 s)\x1b[0m')
    }
    if (action === 'stop' && termRef.current) {
      termRef.current.writeln('\x1b[38;2;244;63;94m> laboratorio detenido\x1b[0m')
    }
  }

  const connected = state === 'running'
  const busy = state === 'starting' || state === 'resetting'
  const unavailable = state === 'unavailable'

  const STATE_UI: Record<VmState, { dot: string; text: string }> = {
    unknown:     { dot: 'bg-zinc-500',    text: 'Comprobando...' },
    stopped:     { dot: 'bg-rose-500',    text: 'Linux desconectado' },
    starting:    { dot: 'bg-amber-400',   text: 'Iniciando Linux...' },
    running:     { dot: 'bg-emerald-500', text: 'Linux conectado' },
    resetting:   { dot: 'bg-amber-400',   text: 'Restableciendo laboratorio...' },
    unavailable: { dot: 'bg-zinc-600',    text: 'QEMU no instalado' },
  }

  return (
    <div className="animate-fade-in">
      <Breadcrumbs items={[{ label: 'Servicios y servidores', to: '/servers' }, { label: 'Linux real (VM)' }]} />
      <PageHeader
        title="Linux en maquina virtual"
        subtitle="La CLI de ArchForge permite practicar de forma segura. Esta maquina virtual Alpine te da un Linux REAL -- efimero y aislado -- para ejecutar los comandos de verdad."
        icon={<SquareTerminal className="h-6 w-6 text-sky-400" />}
        actions={
          <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-ink-900/70 px-3 py-2 font-mono text-xs">
            <span className={cn('inline-block h-2.5 w-2.5 rounded-full', STATE_UI[state].dot, connected && 'animate-pulse')} aria-hidden />
            <span className="text-zinc-300">{STATE_UI[state].text}</span>
          </div>
        }
      />

      {/* Aviso diferenciado sandbox vs real */}
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-violet-500/25 bg-violet-500/[0.05] px-4 py-3">
          <p className="text-sm font-semibold text-violet-200">CLI educativa</p>
          <p className="mt-0.5 text-xs text-zinc-400">Sandbox simulado &middot; cero riesgo &middot; <a href="#/terminal" className="text-sky-300 underline decoration-dotted">practicar en el sandbox</a></p>
        </div>
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.05] px-4 py-3">
          <p className="text-sm font-semibold text-emerald-200">Linux real</p>
          <p className="mt-0.5 text-xs text-zinc-400">Alpine en VM &middot; comandos reales &middot; <span className="text-emerald-300">esta pagina</span></p>
        </div>
      </div>

      {/* Controles */}
      <div className="mb-3 flex flex-wrap gap-2">
        <button
          onClick={() => vmAction('open')}
          disabled={connected || busy || unavailable}
          aria-label="Abrir terminal de la maquina virtual"
          className={cn(
            'inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
            connected || busy || unavailable ? 'border-zinc-800 text-zinc-600' : 'border-sky-500/40 bg-sky-500/10 text-sky-200 hover:bg-sky-500/20',
          )}
        >
          Abrir terminal
        </button>

        <button
          onClick={() => {
            if (window.confirm('Restablecer el laboratorio?\n\nSe eliminaran todos los archivos, paquetes y configuraciones realizados durante la practica.')) vmAction('reset')
          }}
          disabled={busy || unavailable}
          aria-label="Restablecer laboratorio: borra todos los cambios"
          className={cn(
            'inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
            busy || unavailable ? 'border-zinc-800 text-zinc-600' : 'border-amber-500/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20',
          )}
        >
          Restablecer laboratorio
        </button>

        <button
          onClick={() => vmAction('stop')}
          disabled={state === 'stopped' || unavailable}
          aria-label="Detener la maquina virtual"
          className={cn(
            'inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
            state === 'stopped' || unavailable ? 'border-zinc-800 text-zinc-600' : 'border-rose-500/40 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20',
          )}
        >
          Detener laboratorio
        </button>
      </div>

      {/* Aviso QEMU no disponible */}
      {unavailable && (
        <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/[0.07] p-4">
          <p className="text-sm font-semibold text-amber-200">QEMU no esta instalado</p>
          <p className="mt-1 text-xs text-zinc-400">
            La maquina virtual requiere QEMU. Para instalarlo:
          </p>
          <div className="mt-2 rounded-lg bg-[#0b0e14] p-3 font-mono text-xs text-zinc-300">
            <p className="text-zinc-500"># Windows — descargar desde:</p>
            <p className="text-sky-300">https://www.qemu.org/download/#windows</p>
            <p className="mt-2 text-zinc-500"># O usar winget:</p>
            <p className="text-emerald-300">winget install SoftwareFreedomConservancy.QEMU</p>
            <p className="mt-2 text-zinc-500"># Linux (Debian/Ubuntu):</p>
            <p className="text-emerald-300">sudo apt install qemu-system-x86</p>
            <p className="mt-2 text-zinc-500"># Linux (Arch):</p>
            <p className="text-emerald-300">sudo pacman -S qemu-full</p>
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            Tambien puedes usar la <a href="#/terminal" className="text-sky-300 underline decoration-dotted">CLI educativa (sandbox)</a> sin necesidad de QEMU.
          </p>
        </div>
      )}

      {/* Terminal real — xterm.js */}
      <section aria-label="Terminal de la maquina virtual" className="overflow-hidden rounded-xl border border-zinc-800 theme-dark-zone">
        <div className="flex items-center gap-2 border-b border-zinc-800/80 bg-zinc-900/60 px-3 py-1.5">
          <span className="flex gap-1.5" aria-hidden>
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
          </span>
          <span className="font-mono text-[11px] font-semibold text-zinc-400">Alpine Linux &mdash; bash real</span>
          <span className="ml-auto flex items-center gap-2 font-mono text-[10px] text-zinc-600">
            <span className={cn('inline-block h-2 w-2 rounded-full', STATE_UI[state].dot)} aria-hidden />
            {connected ? 'archforge@archforge-vm' : STATE_UI[state].text}
          </span>
        </div>

        {unavailable ? (
          <div className="bg-[#0b0e14] px-4 py-12 text-center">
            <p className="font-mono text-sm text-zinc-400">La maquina virtual no esta disponible.</p>
            <p className="mt-1 font-mono text-xs text-zinc-600">Instala QEMU para poder usar esta funcion.</p>
            <p className="mt-3 text-xs text-zinc-500">
              Mientras tanto, puedes usar la <a href="#/terminal" className="text-sky-300 underline decoration-dotted">CLI educativa (sandbox)</a>.
            </p>
          </div>
        ) : (
          <>
            {!libError && (
              <div
                ref={holderRef}
                className="af-xterm-container"
                style={{
                  height: 480,
                  background: '#0b0e14',
                  padding: '8px 0',
                }}
              />
            )}
            {libError && (
              <p className="px-4 py-6 text-center text-sm text-rose-300 bg-[#0b0e14]">
                No se pudieron cargar las librerias de terminal (¿sin Internet?). {libError}
              </p>
            )}
            {!ready && !libError && (
              <div className="bg-[#0b0e14] px-4 py-8 text-center font-mono text-xs text-zinc-600">
                Cargando terminal...
              </div>
            )}
          </>
        )}

        {/* atajos */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-zinc-800/80 bg-zinc-900/50 px-3 py-1.5 font-mono text-[10px] text-zinc-600">
          <span><kbd className="kbd">Ctrl+C</kbd> interrumpir</span>
          <span><kbd className="kbd">Ctrl+L</kbd> limpiar</span>
          <span><kbd className="kbd">Ctrl+D</kbd> cerrar sesion</span>
          <span><kbd className="kbd">Ctrl+K</kbd> borrar linea</span>
          <span><kbd className="kbd">&uarr;&darr;</kbd> historial</span>
          <span className="ml-auto">pipas | &middot; redirecciones &gt; &middot; scripts &mdash; todo real</span>
        </div>
      </section>

      <p className="mt-3 text-[11px] leading-relaxed text-zinc-600">
        Aislado: los comandos viajan por SSH dentro de la VM y jamas se ejecutan en tu anfitrion.
        <strong className="text-zinc-500"> Restablecer</strong> borra TODO lo hecho dentro de la VM (tu progreso de ArchForge no se toca).
        ¿Prefieres el sandbox? La <a href="#/terminal" className="text-zinc-400 underline decoration-dotted">CLI educativa</a> sigue disponible.
      </p>

      <CliVsRealNotice />
    </div>
  )
}
