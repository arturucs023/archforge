/* VirtualFilesystem: nodos en memoria con permisos POSIX simplificados.
   100% aislado: son objetos JS; jamás toca el disco real del usuario. */

export type NodeType = 'dir' | 'file'

export interface VNode {
  type: NodeType
  /** modo octal, p. ej. 0o755 */
  mode: number
  owner: string
  group: string
  mtime: number
  content?: string
}

export const UMASK = 0o022

export class VFSError extends Error {
  constructor(msg: string) {
    super(msg)
    this.name = 'VFSError'
  }
}

function defaultTree(): Record<string, VNode> {
  const now = Date.now()
  const n = (type: NodeType, mode: number, owner = 'user', group = 'user', content?: string): VNode => ({
    type, mode, owner, group, mtime: now, content,
  })

  const tree: Record<string, VNode> = {
    '/': n('dir', 0o755, 'root', 'root'),
    '/home': n('dir', 0o755, 'root', 'root'),
    '/home/user': n('dir', 0o750, 'user', 'user'),
    '/home/user/Documents': n('dir', 0o755),
    '/home/user/Downloads': n('dir', 0o755),
    '/home/user/projects': n('dir', 0o755),
    '/home/user/scripts': n('dir', 0o755),
    '/tmp': n('dir', 0o777, 'root', 'root'),
    '/etc': n('dir', 0o755, 'root', 'root'),
    '/etc/ssh': n('dir', 0o755, 'root', 'root'),
    '/var': n('dir', 0o755, 'root', 'root'),
    '/var/log': n('dir', 0o755, 'root', 'root'),
    '/usr': n('dir', 0o755, 'root', 'root'),
    '/usr/bin': n('dir', 0o755, 'root', 'root'),
    '/opt': n('dir', 0o755, 'root', 'root'),
  }

  const putFile = (path: string, content: string, mode = 0o644, owner = 'user', group = 'user') => {
    tree[path] = n('file', mode, owner, group, content)
  }

  putFile(
    '/home/user/projects/hello.sh',
    '#!/usr/bin/env bash\necho "Hello ArchForge"\n',
    0o755,
  )
  putFile(
    '/home/user/projects/data.txt',
    'id nombre nota\n1 ana 90\n2 bob 45\n3 carol 78\n',
  )
  putFile('/home/user/notes.txt', 'comprar café\nestudiar bash\npracticar grep\n')
  putFile(
    '/etc/passwd',
    'root:x:0:0:root:/root:/bin/bash\nuser:x:1000:1000:user:/home/user:/bin/bash\nsshd:x:998:998:sshd:/var/empty:/usr/bin/nologin\n',
    0o644,
    'root',
    'root',
  )
  putFile('/etc/hostname', 'archforge\n', 0o644, 'root', 'root')
  putFile(
    '/etc/os-release',
    'NAME="Arch Linux"\nID=arch\nPRETTY_NAME="Arch Linux"\nHOME_URL="https://archlinux.org/"\n',
    0o644,
    'root',
    'root',
  )
  putFile(
    '/etc/ssh/sshd_config',
    '#Port 22\nPermitRootLogin prohibit-password\nPasswordAuthentication yes\n',
    0o644,
    'root',
    'root',
  )
  putFile(
    '/var/log/app.log',
    [
      '2026-01-01 09:00 INFO arranque del sistema',
      '2026-01-01 09:05 WARNING memoria al 70%',
      '2026-01-01 09:10 ERROR conexión perdida',
      '2026-01-01 09:12 INFO reconectado',
      '2026-01-01 09:30 ERROR timeout en api',
      '2026-01-02 08:00 INFO arranque del sistema',
      '2026-01-02 08:15 ERROR disco lleno',
    ].join('\n'),
    0o644,
    'root',
    'root',
  )
  putFile(
    '/var/log/syslog',
    'ene  1 09:00 systemd[1]: Started Network Manager.\nene  1 09:00 sshd[412]: Server listening on 0.0.0.0 port 22.\n',
    0o644,
    'root',
    'root',
  )

  // "binarios" representativos
  for (const b of ['bash', 'ls', 'grep', 'sed', 'awk', 'cat', 'vim', 'pacman', 'apt']) {
    putFile(`/usr/bin/${b}`, '\u007fELF-simulado', 0o755, 'root', 'root')
  }
  return tree
}

export interface SerializedVFS {
  nodes: Record<string, VNode>
}

export class VFS {
  private nodes: Record<string, VNode>
  cwd = '/home/user'
  user = 'user'

  constructor(serialized?: SerializedVFS) {
    this.nodes = serialized?.nodes ?? defaultTree()
  }

  serialize(): SerializedVFS {
    return { nodes: this.nodes }
  }

  reset(): void {
    this.nodes = defaultTree()
    this.cwd = '/home/user'
    this.user = 'user'
  }

  /* ---------------------------------- rutas ---------------------------------- */

