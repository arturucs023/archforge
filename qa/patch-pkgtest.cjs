const fs = require('fs')
const p = 'qa/packages.test.ts'
let s = fs.readFileSync(p, 'utf8')

// reinstall: instalar dos veces
s = s.replace(
  "  const o1 = outOf(s, 'sudo apt install -y curl')\n  if (!o1.includes('ya está en su versión más reciente')) fail('reinstall curl no avisó'); else ok('paquete ya instalado detectado')",
  "  outOf(s, 'sudo apt install -y curl')\n  const o1 = outOf(s, 'sudo apt install -y curl')\n  if (!o1.includes('ya está en su versión más reciente')) fail('reinstall curl no avisó'); else ok('paquete ya instalado detectado')"
)

// purge: instalar nginx antes
s = s.replace(
  "  const o3 = outOf(s, 'sudo apt purge -y nginx')\n  if (!o3.includes('Purgando nginx')) fail('purge salida'); else ok('apt purge')",
  "  outOf(s, 'sudo apt install -y nginx')\n  const o3 = outOf(s, 'sudo apt purge -y nginx')\n  if (!o3.includes('Purgando nginx')) fail('purge salida'); else ok('apt purge')"
)

// -Syu: capturar la salida del propio comando (no pregunta)
s = s.replace(
  "  s.execute('sudo pacman -Syu')\n  const ans = outOf(s, '')\n  if (!ans.includes('Sincronizando las bases de datos')) fail('-Syu sin sincronización'); else ok('-Syu sincroniza índices')",
  "  const syu = outOf(s, 'sudo pacman -Syu')\n  if (!syu.includes('Sincronizando las bases de datos')) fail('-Syu sin sincronización'); else ok('-Syu sincroniza índices')"
)

// bloque aislamiento: run no existe aquí
s = s.replace("  run(s, 'sudo pacman -S --noconfirm nginx')", "  for (const c of ['sudo pacman -S --noconfirm nginx']) s.execute(c)")

fs.writeFileSync(p, s)
console.log('tests corregidos')
