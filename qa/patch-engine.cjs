const fs = require('fs')

// ── engine: expandArgv (llaves + globs) ──
{
  let e = fs.readFileSync('src/cli/engine.ts', 'utf8')
  if (!e.includes('expandArgv')) {
    e = e.replace(
      '      const name = stage.argv[0]',
      '      const argvExpanded = expandArgv(stage.argv, this.vfs)\n      const name = argvExpanded[0]'
    )
    e = e.replace(
      '        args: stage.argv,',
      '        args: argvExpanded,'
    )
    const fn = [
      '',
      '/** Expansión de llaves {a,b} {1..5} y globs * ? sobre argv (estilo Bash básico). */',
      'export function expandArgv(argv: string[], vfs: VFS): string[] {',
      '  const out: string[] = []',
      '  for (const token of argv) {',
      "    const braceM = token.match(/\\{([^{}]+)\\}/)",
      '    if (braceM) {',
      '      const inner = braceM[1]',
      "      const rangeM = inner.match(/^(\\d+)\\.\\.(\\d+)$/)",
      '      let alts: string[]',
      '      if (rangeM) {',
      '        alts = []',
      '        for (let i = parseInt(rangeM[1], 10); i <= parseInt(rangeM[2], 10); i++) alts.push(String(i))',
      '      } else {',
      "        alts = inner.split(',')",
      '      }',
      '      for (const alt of alts) out.push(...expandArgv([token.replace(braceM[0], alt)], vfs))',
      '      continue',
      '    }',
      "    if (/[*?]/.test(token)) {",
      "      const slashIdx = token.lastIndexOf('/')",
      '      const dirPart = slashIdx >= 0 ? token.slice(0, slashIdx) || \'/\' : \'.\'',
      '      const basePart = slashIdx >= 0 ? token.slice(slashIdx + 1) : token',
      '      const absDir = vfs.resolve(dirPart)',
      '      try {',
      '        const re = globToRegex(basePart)',
      '        const entries = vfs.listDir(absDir).filter((n) => re.test(n))',
      '        if (entries.length > 0) {',
      '          for (const n of entries) out.push(slashIdx >= 0 ? dirPart + \'/\' + n : n)',
      '          continue',
      '        }',
      '      } catch { /* literal si no hay matches o error */ }',
      '      out.push(token)',
      '      continue',
      '    }',
      '    out.push(token)',
      '  }',
      '  return out',
      '}',
      '',
      "import { globToRegex } from './fs'",
      '',
    ].join('\n')
    e = e + fn
    fs.writeFileSync('src/cli/engine.ts', e)
  }
  console.log('engine expandArgv:', e.includes('expandArgv'))
}
console.log('ok')
