/* Laboratorio VM en el navegador — Alpine Linux real sobre el emulador v86.

   La version de escritorio usa QEMU + SSH (server/vm-server.mjs). Esta es la
   variante que funciona desde un sitio estatico como GitHub Pages: en vez de
   un QEMU en un servidor, el emulador v86 (x86 -> WebAssembly) corre DENTRO
   del navegador y arranca la ISO de Alpine desde el CD virtual.

   Decisiones:
   - Consola por puerto serie + xterm.js, no el canvas de v86. El kernel de
     Alpine escribe en ttyS0 y ademas pone su framebuffer en modo grafico, asi
     que el canvas no sirve para leer texto. Con xterm se puede copiar.
   - ISO de 32 bits (x86): v86 no emula extensiones de 64 bits, y una imagen
     x86_64 se detiene con "This kernel requires an x86-64 CPU".
   - Carga perezosa: 49 MB solo se descargan al pulsar "Arrancar".
   - Cada arranque es efimero, igual que el overlay de la version local. */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, Play, RotateCcw, Square, TriangleAlert } from 'lucide-react'
import { cn } from '../lib/utils'

type V86Ctor = new (opts: Record<string, unknown>) => V86Instance

interface V86Instance {
  run(): Promise<void>
  stop(): Promise<void>
  destroy(): Promise<void>
  restart(): void
  is_running(): boolean
  add_listener(event: string, cb: (arg: unknown) => void): void
  remove_listener(event: string, cb: (arg: unknown) => void): void
}

type Phase = 'idle' | 'loading' | 'booting' | 'running' | 'error'

const WASM_URL = 'vm/v86.wasm'
const BIOS_URL = 'vm/seabios.bin'
const VGA_BIOS_URL = 'vm/vgabios.bin'
const ISO_URL = 'vm/alpine.iso'
const MANIFEST_URL = 'vm/manifest.json'

/* xterm.js desde CDN, al vuelo. Solo hacen falta si alguien usa el
   laboratorio, asi que no tiene sentido vendirlas en el bundle principal. */
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve()
    const s = document.createElement('script')
    s.src = src
    s.onload = () => resolve()
    s.onerror = () => reject(new Error(`No se pudo cargar ${src} — ¿sin Internet?`))
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

/* Tamano exacto de la ISO, leido del manifiesto que genera
   tools/setup-vm-web.mjs. v86 lo necesita para pedir el fichero por rangos
   en vez de descargarlo de una sentada. */
async function fetchIsoInfo(): Promise<{ bytes: number; alpine: string }> {
  const res = await fetch(MANIFEST_URL)
  if (!res.ok) throw new Error(`Falta el manifiesto de la VM (HTTP ${res.status})`)
  const j = (await res.json()) as { isoBytes?: number; alpine?: string }
  if (!j.isoBytes) throw new Error('El manifiesto no declara el tamaño de la ISO')
  return { bytes: j.isoBytes, alpine: j.alpine ?? '3.24' }
}

