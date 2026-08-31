import type { Problem } from '../types'
import { cmd, info, ol, p, tip, ul, warn } from './helpers'

type Lvl = 'facil' | 'intermedio' | 'avanzado'

interface MkArgs {
  id: string
  title: string
  category: string
  level: Lvl
  severity?: Problem['severity']
  symptoms: string[]
  causes: string[]
  diagnose: Problem['diagnose']
  solutions: Problem['solutions']
  finalCheck: string
  alternatives?: string[]
}

function mk(a: MkArgs): Problem {
  return {
    id: a.id,
    title: a.title,
    category: a.category,
    level: a.level,
    severity: a.severity ?? 'medium',
    symptoms: a.symptoms,
    causes: a.causes,
    diagnose: a.diagnose,
    solutions: a.solutions,
    finalCheck: a.finalCheck,
    ...(a.alternatives ? { alternatives: a.alternatives } : {}),
  }
}

/* ========================= SERVICIOS Y SYSTEMD (extra) ========================= */

export const SVC_PROBLEMS: Problem[] = [
  mk({
    id: 'servicio-restart-loop', title: 'Servicio entra en bucle de reinicio', category: 'Servicios/Systemd', level: 'intermedio',
    symptoms: ['activating→failed cada pocos segundos', 'Restart=on-failure relanza sin fin'],
    causes: ['Dependencia lista tarde (race)', 'Error persistente de red/permiso'],
    diagnose: [cmd({}, 'journalctl -u NOMBRE -b --no-pager | tail -40')],
    solutions: [
      { title: 'Romper bucle y corregir', blocks: [cmd({}, 'sudo systemctl stop NOMBRE', '# corrige según journal…', 'sudo systemctl start NOMBRE')] },
      { title: 'Suavizar el race', blocks: [tip('RestartSec + StartLimitBurst', 'Drop-in con systemctl edit NOMBRE: RestartSec=5 evita tormentas mientras investigas.')] },
    ],
    finalCheck: 'active ≥5 min y NRestarts estable.',
  }),
  mk({
    id: 'journal-errores', title: 'journalctl muestra errores y no sé interpretarlos', category: 'Servicios/Systemd', level: 'facil',
    symptoms: ['Miles de líneas sin saber qué importa'],
    causes: ['Falta filtrar por unidad/prioridad/boot'],
    diagnose: [cmd({},
      'journalctl -p 3 -xb --no-pager       # solo errores del boot actual',
      'journalctl -u UNIDAD -f                # un servicio en vivo',
      'journalctl --since "1 hour ago"')],
    solutions: [{ title: 'Flujo de lectura recomendado', blocks: [ol('errores globales (-p 3 -xb)', 'unidad sospechosa (-u)', 'contexto amplio (--since)')] }],
    finalCheck: 'Sabes identificar unidad, momento y mensaje del fallo.',
  }),
  mk({
    id: 'boot-lento', title: 'Arranque muy lento', category: 'Servicios/Systemd', level: 'intermedio',
    symptoms: ['systemd-analyze marca tiempos altos', 'Pantalla negra prolongada pre-login'],
    causes: ['wait-online o NFS esperando red', 'Discos extraíbles en fstab sin nofail'],
    diagnose: [cmd({},
      'systemd-analyze',
      'systemd-analyze blame | head -10',
      'systemd-analyze critical-chain --no-pager')],
    solutions: [{ title: 'Palancas típicas', blocks: [cmd({}, 'sudo systemctl disable NetworkManager-wait-online.service', "# fstab: añade nofail a discos extraíbles")] }],
    finalCheck: 'Tiempo total razonable sin unidades críticas lentas.',
    alternatives: ['linux-lts e initramfs ligero como proyecto avanzado.'],
  }),
  mk({
    id: 'servicio-no-auto', title: 'Un servicio no arranca automáticamente', category: 'Servicios/Systemd', level: 'facil',
    symptoms: ['start manual funciona pero desaparece al reiniciar'],
    causes: ['Falta enable (start ≠ enable)', 'Habilitado en target equivocado'],
    diagnose: [cmd({}, 'systemctl is-enabled NOMBRE', 'systemctl cat NOMBRE | grep -A2 Install')],
    solutions: [{ title: 'Habilitar correctamente', blocks: [cmd({}, 'sudo systemctl enable NOMBRE.service', '# revisa WantedBy= si sigue sin salir')] }],
    finalCheck: 'is-enabled devuelve enabled y sobrevive reinicio.',
  }),
  mk({
    id: 'timer-no-funciona', title: 'Timer de systemd no funciona', category: 'Servicios/Systemd', level: 'intermedio',
    symptoms: ['list-timers no muestra tu timer', 'Ejecuta a horas raras o nunca'],
    causes: ['OnCalendar inválido', 'enable del TIMER omitido', 'Persistent=true ausente y PC apagado'],
    diagnose: [cmd({},
      'systemctl list-timers --all --no-pager',
      'systemctl cat mi.timer',
      'systemd-analyze calendar EXPRESIÓN   # valida OnCalendar')],
    solutions: [{ title: 'Checklist', blocks: [ol('OnCalendar válido', 'enable --now mi.timer (¡el timer!)', 'service Type=oneshot correcto')] }],
    finalCheck: 'NEXT futura en list-timers y service manual sin error.',
    alternatives: ['cron si no necesitas journal integrado.'],
  }),
  mk({
    id: 'socket-no-responde', title: 'Socket de systemd no responde', category: 'Servicios/Systemd', level: 'avanzado',
    symptoms: ['curl localhost:puerto cuelga', '.socket listening pero .service nunca arranca'],
    causes: ['Service asociado falló antes', 'Accept=no y la primera conexión activa algo lento'],
    diagnose: [cmd({}, 'systemctl status mi.socket mi.service --no-pager', 'ss -xlpn | grep mi-socket')],
    solutions: [{ title: 'Reiniciar el binomio', blocks: [cmd({}, 'sudo systemctl restart mi.socket mi.service', 'journalctl -u mi.service -b --no-pager | tail')] }],
    finalCheck: 'Conexión atendida y service active tras la petición.',
  }),
]

