/* Proxy opcional para URLs externas: para entornos con restricciones de red.

   Módulo INDEPENDIENTE de apariencia/interfaz: su única fuente de verdad es
   localStorage bajo 'archforge:proxy-config'. Sin configuración o con el
   interruptor apagado, todo navega directo (comportamiento actual intacto).

   Lógica: si está activo Y hay URL base, se concatena la URL detectada al
   final de la base (p. ej. https://mi-proxy.com/browse?url= + https://…).
   Si no, se navega directo. */

export interface ProxyConfig {
  enabled: boolean
  baseUrl: string
}

export const PROXY_KEY = 'archforge:proxy-config'

export function loadProxyConfig(): ProxyConfig {
  try {
    const raw = localStorage.getItem(PROXY_KEY)
    if (raw) {
      const p = JSON.parse(raw) as Partial<ProxyConfig>
      return {
        enabled: p.enabled === true,
        baseUrl: typeof p.baseUrl === 'string' ? p.baseUrl.trim() : '',
      }
    }
  } catch { /* bloqueado o corrupto → directo */ }
  return { enabled: false, baseUrl: '' }
}

export function saveProxyConfig(cfg: ProxyConfig): void {
  try {
    localStorage.setItem(PROXY_KEY, JSON.stringify({ enabled: cfg.enabled === true, baseUrl: cfg.baseUrl.trim() }))
  } catch { /* noop */ }
}

/** ¿Hay proxy efectivo? Activo Y con URL base configurada. */
export function isProxyActive(cfg?: ProxyConfig): boolean {
  const c = cfg ?? loadProxyConfig()
  return c.enabled && c.baseUrl.trim().length > 0
}

/** Resuelve a dónde navegar: base + URL si hay proxy efectivo, si no directo. */
export function resolveExternalUrl(url: string, cfg?: ProxyConfig): string {
  const c = cfg ?? loadProxyConfig()
  if (!c.enabled) return url
  const base = c.baseUrl.trim()
  if (!base) return url
  return joinProxyUrl(base, url)
}

/** Une base + destino evitando pegotes (x.comhttps://…): si la base no
    termina en separador (/ ? = &), se inserta una barra. */
export function joinProxyUrl(base: string, dest: string): string {
  const b = base.trim()
  const d = dest.trim()
  if (!d) return b
  if (/[\/?=&]$/.test(b)) return b + d
  return `${b}/${d}`
}

/** Normaliza un destino tecleado: sin esquema pero con pinta de dominio
    (x.com, localhost:8080) → se asume https://. */
export function normalizeDestUrl(dest: string): string {
  const d = dest.trim()
  if (!d) return d
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(d)) return d
  return `https://${d}`
}

/** URL final que se abriría con un destino dado (para previsualizar y abrir
    desde Ajustes con una sola fuente de verdad). Sin nada que abrir → null. */
export function previewResolvedUrl(destInput: string, cfg?: ProxyConfig): string | null {
  const c = cfg ?? loadProxyConfig()
  const typed = destInput.trim()
  const base = c.baseUrl.trim()
  if (!typed && !base) return null
  if (!typed) return base
  const dest = normalizeDestUrl(typed)
  if (!isProxyActive(c)) return dest
  return joinProxyUrl(base, dest)
}

/** Abre una URL externa en pestaña nueva, pasando por el proxy si toca. */
export function openExternal(url: string): void {
  window.open(resolveExternalUrl(url), '_blank', 'noopener,noreferrer')
}
