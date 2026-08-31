/* QA CURSOR TOGGLE: módulo, CSS de restauración nativa e integración en Ajustes. */
import * as fsMod from 'fs'

let fails = 0
const ok = (cond: boolean, label: string): void => {
  if (!cond) fails++
  console.log(`${cond ? 'ok  ' : 'FALLO'} ${label}`)
}

/* ---- comportamiento del módulo con stubs ---- */
{
  const store = new Map<string, string>()
  ;(globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, v),
  } as unknown as Storage
  const classes = new Set<string>()
  ;(globalThis as unknown as { document: unknown }).document = {
    documentElement: { classList: { toggle: (c: string, on?: boolean) => (on ? classes.add(c) : classes.delete(c)), has: (c: string) => classes.has(c) } },
  }

  const mod = require('../src/lib/cursor.ts') // esbuild resuelve TS en bundle
  const { initCursor, setCursorMode, loadCursorMode } = mod

  ok(initCursor() === 'custom', 'sin preferencia → cursor personalizado activado')
  setCursorMode('system')
  ok(classes.has('no-custom-cursor'), 'desactivar añade .no-custom-cursor en <html>')
  ok(loadCursorMode() === 'system', 'preferencia persistida')
  setCursorMode('custom')
  ok(!classes.has('no-custom-cursor'), 'reactivar quita la clase y restaura el cursor ArchForge')
}

/* ---- CSS: restauración nativa con fallbacks por rol ---- */
{
  const css = fsMod.readFileSync('src/index.css', 'utf8')
  ok(css.includes('html.no-custom-cursor body *') && css.includes('cursor: auto !important'), 'cursor nativo auto para todo')
  ok(/no-custom-cursor a,[\s\S]*?cursor: pointer !important/.test(css), 'enlaces/botones vuelven a pointer del sistema')
  ok(/no-custom-cursor input,[\s\S]*?cursor: text !important/.test(css), 'campos de texto vuelven a text del sistema')
  // el orden garantiza que gana al cursor personalizado (mismo !important, después en cascada)
  ok(css.indexOf('--af-cur-default:') !== -1 && css.lastIndexOf('no-custom-cursor') > css.indexOf('--af-cur-default:'), 'regla de desactivado posterior a las reglas personalizadas')
}

/* ---- integración UI + arranque ---- */
{
  const settings = fsMod.readFileSync('src/pages/SettingsPage.tsx', 'utf8')
  ok(settings.includes(`role="switch"`) && settings.includes('Cursor personalizado'), 'interruptor presente en Ajustes → Apariencia')
  ok(settings.includes("setCursorMode(next)"), 'aplicación inmediata al alternar')
  const main = fsMod.readFileSync('src/main.tsx', 'utf8')
  ok(main.includes('initCursor()'), 'preferencia aplicada al arrancar la app')
}

console.log(fails === 0 ? '\nQA CURSOR TOGGLE: TODO OK' : `\nQA CURSOR TOGGLE: ${fails} FALLOS`)
process.exit(fails === 0 ? 0 : 1)
