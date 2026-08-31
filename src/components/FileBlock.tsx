import { useState } from 'react'
import { Check, ClipboardCopy } from 'lucide-react'
import type { FileBlock } from '../types'
import { copyToClipboard } from '../lib/utils'

export default function FileBlockView({ block }: { block: FileBlock }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    const ok = await copyToClipboard(block.content)
    if (ok) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    }
  }
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 theme-dark-zone bg-[#0b0e14]">
      <div className="flex items-center gap-2 border-b border-zinc-800/80 bg-zinc-900/60 px-3 py-1.5">
        <span className="truncate font-mono text-xs text-zinc-300">{block.filename}</span>
        {block.note && <span className="hidden truncate text-[11px] text-zinc-500 sm:inline">· {block.note}</span>}
        <button
          onClick={copy}
          className={`ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
            copied
              ? 'border-emerald-500/50 text-emerald-300'
              : 'border-zinc-700 bg-zinc-800/70 text-zinc-300 hover:border-sky-500/50 hover:text-sky-300'
          }`}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <ClipboardCopy className="h-3.5 w-3.5" />}
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      <pre className="overflow-x-auto px-4 py-3 font-mono text-xs leading-6 text-zinc-300">{block.content}</pre>
    </div>
  )
}
