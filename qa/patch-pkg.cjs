const fs = require('fs')
{
  const p = 'src/cli/aptcmd.ts'
  let a = fs.readFileSync(p, 'utf8')
  if (!a.includes('REGISTRY')) {
    a = a.replace(
      "import type { ExecContext } from './commands'",
      "import type { ExecContext } from './commands'\nimport { REGISTRY } from './commands'"
    )
    fs.writeFileSync(p, a)
  }
  console.log('aptcmd REGISTRY:', a.includes('REGISTRY'))
}
for (const p of ['src/cli/apt.ts', 'src/cli/pacmancmd.ts']) {
  let x = fs.readFileSync(p, 'utf8')
  x = x.split('ctx.ask(').join('ctx.ask?.(')
  fs.writeFileSync(p, x)
}
console.log('ask optional aplicado')
