/* ShellSession: une parser, VFS, comandos e intérprete en una API simple
   para la UI. Mantiene cwd/usuario/entorno/historial y emite líneas. */

import { VFS } from './fs'
import type { SerializedVFS } from './fs'
import { initialState, promptFor } from './state'
import type { ShellState } from './state'
import { splitChain, stripLiteralMarks } from './parser'
import { gateFor } from './pkggate'
import './pkgregister'
import './services'
import type { ChainSegment } from './parser'
import { REGISTRY, type ExecContext } from './commands'

export interface TermLine {
  kind: 'cmd' | 'out' | 'err' | 'sys'
  text: string
}

export type Distro = 'arch' | 'debian'

export interface SessionSnapshot {
  vfs: SerializedVFS
  state: Pick<ShellState, 'user' | 'env' | 'vars' | 'cwd' | 'lastExit' | 'history' | 'pkgs' | 'services'>
}

export class ShellSession {
  vfs: VFS
  state: ShellState
  private _distro: Distro = 'arch'
  private outBuffer: TermLine[] = []
  private editorRequest: string | null = null
  private clearRequested = false
  /** pregunta interactiva [S/n] pendiente de respuesta del usuario */
  pendingAsk: { question: string; respond: (answer: string) => void } | null = null
  /** profundidad de expansión $( ) */
  private depth = 0

  constructor(snapshot?: SessionSnapshot) {
    this.vfs = new VFS(snapshot?.vfs)
    this.state = snapshot ? { ...initialState(), ...snapshot.state } : initialState()
    this._distro = snapshot ? this.detectDistroFromState(snapshot.state) : 'arch'
  }

  /** Detecta la distribución desde los paquetes preinstalados del estado restaurado */
  private detectDistroFromState(state: Partial<ShellState>): Distro {
    if (state.pkgs?.arch && Object.keys(state.pkgs.arch.installed).length > 0) return 'arch'
    if (state.pkgs?.debian && Object.keys(state.pkgs.debian.installed).length > 0) return 'debian'
    return 'arch'
  }

  get distro(): Distro {
    return this._distro
  }

  set distro(d: Distro) {
    this._distro = d
    this.pendingAsk = null
  }

  /** Sincroniza el usuario del VFS con el del shell state */
  private syncVfsUser(): void {
    this.vfs.user = this.state.user
  }

  /** Cambio reactivo e inmediato de distribución: cancela pendientes y resetea estado transitorio */
  setDistro(d: Distro): void {
    this.distro = d
  }

  hasPendingAsk(): boolean {
    return this.pendingAsk !== null
  }

  /** Resuelve un comando respetando el gate de distribución. Única fuente de verdad. */
  resolveCommand(name: string): ((ctx: import('./commands').ExecContext) => number) | null {
    const gate = gateFor(name)
    if (gate && gate !== this._distro) return null
    return REGISTRY[name] ?? null
  }

  /** Lista de comandos disponibles filtrada por la distribución activa (para autocompletado). */
  availableCommandNames(): string[] {
    return Object.keys(REGISTRY).filter((name) => {
      const gate = gateFor(name)
      return !gate || gate === this._distro
    }).sort()
  }

  serialize(): SessionSnapshot {
    return {
      vfs: this.vfs.serialize(),
      state: {
        user: this.state.user,
        env: this.state.env,
        vars: this.state.vars,
        cwd: this.state.cwd,
        lastExit: this.state.lastExit,
        history: this.state.history,
        pkgs: this.state.pkgs,
        services: this.state.services,
      },
    }
  }

  static load(serialized: unknown): ShellSession {
    return new ShellSession(serialized as SessionSnapshot)
  }

  reset(): void {
    this.vfs.reset()
    this.state = initialState()
    this.outBuffer = []
  }

  prompt(): string {
    return promptFor(this.state, this.distro)
  }

  drain(): TermLine[] {
    const l = this.outBuffer
    this.outBuffer = []
    return l
  }

  takeEditorRequest(): string | null {
    const r = this.editorRequest
    this.editorRequest = null
    return r
  }

  tookClear(): boolean {
    if (this.clearRequested) {
      this.clearRequested = false
      return true
    }
    return false
  }

