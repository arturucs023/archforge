const fs = require('fs')
const p = 'src/pages/CommandCenterPage.tsx'
let s = fs.readFileSync(p, 'utf8')
s = s.replace(
  "import { CATS, SYMBOLS } from '../data/cmdcenter/meta'",
  "import { CATS, EQUIVALENCES, SYMBOLS } from '../data/cmdcenter/meta'"
)
fs.writeFileSync(p, s)
console.log('EQUIVALENCES importado:', s.includes('EQUIVALENCES'))
