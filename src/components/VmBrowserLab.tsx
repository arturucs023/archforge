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
   - Carga perezosa: la imagen (~70 MB con herramientas) solo se descarga al
     pulsar "Arrancar".
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
  serial0_send(data: string): void
  add_listener(event: string, cb: (arg: unknown) => void): void
  remove_listener(event: string, cb: (arg: unknown) => void): void
}

type Phase = 'idle' | 'loading' | 'booting' | 'running' | 'error'
type NetStatus = 'off' | 'pending' | 'ok' | 'failed'
type ToolsStatus = 'unknown' | 'installing' | 'ready' | 'missing'

/* Medido con tools/test-vm-boot.mjs: desde "emulador listo" hasta el prompt
   de login. Se muestra para que el usuario sepa que esperar, no para
   prometer velocidad — v86 emula la CPU, no la acelera. */
const TYPICAL_BOOT_SECONDS = 40

/* Se incrementa a mano en cada despliegue. GitHub Pages sirve con
   max-age=600, asi que sirve para saber si el navegador ya tiene el bundle
   nuevo o esta viendo uno cacheado. */
const BUILD_STAMP = '2026-10-01 pkgs+net'

/* Red de la VM.

   v86 no puede salir a internet por si solo: necesita un proxy que traduzca
   las tramas de la NIC emulada a WebSocket. Se usa el relay publico de la
   documentacion de v86; antes de arrancar se comprueba que responde y, si no,
   se avisa en vez de dejar un DHCP colgado.

   AVISO: con el, el trafico de la VM pasa por un servidor de terceros
   (limitado y fuera de nuestro control). Para un despliegue propio lo ideal
   es montar relay propio; anade su URL a RELAYS. Ver README. */
const RELAYS = ['wss://relay.widgetry.org/']

/* Prueba cada relay con un WebSocket real y devuelve el primero que abre.
   Si ninguno responde, se devuelve el primero igualmente para intentarlo de
   todos modos, pero marcandolo como no accesible. */
async function pickRelay(timeoutMs = 6000): Promise<{ url: string; reachable: boolean }> {
  for (const url of RELAYS) {
    try {
      await new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(url)
        const t = window.setTimeout(() => {
          try { ws.close() } catch { /* noop */ }
          reject(new Error('timeout'))
        }, timeoutMs)
        ws.onopen = () => {
          window.clearTimeout(t)
          try { ws.close() } catch { /* noop */ }
          resolve()
        }
        ws.onerror = () => {
          window.clearTimeout(t)
          reject(new Error('error'))
        }
      })
      return { url, reachable: true }
    } catch { /* prueba el siguiente */ }
  }
  return { url: RELAYS[0], reachable: false }
}

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

/* Tamano exacto de la ISO, leido del manifiesto (setup-vm-web.mjs lo escribe y
   build-custom-iso.sh lo actualiza con la ISO personalizada). v86 lo necesita
   para pedir el fichero por rangos en vez de descargarlo de una sentada. */
interface VmManifest {
  bytes: number
  alpine: string
  custom: boolean
  packages: string[]
}
async function fetchIsoInfo(): Promise<VmManifest> {
  const res = await fetch(MANIFEST_URL)
  if (!res.ok) throw new Error(`Falta el manifiesto de la VM (HTTP ${res.status})`)
  const j = (await res.json()) as {
    isoBytes?: number
    alpine?: string
    custom?: boolean
    packages?: string[]
  }
  if (!j.isoBytes) throw new Error('El manifiesto no declara el tamaño de la ISO')
  return {
    bytes: j.isoBytes,
    alpine: j.alpine ?? '3.24',
    custom: j.custom ?? false,
    packages: j.packages ?? [],
  }
}

/* Herramientas preinstaladas en la ISO personalizada (ver
   tools/build-custom-iso.sh). La VM las instala desde el propio CD, sin red:
   el visitante no descarga nada mas ni escribe ningun apk add. Si se arranca
   la ISO base (dev local), la carpeta no existe y se omite en silencio. */
const TOOLS_DIR = '/media/cdrom/extra-pkgs'
/* --force-non-repository: el live no tiene disco, asi que apk avisa de que la
   instalacion se perderia al reiniciar. Es justo nuestro modelo (efimero),
   asi que se fuerza. Sin red: todo sale del CD. */
