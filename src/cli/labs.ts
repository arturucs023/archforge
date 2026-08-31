/* Laboratorios progresivos: cada uno define objetivo, pistas y validador
   que inspecciona el VFS/estado/historial de la sesión simulada. */

import type { ShellSession } from './engine'
import { VFS } from './fs'
import { activePkgs, isPkgInstalled } from './packages'

export interface LabCheck {
  pass: boolean
  detail: string
}

export interface Lab {
  id: string
  num: string
  title: string
  objective: string
  hints: string[]
  validate(session: ShellSession): LabCheck
}

function fileHas(sess: { vfs: VFS }, path: string, includes?: string): boolean {
  const vfs = sess.vfs
  try {
    const c = vfs.readFile(path)
    return includes === undefined ? true : c.includes(includes)
  } catch {
    return false
  }
}

export const LABS: Lab[] = [
  {
    id: 'lab01', num: 'LAB 01', title: 'Navegación básica',
    objective: 'Entra en /home/user/projects y muestra su contenido.',
    hints: ['Usa cd con la ruta completa o ~/projects', 'Después ejecuta ls'],
    validate(s) {
      if (s.vfs.cwd !== '/home/user/projects') return { pass: false, detail: 'cwd debe ser /home/user/projects (ahora: ' + s.vfs.cwd + ')' }
      const ranLs = s.state.history.slice(-3).some((h) => h.trim() === 'ls' || /^ls\b/.test(h.trim()))
      if (!ranLs) return { pass: false, detail: 'ejecuta ls estando dentro' }
      return { pass: true, detail: 'hello.sh y data.txt a la vista' }
    },
  },
  {
    id: 'lab02', num: 'LAB 02', title: 'Crear y organizar archivos',
    objective: 'En tu home crea la carpeta practica, dentro un archivo vacío demo.txt, y copia notes.txt dentro de practica.',
    hints: ['mkdir practica', 'touch practica/demo.txt', 'cp notes.txt practica/'],
    validate(s) {
      const ok1 = s.vfs.isDir('/home/user/practica')
      const ok2 = fileExists(s, '/home/user/practica/demo.txt')
      const ok3 = fileHas(s , '/home/user/practica/notes.txt', 'estudiar bash')
      if (!ok1) return { pass: false, detail: 'falta la carpeta practica/' }
      if (!ok2) return { pass: false, detail: 'falta practica/demo.txt' }
      if (!ok3) return { pass: false, detail: 'practica/notes.txt no contiene el original' }
      return { pass: true, detail: 'estructura perfecta' }
    },
  },
  {
    id: 'lab03', num: 'LAB 03', title: 'Permisos',
    objective: 'Crea run.sh en projects/, dale permisos 755 y compruébalo con ls -l.',
    hints: ['touch projects/run.sh', 'chmod 755 projects/run.sh', 'o bien chmod +x'],
    validate(s) {
      const abs = '/home/user/projects/run.sh'
      if (!fileExists(s, abs)) return { pass: false, detail: 'no existe projects/run.sh' }
      const node = s.vfs.get(abs)!
      if ((node.mode & 0o111) !== 0o111) return { pass: false, detail: `modo actual: ${node.mode.toString(8)} — necesita r-x para todos (755)` }
      const ranL = s.state.history.some((h) => h.includes('ls -l'))
      if (!ranL) return { pass: false, detail: 'verifica con ls -l' }
      return { pass: true, detail: 'rwxr-xr-x correcto' }
    },
  },
  {
    id: 'lab04', num: 'LAB 04', title: 'Buscar archivos',
    objective: 'Encuentra TODOS los archivos .log bajo /var usando find.',
    hints: ['find /var -name "*.log"'],
    validate(s) {
      const ran = s.state.history.some((h) => h.startsWith('find') && h.includes('/var') && h.includes('*.log'))
      if (!ran) return { pass: false, detail: 'ejecuta find /var -name "*.log"' }
      return { pass: true, detail: 'app.log y syslog localizados' }
    },
  },
  {
    id: 'lab05', num: 'LAB 05', title: 'grep',
    objective: 'Muestra las líneas ERROR de /var/log/app.log numeradas e ignora mayúsculas al contar los warning.',
    hints: ['grep -n ERROR /var/log/app.log', 'grep -ci WARNING /var/log/app.log'],
    validate(s) {
      const ranN = s.state.history.some((h) => /grep\s+-\w*n/.test(h) && h.includes('app.log') && h.toUpperCase().includes('ERROR'))
      const ranCi = s.state.history.some((h) => /grep\s+-\w*i/.test(h) && h.toLowerCase().includes('warning'))
      if (!ranN) return { pass: false, detail: 'falta grep -n ERROR …' }
      if (!ranCi) return { pass: false, detail: 'falta el conteo con -i para WARNING/warning' }
      return { pass: true, detail: '3 errores detectados · warnings contados sin mayúsculas' }
    },
  },
  {
    id: 'lab06', num: 'LAB 06', title: 'Pipes',
    objective: 'Obtén cuántas líneas del syslog contienen "sshd" usando pipes.',
    hints: ['cat /var/log/syslog | grep sshd | wc -l', 'mejor aún: grep sshd /var/log/syslog | wc -l'],
    validate(s) {
      const ran = s.state.history.some((h) => h.includes('|') && h.includes('wc') && h.includes('sshd'))
      if (!ran) return { pass: false, detail: 'construye el pipeline hasta wc -l' }
      return { pass: true, detail: 'pipeline compuesto correctamente' }
    },
  },
  {
    id: 'lab07', num: 'LAB 07', title: 'Redirecciones',
    objective: 'Guarda la fecha en fecha.txt (>), añade uptime con >>, y muestra cat < fecha.txt… perdona: cat fecha.txt.',
    hints: ['date > fecha.txt', 'uptime >> fecha.txt', 'comprueba con cat fecha.txt'],
    validate(s) {
      const okFile = fileHas(s, '/home/user/fecha.txt')
      if (!okFile) return { pass: false, detail: 'no existe fecha.txt en tu home' }
      const usedAppend = s.state.history.some((h) => />>/.test(h))
      if (!usedAppend) return { pass: false, detail: 'añade una segunda línea con >>' }
      return { pass: true, detail: 'dos líneas escritas vía > y >>' }
    },
  },
  {
    id: 'lab08', num: 'LAB 08', title: 'sed',
    objective: 'En projects/data.txt sustituye bob por robert mostrando el resultado; luego hazlo permanente con backup .bak.',
    hints: ["sed 's/bob/robert/' projects/data.txt", "sed -i.bak 's/bob/robert/g' projects/data.txt"],
    validate(s) {
      const orig = '/home/user/projects/data.txt'
      if (!fileHas(s, orig, 'robert')) return { pass: false, detail: 'data.txt sigue conteniendo bob (usa -i)' }
      if (!s.vfs.exists(orig + '.bak')) return { pass: false, detail: 'falta el backup data.txt.bak' }
      return { pass: true, detail: 'sustitución in-place con red de seguridad' }
    },
  },
  {
    id: 'lab09', num: 'LAB 09', title: 'awk',
    objective: 'Con awk imprime los nombres (columna nombre) de notas con nota ≥ 78 desde projects/data.txt.',
    hints: ["awk '$3 >= 78 {print $2}' projects/data.txt", 'recuerda que la cabecera también pasa el filtro: NR>1 ayuda'],
    validate(s) {
      const ran = s.state.history.some((h) => h.includes('awk') && h.includes('data.txt') && /[><]=?\s*7?8|==\s*90|>=\s*78/.test(h))
      if (!ran) return { pass: false, detail: 'necesitamos awk con condición sobre la nota' }
      return { pass: true, detail: 'ana (90) y carol (78) filtradas' }
    },
  },
  {
    id: 'lab10', num: 'LAB 10', title: 'Variables Bash',
    objective: 'Declara CURSO=Bash y muestra «Estoy en el curso de $CURSO» expandido.',
    hints: ['CURSO=Bash   (sin espacios)', 'echo "Estoy en el curso de $CURSO"'],
    validate(s) {
      const assigned = s.state.history.find((h) => /^CURSO=/.test(h.trim()))
      const echoed = s.state.history.some((h) => h.includes('$CURSO'))
      if (!assigned) return { pass: false, detail: 'declara CURSO=Bash' }
      if (!echoed) return { pass: false, detail: 'haz echo con $CURSO entre comillas dobles' }
      return { pass: true, detail: 'variable asignada y expandida' }
    },
  },
  {
    id: 'lab11', num: 'LAB 11', title: 'Condicionales',
    objective: 'Ejecuta una línea if que compare [ 10 -gt 5 ] e imprima «mayor».',
    hints: ['if [ 10 -gt 5 ]; then echo mayor; fi'],
    validate(s) {
      const ran = s.state.history.some((h) => h.includes('-gt') && h.includes('then') && h.includes('fi'))
      if (!ran) return { pass: false, detail: 'estructura if/then/fi con -gt' }
      return { pass: true, detail: 'condicional evaluado' }
    },
  },
  {
    id: 'lab12', num: 'LAB 12', title: 'Bucles',
    objective: 'Crea tres carpetas semana{1..3} con un solo mkdir y verifica con ls.',
    hints: ['brace expansion: mkdir -p curso/semana{1..3}', 'ls curso'],
    validate(s) {
      for (const n of ['1', '2', '3']) {
        if (!s.vfs.isDir(`/home/user/curso/semana${n}`)) return { pass: false, detail: `falta curso/semana${n}` }
      }
      return { pass: true, detail: 'tres semanas creadas de una vez' }
    },
  },
  {
    id: 'lab13', num: 'LAB 13', title: 'Scripts',
    objective: 'Crea scripts/hola.sh con echo "Hola ArchForge", dale +x y ejecútalo con ./hola.sh desde scripts/.',
    hints: ['edit scripts/hola.sh (abre el editor integrado)', 'chmod +x scripts/hola.sh', 'cd scripts && ./hola.sh'],
    validate(s) {
      const abs = '/home/user/scripts/hola.sh'
      if (!fileHas(s, abs, 'Hola ArchForge')) return { pass: false, detail: 'el script no existe o no contiene el echo' }
      const node = s.vfs.get(abs)!
      if (!(node.mode & 0o100)) return { pass: false, detail: 'sin permiso de ejecución (chmod +x)' }
      const ran = s.state.history.some((h) => /\.\/?hola\.sh|bash hola\.sh/.test(h))
      if (!ran) return { pass: false, detail: 'ejecuta ./hola.sh' }
      return { pass: true, detail: 'script creado, permisionado y ejecutado' }
    },
  },
  {
    id: 'lab14', num: 'LAB 14', title: 'Análisis de logs',
    objective: 'Genera un informe: total de ERROR en app.log y las 2 IPs más repetidas de accesos.log (créalo si falta).',
    hints: ['grep -c ERROR /var/log/app.log', 'printf con IPs repetidas → sort | uniq -c | sort -rn | head -2'],
    validate(s) {
      const ranCount = s.state.history.some((h) => h.includes('ERROR') && h.includes('app.log'))
      const ranTop = s.state.history.some((h) => h.includes('uniq') && h.includes('sort'))
      if (!ranCount || !ranTop) return { pass: false, detail: 'faltan el conteo o el ranking de IPs' }
      return { pass: true, detail: 'informe generado con grep+sort+uniq' }
    },
  },
  {
    id: 'lab15', num: 'LAB 15', title: 'Backup',
    objective: 'Empaqueta Documents en backups/docs-$(date +%F).tar.gz (crea backups/) y comprueba el tamaño con du -h.',
    hints: ['mkdir -p backups', 'tar -czf "backups/docs-$(date +%F).tar.gz" Documents', 'du -h backups/*.tar.gz'],
    validate(s) {
      const anyTar = [...vfsPaths(s)].some((p) => p.startsWith('/home/user/backups/') && p.endsWith('.tar.gz'))
      if (!anyTar) return { pass: false, detail: 'no hay ningún .tar.gz en backups/' }
      const ranDu = s.state.history.some((h) => h.includes('du -h'))
      if (!ranDu) return { pass: false, detail: 'comprueba el tamaño con du -h' }
      return { pass: true, detail: 'backup creado y medido' }
    },
  },
  {
    id: 'lab16-pkg-install-git',
    num: 'LAB 16', title: 'Instalar Git (apt o pacman)',
    objective: 'Deja git instalado en tu distribución. Ubuntu: sudo apt install git · Arch: sudo pacman -S git.',
    hints: [
      'Ubuntu: sudo apt install git',
      'Arch: sudo pacman -S git',
      'Cualquier procedimiento válido vale: el validador mira el estado final, no el comando exacto',
    ],
    validate(s) {
      if (!isPkgInstalled(s.state.pkgs, s.distro, 'git')) {
        return { pass: false, detail: 'git no aparece como instalado en ' + (s.distro === 'arch' ? 'Arch' : 'Ubuntu/Debian') }
      }
      return { pass: true, detail: 'git instalado correctamente' }
    },
  },
  {
    id: 'lab17-pkg-nginx-ciclo',
    num: 'LAB 17', title: 'Instalar y eliminar nginx',
    objective: 'Instala nginx, comprueba que está con list --installed / pacman -Q, y elimínalo al final.',
    hints: [
      'Ubuntu: sudo apt install nginx · luego sudo apt remove nginx',
      'Arch: sudo pacman -S nginx · luego sudo pacman -R nginx',
    ],
    validate(s) {
      const ranInstall = s.state.history.some((h) => /(install|pacman -S\b)/.test(h) && h.includes('nginx'))
      const nowInstalled = isPkgInstalled(s.state.pkgs, s.distro, 'nginx')
      if (!ranInstall) return { pass: false, detail: 'primero instala nginx' }
      if (nowInstalled) return { pass: false, detail: 'nginx sigue instalado: elimínalo para completar el ciclo' }
      return { pass: true, detail: 'ciclo completo instalar→eliminar verificado' }
    },
  },
  {
    id: 'lab18-pkg-search',
    num: 'LAB 18', title: 'Buscar un paquete',
    objective: 'Busca un paquete cuyo nombre o descripción contenga «server» (Ubuntu: apt search server · Arch: pacman -Ss server).',
    hints: ['apt search server', 'pacman -Ss server'],
    validate(s) {
      const ran = s.state.history.some((h) => (h.includes('apt search') || h.includes('pacman -Ss')) && /server/i.test(h))
      if (!ran) return { pass: false, detail: 'ejecuta la búsqueda con «server»' }
      return { pass: true, detail: 'búsqueda realizada en los repositorios virtuales' }
    },
  },
  {
    id: 'lab19-pkg-info',
    num: 'LAB 19', title: 'Consultar información de un paquete',
    objective: 'Muestra la ficha completa del paquete curl (Ubuntu: apt show curl · Arch: pacman -Si curl).',
    hints: ['apt show curl', 'pacman -Si curl'],
    validate(s) {
      const ran = s.state.history.some((h) => ((h.includes('apt show') || h.includes('pacman -Si')) && h.includes('curl')))
      if (!ran) return { pass: false, detail: 'ejecuta apt show curl o pacman -Si curl' }
      return { pass: true, detail: 'ficha consultada (versión, tamaño y dependencias)' }
    },
  },
  {
    id: 'lab20-pkg-update',
    num: 'LAB 20', title: 'Actualizar índices y sistema',
    objective: 'Refresca los índices de los repositorios: Ubuntu sudo apt update · Arch sudo pacman -Sy.',
    hints: ['sudo apt update', 'sudo pacman -Sy'],
    validate(s) {
      const st = activePkgs(s.state.pkgs, s.distro)
      if (!st.updated) return { pass: false, detail: 'los índices siguen sin refrescar en esta distribución' }
      return { pass: true, detail: 'índices sincronizados con los repositorios virtuales' }
    },
  },

  {
    id: 'lab-final', num: 'FINAL', title: 'Linux System Administration',
    objective: 'Reto combinado: carpeta admin/ con informe.txt que contenga kernel (uname -r), usuarios de /etc/passwd (cut) y errores de app.log; además crea admin/restart.sh ejecutable con echo "reiniciando…" y chmod +x.',
    hints: [
      'uname -r > admin/informe.txt',
      'cut -d: -f1 /etc/passwd >> admin/informe.txt',
      'grep ERROR /var/log/app.log >> admin/informe.txt',
      'edit admin/restart.sh → chmod +x → ejecútalo',
    ],
    validate(s) {
      const report = '/home/user/admin/informe.txt'
      if (!fileHas(s, report)) return { pass: false, detail: 'falta admin/informe.txt' }
      let content = ''
      try { content = s.vfs.readFile(report) } catch { /* noop */ }
      const hasKernel = /Linux\s+\d+\.\d+|\d+\.\d+\.\d+-arch/.test(content)
      const hasUsers = content.includes('user') && content.includes('root')
      const hasErrors = content.includes('ERROR')
      if (!hasKernel) return { pass: false, detail: 'falta la línea del kernel (uname -r)' }
      if (!hasUsers) return { pass: false, detail: 'faltan los usuarios de passwd' }
      if (!hasErrors) return { pass: false, detail: 'faltan los ERROR del log' }
      const sh = '/home/user/admin/restart.sh'
      if (!fileHas(s, sh, 'reiniciando')) return { pass: false, detail: 'falta admin/restart.sh con su echo' }
      const node = s.vfs.get(sh)!
      if (!(node.mode & 0o100)) return { pass: false, detail: 'restart.sh necesita chmod +x' }
      return { pass: true, detail: '¡Administración de sistema completada!' }
    },
  },
]

function fileExists(s: ShellSession, abs: string): boolean {
  try { s.vfs.readFile(abs); return true } catch { return false }
}

function vfsPaths(s: ShellSession): string[] {
  // acceso de solo lectura a claves internas vía serialización ligera
  const ser = s.serialize()
  return Object.keys(ser.vfs.nodes)
}