  /** Ejecuta una línea completa del usuario. Devuelve las líneas generadas SIN vaciar el buffer interno. */
  execute(rawLine: string): TermLine[] {
    const line = rawLine.trim()
    if (!line) return []
    const from = this.outBuffer.length
    this.vfs.user = this.state.user

    // respuesta a una pregunta interactiva pendiente ([S/n])
    if (this.pendingAsk) {
      const pending = this.pendingAsk
      this.pendingAsk = null
      this.push({ kind: 'cmd', text: `${this.prompt()} ${line}` })
      pending.respond(line)
      return this.outBuffer.slice(from)
    }

    this.state.history.push(line)

    this.push({ kind: 'cmd', text: `${this.prompt()} ${line}` })

    // expandir sustituciones de comando a nivel de línea (una pasada por segmento)
    const expanded = this.expandCommandSubstitutions(line)
    const { segments } = splitChain(expanded)

    for (let sIdx = 0; sIdx < segments.length; sIdx++) {
      const seg: ChainSegment = segments[sIdx]
      if (sIdx > 0) {
        const prevOk = this.state.lastExit === 0
        if (seg.op === '&&' && !prevOk) continue
        if (seg.op === '||' && prevOk) continue
      }
      this.runPipeline(seg.pipeline)
    }

    return this.outBuffer.slice(from)
  }

  /* ------------------------------ pipelines ------------------------------ */

  private runPipeline(pipeline: ChainSegment['pipeline']): void {
    let stdinData = ''
    for (const stage of pipeline.stages) {
      let stdoutBuf = ''
      let stderrBuf = ''
      let stdinForStage = stdinData

      // redirección de entrada < fichero
      for (const r of stage.redirects) {
        if (r.op !== '<') continue
        try {
          stdinForStage = this.vfs.readFile(this.vfs.resolve(r.target))
        } catch {
          this.push({ kind: 'err', text: `bash: ${r.target}: No such file or directory` })
          this.state.lastExit = 1
          return
        }
      }
      // sincronizar usuario del VFS con el del shell (para permisos de escritura)
      this.vfs.user = this.state.user

      const argvExpanded = expandArgv(stage.argv, this.vfs).map((t) => stripLiteralMarks(t))
      const ctx: ExecContext = {
        vfs: this.vfs,
        state: this.state,
        distro: this.distro,
        stdin: stdinForStage,
        args: argvExpanded,
        write: (t: string) => { stdoutBuf += t },
        errWrite: (t: string) => { stderrBuf += t },
        chdir: (abs: string) => { this.vfs.cwd = abs; this.state.cwd = abs },
        openEditor: (path: string) => { this.editorRequest = path },
        clearScreen: () => { this.clearRequested = true },
        execSub: (line: string) => this.captureLine(line),
        ask: (question: string, respond: (answer: string) => void) => {
          if (question) this.push({ kind: 'out', text: question })
          this.pendingAsk = { question, respond }
        },
      }

      // asignaciones prefijas VAR=valor comando…
      let argStart = 0
      while (argStart < argvExpanded.length && /^[A-Za-z_]\w*=/.test(argvExpanded[argStart])) {
        const m = argvExpanded[argStart].match(/^([A-Za-z_]\w*)=(.*)$/)!
        this.state.env[m[1]] = m[2]
        this.state.vars[m[1]] = m[2]
        argStart++
      }
      if (argStart >= argvExpanded.length) { this.state.lastExit = 0; return }

      // resolución central: gate por distro + registro
      const name = argvExpanded[argStart]

      // rutas de script: ./x.sh · /ruta/x.sh · bash|sh fichero
      const scriptRun = this.tryRunScript(argvExpanded.slice(argStart))
      if (scriptRun !== null) {
        if (scriptRun.err) this.pushErr(scriptRun.err + '\n')
        this.state.lastExit = scriptRun.code
        return
      }

      const fn = this.resolveCommand(name)
      if (!fn) {
        stderrBuf += `bash: ${name}: command not found\n`
        this.state.lastExit = 127
      } else {
        try {
          const sub: ExecContext = { ...ctx, args: argvExpanded.slice(argStart) }
          this.state.lastExit = fn(sub)
        } catch (e) {
          stderrBuf += `${name}: error interno simulado (${(e as Error).message})\n`
          this.state.lastExit = 1
        }
      }

      // redirecciones de salida del stage
      for (const r of stage.redirects) {
        if (r.op === '<') continue
        const payload = r.fd === 2 ? stderrBuf : stdoutBuf
        const hadPayload = payload.length > 0
        try {
          const abs = this.vfs.resolve(r.target)
          const prev = r.op === '>>' ? safeRead(this.vfs, abs) : ''
          this.vfs.writeFile(abs, prev + payload)
          if (r.fd === 1) stdoutBuf = ''
          else stderrBuf = ''
        } catch (e) {
          // mensaje fiel a la causa real (falta fichero ≠ permisos)
          const msg = (e as Error).message.includes('No such file') ? 'No such file or directory' : 'Permission denied'
          this.push({ kind: 'err', text: `bash: ${r.target}: ${msg}` })
          if (!hadPayload && r.fd === 2) stderrBuf = ''
          else if (msg === 'Permission denied') { /* conservar salida para no perder datos */ }
          else if (r.fd === 1) stdoutBuf = ''
          else stderrBuf = ''
        }
      }

      if (stderrBuf) this.pushErr(stderrBuf)
      stdinData = stdoutBuf
    }

    if (stdinData) this.pushOut(stdinData)
  }

