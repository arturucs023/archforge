/* Puerta por distribución y utilidades compartidas de los gestores simulados. */

import type { ExecContext } from './commands'
import { catalogFor } from './packages'
import { activePkgs } from './packages'
import type { PkgDistro, PkgInfo } from './packages'

/** Comandos que SOLO existen en una familia; en la otra → command not found. */
export const DISTRO_GATE: Record<string, PkgDistro> = {
  apt: 'debian',
  'apt-get': 'debian',
  'apt-cache': 'debian',
  'apt-mark': 'debian',
  dpkg: 'debian',
  snap: 'debian',
  pacman: 'arch',
  'pacman-key': 'arch',
  yay: 'arch',
  paru: 'arch',
}

export function gateFor(name: string): PkgDistro | undefined {
  return DISTRO_GATE[name]
}

export function pkgsOf(ctx: ExecContext): ReturnType<typeof activePkgs> {
  const fallback = { arch: { installed: {}, explicit: {}, updated: false }, debian: { installed: {}, explicit: {}, updated: false } }
  return activePkgs(ctx.state.pkgs ?? fallback, ctx.distro)
}

export function catalogOf(ctx: ExecContext): Record<string, PkgInfo> {
  return catalogFor(ctx.distro)
}
