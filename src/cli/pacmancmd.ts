/* PACMAN simulado (Arch Linux): -S -Syu -Sy -Su -R -Rs -Ss -Si -Q -Qe -Qi -Ql
   con confirmación interactiva [S/n] y salida educativa en español. */

import type { ExecContext } from './commands'
import { REGISTRY } from './commands'
import { catalogOf, pkgsOf } from './pkggate'

function pacmanNeedsRoot(ctx: ExecContext): boolean {
  if (ctx.state.user === 'root') return false
  ctx.errWrite('error: no se pudo realizar la operación (requiere privilegios de superusuario)\n')
  return true
}

/** Resuelve dependencias; devuelve los NO instalados en orden de instalación. */
function resolveForInstall(ctx: ExecContext, names: string[]): { order: string[]; missing: string[] } {
  const cat = catalogOf(ctx)
  const db = pkgsOf(ctx)
  const seen = new Set<string>()
  const order: string[] = []
  const missing: string[] = []
  const walk = (name: string): void => {
    if (seen.has(name)) return
    seen.add(name)
    const info = cat[name]
    if (!info) { missing.push(name); return }
    if (db.installed[name] === undefined) order.push(name)
    for (const d of info.deps) walk(d)
  }
  for (const n of names) walk(n)
  return { order, missing }
}

function bumpVersion(v: string): string {
  return v.replace(/(\d+)(?!.*\d)/, (m) => String(Number(m) + 1))
}

function syncDatabases(ctx: ExecContext): void {
  ctx.write(':: Sincronizando las bases de datos de paquetes...\n')
  ctx.write(' core                     132,4 KiB   1,20 MiB/s 00:00 [##############################] 100%\n')
  ctx.write(' extra                    8,3 MiB     11,4 MiB/s 00:01 [##############################] 100%\n')
  pkgsOf(ctx).updated = true
}