/* ====================== USUARIOS Y PERMISOS (extra) ====================== */

export const USER_PROBLEMS: Problem[] = [
  mk({
    id: 'sudo-roto', title: 'sudo no funciona', category: 'Usuarios/Permisos', level: 'avanzado', severity: 'high',
    symptoms: ['user is not in the sudoers file', 'parse error in sudoers'],
    causes: ['Usuario fuera de wheel/sudo', 'sudoers con error de sintaxis', 'chmod equivocado sobre /usr/bin/sudo'],
    diagnose: [cmd({}, 'groups', 'su -                                  # root para reparar', 'visudo -c                             # valida sintaxis')],
    solutions: [
      { title: 'Volver a wheel', blocks: [cmd({}, 'usermod -aG wheel tu-usuario', '# y %wheel ALL=(ALL:ALL) ALL descomentado en visudo')] },
      { title: 'Restaurar binario si alguien tocó chmod', blocks: [warn('Operación delicada', 'Solo si stat confirma que se perdieron los permisos originales.'), cmd({ dangerous: true }, 'chown root:root /usr/bin/sudo && chmod 4755 /usr/bin/sudo')] },
    ],
    finalCheck: 'sudo -v acepta tu contraseña y sudo whoami devuelve root.',
    alternatives: ['doas como alternativa simple durante la reparación.'],
  }),
  mk({
    id: 'permisos-tras-copiar', title: 'Permisos incorrectos tras copiar archivos', category: 'Usuarios/Permisos', level: 'intermedio',
    symptoms: ['Scripts pierden +x al copiar', 'Todo queda de root tras sudo cp'],
    causes: ['cp sin -a pierde metadatos', 'sudo cp transfiere propiedad a root'],
    diagnose: [cmd({}, 'stat -c "%a %U:%G" origen destino')],
    solutions: [{ title: 'Recopiar preservando todo', blocks: [cmd({}, 'sudo cp -a origen/. destino/', '# o corrige lo existente:', 'sudo chown -R "$USER":"$USER" destino && chmod -R u+rwX,go+rX destino')] }],
    finalCheck: 'diff -r vacío y stat idéntico entre origen/destino.',
  }),
  mk({
    id: 'archivo-de-root', title: 'Archivo pertenece a root', category: 'Usuarios/Permisos', level: 'facil',
    symptoms: ['No puedes editar algo creado vía sudo', 'Descargas owned by root'],
    causes: ['Programa lanzado con sudo escribió en tu HOME'],
    diagnose: [cmd({}, 'ls -l archivo', 'sudo chown "$USER":"$USER" archivo')],
    solutions: [{ title: 'Patrón preventivo', blocks: [tip('sudoedit', 'sudoedit fichero edita una copia y guarda con TU dueño: elimina toda esta clase de problemas.')] }],
    finalCheck: 'stat muestra tu usuario y el editor guarda sin sudo.',
  }),
  mk({
    id: 'grupo-servicio', title: 'Usuario no puede acceder a un servicio/grupo', category: 'Usuarios/Permisos', level: 'intermedio',
    symptoms: ['docker: permission denied', 'audio/input inaccesibles pese a configurar'],
    causes: ['Grupo añadido DESPUÉS del login: logind conserva grupos por sesión', 'El servicio corre con otro usuario'],
    diagnose: [cmd({}, 'id                                   # ¿aparece el grupo?', 'getent group docker                  # miembros reales')],
    solutions: [{ title: 'Cerrar sesión COMPLETA', blocks: [warn('Cerrar la terminal no basta', 'Tras usermod -aG cierra la sesión gráfica completa o reinicia para que logind refresque grupos.')] }],
    finalCheck: 'id muestra el grupo nuevo en una sesión recién abierta.',
  }),
]

