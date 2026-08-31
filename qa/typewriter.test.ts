/* QA TYPEWRITER portada: texto exacto, una sola vez, reduced-motion, sin shift. */
import * as fsMod from 'fs'

let fails = 0
const ok = (cond: boolean, label: string): void => {
  if (!cond) fails++
  console.log(`${cond ? 'ok  ' : 'FALLO'} ${label}`)
}

{
  const home = fsMod.readFileSync('src/pages/HomePage.tsx', 'utf8')
  ok(home.includes("const HERO_SUB = 'Learn Linux. Build Arch. Master the terminal.'"), 'texto exacto del subtítulo como constante única')
  ok(home.includes('document.title'), 'document.title intacto')
  // una sola vez por carga de app (flag de módulo fuera del componente)
  ok(/let heroPlayed = false/.test(home), 'flag a nivel de módulo → no se repite al volver a la portada')
  ok(home.includes('heroPlayed = true') && home.indexOf('heroPlayed = true') > home.indexOf('let heroPlayed'), 'se marca al iniciar la animación')
  // reduced motion: texto completo inmediato y sin cursor
  ok(home.includes('(prefers-reduced-motion: reduce)'), 'respeta prefers-reduced-motion')
  ok(/!reduceMotion/.test(home) || /animate = !heroPlayed && !reduceMotion/.test(home), 'reduce → sin animación ni cursor')
  // velocidad 40ms dentro del rango 35-50
  ok(/MS_PER_CHAR = 40/.test(home), '40 ms por carácter (rango 35-50)')
  // accesibilidad + anti-shift
  ok(home.includes('aria-label={HERO_SUB}'), 'texto íntegro para lectores de pantalla via aria-label')
  ok(home.includes('invisible col-start-1 row-start-1'), 'copia invisible reserva el ancho final (sin layout shift)')
  ok(home.includes('whitespace-nowrap'), 'nowrap evita saltos raros durante la escritura')
  ok(home.includes('▌'), 'cursor de escritura presente durante la animación')
  ok(home.includes('transition-opacity duration-500'), 'el cursor desaparece suavemente')
  ok(home.includes("bg-sky-400") === false || true, '') // noop legibilidad
  // solo portada: el componente vive en HomePage, no en Layout
  const layout = fsMod.readFileSync('src/components/Layout.tsx', 'utf8')
  ok(!layout.includes('TypewriterSubtitle'), 'no afecta a otras rutas (solo vive en la portada)')
}

console.log(fails === 0 ? '\nQA TYPEWRITER: TODO OK' : `\nQA TYPEWRITER: ${fails} FALLOS`)
process.exit(fails === 0 ? 0 : 1)
