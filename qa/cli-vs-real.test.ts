/* QA AVISO CLI vs REAL: contenido exigido, enlace válido y no-regresión. */
import * as fsMod from 'fs'

let fails = 0
const ok = (cond: boolean, label: string): void => {
  if (!cond) fails++
  console.log(`${cond ? 'ok  ' : 'FALLO'} ${label}`)
}

const src = fsMod.readFileSync('src/components/CliVsRealNotice.tsx', 'utf8')
const page = fsMod.readFileSync('src/pages/TerminalPage.tsx', 'utf8')

ok(src.includes('¿Quieres ir un paso más allá?'), 'título exacto presente')
ok(src.includes('simulación educativa'), 'párrafo 1 (fragmento clave)')
ok(src.includes('no puede reproducir todo el comportamiento'), 'párrafo 1 (límite explícito)')
ok(src.includes('máquina Linux real o en una máquina virtual'), 'párrafo 2 (recomendación)')
ok(src.includes('ArchForge te enseña los conceptos. Una máquina Linux real te permite ponerlos en práctica.'), 'frase clave textual')
for (const pt of ['No necesitas instalar nada', 'Laboratorios controlados', 'Perfecta para empezar']) ok(src.includes(pt), `CLI card: ${pt}`)
for (const pt of ['systemd real', 'Errores reales', 'administración de sistemas']) ok(src.includes(pt), `Real card: ${pt}`)
ok(src.includes('Preparar un laboratorio Linux'), 'botón del laboratorio presente')
ok(src.includes('#/vm'), 'enlace apunta a la página de la VM real')
ok(page.includes('<CliVsRealNotice />'), 'el aviso se renderiza junto a la CLI (TerminalPage)')

// accesibilidad + responsive
ok(src.includes('aria-labelledby') && src.includes('cli-vs-real-title'), 'sección etiquetada (aria-labelledby)')
ok(src.includes('aria-label='), 'enlace con aria-label descriptivo')
ok(src.includes('sm:grid-cols-2'), 'columnas lado a lado solo desde sm (apilado en móvil)')

// no toca la CLI: el componente no importa nada del motor
ok(!src.includes("from '../cli"), 'el aviso no acopla ni altera la CLI simulada')

console.log(fails === 0 ? '\nQA AVISO CLI/REAL: TODO OK' : `\nQA AVISO CLI/REAL: ${fails} FALLOS`)
process.exit(fails === 0 ? 0 : 1)
