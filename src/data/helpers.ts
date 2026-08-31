import type {
  Block,
  CalloutBlock,
  CmdLine,
  CommandBlockT,
  ExplainToken,
  FileBlock,
  HeadingBlock,
  InternalsBlock,
  Level,
  ListBlock,
  OutputBlockT,
  ParagraphBlock,
  TableBlock,
} from '../types'

/* Helpers de autoría para escribir contenido denso con poco boilerplate. */

export const p = (text: string, minLevel?: Level): ParagraphBlock => ({ type: 'paragraph', text, minLevel })

export const h = (text: string, minLevel?: Level): HeadingBlock => ({ type: 'heading', text, minLevel })

export const ul = (...items: string[]): ListBlock => ({ type: 'list', items })
export const ol = (...items: string[]): ListBlock => ({ type: 'list', items, ordered: true })

/**
 * Bloque de comandos.
 * Las líneas que empiezan por "# " se interpretan como comentarios (visibles, nunca copiadas).
 * Las líneas "sudo ..." marcan automáticamente que requieren root y generan su variante root.
 */
export function cmd(
  opts: { caption?: string; explain?: ExplainToken[]; dangerous?: boolean; minLevel?: Level } | undefined,
  ...raw: (string | CmdLine)[]
): CommandBlockT {
  const lines: CmdLine[] = raw.map((r) => {
    if (typeof r !== 'string') return r
    if (r.startsWith('# ') || r === '#') return { kind: 'comment', text: r.replace(/^#\s?/, '') }
    return { kind: 'run', user: r }
  })
  return { type: 'command', lines, caption: opts?.caption, explain: opts?.explain, dangerous: opts?.dangerous, minLevel: opts?.minLevel }
}

export const out = (caption: string, ...lines: string[]): OutputBlockT => ({ type: 'output', caption, lines })

export const info = (title: string, text: string): CalloutBlock => ({ type: 'callout', variant: 'info', title, text })
export const tip = (title: string, text: string): CalloutBlock => ({ type: 'callout', variant: 'tip', title, text })
export const warn = (title: string, text: string): CalloutBlock => ({ type: 'callout', variant: 'warning', title, text })
export const danger = (title: string, text: string): CalloutBlock => ({ type: 'callout', variant: 'danger', title, text })

export const deep = (title: string, text: string, points?: string[], minLevel?: Level): InternalsBlock => ({
  type: 'internals',
  title,
  text,
  points,
  minLevel,
})

export const tbl = (headers: string[], rows: string[][]): TableBlock => ({ type: 'table', headers, rows })

export const file = (filename: string, content: string, note?: string): FileBlock => ({ type: 'file', filename, content, note })

/** Extrae todos los comandos ejecutables de una lista de bloques (para el índice de búsqueda). */
export function collectCommands(blocks: Block[] | undefined): string[] {
  if (!blocks) return []
  const res: string[] = []
  for (const b of blocks) {
    if (b.type === 'command') {
      for (const l of b.lines) if (l.kind === 'run') res.push(l.user)
    } else if (b.type === 'internals' || b.type === 'callout') {
      continue
    }
  }
  return res
}
