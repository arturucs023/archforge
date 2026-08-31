import type { CommandEntry } from './meta'

/* Comandos de las categorías NUEVAS (iteración de ampliación).
   Cada entrada mantiene el mismo contrato que el resto de la cheatsheet. */

export const EXTRA_COMMANDS: CommandEntry[] = [
  /* ============================== BASH Y SHELL ============================== */
  {
    id: 'export', name: 'export', cat: 'bash-shell', distro: ['arch', 'debian'], important: true,
    summary: 'Marca una variable como entorno para que la hereden los procesos hijos.',
    examples: [{ lines: ['export EDITOR=vim', 'export PATH="$PATH:$HOME/.local/bin"'] }],
    intents: ['variable de entorno', 'exportar variable', 'compartir variable con programas'],
  },
  {
    id: 'source', name: 'source', cat: 'bash-shell', distro: ['arch', 'debian'],
    summary: 'Ejecuta un script EN la shell actual (sin subshell): sus variables y funciones quedan aquí.',
    examples: [{ desc: 'recargar la configuración tras editarla', lines: ['source ~/.bashrc', '. ~/.bashrc   # equivalente POSIX'] }],
    whatHappens: 'A diferencia de ./script (proceso hijo), source lee las líneas con el propio intérprete: cd, variables y funciones persisten en tu sesión.',
    intents: ['aplicar cambios bashrc', 'recargar configuración', 'ejecutar script en mi shell'],
  },
  {
    id: 'alias', name: 'alias', cat: 'bash-shell', distro: ['arch', 'debian'],
    summary: 'Crea atajos de comando para tu sesión; sin argumentos lista los existentes.',
    examples: [
      { lines: ['alias ll="ls -lahF"', 'alias update="sudo pacman -Syu"'] },
      { desc: 'hacer permanente: añádelo a ~/.bashrc', lines: ['echo \'alias update="sudo pacman -Syu"\' >> ~/.bashrc'] },
    ],
    intents: ['crear atajo de comando', 'alias permanente', 'abreviar comandos'],
  },
  { id: 'unalias', name: 'unalias', cat: 'bash-shell', distro: ['arch', 'debian'], summary: 'Elimina un alias definido.', examples: [{ lines: ['unalias ll', 'unalias -a   # todos'] }], intents: ['borrar alias'] },
  {
    id: 'set', name: 'set', cat: 'bash-shell', distro: ['arch', 'debian'],
    summary: 'Configura opciones del shell; el trío -euo pipefail es la base de todo script robusto.',
    important: true,
    breakdown: [
      { token: '-e', meaning: 'errexit: aborta el script si cualquier comando falla' },
      { token: '-u', meaning: 'nounset: error al usar variables SIN definir' },
      { token: '-o pipefail', meaning: 'un pipeline falla si falla CUALQUIER etapa, no solo la última' },
    ],
    examples: [{ desc: 'cabecera estándar de script serio', lines: ['set -euo pipefail'] }],
    intents: ['script robusto', 'modo estricto bash', 'abortar ante errores'],
  },
  {
    id: 'trap', name: 'trap', cat: 'bash-shell', distro: ['arch', 'debian'], important: true,
    summary: 'Ejecuta código cuando el script recibe una señal o termina: limpieza garantizada.',
    examples: [{ desc: 'borrar temporales pase lo que pase', lines: ["TMP=$(mktemp -d)", "trap 'rm -rf \"$TMP\"' EXIT INT TERM"] }],
    intents: ['limpieza automática script', 'borrar temporal al salir', 'capturar ctrl+c'],
  },
  {
    id: 'jobs', name: 'jobs', cat: 'bash-shell', distro: ['arch', 'debian'],
    summary: 'Lista los trabajos lanzados desde esta sesión (& o suspendidos con Ctrl+Z).',
    examples: [{ lines: ['sleep 300 &', 'jobs'] }],
    intents: ['ver trabajos en segundo plano', 'tareas de esta terminal'],
  },
  { id: 'fg', name: 'fg', cat: 'bash-shell', distro: ['arch', 'debian'], summary: 'Trae un trabajo del fondo al primer plano (fg %1).', examples: [{ lines: ['sleep 60 &', 'fg %1'] }], intents: ['traer proceso al frente', 'recuperar tarea suspendida'] },
  { id: 'bg', name: 'bg', cat: 'bash-shell', distro: ['arch', 'debian'], summary: 'Reanuda en segundo plano un trabajo detenido con Ctrl+Z.', examples: [{ lines: ['# Ctrl+Z sobre un proceso', 'bg %1'] }], intents: ['continuar en segundo plano'] },
  {
    id: 'wait', name: 'wait', cat: 'bash-shell', distro: ['arch', 'debian'],
    summary: 'Espera a que terminen los procesos hijos (o uno concreto) y hereda su exit code.',
    examples: [{ desc: 'paralelismo mínimo', lines: ['tarea1 & P1=$!', 'tarea2 & P2=$!', 'wait "$P1" "$P2"', 'echo "ambas terminaron: $?"'] }],
    intents: ['esperar procesos hijos', 'sincronizar paralelismo'],
  },
  { id: 'shopt', name: 'shopt', cat: 'bash-shell', distro: ['arch', 'debian'], summary: 'Activa/desactiva comportamientos extra de Bash (globstar, autocd, nullglob…).', examples: [{ lines: ['shopt -s globstar', 'ls **/*.ts'] }], intents: ['opciones avanzadas bash', 'globs recursivos'] },
  {
    id: 'type-cmd', name: 'type', cat: 'bash-shell', distro: ['arch', 'debian'], important: true,
    summary: 'Revela cómo el shell resolverá un nombre: builtin, alias, función o ruta de binario.',
    examples: [{ lines: ['type ls', 'type cd', 'type grep'] }],
    breakdown: [
      { token: 'type ls', meaning: 'indica que ls es un binario en /usr/bin/ls' },
      { token: 'type cd', meaning: 'indica que cd es un BUILTIN del shell' },
    ],
    intents: ['qué tipo de comando es', 'distinguir builtin binario'],
  },
  { id: 'hash', name: 'hash', cat: 'bash-shell', distro: ['arch', 'debian'], summary: 'Muestra/limpia la caché de rutas de ejecutables del shell.', examples: [{ lines: ['hash', 'hash -r   # tras instalar un binario nuevo'] }], intents: ['cache rutas comandos', 'comando no encontrado tras instalar'],
    related: ['command'] },
  { id: 'pushd', name: 'pushd', cat: 'bash-shell', distro: ['arch', 'debian'], summary: 'Cambia de directorio apilando el anterior (popd vuelve).', examples: [{ lines: ['pushd /var/log', 'popd'] }], intents: ['pila de directorios', 'volver atrás fácil'] },
  { id: 'popd', name: 'popd', cat: 'bash-shell', distro: ['arch', 'debian'], summary: 'Desapila y vuelve al último directorio guardado por pushd.', examples: [{ lines: ['popd'] }], intents: ['volver al directorio anterior'] },

  /* =========================== PIPES Y REDIRECCIONES =========================== */
  {
    id: 'pipe-op', name: '|', cat: 'pipes-redir', distro: ['arch', 'debian'], important: true,
    summary: 'Conecta la salida del comando izquierdo con la entrada del derecho: la base de UNIX.',
    examples: [{ lines: ['cat app.log | grep ERROR | wc -l'] }],
    breakdown: [
      { token: 'cat app.log', meaning: 'produce líneas en stdout' },
      { token: '|', meaning: 'stdout → stdin del siguiente (en paralelo real)' },
      { token: 'grep ERROR', meaning: 'filtra dejando solo coincidencias' },
    ],
    related: ['tee', 'grep'],
    intents: ['conectar comandos', 'pipeline', 'tubería'],
  },
  {
    id: 'redir-gt', name: '>', cat: 'pipes-redir', distro: ['arch', 'debian'], important: true,
    summary: 'Redirige stdout a un archivo SOBRESCRIBIÉNDOLO.',
    examples: [{ lines: ['ls -la > inventario.txt'] }],
    errors: [{ symptom: 'Perdí el contenido anterior', fix: '> trunca por diseño; usa >> para añadir.' }],
    related: ['redir-gtgt', 'cat'],
    intents: ['guardar salida a archivo', 'sobrescribir fichero con salida'],
  },
  {
    id: 'redir-gtgt', name: '>>', cat: 'pipes-redir', distro: ['arch', 'debian'], important: true,
    summary: 'Redirige stdout AÑADIENDO al final del archivo.',
    examples: [{ lines: ['echo "$(date -Is) evento" >> eventos.log'] }],
    intents: ['añadir salida a log', 'append archivo'],
  },
  {
    id: 'redir-lt', name: '<', cat: 'pipes-redir', distro: ['arch', 'debian'],
    summary: 'Inyecta un archivo como stdin del comando.',
    examples: [{ lines: ['wc -l < notas.txt', 'mysql < volcado.sql'] }],
    intents: ['pasar archivo como entrada'],
  },
  {
    id: 'redir-2gt', name: '2>', cat: 'pipes-redir', distro: ['arch', 'debian'], important: true,
    summary: 'Redirige STDERR (los errores) a un archivo, dejando stdout limpio.',
    examples: [{ lines: ['find / -name "*.conf" 2>/dev/null'] }],
    breakdown: [
      { token: '2>', meaning: 'fd 2 (errores) → destino' },
      { token: '/dev/null', meaning: 'agujero negro: descarta los errores' },
      { token: '2>&1', meaning: 'variante: duplica errores hacia donde apunte stdout' },
    ],
    intents: ['silenciar errores', 'guardar errores aparte', 'separar salida y errores'],
  },
  {
    id: 'op-andand', name: '&&', cat: 'pipes-redir', distro: ['arch', 'debian'], important: true,
    summary: 'Ejecuta el segundo comando SOLO si el primero terminó bien (exit 0).',
    examples: [{ lines: ['sudo pacman -Syu && echo "sistema actualizado"'] }],
    intents: ['encadenar si éxito', 'ejecutar condicionalmente'],
  },
  {
    id: 'op-oror', name: '||', cat: 'pipes-redir', distro: ['arch', 'debian'], important: true,
    summary: 'Ejecuta el segundo comando SOLO si el primero FALLÓ.',
    examples: [{ lines:['ping -c1 gateway || echo "sin conexión con el router"'] }],
    intents: ['fallback ante fallo', 'plan b comando'],
  },
  {
    id: 'op-semi', name: ';', cat: 'pipes-redir', distro: ['arch', 'debian'],
    summary: 'Ejecuta varios comandos en orden, importe el resultado de cada uno.',
    examples: [{ lines: ['pwd; whoami; date'] }],
    intents: ['varios comandos seguidos'],
  },
  {
    id: 'op-amp', name: '&', cat: 'pipes-redir', distro: ['arch', 'debian'],
    summary: 'Lanza el comando en SEGUNDO PLANO y devuelve el prompt ($! guarda su PID).',
    examples: [{ lines: ['sleep 300 &', 'echo "lanzado con PID $!"'] }],
    related: ['jobs', 'wait'],
    intents: ['segundo plano', 'no bloquear terminal'],
  },
  {
    id: 'tee', name: 'tee', cat: 'pipes-redir', distro: ['arch', 'debian'], important: true,
    summary: 'Divide el flujo: muestra por pantalla Y guarda en archivo a la vez (como una T).',
    examples: [
      { desc: 'ver el build y guardarlo', lines: ['make build 2>&1 | tee build.log'] },
      { desc: 'escribir en fichero protegido sin abrir editor root', lines: ['echo "nueva línea" | sudo tee -a /etc/fichero.conf'] },
    ],
    breakdown: [
      { token: '| tee f.log', meaning: 'stdout → pantalla Y → f.log' },
      { token: '-a', meaning: 'append en vez de truncar' },
      { token: 'sudo tee -a', meaning: 'truco clásico para escribir archivos de root desde usuario' },
    ],
    intents: ['guardar y ver a la vez', 'escribir archivo root sin editor', 'dividir flujo'],
  },
  {
    id: 'xargs', name: 'xargs', cat: 'pipes-redir', distro: ['arch', 'debian'], important: true,
    summary: 'Convierte stdin en ARGUMENTOS del comando siguiente (los pipes pasan datos, xargs pasa nombres).',
    examples: [
      { desc: 'borrar los .tmp listados por find', lines: ['find . -name "*.tmp" | xargs rm -f'] },
      { desc: 'con espacios seguros y lotes', lines: ['cat urls.txt | xargs -n1 -P4 curl -sO'] },
    ],
    breakdown: [
      { token: '-n1', meaning: 'un argumento por invocación' },
      { token: '-P4', meaning: 'hasta 4 procesos en paralelo' },
      { token: '-I{}', meaning: 'sustituye {} por cada línea leída' },
    ],
    intents: ['pasar lista como argumentos', 'ejecutar sobre muchos archivos'],
  },

  /* ========================= BÚSQUEDA Y LOCALIZACIÓN ========================= */
  {
    id: 'whereis', name: 'whereis', cat: 'busqueda', distro: ['arch', 'debian'],
    summary: 'Localiza binario, fuentes y página man de un programa.',
    examples: [{ lines: ['whereis bash'] }],
    related: ['which', 'command'],
    intents: ['dónde está el binario', 'localizar programa completo'],
  },
  {
    id: 'rg', name: 'rg', cat: 'busqueda', distro: ['arch', 'debian'],
    summary: 'ripgrep: grep recursivo ultrarrápido con salida bonita (paquete ripgrep).',
    examples: [{ lines: ['rg -n "TODO" src/', 'rg -i --hidden "clave" . -g "!node_modules"'] }],
    alternatives: [{ name: 'grep', note: 'universal, preinstalado' }],
    intents: ['buscar rápido en proyecto', 'grep moderno'],
  },
  {
    id: 'fd', name: 'fd', cat: 'busqueda', distro: ['arch', 'debian'],
    summary: 'find moderno: sintaxis simple, ignora .gitignore, colores.',
    examples: [{ lines: ['fd "\\.conf$"', 'fd -e ts -x prettier --write'] }],
    alternatives: [{ name: 'find', note: 'estándar POSIX' }],
    intents: ['buscar archivos fácil', 'find alternativo'],
  },
  {
    id: 'fzf', name: 'fzf', cat: 'busqueda', distro: ['arch', 'debian'],
    summary: 'Buscador interactivo difuso sobre cualquier lista (historial, archivos, git log).',
    examples: [{ lines: ['history | fzf', 'fzf'] }],
    intents: ['búsqueda interactiva', 'selector difuso'],
  },

  /* ============================== MONITORIZACIÓN ============================== */
  { id: 'watch', name: 'watch', cat: 'monitorizacion', distro: ['arch', 'debian'], important: true, summary: 'Repite un comando cada N segundos mostrando diferencias en pantalla completa.',
    examples: [{ lines: ['watch -n 2 df -h', 'watch free -h'] }],
    intents: ['monitorizar comando repetido', 'refrescar salida automáticamente'],
  },
  { id: 'iostat', name: 'iostat', cat: 'monitorizacion', distro: ['arch', 'debian'], summary: 'Estadísticas de IO y CPU por dispositivo (paquete sysstat).', examples: [{ lines: ['iostat -xz 2'] }], intents: ['rendimiento disco', 'io estadísticas'] },
  { id: 'pidstat', name: 'pidstat', cat: 'monitorizacion', distro: ['arch', 'debian'], summary: 'CPU/memoria/IO POR PROCESO en intervalos (sysstat).', examples: [{ lines: ['pidstat 2', 'pidstat -r -p $(pgrep firefox)'] }], intents: ['consumo por proceso histórico'] },
  { id: 'iotop', name: 'iotop', cat: 'monitorizacion', distro: ['arch', 'debian'], summary: 'top de E/S de disco: quién está escribiendo ahora (requiere root).', examples: [{ lines: ['sudo iotop -oa'] }], intents: ['quien usa el disco', 'io en vivo'] },

  /* =================================== LOGS =================================== */
  {
    id: 'logger', name: 'logger', cat: 'logs', distro: ['arch', 'debian'],
    summary: 'Escribe tus propios mensajes en el journal/syslog desde scripts.',
    examples: [{ lines: ['logger -t mi-backup "inicio de copia"', 'journalctl -t mi-backup'] }],
    intents: ['registrar evento propio', 'log desde script'],
  },
  { id: 'last', name: 'last', cat: 'logs', distro: ['arch', 'debian'], summary: 'Histórico de inicios de sesión (lectura de wtmp).', examples: [{ lines: ['last -n 10', 'last reboot'] }], intents: ['quiénes entraron', 'histórico sesiones'] },

  /* =============================== ARRANQUE/BOOT =============================== */
  {
    id: 'bootctl', name: 'bootctl', cat: 'boot', distro: ['arch'], important: true,
    summary: 'Instala/consulta/gestiona systemd-boot (el bootloader mínimo de systemd).',
    examples: [
      { desc: 'estado y entradas actuales', lines: ['bootctl status', 'bootctl list'] },
      { desc: '(re)instalar en la ESP montada en /boot', lines: ['bootctl install'] },
    ],
    warnNote: 'Requiere haber arrancado en modo UEFI.',
    intents: ['systemd-boot estado', 'gestionar bootloader systemd'],
  },
  {
    id: 'efibootmgr', name: 'efibootmgr', cat: 'boot', distro: ['arch', 'debian'], important: true,
    summary: 'Lee/edita las entradas de arranque guardadas en la NVRAM del firmware UEFI.',
    examples: [{ lines: ['efibootmgr', 'sudo efibootmgr -o 0001,0000   # cambiar orden'] }],
    intents: ['orden de arranque uefi', 'entradas boot firmware'],
  },
  {
    id: 'grub-install', name: 'grub-install', cat: 'boot', distro: ['arch', 'debian'], important: true,
    summary: 'Instala GRUB en el disco/ESP. Reinstalarlo es EL rescate clásico cuando el boot desaparece.',
    examples: [{ desc: 'UEFI típico', lines: ['sudo grub-install --target=x86_64-efi --efi-directory=/boot --bootloader-id=GRUB'] }],
    warnNote: 'Comando delicado: apunta SIEMPRE al disco/ESP correctos y regenera después grub-mkconfig.',
    intents: ['reinstalar grub', 'restaurar arranque grub'],
  },
  {
    id: 'grub-mkconfig', name: 'grub-mkconfig', cat: 'boot', distro: ['arch', 'debian'], important: true,
    summary: 'Genera /boot/grub/grub.cfg detectando kernels y otros sistemas (os-prober).',
    examples: [{ lines: ['sudo grub-mkconfig -o /boot/grub/grub.cfg'] }],
    intents: ['regenerar config grub', 'detectar windows dual boot'],
  },
  {
    id: 'mkinitcpio', name: 'mkinitcpio', cat: 'boot', distro: ['arch'],
    summary: 'Regenera el initramfs de Arch tras cambiar módulos/hooks o instalar drivers.',
    examples: [{ lines: ['sudo mkinitcpio -P'] }],
    intents: ['regenerar initramfs', 'initramfs arch'],
  },
  {
    id: 'systemd-analyze', name: 'systemd-analyze', cat: 'boot', distro: ['arch', 'debian'], important: true,
    summary: 'Analiza el tiempo de arranque y qué unidades lo retrasan.',
    examples: [{ lines: ['systemd-analyze', 'systemd-analyze blame | head', 'systemd-analyze critical-chain'] }],
    intents: ['arranque lento', 'tiempo de boot', 'qué retrasa el inicio'],
  },

  /* ================================ DIAGNÓSTICO ================================ */
  {
    id: 'lsof', name: 'lsof', cat: 'diagnostico', distro: ['arch', 'debian'], important: true,
    summary: 'Lista archivos abiertos: qué proceso usa ese fichero, socket o directorio.',
    examples: [
      { desc: '¿quién impide desmontar?', lines: ['lsof +f -- /mnt/datos'] },
      { desc: 'puerto ocupado (alternativa a ss)', lines: ['lsof -i :8080'] },
    ],
    intents: ['archivo en uso', 'quién abre este fichero', 'desmontar ocupado'],
  },
  {
    id: 'strace', name: 'strace', cat: 'diagnostico', distro: ['arch', 'debian'],
    summary: 'Traza las syscalls de un proceso: ve EXACTAMENTE qué intenta hacer y contra qué ruta.',
    examples: [{ lines: ['strace -e openat ls /etc', 'strace -c pacman -Sy   # resumen de llamadas'] }],
    whatHappens: 'Se engancha vía ptrace y reporta cada llamada al kernel: perfecto para descubrir «¿por qué no encuentra el config?».',
    intents: ['depurar syscalls', 'por qué falla apertura archivo', 'traza programa'],
  },
  { id: 'ltrace', name: 'ltrace', cat: 'diagnostico', distro: ['arch', 'debian'], summary: 'Como strace pero a nivel de funciones de bibliotecas compartidas.', examples: [{ lines: ['ltrace -e malloc ls'] }], intents: ['trazar librerías'] },

  /* ============================= NETWORKMANAGER ============================= */
  {
    id: 'nmcli', name: 'nmcli', cat: 'networkmanager', distro: ['arch', 'debian'], important: true,
    summary: 'Control total de NetworkManager desde terminal: estado, WiFi, IP, DNS, activar/desactivar.',
    examples: [
      { desc: 'estado general', lines: ['nmcli device status', 'nmcli connection show'] },
      { desc: 'wifi conectar', lines: ['nmcli device wifi connect MiRed password "clave"'] },
      { desc: 'IP estática', lines: ['nmcli con mod "cableada" ipv4.method manual ipv4.addresses 192.168.1.50/24 ipv4.gateway 192.168.1.1', 'nmcli con up "cableada"'] },
      { desc: 'DNS y desconexión', lines: ['nmcli con mod "cableada" ipv4.dns "1.1.1.1"', 'nmcli device disconnect wlan0'] },
    ],
    breakdown: [
      { token: 'device status', meaning: 'interfaces físicas y su estado actual' },
      { token: 'connection show', meaning: 'perfiles guardados (con mod/up/down los gestionan)' },
      { token: 'wifi connect SSID', meaning: 'crea perfil + conecta + guarda autoconexión' },
    ],
    intents: ['conectar wifi terminal', 'gestionar red consola', 'cambiar ip networkmanager', 'activar desactivar red'],
  },
  { id: 'nmtui', name: 'nmtui', cat: 'networkmanager', distro: ['arch', 'debian'], summary: 'Interfaz de menús en texto para NetworkManager: ideal sin entorno gráfico.', examples: [{ lines: ['nmtui'] }], intents: ['red con menús texto', 'wifi servidor'] },

  /* ================================ DESARROLLO ================================ */
  { id: 'gcc', name: 'gcc', cat: 'desarrollo', distro: ['arch', 'debian'], summary: 'Compilador GNU de C/C++; -o nombra la salida, -Wall activa avisos.', examples: [{ lines: ['gcc -Wall -o programa main.c'] }], intents: ['compilar c', 'gcc compilar'] },
  { id: 'make', name: 'make', cat: 'desarrollo', distro: ['arch', 'debian'], summary: 'Ejecuta recetas de un Makefile compilando solo lo cambiado (-j8 en paralelo).', examples: [{ lines: ['make -j$(nproc)'] }], intents: ['compilar proyecto makefile'] },
  { id: 'cmake', name: 'cmake', cat: 'desarrollo', distro: ['arch', 'debian'], summary: 'Generador de build multiplataforma: cmake -B build && cmake --build build.', examples: [{ lines: ['cmake -B build -DCMAKE_BUILD_TYPE=Release', 'cmake --build build -j'] }], intents: ['compilar cmake'] },
  { id: 'python3', name: 'python3', cat: 'desarrollo', distro: ['arch', 'debian'], summary: 'Intérprete Python 3; -m venv crea entornos aislados.', examples: [{ lines: ['python3 -m venv .venv', 'source .venv/bin/activate'] }], intents: ['python terminal', 'entorno virtual python'] },
  { id: 'pip', name: 'pip', cat: 'desarrollo', distro: ['arch', 'debian'], summary: 'Instalador de paquetes Python (usar SIEMPRE dentro de un venv).', examples: [{ lines: ['pip install requests'] }], intents: ['instalar paquete python'] },
  { id: 'node', name: 'node', cat: 'desarrollo', distro: ['arch', 'debian'], summary: 'Runtime JavaScript basado en V8; -v verifica versión instalada.', examples: [{ lines: ['node -v', 'node script.js'] }], intents: ['javascript servidor', 'ejecutar js'] },
  { id: 'npm', name: 'npm', cat: 'desarrollo', distro: ['arch', 'debian'], summary: 'Gestor de paquetes de Node.js: init/install/run.', examples: [{ lines: ['npm init -y', 'npm install express', 'npm run dev'] }], intents: ['instalar paquete node', 'npm instalar dependencias'] },
  { id: 'cargo', name: 'cargo', cat: 'desarrollo', distro: ['arch', 'debian'], summary: 'Gestor y constructor oficial de Rust: new/build/run/test.', examples: [{ lines: ['cargo new mi-proyecto', 'cargo run --release'] }], intents: ['rust proyecto', 'compilar rust'] },

  /* ========================== CRIPTOGRAFÍA Y HASHES ========================== */
  {
    id: 'sha256sum', name: 'sha256sum', cat: 'cripto', distro: ['arch', 'debian'], important: true,
    summary: 'Calcula el hash SHA-256 de archivos: verifica integridad de descargas e ISOs.',
    examples: [{ desc: 'verificar una ISO descargada', lines: ['sha256sum archlinux-x86_64.iso', '# compara con el sha256sums.txt oficial'] }],
    intents: ['verificar descarga iso', 'hash integridad archivo'],
  },
  { id: 'sha512sum', name: 'sha512sum', cat: 'cripto', distro: ['arch', 'debian'], summary: 'Igual que sha256sum con SHA-512 (digest más largo).', examples: [{ lines: ['sha512sum backup.tar.gz'] }], intents: ['hash sha512'] },
  { id: 'md5sum', name: 'md5sum', cat: 'cripto', distro: ['arch', 'debian'], summary: 'Hash MD5 heredado: vale para detectar corrupción accidental, NO para seguridad.', examples: [{ lines: ['md5sum imagen.img'] }], intents: ['md5 checksum legacy'] },
  {
    id: 'openssl', name: 'openssl', cat: 'cripto', distro: ['arch', 'debian'], important: true,
    summary: 'Caja de herramientas criptográficas: certificados TLS, cifrado, hashes.',
    examples: [
      { desc: 'inspeccionar certificado de un sitio', lines: ['openssl s_client -connect archlinux.org:443 -brief </dev/null'] },
      { desc: 'generar clave + CSR', lines: ['openssl req -newkey rsa:4096 -nodes -keyout clave.key -out peticion.csr'] },
    ],
    intents: ['certificado tls', 'ver ssl web', 'generar csr'],
  },
  {
    id: 'gpg', name: 'gpg', cat: 'cripto', distro: ['arch', 'debian'],
    summary: 'GNU Privacy Guard: firmas digitales, cifrado y verificación de paquetes.',
    examples: [
      { desc: 'importar y verificar firma del AUR/kernel', lines: ['gpg --recv-keys ID-CLAVE', 'gpg --verify archivo.tar.gz.sig'] },
    ],
    intents: ['verificar firma gpg', 'cifrar archivo gpg', 'claves pgp'],
  },

  /* ============================ TAREAS PROGRAMADAS ============================ */
  {
    id: 'crontab', name: 'crontab', cat: 'tareas', distro: ['arch', 'debian'], important: true,
    summary: 'Programa comandos periódicos (min hora día mes semana). Requiere cron habilitado.',
    examples: [
      { desc: 'editar las tuyas', lines: ['crontab -e'] },
      { desc: 'cada día a las 03:30', lines: ['# min hora dia mes dow\n30 3 * * * /usr/local/bin/backup.sh >> ~/backup.log 2>&1'] },
    ],
    breakdown: [
      { token: 'min', meaning: '0-59' },
      { token: 'hora/día/mes/dow', meaning: 'campos restantes; * = cualquiera' },
      { token: '>> log 2>&1', meaning: 'SIEMPRE redirige salida en cron: si no, pierdes errores' },
    ],
    alternatives: [{ name: 'systemd timers', note: 'preferido en Arch: journalctl integrado' }],
    intents: ['programar tarea periódica', 'cron ejemplo', 'tarea diaria automática'],
  },
  {
    id: 'at', name: 'at', cat: 'tareas', distro: ['arch', 'debian'],
    summary: 'Ejecuta UN comando a una hora puntual futura (one-shot).',
    examples: [{ lines: ['echo "shutdown -h now" | at 02:00', 'atq   # cola pendiente'] }],
    intents: ['programar una sola vez', 'apagar a una hora'],
  },
  {
    id: 'systemd-run', name: 'systemd-run', cat: 'tareas', distro: ['arch', 'debian'],
    summary: 'Lanza comandos como unidad transitoria de systemd: con cgroup, logs y límites.',
    examples: [{ lines: ['sudo systemd-run --on-active=30m /usr/local/bin/aviso.sh'] }],
    intents: ['ejecutar diferido systemd', 'temporizador puntual'],
  },

  /* ============================ DATOS Y UTILIDADES ============================ */
  {
    id: 'jq', name: 'jq', cat: 'datos', distro: ['arch', 'debian'], important: true,
    summary: 'Procesador JSON por excelencia: filtra, transforma y formatea APIs y ficheros .json.',
    examples: [
      { desc: 'campo de una respuesta API', lines: ["curl -s https://api.github.com/repos/torvalds/linux | jq '.stargazers_count'"] },
      { desc: 'extraer array de objetos', lines: ["jq '.[].nombre' empleados.json"] },
    ],
    intents: ['procesar json terminal', 'leer api json', 'formatear json'],
  },
  { id: 'column', name: 'column', cat: 'datos', distro: ['arch', 'debian'], summary: 'Alinea columnas de texto/tabulaciones para lectura humana.', examples: [{ lines: ["cut -d: -f1,7 /etc/passwd | column -t -s:"] }], intents: ['alinear columnas', 'tabla legible terminal'] },
  { id: 'od', name: 'od', cat: 'datos', distro: ['arch', 'debian'], summary: 'Vuelca archivos en octal/hex: inspección de binarios cruda.', examples: [{ lines: ['od -Ax -tx1z binario | head'] }], intents: ['ver bytes archivo', 'hexdump básico'] },
  { id: 'xxd', name: 'xxd', cat: 'datos', distro: ['arch', 'debian'], summary: 'Hexdump vim-style; -r reconstruye binario desde hex.', examples: [{ lines: ['xxd cabecera.bin | head', 'echo -n hola | xxd'] }], intents: ['hex dump', 'convertir hex archivo'] },
  { id: 'strings', name: 'strings', cat: 'datos', distro: ['arch', 'debian'], summary: 'Extrae cadenas imprimibles de un binario (mensajes, rutas, versiones).', examples: [{ lines: ['strings /usr/bin/ls | grep -i usage'] }], intents: ['textos dentro de binario'] },
  {
    id: 'base64', name: 'base64', cat: 'datos', distro: ['arch', 'debian'],
    summary: 'Codifica/decodifica Base64 (tokens, payloads, adjuntos).',
    examples: [{ lines: ['echo -n "texto" | base64', 'echo "dGV4dG8=" | base64 -d'] }],
    intents: ['codificar base64', 'decodificar base64'],
  },
  { id: 'seq', name: 'seq', cat: 'datos', distro: ['arch', 'debian'], summary: 'Genera secuencias numéricas (para bucles y pruebas).', examples: [{ lines: ['seq 1 5', 'seq 0 10 100'] }], intents: ['generar números secuencia'] },
  { id: 'bc', name: 'bc', cat: 'datos', distro: ['arch', 'debian'], summary: 'Calculadora con decimales (cuando $(( )) entera no basta).', examples: [{ lines: ['echo "scale=2; 10/3" | bc'] }], intents: ['calcular decimales terminal', 'división con decimales bash'] },

  /* ================================= HARDWARE ================================= */
  { id: 'lsmem', name: 'lsmem', cat: 'hardware', distro: ['arch', 'debian'], summary: 'Mapa de bloques de memoria física y memoria total en línea.', examples: [{ lines: ['lsmem'] }], intents: ['memoria física detalles'] },
  {
    id: 'lshw', name: 'lshw', cat: 'hardware', distro: ['arch', 'debian'],
    summary: 'Inventario hardware COMPLETO jerárquico (cpu, ram, discos, red…).',
    examples: [{ lines: ['sudo lshw -short', 'sudo lshw -class disk'] }],
    intents: ['inventario hardware completo', 'listar todo el equipo'],
  },
  { id: 'sensors', name: 'sensors', cat: 'hardware', distro: ['arch', 'debian'], summary: 'Temperaturas y voltajes (lm_sensors; ejecuta sensors-detect antes).', examples: [{ lines: ['sensors'] }], intents: ['temperaturas cpu gpu', 'sensores placa'] },
  { id: 'dmidecode', name: 'dmidecode', cat: 'hardware', distro: ['arch', 'debian'], summary: 'Info de firmware/placa/RAM directamente de las tablas DMI/SMBIOS.', examples: [{ lines: ['sudo dmidecode -t memory | grep -i size'] }], intents: ['modelo placa base', 'ranuras ram'] },
  {
    id: 'smartctl', name: 'smartctl', cat: 'hardware', distro: ['arch', 'debian'], important: true,
    summary: 'Salud SMART del disco: sectores reasignados, temperatura, vida SSD restante.',
    examples: [{ lines: ['sudo smartctl -H /dev/sda        # salud rápida', 'sudo smartctl -a /dev/nvme0n1     # completo'] }],
    intents: ['salud del disco', 'ssd vida restante', 'smart comprobar'],
  },

  /* =============================== MANTENIMIENTO =============================== */
  {
    id: 'paccache', name: 'paccache', cat: 'mantenimiento', distro: ['arch'], important: true,
    summary: 'Recorta la caché de pacman conservando N versiones por paquete: rollback seguro sin llenar disco.',
    examples: [{ lines: ['paccache -rk2        # conserva 2 versiones', 'paccache -ruk0       # borra además caché de desinstalados'] }],
    intents: ['limpiar cache pacman', 'liberar espacio arch', 'mantenimiento arch'],
  },
  { id: 'apt-autoremove', name: 'apt autoremove', cat: 'mantenimiento', distro: ['debian'], important: true, summary: 'Elimina dependencias instaladas automáticamente que ya nadie necesita.', examples: [{ lines: ['sudo apt autoremove --purge'] }], intents: ['huérfanos ubuntu', 'limpiar ubuntu'] },
  { id: 'apt-clean', name: 'apt clean', cat: 'mantenimiento', distro: ['debian'], summary: 'Vacía la caché local de .deb descargados (/var/cache/apt/archives).', examples: [{ lines: ['sudo apt clean'] }], intents: ['vaciar cache deb'] },
  {
    id: 'fstrim', name: 'fstrim', cat: 'mantenimiento', distro: ['arch', 'debian'], important: true,
    summary: 'Envía TRIM al SSD indicando bloques libres: mantiene rendimiento y vida útil.',
    examples: [{ lines: ['sudo fstrim -av', '# automatizado semanal:', 'sudo systemctl enable --now fstrim.timer'] }],
    intents: ['trim ssd', 'mantenimiento ssd'],
  },
  { id: 'sync', name: 'sync', cat: 'mantenimiento', distro: ['arch', 'debian'], summary: 'Fuerza el vuelcado de buffers de escritura al disco (antes de extraer USB).', examples: [{ lines: ['sync'] }], intents: ['volcar escrituras disco'] },
]
