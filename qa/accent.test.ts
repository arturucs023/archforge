/* QA ACENTO: tokens, persistencia, cursor, wiring de Tailwind y no-regresión. */
import * as fsMod from 'fs'
import { ACCENTS, ACCENT_KEY, DEFAULT_ACCENT, applyAccent, cursorUri, getAccent, loadAccent, saveAccent, hexToRgbTripletSafe } from './accent-helpers'

let fails = 0
const ok = (cond: boolean, label: string): void => {
  if (!cond) fails++
  console.log(`${cond ? 'ok  ' : 'FALLO'} ${label}`)
}

/* ------------------------------ 1. catálogo ------------------------------ */
ok(DEFAULT_ACCENT === 'sky', 'sky es el predeterminado')
ok(ACCENTS.length === 6 && ['sky', 'violet', 'emerald', 'amber', 'rose', 'cyan'].every((id) => ACCENTS.some((a) => a.id === id)), 'los 6 colores exigidos existen')
ok(ACCENTS.every((a) => /^#[0-9a-f]{6}$/i.test(a.shades[200]) && /^#[0-9a-f]{6}$/i.test(a.shades[500])), 'cada acento define escala 200-500 completa')

/* --------------------- 2. carga/persistencia con fallback ---------------------- */
// stub de localStorage respaldado por Map (getItem+setItem reales)
const makeStore = (initial: Record<string, string> = {}): Storage => {
  const m = new Map(Object.entries(initial))
  return {
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    setItem: (k: string, v: string) => void m.set(k, v),
    clear: () => m.clear(),
  } as unknown as Storage
}
;(globalThis as unknown as { localStorage: unknown }).localStorage = makeStore()
ok(loadAccent() === 'sky', 'sin preferencia → sky')
saveAccent('violet')
ok(loadAccent() === 'violet', 'la selección se guarda y recarga intacta')
;(globalThis as unknown as { localStorage: unknown }).localStorage = makeStore({ [ACCENT_KEY]: 'fucsia-invalido' })
ok(loadAccent() === 'sky', 'valor corrupto/inválido → cae a sky (no rompe)')

/* ------------------------- 3. aplicación en vivo ------------------------- */
const docStub: Record<string, string> = {}
;(globalThis as unknown as { document: unknown }).document = {
  documentElement: {
    style: {
      setProperty(k: string, v: string): void { docStub[k] = v },
    },
  },
}
applyAccent('emerald')
ok(docStub['--af-sky-400'] === '52 211 153' && docStub['--af-sky-500'] === '16 185 129', 'applyAccent escribe tripletes RGB de emerald')
ok(docStub['--af-cur-default']?.includes('%2334d399'), 'cursor por defecto usa contorno del acento activo')
ok(docStub['--af-cur-pointer']?.includes("fill='%2334d399'"), 'cursor pointer relleno con acento')
ok(docStub['--af-cur-text']?.includes('%2334d399'), 'haz de texto con acento')
applyAccent('rose')
ok(docStub['--af-sky-400'] === '251 113 133', 'cambio en tiempo real a rose sin recarga')
applyAccent('sky')
ok(docStub['--af-sky-400'] === '56 189 248' && docStub['--af-cur-default'].includes('%2338bdf8'), 'restaurar default devuelve sky original (UI + cursor)')
ok(docStub['--af-cur-default'].endsWith(', auto') && docStub['--af-cur-pointer'].endsWith(', pointer') && docStub['--af-cur-text'].endsWith(', text'), 'fallbacks nativos preservados (auto/pointer/text)')

/* --------------------------- 4. helpers de color --------------------------- */
ok(hexToRgbTripletSafe('#0ea5e9') === '14 165 233', 'hex→triplete correcto para variables CSS')

/* --------------- 5. wiring estático: tailwind + index.css + marca --------------- */
{
  const tw = fsMod.readFileSync('tailwind.config.js', 'utf8')
  ok(tw.includes("'rgb(var(--af-sky-400) / <alpha-value>)'"), 'Tailwind mapea sky-400 → variable con soporte alpha')
  const css = fsMod.readFileSync('src/index.css', 'utf8')
  for (const shade of [200, 300, 400, 500] as const) {
    if (!css.includes(`--af-sky-${shade}:`)) fails++
    if (!css.includes(`--af-sky-${shade}:`)) console.log(`FALLO index.css sin default --af-sky-${shade}`)
  }
  ok(true, 'index.css define defaults :root para los 4 tonos')
  ok(css.includes('--af-cur-default:') && css.includes('--af-cur-pointer:') && css.includes('--af-cur-text:'), 'cursores definidos vía variables --af-cur-*')
  // marca intacta: logo sigue #38bdf8 literal
  const sidebar = fsMod.readFileSync('src/components/Sidebar.tsx', 'utf8')
  ok(sidebar.includes('#38bdf8'), 'logo conserva su azul de marca (no es acento)')
}

console.log(fails === 0 ? '\nQA ACENTO: TODO OK' : `\nQA ACENTO: ${fails} FALLOS`)
process.exit(fails === 0 ? 0 : 1)
