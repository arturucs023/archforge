import type { Distro } from '../../types'

/* --------------------------------- Tipos --------------------------------- */

export type CatId =
  | 'archivos'
  | 'bash-shell'
  | 'pipes-redir'
  | 'busqueda'
  | 'texto'
  | 'permisos'
  | 'usuarios'
  | 'paquetes'
  | 'procesos'
  | 'monitorizacion'
  | 'logs'
  | 'servicios'
  | 'boot'
  | 'diagnostico'
  | 'discos'
  | 'red'
  | 'networkmanager'
  | 'firewall'
  | 'ssh'
  | 'compresion'
  | 'sistema'
  | 'hardware'
  | 'datos'
  | 'cripto'
  | 'tareas'
  | 'mantenimiento'
  | 'desarrollo'
  | 'editores'
  | 'git'
  | 'docker'

export interface CmdExample {
  desc?: string
  lines: string[]
}

export interface CommandEntry {
  id: string
  name: string
  cat: CatId
  distro: Distro[]
  summary: string
  examples: CmdExample[]
  breakdown?: { token: string; meaning: string }[]
  whatHappens?: string
  expected?: string
  verify?: string[]
  errors?: { symptom: string; cause?: string; fix: string }[]
  alternatives?: { name: string; note: string }[]
  intents: string[]
  /** ids de comandos relacionados (chips «Relacionado») */
  related?: string[]
  /** nota de precaución mostrada bajo los ejemplos */
  warnNote?: string
  important?: boolean
}

export interface Category {
  id: CatId
  label: string
}

export const CATS: Category[] = [
  { id: 'archivos', label: 'Archivos y directorios' },
  { id: 'bash-shell', label: '🐚 Bash y shell' },
  { id: 'pipes-redir', label: '🔀 Pipes y redirecciones' },
  { id: 'busqueda', label: '🔎 Búsqueda y localización' },
  { id: 'texto', label: 'Texto' },
  { id: 'permisos', label: 'Permisos' },
  { id: 'usuarios', label: 'Usuarios' },
  { id: 'paquetes', label: 'Paquetes' },
  { id: 'procesos', label: 'Procesos' },
  { id: 'monitorizacion', label: '📊 Monitorización' },
  { id: 'logs', label: '📋 Logs' },
  { id: 'servicios', label: 'Servicios' },
  { id: 'boot', label: '🚀 Arranque y boot' },
  { id: 'diagnostico', label: '🧰 Diagnóstico' },
  { id: 'discos', label: 'Discos' },
  { id: 'red', label: 'Red' },
  { id: 'networkmanager', label: '📡 NetworkManager' },
  { id: 'firewall', label: 'Firewall' },
  { id: 'ssh', label: 'SSH' },
  { id: 'compresion', label: 'Compresión' },
  { id: 'sistema', label: 'Sistema' },
  { id: 'hardware', label: '🖥️ Hardware' },
  { id: 'datos', label: '📦 Datos y utilidades' },
  { id: 'cripto', label: '🔐 Criptografía y hashes' },
  { id: 'tareas', label: '⏰ Tareas programadas' },
  { id: 'mantenimiento', label: '🧹 Mantenimiento' },
  { id: 'desarrollo', label: '🧑‍💻 Desarrollo' },
  { id: 'editores', label: 'Editores' },
  { id: 'git', label: 'Git' },
  { id: 'docker', label: 'Docker' },
]

export const DISTRO_LABEL: Record<Distro, string> = {
  arch: 'Arch',
  debian: 'Debian/Ubuntu',
}

/* ----------------------------- Símbolos del shell ---------------------------- */

export interface ShellSymbol {
  symbol: string
  name: string
  meaning: string
  example: string
  exampleExplain: string
}

