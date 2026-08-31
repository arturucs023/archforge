/* Servicios systemd SIMULADOS: systemctl, journalctl, dig, nslookup, ss y ssh.
   El estado vive en ShellState.services (clave lógica → {active, enabled}).
   Nada de este archivo toca el sistema real. */

import type { ExecContext, CommandFn } from './commands'
import { REGISTRY, cmd } from './commands'
import { isPkgInstalled } from './packages'
import type { PkgDistro } from './packages'
import type { ServiceRuntime } from './state'

/* ------------------------------ definiciones ------------------------------ */

export interface ServiceDef {
  id: string
  units: { arch: string; debian: string }
  pkgs: { arch: string[]; debian: string[] }
  port: number
  proto: 'tcp' | 'udp'
  desc: string
}

export const SERVICES: ServiceDef[] = [
  {
    id: 'ssh',
    units: { arch: 'sshd.service', debian: 'ssh.service' },
    pkgs: { arch: ['openssh'], debian: ['openssh-server'] },
    port: 22,
    proto: 'tcp',
    desc: 'OpenSSH server daemon',
  },
  {
    id: 'nginx',
    units: { arch: 'nginx.service', debian: 'nginx.service' },
    pkgs: { arch: ['nginx'], debian: ['nginx'] },
    port: 80,
    proto: 'tcp',
    desc: 'A high performance web server and reverse proxy server',
  },
  {
    id: 'apache',
    units: { arch: 'httpd.service', debian: 'apache2.service' },
    pkgs: { arch: ['apache'], debian: ['apache2'] },
    port: 80,
    proto: 'tcp',
    desc: 'Apache Web Server (the httpd daemon)',
  },
  {
    id: 'dns',
    units: { arch: 'named.service', debian: 'bind9.service' },
    pkgs: { arch: ['bind'], debian: ['bind9'] },
    port: 53,
    proto: 'udp',
    desc: 'Berkeley Internet Name Domain (DNS)',
  },
  {
    id: 'ftp',
    units: { arch: 'vsftpd.service', debian: 'vsftpd.service' },
    pkgs: { arch: ['vsftpd'], debian: ['vsftpd'] },
    port: 21,
    proto: 'tcp',
    desc: 'Very Secure FTP Daemon',
  },
  {
    id: 'samba',
    units: { arch: 'smb.service', debian: 'smbd.service' },
    pkgs: { arch: ['samba'], debian: ['samba'] },
    port: 445,
    proto: 'tcp',
    desc: 'Samba SMB/CIFS server',
  },
  {
    id: 'nfs',
    units: { arch: 'nfs-server.service', debian: 'nfs-kernel-server.service' },
    pkgs: { arch: ['nfs-utils'], debian: ['nfs-kernel-server'] },
    port: 2049,
    proto: 'tcp',
    desc: 'NFS server and services',
  },
  {
    id: 'dhcp',
    units: { arch: 'dhcpd.service', debian: 'isc-dhcp-server.service' },
    pkgs: { arch: ['dhcp'], debian: ['isc-dhcp-server'] },
    port: 67,
    proto: 'udp',
    desc: 'ISC DHCP server daemon',
  },
]

/** alias adicionales aceptados como nombre de unidad */
const ALIASES: Record<string, string> = {
  ssh: 'ssh', sshd: 'ssh',
  named: 'dns', bind: 'dns', bind9: 'dns', dns: 'dns',
  nginx: 'nginx',
  apache2: 'apache', httpd: 'apache', apache: 'apache',
  vsftpd: 'ftp', ftp: 'ftp',
  smb: 'samba', smbd: 'samba', nmb: 'samba', nmbd: 'samba', samba: 'samba',
  nfs: 'nfs', 'nfs-server': 'nfs', 'nfs-kernel-server': 'nfs',
  dhcp: 'dhcp', dhcpd: 'dhcp', 'isc-dhcp-server': 'dhcp',
}

function unitOf(def: ServiceDef, distro: PkgDistro): string {
  return def.units[distro]
}

/** Resuelve cualquier variante de nombre a la definición lógica del servicio */
export function serviceByName(name: string): ServiceDef | null {
  const clean = name.replace(/\.service$/, '')
  const logical = ALIASES[clean]
  if (!logical) return null
  return SERVICES.find((s) => s.id === logical) ?? null
}