  private pushOut(text: string): void {
    for (const l of text.split('\n')) this.outBuffer.push({ kind: 'out', text: l })
    if (this.outBuffer.at(-1)?.text === '') this.outBuffer.pop()
  }

  private pushErr(text: string): void {
    for (const l of text.split('\n')) this.outBuffer.push({ kind: 'err', text: l })
    if (this.outBuffer.at(-1)?.text === '') this.outBuffer.pop()
  }

  private push(line: TermLine): void {
    this.outBuffer.push(line)
  }

  /**
   * Ejecuta scripts por ruta (./x, /abs/x, bash x, sh x).
   * Devuelve null si el comando NO es un script por ruta (continúa como comando normal).
   */
  private tryRunScript(argv: string[]): { code: number; err?: string } | null {
    const name = argv[0]
    if (!name) return null

    const isPath = name.startsWith('./') || name.startsWith('/') || name.startsWith('~/')
    const isBashSh = (name === 'bash' || name === 'sh') && argv[1] !== undefined
    if (!isPath && !isBashSh) return null

    if ((globalThis as unknown as { __AF_DEBUG?: boolean }).__AF_DEBUG) {
      console.error('[tryRunScript]', JSON.stringify(argv), 'isPath=', isPath, 'isBashSh=', isBashSh)
    }
    const fileArg = isBashSh ? argv[1] : name
    const scriptArgs = isBashSh ? argv.slice(2) : argv.slice(1)
    const abs = this.vfs.resolve(fileArg)
    const node = this.vfs.get(abs)
    if (!node) return { code: 127, err: `bash: ${fileArg}: No such file or directory` }
    if (node.type === 'dir') return { code: 126, err: `bash: ${fileArg}: Is a directory` }
    if (isPath && !(node.mode & 0o111)) {
      return { code: 126, err: `bash: ${fileArg}: Permission denied` }
    }
    const source = node.content ?? ''
    // import perezoso para evitar ciclo estático
    const { BashInterpreter } = require('./interpreter') as typeof import('./interpreter')
    const subCtx: ExecContext = {
      vfs: this.vfs,
      state: this.state,
      distro: this.distro,
      stdin: '',
      args: [fileArg],
      write: (t: string) => this.pushOut(t),
      errWrite: (t: string) => this.pushErr(t),
      chdir: (a: string) => { this.vfs.cwd = a; this.state.cwd = a },
      openEditor: (p2: string) => { this.editorRequest = p2 },
      clearScreen: () => { this.clearRequested = true },
      execSub: (l: string) => this.captureLine(l),
    }
    const interp = new BashInterpreter(subCtx, scriptArgs.map((a) => a.replace(/^"|"$/g, '')), fileArg)
    try {
      const res = interp.run(source)
      return { code: res.exitCode }
    } catch (e) {
      return { code: 1, err: `${fileArg}: error de ejecución simulada (${(e as Error).message})` }
    }
  }

  /* -------------------- command substitution y expansiones -------------------- */