export const SYMBOLS: ShellSymbol[] = [
  { symbol: '$', name: 'Prompt de usuario', meaning: 'En documentación indica «ejecuta esto como usuario normal». NO se teclea: es decorativo. El texto copiable real nunca lo incluye.', example: '$ sudo pacman -Syu', exampleExplain: 'Tú tecleas solo: sudo pacman -Syu' },
  { symbol: '#', name: 'Prompt de root o comentario', meaning: 'Doble significado: como prompt significa «estás en una shell root»; dentro de scripts y ficheros de configuración inicia un COMENTARIO que el shell ignora.', example: '# esto no se ejecuta\nls -la', exampleExplain: 'La primera línea se ignora; la segunda lista archivos.' },
  { symbol: '/', name: 'Raíz del sistema', meaning: 'Directorio raíz de TODO el árbol de ficheros. También separador de rutas absolutas.', example: 'cd /etc', exampleExplain: 'Va al directorio /etc desde cualquier lugar (ruta absoluta).' },
  { symbol: '~', name: 'Home del usuario', meaning: 'Atajo a tu directorio personal (/home/tu-usuario). Equivale a $HOME.', example: 'cd ~/Descargas', exampleExplain: 'Va a /home/tu-usuario/Descargas.' },
  { symbol: '.', name: 'Directorio actual', meaning: 'Referencia al directorio donde estás ahora. Crucial en rutas relativas y para ejecutar scripts locales.', example: './script.sh', exampleExplain: 'Ejecuta script.sh del directorio ACTUAL (el ./ es obligatorio: el PATH no lo contiene).' },
  { symbol: '..', name: 'Directorio padre', meaning: 'Sube un nivel en el árbol de directorios.', example: 'cd ../..', exampleExplain: 'Sube dos niveles de golpe.' },
  { symbol: '>', name: 'Redirección de salida (sobrescribe)', meaning: 'Envía la salida estándar a un archivo. Si existe, LO SOBRESCRIBE sin avisar.', example: 'ls -la > lista.txt', exampleExplain: 'Crea/reemplaza lista.txt con el listado.' },
  { symbol: '>>', name: 'Redirección de salida (añade)', meaning: 'Igual que > pero AÑADE al final del archivo en vez de borrarlo.', example: 'echo "nueva línea" >> log.txt', exampleExplain: 'log.txt conserva su contenido y gana una línea.' },
  { symbol: '|', name: 'Pipe (tubería)', meaning: 'Conecta la salida de un comando con la entrada del siguiente: la base de la filosofía UNIX.', example: 'ps aux | grep firefox', exampleExplain: 'Filtra los procesos dejando solo los que contienen «firefox».' },
  { symbol: '||', name: 'OR lógico', meaning: 'Ejecuta el segundo comando SOLO si el primero FALLA (exit code distinto de 0).', example: 'ping -c1 gateway || echo "sin red"', exampleExplain: 'Solo verás el mensaje si el ping falla.' },
  { symbol: '&&', name: 'AND lógico', meaning: 'Ejecuta el segundo comando SOLO si el primero TERMINA BIEN (exit code 0). Encadena pasos seguros.', example: 'sudo pacman -Syu && reboot', exampleExplain: 'Reinicia únicamente si la actualización terminó sin error.' },
  { symbol: '*', name: 'Glob: cualquier cadena', meaning: 'Comodín que coincide con cero o más caracteres cualesquiera.', example: 'rm *.tmp', exampleExplain: 'Borra todos los archivos que acaban en .tmp (¡cuidado!).' },
  { symbol: '?', name: 'Glob: un carácter', meaning: 'Comodín que coincide con EXACTAMENTE un carácter cualquiera.', example: 'ls archivo?.txt', exampleExplain: 'Coincide archivo1.txt, archivoA.txt… pero no archivo10.txt.' },
  { symbol: '[]', name: 'Glob: conjunto de caracteres', meaning: 'Coincide con UNO de los caracteres (o rango) listados entre corchetes.', example: 'ls [abc]*.conf   ·   ls [0-9].png', exampleExplain: 'Empieza por a/b/c, o un dígito único respectivamente.' },
  { symbol: '{}', name: 'Expansión de llaves', meaning: 'Genera combinaciones de cadenas: abrevia rutas repetidas y crea listas.', example: 'mkdir -p proyecto/{src,docs,test}', exampleExplain: 'Crea las tres carpetas de una vez dentro de proyecto/.' },
  { symbol: '-', name: 'Flag corta / stdin', meaning: 'Prefijo de opción corta (ls -l). Solo también representa la entrada/salida estándar.', example: 'cat - archivo.txt', exampleExplain: 'Lee primero de la entrada estándar y luego el archivo.' },
  { symbol: '--', name: 'Fin de opciones', meaning: 'Todo lo que viene después NO se interpreta como opción, aunque empiece por guion. Protege nombres de archivo raros.', example: 'rm -- --archivo-raro', exampleExplain: 'Borra un archivo llamado literalmente «--archivo-raro».' },
]

