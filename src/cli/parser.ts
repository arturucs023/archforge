/* Parser del shell: tokeniza respetando comillas, separa pipelines,
   extrae redirecciones y divide por ; && || — todo a mano, sin eval(). */

export interface Redirect {
  fd: 0 | 1 | 2
  op: '>' | '>>' | '<'
  target: string
}

export interface Stage {
  argv: string[]
  redirects: Redirect[]
}

export interface Pipeline {
  stages: Stage[]
}

export type ChainOp = ';' | '&&' | '||'

export interface ChainSegment {
  op: ChainOp | null // operador que PRECEDE a este segmento (null para el primero)
  pipeline: Pipeline
}

/** Divide la línea en segmentos por ; && || respetando comillas. */
export function splitChain(line: string): { segments: ChainSegment[]; cancelled?: boolean } {
  const segments: ChainSegment[] = []
  let cur = ''
  let pendingOp: ChainOp | null = null
  let quote: '"' | "'" | null = null
  let i = 0

  const flush = () => {
    if (cur.trim() !== '' || segments.length === 0) {
      segments.push({ op: pendingOp, pipeline: parsePipeline(cur) })
    }
    cur = ''
    pendingOp = null
  }

  while (i < line.length) {
    const ch = line[i]
    if (quote) {
      cur += ch
      if (ch === quote && line[i - 1] !== '\\') quote = null
      i++
      continue
    }
    if (ch === '"' || ch === "'") {
      quote = ch
      cur += ch
      i++
      continue
    }
    if (ch === '&' && line[i + 1] === '&') {
      flush()
      pendingOp = '&&'
      i += 2
      continue
    }
    if (ch === '|' && line[i + 1] === '|') {
      flush()
      pendingOp = '||'
      i += 2
      continue
    }
    if (ch === ';') {
      flush()
      pendingOp = ';'
      i++
      continue
    }
    cur += ch
    i++
  }
  flush()
  return { segments }
}

/** Separa un segmento en etapas por | (una sola barra). */
export function parsePipeline(segment: string): Pipeline {
  const stages: Stage[] = []
  let cur = ''
  let quote: '"' | "'" | null = null
  let i = 0

  const flushStage = () => {
    stages.push(parseStage(cur))
    cur = ''
  }

  while (i < segment.length) {
    const ch = segment[i]
    if (quote) {
      cur += ch
      if (ch === quote) quote = null
      i++
      continue
    }
    if (ch === '"' || ch === "'") {
      quote = ch
      cur += ch
      i++
      continue
    }
    if (ch === '|' && segment[i + 1] !== '|') {
      flushStage()
      i++
      continue
    }
    cur += ch
    i++
  }
  flushStage()
  return { stages }
}

function parseStage(stage: string): Stage {
  const tokens = tokenize(stage)
  const argv: string[] = []
  const redirects: Redirect[] = []
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]
    if (t === '>') redirects.push({ fd: 1, op: '>', target: tokens[++i] ?? '' })
    else if (t === '>>') redirects.push({ fd: 1, op: '>>', target: tokens[++i] ?? '' })
    else if (t === '2>') redirects.push({ fd: 2, op: '>', target: tokens[++i] ?? '' })
    else if (t === '2>>') redirects.push({ fd: 2, op: '>>', target: tokens[++i] ?? '' })
    else if (t === '&>') redirects.push({ fd: 1, op: '>', target: tokens[++i] ?? '' }, { fd: 2, op: '>', target: tokens[++i] ?? '' })
    else if (t === '<') redirects.push({ fd: 0 as const, op: '<' as const, target: tokens[++i] ?? '' })
    else argv.push(t)
  }
  return { argv, redirects }
}

/** Tokeniza respetando comillas y escapes. Los caracteres que estaban dentro de
    comillas (o escapados) se marcan con \u0000 para que el expansor de llaves/globs
    NO los toque; el marcador se elimina antes de ejecutar el comando. */
export function tokenize(input: string): string[] {
  const toks: string[] = []
  let cur = ''
  let hasContent = false
  let quote: '"' | "'" | null = null
  const put = (ch: string, literal: boolean): void => {
    cur += (literal ? '\u0000' : '') + ch
    hasContent = true
  }
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]
    if (quote === "'") {
      if (ch === "'") { quote = null; continue }
      put(ch, true)
      continue
    }
    if (quote === '"') {
      if (ch === '"') { quote = null; continue }
      if (ch === '\\' && '\\$`"'.includes(input[i + 1] ?? '')) { put(input[i + 1], true); i++; continue }
      if ('$`'.includes(ch)) { put(ch, true); continue }
      put(ch, false)
      continue
    }
    if (ch === "'") { quote = "'"; hasContent = true; continue }
    if (ch === '"') { quote = '"'; hasContent = true; continue }
    if (ch === '\\' && i + 1 < input.length) { put(input[i + 1], true); i++; continue }
    if (/\s/.test(ch)) {
      if (hasContent || cur !== '') { toks.push(cur); cur = ''; hasContent = false }
      continue
    }
    put(ch, false)
  }
  if (hasContent || cur !== '') toks.push(cur)
  return toks
}

/** Quita los marcadores de literalidad dejando el texto listo para ejecutar. */
export function stripLiteralMarks(token: string): string {
  return token.replace(/\u0000/g, '')
}
