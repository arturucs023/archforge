import { useState } from 'react'
import { Check, ChevronDown, ClipboardCopy, Eye, KeyRound, ShieldAlert } from 'lucide-react'
import type { CommandBlockT } from '../types'
import { copyText, displayLine, isRootRequired } from '../types'
import { useApp } from '../context/AppContext'
import { copyToClipboard, cn } from '../lib/utils'

function CopyButton({ getText, label = true, className }: { getText: () => string; label?: boolean; className?: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    const text = getText()
    if (!text) return
    const ok = await copyToClipboard(text)
    if (ok) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    }
  }
  return (
    <button
      onClick={handleCopy}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-800/70 px-2.5 py-1 text-xs font-medium text-zinc-300 transition-colors hover:border-sky-500/50 hover:text-sky-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400',
        copied && 'border-emerald-500/50 text-emerald-300',
        className,
      )}
      title="Copiar al portapapeles (sin el prefijo $/#)"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <ClipboardCopy className="h-3.5 w-3.5" />}
      {label && <span>{copied ? 'Copiado' : 'Copiar'}</span>}
    </button>
  )
}

export default function CommandBlock({ block }: { block: CommandBlockT }) {
  const { shellMode } = useApp()
  const [revealed, setRevealed] = useState(!block.dangerous)
  const [showExplain, setShowExplain] = useState(false)

  const anyRootRequired = block.lines.some((l) => isRootRequired(l))
  const toCopy = () => copyText(block.lines, shellMode)

  return (
    <div
      className={cn(
        'theme-dark-zone overflow-hidden rounded-xl border bg-[#0b0e14]',
        block.dangerous ? 'border-rose-600/40' : 'border-zinc-800',
      )}
    >
      {/* Cabecera */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-zinc-800/80 bg-zinc-900/60 px-3 py-1.5">
        <span className={cn('font-mono text-[10px] font-bold uppercase tracking-widest', block.dangerous ? 'text-rose-400' : 'text-zinc-500')}>
          {block.dangerous ? 'Comando peligroso' : 'Comando'}
        </span>
        {block.caption && <span className="truncate text-xs text-zinc-400">· {block.caption}</span>}
        <div className="ml-auto flex items-center gap-2">
          {anyRootRequired && revealed && (
            <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-300">
              <KeyRound className="h-3 w-3" />
              Requiere privilegios de administrador
            </span>
          )}
          {revealed && <CopyButton getText={toCopy} />}
        </div>
      </div>

      {/* Puerta de seguridad para comandos destructivos */}
      {!revealed ? (
        <div className="flex flex-col items-center gap-3 px-4 py-6 text-center">
          <ShieldAlert className="h-7 w-7 text-rose-400" aria-hidden />
          <p className="max-w-md text-sm text-zinc-300">
            Este comando puede ser destructivo (formatear discos, borrar datos…). Léelo con atención antes de mostrarlo.
          </p>
          <button
            onClick={() => setRevealed(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-200 transition-colors hover:bg-rose-500/20"
          >
            <Eye className="h-4 w-4" />
            Mostrar comando
          </button>
        </div>
      ) : (
        <pre className="overflow-x-auto px-3 py-3 font-mono text-[13px] leading-6">
          {block.lines.map((line, i) => {
            const d = displayLine(line, shellMode)
            if (!d) return null
            return (
              <div key={i} className="group/line relative flex whitespace-pre">
                {/* El prefijo es un elemento visual SEPARADO: nunca forma parte del texto copiado */}
                <span className="select-none pr-2 font-semibold text-emerald-400/90">{d.prefix}</span>
                <code className={cn('min-w-0 break-all', d.comment ? 'italic text-zinc-500' : shellMode === 'root' && isRootRequired(line) ? 'text-amber-100' : 'text-zinc-200')}>
                  {d.text}
                </code>
                {!d.comment && (
                  <span className="absolute right-0 top-0 opacity-0 transition-opacity group-hover/line:opacity-100">
                    <CopyButton
                      label={false}
                      getText={() => copyText([line], shellMode)}
                    />
                  </span>
                )}
              </div>
            )
          })}
        </pre>
      )}

      {/* Explicación interactiva del comando */}
      {block.explain && block.explain.length > 0 && (
        <div className="border-t border-zinc-800/80">
          <button
            onClick={() => setShowExplain((v) => !v)}
            className="flex w-full items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:text-sky-300"
          >
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', showExplain && 'rotate-180')} />
            {showExplain ? 'Ocultar explicación' : '¿Qué significa cada parte?'}
          </button>
          {showExplain && (
            <dl className="space-y-1.5 px-4 pb-3 animate-fade-in">
              {block.explain.map((t, i) => (
                <div key={i} className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                  <dt className="shrink-0 font-mono text-xs font-semibold text-sky-300 sm:w-44 sm:truncate">{t.token}</dt>
                  <dd className="text-xs leading-relaxed text-zinc-400">→ {t.meaning}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      )}
    </div>
  )
}
