const fs = require('fs')
const p = 'src/pages/CommandCenterPage.tsx'
let s = fs.readFileSync(p, 'utf8')
s = s.replace(
  "import { CATS, EQUIVALENCES, SYMBOLS } from '../data/cmdcenter/meta'",
  "import { CATS, EQUIVALENCES as PKG_EQUIVALENCIAS, SYMBOLS } from '../data/cmdcenter/meta'"
)
s = s.split('{EQUIVALENCIAS.map').join('{PKG_EQUIVALENCIAS.map')
fs.writeFileSync(p, s)
console.log('alias ok:', s.includes('PKG_EQUIVALENCIAS'))
