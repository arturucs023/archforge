import { cn } from '../lib/utils'

/** Tooltip CSS puro: aparece al hacer hover o focus sobre el elemento hermano. */
export default function Tooltip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      role="tooltip"
      className={cn(
        'pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-max max-w-[260px] -translate-x-1/2 scale-95 rounded-lg border border-zinc-700 bg-ink-800 px-3 py-1.5 text-xs leading-snug text-zinc-200 opacity-0 shadow-xl shadow-black/50 transition-all duration-150 group-hover/badge:scale-100 group-hover/badge:opacity-100 group-focus-within/badge:scale-100 group-focus-within/badge:opacity-100',
        className,
      )}
    >
      {children}
    </span>
  )
}
