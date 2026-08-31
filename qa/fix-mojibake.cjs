/* Repara los U+FFFD de builderLogic.ts e index.css (una sola vez). */
const fs = require('fs')
const fixes = [
  ['src/data/builderLogic.ts', [
    [/subvol\uFFFDmenes/g, 'subvolúmenes'],
    [/ra\uFFFDz\./g, 'raíz.'],
    [/subvol=@\uFFFD/g, 'subvol=@home'],
  ]],
  ['src/index.css', [
    [/opci\uFFFDn desactivada/g, 'opción desactivada'],
  ]],
]
let total = 0
for (const [p, rules] of fixes) {
  let s = fs.readFileSync(p, 'utf8')
  for (const [re, to] of rules) {
    s = s.replace(re, to)
  }
  const left = (s.match(/\uFFFD/g) || []).length
  total += left
  fs.writeFileSync(p, s)
  console.log(p, '→ restantes:', left)
}
process.exit(total === 0 ? 0 : 1)
