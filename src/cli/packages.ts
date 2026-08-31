/* Base de paquetes VIRTUAL para las dos familias simuladas.
   Los catálogos son estáticos; el estado (instalado/explícito/índices)
   vive en ShellState separado por distribución y se serializa con la sesión. */

export type PkgDistro = 'arch' | 'debian'

export interface PkgInfo {
  name: string
  version: string
  desc: string
  size: string
  deps: string[]
}

/* ---------------------------------- Arch ---------------------------------- */

export const ARCH_PKGS: Record<string, PkgInfo> = {
  base: { name: 'base', version: '3-2', desc: 'paquetes mínimos para un entorno Arch funcional', size: '12,1 MiB', deps: [] },
  'base-devel': { name: 'base-devel', version: '1-2', desc: 'grupo básico de herramientas de compilación', size: '8,4 MiB', deps: ['gcc', 'make'] },
  linux: { name: 'linux', version: '6.12.8.arch1-1', desc: 'el kernel Linux y sus módulos', size: '132,4 MiB', deps: ['base'] },
  'linux-firmware': { name: 'linux-firmware', version: '20250107.b2d4f5c-1', desc: 'firmware de drivers para Linux', size: '612,0 MiB', deps: [] },
  git: { name: 'git', version: '2.47.1-1', desc: 'sistema de control de versiones distribuido', size: '28,3 MiB', deps: ['curl'] },
  curl: { name: 'curl', version: '8.11.1-3', desc: 'herramienta para transferir datos por URL', size: '1,2 MiB', deps: [] },
  wget: { name: 'wget', version: '1.25.0-1', desc: 'descarga archivos de la red (HTTP/FTP)', size: '3,1 MiB', deps: [] },
  vim: { name: 'vim', version: '9.1.0821-1', desc: 'editor Vi improved, potente y modal', size: '18,7 MiB', deps: [] },
  nano: { name: 'nano', version: '8.1-1', desc: 'editor de texto sencillo basado en Pico', size: '1,9 MiB', deps: [] },
  python: { name: 'python', version: '3.13.1-1', desc: 'lenguaje de programación Python 3', size: '75,6 MiB', deps: [] },
  'python-pip': { name: 'python-pip', version: '24.3.1-1', desc: 'instalador de paquetes para Python', size: '13,2 MiB', deps: ['python'] },
  nginx: { name: 'nginx', version: '1.26.2-1', desc: 'servidor web HTTP y proxy inverso ligero', size: '5,4 MiB', deps: [] },
  openssh: { name: 'openssh', version: '9.9p1-2', desc: 'implementación libre del protocolo SSH', size: '9,1 MiB', deps: [] },
  htop: { name: 'htop', version: '3.3.0-1', desc: 'monitor interactivo de procesos', size: '1,0 MiB', deps: [] },
  tree: { name: 'tree', version: '2.1.1-2', desc: 'muestra el contenido de directorios en árbol', size: '0,1 MiB', deps: [] },
  zip: { name: 'zip', version: '3.0-11', desc: 'crea archivos comprimidos ZIP', size: '0,9 MiB', deps: [] },
  unzip: { name: 'unzip', version: '6.0-19', desc: 'extrae archivos comprimidos ZIP', size: '0,4 MiB', deps: [] },
  gcc: { name: 'gcc', version: '14.2.1+r32-1', desc: 'GNU Compiler Collection (C/C++/…)', size: '142,8 MiB', deps: [] },
  make: { name: 'make', version: '4.4.1-2', desc: 'utilidad GNU para controlar la compilación', size: '2,1 MiB', deps: [] },
  jq: { name: 'jq', version: '1.7.1-1', desc: 'procesador JSON por línea de comandos', size: '3,8 MiB', deps: [] },
  iproute2: { name: 'iproute2', version: '6.11.0-1', desc: 'herramientas de red avanzadas (ip/ss)', size: '3,3 MiB', deps: [] },
  bind: { name: 'bind', version: '9.20.3-1', desc: 'servidor DNS BIND y utilidades (dig)', size: '11,7 MiB', deps: [] },
  'net-tools': { name: 'net-tools', version: '2.10-3', desc: 'herramientas de red clásicas (ifconfig, netstat)', size: '1,1 MiB', deps: [] },
  apache: { name: 'apache', version: '2.4.62-1', desc: 'servidor HTTP Apache de referencia', size: '5,1 MiB', deps: [] },
  vsftpd: { name: 'vsftpd', version: '3.0.5-3', desc: 'servidor FTP "very secure FTP daemon"', size: '0,2 MiB', deps: [] },
  samba: { name: 'samba', version: '4.21.2-1', desc: 'compartición de archivos e impresoras SMB/CIFS', size: '48,3 MiB', deps: [] },
  'nfs-utils': { name: 'nfs-utils', version: '2.7.1-1', desc: 'soporte cliente y servidor NFS en espacio de usuario', size: '1,8 MiB', deps: [] },
  dhcp: { name: 'dhcp', version: '4.4.3.P1-3', desc: 'servidor DHCP ISC (dhcpd)', size: '1,9 MiB', deps: [] },
  ufw: { name: 'ufw', version: '0.36.2-2', desc: 'frontal sencillo para gestionar firewall netfilter', size: '0,6 MiB', deps: [] },
}