export function svcState(state: import('./state').ShellState, id: string): ServiceRuntime | undefined {
  return state.services?.[id]
}

function ensureSvc(ctx: ExecContext, id: string): ServiceRuntime {
  if (!ctx.state.services) ctx.state.services = {}
  let s = ctx.state.services[id]
  if (!s) {
    s = { active: false, enabled: false }
    ctx.state.services[id] = s
  }
  return s
}

/** ¿está el paquete que provee el servicio instalado en la distro activa? */
export function serviceInstalled(ctx: ExecContext, def: ServiceDef): boolean {
  return def.pkgs[ctx.distro].some((p) => isPkgInstalled(ctx.state.pkgs, ctx.distro, p))
}

function now(): string {
  const d = new Date()
  const p = (x: number): string => String(x).padStart(2, '0')
  return `${['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][d.getDay()]} ${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())} UTC`
}

function needsRoot(ctx: ExecContext, action: string, unit: string): boolean {
  if (ctx.state.user === 'root') return false
  ctx.errWrite(`Failed to ${action} ${unit}: Access denied\n`)
  ctx.errWrite('See "systemctl --no-pager --help" and sudo for details.\n')
  return true
}

/* -------------------------------- systemctl -------------------------------- */

function systemctlCmd(ctx: ExecContext): number {
  const rawArgs = ctx.args.slice(1)
  const nowFlag = rawArgs.includes('--now')
  const args = rawArgs.filter((a) => !a.startsWith('--'))
  const sub = args[0]
  if (!sub || sub === 'help') {
    ctx.write('Usage: systemctl [start|stop|restart|enable|disable|status|is-active|is-enabled] UNIT\n')
    ctx.write('       systemctl list-units [--type=service]\n')
    return 0
  }

  if (sub === 'list-units' || sub === 'list-unit-files') {
    ctx.write('UNIT                          LOAD   ACTIVE SUB     DESCRIPTION\n')
    for (const def of SERVICES) {
      if (!serviceInstalled(ctx, def)) continue
      const st = svcState(ctx.state, def.id)
      const unit = unitOf(def, ctx.distro)
      const load = st?.failed ? 'loaded' : 'loaded'
      const active = st?.active ? 'active' : st?.failed ? 'failed' : 'inactive'
      const subSt = st?.active ? 'running' : st?.failed ? 'failed' : 'dead'
      ctx.write(`${unit.padEnd(30)}${load.padEnd(7)}${active.padEnd(8)}${subSt.padEnd(8)}${def.desc}\n`)
    }
    ctx.write(`\n${SERVICES.filter((d) => serviceInstalled(ctx, d)).length} loaded units listed.\n`)
    return 0
  }

  const target = args[1]
  if (!target) { ctx.errWrite(`Too few arguments: missing unit name\n`); return 1 }
  const def = serviceByName(target)
  const unit = def ? unitOf(def, ctx.distro) : `${target.replace(/\.service$/, '')}.service`

  switch (sub) {
    case 'status': {
      if (!def || !serviceInstalled(ctx, def)) {
        ctx.errWrite(`Unit ${unit} could not be found.\n`)
        return 4
      }
      const st = ensureSvc(ctx, def.id)
      const dot = st.active ? '●' : st.failed ? '×' : '○'
      const activeTxt = st.active ? `active (running) since ${now()}` : st.failed ? 'failed (Result: exit-code)' : 'inactive (dead)'
      ctx.write(`${dot} ${unit} - ${def.desc}\n`)
      ctx.write(`     Loaded: loaded (/usr/lib/systemd/system/${unit}; ${st.enabled ? 'enabled' : 'disabled'}; preset: disabled)\n`)
      ctx.write(`     Active: ${activeTxt}\n`)
      if (st.active) {
        ctx.write(`   Main PID: ${1200 + SERVICES.indexOf(def) * 37} (${def.id})\n`)
        ctx.write(`      Tasks: 3 (limit: 23100)\n`)
        ctx.write(`     Memory: ${(Math.abs(SERVICES.indexOf(def)) + 2)}.1M\n`)
        ctx.write(`        CPU: 45ms\n`)
      } else if (st.failed) {
        ctx.errWrite('\n')
        ctx.errWrite(`${now()} ${unit}: Failed with result 'exit-code'.\n`)
      }
      ctx.write(st.active ? '' : '\n')
      return st.active ? 0 : st.failed ? 1 : 3
    }
    case 'is-active': {
      if (!def || !serviceInstalled(ctx, def)) { ctx.write('unknown\n'); return 4 }
      const st = svcState(ctx.state, def.id)
      ctx.write(st?.active ? 'active\n' : st?.failed ? 'failed\n' : 'inactive\n')
      return st?.active ? 0 : 3
    }
    case 'is-enabled': {
      if (!def || !serviceInstalled(ctx, def)) { ctx.errWrite(`Failed to query file existence: ${unit}\n`); return 1 }
      const st = svcState(ctx.state, def.id)
      ctx.write(st?.enabled ? 'enabled\n' : 'disabled\n')
      return st?.enabled ? 0 : 1
    }
    case 'start': {
      if (!def || !serviceInstalled(ctx, def)) { ctx.errWrite(`Failed to start ${unit}: Unit ${unit} not found.\n`); return 5 }
      if (needsRoot(ctx, 'start', unit)) return 1
      const st = ensureSvc(ctx, def.id)
      if (st.active) { ctx.write(''); return 0 }
      st.active = true
      st.failed = false
      return 0
    }
    case 'restart':
    case 'reload-or-restart': {
      if (!def || !serviceInstalled(ctx, def)) { ctx.errWrite(`Failed to restart ${unit}: Unit not found.\n`); return 5 }
      if (needsRoot(ctx, 'restart', unit)) return 1
      const st = ensureSvc(ctx, def.id)
      st.active = true
      st.failed = false
      return 0
    }
    case 'stop': {
      if (!def || !serviceInstalled(ctx, def)) { ctx.errWrite(`Failed to stop ${unit}: Unit not found.\n`); return 5 }
      if (needsRoot(ctx, 'stop', unit)) return 1
      const st = ensureSvc(ctx, def.id)
      st.active = false
      st.failed = false
      return 0
    }
    case 'enable': {
      if (!def || !serviceInstalled(ctx, def)) { ctx.errWrite(`Failed to enable ${unit}: Unit not found.\n`); return 5 }
      if (needsRoot(ctx, 'enable', unit)) return 1
      const st = ensureSvc(ctx, def.id)
      st.enabled = true
      ctx.write(`Created symlink /etc/systemd/system/multi-user.target.wants/${unit} → /usr/lib/systemd/system/${unit}.\n`)
      if (nowFlag && !st.active) {
        st.active = true
        st.failed = false
        ctx.write(`(—now: unidad iniciada además de habilitada)\n`)
      }
      return 0
    }
    case 'disable': {
      if (!def || !serviceInstalled(ctx, def)) { ctx.errWrite(`Failed to disable ${unit}: Unit not found.\n`); return 5 }
      if (needsRoot(ctx, 'disable', unit)) return 1
      const st = ensureSvc(ctx, def.id)
      st.enabled = false
      ctx.write(`Removed "/etc/systemd/system/multi-user.target.wants/${unit}".\n`)
      if (nowFlag && st.active) {
        st.active = false
        st.failed = false
        ctx.write(`(—now: unidad detenida además de deshabilitada)\n`)
      }
      return 0
    }
    default:
      ctx.errWrite(`Unknown operation ${sub}.\n`)
      return 1
  }
}
cmd(['systemctl'], systemctlCmd)

