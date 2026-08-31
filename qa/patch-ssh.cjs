const fs = require('fs')
const p = 'src/data/troubleshooting-groups.ts'
let s = fs.readFileSync(p, 'utf8')

const entry = [
  "  mk({",
  "    id: 'ssh-clave-rechazada', title: 'SSH rechaza la clave p\u00fablica', category: 'Usuarios/Permisos', level: 'intermedio',",
  "    symptoms: ['Permission denied (publickey) con clave cargada', 'Funcionaba ayer y hoy no'],",
  "    causes: ['authorized_keys con permisos/due\u00f1o incorrectos en el servidor', 'sshd endurecido a PubkeyAuthentication yes sin clave instalada', 'HOME del usuario remoto escribible por grupo'],",
  "    diagnose: [cmd({}, 'ssh -v usuario@host 2>&1 | grep -iE \"offer|denied|identity\"')],",
  "    solutions: [{ title: 'Checklist del servidor', blocks: [ul('~/.ssh debe ser 700 y propiedad del usuario remoto', 'authorized_keys 600 y mismo due\u00f1o', 'home del usuario NO escribible por grupo/otros (755 m\u00e1x)'), cmd({}, 'chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys')] }],",
  "    finalCheck: 'ssh -v termina en \u00abAuthentication succeeded (publickey)\u00bb.',",
  "    alternatives: ['ssh-copy-id reinstala la clave con permisos correctos.'],",
  "  },",
].join('\n')

// insertar antes del último ] del archivo
const lastIdx = s.lastIndexOf(']')
s = s.slice(0, lastIdx) + entry + '\n' + s.slice(lastIdx)

fs.writeFileSync(p, s)
console.log('insertado:', s.includes("id: 'ssh-clave-rechazada'"))
