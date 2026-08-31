const fs = require('fs')
const p = 'src/cli/commands.ts'
let s = fs.readFileSync(p, 'utf8')

// 1. eliminar bloque de declaraciones basura tras su()
s = s.replace(/declare module '\.\/commands' \{[\s\S]*?const ctxX[^\n]*\nvoid ctxX\nObject\.assign\(\{\}, \{\}\)\n\n\/\/ helper usado por su\(\): cambiar también el cwd interno[\s\S]*?void chdirSafePatch\n/, '')

// 2. su(): usar chdir del contexto
s = s.replace("if (target === 'root') ctx.vfs.cwd = '/root'; ctx.chdirSafe?.('/')", "if (target === 'root') ctx.chdir('/root')")

// 3. cat(): mensaje de error limpio
s = s.replace(
  "    try { ctx.write(ctx.vfs.readFile(ctx.vfs.resolve(f))) }\n    catch { ctx.errWrite(`cat: ${f}: ${(new VFSError('')).message || ''}${ctx.vfs.exists(ctx.vfs.resolve(f)) ? 'Is a directory' : 'No such file or directory'}\\n`); code = 1 }",
  "    try { ctx.write(ctx.vfs.readFile(ctx.vfs.resolve(f))) }\n    catch {\n      const abs = ctx.vfs.resolve(f)\n      const reason = !ctx.vfs.exists(abs) ? 'No such file or directory' : 'Is a directory'\n      ctx.errWrite(`cat: ${f}: ${reason}\\n`)\n      code = 1\n    }"
)

// 4. eliminar requireRoot sin usar
s = s.replace(/function requireRoot\(ctx: ExecContext, action: string\): boolean \{[\s\S]*?\n\}\n\n/, '')
s = s.replace(/\n\s*void requireRoot\n/, '\n')

// 5. grep: -c / -l / -L excluyen la impresión de líneas
s = s.replace(
  "      matchedAny = true\n      fileMatches++\n      if (flags.includes('q')) return",
  "      matchedAny = true\n      fileMatches++\n      if (flags.includes('q') || flags.includes('c') || flags.includes('l') || flags.includes('L')) return"
)

// 6. parsing de argumentos de sed reescrito
const oldSedParse = `  const argv = ctx.args.slice(1)
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '-n') quiet = true
    else if (a === '-i' || a.startsWith('-i')) inPlace = a.slice(2) || null
    else if (a === '-e') scripts.push(argv[++i])
    else if (a.startsWith('--expression=')) scripts.push(a.slice(13))
    else if (/^-[a-zA-Z]+$/.test(a)) { /* otros flags ignorados */ }
    else scripts.length && !files.length ? files.push(a) : scripts.length === 0 ? scripts.push(a) : files.push(a)
  }`
const newSedParse = `  const argv = ctx.args.slice(1)
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
  }`
if (!s.includes(oldSedParse)) { console.error('sed parse pattern NOT FOUND'); process.exit(1) }
s = s.replace(oldSedParse, newSedParse)

// 7. fileArgs de sed debe usar la lista ya separada
s = s.replace('  const fileArgs = operands(ctx.args).slice(0)\n', '')

fs.writeFileSync(p, s)
console.log('limpieza ok')
