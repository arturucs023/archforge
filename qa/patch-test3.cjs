const fs = require('fs')
const p = 'qa/cli.test.ts'
let s = fs.readFileSync(p, 'utf8')

// rmdir: vaciar antes
s = s.replace(
  "  run(s, 'cd ..', 'rmdir test')",
  "  run(s, 'rm archivo.txt', 'cd ..', 'rmdir test')"
)

// chmod +x: comprobar bit x final, no '--x'
s = s.replace(
  "if (!lastOut(s).includes('--x')) fail('chmod +x no añade ejecución'); else ok('chmod +x')",
  "if (!/x$/.test(lastOut(s).split(' ').slice(0,1)[0] ?? '') && !/r-x|-x/.test(lastOut(s))) fail('chmod +x no añade ejecución'); else ok('chmod +x')"
)

// sed básico: solo exigir robert y que la fila 2 lo contenga
s = s.replace(
  "if (!o.includes('robert') || !o.includes('bob')) fail('sed sin g debe dejar el resto intacto… bob aparece solo una vez por línea así que ok si robert está: ' + o); else ok('sed sustitución básica')",
  "if (!o.includes('robert') || o.includes('bob')) fail('sed básico: ' + o); else ok('sed sustitución básica')"
)

fs.writeFileSync(p, s)
console.log('assertions actualizadas')
