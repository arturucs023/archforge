import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, BookOpen, Bug, Command as CommandIcon, Scale, Search, Server, SquareTerminal, Terminal, Activity } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { navigate } from '../lib/router'
import { cn } from '../lib/utils'
import { REGISTRY } from '../data/registry'
import { COMPARISONS } from '../data/comparisons'
import { PROBLEMS } from '../data/troubleshooting'
import { DIAG_COMMANDS } from '../data/statusChecks'
import { GLOSSARY } from '../data/glossary'
import { COMMANDS } from '../data/cmdcenter/entries'
import { CONCEPTS } from '../data/learnData'
import { BASH_MODULES } from '../data/bashcourse'
import { SERVER_COURSES } from '../data/servers'

interface Entry {
  type: 'section' | 'step' | 'command' | 'problem' | 'compare' | 'diag' | 'term' | 'cmd' | 'concept' | 'lesson' | 'server'
  title: string
  subtitle: string
  to: string
  haystack: string
}

const TYPE_META: Record<Entry['type'], { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  section: { label: 'Sección', icon: BookOpen, color: 'text-sky-400' },
  step: { label: 'Paso', icon: Terminal, color: 'text-sky-300' },
  command: { label: 'Comando', icon: SquareTerminal, color: 'text-emerald-400' },
  problem: { label: 'Problema', icon: Bug, color: 'text-rose-400' },
  compare: { label: 'Comparativa', icon: Scale, color: 'text-violet-400' },
  diag: { label: 'Diagnóstico', icon: Activity, color: 'text-amber-400' },
  term: { label: 'Concepto', icon: CommandIcon, color: 'text-zinc-300' },
  cmd: { label: 'Comando', icon: SquareTerminal, color: 'text-emerald-300' },
  concept: { label: 'Fundamento', icon: BookOpen, color: 'text-violet-300' },
  lesson: { label: 'Curso Bash', icon: SquareTerminal, color: 'text-teal-300' },
  server: { label: 'Curso servidor', icon: Server, color: 'text-cyan-300' },
}

let INDEX_CACHE: Entry[] | null = null

function buildIndex(): Entry[] {
  if (INDEX_CACHE) return INDEX_CACHE
  const entries: Entry[] = []
  for (const s of REGISTRY) {
    entries.push({
      type: 'section',
      title: s.title,
      subtitle: s.lead.slice(0, 90) + (s.lead.length > 90 ? '…' : ''),
      to: `/section/${s.id}`,
      haystack: `${s.title} ${s.id} ${(s.keywords ?? []).join(' ')}`.toLowerCase(),
    })
    for (const st of s.steps ?? []) {
      entries.push({
        type: 'step',
        title: `${s.title} — ${st.title}`,
        subtitle: st.goal,
        to: `/section/${s.id}?s=${st.id}`,
        haystack: `${st.title} ${st.goal}`.toLowerCase(),
      })
    }
  }
  for (const c of COMPARISONS) {
    entries.push({
      type: 'compare',
      title: c.title,
      subtitle: c.question,
      to: `/compare/${c.id}`,
      haystack: `${c.title} ${c.options.map((o) => o.name).join(' ')}`.toLowerCase(),
    })
  }
  for (const pr of PROBLEMS) {
    entries.push({
      type: 'problem',
      title: pr.title,
      subtitle: pr.symptoms[0],
      to: `/troubleshooting/${pr.id}`,
      haystack: `${pr.title} ${pr.category} ${pr.symptoms.join(' ')} ${pr.causes.join(' ')}`.toLowerCase(),
    })
  }
  for (const d of DIAG_COMMANDS) {
    entries.push({
      type: 'diag',
      title: d.cmd,
      subtitle: d.what,
      to: `/status-checker?q=${encodeURIComponent(d.cmd)}`,
      haystack: `${d.cmd} ${d.what}`.toLowerCase(),
    })
  }
  for (const g of GLOSSARY) {
    entries.push({
      type: 'term',
      title: g.term,
      subtitle: g.definition,
      to: '/expert',
      haystack: `${g.term} ${g.definition}`.toLowerCase(),
    })
  }
  for (const c of COMMANDS) {
    entries.push({
      type: 'cmd',
      title: c.name,
      subtitle: c.summary,
      to: `/commands?focus=${encodeURIComponent(c.id)}`,
      haystack: `${c.name} ${c.summary} ${c.intents.join(' ')}`.toLowerCase(),
    })
  }
  for (const cn of CONCEPTS) {
    entries.push({
      type: 'concept',
      title: `Aprender Linux - ${cn.title}`,
      subtitle: cn.simple,
      to: `/learn/${cn.id}`,
      haystack: `${cn.title} ${cn.simple} ${cn.technical}`.toLowerCase(),
    })
  }
  for (const m of BASH_MODULES) {
    entries.push({
      type: 'lesson',
      title: `Curso Bash - ${m.num}. ${m.title}`,
      subtitle: m.goals[0],
      to: `/bash/${m.id}`,
      haystack: `${m.title} ${m.goals.join(' ')} ${m.simple.join(' ')}`.toLowerCase(),
    })
  }
  for (const c of SERVER_COURSES) {
    entries.push({
      type: 'server',
      title: `${c.icon} ${c.title} (curso)`,
      subtitle: c.tagline,
      to: `/servers/${c.id}`,
      haystack: `${c.title} ${c.tagline} ${c.keywords.join(' ')}`.toLowerCase(),
    })
    for (const m of c.modules) {
      entries.push({
        type: 'server',
        title: `Servidores · ${c.title} — ${m.num}. ${m.title}`,
        subtitle: m.goals[0] ?? '',
        to: `/servers/${c.id}/${m.id}`,
        haystack: `${c.id} ${c.title} ${m.num}. ${m.title} ${(c.keywords ?? []).join(' ')}`.toLowerCase(),
      })
    }
    entries.push({
      type: 'server',
      title: `🧪 Laboratorio ${c.title}`,
      subtitle: c.lab.objective,
      to: `/servers/${c.id}/lab`,
      haystack: `laboratorio lab practica ${c.id} ${c.title} ${c.keywords.join(' ')}`.toLowerCase(),
    })
  }

  // Comandos ejecutables dentro del contenido
  for (const s of REGISTRY) {
    const cmds = new Set<string>()
    for (const st of s.steps ?? []) {
      for (const b of st.blocks) if (b.type === 'command') b.lines.forEach((l) => l.kind === 'run' && cmds.add(l.user))
      ;(st.verify ?? []).forEach((b) => b.type === 'command' && b.lines.forEach((l) => l.kind === 'run' && cmds.add(l.user)))
    }
    ;(s.blocks ?? []).forEach((b) => b.type === 'command' && b.lines.forEach((l) => l.kind === 'run' && cmds.add(l.user)))
    for (const c of cmds) {
      entries.push({
        type: 'command',
        title: c,
        subtitle: `en ${s.title}`,
        to: `/section/${s.id}`,
        haystack: c.toLowerCase(),
      })
    }
  }

  INDEX_CACHE = entries
  return entries
}

