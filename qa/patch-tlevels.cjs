const fs = require('fs')
const p = 'src/data/troubleshooting.ts'
let s = fs.readFileSync(p, 'utf8')

const LEVELS_BY_ID = {
  'no-internet': 'intermedio', 'no-wifi': 'facil', 'no-audio': 'facil', 'black-screen': 'avanzado',
  'nvidia-not-working': 'avanzado', 'hyprland-no-start': 'avanzado', 'steam-no-open': 'intermedio',
  'proton-fail': 'intermedio', 'bluetooth-fail': 'facil', 'grub-missing': 'avanzado',
  'systemd-boot-missing': 'avanzado', 'arch-no-boot': 'avanzado', 'pacman-error': 'intermedio',
  'servicio-no-inicia': 'intermedio', 'puerto-ocupado': 'facil', 'aur-fail': 'intermedio',
}

let injected = 0
for (const [id, lvl] of Object.entries(LEVELS_BY_ID)) {
  const needle = "id: '" + id + "',\n    title:"
  if (!s.includes(needle)) { console.error('no encontrado:', id); continue }
  // insertar level justo antes de "category:" de esa entrada
  const start = s.indexOf(needle)
  const catIdx = s.indexOf("    category:", start)
  if (catIdx === -1) { console.error('sin category en', id); continue }
  s = s.slice(0, catIdx) + "    level: '" + lvl + "',\n" + s.slice(catIdx)
  injected++
}

s = s.replace('export const PROBLEMS: Problem[] = [', 'const BASE_PROBLEMS: Problem[] = [')
// exportar unión al final del archivo
if (!s.includes('...MORE_PROBLEMS')) {
  s = s.replace(/\n\]\s*$/, '\n]\n\nexport const PROBLEMS: Problem[] = [...BASE_PROBLEMS, ...MORE_PROBLEMS]\n')
}
fs.writeFileSync(p, s)
console.log('levels inyectados:', injected, '| union:', s.includes('...MORE_PROBLEMS'))
