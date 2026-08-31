import type { CommandEntry } from './meta'

/* Ampliación de categorías EXISTENTES con comandos útiles adicionales. */

export const MORE_COMMANDS: CommandEntry[] = [
  /* -------------------------------- archivos + -------------------------------- */
  {
    id: 'ln', name: 'ln', cat: 'archivos', distro: ['arch', 'debian'], important: true,
    summary: 'Crea enlaces: -s simbólicos (atajos reales) o hard links.',
    examples: [
      { desc: 'enlace simbólico típico de versión', lines: ['ln -s /opt/app-2.1 /opt/app'] },
      { desc: 'hard link (mismo inode)', lines: ['ln original.txt copia-dura.txt'] },
    ],
    breakdown: [
      { token: '-s', meaning: 'symbolic: apunta a una RUTA (puede romperse si mueven el destino)' },
      { token: 'sin -s', meaning: 'hard link: segundo nombre para el MISMO contenido; sobrevive al borrado del primero' },
    ],
    related: ['readlink'],
    intents: ['crear enlace simbólico', 'atajo a carpeta', 'hard link'],
  },
  { id: 'readlink', name: 'readlink', cat: 'archivos', distro: ['arch', 'debian'], summary: 'Resuelve a dónde apunta un enlace simbólico (-f da ruta absoluta real).', examples: [{ lines: ['readlink -f /opt/app'] }], intents: ['destino de symlink', 'ruta real archivo'], related: ['ln'] },
  { id: 'basename', name: 'basename', cat: 'archivos', distro: ['arch', 'debian'], summary: 'Nombre final de una ruta sin directorios ni extensión si se pide.', examples: [{ lines: ['basename /etc/nginx/nginx.conf .conf'] }], intents: ['nombre sin ruta', 'quitar extension'] },
  { id: 'dirname', name: 'dirname', cat: 'archivos', distro: ['arch', 'debian'], summary: 'Parte directora de una ruta (la carpeta contenedora).', examples: [{ lines: ['dirname /etc/nginx/nginx.conf'] }], intents: ['carpeta contenedora'] },

  /* --------------------------------- texto + --------------------------------- */
  { id: 'paste', name: 'paste', cat: 'texto', distro: ['arch', 'debian'], summary: 'Une líneas de varios archivos lado a lado (por columnas).', examples: [{ lines: ['paste nombres.txt apellidos.txt'] }], intents: ['unir archivos por lineas'] },
  { id: 'join', name: 'join', cat: 'texto', distro: ['arch', 'debian'], summary: 'Combina dos archivos ordenados por un campo común (tipo SQL JOIN).', examples: [{ lines: ['join -1 1 -2 1 usuarios.txt pedidos.txt'] }], intents: ['cruzar dos ficheros'] },
  { id: 'rev', name: 'rev', cat: 'texto', distro: ['arch', 'debian'], summary: 'Invierte los caracteres de cada línea.', examples: [{ lines: ['echo "hola" | rev'] }], intents: ['invertir texto'] },

  /* ---------------------------------- red + ---------------------------------- */
  { id: 'host', name: 'host', cat: 'red', distro: ['arch', 'debian'], summary: 'Consulta DNS minimalista (bind): host dominio [servidor].', examples: [{ lines: ['host archlinux.org'] }], intents: ['resolver dominio rapido'] },
  { id: 'mtr', name: 'mtr', cat: 'red', distro: ['arch', 'debian'], summary: 'traceroute + ping en vivo: diagnóstico de ruta interactivo.', examples: [{ lines: ['mtr -rw archlinux.org'] }], intents: ['diagnosticar perdida paquetes'] },

  /* ------------------------------- procesos + ------------------------------- */
  { id: 'nohup', name: 'nohup', cat: 'procesos', distro: ['arch', 'debian'], summary: 'Ejecuta inmune a colgaduras: sigue vivo aunque cierres la terminal (salida a nohup.out).', examples: [{ lines: ['nohup ./servidor.sh &'] }], intents: ['proceso sobreviva cierre terminal'], related: ['op-amp'] },
  { id: 'timeout', name: 'timeout', cat: 'procesos', distro: ['arch', 'debian'], important: true, summary: 'Limita la duración de un comando y lo mata al agotarse.', examples: [{ lines: ['timeout 10s ping archlinux.org', 'timeout -k 5 30 backup.sh'] }], intents: ['limitar tiempo comando', 'matar tras x segundos'] },

  /* -------------------------------- sistema + -------------------------------- */
  { id: 'timedatectl', name: 'timedatectl', cat: 'sistema', distro: ['arch', 'debian'], summary: 'systemd: hora, zona horaria y NTP en un comando.', examples: [{ lines: ['timedatectl status', 'sudo timedatectl set-timezone Europe/Madrid'] }], intents: ['cambiar zona horaria', 'activar ntp'] },

  /* -------------------------------- discos + -------------------------------- */
  {
    id: 'dd', name: 'dd', cat: 'discos', distro: ['arch', 'debian'], important: true,
    summary: 'Copia cruda byte a byte entre archivos/dispositivos. POTENTE Y PELIGROSO.',
    examples: [
      { desc: 'grabar ISO a USB (¡of= es el DESTINO!)', lines: ['sudo dd if=archlinux.iso of=/dev/sdX bs=4M status=progress conv=fsync'] },
    ],
    warnNote: 'of=/dev/sda equivocado DESTRUYE ese disco sin preguntar. Verifica el dispositivo con lsblk dos veces antes de pulsar Enter.',
    intents: ['grabar iso usb', 'clonar disco crudo'],
  },

  /* ----------------------------------- ssh + ----------------------------------- */
  { id: 'sshfs', name: 'sshfs', cat: 'ssh', distro: ['arch', 'debian'], summary: 'Monta un directorio remoto por SSH como carpeta local.', examples: [{ lines: ['sshfs usuario@servidor:/remoto ~/remoto -o reconnect'] }], intents: ['montar carpeta remota ssh'] },

  /* ------------------------------ compresión + ------------------------------ */
  { id: 'zstd', name: 'zstd', cat: 'compresion', distro: ['arch', 'debian'], summary: 'Compresión moderna Zstandard: rápida como gzip, ratio cercano a xz.', examples: [{ lines: ['zstd -19 archivo.tar', 'zstd -d archivo.tar.zst'] }], intents: ['compresion zstd'] },

  /* ---------------- búsqueda y bash que faltaban ---------------- */
  {
    id: 'which', name: 'which', cat: 'busqueda', distro: ['arch', 'debian'], important: true,
    summary: 'Localiza el binario de un comando buscando en PATH; exit 1 si no existe.',
    examples: [{ lines: ['which gcc', 'which python3 && python3 --version'] }],
    breakdown: [
      { token: 'gcc', meaning: 'nombre del comando a buscar en $PATH' },
      { token: '(sin output)', meaning: 'si no imprime nada, el comando no está instalado o no está en PATH' },
    ],
    intents: ['dónde está el comando', 'localizar binario', 'comprobar si está instalado'],
    related: ['command', 'whereis'],
  },

  /* ---------------- bash/shell que faltaban ---------------- */
  {
    id: 'history', name: 'history', cat: 'bash-shell', distro: ['arch', 'debian'],
    summary: 'Muestra el historial de comandos de la sesión; !N re-ejecuta el comando N.',
    examples: [{ lines: ['history | tail -10', '!42   # re-ejecuta el comando número 42'] }],
    intents: ['ver historial', 'comandos anteriores', 'repetir comando'],
  },
  {
    id: 'unset', name: 'unset', cat: 'bash-shell', distro: ['arch', 'debian'],
    summary: 'Elimina una variable o función del shell actual.',
    examples: [{ lines: ['unset TEMP_TOKEN'] }],
    intents: ['borrar variable', 'eliminar variable entorno'],
  },
  {
    id: 'env', name: 'env', cat: 'bash-shell', distro: ['arch', 'debian'], important: true,
    summary: 'Lista las variables de entorno actuales o ejecuta con entorno modificado.',
    examples: [{ lines: ['env | sort | head', 'EDITOR=vim env | grep EDITOR'] }],
    intents: ['ver variables entorno', 'listar entorno'],
  },
  {
    id: 'printenv', name: 'printenv', cat: 'bash-shell', distro: ['arch', 'debian'],
    summary: 'Imprime el valor de una variable de entorno concreta.',
    examples: [{ lines: ['printenv HOME', 'printenv PATH'] }],
    intents: ['valor variable entorno'],
  },
  {
    id: 'read', name: 'read', cat: 'bash-shell', distro: ['arch', 'debian'], important: true,
    summary: 'Lee una línea de stdin y la asigna a variables; base de scripts interactivos.',
    examples: [
      { desc: 'pregunta al usuario', lines: ['read -p "¿Tu nombre? " NOMBRE', 'echo "Hola, $NOMBRE"'] },
      { desc: 'contraseña sin eco', lines: ['read -rs -p "Contraseña: " PASS'] },
      { desc: 'leer archivo línea a línea', lines: ['while IFS= read -r linea; do echo "$linea"; done < fichero.txt'] },
    ],
    breakdown: [
      { token: '-p "texto"', meaning: 'muestra un prompt antes de leer' },
      { token: '-r', meaning: 'raw: respeta backslashes (SIEMPRE)' },
      { token: '-s', meaning: 'silent: no muestra lo tecleado (contraseñas)' },
      { token: 'IFS=', meaning: 'conserva espacios iniciales/finales en while-read' },
    ],
    intents: ['pedir datos usuario', 'input interactivo', 'leer entrada teclado'],
  },
  {
    id: 'command', name: 'command', cat: 'bash-shell', distro: ['arch', 'debian'],
    summary: 'Ejecuta un comando evitando funciones/alias; -v revela dónde está.',
    examples: [{ lines: ['command -v ls', 'command ls   # fuerza el binario, no tu alias'] }],
    intents: ['evitar alias', 'ejecutar binario directo'],
  },
  {
    id: 'realpath', name: 'realpath', cat: 'archivos', distro: ['arch', 'debian'],
    summary: 'Resuelve una ruta a su forma absoluta real (siguiendo symlinks).',
    examples: [{ lines: ['realpath ~/enlace-simbolico'] }],
    intents: ['ruta absoluta real', 'resolver symlink ruta'],
  },
]
