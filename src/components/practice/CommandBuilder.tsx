import { useState } from 'react'
import { Check, ClipboardCopy } from 'lucide-react'
import { BUILDERS } from '../../data/practice/builders'
import { copyToClipboard, cn } from '../../lib/utils'

export default function CommandBuilder() {
  const [sel, setSel] = useState(BUILDERS[0].cmdId)
  const [on, setOn] = useState<Record<string, boolean>>(() => Object.fromEntries(BUILDERS[0].flags.map((f) => [f.flag, f.on])))
  const [target, setTarget] = useState(BUILDERS[0].targetDefault)
  const [copied, setCopied] = useState(false)

  const def = BUILDERS.find((b) => b.cmdId === sel) ?? BUILDERS[0]

  const pick = (id: string) => {
    const d = BUILDERS.find((b) => b.cmdId === id) ?? BUILDERS[0]
    setSel(d.cmdId)
    setOn(Object.fromEntries(d.flags.map((f) => [f.flag, f.on])))
    setTarget(d.targetDefault)
    setCopied(false)
  }

  const toggle = (flag: string) => setOn((o) => ({ ...o, [flag]: !o[flag] }))

  const active = def.flags.filter((f) => on[f.flag]).map((f) => f.flag)
  const generated = [def.base, ...active, target.trim()].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()

  const copy = async () => {
    if (!generated) return
    if (await copyToClipboard(generated)) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    }
  }

  return (
    <div>
      <p className="text-xs leading-relaxed text-zinc-400">
        Marca opciones reales y verificadas: el comando se genera solo, con explicación de cada flag. Sin ejecución: para practicar de verdad, llévalo a la terminal.
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Comando a construir">
        {BUILDERS.map((b) => (
          <button
            key={b.cmdId}
            onClick={() => pick(b.cmdId)}
            aria-pressed={sel === b.cmdId}
            className={cn(
              'rounded-lg border px-3 py-1.5 font-mono text-xs transition-colors',
              sel === b.cmdId ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-200' : 'border-zinc-800 text-zinc-400 hover:border-zinc-600',
            )}
          >
            {b.cmdId}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-zinc-800 bg-ink-900/70 p-4">
        <h4 className="text-sm font-semibold text-zinc-100">{def.title}</h4>
        <p className="mt-1 text-xs leading-relaxed text-zinc-400">{def.hint}</p>

        <div className="mt-3 space-y-1.5">
          {def.flags.map((f) => {
            const checked = !!on[f.flag]
            return (
              <label
                key={f.flag}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors',
                  checked ? 'border-emerald-500/50 bg-emerald-500/[0.07]' : 'border-zinc-800 bg-black/30 hover:border-zinc-600',
                )}
              >
                <input type="checkbox" checked={checked} onChange={() => toggle(f.flag)} className="sr-only" />
                <span className={cn('mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border', checked ? 'border-emerald-500 bg-emerald-500/25' : 'border-zinc-600 bg-zinc-800')}>
                  {checked && <Check className="h-3 w-3 text-emerald-300" strokeWidth={3} />}
                </span>
                <span className="min-w-0">
                  <span className="block font-mono text-xs font-semibold text-zinc-200">{f.flag} <span className="font-sans font-normal text-zinc-500">· {f.label}</span></span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-zinc-400">{f.desc}</span>
                </span>
              </label>
            )
          })}
        </div>

        <div className="mt-3">
          <label htmlFor="builder-target" className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-zinc-500">{def.targetLabel}</label>
          <input
            id="builder-target"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder={def.targetPlaceholder}
            className="w-full rounded-lg border border-zinc-700 bg-black/40 px-3 py-2 font-mono text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-emerald-500/60"
          />
        </div>

        <div className="mt-3 overflow-hidden rounded-xl border border-emerald-500/30 bg-black/50">
          <div className="flex items-center justify-between gap-2 border-b border-zinc-800/80 px-3 py-1.5">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">Comando generado</span>
            <button onClick={copy} className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-800/70 px-2.5 py-1 text-xs text-zinc-300 hover:border-emerald-500/50 hover:text-emerald-300">
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <ClipboardCopy className="h-3.5 w-3.5" />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
          <pre className="overflow-x-auto px-3 py-3 font-mono text-[13px] leading-6 text-emerald-200">{generated || '—'}</pre>
        </div>
      </div>
    </div>
  )
}
