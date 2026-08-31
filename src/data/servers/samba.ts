/* Curso Samba — compartición SMB/CIFS */
import { cmd, danger, deep, file, h, info, ol, out, p, tip, tbl, ul, warn } from '../helpers'
import type { QuizData } from '../../types'
import { srvModule } from './types'
import type { RelatedLink } from './types'
import type { ServerCourse } from './types'

const q1: QuizData = {
  id: 'samba-quiz-usuarios',
  difficulty: 'intermediate',
  question: 'Creaste el usuario Linux «ana» pero Windows no puede entrar al share con sus credenciales. ¿Qué olvidaste?',
  options: [
    { text: 'smbpasswd -a ana', why: 'Correcto: Samba mantiene SU PROPIA base de contraseñas; existir en Linux no basta.' },
    { text: 'useradd ana', why: 'Ya existe como usuario del sistema; el problema es la capa Samba.' },
    { text: 'chown ana ana', why: 'Eso afecta permisos de ficheros, no la autenticación SMB.' },
    { text: 'systemctl restart smbd', why: 'Reiniciar no crea identidades: seguiría sin credenciales válidas.' },
  ],
  answer: 0,
}


/* Recomendaciones basadas en relaciones REALES del contenido:
   · 🗂️ NFS → la otra compartición de ficheros: UNIX↔UNIX
   · Usuarios y permisos → grupos, setgid y doble capa POSIX
   · Firewall → 445/tcp restringido por red */
const RELATED: RelatedLink[] = [
  { label: '🗂️ NFS', kind: 'course', to: 'nfs' },
  { label: 'Usuarios y permisos', kind: 'section', to: 'users' },
  { label: 'Firewall', kind: 'section', to: 'firewall' },
]

