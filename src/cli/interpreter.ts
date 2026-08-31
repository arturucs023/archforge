/* Intérprete educativo de scripts Bash.
   Soporta: comentarios, asignaciones, echo/printf (vía registry), if [ ] then/elif/else/fi,
   for VAR in lista; do…done, while/until, funciones nombre() { }, exit N, read (línea vacía),
   expansión de variables, $(cmd) y comandos externos del registro. Sin eval()/Function(). */

import type { ExecContext } from './commands'
import { REGISTRY } from './commands'

export interface ScriptResult {
  exitCode: number
}

const MAX_ITER = 10000

interface Frame {
  vars: Record<string, string>
  args: string[]
}

export class BashInterpreter {
  private ctx: ExecContext
  private frame: Frame
  private callDepth = 0

  constructor(ctx: ExecContext, scriptArgs: string[], scriptName: string) {
    this.ctx = ctx
    this.frame = {
      vars: {},
      args: [scriptName, ...scriptArgs],
    }
  }

  /* ------------------------------ expansión ------------------------------ */

  expand(input: string): string {
    let s = input
    // $(cmd) — una pasada, sin anidar en esta simulación
    for (let guard = 0; guard < 5; guard++) {
      const m = s.match(/\$\(([^()]*)\)/)
      if (!m) break
      const captured = this.captureSub(m[1])
      s = s.replace(m[0], captured.replace(/\n$/, ''))
    }
    // ${VAR:-def} primero (antes de que los posicionales se coman el nombre)
    s = s.replace(/\$\{(\w+):-([^}]*)\}/g, (_m, v: string, d: string) => this.lookup(v) || d.replace(/^["']|["']$/g, ''))
    // ${VAR} y $VAR y especiales
    s = s.replace(/\$(\{)?([@*#?0-9$!]|[A-Za-z_]\w*)(\})?/g, (_m, _brace1: string | undefined, name: string, _brace2: string | undefined) => {
      return this.specialOrVar(name)
    })
    s = s.replace(/\$\{(\w+)\}/g, (_m, v: string) => this.lookup(v))
    // $(( aritmética )) al final: los operandos ya son números resueltos
    s = s.replace(/\$\(\(([\s\S]*?)\)\)/g, (_, expr: string) => {
      const safe = expr.replace(/[^0-9+\-*/%()<>\s]/g, '')
      try {
        return String(evalArith(safe))
      } catch {
        return '0'
      }
    })
    return s
  }

  private specialOrVar(name: string): string {
    switch (name) {
      case '?': return String(this.ctx.state.lastExit)
      case '#': return String(this.frame.args.length - 1)
      case '@': return this.frame.args.slice(1).join(' ')
      case '*': return this.frame.args.slice(1).join(' ')
      case '$': return String(4242 + this.callDepth)
      case '!': return '4243'
      default:
        if (/^\d+$/.test(name)) return this.frame.args[parseInt(name, 10)] ?? ''
        return this.lookup(name)
    }
  }

  private lookup(name: string): string {
    // parámetros posicionales $1 $2… también participan en ${1:-def}
    if (/^\d+$/.test(name)) return this.frame.args[parseInt(name, 10)] ?? ''
    if (name in this.frame.vars) return this.frame.vars[name]
    if (name in this.ctx.state.env) return this.ctx.state.env[name]
    if (name in this.ctx.state.vars) return this.ctx.state.vars[name]
    return ''
  }

  private captureSub(line: string): string {
    const savedOut: string[] = []
    const subCtx: ExecContext = {
      ...this.ctx,
      stdin: '',
      write: (t: string) => savedOut.push(t),
      errWrite: () => undefined,
    }
    const tokens = line.trim()
    const fn = REGISTRY[tokens.split(/\s+/)[0]]
    if (fn) fn({ ...subCtx, args: tokens.split(/\s+/) })
    else {
      // asignación o pipeline simple no soportado dentro de $( ) → vacío
      return ''
    }
    return savedOut.join('')
  }

  /* ------------------------------- ejecución ------------------------------- */

  run(source: string): ScriptResult {
    const lines = source.split('\n')
    try {
      this.runBlock(lines, 0, lines.length)
      return { exitCode: this.ctx.state.lastExit }
    } catch (e) {
      if (e instanceof ExitSignal) return { exitCode: e.code }
      throw e
    }
  }

  private joinLogical(lines: string[], from: number, to: number): { text: string; next: number }[] {
    // une líneas terminadas en \ o con keywords pendientes (then/do sobre la misma línea se manejan aparte)
    const out: { text: string; next: number }[] = []
    let buf = ''
    for (let i = from; i < to; i++) {
      let l = lines[i]
      l = stripComment(l)
      if (/\\\s*$/.test(l)) {
        buf += l.replace(/\\\s*$/, ' ')
        continue
      }
      buf += l
      out.push({ text: buf.trim(), next: i + 1 })
      buf = ''
    }
    if (buf.trim()) out.push({ text: buf.trim(), next: to })
    return out
  }

  /** Ejecuta un rango de líneas. Devuelve señal de control si procede. */
  private runBlock(lines: string[], start: number, end: number): ControlSignal | null {
    const logical = this.joinLogical(lines, start, end)
    let i = 0
    while (i < logical.length) {
      const { text, next } = logical[i]
      i = next
      if (text === '') continue

      const signal = this.runStatement(text, logical, i - 1)
      if (signal) return signal
    }
    return null
  }

  /** Índice del siguiente elemento lógico tras encontrar keyword de cierre. */
  private findBlockEnd(logical: { text: string }[], startIdx: number, openRe: RegExp, closeWord: string, midWord?: string): number {
    let depth = 0
    for (let k = startIdx; k < logical.length; k++) {
      const t = logical[k].text
      const words = t.replace(/\b(then|do)\b/g, '').trim()
      if (openRe.test(t)) depth++
      if (new RegExp(`(^|;)\\s*${closeWord}\\b`).test(words)) {
        depth--
        if (depth === 0) return k
      }
      if (midWord && depth === 1 && new RegExp(`(^|;)\\s*(${midWord})\\b`).test(words)) {
        // elif/else: marcador útil para if
      }
    }
    return logical.length
  }

  private runStatement(stmt: string, logical: { text: string; next: number }[], idx: number): ControlSignal | null {
    if ((globalThis as unknown as { __AF_DEBUG?: boolean }).__AF_DEBUG && stmt.trim()) {
      this.ctx.write(`[stmt] ${stmt}\n`)
    }
    const expanded = this.expand(stmt)

    /* ---- estructuras de control (sobre texto SIN expandir del todo) ---- */

    // función: name() {
    const funcDef = stmt.match(/^(\w+)\s*\(\)\s*\{\s*(.*)$/)
    if (funcDef) {
      const body: string[] = []
      let depth = (stmt.match(/\{/g)?.length ?? 0) - (stmt.match(/\}/g)?.length ?? 0)
      if (depth === 0) {
        // cuerpo vacío en una línea: name() { cmd; }
        const inner = funcDef[2].replace(/\}\s*$/, '').trim()
        this.ctx.state.functions[funcDef[1]] = { body: inner ? [inner] : [] }
        return null
      }
      body.push(funcDef[2])
      let k = idx + 1
      while (k < logical.length && depth > 0) {
        const t = logical[k].text
        depth += (t.match(/\{/g)?.length ?? 0) - (t.match(/\}/g)?.length ?? 0)
        if (depth <= 0) {
          const closing = t.lastIndexOf('}')
          body.push(t.slice(0, closing))
          break
        }
        body.push(t)
        k++
      }
      this.ctx.state.functions[funcDef[1]] = { body }
      return null
    }

    // llamada a función definida
    const callM = expanded.match(/^(\w+)\s+(.*)$/) ?? expanded.match(/^(\w+)$/)
    if (callM && this.ctx.state.functions[callM[1]] && !REGISTRY[callM[1]]) {
      const fnBody = this.ctx.state.functions[callM[1]].body
      const args = splitWords(callM[2] ?? '')
      const savedFrame = this.frame
      this.frame = { vars: {}, args: [callM[1], ...args.map((a) => a)] }
      this.callDepth++
      try {
        this.runBlock(fnBody.join('\n').split('\n'), 0, fnBody.length)
      } catch (e) {
        if (e instanceof ReturnSignal) {
          this.ctx.state.lastExit = e.code
          this.callDepth--
          this.frame = savedFrame
          return null
        }
        this.callDepth--
        this.frame = savedFrame
        throw e
      }
      this.callDepth--
      this.frame = savedFrame
      return null
    }

    // if / elif / else / fi
    if (/^if\s/.test(stmt) || /^elif\s|^else\b/.test(stmt)) {
      return this.runIf(stmt, logical, idx)
    }

    // for VAR in lista ; do cuerpo done
    const forM = expanded.match(/^for\s+(\w+)\s+in\s+([\s\S]*?)\s*(?:;\s*)?do$/)
    if (forM) {
      const items = splitWords(forM[2])
      const endIdx = this.findBlockEnd(logical, idx, /^\s*for\s/, 'done')
      const bodyLines = logical.slice(idx + 1, endIdx).map((l) => l.text)
      let iterations = 0
      for (const item of items) {
        if (++iterations > MAX_ITER) break
        this.frame.vars[forM[1]] = item
        const sig = this.runBlock(bodyLines.join('\n').split('\n'), 0, bodyLines.length)
        if (sig?.kind === 'break') break
        if (sig?.kind === 'return') return sig
      }
      return null
    }

    // while / until cond; do cuerpo done
    const whileM = expanded.match(/^(while|until)\s+([\s\S]*?)\s*(?:;\s*)?do$/)
    if (whileM) {
      const endIdx = this.findBlockEnd(logical, idx, /^\s*(while|until)\s/, 'done')
      const bodyLines = logical.slice(idx + 1, endIdx).map((l) => l.text)
      let iterations = 0
      while (++iterations <= MAX_ITER) {
        const testLine = this.expand(whileM[2])
        const ok = evalTestExpression(testLine, this.ctx)
        if (whileM[1] === 'while' && !ok) break
        if (whileM[1] === 'until' && ok) break
        const sig = this.runBlock(bodyLines.join('\n').split('\n'), 0, bodyLines.length)
        if (sig?.kind === 'break') break
        if (sig?.kind === 'return') return sig
      }
      return null
    }

    if (stmt === 'done' || stmt === 'fi' || /^done\b/.test(stmt) || /^fi\b/.test(stmt)) return null

    if (stmt === 'break' || stmt.startsWith('break')) return { kind: 'break' }
    if (stmt === 'continue') return { kind: 'continue' }

    const exitM = expanded.match(/^exit(?:\s+(\d+))?/)
    if (exitM) {
      const code = parseInt(exitM[1] ?? '0', 10)
      this.ctx.state.lastExit = code
      throw new ExitSignal(code)
    }

    const returnM = expanded.match(/^return(?:\s+(\d+))?/)
    if (returnM) {
      const code = parseInt(returnM[1] ?? '0', 10)
      this.ctx.state.lastExit = code
      return { kind: 'return', code }
    }

    const localM = expanded.match(/^local\s+(\w+)=(.*)$/)
    if (localM) { this.frame.vars[localM[1]] = localM[2]; return null }

    // asignación
    const assign = expanded.match(/^([A-Za-z_]\w*)=(.*)$/)
    if (assign) {
      this.frame.vars[assign[1]] = assign[2]
      return null
    }

    // read desde stdin del script (vacío en simulación salvo pipe)
    if (/^read\s/.test(expanded)) {
      const names = expanded.split(/\s+/).slice(1)
      const inputLine = (this.ctx.stdin.split('\n')[0] ?? '')
      for (const n of names) if (/^\w+$/.test(n)) this.frame.vars[n] = inputLine
      return null
    }

    /* ---- comando normal (soporta redirecciones simples > >>) ---- */
    return this.runCommandLine(expanded)
  }

  private runIf(stmt: string, logical: { text: string; next: number }[], idx: number): ControlSignal | null {
    // recoger ramas: if/elif condiciones y cuerpos hasta fi
    const branches: { cond: string; body: string[] }[] = []
    const elseBody: string[] = []

    // cuerpo de la línea inicial (puede incluir then … tras ';')
    const firstThen = stmt.replace(/^if\s+/, '')
    const firstSplit = splitOnThen(firstThen)
    branches.push({ cond: firstSplit.cond, body: firstSplit.body })

    let depth = 1
    let currentBranch = branches[0]
    for (let k = idx + 1; k < logical.length; k++) {
      const raw = logical[k].text
      const t = raw.replace(/\bthen\b\s*/g, (mm) => (raw.includes(';') || raw.startsWith('then')) ? '' : mm)
      const isElif = /^elif\s/.test(raw)
      const isElse = /^else\b/.test(raw)
      const hasFi = /(^|\s)fi(\s|$)/.test(raw)

      if (isElif && depth === 1) {
        const splitB = splitOnThen(raw.replace(/^elif\s+/, ''))
        currentBranch = { cond: splitB.cond, body: splitB.body }
        branches.push(currentBranch)
        continue
      }
      if (isElse && depth === 1) { currentBranch = null as unknown as typeof currentBranch; continue }
      if (/^fi\b/.test(raw) && depth === 1) break

      if (/\bif\b/.test(raw)) depth++
      if (hasFi) depth--

      if (currentBranch) currentBranch.body.push(raw)
      else if (depth >= 1) elseBody.push(raw)
      if (hasFi && depth === 0) break
    }

    for (const br of branches) {
      const testLine = this.expand(br.cond)
      if (evalTestExpression(testLine, this.ctx)) {
        this.ctx.state.lastExit = 0
        return this.runBlock(br.body.join('\n').split('\n'), 0, br.body.length)
      }
    }
    if (elseBody.length > 0) {
      return this.runBlock(elseBody.join('\n').split('\n'), 0, elseBody.length)
    }
    this.ctx.state.lastExit = 0
    return null
  }

  private runCommandLine(line: string): ControlSignal | null {
    const redirect = line.match(/\s(>>?)\s*("[^"]*"|\S+)\s*$/)
    let commandText = line
    let target: string | null = null
    let append = false
    if (redirect) {
      append = redirect[1] === '>>'
      target = redirect[2].replace(/^"|"$/g, '')
      commandText = line.slice(0, redirect.index)
    }
    const collected: string[] = []
    const subCtx: ExecContext = {
      ...this.ctx,
      write: (t: string) => collected.push(t),
      errWrite: (t: string) => collected.push(t),
    }
    const code = executeSimpleCommand(commandText, subCtx)
    if (target !== null) {
      const abs = this.ctx.vfs.resolve(target)
      try {
        const prev = append ? this.ctx.vfs.readFile(abs) : ''
        this.ctx.vfs.writeFile(abs, prev + collected.join(''))
      } catch {
        this.ctx.errWrite(`bash: ${target}: Permission denied\n`)
      }
    } else {
      this.ctx.write(collected.join(''))
    }
    this.ctx.state.lastExit = code
    return code === 127 ? null : null
  }
}

class ExitSignal extends Error {
  code: number
  constructor(code: number) {
    super('exit')
    this.code = code
  }
}

class ReturnSignal extends Error {
  code: number
  constructor(code: number) {
    super('return')
    this.code = code
  }
}

type ControlSignal = { kind: 'break' } | { kind: 'continue' } | { kind: 'return'; code: number } | null

function stripComment(line: string): string {
  let quote: '"' | "'" | null = null
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (quote) { if (ch === quote) quote = null; continue }
    if (ch === '"' || ch === "'") { quote = ch; continue }
    if (ch === '#' && (i === 0 || /\s/.test(line[i - 1]))) return line.slice(0, i)
  }
  return line
}

function splitWords(s: string): string[] {
  const out: string[] = []
  let cur = ''
  let quote: '"' | "'" | null = null
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (quote) { cur += ch; if (ch === quote) quote = null; continue }
    if (ch === '"' || ch === "'") { quote = ch; continue }
    if (/\s/.test(ch)) { if (cur) { out.push(cur); cur = '' } continue }
    cur += ch
  }
  if (cur) out.push(cur)
  return out
}

function splitOnThen(s: string): { cond: string; body: string[] } {
  const m = s.match(/^\[([\s\S]*)\]\s*;\s*then\s*([\s\S]*)$/) ?? s.match(/^\[\[([\s\S]*)\]\]\s*;\s*then\s*([\s\S]*)$/)
  if (m) return { cond: '[' + m[1] + ']', body: m[2] ? m[2].split(';').filter((x) => x.trim()).map((x) => x.trim()) : [] }
  const semi = s.indexOf(';')
  if (semi >= 0) {
    return { cond: s.slice(0, semi).trim(), body: s.slice(semi + 1).replace(/^\s*then\s*/, '').split(';').map((x) => x.trim()).filter(Boolean) }
  }
  return { cond: s.replace(/\bthen\s*$/, '').trim(), body: [] }
}

/** Evalúa expresiones tipo test: [ … ] / [[ … ]] / comando suelto. */
function evalTestExpression(expr: string, ctx: ExecContext): boolean {
  const t = expr.trim()
  const inner = t.match(/^\[{1,2}\s*([\s\S]*?)\s*\]{1,2}$/)
  const body = inner ? inner[1] : t
  if (body.trim() === '') return false
  // negación y operadores -a/-o aplanados a un nivel
  const notM = body.match(/^!\s+(.*)$/)
  if (notM) return !evalTestExpression('[' + notM[1] + ']', ctx)
  const orParts = body.split(/\s+-o\s+/)
  return orParts.some((part) => part.split(/\s+-a\s+/).every((p) => singleTest(p.trim(), ctx)))
}

function singleTest(cond: string, ctx: ExecContext): boolean {
  const c = cond.trim().replace(/^["']|["']$/g, '')
  if (c === '') return false
  const fileTest = c.match(/^(-[efd rwxsz])\s+"?([^"]+)"?$/) ?? c.match(/^(-[efdrwxszL])\s+(\S+)$/)
  if (fileTest) {
    const flag = fileTest[1]
    const abs = ctx.vfs.resolve(fileTest[2])
    const node = ctx.vfs.get(abs)
    switch (flag.replace(/\s/g, '')) {
      case '-e': return !!node
      case '-f': return node?.type === 'file'
      case '-d': return node?.type === 'dir'
      case '-r': return !!node && (ctx.state.user === 'root' || node.owner === ctx.state.user || !!(node.mode & 4))
      case '-w': return !!node && (ctx.state.user === 'root' || (node.owner === ctx.state.user && !!(node.mode & 2)))
      case '-x': return !!node && !!(node.mode & 0o111)
      case '-s': return !!node && (node.content ?? '').length > 0
      case '-z': return false
      case '-n': return true
      case '-L': return false
    }
  }
  const cmp = c.match(/^("([^"]*)"|\S+)\s*(-eq|-ne|-lt|-le|-gt|-ge|=|==|!=)\s*("([^"]*)"|\S+)$/)
  if (cmp) {
    const lRaw = cmp[2] ?? cmp[1]
    const op = cmp[3]
    const rRaw = cmp[5] ?? cmp[4]
    if (['-eq', '-ne', '-lt', '-le', '-gt', '-ge'].includes(op)) {
      const l = parseInt(lRaw, 10); const r = parseInt(rRaw, 10)
      switch (op) {
        case '-eq': return l === r
        case '-ne': return l !== r
        case '-lt': return l < r
        case '-le': return l <= r
        case '-gt': return l > r
        case '-ge': return l >= r
      }
    }
    switch (op) {
      case '=':
      case '==': return lRaw === rRaw
      case '!=': return lRaw !== rRaw
    }
  }
  const strOp = c.match(/^(-z|-n)\s+"?(.*?)"?$/)
  if (strOp) {
    const val = ctx.vfs ? strOp[2] : strOp[2]
    return strOp[1] === '-z' ? val === '' : val !== ''
  }
  // comando como condición: grep -q etc.
  const known = c.split(/\s+/)[0]
  if (REGISTRY[known]) {
    const collected: string[] = []
    const code = executeSimpleCommand(c, { ...ctx, write: (t) => collected.push(t), errWrite: () => undefined })
    void collected
    return code === 0
  }
  return c !== '' && c !== 'false'
}

/** Ejecuta un comando simple SIN redirecciones usando el registro. */
function executeSimpleCommand(line: string, ctx: ExecContext): number {
  const argv = tokenizeShell(line).map((t) => t.replace(/\u0000/g, ''))
  if (argv.length === 0) return 0
  const name = argv[0]
  // asignaciones prefijas FOO=bar comando
  let i = 0
  while (i < argv.length && /^[A-Za-z_]\w*=/.test(argv[i])) {
    const m = argv[i].match(/^([A-Za-z_]\w*)=(.*)$/)!
    ctx.state.env[m[1]] = m[2]
    i++
  }
  if (i >= argv.length) return 0
  const fn = REGISTRY[argv[i]]
  if (!fn) {
    ctx.errWrite(`bash: ${argv[i]}: command not found\n`)
    return 127
  }
  const sub: ExecContext = { ...ctx, args: argv.slice(i) }
  try {
    return fn(sub)
  } catch (e) {
    if (e instanceof VFSErrorBase) {
      ctx.errWrite(`${name}: ${(e as Error).message}\n`)
      return 1
    }
    ctx.errWrite(`${name}: error interno simulado\n`)
    return 1
  }
}

import { tokenize as tokenizeShell } from './parser'
import { VFSError as VFSErrorBase } from './fs'

/** Evaluador aritmético sin eval(): shunting-yard reducido (copia local para evitar ciclo). */
function evalArith(expr: string): number {
  const tokens = expr.match(/\d+\.?\d*|[()+\-*%\/]/g) ?? []
  const prec: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2, '%': 2 }
  const vals: number[] = []
  const ops: string[] = []
  const apply = (): void => {
    const b = vals.pop() ?? 0
    const a = vals.pop() ?? 0
    switch (ops.pop()) {
      case '+': vals.push(a + b); break
      case '-': vals.push(a - b); break
      case '*': vals.push(a * b); break
      case '/': vals.push(b === 0 ? 0 : Math.trunc(a / b)); break
      case '%': vals.push(b === 0 ? 0 : a % b); break
      default: break
    }
  }
  for (const t of tokens) {
    if (/^\d/.test(t)) { vals.push(parseFloat(t)); continue }
    if (t === '(') { ops.push(t); continue }
    if (t === ')') { while (ops.at(-1) !== '(' && ops.length) apply(); ops.pop(); continue }
    if (t === '-' && vals.length === ops.filter((o) => o !== '(').length + 1) { vals.push(0); }
    while (ops.length && prec[ops.at(-1)!] >= prec[t]) apply()
    ops.push(t)
  }
  while (ops.length) apply()
  return vals[0] ?? 0
}
