/* Registro de `apt` (subcomandos de consulta y mutación) sobre la lógica de apt.ts */

import type { ExecContext } from './commands'
import { REGISTRY } from './commands'
import { catalogOf, pkgsOf } from './pkggate'
import { aptInstall, aptRemove, aptNeedsRoot } from './apt'

export function registerAptCommand(): void {
  REGISTRY.apt = (ctx: ExecContext): number => {
    const sub = ctx.args[1]
    const rest = ctx.args.slice(2).filter((a) => a !== '-y')

    switch (sub) {
      case 'update': {
        if (aptNeedsRoot(ctx)) return 100
        ctx.write('Obj:1 http://archive.ubuntu.com/ubuntu noble InRelease\n')
        ctx.write('Des:2 http://archive.ubuntu.com/ubuntu noble-updates InRelease [126 kB]\n')
        ctx.write('Des:3 http://security.ubuntu.com/ubuntu noble-security InRelease [126 kB]\n')
        ctx.write('Descargados 252 kB en 1s (198 kB/s)\n')
        ctx.write('Leyendo lista de paquetes... Hecho\n')
        pkgsOf(ctx).updated = true
        return 0
      }

      case 'upgrade': {
        if (aptNeedsRoot(ctx)) return 100
        const db = pkgsOf(ctx)
        if (!db.updated) {
          ctx.errWrite('E: Ejecuta primero «apt update» para refrescar los índices.\n')
          return 100
        }
        for (const n of Object.keys(db.installed)) {
          const bumped = db.installed[n].replace(/(\d+)(?!.*\d)/, (m) => String(Number(m) + 1))
          ctx.write(`Actualizando ${n} (${db.installed[n]} → ${bumped}) ...\n`)
          db.installed[n] = bumped
        }
        return 0
      }

      case 'install':
        if (rest.length === 0) { ctx.errWrite('E: falta el nombre del paquete\n'); return 2 }
        return aptInstall(ctx, rest, true)

      case 'remove':
        if (rest.length === 0) { ctx.errWrite('E: falta el nombre del paquete\n'); return 2 }
        return aptRemove(ctx, rest, false, true)

      case 'purge':
        if (rest.length === 0) { ctx.errWrite('E: falta el nombre del paquete\n'); return 2 }
        return aptRemove(ctx, rest, true, true)

      case 'search': {
        const q = (rest[0] ?? '').toLowerCase()
        if (!q) { ctx.errWrite('E: falta el término de búsqueda\n'); return 2 }
        let found = 0
        for (const info of Object.values(catalogOf(ctx))) {
          if (info.name.includes(q) || info.desc.toLowerCase().includes(q)) {
            const inst = pkgsOf(ctx).installed[info.name] !== undefined ? ',now' : ''
            ctx.write(`${info.name}/noble${inst} ${info.version} amd64\n`)
            ctx.write(`  ${info.desc}\n`)
            found++
          }
        }
        if (found === 0) ctx.write('\n')
        return 0
      }

      case 'show': {
        const name = rest[0]
        const info = name ? catalogOf(ctx)[name] : undefined
        if (!info) { ctx.errWrite(`E: no se ha podido localizar el paquete ${name ?? ''}\n`); return 100 }
        const installed = pkgsOf(ctx).installed[name]
        ctx.write(`Paquete: ${info.name}\n`)
        ctx.write(`Versión: ${info.version}\n`)
        ctx.write(`Estado: ${installed !== undefined ? 'instalado' : 'no instalado'}\n`)
        ctx.write(`Tamaño: ${info.size}\n`)
        ctx.write(`Depende: ${info.deps.length > 0 ? info.deps.join(', ') : '(ninguna)'}\n`)
        ctx.write(`Descripción: ${info.desc}\n`)
        return 0
      }

      case 'list': {
        const wantInstalled = rest.includes('--installed') || rest.includes('-i')
        const cat = catalogOf(ctx)
        const db = pkgsOf(ctx)
        if (wantInstalled) {
          for (const name of Object.keys(db.installed).sort()) {
            ctx.write(`${name}/noble,now ${db.installed[name]} amd64 [instalado]\n`)
          }
          return 0
        }
        for (const info of Object.values(cat)) {
          const inst = db.installed[info.name] !== undefined ? ',now [instalado]' : ''
          ctx.write(`${info.name}/noble${inst} ${info.version} amd64\n`)
        }
        return 0
      }

      default:
        ctx.errWrite('apt 2.7.14 (amd64)\nUso: apt [update|upgrade|install|remove|purge|search|show|list] …\n')
        return 2
    }
  }
}