/* ------------------------------- journalctl -------------------------------- */

function journalLinesFor(def: ServiceDef, st: ServiceRuntime, distro: PkgDistro): string[] {
  const unit = unitOf(def, distro)
  const tag = def.id === 'dns' && distro === 'debian' ? 'named' : def.units[distro].replace('.service', '')
  const lines: string[] = []
  lines.push(`-- Journal entry for ${unit} --`)
  if (st.active) {
    if (def.id === 'nginx') {
      lines.push(`${tag}[1210]: nginx: configuration file /etc/nginx/nginx.conf test is successful`)
      lines.push(`${tag}[1210]: start worker processes`)
    } else if (def.id === 'ssh') {
      lines.push(`${tag}[1225]: Server listening on 0.0.0.0 port 22.`)
      lines.push(`${tag}[1225]: Server listening on :: port 22.`)
    } else if (def.id === 'dns') {
      lines.push(`${tag}[1230]: starting BIND 9.x.x -u named`)
      lines.push(`${tag}[1230]: command channel listening on 127.0.0.1#953`)
    } else if (def.id === 'apache') {
      lines.push(`${tag}[1240]: AH00558: ${tag}: Could not reliably determine the server's fully qualified domain name.`)
      lines.push(`${tag}[1240]: configured -- resuming normal operations`)
    } else if (def.id === 'ftp') {
      lines.push(`${tag}[1250]: ready to handle connections.`)
    } else if (def.id === 'samba') {
      lines.push(`${tag}[1260]: daemon started (version 4.x)` )
    } else if (def.id === 'nfs') {
      lines.push(`${tag}[1270]: Starting NFS server and services...`)
      lines.push(`${tag}[1270]: Exporting NFS shares... done.`)
    }
    lines.push(`${tag}[systemd]: Started ${def.desc}.`)
  } else if (st.failed) {
    lines.push(`${tag}[1280]: configuration error detected — check the config file`)
    lines.push(`systemd[1]: ${unit}: Failed with result 'exit-code'.`)
  } else {
    lines.push(`systemd[1]: Stopped ${def.desc}.`)
  }
  return lines
}