const TOOLS_INSTALL = `ls ${TOOLS_DIR}/*.apk >/dev/null 2>&1 && apk add --allow-untrusted --force-non-repository --no-network ${TOOLS_DIR}/*.apk 2>&1 | tail -3 || echo TOOLS_SKIP`
const NET_UP = 'ip link set eth0 up'
const NET_DHCP = 'udhcpc -i eth0 -q -t 25 -T 5 -A 3'
const NET_REPORT = 'ip -o addr show eth0 | tr -s " "; ip route'

export default function VmBrowserLab({ compact = false }: { compact?: boolean }) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [alpineLabel, setAlpineLabel] = useState('3.24')
  const [elapsed, setElapsed] = useState(0)
  /* Internet viene activada por defecto: es lo que pide el laboratorio y el
     relay se comprueba antes de arrancar. Se puede quitar para aislar la VM. */
  const [netEnabled, setNetEnabled] = useState(true)
  const [netStatus, setNetStatus] = useState<NetStatus>('off')
  const [relayOk, setRelayOk] = useState<boolean | null>(null)
  const [toolsStatus, setToolsStatus] = useState<ToolsStatus>('unknown')
  const [isoMB, setIsoMB] = useState(49)

  const termRef = useRef<HTMLDivElement>(null)
  const emulatorRef = useRef<V86Instance | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  const running = phase === 'running' || phase === 'booting'
  const busy = phase === 'loading'

  /* Cronómetro mientras arranca: sin esto el usuario no sabe si cuelga o
     solo va lento (que es lo normal en un emulador). */
  useEffect(() => {
    if (phase !== 'booting') return
    const t0 = Date.now()
    setElapsed(0)
    const id = window.setInterval(() => setElapsed(Math.round((Date.now() - t0) / 1000)), 500)
    return () => window.clearInterval(id)
  }, [phase])

  const stop = useCallback(async () => {
    try { await emulatorRef.current?.stop() } catch { /* ya estaba parado */ }
    cleanupRef.current?.()
    cleanupRef.current = null
    emulatorRef.current = null
    setPhase('idle')
    setProgress(0)
    setNetStatus('off')
    setToolsStatus('unknown')
    setRelayOk(null)
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
    setNetStatus(netEnabled ? 'pending' : 'off')
    setToolsStatus('unknown')
    setRelayOk(null)

    try {
      const [mod, manifest] = await Promise.all([
        import('v86') as Promise<unknown>,
        fetchIsoInfo(),
        loadScript('https://cdn.jsdelivr.net/npm/@xterm/xterm@5.5.0/lib/xterm.min.js'),
        loadCSS('https://cdn.jsdelivr.net/npm/@xterm/xterm@5.5.0/css/xterm.min.css'),
      ])
      const V86 = ((mod as { default?: V86Ctor }).default ?? mod) as V86Ctor

      const TerminalCtor = (window as unknown as { Terminal?: new (o: object) => object }).Terminal
      if (!TerminalCtor) throw new Error('xterm.js no se pudo inicializar')
      if (!termRef.current) throw new Error('No se encontró el contenedor del terminal')

      const { bytes, alpine, custom } = manifest
      setAlpineLabel(alpine)
      setIsoMB(Math.round(bytes / 1048576))

      /* El relay se comprueba ANTES de crear el emulador: si no responde, se
         arranca igual pero avisando, en vez de dejar un DHCP colgado. */
      const relay = netEnabled ? await pickRelay() : { url: RELAYS[0], reachable: false }
      setRelayOk(netEnabled ? relay.reachable : null)

      const emulator = new V86({
        wasm_path: WASM_URL,
        // 256 MB: el live + desempaquetar git/vim/man-pages necesitan margen.
        // Con 128 MB el tmpfs se llenaba ("No space left", medido en pruebas)
        // aunque al final funcionaba; con 256 la instalacion sale limpia.
        memory_size: 256 * 1024 * 1024,
        vga_memory_size: 2 * 1024 * 1024,
        bios: { url: BIOS_URL },
        vga_bios: { url: VGA_BIOS_URL },
        cdrom: { url: ISO_URL, async: true, size: bytes },
        autostart: true,
        boot_order: 0x123, // 0x123 = CD antes que disco
        disable_speaker: true,
        disable_mouse: true,
        /* Sin relay el backend "inbrowser" deja la VM aislada. Alpine trae
           virtio_net compilado, que es justo el driver del tipo "virtio". */
        net_device: netEnabled
          ? { type: 'virtio', relay_url: relay.url }
          : { type: 'virtio', relay_url: 'inbrowser' },
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

      /* La ISO son decenas de MB: v86 pide rangos y emite progreso, que es lo
         que evita que la pagina parezca colgada. */
      const onProgress = (arg: unknown) => {
        const p = arg as { loaded?: number; total?: number }
        if (p?.total) setProgress(Math.round(((p.loaded ?? 0) / p.total) * 100))
      }
      const onStarted = () => setPhase('running')
      emulator.add_listener('download-progress', onProgress)
      emulator.add_listener('emulator-started', onStarted)

      /* Arranque automatizado: login como root, red y herramientas.

         No se depende de un unico evento ni de un unico intento. El flujo se
         guioniza por reintentos porque la VM emulada va lenta y el relay puede
         estar ocupado: antes, un solo fallo dejaba la VM sin IP sin explicar
         nada. Ademas se lee la salida real para decir si ha funcionado. */
      let tail = ''
      let entered = false
      let attempts = 0
      const timers: number[] = []

      const onSerial = (v: unknown) => {
        if (typeof v === 'number') {
          tail = (tail + String.fromCharCode(v)).slice(-600)
          if (/lease of \d+\.\d+\.\d+\.\d+ obtained/i.test(tail)) setNetStatus('ok')
          if (/TOOLS_SKIP/i.test(tail)) setToolsStatus('missing')
          else if (/\(\d+\/\d+\) Installing/i.test(tail)) setToolsStatus('installing')
          else if (/OK: \d+ MiB in \d+ packages/i.test(tail)) setToolsStatus('ready')
        }
      }
      emulator.add_listener('serial0-output-byte', onSerial)

      const later = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms))

      /* Pide IP una vez, y reintenta un par de veces: si el primer udhcpc se
         agota por el relay ocupado, el siguiente lo consigue. */
      const configureNet = () => {
        if (!netEnabled) return
        attempts += 1
        setNetStatus('pending')
        emulator.serial0_send(NET_UP + '\r')
        later(2500, () => emulator.serial0_send(NET_DHCP + '\r'))
        if (attempts < 3) later(70000, configureNet)
      }

      /* Las herramientas vienen DENTRO de la ISO (extra-pkgs) y se instalan
         desde el CD, sin red. Si la carpeta no existe (ISO base en dev), se
         omite en silencio. */
      const installTools = () => {
        if (!custom) {
          setToolsStatus('missing')
          return
        }
        setToolsStatus('installing')
        emulator.serial0_send(TOOLS_INSTALL + '\r')
      }

      const autoLogin = setInterval(() => {
        if (entered || !/login:/i.test(tail)) return
        entered = true
        emulator.serial0_send('root\r')
        // Primero red (es lo que mas tarda en responder), luego herramientas.
        later(7000, configureNet)
        later(20000, installTools)
      }, 400)

      cleanupRef.current = () => {
        clearInterval(autoLogin)
        timers.forEach((t) => window.clearTimeout(t))
        emulator.remove_listener('serial0-output-byte', onSerial)
        emulator.remove_listener('download-progress', onProgress)
        emulator.remove_listener('emulator-started', onStarted)
      }

      /* NO llamar a emulator.run(): con autostart:true v86 ya arranca solo al
         terminar de cargar WASM+BIOS. Invocarlo aqui compite con esa
         inicializacion asincrona y revienta con
         "can't access property run, this.v86 is undefined". */
      setPhase('booting')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setPhase('error')
    }
  }, [busy, running, netEnabled])

  const statusText = {
    idle: 'Apagada',
    loading: `Descargando Alpine… ${progress}%`,
    booting: `Arrancando Linux… ${elapsed}s (suele tardar ~${TYPICAL_BOOT_SECONDS}s)`,
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

      {/* Red — se decide ANTES de arrancar: v86 fija el backend al crear el
          emulador, asi que cambiarla luego exigiria reiniciarlo. Viene
          activada por defecto porque el laboratorio se usa con internet. */}
      {!running && !busy && (
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-800 bg-ink-900/40 px-4 py-3">
          <input
            type="checkbox"
            checked={netEnabled}
            onChange={(e) => {
              setNetEnabled(e.target.checked)
              setNetStatus('off')
            }}
            className="mt-0.5 h-4 w-4 shrink-0 accent-sky-500"
          />
          <span className="text-xs text-zinc-400">
            <span className="font-semibold text-zinc-300">Conectar internet a la VM</span>
            <br />
            El trafico sale por un relay publico de terceros
            (<span className="font-mono text-zinc-500">relay.widgetry.org</span>) con ancho de banda
            limitado. No envies datos personales por aqui. Sin marcar, la VM queda aislada.
          </span>
        </label>
      )}

      {running && relayOk === false && (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/[0.07] px-4 py-3 text-xs text-amber-200">
          El relay no respondia al arrancar: la red puede fallar. Si no sale IP, pulsa «Reintentar
          conexión» o reinicia el laboratorio.
        </p>
      )}

      {running && toolsStatus !== 'unknown' && toolsStatus !== 'missing' && (
        <p className="text-xs text-zinc-500">
          {toolsStatus === 'ready' ? (
            <>Herramientas listas: <span className="font-mono text-zinc-400">vim nano zip tree htop curl git man</span> (vienen en la imagen).</>
          ) : (
            <>Instalando herramientas desde la imagen… (<span className="font-mono text-zinc-400">vim nano git…</span>)</>
          )}
        </p>
      )}

      {netEnabled && running && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-800 bg-ink-900/40 px-4 py-3">
          <span className="flex items-center gap-2 font-mono text-xs">
            <span
              className={cn(
                'inline-block h-2.5 w-2.5 rounded-full',
                netStatus === 'ok' ? 'bg-emerald-500'
                  : netStatus === 'pending' ? 'bg-amber-400 animate-pulse'
                  : 'bg-rose-500',
              )}
              aria-hidden
            />
            <span className="text-zinc-300">
              {netStatus === 'ok' ? 'Red activa' : netStatus === 'pending' ? 'Obteniendo IP…' : 'Sin IP'}
            </span>
          </span>
          {netStatus !== 'ok' && (
            <button
              onClick={() => {
                setNetStatus('pending')
                emulatorRef.current?.serial0_send(NET_UP + '\r')
                window.setTimeout(() => emulatorRef.current?.serial0_send(NET_DHCP + '\r'), 2500)
              }}
              className="rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-sky-200 transition-colors hover:bg-sky-500/20"
            >
              Reintentar conexión
            </button>
          )}
          <span className="text-xs text-zinc-500">
            {netStatus === 'ok' ? (
              <>
                Comprueba con <span className="font-mono text-zinc-400">apk update</span> o{' '}
                <span className="font-mono text-zinc-400">wget -qO- http://dl-cdn.alpinelinux.org/</span>.
                <strong className="text-zinc-500"> No uses ping</strong>: va por ICMP, que el relay no reenvía.
              </>
            ) : (
              <>
                Si no sale IP, escribe en la terminal:{' '}
                <span className="font-mono text-zinc-400">{NET_UP}</span> y luego{' '}
                <span className="font-mono text-zinc-400">udhcpc -i eth0</span>.
              </>
            )}
          </span>
        </div>
      )}

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
                Pulsa «Arrancar laboratorio» para descargarla ({isoMB} MB, solo la primera vez).
              </p>
              {!compact && (
                <p className="mt-3 text-xs text-zinc-500">
                  Entra como <span className="font-mono text-emerald-300">root</span> (sin contraseña).
                  Trae <span className="font-mono text-zinc-400">vim nano zip tree htop curl git man</span> de serie.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-zinc-800/80 bg-zinc-900/50 px-3 py-1.5 font-mono text-[10px] text-zinc-600">
          <span><kbd className="kbd">root</kbd> + <kbd className="kbd">Enter</kbd> para entrar</span>
          <span className="ml-auto">Alpine Linux {alpineLabel} &middot; live y efímero</span>
          {/* GitHub Pages cachea 10 min: este marcador permite saber de un
              vistazo si el navegador esta mostrando el bundle actual. */}
          <span className="w-full text-zinc-700 sm:w-auto" title="Version desplegada">
            build {BUILD_STAMP}
          </span>
        </div>
      </section>
    </div>
  )
}