function score(e: Entry, q: string): number {
  const title = e.title.toLowerCase()
  let s = 0
  if (title === q) s += 100
  else if (title.startsWith(q)) s += 50
  else if (title.includes(q)) s += 25
  if (e.haystack.includes(q)) s += 10
  return s > 0 ? s : -1
}

export default function SearchModal() {
  const { searchOpen, setSearchOpen } = useApp()
  const [query, setQuery] = useState('')
  const [entries, setEntries] = useState<Entry[]>([])
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'k') {
        ev.preventDefault()
        setSearchOpen(true)
      }
      if (ev.key === 'Escape') setSearchOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setSearchOpen])

  useEffect(() => {
    if (searchOpen) {
      setQuery('')
      setSelected(0)
      setEntries(buildIndex())
      window.setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [searchOpen])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return entries
      .map((e) => ({ e, sc: score(e, q) }))
      .filter((r) => r.sc > 0)
      .sort((a, b) => b.sc - a.sc)
      .slice(0, 24)
      .map((r) => r.e)
  }, [query, entries])

  useEffect(() => setSelected(0), [results.length])

  useEffect(() => {
    const el = listRef.current?.children[selected] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [selected])

  if (!searchOpen) return null

  const go = (e?: Entry) => {
    const target = e ?? results[selected]
    if (!target) return
    setSearchOpen(false)
    navigate(target.to)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[10vh]" role="dialog" aria-modal="true" aria-label="Búsqueda global">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSearchOpen(false)} />
      <div className="relative flex max-h-[70vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-zinc-700 bg-ink-850 shadow-2xl shadow-black/60 animate-scale-in">
        <div className="flex items-center gap-2 border-b border-zinc-800 px-4">
          <Search className="h-4 w-4 shrink-0 text-zinc-500" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setSelected((s) => Math.min(s + 1, results.length - 1)) }
              if (e.key === 'ArrowUp') { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)) }
              if (e.key === 'Enter') go()
            }}
            placeholder="p. ej. mkfs.btrfs, no tengo internet, ext4 vs btrfs…"
            className="h-12 w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-600 outline-none"
          />
          <kbd className="hidden shrink-0 rounded border border-zinc-700 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500 sm:inline">ESC</kbd>
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto p-2">
          {!query && (
            <div className="px-3 py-8 text-center text-sm text-zinc-500">
              Busca comandos (<code className="font-mono text-zinc-400">pacman -Syu</code>), paquetes, problemas
              (<code className="font-mono text-zinc-400">no tengo audio</code>), comparativas y conceptos.
            </div>
          )}
          {query && results.length === 0 && (
            <div className="px-3 py-8 text-center text-sm text-zinc-500">Sin resultados para «{query}».</div>
          )}
          {results.map((r, i) => {
            const meta = TYPE_META[r.type]
            const Icon = meta.icon
            return (
              <button
                key={`${r.type}-${r.title}-${i}`}
                onClick={() => go(r)}
                onMouseEnter={() => setSelected(i)}
                className={cn(
                  'flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left transition-colors',
                  i === selected ? 'bg-sky-500/10' : '',
                )}
              >
                <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', meta.color)} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-zinc-200">{r.title}</span>
                  <span className="block truncate text-xs text-zinc-500">{r.subtitle}</span>
                </span>
                <span className={cn('shrink-0 pt-0.5 font-mono text-[10px] uppercase tracking-wider', meta.color)}>{meta.label}</span>
                {i === selected && <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-sky-400" />}
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-4 border-t border-zinc-800 px-4 py-2 font-mono text-[10px] text-zinc-600">
          <span>↑↓ navegar</span>
          <span>↵ abrir</span>
          <span>esc cerrar</span>
        </div>
      </div>
    </div>
  )
}
