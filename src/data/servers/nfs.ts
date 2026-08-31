/* Curso NFS — Network File System */
import { cmd, danger, deep, file, h, info, ol, out, p, tip, tbl, ul, warn } from '../helpers'
import type { QuizData } from '../../types'
import { srvModule } from './types'
import type { RelatedLink } from './types'
import type { ServerCourse } from './types'

const q1: QuizData = {
  id: 'nfs-quiz-root-squash',
  difficulty: 'intermediate',
  question: 'Como root en el CLIENTE, creas un fichero en el mount NFS y aparece como dueño nobody:nogroup. ¿Por qué?',
  options: [
    { text: 'Error de permisos en el export', why: 'No es error: es exactamente lo que la seguridad del export pretende.' },
    { text: 'root_squash está activo (por defecto)', why: 'Correcto: NFS aplasta el UID 0 a anónimo para que un root cliente no sea root EN TU SERVIDOR.' },
    { text: 'El usuario nobody está mal creado', why: 'nobody es un usuario legítimo y deseado aquí; funciona como debe.' },
    { text: 'Falta sync en /etc/exports', why: 'sync controla escrituras a disco, no mapeo de identidades.' },
  ],
  answer: 1,
}


/* Recomendaciones basadas en relaciones REALES del contenido:
   · 📂 Samba → cuando hay Windows en la red
   · Almacenamiento → fstab, montajes y _netdev/nofail
   · Usuarios y permisos → UIDs coherentes entre cliente y servidor */
const RELATED: RelatedLink[] = [
  { label: '📂 Samba', kind: 'course', to: 'samba' },
  { label: 'Almacenamiento', kind: 'section', to: 'storage' },
  { label: 'Usuarios y permisos', kind: 'section', to: 'users' },
]

