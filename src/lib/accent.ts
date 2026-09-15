/* Sistema de color de acento: fuente única para paletas, persistencia y
   aplicación en tiempo real vía variables CSS (--af-sky-* + cursores --af-cur-*).
   El resto de componentes NO cambian: consumen las clases sky-* de Tailwind,
   que leen esas variables. */

import type { CursorStyle, CursorConfig, CursorSize } from './cursor'
import { CURSOR_SIZE_MAP } from './cursor'

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

const DARK = '%230b0e14'

/* ── Helpers SVG ───────────────────────────────────────────── */

function esc(hex: string): string {
  return hex.replace('#', '%23')
}

function glowFilter(id: string, color: string): string {
  return `<defs><filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur"/><feFlood flood-color="${color}" flood-opacity="0.45" result="color"/><feComposite in="color" in2="blur" operator="in" result="glow"/><feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`
}

function svgSize(scale: number): number {
  return Math.round(28 * scale)
}

/* ── Generadores de cursor por estilo ──────────────────────── */

function arrowCursor(hex: string, cfg: CursorConfig): string {
  const a = esc(hex)
  const fill = DARK
  const stroke = a
  const sw = cfg.outline ? '2' : '1.2'
  const gid = cfg.glow ? 'filter="url(#g)"' : ''
  const gf = cfg.glow ? glowFilter('g', hex) : ''
  const sz = svgSize(CURSOR_SIZE_MAP[cfg.size].scale)

  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${sz}' height='${sz}' viewBox='0 0 28 28'>${gf}<g ${gid}><path d='M6.2 3C5.3 2.3 4 2.9 4 4v17.7l6-5.2 3.7 7.7 2.7-1.3-3.7-7.7h7c0.9 0 1.3-1.1 0.7-1.7L6.2 3z' fill='${fill}' stroke='${stroke}' stroke-width='${sw}' stroke-linejoin='round'/></g></svg>`
  return `url("data:image/svg+xml,${svg.replace(/#/g, '%23')}")`
}

function arrowPointerCursor(hex: string, cfg: CursorConfig): string {
  const a = esc(hex)
  const sw = cfg.outline ? '2' : '1.2'
  const gid = cfg.glow ? 'filter="url(#g)"' : ''
  const gf = cfg.glow ? glowFilter('g', hex) : ''
  const sz = svgSize(CURSOR_SIZE_MAP[cfg.size].scale)

  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${sz}' height='${sz}' viewBox='0 0 28 28'>${gf}<g ${gid}><path d='M6.2 3C5.3 2.3 4 2.9 4 4v17.7l6-5.2 3.7 7.7 2.7-1.3-3.7-7.7h7c0.9 0 1.3-1.1 0.7-1.7L6.2 3z' fill='${a}' stroke='${DARK}' stroke-width='${sw}' stroke-linejoin='round'/><path d='M6.2 3C5.3 2.3 4 2.9 4 4v17.7l6-5.2' fill='%230b0e14' fill-opacity='0.2'/></g></svg>`
  return `url("data:image/svg+xml,${svg.replace(/#/g, '%23')}")`
}

function dotCursor(hex: string, cfg: CursorConfig): string {
  const a = esc(hex)
  const gid = cfg.glow ? 'filter="url(#g)"' : ''
  const gf = cfg.glow ? glowFilter('g', hex) : ''
  const r1 = cfg.outline ? '4.5' : '3.2'
  const r2 = cfg.outline ? '7' : '5.5'
  const sz = svgSize(CURSOR_SIZE_MAP[cfg.size].scale)

  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${sz}' height='${sz}' viewBox='0 0 28 28'>${gf}<g ${gid}><circle cx='14' cy='14' r='${r2}' fill='none' stroke='${a}' stroke-width='0.8' opacity='0.25'/><circle cx='14' cy='14' r='${r1}' fill='${a}' stroke='${DARK}' stroke-width='1.2'/><circle cx='14' cy='14' r='1.4' fill='white' opacity='0.85'/></g></svg>`
  return `url("data:image/svg+xml,${svg.replace(/#/g, '%23')}")`
}

