/* Tema Claro / Oscuro / Sistema: persistencia + aplicación en vivo.
   Solo cambia el atributo data-theme en <html>; toda la paleta reacciona
   vía variables CSS (ink/zinc/acento) definidas en index.css. */

export type ThemeMode = 'light' | 'dark' | 'system'

export const THEME_KEY = 'archforge:theme'

const mql = typeof window !== 'undefined' && 'matchMedia' in window ? window.matchMedia('(prefers-color-scheme: light)') : null

export function loadTheme(): ThemeMode {
  try {
    const raw = localStorage.getItem(THEME_KEY)
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw
  } catch { /* almacenamiento bloqueado */ }
  return 'dark'
}

export function saveTheme(mode: ThemeMode): void {
  try { localStorage.setItem(THEME_KEY, mode) } catch { /* noop */ }
}

/** Modo → valor resuelto para data-theme */
export function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') return mql?.matches ? 'light' : 'dark'
  return mode
}

export function applyResolvedTheme(resolved: 'light' | 'dark'): void {
  document.documentElement.dataset.theme = resolved
}

let unsubscribe: (() => void) | null = null

function watchSystem(): void {
  if (!mql || unsubscribe) return
  const handler = (): void => {
    if (loadTheme() === 'system') applyResolvedTheme(resolveTheme('system'))
  }
  mql.addEventListener('change', handler)
  unsubscribe = () => mql.removeEventListener('change', handler)
}

/** Cambia el modo en vivo y mantiene la escucha del sistema cuando toca */
export function setTheme(mode: ThemeMode): void {
  saveTheme(mode)
  applyResolvedTheme(resolveTheme(mode))
  if (mode === 'system') watchSystem()
  else unsubscribe?.(), (unsubscribe = null)
}

/** Arranque de la app */
export function initTheme(): ThemeMode {
  const mode = loadTheme()
  applyResolvedTheme(resolveTheme(mode))
  if (mode === 'system') watchSystem()
  return mode
}
