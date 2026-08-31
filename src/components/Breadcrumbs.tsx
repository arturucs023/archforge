import { ChevronRight, Home } from 'lucide-react'
import { navigate } from '../lib/router'
import type { ReactNode } from 'react'

export interface Crumb {
  label: string
  to?: string
}

export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Migas de pan" className="flex flex-wrap items-center gap-1 text-xs text-zinc-500">
      <button onClick={() => navigate('/')} className="flex items-center gap-1 rounded px-1 py-0.5 transition-colors hover:text-sky-300">
        <Home className="h-3.5 w-3.5" /> Dashboard
      </button>
      {items.map((c, i) => (
        <span key={i} className="flex items-center gap-1">
          <ChevronRight className="h-3 w-3 text-zinc-700" />
          {c.to ? (
            <button onClick={() => navigate(c.to!)} className="rounded px-1 py-0.5 transition-colors hover:text-sky-300">
              {c.label}
            </button>
          ) : (
            <span className="px-1 py-0.5 text-zinc-300">{c.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}

export function PageHeader({ title, subtitle, icon, actions }: { title: ReactNode; subtitle?: ReactNode; icon?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3">
        {icon && (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-sky-500/25 bg-sky-500/10 text-sky-400">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-zinc-50 sm:text-2xl">{title}</h1>
          {subtitle && <p className="mt-1 max-w-3xl text-sm leading-relaxed text-zinc-400">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}