cmd(['journalctl'], (ctx) => {
  const args = restOf(ctx.args)
  let unitArg: string | undefined
  let n = 10
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-u') unitArg = args[++i]
    else if (args[i] === '-n') n = Number(args[++i]) || 10
    else if (/^--no-pager$|^--quiet$|^-xe?$/.test(args[i])) continue
  }
  const all = SERVICES.filter((d) => serviceInstalled(ctx, d))
  if (!all.length) { ctx.write('-- No entries --\n'); return 0 }

  const targets = unitArg
    ? (() => {
        const d = serviceByName(unitArg)
        return d && all.includes(d) ? [d] : []
      })()
    : all

  if (unitArg && !targets.length) { ctx.errWrite(`Failed to add match "_SYSTEMD_UNIT=${unitArg}".\n`); return 1 }

  const out: string[] = []
  for (const def of targets) {
    const st = svcState(ctx.state, def.id) ?? { active: false, enabled: false }
    out.push(...journalLinesFor(def, st, ctx.distro))
  }
  for (const l of out.slice(-n)) ctx.write(l + '\n')
  return 0
})

/* ---------------------------------- ss ----------------------------------- */

cmd(['ss'], (ctx) => {
  if (!isPkgInstalled(ctx.state.pkgs, ctx.distro, 'iproute2')) {
    ctx.errWrite('bash: ss: command not found\n')
    return 127
  }
  ctx.write('Netid State  Recv-Q Send-Q Local Address:Port  Peer Address:Port Process\n')
  let any = false
  for (const def of SERVICES) {
    if (!serviceInstalled(ctx, def)) continue
    const st = svcState(ctx.state, def.id)
    if (!st?.active) continue
    any = true
    const procName = def.units[ctx.distro].replace('.service', '')
    ctx.write(
      `${def.proto}   LISTEN 0      511          0.0.0.0:${String(def.port).padEnd(15)} 0.0.0.0:*           users:(("${procName}",pid=${1200 + SERVICES.indexOf(def) * 37},fd=6))\n`,
    )
    if (def.id === 'dns' || def.id === 'dhcp') {
      // DNS también escucha por UDP y en IPv6
      ctx.write(`udp   UNCONN 0      0             0.0.0.0:${String(def.port).padEnd(15)} 0.0.0.0:*           users:(("${procName}",pid=${1200 + SERVICES.indexOf(def) * 37},fd=6))\n`)
    }
  }
  if (!any) ctx.write('(ningún servicio activo está escuchando — arranca uno con systemctl start)\n')
  return 0
})

function restOf(args: string[]): string[] {
  return args.slice(1)
}

/* ---------------------------- resolución DNS ----------------------------- */

interface DnsRecord { name: string; type: string; rdata: string }

const ZONE_DIRS = ['/etc/named/zones', '/etc/bind']

