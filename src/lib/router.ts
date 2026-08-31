import { useEffect, useState } from 'react'

export interface RouteInfo {
  path: string
  segments: string[]
  query: Record<string, string>
}

export function parseHash(): RouteInfo {
  const raw = window.location.hash.replace(/^#/, '') || '/'
  const [path, qs] = raw.split('?')
  const query: Record<string, string> = {}
  if (qs) new URLSearchParams(qs).forEach((v, k) => (query[k] = v))
  return { path, segments: path.split('/').filter(Boolean), query }
}

export function navigate(to: string) {
  const target = '#' + to
  if (window.location.hash === target) {
    window.dispatchEvent(new HashChangeEvent('hashchange'))
    return
  }
  window.location.hash = to
}

export function useRoute(): RouteInfo {
  const [route, setRoute] = useState<RouteInfo>(parseHash)
  useEffect(() => {
    const onChange = () => setRoute(parseHash())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}