export const nfsCourse: ServerCourse = {
  id: 'nfs',
  icon: '🗂️',
  title: 'NFS',
  tagline: 'Sistema de ficheros en red nativo de UNIX: exports, permisos, montaje manual y fstab.',
  level: 'intermediate',
  recommended: ['arch', 'debian'],
  minutes: 90,
  keywords: ['nfs', 'exports', 'mount', 'fstab', 'nfs-kernel-server', 'root squash', 'compartir red'],
  prereqs: [
    { label: 'Permisos', icon: 'users', to: '/section/users' },
    { label: 'Almacenamiento/fstab', icon: 'storage', to: '/section/storage' },
    { label: 'systemd', icon: 'expert', to: '/section/expert' },
  ],
  cheatsheetIds: ['systemctl', 'journalctl', 'ss'],
  problemIds: ['srv-nfs-mount-failed', 'srv-nfs-permisos'],
  modules: [
    srvModule('que-es-nfs', '01', 'Qué es NFS', 7, ['Situar NFS frente a SMB'], [
      p('NFS (Network File System) es el protocolo NATIVO de compartición de ficheros del mundo UNIX, nacido en Sun en los 80. El cliente monta un directorio remoto COMO SI FUERA LOCAL: cd, ls, vim funcionan idénticos — ni siquiera las aplicaciones saben que están sobre red.'),
      tbl(['', 'NFS', 'SMB/CIFS'], [
        ['Mundo natural', 'UNIX/Linux ↔ UNIX/Linux', 'Windows ↔ todo'],
        ['Identidades', 'UID/GID numéricos compartidos', 'Usuarios propios de Samba'],
        ['Filosofía', 'Confía en la red (LAN privada)', 'Auth integrada por diseño'],
        ['Rendimiento UNIX-LAN', 'Excelente, kernel-space', 'Bueno'],
      ]),
      info('Cuándo NFS brilla', 'Backups internos, home dirs centralizados, media para varios Linux, VM storage. Si TODOS los clientes son UNIX y la red es tuya: NFS es más simple y rápido. Con Windows en escena: Samba.'),
      warn('NFS NO cifra ni autentica fuerte por sí solo', 'Diseñado para LANs confiables. Para WAN: túnel WireGuard/SSH alrededor, o Kerberos completo (fuera de alcance de este curso). Nunca expongas 2049 a Internet directo.'),
    ]),

    srvModule('arquitectura', '02', 'Arquitectura cliente/servidor', 8, ['Entender RPC, demonios y puertos'], [
      p('El servidor EXPORTA directorios; los clientes los MONTAN. Bajo el capó, NFS usa RPC (Remote Procedure Calls):'),
      file('flujo nfs.txt', `SERVIDOR                              CLIENTE\n/etc/exports ──exportfs──► lista vigente\nnfsd (2049/tcp) ◄──────────── peticiones de fichero\nrpcbind/mountd ◄──────────── negociación inicial de mount\n\nmount -t nfs servidor:/ruta /punto_local` ),
      tbl(['Pieza', 'Puerto', 'Rol'], [
        ['nfsd', '2049/tcp', 'El protocolo propiamente dicho'],
        ['rpcbind', '111/tcp+udp', 'Directorio de servicios RPC'],
        ['mountd', 'dinámico', 'Atiende las peticiones de MOUNT'],
      ]),
      deep('Por qué rpcbind complica firewalls', 'mountd y amigos usan puertos DINÁMICOS anunciados vía rpcbind. En firewall estricto se fijan estáticos (options en Debian; parámetros del daemon en Arch). Concepto a retener: si el ping al puerto 2049 va pero el mount cuelga, revisa 111/tcp y los fijados.'),
      warn('Versiones del protocolo', 'NFSv3 (fragmentado, UDP posible) vs NFSv4 (un puerto 2049 limpio, estados, ACLs, seguridad mejorada). Hoy instala v4.x por defecto — pero encontrarás v3 en NAS antiguos: saberlo evita sorpresas de compatibilidad.'),
    ]),

    srvModule('instalacion', '03', 'Instalación', 6, ['Instalar servidor (y cliente) NFS'], [
      cmd({ caption: '🐧 Arch Linux — servidor' }, 'sudo pacman -S nfs-utils'),
      cmd({ caption: '🟠 Debian / Ubuntu — servidor' }, 'sudo apt update', 'sudo apt install nfs-kernel-server'),
      cmd({ caption: 'CLIENTES (ambas familias)' }, '# 🐧 Arch:  sudo pacman -S nfs-utils   (mismo paquete)\n# 🟠 ubuntu: sudo apt install nfs-common'.split('\n').join('\n')),
      info('Un paquete, dos nombres, mismo contenido', 'Arch empaqueta TODO en nfs-utils (server+client). Ubuntu separa: nfs-kernel-server arrastra nfs-common (cliente). Instalar el server ya deja el cliente listo en ambas — útil para probar server y cliente en la MISMA máquina como haremos en el laboratorio.'),
      cmd({ caption: 'verificar instalación' }, 'which exportfs', 'systemctl status nfs-server   # ubuntu: nfs-kernel-server'),
    ]),

    srvModule('exportaciones', '04', 'Exportaciones', 9, ['Declarar qué compartes y con quién'], [
      p('/etc/exports es la lista maestra: cada línea = UN directorio + clientes + opciones entre paréntesis. Sintaxis compacta donde cada espacio cambia el significado — léela como lenguaje legal:'),
      file('/etc/exports', `/srv/nfs/publico   192.168.1.0/24(rw,sync,no_subtree_check)\n/srv/nfs/media     *(ro,sync)\n/srv/nfs/backup    192.168.1.50(rw,sync,no_root_squash)`),
      h('Gramática exacta (los espacios importan)'),
      ul(
        '192.168.1.0/24(rw…) SIN espacio → esas opciones PARA esa red.',
        '192.168.1.0/24 (rw…) CON espacio → ¡red sin opciones Y opciones para EL MUNDO! Bug clásico con consecuencias reales.',
        '* = cualquier host (evítalo salvo labs); puedes listar varias redes separadas por espacios.',
      ),
      tbl(['Opción', 'Significado real'], [
        ['rw / ro', 'Lectura-escritura o solo lectura (default ro)'],
        ['sync', 'Responde tras escribir a disco: seguro, algo más lento'],
        ['root_squash (default)', 'UID 0 del cliente → nobody: root ajeno NO es root aquí'],
        ['no_root_squash', 'Root del cliente actúa como root local: SOLO para backups/PXE conscientes'],
        ['no_subtree_check', 'Evita errores raros al exportar subdirectorios: recomendada casi siempre'],
      ]),
      cmd({ caption: 'activar cambios' }, 'sudo exportfs -ra        # re-exportar TODO tras editar', 'sudo exportfs -v         # ver exports VIGENTES con opciones'),
      out('salida de -v', `/srv/nfs/publico  192.168.1.0/24(sync,wdelay,hide,no_subtree_check,rw,...)`),
      tip('exportfs -ra vs restart', '-ra aplica cambios AL INSTANTE sin cortar conexiones de clientes montados. restart obliga a todos a remontar. Rutina profesional: edita → exportfs -ra → exportfs -v verifica.'),
    ]),

    srvModule('permisos', '05', 'Permisos', 9, ['Dominar squashing y UID coherentes'], [
      p('NFS transmite UID/GID NUMÉRICOS sin traducir: tu uid=1000 en el cliente ES uid=1000 en el servidor. Esto implica una regla de oro: usuarios con igual uid deben existir en ambos lados (o usar LDAP/NIS fuera de este curso). Desincronización de uids = «puedo leer pero no escribir» misterioso.'),
      h('El squashing: seguridad por defecto inteligente'),
      file('mapeo de identidades', `root en cliente (uid 0)\n   │ root_squash (DEFAULT)\n   ▼\nnobody:nogroup en servidor  ← no puede tocar nada valioso\n\nusuario ana (uid 1001) cliente\n   │ (sin squash)\n   ▼\nuid 1001 en servidor → necesita permisos POSIX normales`),
      cmd({ caption: 'preparar directorios con permisos correctos' }, 'sudo mkdir -p /srv/nfs/publico', 'sudo chown nobody:nobody /srv/nfs/publico     # arch usa nobody:nobody', 'sudo chmod 2775 /srv/nfs/publico', '# ubuntu suele ser nobody:nogroup — compruébalo con id nobody'),
      danger('no_root_squash es una pistola cargada', 'Un cliente comprometido con root comprometido = root EN TU SERVIDOR vía NFS. Solo para casos justificados (instalaciones PXE, backup servers dedicados), nunca en exports generales. Si un tutorial te lo manda sin explicar: desconfía.'),
    ]),

    srvModule('montaje', '06', 'Montaje en cliente', 9, ['Montar manualmente y verificar'], [
      cmd({ caption: 'montaje manual básico' }, 'sudo mkdir -p /mnt/publico', 'sudo mount -t nfs4 192.168.1.10:/srv/nfs/publico /mnt/publico'),
      out('verificación' , `mount | grep nfs4\n192.168.1.10:/srv/nfs/publico on /mnt/publico type nfs4 ...\ndf -h /mnt/publico   → tamaño del sistema de ficheros REAL del servidor`),
      ul(
        'La sintaxis servidor:/ruta usa DOS PUNTOS — distingue NFS de otros filesystems.',
        'nfs4 explícito cuando el server soporta v4 (hoy casi siempre): menos puertos, mejores semánticas.',
        'Tras montar: touch prueba && ls -l → el DUEÑO revela el mapeo de UIDs del módulo anterior.',
      ),
      warn('Errores típicos y su traducción', 'Cada mensaje apunta a una capa distinta:'),
      ul(
        '«mount.nfs: Connection timed out» → firewall (111/2049) o IP errónea.',
        '«access denied by server» → tu IP no está en /etc/exports o exportfs -ra pendiente.',
        'Monta OK pero Permission denied DENTRO → capa POSIX (dueños/modos), no NFS.',
      ),
    ]),

    srvModule('montaje-automatico', '07', 'Montaje automático (fstab)', 9, ['Persistir mounts de forma robusta'], [
      p('fstab hace el mount permanente. Pero NFS añade requisitos de ROBUSTEZ que un disco interno no tiene: puede estar APAGADO cuando arrancas.'),
      file('/etc/fstab (cliente)', `192.168.1.10:/srv/nfs/publico  /mnt/publico  nfs4  _netdev,nofail,x-systemd.automount,x-systemd.idle-timeout=600  0  0`),
      h('Cada opción existe POR algo'),
      ul(
        '_netdev: «esto necesita red» → espera a network-online.target antes de intentar.',
        'nofail: si el servidor cae, el boot CONTINÚA sin él (¡sin esto, un NAS apagado bloquea tu arranque!).',
        'x-systemd.automount: monta LA PRIMERA VEZ QUE ACCEDES — arranque instantáneo aunque el server tarde.',
        'idle-timeout=600: desmonta tras 10 min sin uso (ahorra recursos en portátiles).',
      ),
      cmd({ caption: 'aplicar y probar sin reiniciar' }, 'sudo systemctl daemon-reload', 'sudo mount -a          # monta lo pendiente de fstab', 'ls /mnt/publico'),
      danger('Prueba fstab ANTES del próximo reboot', 'Un fstab roto puede dejar el sistema en emergency mode. Tras editarlo SIEMPRE: findmnt --verify (valida sintaxis) + mount -a (prueba real). La regla de oro del módulo Almacenamiento aplica doble con NFS.'),
    ]),

    srvModule('systemd', '08', 'Servicios systemd implicados', 6, ['Qué unidades gestionan NFS y cómo comprobarlas'], [
      tbl(['Unidad', 'Familia Arch', 'Familia Debian'], [
        ['Servidor', 'nfs-server.service', 'nfs-kernel-server.service'],
        ['Cliente', 'nfs-client.target (auto con mount)', 'igual vía nfs-common'],
        ['RPC', 'rpcbind.service', 'rpcbind.service'],
      ]),
      cmd({ caption: 'el ciclo del servidor' }, 'sudo systemctl enable --now nfs-server   # ubuntu: nfs-kernel-server', 'systemctl status nfs-server', 'ss -tlnp | grep -E "2049|111"'),
      out('escuchas esperadas', `tcp LISTEN 0 64 0.0.0.0:2049 ...  users:(("nfsd",...))\ntcp LISTEN 0 4096 0.0.0.0:111  ... users:(("rpcbind",...))`),
      info('En la simulación', 'systemctl status nfs-server (arch) o nfs-kernel-server (ubuntu) refleja el estado virtual real; el laboratorio final exige active + enabled.'),
    ]),

    srvModule('seguridad', '09', '🔐 Seguridad', 8, ['NFS confía: protégelo por capas'], [
      danger('El modelo de confianza de NFS es su talón', 'Sin Kerberos, cualquier máquina que falsifique su IP/UID puede hablar con tus exports. NFS asume red amiga: TU trabajo es hacerla amiga de verdad.'),
      ol(
        'Firewall por ORIGEN: ufw allow from 192.168.1.0/24 to any port 2049 (+111). Jamás Anywhere.',
        'Exports a HOSTS/REDES concretas, nunca *: la línea de /etc/exports ES tu primera ACL.',
        'root_squash NUNCA quitado sin causa documentada (módulo 05).',
        'RO cuando baste: media y lectura pública no necesitan rw.',
        'WAN solo bajo túnel cifrado (WireGuard): NFS plano no viaja seguro.',
        'Kerberos (sec=krb5) para entornos serios multiusuario — sábelo existir.',
      ),
      cmd({ caption: 'auditoría rápida del servidor' }, 'sudo exportfs -v                     # ¿qué ofrezco y a quién?', 'sudo ss -tlnp | grep -E "2049|111"    # ¿escucho para todos?', 'sudo ufw status numbered             # ¿quién puede llegar?'),
    ]),

    srvModule('troubleshooting', '10', 'Troubleshooting', 8, ['Diagnosticar mount fallido y problemas de acceso'], [
      ol(
        '¿Server vivo? systemctl status nfs-server + ss -tlnp | grep 2049.',
        '¿Exportado? exportfs -v en el SERVER: tu IP debe figurar con opciones esperadas.',
        '¿Firewall? desde cliente: timeout → puertos; access denied by server → exports.',
        '¿RPC? rpcinfo -p servidor muestra el mapa RPC vivo (111).',
        'Ya montado, ¿permisos? touch test → dueño resultante vs expectativa (squash/uids).',
      ),
      cmd({ caption: 'herramientas del diagnóstico' }, 'showmount -e 192.168.1.10      # ¿qué exporta para MÍ?', 'rpcinfo -p 192.168.1.10        # mapa de servicios RPC', 'sudo mount -v -t nfs4 …        # verboso: narra el intento'),
      out('showmount sano', `Export list for 192.168.1.10:\n/srv/nfs/publico 192.168.1.0/24`),
      tbl(['Mensaje', 'Causa', 'Módulo'], [
        ['Connection timed out', 'Firewall/IP/ruta', '09·03'],
        ['access denied by server', 'IP ausente en exports', '04'],
        ['Permission denied dentro', 'POSIX/squash/uids', '05'],
        ['Stale file handle', 'Export cambió: remount', '04'],
      ]),
      info('Solucionador integrado', '«mount.nfs: access denied», «timed out» y los problemas de permisos tienen fichas en Troubleshooting de ArchForge.'),
    ]),

    srvModule('laboratorio', '11', 'Laboratorio', 16, ['Exportar un directorio y montarlo en la misma máquina'], []),
  ],
  lab: {
    objective: 'Configura el servidor NFS completo: instala nfs-utils, crea /srv/nfs/publico (nobody + setgid), expórtalo a tu LAN en /etc/exports con rw,sync,no_subtree_check, activa el servicio y verifica con exportfs -v.',
    intro: 'Estado FINAL: nfs-utils instalado · directorio preparado · export declarado · nfs-server active+enabled.',
    tasks: [
      'sudo pacman -S nfs-utils',
      'su · mkdir -p /srv/nfs/publico · chown nobody:nobody /srv/nfs/publico · chmod 2775 /srv/nfs/publico',
      'nano /etc/exports → /srv/nfs/publico 192.168.1.0/24(rw,sync,no_subtree_check)',
      'sudo systemctl enable --now nfs-server',
      'sudo exportfs -ra · sudo exportfs -v',
    ],
    hints: [
      'sudo pacman -S --noconfirm nfs-utils',
      'su → mkdir/chown/chmod del directorio',
      '/etc/exports: /srv/nfs/publico 192.168.1.0/24(rw,sync,no_subtree_check)',
      'sudo systemctl enable --now nfs-server  ·  sudo exportfs -ra',
    ],
    validate(session) {
      const pkgOk = session.state.pkgs.arch.installed['nfs-utils'] !== undefined || session.state.pkgs.debian.installed['nfs-kernel-server'] !== undefined
      if (!pkgOk) return { pass: false, detail: 'falta instalar nfs-utils (ubuntu: nfs-kernel-server)' }
      if (!session.vfs.isDir('/srv/nfs/publico')) return { pass: false, detail: 'no existe /srv/nfs/publico' }
      const d = session.vfs.get('/srv/nfs/publico')!
      const ownerOk = d.owner === 'nobody'
      if (!ownerOk) return { pass: false, detail: `el directorio debe pertenecer a nobody (ahora: ${d.owner})` }
      if ((d.mode & 0o2000) !== 0o2000) return { pass: false, detail: 'falta el bit setgid (chmod 2775)' }
      let exportsFile = ''
      try { exportsFile = session.vfs.readFile('/etc/exports') } catch { /* falta */ }
      if (!exportsFile.trim()) return { pass: false, detail: 'no existe /etc/exports con contenido' }
      if (!/\/srv\/nfs\/publico\s+\S*\(.*rw.*\)/i.test(exportsFile)) return { pass: false, detail: '/etc/exports no declara /srv/nfs/publico con rw entre paréntesis (sin espacio antes del paréntesis)' }
      const svcId = 'nfs'
      if (!session.state.services?.[svcId]?.active) return { pass: false, detail: `nfs-server no está activo (sudo systemctl enable --now ${session.distro === 'arch' ? 'nfs-server' : 'nfs-kernel-server'})` }
      return { pass: true, detail: 'NFS instalado, directorio con nobody+setgid, export rw declarado y servicio activo' }
    },
  },
  related: RELATED,
}
