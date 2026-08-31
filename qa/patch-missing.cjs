const fs = require('fs')

// ── 1. Añadir los 8 comandos que faltan a entries-more.ts ──
const p1 = 'src/data/cmdcenter/entries-more.ts'
let m = fs.readFileSync(p1, 'utf8')
const additions = `
  /* ---------------- bash/shell que faltaban ---------------- */
  {
    id: 'history', name: 'history', cat: 'bash-shell', distro: ['arch', 'debian'], important: true,
    summary: 'Muestra el historial de comandos de la sesión; !N re-ejecuta el comando N.',
    examples: [{ lines: ['history | tail -10', '!42   # re-ejecuta el comando número 42'] }],
    intents: ['ver historial', 'comandos anteriores', 'repetir comando'],
  },
  {
    id: 'unset', name: 'unset', cat: 'bash-shell', distro: ['arch', 'debian'],
    summary: 'Elimina una variable o función del shell actual.',
    examples: [{ lines: ['unset TEMP_TOKEN'] }],
    intents: ['borrar variable', 'eliminar variable entorno'],
  },
  {
    id: 'env', name: 'env', cat: 'bash-shell', distro: ['arch', 'debian'], important: true,
    summary: 'Lista las variables de entorno actuales o ejecuta un comando con entorno modificado.',
    examples: [{ lines: ['env | sort | head', 'EDITOR=vim env | grep EDITOR'] }],
    intents: ['ver variables entorno', 'listar entorno'],
  },
  {
    id: 'printenv', name: 'printenv', cat: 'bash-shell', distro: ['arch', 'debian'],
    summary: 'Imprime el valor de una variable de entorno concreta (exit 1 si no existe).',
    examples: [{ lines: ['printenv HOME', 'printenv PATH'] }],
    intents: ['valor variable entorno'],
  },
  {
    id: 'read', name: 'read', cat: 'bash-shell', distro: ['arch', 'debian'], important: true,
    summary: 'Lee una línea de stdin y la asigna a variables; base de scripts interactivos.',
    examples: [
      { desc: 'pregunta al usuario', lines: ['read -p "¿Tu nombre? " NOMBRE', 'echo "Hola, $NOMBRE"'] },
      { desc: 'contraseña sin eco', lines: ['read -rs -p "Contraseña: " PASS'] },
      { desc: 'leer archivo línea a línea', lines: ['while IFS= read -r linea; do echo "$linea"; done < fichero.txt'] },
    ],
    breakdown: [
      { token: '-p "texto"', meaning: 'muestra un prompt antes de leer' },
      { token: '-r', meaning: 'raw: respeta backslashes (SIEMPRE)' },
      { token: '-s', meaning: 'silent: no muestra lo tecleado (contraseñas)' },
      { token: 'IFS=', meaning: 'conserva espacios iniciales/finales en while-read' },
    ],
    related: ['cat'],
    intents: ['pedir datos usuario', 'input interactivo', 'leer entrada teclado'],
  },
  {
    id: 'command', name: 'command', cat: 'bash-shell', distro: ['arch', 'debian'],
    summary: 'Ejecuta un comando evitando funciones/alias; -v revela dónde está.',
    examples: [{ lines: ['command -v ls', 'command ls   # fuerza el binario, no tu alias'] }],
    intents: ['evitar alias', 'ejecutar binario directo'],
  },
  {
    id: 'realpath', name: 'realpath', cat: 'archivos', distro: ['arch', 'debian'],
    summary: 'Resuelve una ruta a su forma absoluta real (siguiendo symlinks).',
    examples: [{ lines: ['realpath ~/enlace-simbolico'] }],
    intents: ['ruta absoluta real', 'resolver symlink ruta'],
  },
`
const anchorM = "  { id: 'sync', name: 'sync',"
if (!m.includes(anchorM)) { console.error('anchor sync no encontrado'); process.exit(1) }
const idxM = m.indexOf(anchorM)
// insertar antes del bloque sync
m = m.slice(0, idxM) + additions + '\n' + m.slice(idxM)
fs.writeFileSync(p1, m)

// ── 2. ssh-clave-rechazada: corregir id en troubleshooting-groups.ts ──
const p2 = 'src/data/troubleshooting-groups.ts'
let g = fs.readFileSync(p2, 'utf8')
// localizar el id real del problema SSH rechazada
const match = g.match(/id: '([^']+)',\n\s+title: 'SSH rechaza/)
console.log('id ssh actual:', match ? match[1] : 'NO ENCONTRADO')
