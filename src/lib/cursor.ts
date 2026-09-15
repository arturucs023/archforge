/* Cursor de ArchForge: estilos profesionales seleccionables por el usuario.
   Soporta tamaño, brillo y contorno configurables.
   Al desactivarlo se añade la clase .no-custom-cursor en <html>: el CSS
   devuelve los cursores nativos del sistema sin tocar las variables
   --af-cur-* que gestiona accent.ts. */

export type CursorStyle = 'arrow' | 'dot' | 'cross' | 'corner' | 'ring'
export type CursorMode = CursorStyle | 'system'
export type CursorSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

export interface CursorConfig {
  style: CursorStyle
  size: CursorSize
  glow: boolean
  outline: boolean
  /** Color hex del cursor (p. ej. '#fbbf24'). null = seguir el color de acento. */
  color: string | null
}

export const CURSOR_SIZE_MAP: Record<CursorSize, { scale: number; label: string; desc: string }> = {
  xs: { scale: 0.75, label: 'XS', desc: '75%' },
  sm: { scale: 0.9, label: 'SM', desc: '90%' },
  md: { scale: 1, label: 'MD', desc: '100%' },
  lg: { scale: 1.25, label: 'LG', desc: '125%' },
  xl: { scale: 1.6, label: 'XL', desc: '160%' },
}

export const CURSOR_SIZES: CursorSize[] = ['xs', 'sm', 'md', 'lg', 'xl']

export const DEFAULT_CURSOR_CONFIG: CursorConfig = {
  style: 'arrow',
  size: 'md',
  glow: false,
  outline: false,
  color: null,
}

/** Paleta de colores fijos para el cursor (todos legibles sobre fondo oscuro). */
export interface CursorColorDef {
  id: string
  label: string
  /** hex o null (= seguir el acento) */
  value: string | null
}

export const CURSOR_COLORS: CursorColorDef[] = [
  { id: 'accent', label: 'Acento', value: null },
  { id: 'sky', label: 'Cielo', value: '#38bdf8' },
  { id: 'emerald', label: 'Esmeralda', value: '#34d399' },
  { id: 'amber', label: 'Ámbar', value: '#fbbf24' },
  { id: 'rose', label: 'Rosa', value: '#fb7185' },
  { id: 'violet', label: 'Violeta', value: '#a78bfa' },
  { id: 'white', label: 'Blanco', value: '#f4f4f5' },
]

export interface CursorStyleDef {
  id: CursorStyle
  label: string
  description: string
  /** SVG preview (static, no accent-colored) for the settings picker */
  preview: string
}

export const CURSOR_STYLES: CursorStyleDef[] = [
  {
    id: 'arrow',
    label: 'Flecha',
    description: 'Clásica con brillo sutil',
    preview: `<svg viewBox="0 0 32 32" fill="none"><defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="currentColor" stop-opacity="0.15"/><stop offset="100%" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs><path d="M7 4.2C6.2 3.6 5 4.1 5 5.1v18.3l6.5-5.6 4.2 8.8 2.8-1.3-4.2-8.8h7.4c1 0 1.5-1.2 0.8-1.9L7 4.2z" fill="currentColor" fill-opacity="0.85" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><path d="M7 4.2C6.2 3.6 5 4.1 5 5.1v18.3l6.5-5.6" fill="url(#ag)"/></svg>`,
  },
  {
    id: 'dot',
    label: 'Punto',
    description: 'Con aura y centro preciso',
    preview: `<svg viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="9" stroke="currentColor" stroke-width="0.8" opacity="0.2"/><circle cx="16" cy="16" r="5.5" stroke="currentColor" stroke-width="1" opacity="0.5"/><circle cx="16" cy="16" r="3" fill="currentColor" opacity="0.9"/><circle cx="16" cy="16" r="1.2" fill="white" opacity="0.9"/></svg>`,
  },
  {
    id: 'cross',
    label: 'Cruz',
    description: 'Técnica con anillo central',
    preview: `<svg viewBox="0 0 32 32" fill="none"><line x1="16" y1="4" x2="16" y2="12" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.5"/><line x1="16" y1="20" x2="16" y2="28" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.5"/><line x1="4" y1="16" x2="12" y2="16" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.5"/><line x1="20" y1="16" x2="28" y2="16" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.5"/><circle cx="16" cy="16" r="4" stroke="currentColor" stroke-width="1.2" opacity="0.8"/><circle cx="16" cy="16" r="1.5" fill="currentColor" opacity="0.9"/></svg>`,
  },
  {
    id: 'corner',
    label: 'Esquina',
    description: 'Estilo terminal hacker',
    preview: `<svg viewBox="0 0 32 32" fill="none"><path d="M6 6v8h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/><path d="M26 26v-8h-8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/><circle cx="6" cy="6" r="2" fill="currentColor" opacity="0.7"/><circle cx="26" cy="26" r="2" fill="currentColor" opacity="0.7"/><rect x="14.5" y="14.5" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.4"/></svg>`,
  },
  {
    id: 'ring',
    label: 'Anillo',
    description: 'Doble anillo suave',
    preview: `<svg viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="10" stroke="currentColor" stroke-width="0.8" opacity="0.25"/><circle cx="16" cy="16" r="6.5" stroke="currentColor" stroke-width="1.4" opacity="0.85"/><circle cx="16" cy="16" r="2" fill="currentColor" opacity="0.9"/><circle cx="16" cy="16" r="0.8" fill="white" opacity="0.8"/></svg>`,
  },
]