  private captureLine(line: string): string {
    const sub = new ShellSession(this.serialize())
    sub.distro = this.distro
    const lines = sub.execute(line)
    void lines
    return sub.drain().filter((l) => l.kind === 'out').map((l) => l.text).join('\n')
  }

  private expandCommandSubstitutions(line: string): string {
    if (this.depth > 3) return line
    this.depth++
    let s = line
    for (let guard = 0; guard < 5; guard++) {
      const m = s.match(/\$\(([^()]*)\)/)
      if (!m) break
      const captured = this.captureLine(m[1]).replace(/\n$/, '')
      s = s.replace(m[0], quoteIfNeeded(captured))
    }
    // variables de entorno/shell fuera de comillas simples (ANTES de aritmética)
    s = expandVariables(s, this.state)
    s = s.replace(/\$\(\(([^()]*)\)\)/g, (_m, expr: string) => {
      // bash resuelve variables dentro de $(( )) sin $
      const resolved = expr.replace(/[A-Za-z_]\w*/g, (n) => String(this.state.vars[n] ?? this.state.env[n] ?? 0))
      try { return String(evalArith(resolved.replace(/[^0-9+\-*/%()\s]/g, ''))) } catch { return '0' }
    })
    this.depth--
    return s
  }

  /* ------------------------------- autocomplete ------------------------------- */

  complete(inputBeforeCursor: string): { value: string; replacedFrom: number } | null {
    const words = inputBeforeCursor.split(/(\s+)/)
    const lastWord = words[words.length - 1] ?? ''
    if (/^\s*$/.test(inputBeforeCursor)) return null

    if (words.filter((w) => w.trim() !== '').length <= 1 && !/\s$/.test(inputBeforeCursor)) {
      // completar comando — filtrado por distro
      const names = this.availableCommandNames().concat(['sudo', 'su']).sort()
      const matches = names.filter((n) => n.startsWith(lastWord))
      if (matches.length === 1) {
        words[words.length - 1] = matches[0] + ' '
        return { value: words.join(''), replacedFrom: lastWord.length }
      }
      if (matches.length > 1) {
        this.push({ kind: 'out', text: matches.join('   ') })
        return null
      }
      return null
    }

    // completar ruta
    const slashIdx = lastWord.lastIndexOf('/')
    const dirPart = slashIdx >= 0 ? lastWord.slice(0, slashIdx + 1) : ''
    const filePart = slashIdx >= 0 ? lastWord.slice(slashIdx + 1) : lastWord
    const absDir = this.vfs.resolve(dirPart || '.')
    const entries = this.vfs.listDir(absDir).filter((e) => e.startsWith(filePart))
    if (entries.length === 0) return null

    if (entries.length === 1) {
      const isDir = this.vfs.isDir(this.vfs.resolve(`${absDir === '/' ? '' : absDir}/${entries[0]}`))
      words[words.length - 1] = dirPart + entries[0] + (isDir ? '/' : ' ')
      return { value: words.join(''), replacedFrom: lastWord.length }
    }

    // prefijo común + listado
    let common = entries[0]
    for (const e of entries.slice(1)) {
      while (!e.startsWith(common)) common = common.slice(0, -1)
    }
    if (common.length > filePart.length) {
      words[words.length - 1] = dirPart + common
      return { value: words.join(''), replacedFrom: lastWord.length }
    }
    this.push({ kind: 'out', text: entries.map((e) => e + (this.vfs.isDir(this.vfs.resolve(`${absDir === '/' ? '' : absDir}/${e}`)) ? '/' : '')).join('   ') })
    return null
  }
}

function quoteIfNeeded(captured: string): string {
  return captured.includes(' ') ? `"${captured}"` : captured
}

function safeRead(vfs: VFS, abs: string): string {
  try { return vfs.readFile(abs) } catch { return '' }
}

/** Expande $VAR / ${VAR} respetando comillas simples. */
function expandVariables(s: string, state: ShellState): string {
  let quote: '"' | "'" | null = null
  let out = ''
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (quote === "'") { out += ch; if (ch === "'") quote = null; continue }
    if (quote === '"') {
      if (ch === '"') { quote = null; out += ch; continue }
      if (ch === '$') {
        const [val, consumed] = varAt(s, i, state)
        out += val
        i += consumed - 1
        continue
      }
      out += ch
      continue
    }
    if (ch === "'" ) { quote = "'"; out += ch; continue }
    if (ch === '"') { quote = '"'; out += ch; continue }
    if (ch === '$') {
      const [val, consumed] = varAt(s, i, state)
      out += quoteIfNeeded(val)
      i += consumed - 1
      continue
    }
    out += ch
  }
  return out
}