  resolve(input: string): string {
    let p = input.trim() === '' ? this.cwd : input
    if (p === '~') p = `/home/${this.user}`
    else if (p.startsWith('~/')) p = `/home/${this.user}/${p.slice(2)}`
    if (!p.startsWith('/')) p = `${this.cwd}/${p}`
    const parts: string[] = []
    for (const seg of p.split('/')) {
      if (!seg || seg === '.') continue
      if (seg === '..') parts.pop()
      else parts.push(seg)
    }
    return '/' + parts.join('/')
  }

  displayPath(abs: string): string {
    const home = `/home/${this.user}`
    return abs === home ? '~' : abs.startsWith(home + '/') ? '~' + abs.slice(home.length) : abs
  }

  exists(abs: string): boolean {
    return this.nodes[abs] !== undefined
  }

  isDir(abs: string): boolean {
    return this.nodes[abs]?.type === 'dir'
  }

  get(abs: string): VNode | undefined {
    return this.nodes[abs]
  }

  parentOf(abs: string): string {
    const i = abs.lastIndexOf('/')
    return i <= 0 ? '/' : abs.slice(0, i)
  }

  baseName(abs: string): string {
    return abs.slice(abs.lastIndexOf('/') + 1) || '/'
  }

  listDir(abs: string): string[] {
    return Object.keys(this.nodes)
      .filter((p) => p !== '/' && this.parentOf(p) === abs)
      .map((p) => this.baseName(p))
      .sort()
  }

  /* ------------------------------- escritura ------------------------------- */

  private canWriteDir(dirAbs: string): boolean {
    const d = this.nodes[dirAbs]
    if (!d) throw new VFSError('No such file or directory')
    if (this.user === 'root') return true
    if (d.owner === this.user && (d.mode & 0o200)) return true
    // /tmp es world-writable (sticky bit ignorado educativamente)
    if ((d.mode & 0o002) && dirAbs === '/tmp') return true
    return false
  }

  assertWritableParent(parentAbs: string): void {
    if (!this.canWriteDir(parentAbs)) {
      throw new VFSError(`Permission denied`)
    }
  }

  createDir(abs: string, recursive = false): void {
    if (this.exists(abs)) {
      if (recursive && this.isDir(abs)) return
      throw new VFSError(`cannot create directory '${abs}': File exists`)
    }
    const parent = this.parentOf(abs)
    if (!this.exists(parent)) {
      if (!recursive) throw new VFSError(`cannot create directory '${abs}': No such file or directory`)
      this.createDir(parent, true)
    }
    this.assertWritableParent(parent)
    this.nodes[abs] = { type: 'dir', mode: 0o777 & ~UMASK, owner: this.user, group: this.user, mtime: Date.now() }
  }

  writeFile(abs: string, content: string): void {
    const existing = this.nodes[abs]
    if (existing) {
      if (existing.type === 'dir') throw new VFSError('Is a directory')
      if (this.user !== 'root' && existing.owner !== this.user && !(existing.mode & 0o222)) {
        throw new VFSError('Permission denied')
      }
      existing.content = content
      existing.mtime = Date.now()
      return
    }
    const parent = this.parentOf(abs)
    this.assertWritableParent(parent)
    this.nodes[abs] = { type: 'file', mode: 0o666 & ~UMASK, owner: this.user, group: this.user, mtime: Date.now(), content }
  }

  readFile(abs: string): string {
    const f = this.nodes[abs]
    if (!f) throw new VFSError(`No such file or directory`)
    if (f.type === 'dir') throw new VFSError('Is a directory')
    if (this.user !== 'root' && f.owner !== this.user && !(f.mode & 0o004)) {
      throw new VFSError('Permission denied')
    }
    return f.content ?? ''
  }

  remove(abs: string, recursive: boolean): void {
    const node = this.nodes[abs]
    if (!node) throw new VFSError(`cannot remove '${abs}': No such file or directory`)
    const parent = this.parentOf(abs)
    this.assertWritableParent(parent)
    if (node.type === 'dir') {
      const children = this.listDir(abs)
      if (children.length > 0 && !recursive) {
        throw new VFSError(`cannot remove '${abs}': Directory not empty`)
      }
      for (const c of children) this.remove(`${abs === '/' ? '' : abs}/${c}`, true)
    }
    delete this.nodes[abs]
  }

  copy(src: string, dst: string, recursive: boolean): void {
    const node = this.nodes[src]
    if (!node) throw new VFSError(`cannot stat '${src}': No such file or directory`)
    if (node.type === 'dir' && !recursive) throw new VFSError(`-r not specified; omitting directory '${src}'`)
    let target = dst
    if (this.isDir(dst)) target = `${dst === '/' ? '' : dst}/${this.baseName(src)}`
    this.assertWritableParent(this.parentOf(target))
    if (node.type === 'dir') {
      this.createDir(target, true)
      for (const c of this.listDir(src)) {
        this.copy(`${src === '/' ? '' : src}/${c}`, target, true)
      }
    } else {
      this.writeFile(target, node.content ?? '')
      const t = this.nodes[target]!
      t.mode = node.mode
      t.owner = this.user === 'root' ? node.owner : this.user
    }
  }