/* --------------------- Equivalencias Arch ↔ Debian/Ubuntu -------------------- */

export interface EquivRow {
  task: string
  archLines: string[]
  debianLines: string[]
  explain: string
}

export const EQUIVALENCES: EquivRow[] = [
  {
    task: 'Actualizar el sistema completo',
    archLines: ['sudo pacman -Syu'],
    debianLines: ['sudo apt update && sudo apt upgrade'],
    explain: 'Pacman SIEMPRE sincroniza índices e instala todo junto (-Syu): no existen las actualizaciones parciales. apt las separa en dos pasos: update refresca los índices y upgrade aplica versiones nuevas. Olvidar update antes de upgrade instala contra índices viejos.',
  },
  {
    task: 'Instalar un programa',
    archLines: ['sudo pacman -S nombre'],
    debianLines: ['sudo apt install nombre'],
    explain: 'Misma idea, repos distintos. En Arch el paquete puede estar además en AUR (yay/paru); en Debian/Ubuntu revisa variantes (paquete, paquete-dbg…) con apt search.',
  },
  {
    task: 'Buscar un paquete',
    archLines: ['pacman -Ss término'],
    debianLines: ['apt search término'],
    explain: 'Ambos consultan los repositorios remotos configurados. En Arch, -Fy + pacman -F busca incluso ARCHIVOS dentro de paquetes que no tienes instalados.',
  },
  {
    task: 'Eliminar un programa',
    archLines: ['sudo pacman -Rns nombre'],
    debianLines: ['sudo apt remove nombre', 'sudo apt purge nombre'],
    explain: '-Rns borra también dependencias huérfanas (-s) y configs del sistema (-n). En apt, remove deja las configs; purge las elimina. autoremove limpia huérfanos después.',
  },
  {
    task: 'Info de un paquete instalado',
    archLines: ['pacman -Qi nombre'],
    debianLines: ['apt show nombre', 'dpkg -s nombre'],
    explain: 'apt show funciona también con paquetes NO instalados (lee índices). dpkg consulta directamente la base local.',
  },
  {
    task: 'Listar paquetes instalados',
    archLines: ['pacman -Q'],
    debianLines: ['apt list --installed', 'dpkg -l'],
    explain: 'pacman -Qe lista solo los que TÚ instalaste explícitamente; útil para replicar sistemas.',
  },
  {
    task: 'A qué paquete pertenece un archivo',
    archLines: ['pacman -Qo /ruta/archivo'],
    debianLines: ['dpkg -S /ruta/archivo'],
    explain: 'Ambos consultan la base local de archivos. Para archivos de paquetes SIN instalar: pacman -Fy && pacman -F archivo vs apt-file (requiere instalarlo y apt-file update).',
  },
  {
    task: 'Limpiar caché de paquetes',
    archLines: ['paccache -r'],
    debianLines: ['sudo apt clean', 'sudo apt autoclean'],
    explain: 'paccache conserva N versiones por paquete (rollback seguro). apt clean vacía TODO /var/cache/apt/archives; autoclean solo paquetes ya obsoletos.',
  },
  {
    task: 'Huérfanos y limpieza',
    archLines: ['pacman -Qtdq', 'sudo pacman -Rns $(pacman -Qtdq)'],
    debianLines: ['sudo apt autoremove'],
    explain: 'apt integra la limpieza en autoremove; en Arch es manual y deliberado: miras la lista ANTES de borrar.',
  },
]
