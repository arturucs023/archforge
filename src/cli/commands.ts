/* Registro y ejecución de comandos del shell simulado.
   Cada comando recibe un ExecContext; nada de este archivo toca el sistema real. */

import { VFS, VFSError, globToRegex } from './fs'
import type { ShellState } from './state'
import type { PkgDistro } from './packages'
import { gateFor } from './pkggate'

export interface ExecContext {
  vfs: VFS
  state: ShellState
  distro: PkgDistro
  stdin: string
  args: string[]
  write(text: string): void
  errWrite(text: string): void
  /** cambia el cwd (cd) */
  chdir(abs: string): void
  openEditor(path: string): void
  clearScreen(): void
  /** ejecutar una línea completa en subshell (para $( ) dentro) */
  execSub(line: string): string
  /** pregunta interactiva [S/n]: la respuesta llegará por el siguiente input */
  ask?(question: string, respond: (answer: string) => void): void
  exitRequest?: boolean
}

export type CommandFn = (ctx: ExecContext) => number

export const REGISTRY: Record<string, CommandFn> = {}

export function cmd(name: string | string[], fn: CommandFn): void {
  for (const n of Array.isArray(name) ? name : [name]) REGISTRY[n] = fn
}

/* --------------------------------- helpers --------------------------------- */

function flagsOf(args: string[]): string {
  let f = ''
  for (const a of args) if (/^-[a-zA-Z]+$/.test(a)) f += a.slice(1)
  return f
}

function operands(args: string[]): string[] {
  return args.filter((a) => !( /^-[a-zA-Z]+$/.test(a)) && a !== '--')
}

function rest(ctx: ExecContext): string[] {
  return ctx.args.slice(1)
}
function operandsRest(ctx: ExecContext): string[] {
  return operands(rest(ctx))
}
function flagsRest(ctx: ExecContext): string {
  return flagsOf(rest(ctx))
}

function readInput(ctx: ExecContext, fileArg?: string): string {
  if (fileArg) return ctx.vfs.readFile(ctx.vfs.resolve(fileArg))
  return ctx.stdin
}

/* ------------------------------- navegación ------------------------------- */

cmd('pwd', (ctx) => {
  ctx.write(ctx.vfs.cwd + '\n')
  return 0
})