/** Lee todos los ficheros de zona del VFS y extrae registros */
function readZones(vfs: ExecContext['vfs']): { origin: string; records: DnsRecord[] }[] {
  const zones: { origin: string; records: DnsRecord[] }[] = []
  for (const dir of ZONE_DIRS) {
    const absDir = vfs.resolve(dir)
    if (!vfs.isDir(absDir)) continue
    for (const name of vfs.listDir(absDir)) {
      const absFile = `${absDir === '/' ? '' : absDir}/${name}`
      const node = vfs.get(absFile)
      if (!node || node.type !== 'file') continue
      let content = ''
      try { content = vfs.readFile(absFile) } catch { continue }
      let origin = name.replace(/^db\./, '')
      const records: DnsRecord[] = []
      for (const rawLine of content.split('\n')) {
        const line = rawLine.trim()
        if (!line || line.startsWith(';')) continue
        const m = /^\$ORIGIN\s+(\S+)/.exec(line)
        if (m) { origin = m[1].replace(/\.$/, ''); continue }
        if (/^\$(TTL|INCLUDE|GENERATE)/.test(line)) continue
        const parts = line.split(/\s+/)
        // name ttl class type rdata…  |  name class type rdata… | @ IN SOA …
        let name = parts[0]
        let idx = 1
        while (idx < parts.length && /^(IN|\d+[smhdw]?)$/i.test(parts[idx])) {
          if (/^\d+[smhdw]?$/i.test(parts[idx]) === false) break
          idx++
        }
        // localizar el tipo conocido
        const knownTypes = ['A', 'AAAA', 'CNAME', 'MX', 'NS', 'TXT', 'PTR', 'SOA']
        let ti = -1
        for (let k = idx; k < Math.min(parts.length, idx + 3); k++) {
          if (knownTypes.includes(parts[k]?.toUpperCase() ?? '')) { ti = k; break }
        }
        if (ti < 0) continue
        const type = parts[ti].toUpperCase()
        const rdata = parts.slice(ti + 1).join(' ')
        records.push({ name, type, rdata })
      }
      zones.push({ origin, records })
    }
  }
  return zones
}

function qualify(name: string, origin: string): string {
  let n = name
  if (n === '@') n = origin
  else if (!n.endsWith('.')) n = `${n}.${origin}`
  return n.replace(/\.$/, '').toLowerCase()
}

function lookupLocal(zones: ReturnType<typeof readZones>, qname: string, qtype: string, depth = 0): { type: string; rdata: string }[] {
  if (depth > 4) return []
  const answers: { type: string; rdata: string }[] = []
  const wanted = qname.toLowerCase()
  for (const z of zones) {
    for (const r of z.records) {
      const fqdn = qualify(r.name, z.origin)
      if (fqdn !== wanted) continue
      const t = r.type
      if (qtype !== 'ANY' && t !== qtype && t !== 'CNAME') continue
      answers.push({ type: t, rdata: r.rdata })
      if (t === 'CNAME') {
        let target = r.rdata.replace(/\.$/, '').split(/\s+/)[0].toLowerCase()
        // objetivo relativo → cualificar con cada origen de zona conocido
        const candidates = target.includes('.') ? [target] : [target, ...new Set(zones.map((zz) => `${target}.${zz.origin}`))]
        for (const cand of candidates) {
          const sub = lookupLocal(zones, cand, qtype === 'ANY' ? 'ANY' : qtype, depth + 1)
          if (sub.length) { answers.push(...sub); break }
        }
      }
    }
  }
  return answers
}

const EXTERNAL_A: Record<string, string> = {
  'archlinux.org': '95.217.163.246',
  'google.com': '142.250.200.46',
  'example.com': '93.184.216.34',
  'cloudflare.com': '104.16.132.229',
}

function resolverFrom(vfs: ExecContext['vfs']): string {
  try {
    const conf = vfs.readFile('/etc/resolv.conf')
    for (const line of conf.split('\n')) {
      const m = /^nameserver\s+(\S+)/.exec(line.trim())
      if (m) return m[1]
    }
  } catch { /* sin resolv.conf */ }
  return '1.1.1.1'
}