function dotPointerCursor(hex: string, cfg: CursorConfig): string {
  const a = esc(hex)
  const gid = cfg.glow ? 'filter="url(#g)"' : ''
  const gf = cfg.glow ? glowFilter('g', hex) : ''
  const r1 = cfg.outline ? '5' : '3.8'
  const sz = svgSize(CURSOR_SIZE_MAP[cfg.size].scale)

  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${sz}' height='${sz}' viewBox='0 0 28 28'>${gf}<g ${gid}><circle cx='14' cy='14' r='7' fill='none' stroke='${a}' stroke-width='1' opacity='0.3'/><circle cx='14' cy='14' r='${r1}' fill='${a}' stroke='${DARK}' stroke-width='1.2'/><circle cx='14' cy='14' r='1.8' fill='white' opacity='0.9'/></g></svg>`
  return `url("data:image/svg+xml,${svg.replace(/#/g, '%23')}")`
}

function crossCursor(hex: string, cfg: CursorConfig): string {
  const a = esc(hex)
  const gid = cfg.glow ? 'filter="url(#g)"' : ''
  const gf = cfg.glow ? glowFilter('g', hex) : ''
  const lw = cfg.outline ? '1.6' : '1.1'
  const sz = svgSize(CURSOR_SIZE_MAP[cfg.size].scale)

  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${sz}' height='${sz}' viewBox='0 0 28 28'>${gf}<g ${gid}><line x1='14' y1='3' x2='14' y2='11' stroke='${a}' stroke-width='${lw}' stroke-linecap='round' opacity='0.45'/><line x1='14' y1='17' x2='14' y2='25' stroke='${a}' stroke-width='${lw}' stroke-linecap='round' opacity='0.45'/><line x1='3' y1='14' x2='11' y2='14' stroke='${a}' stroke-width='${lw}' stroke-linecap='round' opacity='0.45'/><line x1='17' y1='14' x2='25' y2='14' stroke='${a}' stroke-width='${lw}' stroke-linecap='round' opacity='0.45'/><circle cx='14' cy='14' r='4.5' fill='none' stroke='${a}' stroke-width='1.3' opacity='0.75'/><circle cx='14' cy='14' r='1.8' fill='${a}' stroke='${DARK}' stroke-width='0.8'/></g></svg>`
  return `url("data:image/svg+xml,${svg.replace(/#/g, '%23')}")`
}

function crossPointerCursor(hex: string, cfg: CursorConfig): string {
  const a = esc(hex)
  const gid = cfg.glow ? 'filter="url(#g)"' : ''
  const gf = cfg.glow ? glowFilter('g', hex) : ''
  const lw = cfg.outline ? '1.8' : '1.3'
  const sz = svgSize(CURSOR_SIZE_MAP[cfg.size].scale)

  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${sz}' height='${sz}' viewBox='0 0 28 28'>${gf}<g ${gid}><line x1='14' y1='3' x2='14' y2='10' stroke='${a}' stroke-width='${lw}' stroke-linecap='round' opacity='0.6'/><line x1='14' y1='18' x2='14' y2='25' stroke='${a}' stroke-width='${lw}' stroke-linecap='round' opacity='0.6'/><line x1='3' y1='14' x2='10' y2='14' stroke='${a}' stroke-width='${lw}' stroke-linecap='round' opacity='0.6'/><line x1='18' y1='14' x2='25' y2='14' stroke='${a}' stroke-width='${lw}' stroke-linecap='round' opacity='0.6'/><circle cx='14' cy='14' r='5' fill='none' stroke='${a}' stroke-width='1.5' opacity='0.85'/><circle cx='14' cy='14' r='2.2' fill='${a}' stroke='${DARK}' stroke-width='1'/></g></svg>`
  return `url("data:image/svg+xml,${svg.replace(/#/g, '%23')}")`
}

