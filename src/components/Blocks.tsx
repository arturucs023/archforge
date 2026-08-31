import { TerminalSquare } from 'lucide-react'
import type { Block, Level } from '../types'
import { LEVEL_RANK } from '../types'
import { useApp } from '../context/AppContext'
import Callout from './Callout'
import CommandBlock from './CommandBlock'
import FileBlockView from './FileBlock'

function visible(minLevel: Level | undefined, current: Level): boolean {
  return LEVEL_RANK[current] >= LEVEL_RANK[minLevel ?? 'beginner']
}

export default function Blocks({ blocks }: { blocks?: Block[] }) {
  const { level } = useApp()
  if (!blocks || blocks.length === 0) return null
  return (
    <div className="space-y-4">
      {blocks.map((b, i) => {
        if (!visible(b.minLevel, level)) return null
        switch (b.type) {
          case 'paragraph':
            return (
              <p key={i} className="text-sm leading-relaxed text-zinc-300">
                {b.text}
              </p>
            )
          case 'heading':
            return (
              <h4 key={i} className="pt-2 font-mono text-sm font-bold uppercase tracking-wider text-zinc-100">
                <TerminalSquare className="mr-1.5 inline h-4 w-4 text-sky-400" />
                {b.text}
              </h4>
            )
          case 'list':
            return b.ordered ? (
              <ol key={i} className="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-zinc-300 marker:font-mono marker:text-sky-400">
                {b.items.map((it, j) => (
                  <li key={j} className="pl-1">{it}</li>
                ))}
              </ol>
            ) : (
              <ul key={i} className="space-y-1.5 pl-1 text-sm leading-relaxed text-zinc-300">
                {b.items.map((it, j) => (
                  <li key={j} className="flex gap-2">
                    <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-sm bg-sky-400/70" />
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            )
          case 'command':
            return <CommandBlock key={i} block={b} />
          case 'output':
            return (
              <div key={i} className="overflow-hidden rounded-xl border border-zinc-800/70 bg-black/40">
                <div className="border-b border-zinc-800/60 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                  Salida{b.caption ? ` — ${b.caption}` : ''}
                </div>
                <pre className="overflow-x-auto px-4 py-3 font-mono text-xs leading-6 text-zinc-400">{b.lines.join('\n')}</pre>
              </div>
            )
          case 'callout':
            return <Callout key={i} variant={b.variant} title={b.title} text={b.text} />
          case 'table':
            return (
              <div key={i} className="overflow-x-auto rounded-xl border border-zinc-800">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-900/70">
                      {b.headers.map((hd, j) => (
                        <th key={j} className="px-3 py-2 font-mono text-xs font-semibold uppercase tracking-wider text-zinc-400">{hd}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((row, j) => (
                      <tr key={j} className="border-b border-zinc-800/50 last:border-0 odd:bg-zinc-900/20">
                        {row.map((cell, k) => (
                          <td key={k} className={`px-3 py-2 align-top ${k === 0 ? 'font-medium text-zinc-200' : 'text-zinc-400'}`}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          case 'internals':
            return (
              <div key={i} className="rounded-xl border border-violet-500/25 bg-violet-500/5 p-4 animate-fade-in">
                <div className="mb-1.5 inline-flex items-center gap-2 rounded-md border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-violet-300">
                  Profundización técnica
                </div>
                <h5 className="font-semibold text-violet-200">{b.title}</h5>
                <p className="mt-1 text-sm leading-relaxed text-zinc-300">{b.text}</p>
                {b.points && (
                  <ul className="mt-2 space-y-1.5 text-sm text-zinc-400">
                    {b.points.map((pt, j) => (
                      <li key={j} className="flex gap-2">
                        <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-violet-400" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          case 'file':
            return <FileBlockView key={i} block={b} />
          default:
            return null
        }
      })}
    </div>
  )
}
