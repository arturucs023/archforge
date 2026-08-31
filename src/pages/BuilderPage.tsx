import { useState } from 'react'
import {
  ArrowRight,
  Boxes,
  Check,
  Cpu,
  Database,
  ExternalLink,
  Fish,
  Gamepad2,
  HardDrive,
  Hammer,
  LayoutGrid,
  Monitor,
  RotateCcw,
  Server,
  TriangleAlert,
  UserCog,
} from 'lucide-react'
import type { BuilderConfig, BuilderResult, DeChoice, DmChoice, FsChoice, ShellChoice, UseCase } from '../types'
import { IMPORTANCE_LABEL } from '../types'
import Callout from '../components/Callout'
import { useApp } from '../context/AppContext'
import { loadBuilder } from '../data/registry'
import Blocks from '../components/Blocks'
import Breadcrumbs, { PageHeader } from '../components/Breadcrumbs'
import CommandBlock from '../components/CommandBlock'
import { cn } from '../lib/utils'

interface Option<T extends string> {
  value: T
  label: string
  hint?: string
}

function ChoiceGroup<T extends string>({
  title,
  icon: Icon,
  field,
  options,
  config,
  setConfig,
}: {
  title: string
  icon: typeof Cpu
  field: keyof BuilderConfig
  options: Option<T>[]
  config: BuilderConfig
  setConfig: (c: BuilderConfig) => void
}) {
  return (
    <section>
      <h3 className="mb-2.5 flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-zinc-400">
        <Icon className="h-4 w-4 text-sky-400" /> {title}
      </h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => setConfig({ ...config, [field]: o.value })}
            className={cn(
              'group relative rounded-xl border p-3 text-left transition-all',
              config[field] === o.value
                ? 'border-sky-500/60 bg-sky-500/10 shadow-[0_0_16px_rgb(var(--af-sky-500)_/_0.12)]'
                : 'border-zinc-800 bg-ink-900/60 hover:border-zinc-600',
            )}
            aria-pressed={config[field] === o.value}
          >
            <span className={cn('block truncate text-sm font-medium', config[field] === o.value ? 'text-sky-200' : 'text-zinc-300')}>
              {o.label}
            </span>
            {o.hint && <span className="mt-0.5 block truncate text-[11px] leading-snug text-zinc-500">{o.hint}</span>}
            {config[field] === o.value && (
              <Check className="absolute right-2 top-2 h-3.5 w-3.5 text-sky-400" strokeWidth={3} />
            )}
          </button>
        ))}
      </div>
    </section>
  )
}