function cornerCursor(hex: string, cfg: CursorConfig): string {
  const a = esc(hex)
  const gid = cfg.glow ? 'filter="url(#g)"' : ''
  const gf = cfg.glow ? glowFilter('g', hex) : ''
  const lw = cfg.outline ? '2.8' : '2'
  const sz = svgSize(CURSOR_SIZE_MAP[cfg.size].scale)

  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${sz}' height='${sz}' viewBox='0 0 28 28'>${gf}<g ${gid}><path d='M5.5 5.5v7.5h7.5' fill='none' stroke='${a}' stroke-width='${lw}' stroke-linecap='round' stroke-linejoin='round' opacity='0.85'/><path d='M22.5 22.5v-7.5h-7.5' fill='none' stroke='${a}' stroke-width='${lw}' stroke-linecap='round' stroke-linejoin='round' opacity='0.85'/><circle cx='5.5' cy='5.5' r='2.2' fill='${a}' stroke='${DARK}' stroke-width='1'/><circle cx='22.5' cy='22.5' r='2.2' fill='${a}' stroke='${DARK}' stroke-width='1'/><rect x='12.8' y='12.8' width='2.4' height='2.4' rx='0.6' fill='${a}' opacity='0.3'/></g></svg>`
  return `url("data:image/svg+xml,${svg.replace(/#/g, '%23')}")`
}

function cornerPointerCursor(hex: string, cfg: CursorConfig): string {
  const a = esc(hex)
  const gid = cfg.glow ? 'filter="url(#g)"' : ''
  const gf = cfg.glow ? glowFilter('g', hex) : ''
  const lw = cfg.outline ? '3' : '2.2'
  const sz = svgSize(CURSOR_SIZE_MAP[cfg.size].scale)

  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${sz}' height='${sz}' viewBox='0 0 28 28'>${gf}<g ${gid}><path d='M5.5 5.5v7.5h7.5' fill='none' stroke='${a}' stroke-width='${lw}' stroke-linecap='round' stroke-linejoin='round'/><path d='M22.5 22.5v-7.5h-7.5' fill='none' stroke='${a}' stroke-width='${lw}' stroke-linecap='round' stroke-linejoin='round'/><circle cx='5.5' cy='5.5' r='2.5' fill='${a}' stroke='${DARK}' stroke-width='1'/><circle cx='22.5' cy='22.5' r='2.5' fill='${a}' stroke='${DARK}' stroke-width='1'/><rect x='12.5' y='12.5' width='3' height='3' rx='0.8' fill='${a}' stroke='${DARK}' stroke-width='0.8'/></g></svg>`
  return `url("data:image/svg+xml,${svg.replace(/#/g, '%23')}")`
}

function ringCursor(hex: string, cfg: CursorConfig): string {
  const a = esc(hex)
  const gid = cfg.glow ? 'filter="url(#g)"' : ''
  const gf = cfg.glow ? glowFilter('g', hex) : ''
  const sw1 = cfg.outline ? '1.8' : '1.2'
  const sw2 = cfg.outline ? '1' : '0.7'
  const sz = svgSize(CURSOR_SIZE_MAP[cfg.size].scale)

  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${sz}' height='${sz}' viewBox='0 0 28 28'>${gf}<g ${gid}><circle cx='14' cy='14' r='10.5' fill='none' stroke='${a}' stroke-width='${sw2}' opacity='0.2'/><circle cx='14' cy='14' r='7' fill='none' stroke='${a}' stroke-width='${sw1}' opacity='0.8'/><circle cx='14' cy='14' r='2.2' fill='${a}' stroke='${DARK}' stroke-width='0.8'/><circle cx='14' cy='14' r='0.9' fill='white' opacity='0.85'/></g></svg>`
  return `url("data:image/svg+xml,${svg.replace(/#/g, '%23')}")`
}

function ringPointerCursor(hex: string, cfg: CursorConfig): string {
  const a = esc(hex)
  const gid = cfg.glow ? 'filter="url(#g)"' : ''
  const gf = cfg.glow ? glowFilter('g', hex) : ''
  const sw1 = cfg.outline ? '2' : '1.4'
  const sz = svgSize(CURSOR_SIZE_MAP[cfg.size].scale)

  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${sz}' height='${sz}' viewBox='0 0 28 28'>${gf}<g ${gid}><circle cx='14' cy='14' r='10.5' fill='none' stroke='${a}' stroke-width='1' opacity='0.3'/><circle cx='14' cy='14' r='7' fill='none' stroke='${a}' stroke-width='${sw1}'/><circle cx='14' cy='14' r='2.8' fill='${a}' stroke='${DARK}' stroke-width='1'/><circle cx='14' cy='14' r='1.1' fill='white' opacity='0.9'/></g></svg>`
  return `url("data:image/svg+xml,${svg.replace(/#/g, '%23')}")`
}

