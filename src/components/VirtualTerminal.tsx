import { useEffect, useMemo, useRef, useState } from 'react'
import { Eraser, FlaskConical, RotateCcw, Save, X } from 'lucide-react'
import { ShellSession } from '../cli/engine'
import type { Distro, TermLine } from '../cli/engine'
import { LABS } from '../cli/labs'
import type { Lab } from '../cli/labs'
import { useApp } from '../context/AppContext'
import { cn } from '../lib/utils'

const LS_KEY = 'archforge:terminal-session'
const LS_DISTRO = 'archforge:term-distro'

export interface VirtualTerminalProps {
  /** altura máxima del área de salida */
  height?: string
  /** ficheros extra sobre el FS base (lecciones) */
  seedFiles?: Record<string, string>
  /** objetivos sugeridos mostrados bajo la terminal */
  tasks?: string[]
  intro?: string
  compact?: boolean
  /** sesión nueva y efímera: no carga ni guarda en localStorage (lecciones) */
  isolated?: boolean
  /** sesión EXTERNA controlada por el padre (diagnósticos guiados) */
  session?: ShellSession
  /** semilla con privilegios de root aplicada tras montar el FS */
  rootSeed?: (vfs: import('../cli/fs').VFS) => void
}

function loadSession(): ShellSession {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return ShellSession.load(JSON.parse(raw))
  } catch { /* corrupto → nuevo */ }
  return new ShellSession()
}