export default function BuilderPage() {
  const { builderConfig, setBuilderConfig } = useApp()
  const [config, setConfig] = useState<BuilderConfig>(
    builderConfig ?? { cpu: 'amd', fs: 'ext4', bootloader: 'systemd-boot', de: 'kde', dm: 'sddm', shell: 'bash', use: 'general' },
  )
  const [result, setResult] = useState<BuilderResult | null>(null)
  const [loading, setLoading] = useState(false)

  const generate = async () => {
    setLoading(true)
    try {
      const mod = await loadBuilder()
      const res = mod.buildGuide(config)
      setBuilderConfig(config)
      setResult(res)
      window.scrollTo({ top: 0 })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-fade-in">
      <Breadcrumbs items={[{ label: 'Arch Builder' }]} />
      <PageHeader
        icon={<Hammer className="h-6 w-6" />}
        title="Arch Builder"
        subtitle="Responde siete decisiones y ArchForge genera tu ruta personalizada: solo los pasos que aplican a TU hardware y uso. Puedes regenerarla cuando quieras."
      />

      {!result ? (
        <div className="space-y-7 rounded-2xl border border-zinc-800 bg-ink-900/70 p-5 sm:p-6">
          <ChoiceGroup
            title="1 · Gráfica / GPU"
            icon={Cpu}
            field="cpu"
            config={config}
            setConfig={setConfig}
            options={[
              { value: 'nvidia', label: 'NVIDIA', hint: 'drivers propietarios' },
              { value: 'amd', label: 'AMD', hint: 'Mesa, kernel moderno' },
              { value: 'intel', label: 'Intel', hint: 'iGPU, Mesa' },
            ]}
          />
          <ChoiceGroup
            title="2 · Sistema de ficheros"
            icon={Database}
            field="fs"
            config={config}
            setConfig={setConfig}
            options={[
              { value: 'ext4', label: 'ext4', hint: 'simple y robusto' },
              { value: 'btrfs', label: 'Btrfs', hint: 'snapshots y compresión' },
            ]}
          />
          <ChoiceGroup
            title="3 · Bootloader"
            icon={HardDrive}
            field="bootloader"
            config={config}
            setConfig={setConfig}
            options={[
              { value: 'systemd-boot', label: 'systemd-boot', hint: 'minimalista, UEFI' },
              { value: 'grub', label: 'GRUB', hint: 'flexible, dual boot' },
            ]}
          />
          <ChoiceGroup<DeChoice>
            title="4 · Entorno gráfico"
            icon={Monitor}
            field="de"
            config={config}
            setConfig={setConfig}
            options={[
              { value: 'kde', label: 'KDE Plasma', hint: 'completo y pulido' },
              { value: 'gnome', label: 'GNOME', hint: 'minimalista opinado' },
              { value: 'hyprland', label: 'Hyprland', hint: 'tiling Wayland' },
              { value: 'sway', label: 'Sway', hint: 'tiling Wayland ligero' },
              { value: 'i3', label: 'i3', hint: 'tiling X11 clásico' },
              { value: 'xfce', label: 'XFCE', hint: 'clásico ligero X11' },
              { value: 'none', label: 'Ninguno', hint: 'solo TTY/servidor' },
            ]}
          />
          <ChoiceGroup<DmChoice>
            title="5 · Display Manager"
            icon={UserCog}
            field="dm"
            config={config}
            setConfig={setConfig}
            options={[
              { value: 'sddm', label: 'SDDM', hint: 'ideal para KDE/XFCE' },
              { value: 'gdm', label: 'GDM', hint: 'ideal para GNOME' },
              { value: 'greetd', label: 'greetd', hint: 'minimal, para WM' },
              { value: 'none', label: 'Ninguno', hint: 'login en TTY' },
            ]}
          />
          <ChoiceGroup<ShellChoice>
            title="6 · Shell"
            icon={Fish}
            field="shell"
            config={config}
            setConfig={setConfig}
            options={[
              { value: 'bash', label: 'Bash', hint: 'estándar POSIX' },
              { value: 'zsh', label: 'Zsh', hint: 'potente + plugins' },
              { value: 'fish', label: 'Fish', hint: 'amigable por defecto' },
            ]}
          />
          <ChoiceGroup<UseCase>
            title="7 · Uso principal"
            icon={Gamepad2}
            field="use"
            config={config}
            setConfig={setConfig}
            options={[
              { value: 'gaming', label: 'Gaming', hint: 'Steam, Proton, Vulkan' },
              { value: 'dev', label: 'Desarrollo', hint: 'Docker, Git, editores' },
              { value: 'server', label: 'Servidor', hint: 'SSH, firewall, sin GUI' },
              { value: 'general', label: 'Uso general', hint: 'navegar, multimedia' },
              { value: 'workstation', label: 'Workstation', hint: 'ofimática completa' },
              { value: 'minimal', label: 'Minimalista', hint: 'lo justo y necesario' },
            ]}
          />

          <div className="flex flex-wrap items-center gap-3 border-t border-zinc-800 pt-5">
            <button
              onClick={generate}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-6 py-2.5 font-semibold text-ink-950 shadow-lg shadow-sky-500/20 transition-colors hover:bg-sky-400 disabled:opacity-60"
            >
              <Hammer className="h-4 w-4" />
              {loading ? 'Generando…' : 'Generar mi ruta'}
              <ArrowRight className="h-4 w-4" />
            </button>
            <p className="text-xs text-zinc-500">Tu elección se guarda y aparece en el dashboard.</p>
          </div>

          {(config.de !== 'none') !== (config.dm !== 'none') && (
            <CalloutMini>
              Has elegido entorno gráfico sin display manager (o viceversa). Es válido —te explicaremos cómo iniciar la sesión desde el TTY—,
              pero revisa la advertencia que aparecerá en la guía.
            </CalloutMini>
          )}
        </div>
      ) : (
        <BuilderResultView result={result} config={config} onEdit={() => setResult(null)} />
      )}
    </div>
  )
}

function CalloutMini({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-zinc-300">
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
      <p>{children}</p>
    </div>
  )
}

function BuilderResultView({
  result,
  config,
  onEdit,
}: {
  result: BuilderResult
  config: BuilderConfig
  onEdit: () => void
}) {
  return (
    <div className="space-y-6">
      {result.warnings.length > 0 && (
        <div className="space-y-3">
          {result.warnings.map((w, i) => (
            <Callout key={i} variant="warning" title="Revisa esta combinación" text={w} />
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {[
            [Cpu, config.cpu.toUpperCase()],
            [Database, config.fs],
            [Boxes, config.de],
            [Server, config.use],
          ].map(([Icon, v], i) => {
            const I = Icon as typeof Cpu
            return (
              <span key={i} className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 font-mono text-xs text-sky-300">
                <I className="h-3.5 w-3.5" /> {v as string}
              </span>
            )
          })}
        </div>
        <button onClick={onEdit} className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-500">
          <RotateCcw className="h-3.5 w-3.5" /> Editar selección
        </button>
      </div>

      {result.phases.map((phase, pi) => (
        <section key={pi} className="overflow-hidden rounded-2xl border border-zinc-800 bg-ink-900/70">
          <header className="border-b border-zinc-800 bg-zinc-900/50 px-5 py-3">
            <h3 className="font-semibold text-zinc-100">
              <span className="mr-2 font-mono text-xs text-sky-400">FASE {String(pi + 1).padStart(2, '0')}</span>
              {phase.title}
            </h3>
            <p className="mt-0.5 text-xs text-zinc-500">{phase.description}</p>
          </header>
          <ol className="divide-y divide-zinc-800/70">
            {phase.items.map((item, ii) => (
              <li key={ii} className="px-5 py-4">
                <GenItemView item={item} id={`gen-${pi}-${ii}`} />
              </li>
            ))}
          </ol>
        </section>
      ))}

      <Callout
        variant="info"
        title="Esta guía es un mapa"
        text="Cada fase resume QUÉ hacer; los enlaces te llevan a la sección completa con explicaciones, comprobaciones y errores frecuentes. Si algo no cuadra con tu hardware concreto, manda la wiki oficial."
      />
    </div>
  )
}

function GenItemView({ item, id }: { item: import('../types').GenItem; id: string }) {
  const { isDone, toggleDone } = useApp()
  const done = isDone(id)
  return (
    <div>
      <div className="flex items-start gap-3">
        <button
          role="checkbox"
          aria-checked={done}
          onClick={() => toggleDone(id)}
          className={cn(
            'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors',
            done ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300' : 'border-zinc-700 text-transparent hover:border-sky-500/60',
          )}
        >
          <Check className="h-3 w-3" strokeWidth={3} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className={cn('text-sm font-medium', done ? 'text-zinc-500 line-through decoration-zinc-700' : 'text-zinc-100')}>
              {item.title}
            </span>
            {item.importance && <ImportanceChip imp={item.importance} />}
            {item.linkSection && (
              <a
                href={`#/section/${item.linkSection}`}
                className="inline-flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300"
              >
                guía completa <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          {item.detail && <p className="mt-1 text-xs leading-relaxed text-zinc-500">{item.detail}</p>}
          {item.lines && item.lines.length > 0 && (
            <div className="mt-2.5">
              <CommandBlock block={{ type: 'command', lines: item.lines }} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ImportanceChip({ imp }: { imp: string }) {
  return (
    <span className="rounded-md border border-zinc-700/60 bg-zinc-800/40 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-zinc-400">
      {IMPORTANCE_LABEL[imp as keyof typeof IMPORTANCE_LABEL]}
    </span>
  )
}