/* ========================== BASH Y TERMINAL (extra) ========================== */

export const BASH_TROUBLE_PROBLEMS: Problem[] = [
  mk({
    id: 'command-not-found', title: 'command not found', category: 'Bash/Terminal', level: 'facil',
    symptoms: ['bash: xyz: command not found con algo recién instalado', 'Funciona con ./script pero no a secas'],
    causes: ['Binario fuera de PATH', 'PATH sin recargar tras instalar', 'Typo o mayúsculas'],
    diagnose: [cmd({}, 'echo "$PATH" | tr ":" "\n"', 'command -v xyz || echo no-esta')],
    solutions: [{ title: 'Localizar y conectar', blocks: [cmd({}, '# ¿dónde quedó instalado?', 'find ~ /usr/local -name xyz -type f 2>/dev/null', '# añade su carpeta al PATH y recarga:', 'export PATH="$PATH:$HOME/bin"')] }],
    finalCheck: 'command -v xyz imprime una ruta.',
  }),
  mk({
    id: 'sh-no-ejecuta', title: 'Script .sh no ejecuta', category: 'Bash/Terminal', level: 'facil',
    symptoms: ['Permission denied al lanzar ./script.sh', 'Con bash script.sh sí va'],
    causes: ['Falta chmod +x', 'Shebang ausente o CRLF de Windows (^M)'],
    diagnose: [cmd({}, 'ls -l script.sh', 'head -1 script.sh | cat -A   # ¿termina en ^M$?')],
    solutions: [{ title: 'Dos curas típicas', blocks: [cmd({}, 'chmod +x script.sh', 'dos2unix script.sh   # convierte CRLF a LF')] }],
    finalCheck: './script.sh corre directo y head -1 muestra el shebang limpio.',
  }),
  mk({
    id: 'bash-syntax-error', title: 'Error de sintaxis Bash', category: 'Bash/Terminal', level: 'facil',
    symptoms: ['syntax error near unexpected token', 'unexpected EOF while looking for matching quote'],
    causes: ['if/[ ] pegados sin espacios', 'Comillas sin cerrar', 'fi/done faltantes'],
    diagnose: [cmd({}, 'bash -n script.sh   # valida sintaxis SIN ejecutar')],
    solutions: [{ title: 'Correcciones frecuentes', blocks: [ul('[ necesita espacio a ambos lados: [ "$X" = "y" ]', 'Cierra SIEMPRE las comillas antes de seguir', 'Estructura completa: if…then…fi · for…do…done')] }],
    finalCheck: 'bash -n silencioso y shellcheck sin avisos graves.',
  }),
  mk({
    id: 'redireccion-mal', title: 'Redirección incorrecta', category: 'Bash/Terminal', level: 'intermedio',
    symptoms: ['El log queda vacío', 'Los errores siguen en pantalla'],
    causes: ['Orden invertido (2>&1 antes de >archivo)', 'Espacios alrededor del operador ausentes', 'Redirigir dentro de sudo sin shell'],
    diagnose: [cmd({}, '# patrón CORRECTO:', 'comando > archivo.log 2>&1')],
    solutions: [{ title: 'Variantes útiles', blocks: [cmd({}, 'comando >> app.log 2>&1   # añade', 'comando &> todo.log        # atajo bash')] }],
    finalCheck: 'El archivo recoge stdout+stderr en el orden esperado.',
    alternatives: ['tee divide pantalla+archivo cuando necesitas ver MIENTRAS guardas.'],
  }),
  mk({
    id: 'var-inexistente', title: 'Variable de entorno no existe', category: 'Bash/Terminal', level: 'facil',
    symptoms: ['$VAR expande vacío', 'Script falla con «unbound variable» bajo set -u'],
    causes: ['Se exportó en OTRA terminal', 'Falta export o profile sin recargar', 'Servicios systemd user no ven variables del bashrc'],
    diagnose: [cmd({}, 'printenv VAR', 'env | grep -i var')],
    solutions: [{ title: 'Valor permanente', blocks: [cmd({}, "echo 'export VAR=\"valor\"' >> ~/.bashrc", 'source ~/.bashrc', '# para unidades user:', 'systemctl --user set-environment VAR=valor')] }],
    finalCheck: 'printenv VAR imprime el valor esperado en sesiones nuevas.',
  }),
]

