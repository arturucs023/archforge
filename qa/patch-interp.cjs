const fs = require('fs')
const p = 'src/cli/interpreter.ts'
let s = fs.readFileSync(p, 'utf8')

// 1. limpiar _noop y lógica muerta en expand()
s = s.replace(/    return s\n\n    function _noop\(\): void \{\}\n    void _noop\n  \}/, '    return s\n  }')
s = s.replace(
  /      if \(!brace1 && !\/\^\[@\*\#\?\$!0-9\]\$\//,
  '      if (!brace1 && false //'
)

// 2. firma de runStatement simplificada
s = s.replace(
  'private runStatement(stmt: string, _lines: string[], logical: { text: string; next: number }[], idx: number, _tick: () => void): ControlSignal | null {',
  'private runStatement(stmt: string, logical: { text: string; next: number }[], idx: number): ControlSignal | null {'
)
s = s.replace(
  '      const signal = this.runStatement(text, lines, logical, i - 1, () => {\n        // callback para que las estructuras avancen el índice correcto\n      })',
  '      const signal = this.runStatement(text, logical, i - 1)'
)

// 3. quitar cola de aliases/cruft
// 3. imports ya corregidos manualmente

fs.writeFileSync(p, s)
console.log('limpio:', !s.includes('_noop'), s.includes('runStatement(stmt: string, logical'))
