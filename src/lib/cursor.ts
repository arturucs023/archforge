/* Cursor de ArchForge activado/desactivado.
   Al desactivarlo se añade la clase .no-custom-cursor en <html>: el CSS
   devuelve los cursores nativos del sistema (auto/pointer/text) sin tocar
   las variables --af-cur-* que gestiona el acento. */

export type CursorMode = 'custom' | 'system'

export const CURSOR_KEY = 'archforge:cursor'

export function loadCursorMode(): CursorMode {
  try {
    const raw = localStorage.getItem(CURSOR_KEY)
    if (raw === 'custom' || raw === 'system') return raw
  } catch { /* almacenamiento bloqueado */ }
  return 'custom'
}

export function saveCursorMode(mode: CursorMode): void {
  try { localStorage.setItem(CURSOR_KEY, mode) } catch { /* noop */ }
}

export function applyCursorMode(mode: CursorMode): void {
  document.documentElement.classList.toggle('no-custom-cursor', mode === 'system')
}

export function setCursorMode(mode: CursorMode): void {
  saveCursorMode(mode)
  applyCursorMode(mode)
}

export function initCursor(): CursorMode {
  const mode = loadCursorMode()
  applyCursorMode(mode)
  return mode
}
