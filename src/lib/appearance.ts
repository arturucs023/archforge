/* Personalización de la interfaz: bordes, paneles, densidad, tipografía,
   efectos (cristal, grano) y color avanzado (saturación, fondo propio).

   Sigue el mismo patrón que theme/accent/cursor: tipos + persistencia en
   localStorage + aplicación en vivo vía atributos data-* y variables CSS
   en <html>. Los valores por defecto NO generan overrides: la app se ve
   exactamente igual que sin este módulo. */

import { getAccent, loadAccent } from './accent'

export type BorderRadius = 'square' | 'soft' | 'round'
export type PanelStyle = 'flat' | 'bordered' | 'card'
export type Density = 'compact' | 'comfortable' | 'spacious'
export type UiFont = 'default' | 'inter' | 'system' | 'roboto'
export type FontWeight = 'normal' | 'semibold'

export interface AppearanceConfig {
  radius: BorderRadius
  panel: PanelStyle
  density: Density
  font: UiFont
  weight: FontWeight
  glass: boolean
  /** opacidad del fondo con cristal (modales), en % (80..95) */
  glassAlpha: number
  /** opacidad del fondo del sidebar, en % (0 = transparente, 100 = sólido) */
  sidebarAlpha: number
  noise: boolean
  /** saturación del acento en % (0 = gris, 100 = oficial, 150 = vibrante) */
  saturation: number
  /** tono de fondo propio en hex (#0d1526) o null = el del tema */
  bgCustom: string | null
}

export const APPEARANCE_KEY = 'archforge:appearance'

export const DEFAULT_APPEARANCE: AppearanceConfig = {
  radius: 'round',
  panel: 'bordered',
  density: 'comfortable',
  font: 'default',
  weight: 'normal',
  glass: false,
  glassAlpha: 88,
  sidebarAlpha: 100,
  noise: false,
  saturation: 100,
  bgCustom: null,
}

const RADIUS: BorderRadius[] = ['square', 'soft', 'round']
const PANELS: PanelStyle[] = ['flat', 'bordered', 'card']
const DENSITIES: Density[] = ['compact', 'comfortable', 'spacious']
const FONTS: UiFont[] = ['default', 'inter', 'system', 'roboto']
const WEIGHTS: FontWeight[] = ['normal', 'semibold']

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

export function loadAppearance(): AppearanceConfig {
  try {
    const raw = localStorage.getItem(APPEARANCE_KEY)
    if (raw) {
      const p = JSON.parse(raw) as Partial<AppearanceConfig>
      return {
        radius: RADIUS.includes(p.radius as BorderRadius) ? (p.radius as BorderRadius) : DEFAULT_APPEARANCE.radius,
        panel: PANELS.includes(p.panel as PanelStyle) ? (p.panel as PanelStyle) : DEFAULT_APPEARANCE.panel,
        density: DENSITIES.includes(p.density as Density) ? (p.density as Density) : DEFAULT_APPEARANCE.density,
        font: FONTS.includes(p.font as UiFont) ? (p.font as UiFont) : DEFAULT_APPEARANCE.font,
        weight: WEIGHTS.includes(p.weight as FontWeight) ? (p.weight as FontWeight) : DEFAULT_APPEARANCE.weight,
        glass: typeof p.glass === 'boolean' ? p.glass : DEFAULT_APPEARANCE.glass,
        glassAlpha: typeof p.glassAlpha === 'number' ? clamp(Math.round(p.glassAlpha), 80, 95) : DEFAULT_APPEARANCE.glassAlpha,
        sidebarAlpha: typeof p.sidebarAlpha === 'number' ? clamp(Math.round(p.sidebarAlpha), 0, 100) : DEFAULT_APPEARANCE.sidebarAlpha,
        noise: typeof p.noise === 'boolean' ? p.noise : DEFAULT_APPEARANCE.noise,
        saturation: typeof p.saturation === 'number' ? clamp(Math.round(p.saturation), 0, 150) : DEFAULT_APPEARANCE.saturation,
        bgCustom: typeof p.bgCustom === 'string' && /^#[0-9a-fA-F]{6}$/.test(p.bgCustom) ? p.bgCustom : null,
      }
    }
  } catch { /* almacenamiento bloqueado o corrupto */ }
  return { ...DEFAULT_APPEARANCE }
}

export function saveAppearance(cfg: AppearanceConfig): void {
  try {
    localStorage.setItem(APPEARANCE_KEY, JSON.stringify(cfg))
  } catch { /* noop */ }
}

