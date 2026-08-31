import { useRef, useState } from 'react'
import { Check, Download, Info, Moon, Palette, RotateCcw, Save, Sun, Trash2, Upload } from 'lucide-react'
import { Monitor } from 'lucide-react'
import { useApp } from '../context/AppContext'
import Breadcrumbs, { PageHeader } from '../components/Breadcrumbs'
import { LEVEL_LABEL, LEVEL_RANK } from '../types'
import type { Level } from '../types'
import { download, cn } from '../lib/utils'
import { ACCENTS, applyAccent, DEFAULT_ACCENT, loadAccent, saveAccent } from '../lib/accent'
import type { AccentId } from '../lib/accent'
import { loadTheme, setTheme } from '../lib/theme'
import type { ThemeMode } from '../lib/theme'
import { loadCursorMode, setCursorMode } from '../lib/cursor'
import type { CursorMode } from '../lib/cursor'
import ProgressBar from '../components/ProgressBar'

export default function SettingsPage() {
  const { level, setLevel, shellMode, setShellMode, resetProgress, exportProgress, importProgress } = useApp()
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [accent, setAccent] = useState<AccentId>(() => loadAccent())
  const [theme, setThemeState] = useState<ThemeMode>(() => loadTheme())
  const [cursorMode, setCursorModeState] = useState<CursorMode>(() => loadCursorMode())

  const flash = (m: string) => {
    setMsg(m)
    window.setTimeout(() => setMsg(null), 2500)
  }

  const pickAccent = (id: AccentId) => {
    setAccent(id)
    applyAccent(id) // en vivo, sin recarga
    saveAccent(id)
  }

  const onImport = (f: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const ok = importProgress(String(reader.result))
      flash(ok ? 'Progreso importado correctamente.' : 'El archivo no tiene un formato válido.')
    }
    reader.readAsText(f)
  }

  return (
    <div className="animate-fade-in">
      <Breadcrumbs items={[{ label: 'Ajustes' }]} />
      <PageHeader
        icon={<Save className="h-6 w-6" />}
        title="Ajustes"
        subtitle="Preferencias de aprendizaje y gestión de tu progreso. Todo se guarda localmente en este navegador: nada sale de tu equipo."
      />

      {msg && (
        <div className="mb-4 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-2.5 text-sm text-sky-200 animate-fade-in">{msg}</div>
      )}

      <section className="rounded-2xl border border-zinc-800 bg-ink-900/70 p-5 sm:p-6">
        <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-zinc-400">Modo de aprendizaje</h2>
        <p className="mt-1 mb-4 max-w-3xl text-sm leading-relaxed text-zinc-400">
          Controla cuánta profundidad técnica ves en toda la aplicación. Puedes cambiarlo en cualquier momento.
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          {(['beginner', 'intermediate', 'expert'] as Level[]).map((l) => (
            <button
              key={l}
              onClick={() => setLevel(l)}
              aria-pressed={level === l}
              className={cn(
                'rounded-xl border p-4 text-left transition-all',
                level === l ? 'border-sky-500/60 bg-sky-500/10' : 'border-zinc-800 bg-ink-900/60 hover:border-zinc-600',
              )}
            >
              <span className="flex items-center gap-2 font-semibold text-zinc-100">
                <Dot color={['bg-emerald-400', 'bg-amber-400', 'bg-rose-400'][LEVEL_RANK[l]]} />
                {LEVEL_LABEL[l]}
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-zinc-500">
                {l === 'beginner' && 'Explicaciones muy claras, paso a paso, sin asumir conocimientos previos.'}
                {l === 'intermediate' && 'Añade paneles de «Profundización técnica» con detalles de cómo funciona cada pieza.'}
                {l === 'expert' && 'Incluye el funcionamiento interno: systemd, initramfs, módulos del kernel, sysctl…'}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-zinc-800 bg-ink-900/70 p-5 sm:p-6">
        <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-zinc-400">
          <Palette className="h-4 w-4 text-sky-400" /> Apariencia · 🎨 Color de acento
        </h2>
        <p className="mt-1 mb-4 max-w-3xl text-sm leading-relaxed text-zinc-400">
          Cambia el tema de la interfaz y el color de acento (sidebar, botones, enlaces, progreso, badges y cursor) en tiempo real.
          Sky es el acento predeterminado de ArchForge; las terminales simuladas permanecen oscuras por convención.
        </p>

        {/* Tema: Claro / Oscuro / Sistema */}
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Tema de la interfaz">
          {(
            [
              ['light', 'Claro', Sun],
              ['dark', 'Oscuro', Moon],
              ['system', 'Sistema', Monitor],
            ] as [ThemeMode, string, typeof Sun][]
          ).map(([mode, label, Icon]) => {
            const active = theme === mode
            return (
              <button
                key={mode}
                role="radio"
                aria-checked={active}
                onClick={() => { setThemeState(mode); setTheme(mode) }}
                className={cn(
                  'inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-all',
                  active ? 'border-sky-500/60 bg-sky-500/10 text-zinc-100' : 'border-zinc-800 bg-ink-900/60 text-zinc-400 hover:border-zinc-600',
                )}
              >
                <Icon className={cn('h-4 w-4', active ? 'text-sky-400' : 'text-zinc-500')} aria-hidden />
                {label}
              </button>
            )
          })}
        </div>

        <h3 id="accent-picker" className="mt-6 mb-2 font-mono text-[10px] uppercase tracking-widest text-zinc-600">
          🖱️ Cursor de ArchForge
        </h3>
        <div className="flex max-w-md items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-ink-900/60 p-3.5">
          <div className="min-w-0">
            <p className="text-sm font-medium text-zinc-200">Cursor personalizado</p>
            <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">
              Flecha y haz de texto con el color de acento. Al desactivarlo se usan los cursores nativos de tu sistema.
            </p>
          </div>
          <button
            role="switch"
            aria-checked={cursorMode === 'custom'}
            aria-label="Cursor personalizado de ArchForge"
            onClick={() => {
              const next: CursorMode = cursorMode === 'custom' ? 'system' : 'custom'
              setCursorModeState(next)
              setCursorMode(next)
            }}
            title={cursorMode === 'custom' ? 'Activado — clic para usar el cursor del sistema' : 'Desactivado — clic para activar el cursor de ArchForge'}
            className={cn(
              'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors',
              cursorMode === 'custom' ? 'border-sky-500/60 bg-sky-500/25' : 'border-zinc-700 bg-zinc-800/70',
            )}
          >
            <span
              aria-hidden
              className={cn(
                'absolute h-[18px] w-[18px] rounded-full transition-transform',
                cursorMode === 'custom' ? 'translate-x-[24px] bg-sky-400' : 'translate-x-[3px] bg-zinc-400',
              )}
            />
          </button>
        </div>

        <h3 id="accent-picker" className="mt-6 mb-2 font-mono text-[10px] uppercase tracking-widest text-zinc-600">
          🎨 Color de acento
        </h3>
        <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Color de acento">
          {ACCENTS.map((a) => {
            const active = accent === a.id
            return (
              <button
                key={a.id}
                role="radio"
                aria-checked={active}
                onClick={() => pickAccent(a.id)}
                title={a.label}
                className={cn(
                  'group flex items-center gap-2.5 rounded-xl border px-3.5 py-2 transition-all',
                  active ? 'border-sky-500/60 bg-sky-500/10' : 'border-zinc-800 bg-ink-900/60 hover:border-zinc-600',
                )}
              >
                <span
                  aria-hidden
                  className="relative inline-flex h-5 w-5 items-center justify-center rounded-full border border-black/40"
                  style={{ background: a.swatch }}
                >
                  {active && <Check className="h-3 w-3 text-ink-950" strokeWidth={3.5} />}
                </span>
                <span className={cn('text-sm font-medium', active ? 'text-zinc-100' : 'text-zinc-400 group-hover:text-zinc-200')}>{a.label}</span>
                {a.id === DEFAULT_ACCENT && (
                  <span className="rounded border border-zinc-700 bg-zinc-800/60 px-1 py-0.5 font-mono text-[9px] uppercase tracking-wider text-zinc-400">default</span>
                )}
              </button>
            )
          })}
        </div>

        {accent !== DEFAULT_ACCENT && (
          <button
            onClick={() => pickAccent(DEFAULT_ACCENT)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-sky-500/50 hover:text-sky-300"
          >
            <RotateCcw className="h-3 w-3" /> Restaurar «Predeterminado de ArchForge» (Sky)
          </button>
        )}

        {/* Previsualización en vivo */}
        <div className="mt-5 max-w-md rounded-2xl border border-zinc-800 bg-ink-950 p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">previsualización</p>
          <div className="mt-3 flex items-center gap-2">
            <svg viewBox="0 0 32 32" className="h-6 w-6 shrink-0" aria-hidden>
              <rect width="32" height="32" rx="7" fill="#0d0d15" stroke="#2e2e42" />
              <path d="M16 5L4 26h24L16 5z" fill="none" stroke="rgb(var(--af-sky-400))" strokeWidth="2.4" strokeLinejoin="round" />
            </svg>
            <span className="font-mono text-sm font-bold text-zinc-100">ArchForge</span>
            <span className="ml-auto rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-300">Botón</span>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <ProgressBar value={68} max={100} className="w-full" />
            <span className="font-mono text-[10px] tabular-nums text-sky-300">progreso</span>
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-sky-300 underline decoration-dotted underline-offset-2">
            enlace de ejemplo · ✓ elemento seleccionado
          </p>
        </div>

        <p className="mt-3 flex items-start gap-1.5 text-xs leading-relaxed text-zinc-500">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          La preferencia se guarda en este navegador (clave archforge:accent-color) y el cursor adopta el contorno del acento elegido.
        </p>
      </section>

      <section className="mt-5 rounded-2xl border border-zinc-800 bg-ink-900/70 p-5 sm:p-6">
        <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-zinc-400">Modo de comandos por defecto</h2>
        <p className="mt-1 mb-4 max-w-3xl text-sm leading-relaxed text-zinc-400">
          Afecta a todos los bloques de comandos de la app. El prefijo ($ o #) es solo visual: al copiar nunca se incluye.
        </p>
        <div className="flex gap-3">
          {(['user', 'root'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setShellMode(m)}
              aria-pressed={shellMode === m}
              className={cn(
                'flex items-center gap-2 rounded-xl border px-4 py-2.5 transition-colors',
                shellMode === m ? 'border-sky-500/60 bg-sky-500/10 text-sky-200' : 'border-zinc-800 text-zinc-400 hover:border-zinc-600',
              )}
            >
              <span className={cn('font-mono text-lg font-bold', m === 'user' ? 'text-emerald-400' : 'text-emerald-300')}>{m === 'user' ? '$' : '#'}</span>
              <span className="text-sm font-medium">{m === 'user' ? 'Usuario normal' : 'Root (sin sudo)'}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-zinc-800 bg-ink-900/70 p-5 sm:p-6">
        <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-zinc-400">Tu progreso</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={() => {
              download('archforge-progreso.json', exportProgress())
              flash('Archivo de progreso descargado.')
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 transition-colors hover:border-sky-500/50 hover:text-sky-300"
          >
            <Download className="h-4 w-4" /> Exportar
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 transition-colors hover:border-sky-500/50 hover:text-sky-300"
          >
            <Upload className="h-4 w-4" /> Importar
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onImport(f)
              e.target.value = ''
            }}
          />
          <ConfirmReset onReset={() => { resetProgress(); flash('Progreso reiniciado.') }} />
        </div>
        <p className="mt-3 flex items-start gap-1.5 text-xs leading-relaxed text-zinc-500">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Exporta tu progreso antes de limpiar el navegador o cambiar de equipo: el archivo JSON contiene pasos completados,
          configuración del Builder y preferencias.
        </p>
      </section>

      <section className="mt-5 rounded-2xl border border-zinc-800/60 bg-ink-900/40 p-5 text-sm leading-relaxed text-zinc-400">
        <h2 className="mb-2 font-mono text-xs font-bold uppercase tracking-widest text-zinc-500">Acerca de ArchForge</h2>
        <p>
          ArchForge v1.0 · guía interactiva educativa para Arch Linux. Contenido redactado a partir de las prácticas recomendadas de la
          comunidad; Arch Linux es un sistema rolling release, así que los procedimientos concretos pueden evolucionar: cuando dudes,
          contrasta con <span className="font-mono text-zinc-300">wiki.archlinux.org</span>. Esta herramienta no ejecuta comandos ni se
          conecta a tu sistema: todo ocurre en tu navegador.
        </p>
      </section>
    </div>
  )
}

function Dot({ color }: { color: string }) {
  return <span className={cn('inline-block h-2.5 w-2.5 rounded-full', color)} />
}

function ConfirmReset({ onReset }: { onReset: () => void }) {
  const [confirming, setConfirming] = useState(false)
  if (!confirming)
    return (
      <button
        onClick={() => setConfirming(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 transition-colors hover:border-rose-500/50 hover:text-rose-300"
      >
        <RotateCcw className="h-4 w-4" /> Reiniciar progreso
      </button>
    )
  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <span className="text-zinc-400">¿Borrar todo?</span>
      <button
        onClick={() => {
          onReset()
          setConfirming(false)
        }}
        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/50 bg-rose-500/10 px-3 py-2 font-medium text-rose-300 hover:bg-rose-500/20"
      >
        <Trash2 className="h-4 w-4" /> Confirmar
      </button>
      <button onClick={() => setConfirming(false)} className="rounded-lg border border-zinc-700 px-3 py-2 text-zinc-400 hover:text-zinc-200">
        Cancelar
      </button>
    </span>
  )
}