function digCmd(ctx: ExecContext): number {
  const isDebianClient = ctx.distro === 'debian'
  const clientPkg = isDebianClient ? 'dnsutils' : 'bind'
  if (!isPkgInstalled(ctx.state.pkgs, ctx.distro, clientPkg)) {
    ctx.errWrite('bash: dig: command not found\n')
    return 127
  }

  const args = restOf(ctx.args).filter((a) => a !== '+short' && a !== '+noall' && a !== '+answer')
  const short = restOf(ctx.args).includes('+short')
  let server: string | undefined
  let qname = ''
  let qtype = 'A'

  for (const a of args) {
    if (a.startsWith('@')) server = a.slice(1)
    else if (/^(A|AAAA|CNAME|MX|NS|TXT|SOA|PTR|ANY)$/i.test(a)) qtype = a.toUpperCase()
    else if (!qname) qname = a
  }
  if (!qname) { ctx.errWrite('; <<>> DiG usage error: falta el nombre a consultar\n'); return 1 }

  const srv = server ?? resolverFrom(ctx.vfs)
  const isLocal = /^(127\.0\.0\.1|localhost|::1)$/.test(srv)

  if (server && !/^\d{1,3}(\.\d{1,3}){3}$/.test(server) && server !== 'localhost') {
    ctx.errWrite(`;; connection timed out; no servers could be reached\n`)
    return 1
  }

  const dnsSvc = svcState(ctx.state, 'dns')

  if (isLocal) {
    if (!dnsSvc?.active) {
      ctx.errWrite(`;; Connection to ${srv}#53 refused — ¿named está arrancado? (connection refused)\n`)
      return 1
    }
    const zones = readZones(ctx.vfs)
    if (!zones.length) {
      ctx.errWrite(`;; Warning: named corre pero no hay ficheros de zona cargables en /etc/named/zones ni /etc/bind\n`)
      ctx.write(`;; ->>HEADER<<- opcode: QUERY, status: SERVFAIL, id: ${rand16()}\n`)
      return 1
    }
    const answers = lookupLocal(zones, qname, qtype)
    if (!answers.length) {
      if (!short) {
        ctx.write(`\n;; ->>HEADER<<- opcode: QUERY, status: NXDOMAIN, id: ${rand16()}\n;; flags: qr aa rd ra; QUERY: 1, ANSWER: 0\n\n;; QUESTION SECTION:\n;${qname}.\t\tIN\t${qtype}\n\n`)
      }
      return 0
    }
    if (short) {
      for (const a of answers) ctx.write(`${a.rdata.replace(/\.$/, '')}\n`)
      return 0
    }
    ctx.write(`\n;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: ${rand16()}\n;; flags: qr aa rd; QUERY: 1, ANSWER: ${answers.length}, AUTHORITY: 0\n\n;; QUESTION SECTION:\n;${qname}.\t\t\tIN\t${qtype}\n\n;; ANSWER SECTION:\n`)
    for (const a of answers) {
      ctx.write(`${qname}.\t\t300\tIN\t${a.type}\t${a.rdata}\n`)
    }
    ctx.write(`\n;; Query time: 0 msec\n;; SERVER: ${srv}#53(${srv}) (UDP)\n;; WHEN: ${now()}\n;; MSG SIZE  rcvd: 84\n`)
    return 0
  }

  // resolutor externo simulado
  const ip = EXTERNAL_A[qname.toLowerCase()]
  if (qtype === 'A' && ip) {
    if (short) { ctx.write(`${ip}\n`); return 0 }
    ctx.write(`\n;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: ${rand16()}\n;; ANSWER SECTION:\n${qname}.\t\t300\tIN\tA\t${ip}\n`)
    return 0
  }
  if (!short) {
    ctx.write(`\n;; ->>HEADER<<- opcode: QUERY, status: NXDOMAIN, id: ${rand16()}\n;; QUESTION SECTION:\n;${qname}.\t\tIN\t${qtype}\n\n;; SERVER: ${srv}#53(${srv})\n`)
  }
  return 0
}
cmd(['dig'], digCmd)

function rand16(): number {
  return Number(Math.floor(Math.random() * 0xffff).toString().padStart(5, '0').slice(-5))
}