/* ── Persistencia ───────────────────────────────────────────── */

export const CURSOR_KEY = 'archforge:cursor'
export const CURSOR_STYLE_KEY = 'archforge:cursor-style'
export const CURSOR_SIZE_KEY = 'archforge:cursor-size'
export const CURSOR_GLOW_KEY = 'archforge:cursor-glow'
export const CURSOR_OUTLINE_KEY = 'archforge:cursor-outline'
export const CURSOR_COLOR_KEY = 'archforge:cursor-color'

export function loadCursorMode(): CursorMode {
  try {
    const raw = localStorage.getItem(CURSOR_KEY)
    if (raw === 'system') return 'system'
    const style = localStorage.getItem(CURSOR_STYLE_KEY)
    if (style && CURSOR_STYLES.some((s) => s.id === style)) return style as CursorStyle
  } catch { /* almacenamiento bloqueado */ }
  return 'arrow'
}

export function loadCursorSize(): CursorSize {
  try {
    const raw = localStorage.getItem(CURSOR_SIZE_KEY)
    if (raw && CURSOR_SIZES.includes(raw as CursorSize)) return raw as CursorSize
  } catch { /* noop */ }
  return 'md'
}

export function loadCursorGlow(): boolean {
  try { return localStorage.getItem(CURSOR_GLOW_KEY) === '1' } catch { return false }
}

export function loadCursorOutline(): boolean {
  try { return localStorage.getItem(CURSOR_OUTLINE_KEY) === '1' } catch { return false }
}

export function loadCursorColor(): string | null {
  try {
    const raw = localStorage.getItem(CURSOR_COLOR_KEY)
    if (!raw) return null
    if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toLowerCase()
  } catch { /* noop */ }
  return null
}

export function loadCursorConfig(): CursorConfig {
  return {
    style: loadCursorMode() === 'system' ? 'arrow' : (loadCursorMode() as CursorStyle),
    size: loadCursorSize(),
    glow: loadCursorGlow(),
    outline: loadCursorOutline(),
    color: loadCursorColor(),
  }
}

export function saveCursorMode(mode: CursorMode): void {
  try {
    if (mode === 'system') {
      localStorage.setItem(CURSOR_KEY, 'system')
    } else {
      localStorage.removeItem(CURSOR_KEY)
      localStorage.setItem(CURSOR_STYLE_KEY, mode)
    }
  } catch { /* noop */ }
}

export function saveCursorSize(size: CursorSize): void {
  try { localStorage.setItem(CURSOR_SIZE_KEY, size) } catch { /* noop */ }
}

export function saveCursorGlow(glow: boolean): void {
  try { localStorage.setItem(CURSOR_GLOW_KEY, glow ? '1' : '0') } catch { /* noop */ }
}

export function saveCursorOutline(outline: boolean): void {
  try { localStorage.setItem(CURSOR_OUTLINE_KEY, outline ? '1' : '0') } catch { /* noop */ }
}

export function saveCursorColor(color: string | null): void {
  try {
    if (color) localStorage.setItem(CURSOR_COLOR_KEY, color.toLowerCase())
    else localStorage.removeItem(CURSOR_COLOR_KEY)
  } catch { /* noop */ }
}

export function applyCursorMode(mode: CursorMode): void {
  document.documentElement.classList.toggle('no-custom-cursor', mode === 'system')
}

export function setCursorMode(mode: CursorMode): void {
  saveCursorMode(mode)
  applyCursorMode(mode)
}

export function getCursorStyle(mode: CursorMode): CursorStyle {
  return mode === 'system' ? 'arrow' : mode
}

export function initCursor(): CursorMode {
  const mode = loadCursorMode()
  applyCursorMode(mode)
  return mode
}