/* ── Color: helpers HSL ─────────────────────────────── */

function hexToHsl(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const r = parseInt(full.slice(0, 2), 16) / 255
  const g = parseInt(full.slice(2, 4), 16) / 255
  const b = parseInt(full.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let hh = 0
  if (max === r) hh = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) hh = ((b - r) / d + 2) / 6
  else hh = ((r - g) / d + 4) / 6
  return [hh, s, l]
}

function hslToHex(h: number, s: number, l: number): string {
  const hue2rgb = (p: number, q: number, t: number): number => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  let r: number
  let g: number
  let b: number
  if (s === 0) {
    r = g = b = l
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }
  const to = (x: number): string => Math.round(clamp(x, 0, 1) * 255).toString(16).padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`
}

function hexToTriplet(hex: string): string {
  const h = hex.replace('#', '')
  const n = parseInt(h, 16)
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`
}

function mixWithWhite(hex: string, amount: number): string {
  const h = hex.replace('#', '')
  const n = parseInt(h, 16)
  const r = Math.round(((n >> 16) & 255) * (1 - amount) + 255 * amount)
  const g = Math.round(((n >> 8) & 255) * (1 - amount) + 255 * amount)
  const b = Math.round((n & 255) * (1 - amount) + 255 * amount)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

/* ── Fuentes web bajo demanda ─────────────────────────
   Solo se descargan si el usuario las elige; sin red, la pila
   de respaldo del sistema las sustituye sin romper nada. */

const FONT_CSS_URL: Record<Exclude<UiFont, 'default' | 'system'>, string> = {
  inter: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  roboto: 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap',
}

function ensureWebFont(font: UiFont): void {
  if (font !== 'inter' && font !== 'roboto') return
  const id = `af-font-${font}`
  if (document.getElementById(id)) return
  const link = document.createElement('link')
  link.id = id
  link.rel = 'stylesheet'
  link.href = FONT_CSS_URL[font]
  document.head.appendChild(link)
}

/* ── Aplicación ─────────────────────────────────────── */

/** Reaplica la saturación sobre el acento actual. Se llama tras cambiar de
    acento (applyAccent reescribe los tonos base) y al aplicar apariencia. */
export function applyAccentSaturation(): void {
  const sat = loadAppearance().saturation
  const root = document.documentElement
  const acc = getAccent(loadAccent())
  for (const shade of [200, 300, 400, 500] as const) {
    const [h, s, l] = hexToHsl(acc.shades[shade])
    const adjusted = sat === 100 ? acc.shades[shade] : hslToHex(h, clamp(s * (sat / 100), 0, 1), l)
    root.style.setProperty(`--af-sky-${shade}`, hexToTriplet(adjusted))
  }
}

export function applyAppearance(cfg: AppearanceConfig): void {
  const root = document.documentElement
  root.dataset.afRadius = cfg.radius
  root.dataset.afPanel = cfg.panel
  root.dataset.afDensity = cfg.density
  root.dataset.afFont = cfg.font
  root.dataset.afWeight = cfg.weight
  root.dataset.afGlass = cfg.glass ? 'on' : 'off'
  root.dataset.afNoise = cfg.noise ? 'on' : 'off'
  root.style.setProperty('--af-glass-alpha', (cfg.glassAlpha / 100).toFixed(2))
  root.style.setProperty('--af-sidebar-alpha', (cfg.sidebarAlpha / 100).toFixed(2))

  ensureWebFont(cfg.font)
  applyAccentSaturation()

  /* Fondo propio: se deriva ink-950 (base) e ink-900 (superficies) del tono
     elegido para que sidebar y tarjetas respiren el mismo color. Al limpiar,
     se retiran los overrides y manda la hoja de estilos del tema. */
  if (cfg.bgCustom) {
    root.style.setProperty('--af-ink-950', hexToTriplet(cfg.bgCustom))
    root.style.setProperty('--af-ink-900', hexToTriplet(mixWithWhite(cfg.bgCustom, 0.07)))
    root.style.setProperty('--af-ink-850', hexToTriplet(mixWithWhite(cfg.bgCustom, 0.11)))
  } else {
    root.style.removeProperty('--af-ink-950')
    root.style.removeProperty('--af-ink-900')
    root.style.removeProperty('--af-ink-850')
  }
}

/** Arranque de la app */
export function initAppearance(): AppearanceConfig {
  const cfg = loadAppearance()
  applyAppearance(cfg)
  return cfg
}