/** Paquetes presentes en un Arch recién instalado (no marcados como explícitos). */
export const ARCH_PREINSTALLED: string[] = ['base', 'linux', 'linux-firmware']

/* ------------------------------ Debian / Ubuntu ------------------------------ */

export const DEBIAN_PKGS: Record<string, PkgInfo> = {
  curl: { name: 'curl', version: '8.5.0-2ubuntu10', desc: 'herramienta para transferir datos por URL', size: '567 kB', deps: [] },
  wget: { name: 'wget', version: '1.21.4-1ubuntu4', desc: 'descarga archivos de la red (HTTP/FTP)', size: '1.247 kB', deps: [] },
  git: { name: 'git', version: '1:2.43.0-1ubuntu7', desc: 'sistema de control de versiones distribuido', size: '3.567 kB', deps: [] },
  vim: { name: 'vim', version: '2:9.0.2116-1ubuntu2', desc: 'editor Vi improved, potente y modal', size: '4.120 kB', deps: [] },
  nano: { name: 'nano', version: '7.2-1build1', desc: 'editor de texto sencillo basado en Pico', size: '872 kB', deps: [] },
  python3: { name: 'python3', version: '3.12.3-0ubuntu2', desc: 'lenguaje de programación Python 3', size: '23,8 kB (metapaquete)', deps: [] },
  'python3-pip': { name: 'python3-pip', version: '24.0+dfsg-1ubuntu1', desc: 'instalador de paquetes para Python', size: '1.318 kB', deps: ['python3'] },
  nginx: { name: 'nginx', version: '1.24.0-2ubuntu7', desc: 'servidor web HTTP y proxy inverso ligero', size: '742 kB', deps: [] },
  apache2: { name: 'apache2', version: '2.4.58-1ubuntu8', desc: 'servidor web HTTP Apache', size: '1.382 kB', deps: [] },
  'openssh-server': { name: 'openssh-server', version: '1:9.6p1-3ubuntu13', desc: 'servidor de acceso remoto seguro (SSH)', size: '512 kB', deps: [] },
  htop: { name: 'htop', version: '3.3.0-4build1', desc: 'monitor interactivo de procesos', size: '108 kB', deps: [] },
  tree: { name: 'tree', version: '2.1.0-2build1', desc: 'muestra el contenido de directorios en árbol', size: '52 kB', deps: [] },
  zip: { name: 'zip', version: '3.0-13build1', desc: 'crea archivos comprimidos ZIP', size: '218 kB', deps: [] },
  unzip: { name: 'unzip', version: '6.0-28ubuntu4', desc: 'extrae archivos comprimidos ZIP', size: '173 kB', deps: [] },
  'build-essential': { name: 'build-essential', version: '12.10ubuntu1', desc: 'metapaquete informativo de herramientas de compilación', size: '18 kB', deps: ['gcc', 'make'] },
  gcc: { name: 'gcc', version: '4:13.2.0-7ubuntu1', desc: 'compilador GNU de C (metapaquete)', size: '48 kB', deps: [] },
  make: { name: 'make', version: '4.3-4.1build2', desc: 'utilidad GNU para controlar la compilación', size: '396 kB', deps: [] },
  jq: { name: 'jq', version: '1.7.1-3build1', desc: 'procesador JSON por línea de comandos', size: '208 kB', deps: [] },
  'net-tools': { name: 'net-tools', version: '2.10-0.1ubuntu4', desc: 'herramientas de red clásicas (ifconfig, netstat)', size: '304 kB', deps: [] },
  iproute2: { name: 'iproute2', version: '6.7.0-2ubuntu1', desc: 'herramientas de red avanzadas (ip/ss)', size: '1.126 kB', deps: [] },
  dnsutils: { name: 'dnsutils', version: '1:9.18.28-0ubuntu0', desc: 'clientes DNS (dig, nslookup)', size: '42 kB', deps: [] },
  bind9: { name: 'bind9', version: '1:9.18.28-0ubuntu0', desc: 'servidor DNS BIND 9 (named)', size: '2.812 kB', deps: ['dnsutils'] },
  'isc-dhcp-server': { name: 'isc-dhcp-server', version: '4.4.3P1-4ubuntu7', desc: 'servidor DHCP ISC para asignación automática de IP', size: '1.204 kB', deps: [] },
  vsftpd: { name: 'vsftpd', version: '3.0.3-12build1', desc: 'servidor FTP ligero y seguro', size: '148 kB', deps: [] },
  samba: { name: 'samba', version: '2:4.19.5+dfsg-4ubuntu9', desc: 'compartición de archivos SMB/CIFS para redes mixtas', size: '18.402 kB', deps: [] },
  'nfs-kernel-server': { name: 'nfs-kernel-server', version: '1:2.6.4-3ubuntu5', desc: 'soporte servidor NFS del kernel', size: '92 kB', deps: ['nfs-common'] },
  'nfs-common': { name: 'nfs-common', version: '1:2.6.4-3ubuntu5', desc: 'soporte cliente NFS', size: '264 kB', deps: [] },
  ufw: { name: 'ufw', version: '0.36.2-6ubuntu1', desc: 'frontal sencillo para gestionar firewall netfilter', size: '684 kB', deps: [] },
}

