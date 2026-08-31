const fs = require('fs')
const p = 'src/components/VirtualTerminal.tsx'
let s = fs.readFileSync(p, 'utf8')
s = s.split('const prompt = useMemo').join('const promptText = useMemo')
s = s.replace(/\$\{prompt\(\)\}/g, '${promptText}')
s = s.replace(/\{prompt\}/g, '{promptText}')
s = s.replace('useMemo(() => session.prompt(), [session, lines.length, distro])', 'useMemo(() => session.prompt(), [session, lines.length, distro])')
fs.writeFileSync(p, s)
console.log('ok', s.includes('promptText'), !/\$\{prompt\(\)\}/.test(s))
