const fs = require('fs')
const p = 'qa/cli.test.ts'
let s = fs.readFileSync(p, 'utf8')
const reps = [
  [/fail\('sed -i\.bak no dej. backup ni modific\.\)/, "fail('sedibak: ' + JSON.stringify(allLines(s)))"],
  [/fail\('awk print \$1: ' \+ o\.join\(.\|.\)\)/, "fail('awk1: ' + JSON.stringify(allLines(s)))"],
  [/fail\('script con \$1: ' \+ lastOut\(s\)\)/, "fail('scriptarg: ' + JSON.stringify(allLines(s)))"],
  [/fail\('awk condici.n nota.78: \+ names\)\); else ok/, "fail('awkc: ' + JSON.stringify(names))); else ok"],
]
for (const [re, to] of reps) s = s.replace(re, to)
fs.writeFileSync(p, s)
console.log([s.includes('sedibak'), s.includes('awk1'), s.includes('scriptarg')])