export function catalogFor(distro: PkgDistro): Record<string, PkgInfo> {
  return distro === 'arch' ? ARCH_PKGS : DEBIAN_PKGS
}

/* ------------------------------- runtime state ------------------------------- */

export interface DistroPkgState {
  /** nombre → versión instalada */
  installed: Record<string, string>
  /** instalados explícitamente por el usuario (pacman -Qe) */
  explicit: Record<string, true>
  /** ¿se han refrescado los índices al menos una vez? */
  updated: boolean
}

export interface PkgRuntimeState {
  arch: DistroPkgState
  debian: DistroPkgState
}

function freshDistro(distro: PkgDistro): DistroPkgState {
  const installed: Record<string, string> = {}
  const explicit: Record<string, true> = {}
  if (distro === 'arch') {
    for (const name of ARCH_PREINSTALLED) {
      installed[name] = ARCH_PKGS[name].version
    }
  }
  return { installed, explicit, updated: false }
}

export function initialPkgState(): PkgRuntimeState {
  return { arch: freshDistro('arch'), debian: freshDistro('debian') }
}

export function activePkgs(state: PkgRuntimeState, distro: PkgDistro): DistroPkgState {
  return distro === 'arch' ? state.arch : state.debian
}

export function isPkgInstalled(state: PkgRuntimeState, distro: PkgDistro, name: string): boolean {
  return activePkgs(state, distro).installed[name] !== undefined
}