cmd('ls', (ctx) => {
  const flags = flagsRest(ctx)
  const ops = operandsRest(ctx).filter((a) => a !== '-la' && !/^-\w+$/.test(a))
  const targets = ops.length ? ops : ['.']
  let code = 0
  for (const t of targets) {
    const abs = ctx.vfs.resolve(t)
    const node = ctx.vfs.get(abs)
    if (!node) { ctx.errWrite(`ls: cannot access '${t}': No such file or directory\n`); code = 2; continue }
    if (node.type === 'file') {
      if (flags.includes('l')) ctx.write(ctx.vfs.longList(abs) + '\n')
      else ctx.write(t.replace(/^\.\//, '') + '\n')
      continue
    }
    if (targets.length > 1) ctx.write(`${t}:\n`)
    const names = ctx.vfs.listDir(abs).map((n) => n + (ctx.vfs.isDir(ctx.vfs.resolve(`${abs === '/' ? '' : abs}/${n}`)) ? '/' : ''))
    if (flags.includes('a')) names.unshift('.', '..')
    if (flags.includes('l')) {
      ctx.write(`total ${names.length}\n`)
      for (const n of names) ctx.write(ctx.vfs.longList(ctx.vfs.resolve(`${abs === '/' ? '' : abs}/${n.replace(/\/$/, '')}`)) + '\n')
    } else {
      if (names.length) ctx.write(names.join('   ') + '\n')
    }
    if (targets.length > 1) ctx.write('\n')
  }
  return code
})

cmd('cd', (ctx) => {
  const target = ctx.args[1] ?? '~'
  const abs = ctx.vfs.resolve(target)
  if (!ctx.vfs.isDir(abs)) {
    ctx.errWrite(`bash: cd: ${target}: No such file or directory\n`)
    return 1
  }
  const node = ctx.vfs.get(abs)!
  if (ctx.state.user !== 'root' && node.owner !== ctx.state.user && !(node.mode & 0o100)) {
    ctx.errWrite(`bash: cd: ${target}: Permission denied\n`)
    return 1
  }
  ctx.chdir(abs)
  return 0
})

/* ------------------------------ creación/edición ------------------------------ */

cmd('mkdir', (ctx) => {
  const flags = flagsRest(ctx)
  const recursive = flags.includes('p')
  let code = 0
  for (const name of operandsRest(ctx)) {
    try {
      ctx.vfs.createDir(ctx.vfs.resolve(name), recursive)
    } catch (e) {
      ctx.errWrite(`mkdir: cannot create directory '${name}': ${(e as VFSError).message}\n`)
      code = 1
    }
  }
  return code
})

cmd('rmdir', (ctx) => {
  let code = 0
  for (const name of operandsRest(ctx)) {
    try {
      const abs = ctx.vfs.resolve(name)
      if (!ctx.vfs.isDir(abs)) throw new VFSError(`cannot remove '${name}': Not a directory`)
      ctx.vfs.remove(abs, false)
    } catch (e) {
      ctx.errWrite(`rmdir: failed to remove '${name}': ${(e as VFSError).message}\n`)
      code = 1
    }
  }
  return code
})

cmd('touch', (ctx) => {
  let code = 0
  for (const name of operandsRest(ctx)) {
    try {
      const abs = ctx.vfs.resolve(name)
      if (ctx.vfs.exists(abs)) {
        const f = ctx.vfs.get(abs)!
        f.mtime = Date.now()
      } else {
        ctx.vfs.writeFile(abs, '')
      }
    } catch (e) {
      ctx.errWrite(`touch: cannot touch '${name}': ${(e as VFSError).message}\n`)
      code = 1
    }
  }
  return code
})

cmd('cp', (ctx) => {
  const flags = flagsRest(ctx)
  const ops = operandsRest(ctx)
  if (ops.length < 2) { ctx.errWrite('cp: missing destination file operand\n'); return 1 }
  const dst = ops.pop()!
  let code = 0
  for (const src of ops) {
    try {
      ctx.vfs.copy(ctx.vfs.resolve(src), ctx.vfs.resolve(dst), flags.includes('r') || flags.includes('a'))
    } catch (e) {
      ctx.errWrite(`cp: ${(e as VFSError).message}\n`)
      code = 1
    }
  }
  return code
})

cmd('mv', (ctx) => {
  const ops = operandsRest(ctx)
  if (ops.length < 2) { ctx.errWrite('mv: missing destination file operand\n'); return 1 }
  const dst = ops.pop()!
  let code = 0
  for (const src of ops) {
    try {
      ctx.vfs.move(ctx.vfs.resolve(src), ctx.vfs.resolve(dst))
    } catch (e) {
      ctx.errWrite(`mv: ${(e as VFSError).message}\n`)
      code = 1
    }
  }
  return code
})

cmd('rm', (ctx) => {
  const flags = flagsRest(ctx)
  const ops = operandsRest(ctx)
  let code = 0
  for (const name of ops) {
    try {
      ctx.vfs.remove(ctx.vfs.resolve(name), flags.includes('r') || flags.includes('R'))
    } catch (e) {
      ctx.errWrite(`rm: ${(e as VFSError).message}\n`)
      code = 1
    }
  }
  return code
})

/* ---------------------------------- lectura ---------------------------------- */

cmd('cat', (ctx) => {
  const files = operandsRest(ctx)
  if (files.length === 0) { ctx.write(ctx.stdin); return 0 }
  let code = 0
  for (const f of files) {
    try { ctx.write(ctx.vfs.readFile(ctx.vfs.resolve(f))) }
    catch {
      const abs = ctx.vfs.resolve(f)
      const reason = !ctx.vfs.exists(abs) ? 'No such file or directory' : 'Is a directory'
      ctx.errWrite(`cat: ${f}: ${reason}\n`)
      code = 1
    }
  }
  return code
})

cmd(['less', 'more'], (ctx) => {
  ctx.write('[pager simulado — mostrando contenido completo]\n')
  ctx.write(ctx.stdin || (operandsRest(ctx)[0] ? safeRead(ctx, operandsRest(ctx)[0]) : ''))
  ctx.write('\n(fin — en una terminal real usarías q para salir)\n')
  return 0
})

function safeRead(ctx: ExecContext, f: string): string {
  try { return ctx.vfs.readFile(ctx.vfs.resolve(f)) } catch { return '' }
}

cmd('head', (ctx) => {
  const nIdx = ctx.args.indexOf('-n')
  const n = nIdx >= 0 ? parseInt(ctx.args[nIdx + 1] ?? '10', 10) : 10
  const files = operandsRest(ctx)
  const text = files.length ? files.map((f) => safeRead(ctx, f)).join('\n') : ctx.stdin
  text.split('\n').slice(0, n).forEach((l) => ctx.write(l + '\n'))
  return 0
})

cmd('tail', (ctx) => {
  const nIdx = ctx.args.indexOf('-n')
  const n = nIdx >= 0 ? parseInt(ctx.args[nIdx + 1] ?? '10', 10) : 10
  const follow = ctx.args.includes('-f')
  const files = operandsRest(ctx)
  const text = files.length ? files.map((f) => safeRead(ctx, f)).join('\n') : ctx.stdin
  text.split('\n').slice(-n).forEach((l) => ctx.write(l + '\n'))
  if (follow) ctx.write('^C  (tail -f simulado: no hay datos nuevos)\n')
  return 0
})

cmd('wc', (ctx) => {
  const flags = flagsRest(ctx)
  const files = operandsRest(ctx)
  const text = files.length ? files.map((f) => safeRead(ctx, f)).join('\n') : ctx.stdin
  const newlines = (text.match(/\n/g) ?? []).length
  const lines = text === '' ? 0 : text.endsWith('\n') ? newlines : newlines + 1
  const words = text.split(/\s+/).filter(Boolean).length
  const chars = text.length
  if (flags.includes('l')) ctx.write(`${lines}\n`)
  else if (flags.includes('w')) ctx.write(`${words}\n`)
  else if (flags.includes('c')) ctx.write(`${chars}\n`)
  else ctx.write(`${lines} ${words} ${chars}\n`)
  return 0
})

cmd('sort', (ctx) => {
  const files = operandsRest(ctx)
  const text = files.length ? files.map((f) => safeRead(ctx, f)).join('\n') : ctx.stdin
  text.split('\n').slice().sort().forEach((l) => ctx.write(l + '\n'))
  return 0
})

cmd('uniq', (ctx) => {
  const countFlag = ctx.args.some((a) => /^-[a-z]*c/.test(a))
  const files = operandsRest(ctx)
  const text = files.length ? files.map((f) => safeRead(ctx, f)).join('\n') : ctx.stdin
  let prev: string | null = null
  let count = 0
  const flush = () => { if (prev !== null) ctx.write((countFlag ? `${count} ` : '') + prev + '\n') }
  for (const l of text.split('\n')) {
    if (l === prev) count++
    else { flush(); prev = l; count = 1 }
  }
  flush()
  return 0
})

cmd('cut', (ctx) => {
  const dIdx = ctx.args.indexOf('-d')
  const delim = dIdx >= 0 ? ctx.args[dIdx + 1] ?? ' ' : '\t'
  const fIdx = ctx.args.indexOf('-f')
  const fields = (fIdx >= 0 ? ctx.args[fIdx + 1] : '1').split(',').flatMap((s) => s.split('-').length === 2 ? range(+s.split('-')[0], +s.split('-')[1]) : [+s])
  function range(a: number, b: number): number[] { const r: number[] = []; for (let i = a; i <= b; i++) r.push(i); return r }
  const files = operandsRest(ctx)
  const text = files.length ? files.map((f) => safeRead(ctx, f)).join('\n') : ctx.stdin
  for (const line of text.split('\n')) {
    const parts = line.split(delim)
    ctx.write(fields.map((f) => parts[f - 1] ?? '').join(delim) + '\n')
  }
  return 0
})

cmd('tr', (ctx) => {
  const sets = rest(ctx).filter((a) => !a.startsWith('-'))
  const from = sets[0] ?? ''
  const to = sets[1] ?? ''
  const out: string[] = []
  for (const ch of ctx.stdin) {
    const idx = from.indexOf(ch)
    out.push(idx >= 0 ? (to[idx] ?? '') : ch)
  }
  ctx.write(out.join(''))
  return 0
})

/* ----------------------------------- find ----------------------------------- */

cmd('find', (ctx) => {
  const rargs = rest(ctx)
  const root = rargs.find((a, i) => i > 0 && !a.startsWith('-') && rargs[i - 1] !== '-name') ?? rargs[0] ?? '.'
  const nameIdx = ctx.args.indexOf('-name')
  const glob = nameIdx >= 0 ? ctx.args[nameIdx + 1] : undefined
  const typeArg = ctx.args.find((a) => /^-[fd]$/.test(a))
  const absRoot = ctx.vfs.resolve(root)
  if (!ctx.vfs.exists(absRoot)) {
    ctx.errWrite(`find: '${root}': No such file or directory\n`)
    return 1
  }
  for (const p of ctx.vfs.findNodes(absRoot, { nameGlob: glob, type: typeArg === '-f' ? 'f' : typeArg === '-d' ? 'd' : undefined })) {
    ctx.write(p + '\n')
  }
  return 0
})

cmd('file', (ctx) => {
  for (const f of operandsRest(ctx)) {
    try {
      const abs = ctx.vfs.resolve(f)
      const content = ctx.vfs.readFile(abs)
      const kind = content.startsWith('\u007fELF') ? 'ELF 64-bit LSB executable, x86-64'
        : content.startsWith('<') ? 'HTML document text'
        : /[\x00-\x08\x0E-\x1F]/.test(content) ? 'data'
        : 'ASCII text'
      ctx.write(`${f}: ${kind}\n`)
    } catch {
      ctx.write(`${f}: cannot open \`${f}' (No such file or directory)\n`)
    }
  }
  return 0
})

/* ----------------------------------- texto ----------------------------------- */

cmd('echo', (ctx) => {
  const rawArgs = ctx.args.slice(1)
  const noNewline = rawArgs[0] === '-n'
  const body = (noNewline ? rawArgs.slice(1) : rawArgs).join(' ')
  ctx.write(body + (noNewline ? '' : '\n'))
  return 0
})

cmd('printf', (ctx) => {
  const fmt = ctx.args[1] ?? ''
  const rest = ctx.args.slice(2)
  let argi = 0
  let outp = ''
  for (let i = 0; i < fmt.length; i++) {
    const ch = fmt[i]
    if (ch === '%' && i + 1 < fmt.length) {
      const spec = fmt[i + 1]
      if (spec === '%') { outp += '%'; i++; continue }
      const val = rest[argi++] ?? ''
      if (spec === 's') outp += String(val)
      else if (spec === 'd') outp += String(parseInt(String(val), 10) || 0)
      else if (spec === 'f') outp += Number(val).toFixed(6)
      else outp += spec
      i++
      continue
    }
    if (ch === '\\' && i + 1 < fmt.length) {
      const esc = fmt[i + 1]
      if (esc === 'n') outp += '\n'
      else if (esc === 't') outp += '\t'
      else outp += esc
      i++
      continue
    }
    outp += ch
  }
  ctx.write(outp)
  return 0
})

/* ---------------------------------- sistema ---------------------------------- */

cmd('whoami', (ctx) => { ctx.write(ctx.state.user + '\n'); return 0 })

cmd('id', (ctx) => {
  const u = ctx.state.user
  if (u === 'root') ctx.write('uid=0(root) gid=0(root) grupos=0(root)\n')
  else ctx.write('uid=1000(user) gid=1000(user) grupos=1000(user),27(sudo),90(wheel)\n')
  return 0
})

cmd('hostname', (ctx) => {
  try { ctx.write(ctx.vfs.readFile('/etc/hostname')) } catch { ctx.write('archforge\n') }
  return 0
})

  // orden de expansión del motor: variables → aritmética → $(cmd) ya resuelto antes
  cmd('date', (ctx2) => {
    const fmtArg = ctx2.args[1]
    if (!fmtArg || !fmtArg.startsWith('+')) { ctx2.write(new Date().toString() + '\n'); return 0 }
    const d = new Date()
    const p2 = (n: number, w = 2) => String(n).padStart(w, '0')
    const outp = fmtArg.slice(1).replace(/%([a-zA-Z%])/g, (_, sp: string) => {
      switch (sp) {
        case 'Y': return String(d.getFullYear())
        case 'm': return p2(d.getMonth() + 1)
        case 'd': return p2(d.getDate())
        case 'H': return p2(d.getHours())
        case 'M': return p2(d.getMinutes())
        case 'S': return p2(d.getSeconds())
        case 'F': return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
        case '%': return '%'
        default: return sp
      }
    })
    ctx2.write(outp + '\n')
    return 0
  })

  /* --------------------------------- red simulada --------------------------------- */

  cmd('ping', (ctx) => {
    const args = ctx.args.slice(1)
    const target = args.find((a) => !a.startsWith('-') && isNaN(Number(a))) ?? ''
    if (!target) { ctx.errWrite('ping: usage error\n'); return 1 }
    const isIp = /^\d+\.\d+\.\d+\.\d+$/.test(target)
    if (!isIp) {
      const knownHosts: Record<string, string> = {
        'archlinux.org': '95.217.163.246',
        'example.com': '93.184.216.34',
        'google.com': '142.250.78.14',
        'github.com': '140.82.121.3',
        'localhost': '127.0.0.1',
      }
      const ip = knownHosts[target]
      if (!ip) {
        ctx.errWrite(`ping: ${target}: Name or service not known\n`)
        return 1
      }
    }
    const countIdx = ctx.args.indexOf('-c')
    const count = countIdx >= 0 ? parseInt(ctx.args[countIdx + 1] ?? '4', 10) : 4
    for (let i = 0; i < count; i++) {
      ctx.write(`64 bytes from ${target}: icmp_seq=${i + 1} ttl=57 time=${(10 + Math.random() * 30).toFixed(1)} ms\n`)
    }
    ctx.write(`\n--- ${target} ping statistics ---\n${count} packets transmitted, ${count} received, 0% packet loss\n`)
    return 0
  })

  cmd('resolvectl', (ctx) => {
    const sub = ctx.args[1]
    if (sub === 'status') {
      ctx.write('Global\n       Protocols: -LLMNR -mDNS -DNSOverTLS DNSSEC=no/unsupported\n')
      ctx.write('\nLink 2 (enp3s0)\n       Current Scopes: DNS LLMNR/IPv4 LLMNR/IPv6\n        DNS Servers: 192.168.1.1\n         DNS Domain: lan\n')
      return 0
    }
    if (sub === 'dns') { ctx.write('DNS cambiado (simulado)\n'); return 0 }
    if (sub === 'flush-caches') { ctx.write('Caché DNS vaciada\n'); return 0 }
    ctx.errWrite('uso: resolvectl [status|dns|flush-caches]\n')
    return 1
  })

  cmd('dhclient', (ctx) => {
    ctx.write('DHCPDISCOVER on TU-IF to 255.255.255.255 port 67 interval 3\n')
    ctx.write(`DHCPACK from 192.168.1.${Math.floor(Math.random() * 200 + 20)}\n`)
    ctx.write('bound to 192.168.1.100 -- renewal in 3600 seconds.\n')
    return 0
  })

  cmd('rfkill', (ctx) => {
    const sub = ctx.args[1]
    if (sub === 'list') {
      ctx.write('0: hci0: Bluetooth\n\tSoft blocked: no\n\tHard blocked: no\n')
      ctx.write('1: phy0: Wireless LAN\n\tSoft blocked: no\n\tHard blocked: no\n')
      return 0
    }
    if (sub === 'unblock') { ctx.write('desbloqueado\n'); return 0 }
    return 0
  })

cmd('clear', (ctx) => { ctx.clearScreen(); return 0 })

cmd('history', (ctx) => {
  ctx.state.history.forEach((h, i) => ctx.write(`  ${String(i + 1).padStart(4)}  ${h}\n`))
  return 0
})

cmd('true', () => 0)
cmd('false', () => 1)

cmd('sleep', () => 0) // instantáneo en la simulación

cmd('env', (ctx) => {
  Object.entries(ctx.state.env).forEach(([k, v]) => ctx.write(`${k}=${v}\n`))
  return 0
})

cmd('printenv', (ctx) => {
  const key = ctx.args[1]
  if (key) { const v = ctx.state.env[key]; if (v !== undefined) ctx.write(v + '\n'); return v === undefined ? 1 : 0 }
  Object.entries(ctx.state.env).forEach(([k, v]) => ctx.write(`${k}=${v}\n`))
  return 0
})

cmd('export', (ctx) => {
  for (const a of ctx.args.slice(1)) {
    const m = a.match(/^(\w+)=(.*)$/)
    if (m) { ctx.state.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); ctx.state.vars[m[1]] = ctx.state.env[m[1]] }
    else ctx.state.env[a] = ctx.state.vars[a] ?? ''
  }
  return 0
})

cmd('unset', (ctx) => {
  for (const k of ctx.args.slice(1)) { delete ctx.state.env[k]; delete ctx.state.vars[k] }
  return 0
})

cmd('which', (ctx) => {
  let code = 0
  for (const name of ctx.args.slice(1)) {
    const gated = gateFor(name)
    if (gated && gated !== ctx.distro) { code = 1; continue }
    if (REGISTRY[name]) { ctx.write(`/usr/bin/${name}\n`); continue }
    code = 1
  }
  return code
})

cmd('type', (ctx) => {
  for (const name of ctx.args.slice(1)) {
    const gated = gateFor(name)
    if (gated && gated !== ctx.distro) { ctx.write(`bash: type: ${name}: not found\n`); return 1 }
    if (['cd','echo','exit','pwd'].includes(name)) ctx.write(`${name} es un builtin del shell\n`)
    else if (REGISTRY[name]) ctx.write(`${name} is /usr/bin/${name}\n`)
    else { ctx.write(`bash: type: ${name}: not found\n`); return 1 }
  }
  return 0
})

cmd('man', (ctx) => {
  const page = ctx.args[1]
  if (!page) { ctx.errWrite('¿Qué página de manual necesitas?\n'); return 1 }
  ctx.write(`MANUAL(${page.toUpperCase()} 1)\n\nNOMBRE\n    ${page} — versión educativa resumida\n\nDESCRIPCIÓN\n    Esta simulación incluye una página reducida. Consulta la sección\n    correspondiente de ArchForge o la wiki oficial para el manual completo.\n`)
  return 0
})

/* ------------------------------ usuarios/root ------------------------------ */

cmd('sudo', (ctx) => {
  const real = ctx.args[1]
  if (!real) { ctx.write('uso: sudo <comando>\n'); return 0 }
  // educativo: el usuario pertenece a wheel → se concede sin teclear contraseña
  const saved = ctx.state.user
  ctx.state.user = 'root'
  try {
    const fn = REGISTRY[real]
    if (!fn) { ctx.errWrite(`sudo: ${real}: command not found\n`); return 127 }
    const subCtx: ExecContext = { ...ctx, args: [real, ...ctx.args.slice(2)] }
    return fn(subCtx)
  } finally {
    ctx.state.user = saved
  }
})

cmd('su', (ctx) => {
  const target = ctx.args[1] ?? 'root'
  if (target !== 'root' && target !== 'user') { ctx.errWrite(`su: user ${target} does not exist\n`); return 1 }
  ctx.state.user = target as 'root' | 'user'
  if (target === 'root') ctx.chdir('/root')
  ctx.write(`(educativo: cambio a ${target} sin contraseña en la simulación)\n`)
  return 0
})

cmd('chmod', (ctx) => {
  const ops = ctx.args.slice(1).filter((a) => a !== '-R')
  const modeArg = ops[0]
  let code = 0
  for (const f of ops.slice(1)) {
    try {
      const numeric = /^[0-7]{3,4}$/.test(modeArg)
      ctx.vfs.chmod(ctx.vfs.resolve(f), numeric ? parseInt(modeArg, 8) : null, numeric ? null : modeArg)
      const node = ctx.vfs.get(ctx.vfs.resolve(f))!
      ctx.write(`modo de «${f}» cambiado a ${VFS.modeString(node.type, node.mode)}\n`)
    } catch (e) {
      ctx.errWrite(`chmod: ${(e as VFSError).message}\n`)
      code = 1
    }
  }
  return code
})

cmd('chown', (ctx) => {
  const ownerSpec = ctx.args[1]
  let code = 0
  for (const f of ctx.args.slice(2)) {
    try {
      ctx.vfs.chown(ctx.vfs.resolve(f), ownerSpec)
    } catch (e) {
      ctx.errWrite(`chown: ${(e as VFSError).message}\n`)
      code = 1
    }
  }
  return code
})

cmd('ps', (ctx) => {
  ctx.write('  PID TTY          TIME CMD\n')
  ctx.write('  412 pts/0    00:00:00 bash\n')
  ctx.write('  733 pts/0    00:00:00 ps\n')
  void ctx
  return 0
})

cmd('kill', (ctx) => {
  const pid = ctx.args[1]
  ctx.errWrite(`kill: (${pid ?? '?'}) - No such process\n`)
  return 1
})

/* ------------------------------- editores ------------------------------- */

for (const editor of ['nano', 'vim', 'nvim', 'edit']) {
  cmd(editor, (ctx) => {
    const target = ctx.args[1]
    if (!target) { ctx.errWrite(`${editor}: falta el fichero\n`); return 1 }
    ctx.openEditor(target)
    return 0
  })
}

/* ------------------------------- grep completo ------------------------------- */

cmd('grep', (ctx) => {
  const flags = flagsRest(ctx)
  const gargs = rest(ctx).filter((a) => !/^-[A-Za-z]+$/.test(a))
  const pattern = gargs[0]
  const files = gargs.slice(1)

  if (!pattern) { ctx.errWrite('uso: grep [-invcrwEF] PATRÓN [archivo...]\n'); return 2 }
  let re: RegExp
  try {
    re = new RegExp(pattern, flags.includes('i') ? 'i' : '')
  } catch {
    ctx.errWrite(`grep: expresión inválida: ${pattern}\n`)
    return 2
  }

  const inputs: { name?: string; text: string }[] = files.length
    ? files.map((f) => ({ name: f, text: safeRead(ctx, f) }))
    : [{ text: ctx.stdin }]

  let matchedAny = false
  let totalLines = 0

  for (const input of inputs) {
    const lines = input.text.split('\n')
    if (textEndsWithNewline(input.text)) lines.pop()
    let fileMatches = 0
    lines.forEach((line, idx) => {
      let hit = flags.includes('F') ? line.includes(pattern!) : re.test(line)
      if (flags.includes('v')) hit = !hit
      if (!hit) return
      matchedAny = true
      fileMatches++
      if (flags.includes('q') || flags.includes('c') || flags.includes('l') || flags.includes('L')) return
      if (flags.includes('o')) {
        const g = new RegExp(re.source, 'g' + (flags.includes('i') ? 'i' : ''))
        for (const m of line.match(g) ?? []) {
          ctx.write((input.name && files.length > 1 ? `${input.name}:` : '') + (flags.includes('n') ? `${idx + 1}:` : '') + m + '\n')
        }
        return
      }
      if (files.length > 0 && input.name) {
        ctx.write(`${input.name}:${flags.includes('n') ? `${idx + 1}:` : ''}${line}\n`)
      } else {
        ctx.write((flags.includes('n') ? `${idx + 1}:` : '') + line + '\n')
      }
    })
    totalLines += fileMatches
    if (flags.includes('c')) {
      ctx.write(files.length > 0 && input.name ? `${input.name}:${fileMatches}\n` : `${fileMatches}\n`)
    }
    if (flags.includes('l') && fileMatches > 0) ctx.write(input.name + '\n')
    if (flags.includes('L') && fileMatches === 0) ctx.write(input.name + '\n')
  }
  void totalLines

  if (matchedAny) return 0
  return flags.includes('q') ? 1 : 0
})

function textEndsWithNewline(t: string): boolean {
  return t.endsWith('\n')
}

/* ------------------------------------ sed ------------------------------------ */

interface SedCommand {
  kind: 'substitute' | 'print' | 'delete' | 'range-print'
  pat?: RegExp
  repl?: string
  global?: boolean
  printMatch?: boolean
  ignoreCase?: boolean
  from?: number
  to?: number
  deletePat?: RegExp
}

function parseSedProgram(script: string): SedCommand[] {
  const cmds: SedCommand[] = []
  const parts = script.split(';')
  for (const partRaw of parts) {
    const part = partRaw.trim()
    if (!part) continue

    if (part[0] === 's') {
      // parse por escaneo: delim = part[1]; localiza los dos delimitadores siguientes sin escapar
      const delim = part[1]
      let i = 2
      const segments: string[] = ['']
      while (i < part.length && segments.length < 3) {
        const ch = part[i]
        if (ch === '\\' && i + 1 < part.length) { segments[segments.length - 1] += ch + part[i + 1]; i += 2; continue }
        if (ch === delim) { segments.push(''); i++; continue }
        segments[segments.length - 1] += ch
        i++
      }
      const flagStr = part.slice(i).replace(/^\s*/, '')
      if (segments.length < 2) throw new Error(`sed: -e expresión #1: sustitución mal formada: "${part}"`)
      const [patStr, replStr = '', rawFlags = ''] = segments
      const flagsForRe = (flagStr.toLowerCase().includes('i') ? 'i' : '') + 'g'
      cmds.push({
        kind: 'substitute',
        pat: new RegExp(patStr, flagsForRe.includes('g') ? flagsForRe : flagsForRe.replace('g', '')),
        repl: replStr.replace(/&/g, '$$&'),
        global: true, // usamos replace global y limitamos con contador si no hay g
        printMatch: flagStr.toLowerCase().includes('p'),
        ignoreCase: flagStr.toLowerCase().includes('i'),
      })
      // sin flag g: solo primera ocurrencia — guardamos para el ejecutor
      ;(cmds[cmds.length - 1] as SedCommand & { firstOnly?: boolean }).firstOnly = !flagStr.includes('g')
      continue
    }

    const dp = part.match(/^(\d+|\$)(?:,(\d+|\$))?p$/)
    if (dp) {
      const fromV = dp[1] === '$' ? Infinity : parseInt(dp[1], 10)
      const toV = dp[2] ? (dp[2] === '$' ? Infinity : parseInt(dp[2], 10)) : fromV
      cmds.push({ kind: 'range-print', from: fromV as number, to: toV as number })
      continue
    }
    const del = part.match(/^\/(.*)\/d$/)
    if (del) { cmds.push({ kind: 'delete', deletePat: new RegExp(del[1]) }); continue }
    throw new Error(`sed: -e expresión #1: comando no soportado en la simulación: "${part}"`)
  }
  return cmds
}

cmd('sed', (ctx) => {
  void ctx

  let inPlace: string | null = null
  let quiet = false
  const scripts: string[] = []
  const files: string[] = []

  const argv = rest(ctx)
  let scriptDone = false
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '-n') { quiet = true; continue }
    if (a === '-i' || a.startsWith('-i')) { inPlace = a.slice(2) || null; continue }
    if (a === '-e') { scripts.push(argv[++i] ?? ''); continue }
    if (a.startsWith('--expression=')) { scripts.push(a.slice(13)); continue }
    if (/^-[a-zA-Z]+$/.test(a)) continue
    if (!scriptDone) { scripts.push(a); scriptDone = true; continue }
    files.push(a)
  }
  if (scripts.length === 0) { ctx.errWrite("sed: -e expresión #1: falta el script\n"); return 2 }

  let program: SedCommand[]
  try {
    program = parseSedProgram(scripts.join(';'))
  } catch (e) {
    ctx.errWrite((e as Error).message + '\n')
    return 2
  }

  const apply = (text: string): string => {
    const lines = text.endsWith('\n') ? text.slice(0, -1).split('\n') : text.split('\n')
    let outLines: string[] = []
    lines.forEach((line, idx1) => {
      const lineno = idx1 + 1
      let cur = line
      let deleted = false
      let printedByCmd = false
      for (const c of program) {
        if (c.kind === 'substitute' && c.pat) {
          const before = cur
          const firstOnly = (c as SedCommand & { firstOnly?: boolean }).firstOnly === true
          if (firstOnly) {
            cur = cur.replace(new RegExp(c.pat.source, c.ignoreCase ? 'i' : ''), c.repl ?? '')
          } else {
            cur = cur.replace(c.pat, c.repl ?? '')
          }
          if (before !== cur && c.printMatch) { outLines.push(cur); printedByCmd = true }
        } else if (c.kind === 'delete' && c.deletePat) {
          if (c.deletePat.test(cur)) { deleted = true; break }
        } else if (c.kind === 'range-print') {
          const from = c.from === Infinity ? lines.length : (c.from as number)
          const to = c.to === Infinity ? lines.length : (c.to as number)
          if (lineno >= Math.min(from, to) && lineno <= Math.max(from, to)) { outLines.push(cur); printedByCmd = true }
        }
      }
      if (deleted) return
      if (!quiet) { if (!printedByCmd) outLines.push(cur) }
      else if (printedByCmd) { /* ya impresa */ }
    })
    return outLines.join('\n') + '\n'
  }

  if (inPlace !== null) {
    let code = 0
    for (const f of files) {
      try {
        const abs = ctx.vfs.resolve(f)
        const original = ctx.vfs.readFile(abs)
        const transformed = apply(original)
        if (inPlace) ctx.vfs.writeFile(abs + '.bak', original)
        ctx.vfs.writeFile(abs, transformed)
      } catch (e) {
        ctx.errWrite(`sed: ${(e as VFSError).message}\n`)
        code = 1
      }
    }
    return code
  }

  {
    let outText = ''
    for (const f of files.slice(1)) outText += safeRead(ctx, f) + (safeRead(ctx, f).endsWith('\n') || f === files[files.length - 1] ? '' : '\n')
    const base = files.length ? files.map((f) => safeRead(ctx, f)).join('\n') : ctx.stdin
    void outText
    ctx.write(apply(base))
  }
  return 0
})