/* ============================== RENDIMIENTO ============================== */

export const PERF_PROBLEMS: Problem[] = [
  mk({
    id: 'cpu-100', title: 'CPU al 100%', category: 'Rendimiento', level: 'intermedio',
    symptoms: ['Ventanas tardan en responder', 'Ventilador constante a tope'],
    causes: ['Proceso descontrolado', 'Compilación/indexación puntual (normal)', 'Minería indeseada'],
    diagnose: [cmd({}, 'top -o %CPU          # ordena por CPU', 'ps aux --sort=-%cpu | head -6')],
    solutions: [{ title: 'Actuar', blocks: [cmd({}, 'kill PID', 'renice +19 -p PID    # o baja prioridad si debe seguir')] }],
    finalCheck: '%CPU del culpable baja y el sistema responde normal.',
  }),
  mk({
    id: 'ram-llena', title: 'RAM llena', category: 'Rendimiento', level: 'intermedio',
    symptoms: ['available mínimo en free -h', 'Tirones al alternar apps'],
    causes: ['Apps/pestañas enormes', 'Fuga real que crece sin techo', 'Confundir buff/cache con uso'],
    diagnose: [cmd({}, 'free -h', 'ps aux --sort=-%mem | head -6')],
    solutions: [{ title: 'Aliviar sin reiniciar', blocks: [cmd({}, '# identifica y cierra/recarga el proceso pesado:', 'ps aux --sort=-%mem | head -3')] }],
    finalCheck: 'available vuelve a valores cómodos (>15% del total).',
    alternatives: ['zram bien configurado absorbe picos.'],
  }),
  mk({
    id: 'swap-excesiva', title: 'Swap utilizada excesivamente', category: 'Rendimiento', level: 'intermedio',
    symptoms: ['Swap alto constante en free', 'Tirones al alternar ventanas'],
    causes: ['swappiness alto con swap en DISCO', 'RAM insuficiente para tu carga'],
    diagnose: [cmd({}, 'free -h', 'vmstat 1 3   # columnas si/so', 'sysctl vm.swappiness')],
    solutions: [{ title: 'Diagnóstico honesto', blocks: [ul('Con zram: swap alto es NORMAL (comprime en RAM).', 'Swap en disco alto y constante → más RAM o menos carga.')] }],
    finalCheck: 'si/so ≈ 0 en vmstat durante uso habitual.',
  }),
  mk({
    id: 'proceso-memoria', title: 'Proceso consume demasiada memoria', category: 'Rendimiento', level: 'intermedio',
    symptoms: ['%MEM enorme sostenido', 'El sistema entra en swap por su culpa'],
    causes: ['Fuga real del programa', 'Caché interna grande (navegadores: normal)', 'Dataset mayor que la RAM'],
    diagnose: [cmd({}, 'ps aux --sort=-%mem | head -5')],
    solutions: [{ title: 'Opciones ordenadas', blocks: [ol('Reinicia el proceso (muchas fugas se resetean)', 'Reduce su cache/workers vía config', 'Añade RAM/zram si la carga es legítima')] }],
    finalCheck: 'RSS acotado tras los cambios y sin swaps nuevos.',
    alternatives: ['systemd MemoryMax= acota por cgroup.'],
  }),
  mk({
    id: 'disco-lento', title: 'Disco muy lento', category: 'Rendimiento', level: 'avanzado',
    symptoms: ['Copias lentísimas en SSD', 'Congelones al abrir archivos', 'iowait alto en top'],
    causes: ['TRIM nunca ejecutado', 'SMART degradado', 'Cable SATA en modo bajo', 'Btrfs muy fragmentado'],
    diagnose: [cmd({},
      'iostat -xz 2                     # %util y await por disco',
      'sudo hdparm -t /dev/sdX           # lectura secuencial',
      'sudo smartctl -a /dev/sdX | grep -i rate')],
    solutions: [{ title: 'Plan de choque', blocks: [cmd({},
      'sudo systemctl enable --now fstrim.timer',
      'sudo btrfs scrub start /   # si usas Btrfs',
      '# await >50 ms constante → backup + cambio de disco')] }],
    finalCheck: 'await <20 ms HDD / <5 ms SSD bajo carga y copias a velocidad nominal.',
    alternatives: ['Prueba otro puerto/cable SATA antes de culpar al disco.'],
  }),
]