  move(src: string, dst: string): void {
    const node = this.nodes[src]
    if (!node) throw new VFSError(`cannot stat '${src}': No such file or directory`)
    let target = dst
    if (this.isDir(dst)) target = `${dst === '/' ? '' : dst}/${this.baseName(src)}`
    this.assertWritableParent(this.parentOf(target))
    if (this.isDir(target) && target.startsWith(src + '/')) {
      throw new VFSError(`cannot move '${src}' into itself`)
    }
    delete this.nodes[src]
    if (node.type === 'dir') {
      // reasignar rutas de descendientes
      const prefix = src === '/' ? '/' : src + '/'
      for (const key of Object.keys(this.nodes)) {
        if (key.startsWith(prefix)) {
          const nn = this.nodes[key]!
          delete this.nodes[key]
          this.nodes[target + key.slice(src.length)] = nn
        }
      }
    }
    node.mtime = Date.now()
    this.nodes[target] = node
  }

  chmod(abs: string, mode: number | null, symbolic: string | null): void {
    const f = this.nodes[abs]
    if (!f) throw new VFSError(`cannot access '${abs}': No such file or directory`)
    if (this.user !== 'root' && f.owner !== this.user) throw new VFSError('changing permissions: Operation not permitted')
    if (mode !== null) {
      f.mode = mode
      return
    }
    const m = symbolic?.match(/^([ugoa]*)([+\-=])([rwx]+)$/)
    if (!m) throw new VFSError(`invalid mode: '${symbolic}'`)
    const who = m[1] === '' ? 'a' : m[1]
    const bits = (m[3].includes('r') ? 4 : 0) | (m[3].includes('w') ? 2 : 0) | (m[3].includes('x') ? 1 : 0)
    const triads: [number, boolean][] = [
      [6, who.includes('u') || who === 'a'],
      [3, who.includes('g') || who === 'a'],
      [0, who.includes('o') || who === 'a'],
    ]
    for (const [shift, applies] of triads) {
      if (!applies) continue
      const cur = (f.mode >> shift) & 7
      let nv: number
      if (m[2] === '+') nv = cur | bits
      else if (m[2] === '-') nv = cur & ~bits
      else nv = bits
      f.mode = (f.mode & ~(7 << shift)) | (nv << shift)
    }
  }

  chown(abs: string, owner: string, group?: string): void {
    const f = this.nodes[abs]
    if (!f) throw new VFSError(`cannot access '${abs}': No such file or directory`)
    if (this.user !== 'root') throw new VFSError('changing ownership: Operation not permitted')
    f.owner = owner.replace(/:.*$/, '') || f.owner
    if (group) f.group = group
    else if (owner.includes(':')) f.group = owner.split(':')[1] || f.group
  }

  /* ------------------------------- presentación ------------------------------- */

  static modeString(type: NodeType, mode: number): string {
    const bit = (v: number, c: string) => (v ? c : '-')
    const o = (mode >> 6) & 7
    const g = (mode >> 3) & 7
    const w = mode & 7
    const tri = (v: number) => bit(v & 4, 'r') + bit(v & 2, 'w') + bit(v & 1, 'x')
    return (type === 'dir' ? 'd' : '-') + tri(o) + tri(g) + tri(w)
  }

  longList(abs: string): string {
    const f = this.nodes[abs]!
    return `${VFS.modeString(f.type, f.mode)} 1 ${f.owner} ${f.group} ${(f.content ?? '').length} ${new Date(f.mtime).toLocaleDateString('es', { day: '2-digit', month: 'short' })} ${this.baseName(abs)}${f.type === 'dir' ? '/' : ''}`
  }

  findNodes(root: string, opts: { nameGlob?: string; type?: 'f' | 'd' }): string[] {
    const out: string[] = []
    const prefix = root === '/' ? '/' : root + '/'
    for (const key of Object.keys(this.nodes).sort()) {
      if (!key.startsWith(prefix) && key !== root) continue
      if (opts.type === 'f' && this.nodes[key]!.type !== 'file') continue
      if (opts.type === 'd' && this.nodes[key]!.type !== 'dir') continue
      out.push(key)
    }
    if (opts.nameGlob) {
      const re = globToRegex(opts.nameGlob)
      return out.filter((k) => re.test(this.baseName(k)))
    }
    return out
  }
}

export function globToRegex(glob: string): RegExp {
  let re = ''
  for (const ch of glob) {
    switch (ch) {
      case '*': re += '[^/]*'; break
      case '?': re += '[^/]'; break
      case '.': re += '\\.'; break
      default:
        re += /[a-zA-Z0-9_\-\/]/.test(ch) ? ch : `\\${ch}`
    }
  }
  return new RegExp('^' + re + '$')
}