export default function VirtualTerminal({ height = '22rem', seedFiles, tasks, intro, compact, isolated, session: externalSession, rootSeed }: VirtualTerminalProps) {
  const sessionRef = useRef<ShellSession | null>(null)
  if (!sessionRef.current) {
    sessionRef.current = externalSession ?? (isolated ? new ShellSession() : loadSession())
    const s = sessionRef.current
    for (const [path, content] of Object.entries(seedFiles ?? {})) {
      try {
        const abs = s.vfs.resolve(path)
        if (!s.vfs.exists(abs)) s.vfs.writeFile(abs, content)
      } catch { /* semilla inválida ignorada */ }
    }
    if (rootSeed) {
      const prevUser = s.state.user
      s.vfs.user = 'root'
      s.state.user = 'root'
      try { rootSeed(s.vfs) } catch { /* noop */ } finally { s.vfs.user = prevUser; s.state.user = prevUser }
    }
  }
  const session = sessionRef.current

  const [lines, setLines] = useState<TermLine[]>([
    { kind: 'sys', text: 'ArchForge Terminal — entorno Linux SIMULADO y aislado. No tiene acceso a tu ordenador.' },
    ...(intro ? [{ kind: 'sys' as const, text: intro }] : []),
    { kind: 'sys', text: 'Escribe help para ver los comandos soportados. Ctrl+L limpia · Tab autocompleta · ↑↓ historial.' },
  ])
  const [input, setInput] = useState('')
  const [histIdx, setHistIdx] = useState<number | null>(null)
  const [distro, setDistro] = useState<Distro>(() => (localStorage.getItem(LS_DISTRO) as Distro) || 'arch')
  const [editorPath, setEditorPath] = useState<string | null>(null)
  const [editorContent, setEditorContent] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { isDone, markDone } = useApp()

  useEffect(() => {
    session.setDistro(distro)
    localStorage.setItem(LS_DISTRO, distro)
  }, [distro, session])

  // autoscroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [lines])

  // persistencia ligera con throttle implícito por ejecución (solo modo persistente)
  const persist = () => {
    if (isolated || externalSession) return
    try { localStorage.setItem(LS_KEY, JSON.stringify(session.serialize())) } catch { /* cuota */ }
  }

  const appendLines = (newLines: TermLine[]) => setLines((prev) => [...prev, ...newLines])

  const runLine = (raw: string): void => {
    const out = session.execute(raw)
    const cleared = session.tookClear()
    if (cleared) setLines([])
    else appendLines(out)
    if (session.hasPendingAsk()) {
      appendLines([{ kind: 'sys', text: 'responde y pulsa Enter · Enter sin texto acepta la opción por defecto [S]' }])
    }
    const editorReq = session.takeEditorRequest()
    if (editorReq) openEditor(editorReq)
    persist()
  }

  const openEditor = (target: string): void => {
    const abs = session.vfs.resolve(target)
    let content = ''
    try { content = session.vfs.readFile(abs) } catch { /* nuevo archivo */ }
    setEditorPath(abs)
    setEditorContent(content)
    appendLines([{ kind: 'sys', text: `abriendo editor integrado: ${target}` }])
  }

  const saveEditor = (): void => {
    if (!editorPath) return
    try {
      session.vfs.user = session.state.user
      session.vfs.writeFile(editorPath, editorContent)
      appendLines([{ kind: 'out', text: `guardado: ${session.vfs.displayPath(editorPath)} (${editorContent.length} bytes)` }])
      persist()
      closeEditor()
    } catch (e) {
      appendLines([{ kind: 'err', text: `no se pudo guardar: ${(e as Error).message}` }])
    }
  }

  const closeEditor = () => {
    setEditorPath(null)
    setEditorContent('')
    inputRef.current?.focus()
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.ctrlKey && (e.key === 'l' || e.key === 'L')) {
      e.preventDefault()
      setLines([])
      return
    }
    if (e.ctrlKey && (e.key === 'c' || e.key === 'C')) {
      e.preventDefault()
      appendLines([
        { kind: 'cmd', text: `${promptText} ${input}^C` },
        { kind: 'sys', text: '(proceso simulado cancelado)' },
      ])
      setInput('')
      setHistIdx(null)
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      runLine(input)
      setInput('')
      setHistIdx(null)
      return
    }
    if (e.key === 'Tab') {
      e.preventDefault()
      const res = session.complete(input)
      if (res) setInput(res.value)
      else appendLines(session.drain())
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      const h = session.state.history
      if (!h.length) return
      const next = Math.max(0, (histIdx ?? h.length) - 1)
      setHistIdx(next)
      setInput(h[next] ?? '')
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const h = session.state.history
      const cur = histIdx
      if (cur === null || cur === undefined) return
      const next = cur + 1
      if (next >= h.length) { setHistIdx(null); setInput(''); return }
      setHistIdx(next)
      setInput(h[next])
    }
  }

  const resetAll = (): void => {
    session.reset()
    for (const [path, content] of Object.entries(seedFiles ?? {})) {
      try {
        const abs = session.vfs.resolve(path)
        if (!session.vfs.exists(abs)) session.vfs.writeFile(abs, content)
      } catch { /* noop */ }
    }
    setLines([{ kind: 'sys', text: 'Entorno reiniciado a su estado inicial.' }])
    if (!isolated) localStorage.removeItem(LS_KEY)
  }

  const promptText = useMemo(() => session.prompt(), [session, lines.length, distro])

  return (
    <div className={cn('theme-dark-zone overflow-hidden rounded-xl border border-zinc-800 bg-[#0b0e14]', compact && '')}>
      {/* Barra de título */}
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800/80 bg-zinc-900/60 px-3 py-1.5">
        <span className="flex gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
        </span>
        <span className="font-mono text-[11px] font-semibold text-zinc-400">ArchForge Terminal</span>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={() => setDistro('arch')} aria-pressed={distro === 'arch'} className={cn('rounded px-1.5 py-0.5 font-mono text-[10px]', distro === 'arch' ? 'bg-sky-500/20 text-sky-300' : 'text-zinc-500 hover:text-zinc-300')}>arch</button>
          <button onClick={() => setDistro('debian')} aria-pressed={distro === 'debian'} className={cn('rounded px-1.5 py-0.5 font-mono text-[10px]', distro === 'debian' ? 'bg-rose-500/20 text-rose-300' : 'text-zinc-500 hover:text-zinc-300')}>ubuntu</button>
          <button onClick={() => { inputRef.current?.focus(); setLines([]) }} title="Ctrl+L limpiar" className="rounded p-1 text-zinc-500 hover:text-zinc-200"><Eraser className="h-3.5 w-3.5" /></button>
          <button onClick={resetAll} title="Reiniciar entorno virtual" className="rounded p-1 text-zinc-500 hover:text-zinc-200"><RotateCcw className="h-3.5 w-3.5" /></button>
        </div>
      </div>

      {/* Salida + input */}
      <div
        ref={scrollRef}
        style={{ maxHeight: height }}
        onClick={() => !editorPath && inputRef.current?.focus()}
        className="cursor-text overflow-y-auto px-3 py-3 font-mono text-[12.5px] leading-[1.55]"
      >
        {lines.map((l, i) => (
          <div key={i} className="whitespace-pre-wrap break-all">
            {l.kind === 'cmd' ? (
              <>
                <span className="select-none font-semibold text-emerald-400">{l.text.split('$ ')[0]}$ </span>
                <span className="text-zinc-100">{l.text.split('$ ').slice(1).join('$ ')}</span>
              </>
            ) : l.kind === 'err' ? (
              <span className="text-rose-300">{l.text}</span>
            ) : l.kind === 'sys' ? (
              <span className="italic text-sky-400/80">{l.text}</span>
            ) : (
              <span className="text-zinc-300">{l.text || '\u00A0'}</span>
            )}
          </div>
        ))}

        {!editorPath && (
          <div className="flex items-baseline gap-2">
            <span className="shrink-0 select-none whitespace-pre font-mono text-xs font-semibold text-emerald-400">{promptText}</span>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              spellCheck={false}
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              aria-label="entrada de comandos simulados"
              className="min-w-[40%] flex-1 bg-transparent font-mono text-xs text-zinc-50 caret-sky-300 outline-none placeholder:text-zinc-700"
              placeholder=""
            />
          </div>
        )}
      </div>

      {/* Editor integrado */}
      {editorPath && (
        <div className="border-t border-violet-500/30 bg-violet-950/20">
          <div className="flex items-center gap-2 border-b border-zinc-800/60 px-3 py-1.5">
            <FlaskConical className="h-3.5 w-3.5 text-violet-300" />
            <code className="truncate font-mono text-[11px] text-violet-200">{editorPath}</code>
            <span className="font-mono text-[10px] text-zinc-600">— editor integrado</span>
            <button onClick={saveEditor} className="ml-auto inline-flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-[10px] font-medium text-emerald-300 hover:bg-emerald-500/20"><Save className="h-3 w-3" /> Guardar</button>
            <button onClick={closeEditor} className="inline-flex items-center gap-1 rounded-md border border-zinc-700 px-2 py-1 text-[10px] text-zinc-300 hover:border-zinc-500"><X className="h-3 w-3" /> Cerrar</button>
          </div>
          <textarea
            value={editorContent}
            onChange={(e) => setEditorContent(e.target.value)}
            spellCheck={false}
            rows={Math.min(14, Math.max(4, editorContent.split('\n').length + 1))}
            className="block w-full resize-y bg-black/40 px-3 py-2 font-mono text-xs leading-6 text-zinc-100 outline-none"
          />
          <p className="px-3 pb-2 font-mono text-[10px] text-zinc-600">tras guardar: chmod +x fichero · ./fichero para ejecutarlo en la simulación</p>
        </div>
      )}

      {/* Tareas sugeridas */}
      {(tasks?.length ?? 0) > 0 && (
        <ul className="space-y-1 border-t border-zinc-800 bg-zinc-900/40 px-4 py-2.5">
          {tasks!.map((t, i) => (
            <li key={i} className="flex gap-2 font-mono text-[11px] leading-5 text-zinc-500">
              <span className="text-emerald-500/70">▸</span>{t}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* ============================ panel de laboratorios ============================ */

export function LabsPanel({ sessionId }: { sessionId?: string }) {
  const { isDone, markDone } = useApp()
  void sessionId
  const [selected, setSelected] = useState<Lab | null>(null)

  const doneCount = LABS.filter((l) => isDone(`lab:${l.id}`)).length

  if (selected) {
    const done = isDone(`lab:${selected.id}`)
    return (
      <div className="animate-fade-in">
        <button onClick={() => setSelected(null)} className="mb-3 inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-sky-300">← Todos los laboratorios ({doneCount}/{LABS.length})</button>
        <LabDetail lab={selected} done={done} onComplete={() => markDone(`lab:${selected.id}`, true)} />
      </div>
    )
  }

  return (
    <ol className="space-y-2">
      <li className="mb-1 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-zinc-600">
        <span>progresión</span>
        <span>{doneCount}/{LABS.length}</span>
      </li>
      {LABS.map((l) => {
        const done = isDone(`lab:${l.id}`)
        return (
          <li key={l.id}>
            <button
              onClick={() => setSelected(l)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors',
                done ? 'border-emerald-700/40 bg-emerald-500/[0.05]' : 'border-zinc-800 bg-ink-900/60 hover:border-teal-500/40',
              )}
            >
              <span className={cn('w-12 shrink-0 font-mono text-[10px] font-bold uppercase', done ? 'text-emerald-400' : 'text-zinc-500')}>{l.num}</span>
              <span className={cn('min-w-0 flex-1 truncate text-sm', done ? 'text-zinc-500' : 'text-zinc-200')}>{l.title}</span>
              {done && <span className="shrink-0 font-mono text-xs text-emerald-400">✓</span>}
            </button>
          </li>
        )
      })}
    </ol>
  )
}

import { CheckCircle2 } from 'lucide-react'

export function LabDetail({ lab, done, onComplete }: { lab: Lab; done: boolean; onComplete: () => void }) {
  const sessionRef = useRef<ShellSession | null>(null)
  void sessionRef
  const [result, setResult] = useState<{ pass: boolean; detail: string } | null>(null)
  const [showHints, setShowHints] = useState(false)

  const check = () => {
    // valida contra la sesión global compartida vía storage: recreamos desde storage
    const s = loadSession()
    setResult(lab.validate(s))
  }

  useEffect(() => {
    setResult(null)
    setShowHints(false)
  }, [lab.id])

  return (
    <section className="rounded-2xl border border-teal-500/30 bg-gradient-to-br from-teal-500/10 to-transparent p-5">
      <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-teal-300">{lab.num} · laboratorio</p>
      <h3 className="mt-1 text-lg font-bold text-zinc-50">{lab.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-zinc-300"><span className="font-semibold text-teal-200">Objetivo:</span> {lab.objective}</p>

      <p className="mt-3 text-xs leading-relaxed text-zinc-500">
        Realiza los pasos en la terminal de arriba (o en modo libre). Después pulsa Comprobar: se inspecciona el estado del filesystem virtual.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={check} className="rounded-lg border border-teal-500/50 bg-teal-500/15 px-4 py-2 text-sm font-medium text-teal-200 hover:bg-teal-500/25">Comprobar</button>
        {!showHints && (
          <button onClick={() => setShowHints(true)} className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:border-zinc-500">Pista</button>
        )}
        {done && <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" /> completado</span>}
      </div>

      {showHints && (
        <ul className="mt-3 space-y-1 animate-fade-in">
          {lab.hints.map((h, i) => (
            <li key={i} className="font-mono text-xs text-zinc-400">$ {h}</li>
          ))}
        </ul>
      )}

      {result && (
        <div className={cn('mt-4 rounded-xl border p-3.5 animate-fade-in', result.pass ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-amber-500/30 bg-amber-500/[0.06]')}>
          {result.pass ? (
            <p className="flex items-center gap-2 text-sm font-medium text-emerald-200"><CheckCircle2 className="h-4 w-4" /> ✓ Laboratorio completado — {result.detail}</p>
          ) : (
            <p className="text-sm text-amber-200">Aún no: {result.detail}</p>
          )}
        </div>
      )}

      {result?.pass && !done && (
        <button onClick={onComplete} className="mt-3 rounded-lg border border-emerald-500/50 bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-200 hover:bg-emerald-500/25">Registrar en mi progreso</button>
      )}
    </section>
  )
}
