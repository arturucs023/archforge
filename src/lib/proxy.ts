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
  return base + url
}

/** Abre una URL externa en pestaña nueva, pasando por el proxy si toca. */
export function openExternal(url: string): void {
  window.open(resolveExternalUrl(url), '_blank', 'noopener,noreferrer')
}
