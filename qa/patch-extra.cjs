const fs = require('fs')
const p = 'src/data/cmdcenter/entries-extra.ts'
let s = fs.readFileSync(p, 'utf8')
// caption → desc
s = s.split('{ caption:').join('{ desc:')
// deduplicar 'important: true' conservando el último por entrada (líneas standalone)
const lines = s.split('\n')
let i = 0
let removed = 0
while (i < lines.length) {
  if (lines[i] === '  {') {
    let j = i + 1
    while (j < lines.length && !(lines[j] === '  },' || lines[j] === '  }')) j++
    const block = lines.slice(i, j + 1).join('\n')
    const n = (block.match(/important: true/g) || []).length
    const hasInline = /id: .*important: true/.test(block)
    if (n > 1 && hasInline) {
      for (let k = i + 1; k <= j; k++) {
        if (lines[k] !== undefined && lines[k].trim() === 'important: true,') { lines.splice(k, 1); j--; i = k - 1 < i ? i : i; removed++ }
      }
    }
    i = j + 1
  } else i++
}
fs.writeFileSync(p, lines.join('\n'))
console.log('captions→desc y duplicados eliminados:', removed)