export default function VmBrowserLab({ compact = false }: { compact?: boolean }) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [alpineLabel, setAlpineLabel] = useState('3.24')

  const termRef = useRef<HTMLDivElement>(null)
  const emulatorRef = useRef<V86Instance | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  const running = phase === 'running' || phase === 'booting'
  const busy = phase === 'loading'

  const stop = useCallback(async () => {
    try { await emulatorRef.current?.stop() } catch { /* ya estaba parado */ }
    cleanupRef.current?.()
    cleanupRef.current = null
    emulatorRef.current = null
    setPhase('idle')
    setProgress(0)
  }, [])

  /* Al navegar a otra pagina con la VM viva, el WASM seguiria executing
     en segundo plano: hay que destruirlo explicitamente. */
  useEffect(() => {
    return () => {
      cleanupRef.current?.()
      try { void emulatorRef.current?.destroy() } catch { /* noop */ }
    }
  }, [])

  const start = useCallback(async () => {
    if (busy || running) return
    setPhase('loading')
    setProgress(0)
    setError(null)

    try {
      const [mod] = await Promise.all([
        import('v86') as Promise<unknown>,
        loadScript('https://cdn.jsdelivr.net/npm/@xterm/xterm@5.5.0/lib/xterm.min.js'),
        loadCSS('https://cdn.jsdelivr.net/npm/@xterm/xterm@5.5.0/css/xterm.min.css'),
      ])
      const V86 = ((mod as { default?: V86Ctor }).default ?? mod) as V86Ctor

      const TerminalCtor = (window as unknown as { Terminal?: new (o: object) => object }).Terminal
      if (!TerminalCtor) throw new Error('xterm.js no se pudo inicializar')
      if (!termRef.current) throw new Error('No se encontró el contenedor del terminal')

      const { bytes, alpine } = await fetchIsoInfo()
      setAlpineLabel(alpine)

      const emulator = new V86({
        wasm_path: WASM_URL,
        memory_size: 64 * 1024 * 1024,
        vga_memory_size: 2 * 1024 * 1024,
        bios: { url: BIOS_URL },
        vga_bios: { url: VGA_BIOS_URL },
        cdrom: { url: ISO_URL, async: true, size: bytes },
        autostart: true,
        boot_order: 0x123, // 0x123 = CD antes que disco
        disable_speaker: true,
        disable_mouse: true,
        // El framebuffer de Alpine pasa a modo gráfico: el texto útil sale
        // por ttyS0, que se pinta en xterm. Sin canvas no se gasta CPU en VGA.
        screen_container: null,
        serial_console: {
          type: 'xtermjs',
          container: termRef.current,
          xterm_lib: TerminalCtor as unknown as Function,
        },
      })

      emulatorRef.current = emulator

      /* 49 MB no se descargan de golpe: v86 pide rangos y emite progreso, que
         es lo que evita que la pagina parezca colgada. */
      const onProgress = (arg: unknown) => {
        const p = arg as { loaded?: number; total?: number }
        if (p?.total) setProgress(Math.round(((p.loaded ?? 0) / p.total) * 100))
      }
      const onStarted = () => setPhase('running')
      emulator.add_listener('download-progress', onProgress)
      emulator.add_listener('emulator-started', onStarted)

      cleanupRef.current = () => {
        emulator.remove_listener('download-progress', onProgress)
        emulator.remove_listener('emulator-started', onStarted)
      }

      await emulator.run()
      setPhase('booting')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setPhase('error')
    }
  }, [busy, running])

  const statusText = {
    idle: 'Apagada',
    loading: `Descargando Alpine… ${progress}%`,
    booting: 'Arrancando Linux…',
    running: 'Linux conectado',
    error: 'Error al arrancar',
  }[phase]

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-ink-900/70 px-3 py-2 font-mono text-xs">
          <span
            className={cn(
              'inline-block h-2.5 w-2.5 rounded-full',
              phase === 'running' ? 'bg-emerald-500 animate-pulse'
                : phase === 'error' ? 'bg-rose-500'
                : busy || phase === 'booting' ? 'bg-amber-400'
                : 'bg-zinc-600',
            )}
            aria-hidden
          />
          <span className="text-zinc-300">{statusText}</span>
        </div>

        <button
          onClick={() => void start()}
          disabled={busy || running}
          className={cn(
            'inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
            busy || running
              ? 'border-zinc-800 text-zinc-600'
              : 'border-sky-500/40 bg-sky-500/10 text-sky-200 hover:bg-sky-500/20',
          )}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {busy ? 'Descargando…' : 'Arrancar laboratorio'}
        </button>

        <button
          onClick={() => void stop()}
          disabled={!running && !busy}
          className={cn(
            'inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
            !running && !busy
              ? 'border-zinc-800 text-zinc-600'
              : 'border-rose-500/40 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20',
          )}
        >
          <Square className="h-4 w-4" />
          Detener
        </button>

        {running && (
          <button
            onClick={() => emulatorRef.current?.restart()}
            className="inline-flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-200 transition-colors hover:bg-amber-500/20"
          >
            <RotateCcw className="h-4 w-4" />
            Reiniciar
          </button>
        )}
      </div>

      {busy && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-sky-500 transition-[width] duration-200"
            style={{ width: `${Math.max(progress, 4)}%` }}
          />
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/[0.07] p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-rose-200">
            <TriangleAlert className="h-4 w-4" />
            No se pudo arrancar la máquina virtual
          </p>
          <p className="mt-1 break-words font-mono text-xs text-zinc-400">{error}</p>
          <p className="mt-2 text-xs text-zinc-500">
            Si el problema persiste, prueba con la{' '}
            <a href="#/terminal" className="text-sky-300 underline decoration-dotted">
              CLI educativa (sandbox)
            </a>
            , que funciona sin descargar nada.
          </p>
        </div>
      )}

      <section
        aria-label="Terminal de la máquina virtual Alpine"
        className="overflow-hidden rounded-xl border border-zinc-800 theme-dark-zone"
      >
        <div className="flex items-center gap-2 border-b border-zinc-800/80 bg-zinc-900/60 px-3 py-1.5">
          <span className="flex gap-1.5" aria-hidden>
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
          </span>
          <span className="font-mono text-[11px] font-semibold text-zinc-400">
            Alpine Linux &mdash; bash real
          </span>
          <span className="ml-auto font-mono text-[10px] text-zinc-600">
            emulado con v86
          </span>
        </div>

        <div className="bg-[#0b0e14] px-3 py-2">
          {/* v86/xterm se inyectan aqui: el div debe existir antes de arrancar */}
          <div ref={termRef} className="af-xterm-container" style={{ height: 460 }} />
          {!running && !busy && (
            <div className="bg-[#0b0e14] px-4 py-10 text-center">
              <p className="font-mono text-sm text-zinc-400">VM apagada</p>
              <p className="mt-1 font-mono text-xs text-zinc-600">
                Pulsa «Arrancar laboratorio» para descargarla (49 MB, solo la primera vez).
              </p>
              {!compact && (
                <p className="mt-3 text-xs text-zinc-500">
                  Entra como <span className="font-mono text-emerald-300">root</span> (sin contraseña).
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-zinc-800/80 bg-zinc-900/50 px-3 py-1.5 font-mono text-[10px] text-zinc-600">
          <span><kbd className="kbd">root</kbd> + <kbd className="kbd">Enter</kbd> para entrar</span>
          <span className="ml-auto">Alpine Linux {alpineLabel} &middot; live y efímero</span>
        </div>
      </section>
    </div>
  )
}