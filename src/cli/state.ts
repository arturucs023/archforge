/* Estado del shell simulado: usuario, entorno, variables e historial. */

export type TermUser = 'user' | 'root'

import { initialPkgState } from './packages'
import type { PkgRuntimeState } from './packages'

/** Estado runtime de un servicio systemd simulado */
export interface ServiceRuntime {
  /** unidad activa (running) */
  active: boolean
  /** habilitada en el arranque (symlink en wants/) */
  enabled: boolean
  /** falló al iniciar por configuración inválida (marcado por laboratorios) */
  failed?: boolean
}

export interface ShellState {
  user: TermUser
  /** variables exportadas (visibles por hijos) */
  env: Record<string, string>
  /** variables locales del shell interactivo */
  vars: Record<string, string>
  cwd: string
  lastExit: number
  history: string[]
  /** argumentos del script en ejecución ($0 $1 …), si los hay */
  scriptArgs?: string[]
  /** funciones definidas en el script actual */
  functions: Record<string, { body: string[] }>
  /** gestores de paquetes simulados: estado separado por distribución */
  pkgs: PkgRuntimeState
  /** servicios systemd virtuales: clave lógica → estado */
  services?: Record<string, ServiceRuntime>
}

export function initialState(): ShellState {
  return {
    user: 'user',
    env: {
      HOME: '/home/user',
      USER: 'user',
      SHELL: '/bin/bash',
      PATH: '/usr/local/sbin:/usr/local/bin:/usr/bin:/bin',
      LANG: 'es_ES.UTF-8',
    },
    vars: {},
    cwd: '/home/user',
    lastExit: 0,
    history: [],
    functions: {},
    pkgs: initialPkgState(),
    services: {},
  }
}

export const WHEEL_USER = true // el usuario "user" pertenece a wheel (educativo)

export function promptFor(state: ShellState, distro: 'arch' | 'debian'): string {
  const home = `/home/${state.env.USER ?? state.user}`
  const short = state.cwd === home ? '~' : state.cwd.startsWith(home + '/') ? '~' + state.cwd.slice(home.length) : state.cwd
  if (distro === 'arch') {
    return state.user === 'root' ? `[root@archforge ${short}]#` : `[${state.user}@archforge ${short}]$`
  }
  return state.user === 'root' ? `root@ubuntu:${short}#` : `${state.user}@ubuntu:${short}$`
}
