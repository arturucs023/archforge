import { cn } from '../lib/utils'

export default function ProgressBar({
  value,
  max,
  color = 'bg-sky-500',
  className,
}: {
  value: number
  max: number
  color?: string
  className?: string
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <span
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('block h-2 w-full overflow-hidden rounded-full bg-zinc-800', className)}
    >
      <span className={cn('block h-full rounded-full transition-all duration-500', pct === 100 ? 'bg-emerald-500' : color)} style={{ width: `${pct}%` }} />
    </span>
  )
}