export function registerPacmanCommand(): void {
  REGISTRY.pacman = (ctx: ExecContext): number => {
    // separar flags combinados (-Syu → S y u)
    let flags = ''
    const targets: string[] = []
    let noconfirm = false
    for (let i = 1; i < ctx.args.length; i++) {
      const a = ctx.args[i]
      if (a === '--noconfirm') { noconfirm = true; continue }
      if (/^-[a-zA-Z]+$/.test(a)) flags += a.slice(1)
      else targets.push(a)
    }

    /* --------------------------------- consultas Q --------------------------------- */
    if (flags.includes('Q')) {
      const db = pkgsOf(ctx)
      if (flags.includes('e')) {
        for (const name of Object.keys(db.explicit).sort()) ctx.write(`${name} ${db.installed[name]}\n`)
        return 0
      }
      const target = targets[0]
      if (target) {
        if (db.installed[target] === undefined) {
          ctx.errWrite(`error: el paquete «${target}» no se encontró\n`)
          return 1
        }
        if (flags.includes('i')) {
          const info = catalogOf(ctx)[target]
          ctx.write(`Nombre            : ${target}\n`)
          ctx.write(`Versión           : ${db.installed[target]}\n`)
          ctx.write(`Descripción       : ${info?.desc ?? ''}\n`)
          ctx.write(`Depende de        : ${info && info.deps.length > 0 ? info.deps.join('  ') : 'Ninguno'}\n`)
          ctx.write(`Tamaño instalado  : ${info?.size ?? '?'}\n`)
          return 0
        }
        if (flags.includes('l')) {
          ctx.write(`/usr/bin/${target}\n/usr/share/doc/${target}/README\n/etc/${target}.conf\n`)
          return 0
        }
        ctx.write(`${target} ${db.installed[target]}\n`)
        return 0
      }
      for (const name of Object.keys(db.installed).sort()) ctx.write(`${name} ${db.installed[name]}\n`)
      return 0
    }

    /* ------------------------------- búsquedas Si/Ss ------------------------------- */
    if (flags.includes('S') && flags.includes('i')) {
      const name = targets[0]
      const info = name ? catalogOf(ctx)[name] : undefined
      if (!info) { ctx.errWrite(`error: el paquete «${name ?? ''}» no se encontró\n`); return 1 }
      const inst = pkgsOf(ctx).installed[name]
      ctx.write(`Repositorio        : extra\nNombre             : ${info.name}\nVersión            : ${info.version}\nDescripción        : ${info.desc}\nDepende de         : ${info.deps.length > 0 ? info.deps.join('  ') : 'Ninguno'}\nTamaño descarga    : ${info.size}\nTamaño instalado   : ${info.size}\nEn instalación     : ${inst !== undefined ? 'Sí' : 'No'}\n`)
      return 0
    }
    if (flags.includes('S') && flags.includes('s')) {
      const q = (targets[0] ?? '').toLowerCase()
      if (!q) { ctx.errWrite('error: no hay objetivos\n'); return 1 }
      for (const info of Object.values(catalogOf(ctx))) {
        if (!info.name.includes(q) && !info.desc.toLowerCase().includes(q)) continue
        const installed = pkgsOf(ctx).installed[info.name] !== undefined ? ' [instalado]' : ''
        ctx.write(`extra/${info.name} ${info.version}${installed}\n    ${info.desc}\n`)
      }
      return 0
    }

    /* --------------------------------- sincronía Sy --------------------------------- */
    if (flags.includes('S') && flags.includes('y')) {
      if (pacmanNeedsRoot(ctx)) return 1
      syncDatabases(ctx)
      if (!flags.includes('u')) {
        ctx.write('\nhay «N» candidatos a actualizar — ejecuta pacman -Su para aplicarlos\n')
        return 0
      }
    }

    /* -------------------------------- actualización Su -------------------------------- */
    if (flags.includes('S') && flags.includes('u')) {
      if (pacmanNeedsRoot(ctx)) return 1
      if (!flags.includes('y')) syncDatabases(ctx)
      const db = pkgsOf(ctx)
      const upgradable = Object.keys(db.installed)
      ctx.write(':: iniciando actualización completa del sistema...\n')
      if (upgradable.every((n) => n === 'linux')) {
        // educativo: linux siempre tiene versión nueva para demostrar la transacción
        ctx.write('aviso: base ya está en la versión más reciente\n')
      }
      ctx.write('resolviendo dependencias...\n')
      ctx.write('buscando conflictos entre paquetes...\n')
      let count = 0
      for (const n of upgradable) {
        if (n === 'base') { ctx.write(`aviso: ${n} ya está en la versión más reciente\n`); continue }
        const oldV = db.installed[n]
        const newV = bumpVersion(oldV)
        count++
        ctx.write(`(${String(count).padStart(2)}) actualizando ${n} (${oldV} → ${newV}) [######################]\n`)
        db.installed[n] = newV
      }
      if (count === 0) ctx.write('no hay nada que hacer\n')
      else ctx.write(`:: Ejecutando post-transacciones...\n`)
      return 0
    }

    /* --------------------------------- eliminación R --------------------------------- */
    if (flags.includes('R')) {
      if (pacmanNeedsRoot(ctx)) return 1
      const db = pkgsOf(ctx)
      const present = targets.filter((t) => db.installed[t] !== undefined)
      for (const t of targets.filter((t) => db.installed[t] === undefined)) {
        ctx.errWrite(`error: objetivo no encontrado: ${t}\n`)
      }
      if (present.length === 0) return 1

      // dependencias que quedarían huérfanas (solo con -Rs, excluyendo lo preinstalado base)
      const orphans: string[] = []
      if (flags.includes('s')) {
        const requiredByOthers = new Set<string>()
        for (const inst of Object.keys(db.installed)) {
          if (present.includes(inst)) continue
          const info = catalogOf(ctx)[inst]
          for (const dep of info?.deps ?? []) requiredByOthers.add(dep)
        }
        for (const t of present) {
          for (const dep of catalogOf(ctx)[t]?.deps ?? []) {
            if (db.installed[dep] !== undefined && !requiredByOthers.has(dep) && !['base', 'linux', 'linux-firmware'].includes(dep)) {
              orphans.push(dep)
            }
          }
        }
      }

      const allRemove = [...present, ...orphans]
      ctx.write('comprobando dependencias...\n')
      ctx.write('\nPaquetes (' + allRemove.length + ') ' + allRemove.map((n) => `${n}-${db.installed[n]}`).join('  ') + '\n\n')
      ctx.write('Tamaño total liberado: ' + (allRemove.length * 5.42 / Math.max(allRemove.length, 1)).toFixed(2) + ' MiB\n\n')

      const doRemove = (): void => {
        for (const n of allRemove) {
          ctx.write(`:: Eliminando ${n} (${db.installed[n]})...\n`)
          delete db.installed[n]
          delete db.explicit[n]
        }
        ctx.state.lastExit = 0
      }

      if (noconfirm) { doRemove(); return 0 }
      ctx.write(':: ¿Continuar con la eliminación? [S/n] ')
      ctx.ask?.('', (answer) => {
        const a = answer.trim().toLowerCase()
        if (a !== '' && !a.startsWith('s') && !a.startsWith('y')) {
          ctx.errWrite('\n:: Operación cancelada\n')
          ctx.state.lastExit = 1
          return
        }
        doRemove()
      })
      return 0
    }

    /* --------------------------------- instalación S --------------------------------- */
    if (flags.includes('S') && !flags.includes('i') && !flags.includes('s')) {
      if (pacmanNeedsRoot(ctx)) return 1
      if (targets.length === 0) { ctx.errWrite('error: no hay objetivos\n'); return 1 }

      const { order, missing } = resolveForInstall(ctx, targets)
      if (missing.length > 0) {
        for (const m of missing) ctx.errWrite(`error: objetivo no encontrado: ${m}\n`)
        return 1
      }

      const cat = catalogOf(ctx)
      const alreadyNewest = targets.filter((t) => !order.includes(t))
      if (order.length === 0) {
        for (const a of alreadyNewest) ctx.write(`aviso: ${a}-${pkgsOf(ctx).installed[a]} ya está en la versión más reciente\n`)
        ctx.write(' no hay nada que hacer\n')
        return 0
      }

      ctx.write('resolviendo dependencias...\n')
      ctx.write('buscando conflictos entre paquetes...\n')
      ctx.write('\nPaquetes (' + order.length + ') ' + order.map((n) => `${n}-${cat[n].version}`).join('  ') + '\n\n')
      ctx.write('Tamaño total instalado: ' + order.reduce((acc, n) => acc + parseFloat(cat[n].size.replace(',', '.')) || acc, 0).toFixed(2) + ' MiB\n\n')

      const doInstall = (): void => {
        order.forEach((n, i) => {
          ctx.write(`(${String(i + 1).padStart(1)}/${order.length}) verificando claves del depósito...  [######]\n`)
        })
        order.forEach((n, i) => {
          ctx.write(`(${i + 1}/${order.length}) comprobando integridad...  [######]\n`)
        })
        for (const n of order) {
          ctx.write(`:: Instalando ${n} (${cat[n].version})...\n`)
          const db = pkgsOf(ctx)
          db.installed[n] = cat[n].version
          db.explicit[n] = true
        }
        ctx.state.lastExit = 0
      }

      if (noconfirm) { doInstall(); return 0 }
      ctx.write(':: ¿Continuar con la instalación? [S/n] ')
      ctx.ask?.('', (answer) => {
        const a = answer.trim().toLowerCase()
        if (a !== '' && !a.startsWith('s') && !a.startsWith('y')) {
          ctx.errWrite('\n:: Operación cancelada\n')
          ctx.state.lastExit = 1
          return
        }
        doInstall()
      })
      return 0
    }

    ctx.errWrite('uso: pacman <operación> [paquetes…]\n     operaciones: -S -Syu -R -Rs -Ss -Si -Q -Qe -Qi -Ql\n')
    return 2
  }
}
