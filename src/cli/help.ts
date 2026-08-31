/* Fuente ÚNICA de verdad para «comandos disponibles»: la usa el comando `help`
   dentro de la shell y los chips de la página de la terminal. Añadir un comando
   aquí basta para que ambos sitios lo muestren. */

import { cmd } from './commands'
import { gateFor } from './pkggate'
import { REGISTRY } from './commands'

export interface CommandGroup {
  label: string
  /** cadena mostrada; el comando real es la primera palabra */
  items: string[]
}

export const COMMAND_GROUPS: CommandGroup[] = [
  {
    label: 'Archivos y navegación',
    items: ['pwd', 'ls [-la]', 'cd', 'mkdir [-p]', 'rmdir', 'touch', 'cp [-r]', 'mv', 'rm [-r]', 'find', 'file', 'cat', 'less', 'head', 'tail'],
  },
  {
    label: 'Texto y filtros',
    items: ['echo', 'printf', 'grep patrón', 'sed', 'awk', 'wc', 'sort', 'uniq', 'cut -d, -f1', 'tr'],
  },
  {
    label: 'Permisos y usuarios',
    items: ['sudo', 'su', 'chmod 755', 'chown', 'whoami', 'id'],
  },
  {
    label: 'Sistema e información',
    items: ['hostname', 'date', 'ps aux', 'kill PID', 'history', 'clear', 'sleep N', 'true | false', 'env / export / unset', 'which', 'type', 'man comando'],
  },
  {
    label: 'Redes',
    items: ['ping host', 'ss -tulpn', 'resolvectl flush-caches', 'dhclient', 'rfkill list'],
  },
  {
    label: 'Servicios systemd',
    items: ['systemctl status unidad', 'systemctl start|stop|restart', 'systemctl enable --now', 'journalctl -u unidad'],
  },
  {
    label: 'DNS y SSH',
    items: ['dig nombre [+short]', 'dig @servidor nombre TIPO', 'nslookup nombre', 'ssh user@host', 'ssh-keygen -t ed25519', 'ssh-copy-id user@host'],
  },
  {
    label: 'Paquetes (según distro)',
    items: ['pacman -Syu · -S nombre 🐧', 'pacman -Q · -Qe · -R 🐧', 'apt update · install 🟠', 'apt search · show · remove 🟠'],
  },
  {
    label: 'Scripts y editores',
    items: ['nano/vim fichero (editor integrado)', 'bash script.sh', './script.sh', 'VAR=valor comando'],
  },
]

/** nombres reales cubiertos por los grupos (primera palabra de cada ítem) */
const ALIAS_BASE: Record<string, string> = { more: 'less', nvim: 'nano', vim: 'nano', edit: 'nano', 'apt-get': 'apt', dpkg: 'apt' }

/** comandos representados dentro de un ítem agrupado (p. ej. «env / export / unset») */
const GROUPED_COVER: Record<string, string[]> = {
  env: ['printenv', 'export', 'unset'],
  true: ['false'],
  'nano/vim': ['nano', 'vim', 'nvim', 'edit'],
}

function baseOf(item: string): string {
  return item.split(/[\s·]/)[0]
}

/** comandos del registro NO representados en ningún grupo → nunca quedan ocultos */
export function uncoveredCommands(distro: 'arch' | 'debian'): string[] {
  const covered = new Set<string>(['help'])
  for (const g of COMMAND_GROUPS) for (const it of g.items) {
    const base = baseOf(it)
    covered.add(base)
    for (const extra of GROUPED_COVER[base] ?? []) covered.add(extra)
  }
  for (const alias of Object.keys(ALIAS_BASE)) covered.add(alias)
  return Object.keys(REGISTRY)
    .filter((n) => !covered.has(n))
    .filter((n) => {
      const gate = gateFor(n)
      return !gate || gate === distro
    })
    .sort()
}

cmd('help', (ctx) => {
  ctx.write('Comandos disponibles en esta simulación:\n')
  for (const g of COMMAND_GROUPS) {
    ctx.write(`\n${g.label}:\n`)
    for (const it of g.items) {
      const base = baseOf(it)
      const gate = gateFor(base)
      if (gate && gate !== ctx.distro) continue
      ctx.write(`  ${it}\n`)
    }
  }
  const extra = uncoveredCommands(ctx.distro)
  if (extra.length) ctx.write(`\nOtros:\n  ${extra.join(' · ')}\n`)
  ctx.write('\nPipes | y redirecciones > >> < funcionan · Ctrl+L limpia · Tab autocompleta.\n')
  return 0
})
