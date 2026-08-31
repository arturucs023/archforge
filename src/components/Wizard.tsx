import { useMemo, useState } from 'react'
import { ArrowRight, CircleCheck, Stethoscope } from 'lucide-react'
import { resolveLeaf, WIZARD_TREES } from '../data/wizardTrees'
import type { DiagNode } from '../data/wizardTrees'
import Blocks from './Blocks'
import { cmd } from '../data/helpers'
import type { Block } from '../types'
import { useApp } from '../context/AppContext'
import { cn } from '../lib/utils'

export default function Wizard() {
  const [treeKey, setTreeKey] = useState<string | null>(null)
  const [answers, setAnswers] = useState<boolean[]>([])
  const { isDone, markDone } = useApp()

  const tree = treeKey ? WIZARD_TREES[treeKey] : null

  const walk = useMemo((): { visited: DiagNode[]; pending?: DiagNode; leafId?: string } => {
    if (!tree) return { visited: [] }
    const visited: DiagNode[] = []
    let cur: string | DiagNode | undefined = tree.root
    for (const ans of answers) {
      if (typeof cur !== 'object' || !cur) break
      visited.push(cur)
      const next: string | DiagNode | undefined = ans ? cur.yes : cur.no
      if (next === undefined) break
      cur = next
    }
    if (typeof cur === 'string') return { visited, leafId: cur }
    if (cur && typeof cur === 'object') return { visited, pending: cur }
    return { visited }
  }, [tree, answers])

  const reset = () => {
    setTreeKey(null)
    setAnswers([])
  }

  const stepBack = () => setAnswers((a) => a.slice(0, -1))
  const answer = (yes: boolean) => setAnswers((a) => [...a, yes])

  const leaf = walk.leafId ? resolveLeaf(walk.leafId) : undefined

  return (
    <section className="rounded-2xl border border-sky-500/30 bg-gradient-to-br from-sky-500/10 to-transparent p-5">
      <h2 className="flex items-center gap-2 text-base font-bold text-zinc-50">
        <Stethoscope className="h-5 w-5 text-sky-400" />
        Diagnóstico paso a paso
      </h2>
      <p className="mt-1 max-w-3xl text-sm leading-relaxed text-zinc-400">
        Responde sí/no y ArchForge acota la causa con las comprobaciones exactas en orden: el mismo razonamiento que usaría un sysadmin.
      </p>

      {!tree && (
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(WIZARD_TREES).map(([key, t]) => (
            <button
              key={key}
              onClick={() => { setTreeKey(key); setAnswers([]) }}
              className="group rounded-xl border border-zinc-800 bg-ink-900/70 p-4 text-left transition-colors hover:border-sky-500/40"
            >
              <span className="block text-sm font-semibold text-zinc-200 group-hover:text-sky-300">{t.label}</span>
              <span className="mt-1 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-zinc-500 group-hover:text-sky-400">
                diagnosticar <ArrowRight className="h-3 w-3" />
              </span>
            </button>
          ))}
        </div>
      )}

      {tree && (
        <div className="mt-4">
          {/* Migas del recorrido */}
          {walk.visited.length > 0 && (
            <div className="mb-3 flex flex-wrap items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
              <button onClick={reset} className="rounded border border-zinc-800 px-2 py-0.5 transition-colors hover:text-zinc-300">{tree.label}</button>
              {walk.visited.map((n, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  <ArrowRight className="h-2.5 w-2.5 text-zinc-700" />
                  <button
                    onClick={() => setAnswers((a) => a.slice(0, i))}
                    title={n.question}
                    className="max-w-[160px] truncate rounded border border-zinc-800 px-2 py-0.5 transition-colors hover:text-zinc-300"
                  >
                    P{i + 1}
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Pregunta pendiente */}
          {!leaf && walk.pending && (
            <div className="animate-fade-in rounded-xl border border-zinc-800 bg-ink-900/80 p-4">
              <p className="text-sm font-medium leading-relaxed text-zinc-100">
                {walk.pending.question}{' '}
                <span className="ml-1 font-mono text-xs text-zinc-600">({walk.visited.length + 1})</span>
              </p>
              {walk.pending.hint && <p className="mt-1 text-xs leading-relaxed text-zinc-500">{walk.pending.hint}</p>}
              {walk.pending.check && walk.pending.check.length > 0 && (
                <div className="mt-3">
                  <Blocks blocks={[cmd({ caption: 'comprobación' }, ...walk.pending.check)] as Block[]} />
                </div>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button onClick={() => answer(true)} className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/50 bg-emerald-500/15 px-6 py-2 text-sm font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/25">
                  Sí
                </button>
                <button onClick={() => answer(false)} className="inline-flex items-center gap-2 rounded-lg border border-rose-500/50 bg-rose-500/15 px-6 py-2 text-sm font-semibold text-rose-200 transition-colors hover:bg-rose-500/25">
                  No
                </button>
                {answers.length > 0 && (
                  <button onClick={stepBack} className="ml-auto rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-400 transition-colors hover:text-zinc-200">
                    ← Atrás
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Resultado */}
          {leaf && (
            <div className="animate-fade-in space-y-4">
              <div className="rounded-xl border border-violet-500/40 bg-violet-500/10 p-4">
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-violet-300">Causa probable encontrada</p>
                <h3 className="mt-1 text-lg font-bold text-zinc-50">{leaf.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-300">{leaf.cause}</p>
              </div>

              {leaf.lines && leaf.lines.length > 0 && (
                <Blocks blocks={[cmd({ caption: 'siguiente paso' }, ...leaf.lines)] as Block[]} />
              )}

              <div className="flex flex-wrap items-center gap-3">
                {leaf.linkSection && (
                  <a href={`#/section/${leaf.linkSection}`} className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/40 bg-sky-500/10 px-4 py-2 text-sm font-medium text-sky-300 transition-colors hover:bg-sky-500/20">
                    Ver guía completa <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                )}
                <button
                  onClick={() => markDone(`prob:${leaf.id}`, true)}
                  disabled={isDone(`prob:${leaf.id}`)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs transition-colors',
                    isDone(`prob:${leaf.id}`)
                      ? 'border-emerald-600/50 text-emerald-400'
                      : 'border-zinc-700 text-zinc-300 hover:border-emerald-500/50 hover:text-emerald-300',
                  )}
                >
                  <CircleCheck className="h-3.5 w-3.5" />
                  {isDone(`prob:${leaf.id}`) ? 'Diagnóstico registrado' : 'Marcar como resuelto'}
                </button>
                <button onClick={reset} className="ml-auto rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-400 transition-colors hover:text-zinc-200">
                  Nuevo diagnóstico
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
