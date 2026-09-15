import { cn } from '../lib/utils'

/** Tooltip CSS puro: aparece al hacer hover o focus sobre el elemento hermano.
    `hidden` (no solo opacity-0): oculto no ocupa nada — ni expande el scroll
    horizontal (bug real medido: +6px en todas las páginas) ni lo anuncian
    lectores de pantalla. Aparece instantáneo, como los title nativos. */
export default function Tooltip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      role="tooltip"
      className={cn(
        'pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden w-max max-w-[260px] -translate-x-1/2 rounded-lg border border-zinc-700 bg-ink-800 px-3 py-1.5 text-xs leading-snug text-zinc-200 shadow-xl shadow-black/50 group-hover/badge:block group-focus-within/badge:block',
        className,
      )}
    >
      {children}
    </span>
  )
}