function textCursor(hex: string, cfg: CursorConfig): string {
  const a = esc(hex)
  const gid = cfg.glow ? 'filter="url(#g)"' : ''
  const gf = cfg.glow ? glowFilter('g', hex) : ''
  const bw = cfg.outline ? '3.2' : '2.4'
  const bh = cfg.outline ? '20' : '18'
  const sz = svgSize(CURSOR_SIZE_MAP[cfg.size].scale)

  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${sz}' height='${sz}' viewBox='0 0 28 28'>${gf}<g ${gid}><rect x='12.8' y='4' width='${bw}' height='${bh}' rx='${parseFloat(bw) / 2}' fill='${a}' stroke='${DARK}' stroke-width='1'/><rect x='12.8' y='4' width='${bw}' height='${bh}' rx='${parseFloat(bw) / 2}' fill='white' opacity='0.15'/></g></svg>`
  return `url("data:image/svg+xml,${svg.replace(/#/g, '%23')}")`
}

/* ── API pública ───────────────────────────────────────────── */

/** data-URI del SVG de cursor según estilo, color y configuración */
export function cursorUri(kind: 'default' | 'pointer' | 'text', hex400Raw: string, cfg: CursorConfig): string {
  if (kind === 'text') return textCursor(hex400Raw, cfg)

  switch (cfg.style) {
    case 'dot':
      return kind === 'pointer' ? dotPointerCursor(hex400Raw, cfg) : dotCursor(hex400Raw, cfg)
    case 'cross':
      return kind === 'pointer' ? crossPointerCursor(hex400Raw, cfg) : crossCursor(hex400Raw, cfg)
    case 'corner':
      return kind === 'pointer' ? cornerPointerCursor(hex400Raw, cfg) : cornerCursor(hex400Raw, cfg)
    case 'ring':
      return kind === 'pointer' ? ringPointerCursor(hex400Raw, cfg) : ringCursor(hex400Raw, cfg)
    case 'arrow':
    default:
      return kind === 'pointer' ? arrowPointerCursor(hex400Raw, cfg) : arrowCursor(hex400Raw, cfg)
  }
}

/** Hotspot ajustado según estilo y tamaño */
function getHotspot(style: CursorStyle, size: CursorSize): { dx: number; dy: number } {
  const s = CURSOR_SIZE_MAP[size].scale
  const base = { arrow: { dx: 5, dy: 3 }, dot: { dx: 14, dy: 14 }, cross: { dx: 14, dy: 14 }, corner: { dx: 5.5, dy: 5.5 }, ring: { dx: 14, dy: 14 } }
  const h = base[style] ?? base.arrow
  return { dx: h.dx * s, dy: h.dy * s }
}

/** Aplica el acento, estilo y configuración al documento EN VIVO */
export function applyAccent(id: AccentId, cfg?: CursorConfig): void {
  const acc = getAccent(id)
  const root = document.documentElement
  for (const shade of [200, 300, 400, 500] as const) {
    root.style.setProperty(`--af-sky-${shade}`, hexToRgbTriplet(acc.shades[shade]))
  }

  if (!cfg) return

  /* El cursor usa su color propio si el usuario lo fijó; si no, sigue al acento. */
  const c400 = cfg.color ?? acc.shades[400]

  root.style.setProperty('--af-cur-default', `${cursorUri('default', c400, cfg)} ${getHotspot(cfg.style, cfg.size).dx} ${getHotspot(cfg.style, cfg.size).dy}, auto`)
  root.style.setProperty('--af-cur-pointer', `${cursorUri('pointer', c400, cfg)} ${getHotspot(cfg.style, cfg.size).dx} ${getHotspot(cfg.style, cfg.size).dy}, pointer`)
  root.style.setProperty('--af-cur-text', `${cursorUri('text', c400, cfg)} 14 3, text`)
}

/** Carga y aplica de una vez (arranque de la app) */
export function initAccent(): AccentId {
  const id = loadAccent()
  return id
}
