/* Command Builder: constructores didácticos para comandos con muchos flags.
   Solo flags reales y verificados. Sin ejecución: genera + explica + copia. */

export interface BuilderFlag {
  flag: string
  label: string
  desc: string
  on: boolean
}

export interface CommandBuilderDef {
  cmdId: string
  title: string
  base: string
  targetLabel: string
  targetPlaceholder: string
  targetDefault: string
  hint: string
  flags: BuilderFlag[]
}

export const BUILDERS: CommandBuilderDef[] = [
  {
    cmdId: 'rsync',
    title: 'rsync: copia diferencial',
    base: 'rsync',
    targetLabel: 'Origen y destino',
    targetPlaceholder: '~/docs/ /mnt/backup/docs/',
    targetDefault: '~/docs/ /mnt/backup/docs/',
    hint: 'La barra final importa: origen/ copia el CONTENIDO, origen copia LA CARPETA. Ensaya con -n antes de --delete.',
    flags: [
      { flag: '-a', label: 'Recursivo + permisos', desc: 'Archive: recursivo, permisos, tiempos y enlaces. Base de todo.', on: true },
      { flag: '-v', label: 'Verboso', desc: 'Muestra qué copia.', on: true },
      { flag: '-h', label: 'Legible', desc: 'Tamaños en KB/MB.', on: true },
      { flag: '--progress', label: 'Progreso', desc: 'Barra por archivo (archivos grandes).', on: false },
      { flag: '-z', label: 'Compresión', desc: 'Comprime en tránsito (solo compensa en red).', on: false },
      { flag: '-n', label: 'Simulacro', desc: 'Dry-run: muestra lo que haría sin tocar nada.', on: false },
      { flag: '--delete', label: 'Borrar sobrantes', desc: 'Borra en destino lo que ya no existe en origen. Peligroso sin -n previo.', on: false },
    ],
  },
  {
    cmdId: 'tar',
    title: 'tar: empaquetar y comprimir',
    base: 'tar',
    targetLabel: 'Archivo y origen',
    targetPlaceholder: 'backup.tgz ~/docs',
    targetDefault: 'backup.tgz ~/docs',
    hint: '-f necesita el nombre del archivo JUSTO después (va pegado al grupo: -czf). Para extraer cambia -c por -x; para listar, -t.',
    flags: [
      { flag: '-c', label: 'Crear', desc: 'Crea un archivo nuevo (frente a -x extraer, -t listar).', on: true },
      { flag: '-z', label: 'gzip', desc: 'Comprime con gzip (.tgz). Alternativa: -J para xz.', on: true },
      { flag: '-v', label: 'Verboso', desc: 'Lista archivos mientras procesa.', on: false },
      { flag: '-f', label: 'Archivo', desc: 'Usa un ARCHIVO en vez de cinta. Casi siempre necesario.', on: true },
      { flag: '-p', label: 'Preservar permisos', desc: 'Mantiene permisos originales al extraer (como root).', on: false },
      { flag: '--exclude=*.tmp', label: 'Excluir patrón', desc: 'Salta archivos que coincidan.', on: false },
    ],
  },
  {
    cmdId: 'find',
    title: 'find: buscar por criterios',
    base: 'find',
    targetLabel: 'Dónde buscar',
    targetPlaceholder: '/var/log',
    targetDefault: '/var/log',
    hint: 'Estructura: find RUTA CRITERIOS ACCIÓN. Los criterios se combinan con AND implícito; -delete actúa sobre lo filtrado.',
    flags: [
      { flag: '-type f', label: 'Solo archivos', desc: 'Filtra por tipo: f archivo, d directorio, l enlace.', on: true },
      { flag: '-name "*.log"', label: 'Por nombre', desc: 'Patrón glob (usa -iname para ignorar mayúsculas).', on: true },
      { flag: '-mtime +7', label: 'Viejos (+7 días)', desc: 'Modificados hace más de 7 días (-7 = última semana).', on: false },
      { flag: '-size +100M', label: 'Grandes (+100 MB)', desc: 'c bytes, k KB, M MB, G GB. Menos con -:', on: false },
      { flag: '-maxdepth 2', label: 'Profundidad máx. 2', desc: 'No desciende más de 2 niveles.', on: false },
      { flag: '-delete', label: 'Borrar', desc: 'ELIMINA lo encontrado. Primero sin ella para comprobar.', on: false },
    ],
  },
  {
    cmdId: 'curl',
    title: 'curl: peticiones y descargas',
    base: 'curl',
    targetLabel: 'URL',
    targetPlaceholder: 'https://example.com/archivo.zip',
    targetDefault: 'https://example.com/archivo.zip',
    hint: 'Trío de scripts robustos: -sS (silencio con errores) + -L (seguir redirects) + -f (fallar ante 4xx/5xx).',
    flags: [
      { flag: '-sS', label: 'Silencioso + errores', desc: 'Sin barra, pero mostrando errores.', on: true },
      { flag: '-L', label: 'Seguir redirects', desc: 'Imprescindible: casi todo redirige hoy.', on: true },
      { flag: '-f', label: 'Fallar ante error HTTP', desc: 'Exit ≠ 0 con 4xx/5xx en vez de guardar la página de error.', on: false },
      { flag: '-O', label: 'Guardar con nombre remoto', desc: 'Frente a -o nombre para elegirlo tú.', on: false },
      { flag: '-I', label: 'Solo cabeceras', desc: 'Comprueba si vive, qué redirige y qué servidor es.', on: false },
      { flag: '-v', label: 'Verbose TLS+HTTP', desc: 'Depura certificados, redirects y cabeceras.', on: false },
    ],
  },
  {
    cmdId: 'grep',
    title: 'grep: filtrar texto',
    base: 'grep',
    targetLabel: 'Patrón y ruta',
    targetPlaceholder: 'error /var/log',
    targetDefault: 'error /var/log',
    hint: 'Patrón primero, ruta después. Sin -r, grep no entra en directorios.',
    flags: [
      { flag: '-r', label: 'Recursivo', desc: 'Desciende por directorios.', on: true },
      { flag: '-n', label: 'Numerar líneas', desc: 'Muestra el nº de línea de cada coincidencia.', on: true },
      { flag: '-i', label: 'Ignorar mayúsculas', desc: 'error, Error y ERROR valen.', on: false },
      { flag: '-v', label: 'Invertir', desc: 'Muestra las que NO coinciden.', on: false },
      { flag: '-E', label: 'Regex extendida', desc: 'Alternancias con | sin escapar.', on: false },
      { flag: '-l', label: 'Solo nombres', desc: 'Lista archivos con coincidencia, sin líneas.', on: false },
      { flag: '-c', label: 'Contar', desc: 'Número de líneas coincidentes por archivo.', on: false },
    ],
  },
  {
    cmdId: 'ss',
    title: 'ss: sockets y puertos',
    base: 'ss',
    targetLabel: 'Filtro extra (opcional)',
    targetPlaceholder: 'state established',
    targetDefault: '',
    hint: 'El clásico -tulpn responde «¿qué escucha y quién?». Añade state established para ver conexiones vivas.',
    flags: [
      { flag: '-t', label: 'TCP', desc: 'Solo sockets TCP.', on: true },
      { flag: '-u', label: 'UDP', desc: 'Solo sockets UDP.', on: false },
      { flag: '-l', label: 'Listeners', desc: 'Solo los que escuchan.', on: true },
      { flag: '-p', label: 'Proceso', desc: 'Muestra el PID/dueño (necesita permisos).', on: true },
      { flag: '-n', label: 'Numérico', desc: 'Sin resolver nombres: rápido.', on: true },
    ],
  },
]

export const BUILDER_MAP = new Map(BUILDERS.map((b) => [b.cmdId, b]))
