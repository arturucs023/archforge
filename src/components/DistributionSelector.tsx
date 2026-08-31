import type { DistroView } from '../types'
import { useApp } from '../context/AppContext'
import { cn } from '../lib/utils'

const OPTIONS: { value: DistroView; label: string }[] = [
  { value: 'arch', label: 'Arch' },
  { value: 'debian', label: 'Debian/Ubuntu' },
  { value: 'all', label: 'Ambas' },
]

export default function DistributionSelector() {
  const { distroView, setDistroView } = useApp()
  return (
    <div className="inline-flex items-center overflow-hidden rounded-lg border border-zinc-800" role="radiogroup" aria-label="Filtrar por distribución">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={distroView === o.value}
          onClick={() => setDistroView(o.value)}
          title={
            o.value === 'all'
              ? 'Muestra comandos de todas las distribuciones'
              : o.value === 'arch'
                ? 'Solo comandos aplicables a Arch Linux (pacman, yay…)'
                : 'Solo comandos aplicables a Debian y Ubuntu (apt, dpkg…)'
          }
          className={cn(
            'px-3 py-1.5 font-mono text-xs font-medium transition-colors',
            distroView === o.value ? 'bg-sky-500/15 text-sky-300' : 'text-zinc-500 hover:text-zinc-300',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