function varAt(s: string, i: number, state: ShellState): [string, number] {
  if (s[i + 1] === '{') {
    const end = s.indexOf('}', i + 2)
    if (end > i) {
      const inner = s.slice(i + 2, end)
      const defM = inner.match(/^(\w+):-(.*)$/)
      if (defM) {
        const v = state.vars[defM[1]] ?? state.env[defM[1]] ?? ''
        return [v || defM[2], end - i + 1]
      }
      const v = state.vars[inner] ?? state.env[inner] ?? ''
      return [v, end - i + 1]
    }
  }
  const m = s.slice(i + 1).match(/^\{?([A-Za-z_]\w*)\}?/)
  if (m) {
    const v = state.vars[m[1]] ?? state.env[m[1]] ?? ''
    return [v, m[0].length + 1]
  }
  return ['$', 1]
}

/** Evaluador aritmético sin eval(): shunting-yard reducido. */
export function evalArith(expr: string): number {
  const tokens = expr.match(/\d+\.?\d*|[()+\-*%\/]/g) ?? []
  const prec: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2, '%': 2 }
  const vals: number[] = []
  const ops: string[] = []

  const apply = (): void => {
    const b = vals.pop() ?? 0
    const a = vals.pop() ?? 0
    const op = ops.pop()!
    switch (op) {
      case '+': vals.push(a + b); break
      case '-': vals.push(a - b); break
      case '*': vals.push(a * b); break
      case '/': vals.push(b === 0 ? 0 : Math.trunc(a / b)); break
      case '%': vals.push(b === 0 ? 0 : a % b); break
    }
  }

  let expectVal = true
  for (const t of tokens) {
    if (/^\d/.test(t)) { vals.push(parseFloat(t)); expectVal = false; continue }
    if (t === '(') { ops.push(t); expectVal = true; continue }
    if (t === ')') { while (ops.at(-1) !== '(') apply(); ops.pop(); continue }
    if (expectVal && t === '-') { vals.push(0); }
    while (ops.length && prec[ops.at(-1)!] >= prec[t]) apply()
    ops.push(t)
    expectVal = true
  }
  while (ops.length) apply()
  return vals[0] ?? 0
}

/** Expansión de llaves {a,b} {1..5} y globs * ? sobre argv (estilo Bash básico). */
export function expandArgv(argv: string[], vfs: VFS): string[] {
  const out: string[] = []
  for (const token of argv) {
    // tokens con contenido citado: sus llaves/globs son literales
    if (token.includes('\u0000')) { out.push(token); continue }
    const braceM = token.match(/\{([^{}]+)\}/)
    if (braceM) {
      const inner = braceM[1]
      const rangeM = inner.match(/^(\d+)\.\.(\d+)$/)
      let alts: string[]
      if (rangeM) {
        alts = []
        for (let i = parseInt(rangeM[1], 10); i <= parseInt(rangeM[2], 10); i++) alts.push(String(i))
      } else {
        alts = inner.split(',')
      }
      for (const alt of alts) out.push(...expandArgv([token.replace(braceM[0], alt)], vfs))
      continue
    }
    if (/[*?]/.test(token)) {
      const slashIdx = token.lastIndexOf('/')
      const dirPart = slashIdx >= 0 ? token.slice(0, slashIdx) || '/' : '.'
      const basePart = slashIdx >= 0 ? token.slice(slashIdx + 1) : token
      const absDir = vfs.resolve(dirPart)
      try {
        const re = globToRegex(basePart)
        const entries = vfs.listDir(absDir).filter((n) => re.test(n))
        if (entries.length > 0) {
          for (const n of entries) out.push(slashIdx >= 0 ? dirPart + '/' + n : n)
          continue
        }
      } catch { /* literal si no hay matches o error */ }
      out.push(token)
      continue
    }
    out.push(token)
  }
  return out
}

import { globToRegex } from './fs'