export const sambaCourse: ServerCourse = {
  id: 'samba',
  icon: '📂',
  title: 'Samba',
  tagline: 'Comparte carpetas con Windows y Linux vía SMB/CIFS: recursos, usuarios, permisos y clientes.',
  level: 'intermediate',
  recommended: ['arch', 'debian'],
  minutes: 95,
  keywords: ['samba', 'smb', 'cifs', 'compartir carpeta', 'smb.conf', 'smbpasswd', 'windows'],
  prereqs: [
    { label: 'Usuarios y permisos', icon: 'users', to: '/section/users' },
    { label: 'Servicios y systemd', icon: 'expert', to: '/section/expert' },
  ],
  cheatsheetIds: ['systemctl', 'journalctl', 'ss'],
  problemIds: ['srv-samba-acceso-denegado', 'srv-samba-no-visible'],
  modules: [
    srvModule('que-es-smb', '01', 'Qué es SMB/Samba', 7, ['Entender qué protocolo habla Windows y cómo lo implementa Samba'], [
      p('SMB (Server Message Block) es el protocolo NATIVO de compartición de ficheros e impresoras de Windows. Cuando en un explorador de Windows ves «\\servidor\documentos», detrás hay SMB sobre TCP 445 (históricamente también 137-139/udp NetBIOS).'),
      p('Samba es la implementación LIBRE de ese protocolo para UNIX/Linux: hace que tu servidor Linux parezca un equipo Windows ante los ojos de los clientes. Es EL puente estándar en redes mixtas — hogares con PC gaming Windows + NAS Linux, oficinas heterogéneas.'),
      tbl(['Pieza', 'Demonio', 'Función'], [
        ['smbd', 'smb.service / smbd.service', 'Compartición de FICHEROS e impresoras (445/tcp)'],
        ['nmbd', 'nmb.service / nmbd.service', 'Nombres NetBIOS: que aparezca en «Red» de Windows (137/udp)'],
      ]),
      info('Dos demonios, dos funciones', 'Puedes tener ficheros funcionando (smbd) sin aparecer en el explorador de red (nmbd caído): conectando por IP o nombre DNS funciona igual. Saberlo evita confundir «no me veo en Red» con «el share está roto».'),
    ]),

    srvModule('instalacion', '02', 'Instalación', 5, ['Instalar Samba'], [
      cmd({ caption: '🐧 Arch Linux' }, 'sudo pacman -S samba'),
      cmd({ caption: '🟠 Debian / Ubuntu' }, 'sudo apt update', 'sudo apt install samba'),
      info('Configuración idéntica', 'Ambas familias usan /etc/samba/smb.conf — mismo demonio ISC/CUPS-style, misma sintaxis INI. Cambia solo el gestor de paquetes. Menos divergencias que recordar.'),
      warn('Arch necesita smb.conf para arrancar', 'En Arch el paquete NO trae smb.conf de ejemplo y smbd se NIEGA a arrancar sin él («ERROR: can\'t find /etc/samba/smb.conf»). En Ubuntu viene uno funcional. Si practicas en Arch: créalo antes de start.'),
    ]),

    srvModule('recurso', '03', 'Crear un recurso compartido', 10, ['Declarar tu primer share en smb.conf'], [
      p('La config de Samba es formato INI: sección [global] + una sección POR CADA recurso compartido. Este es el share clásico de equipo:'),
      file('/etc/samba/smb.conf', `[global]\n   workgroup = WORKGROUP\n   server string = Servidor ArchForge\n   log file = /var/log/samba/%m.log\n\n[publico]\n   path = /srv/samba/publico\n   browseable = yes          # visible al explorar «Red»\n   read only = no            # permite escribir\n   guest ok = no             # exige usuario válido\n   valid users = @familia    # grupo Linux permitido\n   create mask = 0664        # permisos de ficheros creados\n   directory mask = 0775     # permisos de carpetas creadas`),
      h('Directivas que importan'),
      ul(
        '[publico] ES el nombre que verán los clientes: \\servidor\publico.',
        'browseable no controla ACCESO, solo VISIBILIDAD: un share browseable=no funciona perfectamente si sabes su nombre (shares ocultos tipo [print$]).',
        'valid users acepta usuarios (@grupo) — la doble capa auth+authz básica.',
        'create/directory mask: SIN ellos los ficheros creados desde Windows nacen con permisos raros (a veces 744 según umask del demonio).',
      ),
      cmd({ caption: 'preparar el directorio físico' }, 'sudo mkdir -p /srv/samba/publico', 'sudo groupadd familia', 'sudo chown root:familia /srv/samba/publico', 'sudo chmod 2775 /srv/samba/publico'),
      deep('¿Por qué 2775 (setgid)?', 'El bit setgid en el directorio hace que TODO lo creado dentro herede el GRUPO familia — imprescindible para que varios usuarios compartan sin peleas de permisos. Es el patrón profesional para carpetas colaborativas, dentro y fuera de Samba.'),
    ]),

    srvModule('usuarios', '04', 'Usuarios Samba', 8, ['Dar acceso con smbpasswd entendiendo por qué existe'], [
      p('Detalle que sorprende a todos: Samba guarda contraseñas en SU PROPIA base (/var/lib/samba/private/*.tdb) porque Windows usa hashes que /etc/shadow no almacena. Un usuario Linux existente es INVÁLIDO para Samba hasta que lo añades:'),
      cmd({ caption: 'alta de usuario (dos pasos obligatorios)' }, '# 1) usuario del sistema (si no existe):\nsudo useradd -M -s /usr/sbin/nologin ana', '# 2) alta en SAMBA con contraseña propia:\nsudo smbpasswd -a ana', '# activarlo:\nsudo smbpasswd -e ana'),
      out('diálogo esperado', `New SMB password: ****\nRetype new SMB password: ****\nAdded user ana.`),
      ul(
        '-a añade · -e habilita · -x elimina. Contraseñas pueden DIFIEREN de las del sistema (y conviene).',
        'useradd -M -s nologin: sin home ni shell — solo existe para SMB, superficie mínima.',
        'testparm valida y muestra la config EFECTIVA fusionada con defaults (siguiente módulo).',
      ),
    ]),

    srvModule('permisos', '05', 'Permisos', 9, ['Entender la DOBLE capa: Samba + filesystem'], [
      p('El error más común de Samba es creer que smb.conf lo controla todo. La verdad incómoda: Samba aplica DOS filtros en cadena — primero ¿te admito? (usuarios/válidos), luego ¿el FILESYSTEM te deja escribir? (permisos POSIX). Si falla el segundo verás ACCESS_DENIED aunque tu config sea «perfecta».'),
      file('cadena de decisión', `Cliente Windows → [1] valid users / guest ok   (capa SAMBA)\n                → [2] dueño/grupo/mode del path (capa LINUX)\n                → escritura real`),
      tbl(['Síntoma', 'Capa culpable', 'Fix típico'], [
        ['NT_STATUS_ACCESS_DENIED al abrir', 'Samba: no estás en valid users', 'smbpasswd -a + añadir a valid users'],
        ['Puedo leer pero NO crear ficheros', 'Linux: mode sin w para tu grupo', 'chmod g+w / chown correcto'],
        ['Otros no ven MIS ficheros', 'umask/create mask + falta setgid', 'máscaras 0664/0775 + chmod 2775'],
      ]),
      cmd({ caption: 'auditar la cadena completa' }, 'ls -ld /srv/samba/publico', 'groups ana   # ¿pertenece a familia?', 'sudo testparm -s | grep -A8 publico'),
    ]),

    srvModule('configuracion', '06', 'Configuración avanzada y validación', 8, ['Validar con testparm y conocer directivas útiles'], [
      p('testparm es TU verificador de sintaxis (el nginx -t de Samba): parsea smb.conf, avisa de errores Y muestra la configuración EFECTIVA tras aplicar defaults — muchas dudas se responden leyendo esa salida.'),
      cmd({}, 'sudo testparm -s'),
      out('salida típica', `Load smb config files from /etc/samba/smb.conf\nLoaded services file OK.\nServer role: ROLE_STANDALONE\n\n[global]\n\tworkgroup = WORKGROUP\n\tserver string = Servidor ArchForge\n\n[publico]\n\tpath = /srv/samba/publico\n\tread only = No`),
      h('Otras directivas que verás en el mundo real'),
      ul(
        'hosts allow = 192.168.1. 127. → firewall lógico a nivel Samba (defensa en profundidad junto a ufw).',
        'map to guest = Bad User → invitados mapeados a nobody (para shares públicos CONTROLADOS).',
        'vfs objects = recycle → papelera del servidor: ficheros borrados van a .recycle en vez de desaparecer.',
        'hide unreadable = yes → no mostrar lo que no puedes leer (menos ruido, algo de privacidad).',
      ),
      tip('Tras CUALQUIER cambio', 'testparm && sudo systemctl reload smbd nmbd. reload (no restart) mantiene conexiones vivas de otros clientes — cortesía profesional en servidores con gente trabajando.'),
    ]),

    srvModule('cliente-linux', '07', 'Acceso desde Linux', 8, ['Montar shares SMB desde otro Linux: temporal y fstab'], [
      p('Desde Linux el cliente universal es mount -t cifs (paquete cifs-utils). Dos modos: manual puntual y persistente vía fstab.'),
      cmd({ caption: 'montaje manual' }, 'sudo pacman -S cifs-utils   # ubuntu: sudo apt install cifs-utils', 'sudo mkdir -p /mnt/publico', 'sudo mount -t cifs //192.168.1.10/publico /mnt/publico -o username=ana,uid=1000,gid=1000'),
      out('tras montar', `mount | grep cifs\n//192.168.1.10/publico on /mnt/publico type cifs ...`),
      file('persistente en /etc/fstab', `//192.168.1.10/publico  /mnt/publico  cifs  credentials=/etc/samba/creds-ana,uid=1000,_netdev,nofail  0  0`),
      ul(
        'credentials=fichero evita poner contraseña EN CLARO en fstab (visible con df!): fichero 600 con username=/password=.',
        'uid/gid: TU usuario local será dueño de lo montado — sin él todo aparece de root.',
        '_netdev+nofail: espera red y NO bloquea el boot si el servidor está caído (crítico en portátiles).',
      ),
      danger('Nunca contraseñas crudas en fstab', 'fstab es legible por todos los procesos; username=ana,password=secreta queda expuesto en /proc/mounts. El fichero credentials con chmod 600 es la solución estándar y auditable.'),
    ]),

    srvModule('cliente-windows', '08', 'Acceso desde Windows', 6, ['Conectar desde explorador y línea de comandos'], [
      p('Windows trae cliente SMB nativo — cero instalaciones. Tres caminos equivalentes:'),
      ul(
        'Explorador: barra de dirección → \\192.168.1.10\publico (Enter). Pedirá credenciales Samba.',
        '«Este equipo» → Conectar unidad de red → letra Z: + ruta: persistente con reconexión al login.',
        'CMD: net use Z: \\192.168.1.10\publico /persistent:yes.',
      ),
      out('mapeo de unidad', `C:\\> net use Z: \\\\192.168.1.10\\publico /persistent:yes\nThe command completed successfully.`),
      warn('Caché de credenciales traicionera', 'Si cambias una contraseña en Samba, Windows seguirá mandando la VIEJA en caché → ACCESS_DENIED inexplicable. Solución: net use * /delete y volver a conectar. Guarda este comando: resolverá horas de soporte.'),
      info('Descubrimiento vs acceso directo', 'Que NO aparezca en «Red» (nmbd/browsing) no impide acceder por ruta directa. En redes modernas mDNS/WSD complica el browsing: enseña siempre la ruta \\IP\share como método fiable.'),
    ]),

    srvModule('logs', '09', 'Logs', 5, ['Diario por cliente y niveles de log'], [
      cmd({}, 'sudo journalctl -u smbd -n 40 --no-pager', 'sudo tail -20 /var/log/samba/log.192.168.1.50   # log POR CLIENTE si %m.log'),
      out('líneas que informan', `smbd[1620]: ana from 192.168.1.50 connected to publico\nsmbd[1620]: NT_STATUS_ACCESS_DENIED ... check permissions on /srv/samba/publico`),
      p('La directiva log file = /var/log/samba/%m.log genera UN log por máquina cliente (%m = nombre NetBIOS): aísla el comportamiento de ESE Windows sospechoso. Sube temporalmente log level = 2 en [global] cuando necesites detalle, y vuelve a 0/1: verbose permanente infla disco.'),
    ]),

    srvModule('seguridad', '10', '🔐 Seguridad', 9, ['Evitar los errores clásicos de Samba expuesto'], [
      danger('SMB tiene historia de ransomware', 'WannaCry propagó por SMB vulnerable de WINDOWS, y cada auditoría encuentra shares corporativos abiertos a Internet (445/tcp expuesto = hallazgo crítico). Samba bien configurado en LAN es sano; Samba expuesto jamás.'),
      h('Checklist de endurecimiento'),
      ol(
        'JAMÁS exponer 445 a Internet: solo VPN o túnel SSH para accesos externos.',
        'guest ok = no por defecto; anónimo SOLO en shares de contenido público conscientes.',
        'min protocol = SMB2 en [global] (SMB1 es vetusto y atacable): server min protocol = SMB2.',
        'Firewall: ufw allow from 192.168.1.0/24 to any app Samba — nunca Anywhere.',
        'Usuarios dedicados con nologin + contraseñas Samba independientes.',
        'Actualiza samba con el sistema: recibe CVEs serios periódicamente.',
      ),
      cmd({ caption: 'firewall restrictivo' , }, 'sudo ufw allow from 192.168.1.0/24 to any port 445 proto tcp', 'sudo ufw allow from 192.168.1.0/24 to any port 137 proto udp', 'sudo ufw status | grep -i samba || sudo ufw status | grep 44'),
      deep('Firma SMB (signing)', 'server signing = mandatory firma cada paquete contra manipulación MITM. Coste CPU leve; obligatorio en entornos corporativos/DC. En homelab SMB2+ ya cubre lo razonable — saber que existe te distingue.'),
    ]),

    srvModule('troubleshooting', '11', 'Troubleshooting', 8, ['Diagnosticar auth, visibilidad y permisos'], [
      ol(
        '¿Demonios vivos? systemctl status smbd nmbd — Arch recuerda: sin smb.conf no arrancan.',
        '¿Escucha 445? ss -tlnp | grep 445.',
        '¿Credenciales válidas? smbclient -L localhost -U ana DESDE EL SERVIDOR aisla la capa Samba pura.',
        'ACCESS_DENIED al escribir → capa Linux: ls -ld del path + groups usuario (módulo 05).',
        'No aparece en Red → nmbd/firewall/browsing: prueba RUTA DIRECTA \\IP\share antes de culpar a Samba.',
      ),
      cmd({ caption: 'el comando diagnóstico estrella' }, 'smbclient //localhost/publico -U ana', 'smb: \\> ls'),
      out('si esto funciona localmente', 'El servidor Samba está BIEN → el problema vive en red/firewall/cliente. Divide y vencerás.'),
      tbl(['Error Windows', 'Traducción', 'Ir a'], [
        ['NT_STATUS_ACCESS_DENIED', 'Auth Samba o permisos POSIX', '04–05'],
        ['No se puede encontrar \\servidor', 'nmbd caído o firewall 445', '11'],
        ['Pide contraseña infinitamente', 'Credenciales cacheadas viejas', '08'],
        ['Archivo corrupto al copiar', 'Versión protocolo/min protocol', '10'],
      ]),
      info('Solucionador integrado', '«Acceso denegado al share» y «el share no aparece en la red» están paso a paso en Troubleshooting de ArchForge.'),
    ]),

    srvModule('laboratorio', '12', 'Laboratorio', 18, ['Publicar un share funcional en la terminal virtual'], []),
  ],
  lab: {
    objective: 'Instala Samba, crea smb.conf con el share [publico] (path /srv/samba/publico, escribible), prepara el directorio con permisos de grupo y deja smbd activo.',
    intro: 'Estado FINAL: samba instalado · smb.conf con [publico] · /srv/samba/publico existente con permisos de grupo · servicio active.',
    tasks: [
      'sudo pacman -S samba',
      'su · mkdir -p /srv/samba/publico /etc/samba · chmod 2775 /srv/samba/publico',
      'nano /etc/samba/smb.conf → sección [global] + [publico] con path y read only = no',
      'sudo systemctl start smb (ubuntu: sudo systemctl start smbd)',
    ],
    hints: [
      'sudo pacman -S --noconfirm samba',
      'su → mkdir -p /srv/samba/publico /etc/samba → chmod 2775 /srv/samba/publico',
      'nano /etc/samba/smb.conf: [publico] con path = /srv/samba/publico y read only = no',
      'sudo systemctl start smb  ·  systemctl is-active smb',
    ],
    validate(session) {
      const pkgOk = session.state.pkgs.arch.installed['samba'] !== undefined || session.state.pkgs.debian.installed['samba'] !== undefined
      if (!pkgOk) return { pass: false, detail: 'falta instalar samba' }
      let conf = ''
      try { conf = session.vfs.readFile('/etc/samba/smb.conf') } catch { /* falta */ }
      if (!conf.trim()) return { pass: false, detail: 'no existe /etc/samba/smb.conf (en arch hay que crearlo)' }
      if (!/\[publico\]/i.test(conf)) return { pass: false, detail: 'smb.conf no tiene la sección [publico]' }
      if (!/path\s*=\s*\/srv\/samba\/publico/i.test(conf)) return { pass: false, detail: 'la sección [publico] no declara path = /srv/samba/publico' }
      if (!/read\s*only\s*=\s*no/i.test(conf)) return { pass: false, detail: 'el share debe permitir escritura: read only = no' }
      const d = session.vfs.get('/srv/samba/publico')
      if (!session.vfs.isDir('/srv/samba/publico')) return { pass: false, detail: 'no existe el directorio /srv/samba/publico' }
      if (((d?.mode ?? 0) & 0o2000) !== 0o2000) return { pass: false, detail: `el directorio debe llevar setgid (chmod 2775); ahora: ${(d?.mode ?? 0).toString(8)}` }
      if (!session.state.services?.['samba']?.active) return { pass: false, detail: `smbd no está activo (sudo systemctl start ${session.distro === 'arch' ? 'smb' : 'smbd'})` }
      return { pass: true, detail: 'Samba instalado, share declarado, directorio con setgid y demonio activo' }
    },
  },
  related: RELATED,
}
