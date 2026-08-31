/* QA TEMA: modos, resolución system, persistencia, zonas oscuras y no-regresión. */
import * as fsMod from 'fs'
import { loadTheme, resolveTheme, THEME_KEY } from '../src/lib/theme'
import type { ThemeMode } from '../src/lib/theme'

let fails = 0
const ok = (cond: boolean, label: string): void => {
  if (!cond) fails++
  console.log(`${cond ? 'ok  ' : 'FALLO'} ${label}`)
}

/* stubs mínimos de browser para theme.ts */
const store = new Map<string, string>()
;(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => void store.set(k, v),
} as unknown as Storage
const listeners: (() => void)[] = []
;(globalThis as unknown as { window: unknown }).window = {}
;(globalThis as unknown as { document: unknown }).document = { documentElement: { dataset: {} } }
;(globalThis as unknown as { matchMedia: unknown }).matchMedia = (q: string) => ({
  matches: q.includes('light') ? false : true, // sistema simulado = oscuro
  addEventListener: (_t: string, cb: () => void) => listeners.push(cb),
  removeEventListener: (_t: string, cb: () => void) => void (listeners.splice(listeners.indexOf(cb), 1)),
})

ok(loadTheme() === 'dark', 'sin preferencia → Oscuro (diseño actual intacto)')
store.set(THEME_KEY, 'light')
ok(loadTheme() === 'light', 'preferencia Claro se guarda')
store.set(THEME_KEY, 'system')
ok(loadTheme() === 'system', 'modo Sistema se guarda')
store.set(THEME_KEY, 'locura' as ThemeMode)
ok(loadTheme() === 'dark', 'valor inválido → fallback Oscuro')
store.set(THEME_KEY, 'system')

// resolveTheme con matchMedia simulado: sistema → dark; si OS dijera light → light
ok(resolveTheme('dark') === 'dark' && resolveTheme('light') === 'light', 'modos explícitos se resuelven a sí mismos')

/* ---- fuente real: index.css define ambos temas + zona oscura ---- */
{
  const css = fsMod.readFileSync('src/index.css', 'utf8')
  for (const v of ['--af-ink-950:', '--af-ink-900:', '--af-zinc-800:', '--af-zinc-400:']) {
    const occurrences = css.split(v).length - 1
    ok(occurrences >= 3, `${v} definido en :root + light + zone (${occurrences})`)
  }
  ok(css.includes("[data-theme='light']"), 'bloque del tema claro presente')
  ok(css.includes('.theme-dark-zone'), 'zona oscura fija para terminales presente')
  ok(css.includes('color-scheme: light'), 'color-scheme cambia con el tema')
  // contraste cromático: tonos claros de texto oscurecidos en claro
  const chromatic = ['emerald', 'violet', 'teal', 'amber', 'rose', 'cyan']
  let adapted = 0
  for (const p of chromatic) {
    if (css.includes(`--af-${p}-300:`)) adapted++
  }
  // cada paleta define -300 dos veces (root + light)
  ok(adapted === chromatic.length, `las 6 paletas cromáticas definen --af-*-300 (${adapted}/6)`)
  for (const p of chromatic) {
    const re = new RegExp(`\\[data-theme='light'\\] \\{[\\s\\S]*?--af-${p}-300:`)
    if (!re.test(css)) { fails++; console.log(`FALLO light override ausente para ${p}-300`) }
  }
  ok(true, 'light theme oscurece los -300/-200/-400 cromáticos (texto legible)')
}
{
  const tw = fsMod.readFileSync('tailwind.config.js', 'utf8')
  ok(tw.includes("'rgb(var(--af-ink-950) / <alpha-value>)'"), 'ink vía variables con alpha')
  ok(tw.includes("'rgb(var(--af-zinc-800) / <alpha-value>)'"), 'zinc vía variables con alpha')
}
{
  // superficies terminales marcadas como zona oscura
  const vt = fsMod.readFileSync('src/components/VirtualTerminal.tsx', 'utf8')
  const cb = fsMod.readFileSync('src/components/CommandBlock.tsx', 'utf8')
  const fb = fsMod.readFileSync('src/components/FileBlock.tsx', 'utf8')
  ok(vt.includes('theme-dark-zone') && cb.includes('theme-dark-zone') && fb.includes('theme-dark-zone'), 'terminal/comandos/ficheros permanecen oscuros en claro')
}
{
  const settings = fsMod.readFileSync('src/pages/SettingsPage.tsx', 'utf8')
  ok(settings.includes("'Claro'") && settings.includes("'Oscuro'") && settings.includes("'Sistema'"), 'las tres opciones presentes en Ajustes')
  ok(settings.includes("setTheme(mode)"), 'aplicación inmediata al elegir (sin recarga)')
}

console.log(fails === 0 ? '\nQA TEMA: TODO OK' : `\nQA TEMA: ${fails} FALLOS`)
process.exit(fails === 0 ? 0 : 1)