cmd(['nslookup'], (ctx) => {
  const args = restOf(ctx.args)
  let server: string | undefined
  let qname = ''
  for (const a of args) {
    if (a.startsWith('@')) server = a.slice(1)
    else if (!qname) qname = a
  }
  if (!qname) { ctx.errWrite('usage: nslookup nombre [@servidor]\n'); return 1 }
  const srv = server ?? resolverFrom(ctx.vfs)
  const isLocal = /^(127\.0\.0\.1|localhost|::1)$/.test(srv)
  const dnsSvc = svcState(ctx.state, 'dns')

  ctx.write(`Server:\t\t${srv}\nAddress:\t${srv}#53\n\n`)

  if (isLocal && !dnsSvc?.active) {
    ctx.write(`** server can't find ${qname}: REFUSED\n`)
    return 1
  }
  if (isLocal) {
    const zones = readZones(ctx.vfs)
    const answers = lookupLocal(zones, qname, 'A')
    if (!answers.length) { ctx.write(`** server can't find ${qname}: NXDOMAIN\n`); return 1 }
    for (const a of answers) {
      ctx.write(`Name:\t${qname}\nAddress: ${a.rdata.split(/\s+/)[0]}\n`)
    }
    return 0
  }
  const ip = EXTERNAL_A[qname.toLowerCase()]
  if (!ip) { ctx.write(`** server can't find ${qname}: NXDOMAIN\n`); return 1 }
  ctx.write(`Non-authoritative answer:\nName:\t${qname}\nAddress: ${ip}\n`)
  return 0
})

/* --------------------------------- ssh ----------------------------------- */

function parseSshTarget(arg?: string): { user: string; host: string } | null {
  if (!arg) return null
  const m = /^(?:([^@]+)@)?(.+)$/.exec(arg)
  if (!m) return null
  return { user: m[1] ?? ctxUser(), host: m[2] }
}
function ctxUser(): string {
  return 'user'
}

function sshPort(ctx: ExecContext): number {
  try {
    const conf = ctx.vfs.readFile('/etc/ssh/sshd_config')
    for (const line of conf.split('\n')) {
      const m = /^Port\s+(\d+)/i.exec(line.trim())
      if (m) return Number(m[1])
    }
  } catch { /* config ausente → 22 */ }
  return 22
}

cmd(['ssh'], (ctx) => {
  const args = restOf(ctx.args).filter((a) => a !== '-v' && a !== '-vv')
  let portFlag: number | undefined
  for (let i = 0; i < args.length; i++) if (args[i] === '-p') portFlag = Number(args[i + 1])
  const positional = args.find((a) => !a.startsWith('-') && args[args.indexOf(a) - 1] !== '-p')
  const target = parseSshTarget(positional)
  if (!target) { ctx.errWrite('usage: ssh usuario@host [-p puerto]\n'); return 255 }

  const def = SERVICES.find((s) => s.id === 'ssh')!
  if (!serviceInstalled(ctx, def)) { ctx.errWrite(`bash: ssh: command not found\n`); return 127 }

  const isSelf = /^(localhost|127\.0\.0\.1)$/.test(target.host)
  const st = svcState(ctx.state, 'ssh')
  const port = portFlag ?? sshPort(ctx)

  if (isSelf && !st?.active) {
    ctx.errWrite(`ssh: connect to host ${target.host} port ${port}: Connection refused\n`)
    return 255
  }
  if (isSelf) {
    // ¿autenticación con clave pública configurada?
    let hasKey = false
    try {
      const ak = ctx.vfs.readFile('/home/user/.ssh/authorized_keys')
      hasKey = ak.includes('id_ed25519.pub') || ak.trim().length > 0
    } catch { hasKey = false }
    ctx.write(`Warning: Permanently added '${target.host}' (ED25519) to the list of known hosts.\n`)
    if (hasKey) ctx.write(`Authenticated to ${target.host} using "publickey".\n`)
    else ctx.write(`${target.user ?? ctxUser()}@${target.host}'s password: \n`)
    ctx.write(`Welcome to ArchForge ${ctx.distro === 'arch' ? 'Arch Linux' : 'Ubuntu'} (simulado)\n`)
    ctx.write(`Última conexión: ${now()} desde localhost\n`)
    ctx.write(`(sesión remota simulada cerrada — el servidor SSH funciona)\n`)
    return 0
  }
  ctx.errWrite(`ssh: Could not resolve hostname ${target.host}: Name or service not known\n`)
  return 255
})