/* ================================ PAQUETES extra ================================ */

export const PKG_PROBLEMS: Problem[] = [
  mk({
    id: 'deps-rotas', title: 'Dependencias rotas', category: 'Paquetes', level: 'intermedio',
    symptoms: ['apt: unmet dependencies · pacman: conflict detected', 'Ningún gestor instala nada nuevo'],
    causes: ['Instalación parcial interrumpida', 'Repos incompatibles mezclados', 'Paquete retenido viejo bloqueando'],
    diagnose: [cmd({},
      '# Debian/Ubuntu:',
      'sudo apt -f install',
      '# Arch: sincroniza TODO junto:',
      'sudo pacman -Syu')],
    solutions: [
      { title: 'Ubuntu: resolver y consolidar', blocks: [cmd({}, 'sudo apt -f install', 'sudo dpkg --configure -a', 'sudo apt autoremove')] },
      { title: 'Arch: downgrade del conflicto desde caché', blocks: [cmd({}, 'ls /var/cache/pacman/pkg/ | grep paquete', 'sudo pacman -U /var/cache/pacman/pkg/paquete-vieja.pkg.tar.zst')] },
    ],
    finalCheck: 'apt check / pacman -Syu terminan limpios.',
  }),
  mk({
    id: 'gpg-caducadas', title: 'Claves GPG caducadas', category: 'Paquetes', level: 'intermedio',
    symptoms: ['pacman: invalid signature', 'apt: NO_PUBKEY ABCDEF'],
    causes: ['Keyring local desfasado', 'Clave de tercero renovada upstream', 'Reloj del sistema desfasado'],
    diagnose: [cmd({},
      '# Arch:',
      'sudo pacman -Sy archlinux-keyring && sudo pacman -Su',
      '# Ubuntu:',
      'sudo apt update 2>&1 | grep NO_PUBKEY')],
    solutions: [{ title: 'Reset profundo del keyring (último recurso Arch)', blocks: [cmd({ dangerous: true }, 'sudo pacman-key --init && sudo pacman-key --populate archlinux && sudo pacman-key --refresh-keys')] }],
    finalCheck: 'Instalaciones verifican firmas sin avisos.',
    alternatives: ['Comprueba la hora: relojes desfasados rompen GPG.'],
  }),
  mk({
    id: 'mirror-caido', title: 'Repositorio/mirror no disponible', category: 'Paquetes', level: 'facil',
    symptoms: ['Failed to fetch archive.ubuntu.com', 'error: failed retrieving file core.db'],
    causes: ['Mirror sincronizando o caído', 'DNS/proxy interceptando'],
    diagnose: [cmd({},
      '# Arch: otro mirror al instante:',
      'sudo reflector --country Spain --latest 10 --save /etc/pacman.d/mirrorlist',
      'sudo pacman -Syu')],
    solutions: [{ title: 'Reintentar con índices frescos', blocks: [cmd({}, 'sudo pacman -Syu', 'sudo apt update && sudo apt upgrade')] }],
    finalCheck: 'Las descargas completan desde el mirror alternativo.',
    alternatives: ['geo.mirror.pkgbuild.com reparte automáticamente en Arch.'],
  }),
  mk({
    id: 'conflicto-actualizacion', title: 'Conflictos durante la actualización', category: 'Paquetes', level: 'intermedio',
    symptoms: ['exists in filesystem (Arch)', 'conflicto entre paquetes candidatos (apt)'],
    causes: ['Archivo huérfano pisando uno del paquete nuevo', 'Dos paquetes proveen el mismo binario'],
    diagnose: [cmd({}, '# Arch: dueño del archivo conflictivo', 'pacman -Qo /ruta/archivo', '# Ubuntu: simula primero:', 'sudo apt upgrade --simulate | head')],
    solutions: [
      { title: 'Arch: mover huérfano y reintentar', blocks: [cmd({ dangerous: true }, 'sudo mv /ruta/archivo /ruta/archivo.bak', 'sudo pacman -Syu')] },
      { title: 'Retener problemático hasta fix', blocks: [cmd({}, '# Ubuntu:', 'sudo apt-mark hold nombre-paquete')] },
    ],
    finalCheck: 'Actualización completa sin conflictos.',
    alternatives: ['Lee los avisos de archlinux.org antes de upgrades mayores.'],
  }),
  mk({
    id: 'ssh-clave-rechazada', title: 'SSH rechaza la clave pública', category: 'Usuarios/Permisos', level: 'intermedio',
    symptoms: ['Permission denied (publickey) con clave cargada', 'Funcionaba ayer y hoy no'],
    causes: ['authorized_keys con permisos/dueño incorrectos en el servidor', 'sshd endurecido a PubkeyAuthentication yes sin clave instalada', 'HOME del usuario remoto escribible por grupo'],
    diagnose: [cmd({}, 'ssh -v usuario@host 2>&1 | grep -iE "offer|denied|identity"')],
    solutions: [{ title: 'Checklist del servidor', blocks: [ul('~/.ssh debe ser 700 y propiedad del usuario remoto', 'authorized_keys 600 y mismo dueño', 'home del usuario NO escribible por grupo/otros (755 máx)'), cmd({}, 'chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys')] }],
    finalCheck: 'ssh -v termina en «Authentication succeeded (publickey)».',
    alternatives: ['ssh-copy-id reinstala la clave con permisos correctos.'],
  }),
]
