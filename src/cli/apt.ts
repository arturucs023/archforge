/* APT simulado: lógica de install/remove/purge compartida.
   Salida educativa realista; muta únicamente el estado virtual de la sesión. */

import type { ExecContext } from './commands'
import { catalogOf, pkgsOf } from './pkggate'
import type { PkgInfo } from '../cli/packages'

export function aptNeedsRoot(ctx: ExecContext): boolean {
  if (ctx.state.user === 'root') return false
  ctx.errWrite('E: No se pudo abrir el archivo de bloqueo /var/lib/dpkg/lock-frontend - open (13: Permiso denegado)\n')
  ctx.errWrite('E: Imposible obtener el bloqueo de la administración de paquetes (/var/lib/dpkg), ¿es root?\n')
  return true
}

/** Resuelve dependencias en profundidad; devuelve los NO instalados en orden. */
export function aptResolve(ctx: ExecContext, names: string[]): { order: PkgInfo[]; missing: string[] } {
  const cat = catalogOf(ctx)
  const db = pkgsOf(ctx)
  const seen = new Set<string>()
  const order: PkgInfo[] = []
  const missing: string[] = []
  const walk = (name: string): void => {
    if (seen.has(name)) return
    seen.add(name)
    const info = cat[name]
    if (!info) { missing.push(name); return }
    if (db.installed[name] === undefined) order.push(info)
    for (const d of info.deps) walk(d)
  }
  for (const n of names) walk(n)
  return { order, missing }
}

function performInstall(ctx: ExecContext, order: PkgInfo[]): void {
  const db = pkgsOf(ctx)
  order.forEach((info, i) => {
    ctx.write(`Des:${i + 1} http://archive.ubuntu.com/ubuntu noble/main amd64 ${info.name} amd64 ${info.version} [${info.size}]\n`)
  })
  for (const info of order) {
    ctx.write(`Desempaquetando ${info.name} (${info.version}) ...\n`)
    ctx.write(`Configurando ${info.name} (${info.version}) ...\n`)
    db.installed[info.name] = info.version
    db.explicit[info.name] = true
  }
}

export function aptInstall(ctx: ExecContext, names: string[], autoYes: boolean): number {
  if (aptNeedsRoot(ctx)) return 100
  const { order, missing } = aptResolve(ctx, names)
  if (missing.length > 0) {
    ctx.write('Leyendo lista de paquetes... Hecho\n')
    ctx.write('Creando árbol de dependencias... Hecho\n')
    for (const m of missing) ctx.errWrite(`E: Imposible localizar el paquete ${m}\n`)
    return 100
  }

  ctx.write('Leyendo lista de paquetes... Hecho\n')
  ctx.write('Creando árbol de dependencias... Hecho\n')

  const db = pkgsOf(ctx)
  const already = names.filter((n) => !order.some((o) => o.name === n))
  for (const a of already) ctx.write(`${a} ya está en su versión más reciente (${db.installed[a]}).\n`)

  if (order.length === 0) {
    ctx.write('0 actualizados, 0 nuevos se instalarán, 0 para eliminar y 0 no actualizados.\n')
    return 0
  }

  ctx.write('Se instalarán los siguientes paquetes NUEVOS:\n')
  ctx.write('  ' + order.map((o) => o.name).join(' ') + '\n')
  ctx.write(`0 actualizados, ${order.length} nuevos se instalarán, 0 para eliminar y 0 no actualizados.\n`)
  ctx.write('¿Desea continuar? [S/n] ')

  const proceed = (): void => {
    performInstall(ctx, order)
    ctx.state.lastExit = 0
  }

  if (autoYes) { proceed(); return 0 }
  ctx.ask?.('', (answer) => {
    const a = answer.trim().toLowerCase()
    if (a !== '' && !a.startsWith('s') && !a.startsWith('y')) {
      ctx.errWrite('Cancelado.\n')
      ctx.state.lastExit = 1
      return
    }
    proceed()
  })
  return 0
}

export function aptRemove(ctx: ExecContext, names: string[], purge: boolean, autoYes: boolean): number {
  if (aptNeedsRoot(ctx)) return 100
  const db = pkgsOf(ctx)
  const present = names.filter((n) => db.installed[n] !== undefined)
  for (const a of names.filter((n) => db.installed[n] === undefined)) {
    ctx.errWrite(`E: El paquete «${a}» no está instalado, no se podrá eliminar\n`)
  }
  if (present.length === 0) return 100

  ctx.write('Leyendo lista de paquetes... Hecho\n')
  ctx.write('Creando árbol de dependencias... Hecho\n')
  ctx.write('Los siguientes paquetes SE ELIMINARÁN:\n')
  ctx.write('  ' + present.join(' ') + '\n')
  ctx.write(`0 actualizados, 0 nuevos se instalarán, ${present.length} para eliminar y 0 no actualizados.\n`)
  ctx.write(purge ? '¿Desea continuar? [S/n] ' : '')

  const doRemove = (): void => {
    for (const n of present) {
      ctx.write(purge ? `Purgando ${n} (${db.installed[n]}) ...\n` : `Eliminando ${n} (${db.installed[n]}) ...\n`)
      delete db.installed[n]
      delete db.explicit[n]
    }
    ctx.state.lastExit = 0
  }

  if (!purge || autoYes) { doRemove(); return 0 }
  ctx.ask?.('', (answer) => {
    const a = answer.trim().toLowerCase()
    if (a !== '' && !a.startsWith('s') && !a.startsWith('y')) {
      ctx.errWrite('Cancelado.\n')
      ctx.state.lastExit = 1
      return
    }
    doRemove()
  })
  return 0
}
