const fs = require('fs')
const p = 'src/cli/commands.ts'
let s = fs.readFileSync(p, 'utf8')
const needle = "cmd('date'"
const first = s.indexOf(needle)
const second = s.indexOf(needle, first + 1)
if (second > -1) {
  const end = s.indexOf('\n\n', second)
  s = s.slice(0, second) + s.slice(end + 2)
  fs.writeFileSync(p, s)
}
console.log('dates:', (s.match(new RegExp("cmd\\('date'", 'g')) || []).length)