cmd(['ssh-keygen'], (ctx) => {
  const args = restOf(ctx.args)
  const type = (() => {
    const i = args.indexOf('-t')
    return i >= 0 ? args[i + 1] : 'rsa'
  })()
  if (type !== 'ed25519' && type !== 'rsa') { ctx.errWrite(`unknown key type ${type}\n`); return 1 }
  const dir = '/home/user/.ssh'
  const priv = `${dir}/id_${type}`
  const pub = `${priv}.pub`
  try {
    ctx.vfs.createDir(dir, true)
    ctx.vfs.chmod(dir, 0o700, null)
  } catch { /* ya existe */ }
  const fpSeed = Array.from({ length: 20 }, (_, i) => ((Date.now() >> i * 3) & 0xff).toString(16).padStart(2, '0')).slice(0, 16)
  const fingerprint = fpSeed.reduce((acc: string[], h, i) => (i % 2 === 0 ? [...acc, h] : [...acc.slice(0, -1), acc.at(-1)! + ':' + h]), [] as string[]).join(':')
  try {
    ctx.vfs.writeFile(priv, `-----BEGIN OPENSSH PRIVATE KEY-----\n(simulado — clave privada generada por ArchForge CLI)\n-----END OPENSSH PRIVATE KEY-----\n`)
    ctx.vfs.chmod(priv, 0o600, null)
    ctx.vfs.writeFile(pub, `ssh-${type === 'ed25519' ? 'ed25519' : 'rsa'} AAAA${fpSeed.join('').toUpperCase().slice(0, 40)} user@archforge\n`)
  } catch (e) {
    ctx.errWrite(`ssh-keygen: ${(e as Error).message}\n`)
    return 1
  }
  ctx.write(`Generating public/private ${type} key pair.\nYour identification has been saved in ${priv}\nYour public key has been saved in ${pub}\nThe key fingerprint is:\nSHA256:${fingerprint} user@archforge\n`)
  return 0
})

cmd(['ssh-copy-id'], (ctx) => {
  const args = restOf(ctx.args)
  const positional = args.find((a) => !a.startsWith('-'))
  const target = parseSshTarget(positional)
  if (!target) { ctx.errWrite('usage: ssh-copy-id usuario@host\n'); return 1 }

  const def = SERVICES.find((s) => s.id === 'ssh')!
  if (!serviceInstalled(ctx, def)) { ctx.errWrite(`bash: ssh-copy-id: command not found\n`); return 127 }

  const pub = '/home/user/.ssh/id_ed25519.pub'
  try { ctx.vfs.readFile(pub) } catch {
    ctx.errWrite(`/usr/bin/ssh-copy-id: ERROR: no se encontró ${pub} — genera una clave antes (ssh-keygen -t ed25519)\n`)
    return 1
  }
  const pubContent = ctx.vfs.readFile(pub)

  if (!/^(localhost|127\.0\.0\.1)$/.test(target.host)) {
    ctx.errWrite(`ssh: Could not resolve hostname ${target.host}: Name or service not known\n`)
    return 255
  }
  if (!svcState(ctx.state, 'ssh')?.active) {
    ctx.errWrite(`ssh: connect to host ${target.host} port 22: Connection refused\n`)
    return 255
  }
  const dir = '/home/user/.ssh'
  try { ctx.vfs.createDir(dir, true); ctx.vfs.chmod(dir, 0o700, null) } catch { /* ok */ }
  let existing = ''
  try { existing = ctx.vfs.readFile(`${dir}/authorized_keys`) } catch { /* nuevo */ }
  if (existing.includes(pubContent.trim())) {
    ctx.write(`All keys were already installed on the remote host.\nNumber of key(s) added: 0\n`)
    return 0
  }
  try {
    ctx.vfs.writeFile(`${dir}/authorized_keys`, (existing ? existing.trimEnd() + '\n' : '') + pubContent.trimEnd() + '\n')
    ctx.vfs.chmod(`${dir}/authorized_keys`, 0o600, null)
  } catch (e) {
    ctx.errWrite(`ssh-copy-id: ${(e as Error).message}\n`)
    return 1
  }
  ctx.write(`Number of key(s) added: 1\nNow try logging into the machine, with:   "ssh '${positional}'"\nand check to make sure that only the key(s) you wanted were added.\n`)
  return 0
})

void REGISTRY
