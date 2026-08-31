const fs = require('fs')
const p = 'src/cli/commands.ts'
let s = fs.readFileSync(p, 'utf8')

// insertar helpers rest()/operandsRest() tras la definición de operands()
const anchor = 'function operands(args: string[]): string[] {'
const idx = s.indexOf(anchor)
if (idx === -1) { console.error('anchor no encontrado'); process.exit(1) }
const closeBrace = s.indexOf('\n}', idx) + 2
const helpers = '\n\nfunction rest(ctx: ExecContext): string[] {\n  return ctx.args.slice(1)\n}\nfunction operandsRest(ctx: ExecContext): string[] {\n  return operands(rest(ctx))\n}\nfunction flagsRest(ctx: ExecContext): string {\n  return flagsOf(rest(ctx))\n}'
s = s.slice(0, closeBrace) + helpers + s.slice(closeBrace)

s = s.split('operands(ctx.args)').join('operandsRest(ctx)')
s = s.split('flagsOf(ctx.args)').join('flagsRest(ctx)')
s = s.replace("cmd('tr', (ctx) => {\n  const sets = ctx.args.filter((a) => !a.startsWith('-'))", "cmd('tr', (ctx) => {\n  const sets = rest(ctx).filter((a) => !a.startsWith('-'))")
s = s.replace(
  'const root = ctx.args.find((a, i) => i > 0 && !a.startsWith(',
  'const rargs = rest(ctx)\n  const root = rargs.find((a, i) => i > 0 && !a.startsWith('
)
s = s.replace("&& ctx.args[i - 1] !== '-name') ?? '.'", "&& rargs[i - 1] !== '-name') ?? rargs[0] ?? '.'")

// grep/sed/awk ya hacían slice(1): ahora rest() equivale — normalizar sus loops
s = s.replace("for (let i = 1; i < ctx.args.length; i++) {\n    const a = ctx.args[i]", "const gargs = rest(ctx)\n  for (let i = 0; i < gargs.length; i++) {\n    const a = gargs[i]")
s = s.replace("if (/^-[eA-Za-z]*e/.test(a) && ctx.args[i + 1]) { i++; continue }", "if (/^-[A-Za-z]*e$/.test(a)) { pattern = gargs[++i]; continue }")
s = s.replace("pattern = nonFlags[0]\n  const files = nonFlags.slice(1)", "pattern = pattern ?? nonFlags[0]\n  const files = nonFlags.slice(0)")
s = s.replace("cmd('sed', (ctx) => {", "cmd('sed', (ctx) => {\n  void ctx\n", )
// sed/awk: sustituir slice(1) interno por rest
s = s.replace(/const argv = ctx\.args\.slice\(1\)/g, 'const argv = rest(ctx)')

fs.writeFileSync(p, s)
console.log('normalizado')