/* ------------------------------------ awk ------------------------------------ */

interface AwkVarScope { get(n: string): string | number; set(n: string, v: string | number | boolean): void }

function awkEvalExpr(expr: string, fields: string[], nr: number, nf: number, scope: AwkVarScope): string | number | boolean {
  const t = expr.trim()
  // comparaciones
  const cmp = t.match(/^(.+?)\s*(==|!=|>=|<=|>|<|~|!~)\s*(.+)$/)
  if (cmp) {
    const l = String(awkEvalExpr(cmp[1], fields, nr, nf, scope))
    const rRaw = cmp[3].trim()
    const r = rRaw.startsWith('"') ? rRaw.slice(1, -1) : String(awkEvalExpr(rRaw, fields, nr, nf, scope))
    switch (cmp[2]) {
      case '==': return String(l) === String(r)
      case '!=': return String(l) !== String(r)
      case '>': return parseFloat(l) > parseFloat(r)
      case '<': return parseFloat(l) < parseFloat(r)
      case '>=': return parseFloat(l) >= parseFloat(r)
      case '<=': return parseFloat(l) <= parseFloat(r)
      case '~': return new RegExp(r).test(l)
      case '!~': return !new RegExp(r).test(l)
    }
  }
  // aritmética simple izquierda-a-derecha con precedencia * /
  const arith = t.match(/^([\s\S]+?)([+\-*%])([\s\S]+)$/)
  if (arith && !/^["']/.test(t)) {
    const toNum = (v: unknown): number => { const n = Number(v); return Number.isFinite(n) ? n : 0 }
    const l = toNum(awkEvalExpr(arith[1], fields, nr, nf, scope))
    const r = toNum(awkEvalExpr(arith[3], fields, nr, nf, scope))
    switch (arith[2]) {
      case '+': return l + r
      case '-': return l - r
      case '*': return l * r
      case '%': return l % r
    }
  }
  if (/^\$\d+$/.test(t)) {
    const i = parseInt(t.slice(1), 10)
    return i === 0 ? fields.join(' ') : fields[i - 1] ?? ''
  }
  if (t === 'NR') return nr
  if (t === 'NF') return nf
  if (t === '$0') return fields.join(' ')
  const str = t.match(/^"(.*)"$/)
  if (str) return str[1]
  const num = t.match(/^-?\d+(\.\d+)?$/)
  if (num) return parseFloat(t)
  const inc = t.match(/^(\w+)\+\+$/)
  if (inc) { const v = Number(scope.get(inc[1]) ?? 0); scope.set(inc[1], v + 1); return v }
  const named = t.match(/^\w+$/)
  if (named) return scope.get(t) ?? 0
  return t
}

function parseAwkBraces(program: string): { begin?: string; main?: string; end?: string } {
  const result: { begin?: string; main?: string; end?: string } = {}
  const re = /(BEGIN|END)?\s*\{/g
  let match: RegExpExecArray | null
  const blocks: { key?: string; start: number; braceStart: number }[] = []
  while ((match = re.exec(program))) {
    blocks.push({ key: match[1], start: match.index, braceStart: match.index + match[0].length - 1 })
  }
  for (let b = blocks.length - 1; b >= 0; b--) {
    const blk = blocks[b]
    let depth = 1
    let i = blk.braceStart + 1
    while (i < program.length && depth > 0) {
      if (program[i] === '{') depth++
      if (program[i] === '}') depth--
      i++
    }
    const body = program.slice(blk.braceStart + 1, i - 1)
    if (blk.key === 'BEGIN') result.begin = body
    else if (blk.key === 'END') result.end = body
    else {
      // TODO el texto ANTES de la llave es la condición/patrón del bloque principal
      const condPart = program.slice(0, blk.start).trim()
      result.main = (condPart ? condPart + ' ' : '') + '{' + body + '}'
    }
  }
  return result
}

cmd('awk', (ctx) => {
  let fsSep = /\s+/
  let programSrc = ''
  const files: string[] = []
  const argv = rest(ctx)
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '-F') { fsSep = new RegExp(argv[++i] ?? '\\s+'); continue }
    if (a.startsWith('-F')) { fsSep = new RegExp(a.slice(2).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')); continue }
    if (a === '-v') { i++; continue }
    if (a.startsWith('-')) continue
    if (!programSrc) programSrc = a
    else files.push(a)
  }

  const parsed = parseAwkBraces(programSrc)
  const scopeMap: Record<string, string | number | boolean> = {}
  const scope: AwkVarScope = {
    get: (n) => scopeMap[n] ?? 0,
    set: (n, v) => { scopeMap[n] = v },
  } as AwkVarScope

  const runAction = (body: string, fields: string[], nr: number): void => {
    // separar sentencias por ; (simple)
    for (const stmtRaw of body.split(';')) {
      const stmt = stmtRaw.trim()
      if (!stmt) continue
      const printM = stmt.match(/^printf\s+([\s\S]+)$/)
      if (printM) {
        const parts = splitTop(printM[1])
        const fmtRaw = parts[0]?.trim() ?? '""'
        const fmt = fmtRaw.replace(/^"/, '').replace(/"$/, '').replace(/\\n/g, '\n').replace(/\\t/g, '\t')
        const vals = parts.slice(1).map((p2) => String(awkEvalExpr(p2.trim(), fields, nr, fields.length, scope)))
        let vi = 0
        const rendered = fmt.replace(/%[-0-9.]*[sdf]/g, (sp) => {
          const v = vals[vi++]
          if (sp.endsWith('d')) return String(Math.round(Number(v)))
          if (sp.endsWith('f')) return Number(v).toFixed((sp.match(/\.(\\d+)/)?.[1] as unknown as number) || 6)
          return String(v)
        })
        ctx.write(rendered)
        continue
      }
      const printM2 = stmt.match(/^print\s+(.*)$/)
      if (printM2) {
        const list = splitTop(printM2[1]).map((p2) => p2.trim())
        const vals = list.map((p2) => (p2 === '' ? '' : String(awkEvalExpr(p2, fields, nr, fields.length, scope))))
        ctx.write(vals.join(vals.length > 1 ? ' ' : '') + '\n')
        continue
      }
      const assign = stmt.match(/^(\w+)\s*([-+*/]?)=\s*([\s\S]+)$/)
      if (assign) {
        const cur = Number(scope.get(assign[1]) ?? 0)
        const rhsRaw = awkEvalExpr(assign[3], fields, nr, fields.length, scope)
        const toNum2 = (v: unknown): number => { const n = Number(v); return Number.isFinite(n) ? n : 0 }
        const rhs = typeof rhsRaw === 'boolean' ? (rhsRaw ? 1 : 0) : toNum2(rhsRaw)
        if (assign[2] === '=') scope.set(assign[1], typeof rhsRaw === 'string' && isNaN(Number(rhsRaw)) ? rhsRaw : rhs)
        else if (assign[2] === '+') scope.set(assign[1], cur + Number(rhs))
        else if (assign[2] === '-') scope.set(assign[1], cur - Number(rhs))
        continue
      }
      // acción desconocida → silencio educativo
    }
  }

  const runMainLine = (main: string, fields: string[], nr: number): void => {
    const m = main.match(/^([\s\S]*?)\s*\{([\s\S]*)\}$/)
    if (!m) return
    const cond = m[1].trim()
    if (cond) {
      if (cond.startsWith('$0 ~')) {
        const reM = cond.match(/\$\d*\s*~\s*\/(.+)\/$/)
        if (reM && !new RegExp(reM[1]).test(fields.join(' '))) return
      } else {
        const neg = cond.startsWith('!')
        const testExpr = neg ? cond.slice(1) : cond
        const v = awkEvalExpr(testExpr, fields, nr, fields.length, scope)
        if (typeof v === 'boolean') {
          if (neg === v) return
        } else {
          const truthy = typeof v === 'number' ? v !== 0 : String(v) !== '' && String(v) !== 'false'
          if (neg === truthy) return
        }
      }
    }
    runAction(m[2], fields, nr)
  }

  if (parsed.begin) runAction(parsed.begin, [], 0)

  const text = files.length ? files.map((f) => safeRead(ctx, f)).join('\n') : ctx.stdin
  const lines = text.endsWith('\n') ? text.slice(0, -1).split('\n') : text.split('\n')
  let nr = 0
  for (const line of lines) {
    nr++
    if (line === '' && text === '') continue
    const fields = line.split(fsSep)
    if (parsed.main) runMainLine(parsed.main, fields, nr)
  }

  if (parsed.end) runAction(parsed.end, [], nr)
  return 0
})

function splitTop(s: string): string[] {
  const parts: string[] = []
  let depth = 0
  let quote: '"' | "'" | null = null
  let cur = ''
  for (const ch of s) {
    if (quote) { cur += ch; if (ch === quote) quote = null; continue }
    if (ch === '"' || ch === "'") { quote = ch; cur += ch; continue }
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (ch === ',' && depth === 0) { parts.push(cur); cur = ''; continue }
    cur += ch
  }
  parts.push(cur)
  return parts
}
