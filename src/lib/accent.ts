/* Sistema de color de acento: fuente única para paletas, persistencia y
   aplicación en tiempo real vía variables CSS (--af-sky-* + cursores --af-cur-*).
   El resto de componentes NO cambian: consumen las clases sky-* de Tailwind,
   que leen esas variables. */

export type AccentId = 'sky' | 'violet' | 'emerald' | 'amber' | 'rose' | 'cyan'

export interface AccentShades {
  200: string
  300: string
  400: string
  500: string
}

export interface AccentDef {
  id: AccentId
  label: string
  /** muestra para el selector */
  swatch: string
  /** tonos oficiales Tailwind 200/300/400/500 → contraste verificado sobre fondo oscuro */
  shades: AccentShades
}

export const ACCENT_KEY = 'archforge:accent-color'

export const ACCENTS: AccentDef[] = [
  {
    id: 'sky',
    label: 'Sky',
    swatch: '#38bdf8',
    shades: { 200: '#bae6fd', 300: '#7dd3fc', 400: '#38bdf8', 500: '#0ea5e9' },
  },
  {
    id: 'violet',
    label: 'Violet',
    swatch: '#a78bfa',
    shades: { 200: '#ddd6fe', 300: '#c4b5fd', 400: '#a78bfa', 500: '#8b5cf6' },
  },
  {
    id: 'emerald',
    label: 'Emerald',
    swatch: '#34d399',
    shades: { 200: '#a7f3d0', 300: '#6ee7b7', 400: '#34d399', 500: '#10b981' },
  },
  {
    id: 'amber',
    label: 'Amber',
    swatch: '#fbbf24',
    shades: { 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24', 500: '#f59e0b' },
  },
  {
    id: 'rose',
    label: 'Rose',
    swatch: '#fb7185',
    shades: { 200: '#fecdd3', 300: '#fda4af', 400: '#fb7185', 500: '#f43f5e' },
  },
  {
    id: 'cyan',
    label: 'Cyan',
    swatch: '#22d3ee',
    shades: { 200: '#a5f3fc', 300: '#67e8f9', 400: '#22d3ee', 500: '#06b6d4' },
  },
]

export const DEFAULT_ACCENT: AccentId = 'sky'

export function hexToRgbTriplet(hex: string): string {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`
}

export function getAccent(id: AccentId): AccentDef {
  return ACCENTS.find((a) => a.id === id) ?? ACCENTS[0]
}

/** Lee la preferencia guardada; valor inválido o ausente → sky */
export function loadAccent(): AccentId {
  try {
    const raw = localStorage.getItem(ACCENT_KEY)
    if (raw && ACCENTS.some((a) => a.id === raw)) return raw as AccentId
  } catch { /* almacenamiento bloqueado */ }
  return DEFAULT_ACCENT
}

export function saveAccent(id: AccentId): void {
  try { localStorage.setItem(ACCENT_KEY, id) } catch { /* noop */ }
}

const CURSOR_BODY = '%230b0e14'

/** data-URI del SVG de cursor con contorno/relleno del acento indicado */
export function cursorUri(kind: 'default' | 'pointer' | 'text', hex400Raw: string): string {
  const hex400 = hex400Raw.replace('#', '%23')
  const fill = kind === 'pointer' ? hex400 : CURSOR_BODY
  const stroke = kind === 'pointer' ? '%230c4a6e' : hex400
  if (kind === 'text') {
    return `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='28' height='24' viewBox='0 0 28 24'><rect x='12.6' y='3' width='2.8' height='18' rx='1.4' fill='${hex400}' stroke='${CURSOR_BODY}' stroke-width='1'/></svg>")`
  }
  return `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='26' height='26' viewBox='0 0 26 26'><path d='M5.5 3.2 V21.3 L10.2 16.6 L13.2 23.4 L16.6 21.9 L13.6 15.2 H20.9 Z' fill='${fill}' stroke='${stroke}' stroke-width='1.4' stroke-linejoin='round'/></svg>")`
}

/** Aplica el acento al documento EN VIVO (sin recarga): escala sky + cursores */
export function applyAccent(id: AccentId): void {
  const acc = getAccent(id)
  const root = document.documentElement
  for (const shade of [200, 300, 400, 500] as const) {
    root.style.setProperty(`--af-sky-${shade}`, hexToRgbTriplet(acc.shades[shade]))
  }
  const c400 = acc.shades[400]
  root.style.setProperty('--af-cur-default', `${cursorUri('default', c400)} 5 3, auto`)
  root.style.setProperty('--af-cur-pointer', `${cursorUri('pointer', c400)} 5 3, pointer`)
  root.style.setProperty('--af-cur-text', `${cursorUri('text', c400)} 14 3, text`)
}

/** Carga y aplica de una vez (arranque de la app) */
export function initAccent(): AccentId {
  const id = loadAccent()
  applyAccent(id)
  return id
}
