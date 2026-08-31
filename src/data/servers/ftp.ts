/* Curso FTP (vsftpd) — con comparativa FTP vs SFTP */
import { cmd, danger, deep, file, h, info, ol, out, p, tip, tbl, ul, warn } from '../helpers'
import type { QuizData } from '../../types'
import { srvModule } from './types'
import type { RelatedLink } from './types'
import type { ServerCourse } from './types'

const q1: QuizData = {
  id: 'ftp-quiz-sftp',
  difficulty: 'beginner',
  question: 'Un cliente necesita subir ficheros por Internet. ¿Qué le recomiendas?',
  options: [
    { text: 'FTP con TLS explícito (FTPS)', why: 'Cifra, pero abre un segundo puerto dinámico que complica firewalls; solo si SFTP no está disponible.' },
    { text: 'SFTP sobre SSH', why: 'Correcto: UN solo puerto (22), cifrado total, reutiliza usuarios del sistema y claves SSH.' },
    { text: 'FTP plano porque es más rápido', why: 'Falso en la práctica: las credenciales viajan en claro; el riesgo supera cualquier ganancia marginal.' },
    { text: 'TFTP', why: 'TFTP es UDP sin autenticación ni listados: para boot PXE/firmware, jamás para transferencias de usuarios.' },
  ],
  answer: 1,
}


/* Recomendaciones basadas en relaciones REALES del contenido:
   · 🔐 Servidor SSH → SFTP es la alternativa segura que el curso recomienda
   · Usuarios y permisos → usuarios dedicados, nologin y jaulas
   · Firewall → rango pasivo y reglas por origen */
const RELATED: RelatedLink[] = [
  { label: '🔐 Servidor SSH', kind: 'course', to: 'ssh' },
  { label: 'Usuarios y permisos', kind: 'section', to: 'users' },
  { label: 'Firewall', kind: 'section', to: 'firewall' },
]

export const ftpCourse: ServerCourse = {
  id: 'ftp',
  icon: '📁',
  title: 'Servidor FTP',
  tagline: 'vsftpd de cero: usuarios, jaulas chroot, modo pasivo… y cuándo usar SFTP en su lugar.',
  level: 'intermediate',
  recommended: ['arch', 'debian'],
  minutes: 100,
  keywords: ['ftp', 'sftp', 'vsftpd', 'chroot', 'passive mode', 'ftps', 'transferencia archivos'],
  prereqs: [
    { label: 'Usuarios y permisos', icon: 'users', to: '/section/users' },
    { label: 'SSH (recomendado)', icon: 'ssh', to: '/section/ssh' },
  ],
  cheatsheetIds: ['systemctl', 'journalctl', 'ss'],
  problemIds: ['srv-ftp-login-falla', 'srv-ftp-pasivo-bloqueado'],
  modules: [
    srvModule('que-es-ftp', '01', 'Qué es FTP', 7, ['Entender el modelo cliente/servidor de FTP'], [
      p('FTP (File Transfer Protocol) es uno de los protocolos más antiguos de Internet (años 70): mueve ficheros entre cliente y servidor con comandos legibles (LIST, RETR, STOR). Durante décadas fue LA forma de publicar webs y compartir ficheros grandes.'),
      p('Su diseño tiene una peculiaridad única entre protocolos comunes: usa DOS canales. Uno de CONTROL (puerto 21) donde viajan comandos y respuestas, y otro de DATOS donde viajan los ficheros y los listados. Esta separación explica la mayoría de sus problemas de firewall.'),
      tbl(['Canal', 'Puerto típico', 'Qué viaja'], [
        ['Control', '21/tcp', 'Comandos (USER, PASS, LIST), respuestas 3-digit'],
        ['Datos (activo)', '20/tcp desde servidor', 'Contenido de ficheros/listados'],
        ['Datos (pasivo)', 'Puertos altos negociados', 'Lo mismo, pero lo abre el cliente'],
      ]),
      warn('El elefante en la habitación', 'FTP plano envía USUARIO Y CONTRASEÑA EN TEXTO CLARO. Cualquiera en el camino (WiFi pública, ISP, proxy) puede leerlos. Este curso te enseña vsftpd porque sigue siendo común en entornos legacy — pero termina explicando cuándo debes elegir SFTP sin dudarlo.'),
    ]),

    srvModule('ftp-vs-sftp', '02', 'FTP vs SFTP', 10, ['Decidir con criterio entre FTP, FTPS y SFTP'], [
      p('SFTP NO es «FTP seguro»: es un protocolo COMPLETAMENTE distinto que corre dentro de una sesión SSH. No comparte ni un byte de formato con FTP, y eso lo cambia todo a favor:'),
      tbl(['', 'FTP / FTPS', 'SFTP'], [
        ['Cifrado', 'Plano o TLS opcional (FTPS)', 'Siempre cifrado (hereda de SSH)'],
        ['Autenticación', 'Usuario/contraseña propias', 'Usuarios del sistema + claves SSH'],
        ['Firewall', 'Doloroso: canal de datos dinámico', 'Un único puerto TCP'],
        ['Servidor necesario', 'vsftpd/proftpd dedicado', 'Ya tienes sshd'],
        ['Auditoría', 'Logs propios', 'journalctl -u sshd como todo SSH'],
      ]),
      h('Cuándo aún tiene sentido FTP(S)'),
      ul(
        'Equipos legacy que SOLO hablan FTP (antiguas fotocopadoras, cámaras industriales, mainframes).',
        'Intercambio anónimo de software público (los mirrors clásicos de distribuciones).',
        'Procesos empresariales antiguos ya auditados y encapsulados en VPN.',
      ),
      danger('Regla profesional honesta', 'Si puedes elegir: SFTP. Sin excepciones nuevas. Monta vsftpd cuando el mundo real te lo imponga — y sabiendo exactamente qué superficie de riesgo abres. La competencia es saber AMBOS y defender la decisión.'),
      info('En este curso', 'Instalaremos vsftpd real para dominar conceptos transferibles (chroot, pasivo, logs), y el laboratorio validará ese flujo completo en la terminal virtual.'),
    ]),

    srvModule('como-funciona', '03', 'Cómo funciona', 8, ['Explicar activo vs pasivo y su impacto'], [
      p('En modo ACTIVO el servidor conecta HACIA el cliente para el canal de datos (desde el 20). Suena lógico, pero tras un NAT doméstico el servidor no puede alcanzar al cliente → conexiones colgadas sin error claro.'),
      file('modos.txt', `MODO ACTIVO\nCliente ──control(21)──► Servidor\nCliente ◄──datos(20)──── Servidor   ← ¡servidor inicia!\n(problema: NAT/firewall del cliente bloquea esa entrada)\n\nMODO PASIVO (PASV)\nCliente ──control(21)──► Servidor\nCliente ──datos(alto)─► Servidor   ← cliente inicia TODO\n(solución moderna: solo hay que abrir el rango pasivo en el SERVIDOR)`),
      p('Por eso hoy se usa SIEMPRE modo pasivo: ambos canales los inicia el cliente, igual que un navegador. El precio es abrir un RANGO de puertos altos en el servidor y declararlo bien — tema del módulo 09.'),
      deep('Respuesta 227 Entering Passive Mode', 'El servidor anuncia ip,p1,p2 donde puerto = p1*256+p2. Si anuncia su IP PRIVADA detrás de NAT, el cliente intentará conectar a 192.168.x.x inalcanzable. vsftpd resuelve esto con pasv_address=IP_PUBLICA — otro clásico de soporte técnico.'),
    ]),

    srvModule('vsftpd', '04', 'vsftpd', 5, ['Conocer por qué vsftpd es el estándar de facto'], [
      p('vsftpd («very secure FTP daemon») es el servidor FTP predeterminado en Ubuntu, Fedora y Arch: pequeño, escrito con paranoia defensiva (privilegios separados, chroot por defecto posible) y configuración en UN solo fichero. Sus rivales proftpd y pure-ftpd ofrecen más módulos, pero vsftpd gana en simplicidad segura — justo lo que quieres en un protocolo heredado.'),
      tbl(['Distribución', 'Paquete', 'Configuración'], [
        ['Arch', 'vsftpd', '/etc/vsftpd.conf'],
        ['Debian/Ubuntu', 'vsftpd', '/etc/vsftpd.conf'],
      ]),
      info('Ruta idéntica en ambas familias', 'Pocas veces ocurre: paquete, demonio y fichero de config se llaman IGUAL en Arch y Debian. Solo cambia el gestor de instalación.'),
    ]),

    srvModule('instalacion', '05', 'Instalación', 5, ['Instalar y comprobar el binario'], [
      cmd({ caption: '🐧 Arch Linux' }, '# 🐧 Arch Linux', 'sudo pacman -S vsftpd'),
      cmd({ caption: '🟠 Debian / Ubuntu' }, '# 🟠 Debian / Ubuntu', 'sudo apt update', 'sudo apt install vsftpd'),
      cmd({ caption: 'verificar (común)' }, 'which vsftpd', 'systemctl status vsftpd'),
      out('estado inicial esperado', `○ vsftpd.service - Very Secure FTP Daemon\n     Loaded: loaded (...; disabled; preset: disabled)\n     Active: inactive (dead)`),
      p('inactive+disabled es el estado correcto recién instalado: primero se configura (siguientes módulos), luego enable+start. Arrancar un FTP antes de endurecerlo regala un servidor de ficheros abierto durante minutos.'),
    ]),

    srvModule('usuarios', '06', 'Usuarios', 8, ['Crear un usuario FTP dedicado sin shell'], [
      p('Buena práctica: un usuario EXCLUSIVO para FTP, con shell nologin para que jamás pueda iniciar sesión interactiva (ni por SSH). Puede escribir ficheros pero no ejecutar comandos: daño potencial mínimo si la contraseña se filtra.'),
      cmd({ caption: 'crear usuario dedicado (común a ambas distros)' }, '# usuario ftpupload sin shell válido:', 'sudo useradd -m -s /usr/sbin/nologin ftpupload', 'sudo passwd ftpupload'),
      out('qué esperar', 'passwd: contraseña actualizada correctamente'),
      warn('nologin y PAM en Debian', 'Ubuntu trae /usr/sbin/nologin en /etc/shells NO incluido por defecto → vsftpd con pam puede rechazar el login («530 Login incorrect»). Solución limpia: añade la ruta a /etc/shells. En Arch vsftpd usa su propia lógica y no suele necesitarlo.'),
      deep('¿Y el usuario root?', 'vsftpd deniega root por lista interna (/etc/ftpusers o userlist). Es deliberado: permitir FTP a root significaría enviar la contraseña maestra en claro. Jamás lo quites.'),
    ]),

    srvModule('directorios', '07', 'Directorios', 6, ['Preparar el directorio de subida con permisos correctos'], [
      p('Con chroot activo (módulo 08), el usuario queda encerrado en SU home. Pero vsftpd exige que la raíz de la jaula NO sea escribible por el usuario (regla de seguridad anti-escalada): la solución canónica es un subdirectorio upload sí escribible.'),
      cmd({ caption: 'estructura recomendada' }, 'sudo mkdir -p /home/ftpupload/upload', 'sudo chown ftpupload:ftpupload /home/ftpupload/upload', 'chmod 755 /home/ftpupload && chmod 755 /home/ftpupload/upload'),
      out('resultado final', `/home/ftpupload          → propietario root, 755 (raíz de jaula, NO escribible)\n/home/ftpupload/upload   → propietario ftpupload, 755 (aquí sí sube)`),
      p('Este patrón (raíz sellada + carpeta de trabajo) parece contraintuitivo hasta que entiendes el porqué: si el proceso FTP fuera comprometido, no podría plantar binarios en la raíz de la jaula ni alterar ficheros de configuración del propio usuario.'),
    ]),

    srvModule('configuracion', '08', 'Configuración', 12, ['Escribir vsftpd.conf con jaulas y usuarios locales'], [
      p('vsftpd.conf es una lista simple directiva=valor SIN espacios alrededor del =. Estas son las líneas de un servidor local seguro:'),
      file('/etc/vsftpd.conf', `# Autenticación\nlocal_enable=YES            # permitir usuarios LOCALES del sistema\nwrite_enable=YES            # permitir SUBIR (STOR), no solo descargar\n\n# Jaula chroot: clave de seguridad\nchroot_local_user=YES       # cada usuario encerrado en SU home\nallow_writeable_chroot=NO   # la raíz de la jaula no debe ser escribible\n\n# Registro\nxferlog_enable=YES          # log de transferencias\nxferlog_std_format=YES\n\n# Bienvenida y banner\nftpd_banner=Bienvenido al FTP de ArchForge`),
      h('Por qué cada bloque importa'),
      ul(
        'local_enable sin write_enable = FTP de solo lectura: útil para mirrors, frustrante para uploads.',
        'chroot_local_user evita que un usuario navegue a /etc y descargue passwd.',
        'anonymous_enable=NO (implícito por defecto moderno): FTP anónimo SOLO si tu caso de uso lo justifica explícitamente.',
      ),
      danger('allow_writeable_chroot=YES', 'Muchos tutoriales lo ponen para «arreglar» el error 500 OOPS. Lo que hacen es desactivar una protección real (plantar binarios en la jaula). La solución correcta es la estructura del módulo anterior: raíz sellada + subcarpeta upload.'),
    ]),

    srvModule('passive-mode', '09', 'Passive mode', 9, ['Configurar el rango pasivo coherente con el firewall'], [
      p('Recuerda el módulo 03: en pasivo el servidor ABRE un puerto alto por transferencia. Debes decirle A QUÉ puertos limitarse y abrir EXACTAMENTE ese rango en el firewall — si no, funcionará desde LAN y fallará misteriosamente desde fuera.'),
      file('añadir a /etc/vsftpd.conf', `pasv_enable=YES\npasv_min_port=40000\npasv_max_port=40100\n# tras NAT, anunciar la IP pública:\n# pasv_address=203.0.113.10`),
      cmd({ caption: 'abrir el mismo rango en el firewall' }, '# ufw (común):', 'sudo ufw allow 21/tcp', 'sudo ufw allow 40000:40100/tcp'),
      p('La coherencia min/max ↔ regla firewall es EL contrato del modo pasivo. Un solo puerto de diferencia produce el síntoma clásico: «el login funciona pero ls se queda pensando» — el control pasa, los datos nunca llegan.'),
      tip('Diagnóstico del síntoma estrella', 'Login OK + LIST colgado = problema de CANAL DE DATOS casi siempre: rango pasivo cerrado, pasv_address mal o FTPS sin puertos pasivos declarados. Guarda esa asociación: te ahorrará horas.'),
    ]),

    srvModule('pruebas', '10', 'Pruebas', 8, ['Verificar el ciclo completo: arrancar, conectar, subir'], [
      cmd({ caption: 'arranque y estado' }, 'sudo systemctl start vsftpd', 'systemctl is-active vsftpd', 'ss -tlnp | grep :21'),
      out('escucha esperada', `tcp LISTEN 0 32 0.0.0.0:21 0.0.0.0:* users:(("vsftpd",pid=1420,fd=3))`),
      cmd({ caption: 'cliente de consola (común a ambas)' }, '# instalar cliente si falta: pacman -S ftp / apt install ftp', 'ftp localhost'),
      out('sesión interactiva mínima', `Name: ftpupload\nPassword: ****\n230 Login successful.\nftp> cd upload\n250 Directory successfully changed.\nftp> put informe.txt\n226 Transfer complete.`),
      p('Códigos de respuesta FTP en 3 dígitos: 2xx éxito, 3xx espera datos, 4xx fallo temporal, 5xx rechazo definitivo (530 login incorrecto, 550 permisos/fichero). Con esta gramática entiendes cualquier diálogo FTP aunque sea la primera vez que lo ves.'),
      info('Prueba en la simulación', 'En la terminal virtual de ArchForge: systemctl status vsftpd y journalctl -u vsftpd reflejan el servicio real simulado; úsalos para validar antes de pulsar Comprobar en el laboratorio.'),
    ]),

    srvModule('logs', '11', 'Logs', 6, ['Leer xferlog y journal'], [
      cmd({}, 'sudo journalctl -u vsftpd -n 30 --no-pager', 'sudo tail -f /var/log/vsftpd.log   # si xferlog activo'),
      out('líneas típicas del journal', `vsftpd[1420]: CONNECT: Client "127.0.0.1"\nvsftpd[1420]: OK LOGIN: Client "127.0.0.1", user "ftpupload"\nvsftpd[1420]: OK UPLOAD: Client "127.0.0.1", "/upload/informe.txt", bytes=1024`),
      p('OK LOGIN vs FAIL LOGIN distingue credenciales válidas de ataque de diccionario en curso: muchos FAIL consecutivos de IPs externas = bots escaneando. El xferlog registra CADA fichero con tamaño y hora: tu evidencia forense si algo se sube que no debía.'),
    ]),

    srvModule('seguridad', '12', '🔐 Seguridad', 10, ['Endurecer FTP o reemplazarlo conscientemente'], [
      danger('Superficie de riesgo inherente', 'Contraseñas en claro (sin TLS), daemon expuesto a Internet escaneado por bots 24/7, historial de vulnerabilidades propio de un protocolo de los 70. FTP plano expuesto directamente NO debe existir hoy.'),
      h('Checklist si DEBES mantenerlo'),
      ol(
        'TLS obligatorio: ssl_enable=YES + force_local_logins_ssl=YES + force_local_data_ssl=YES (FTPS explícito).',
        'Usuarios dedicados con nologin y jaula chroot SIEMPRE (chroot_local_user=YES).',
        'userlist_file con DENY por defecto: userlist_deny=YES y solo nombres permitidos.',
        ' Firewall mínimo: 21/tcp + rango pasivo EXACTO, idealmente restringido por IP de origen.',
        'fail2ban sobre los FAIL LOGIN: ban automático ante fuerza bruta.',
        'VPN o túnel SSH si el cliente lo permite: FTP dentro de VPN vuelve a ser razonable.',
      ),
      cmd({ caption: 'activar TLS (certificado ya generado)' }, 'ssl_enable=YES\nrsa_cert_file=/etc/ssl/certs/tu-cert.pem'.split('\n').map((l) => '# ' + l).join('\n')),
      p('Y el recordatorio del módulo 02: para usos nuevos, SFTP con claves (curso SSH de ArchForge) elimina casi toda esta lista manteniendo la funcionalidad.'),
    ]),

    srvModule('troubleshooting', '13', 'Troubleshooting', 8, ['Diagnosticar login, permisos y modo pasivo con método'], [
      ol(
        '¿Escucha 21? ss -tlnp | grep :21 → no: systemctl status vsftpd + journalctl.',
        '¿Configura válida? vsftpd es quisquilloso: reinicia tras editar y LEE journalctl -u vsftpd.',
        '¿Login falla? 530 = credenciales/PAM (módulo 06); 550 = permisos del directorio (módulo 07).',
        '¿ls cuelga? Canal de datos: revisa rango pasivo y firewall (módulo 09).',
        '¿Subida rechazada? write_enable=YES + propietario correcto del directorio upload.',
      ),
      tbl(['Error visto', 'Traducción', 'Módulo'], [
        ['500 OOPS: cannot change directory', 'Jaula escribible o home inexistente', '07–08'],
        ['530 Login incorrect', 'Contraseña, shell nologin sin /etc/shells (ubuntu), usuario en deny-list', '06'],
        ['553 Could not create file', 'write_enable off o permisos insuficientes', '08'],
        ['LIST se congela', 'Pasivo mal anunciado/cerrado', '09'],
      ]),
      info('Solucionador integrado', '«No puedo hacer login en FTP» y «el listado se cuelga en modo pasivo» están paso a paso en Troubleshooting de ArchForge.'),
    ]),

    srvModule('laboratorio', '14', 'Laboratorio', 18, ['Montar vsftpd completo: usuario, jaula, pasivo y arranque'], []),
  ],
  lab: {
    objective: 'Deja operativo vsftpd: paquete instalado, vsftpd.conf con local_enable+write_enable+chroot, rango pasivo 40000-40100, servicio activo y puerto 21 en escucha.',
    intro: 'Estado FINAL: vsftpd instalado · conf con las 4 directivas clave · servicio active · ss muestra :21.',
    tasks: [
      'instala: sudo pacman -S vsftpd',
      'su · nano /etc/vsftpd.conf → local_enable=YES, write_enable=YES, chroot_local_user=YES, pasv_min_port=40000, pasv_max_port=40100',
      'sudo systemctl start vsftpd',
      'comprueba: systemctl status vsftpd · ss -tlnp | grep :21',
    ],
    hints: [
      'sudo pacman -S --noconfirm vsftpd',
      'su  →  nano /etc/vsftpd.conf  →  añade las directivas',
      'sudo systemctl start vsftpd  ·  systemctl is-active vsftpd',
      'ss -tlnp | grep :21  → debe aparecer vsftpd LISTEN',
    ],
    validate(session) {
      const pkgOk = session.state.pkgs.arch.installed['vsftpd'] !== undefined || session.state.pkgs.debian.installed['vsftpd'] !== undefined
      if (!pkgOk) return { pass: false, detail: 'falta instalar vsftpd' }

      let conf = ''
      for (const c of ['/etc/vsftpd.conf', '/etc/vsftpd/vsftpd.conf']) {
        try { conf += '\n' + session.vfs.readFile(c) } catch { /* next */ }
      }
      if (!conf.trim()) return { pass: false, detail: 'no encuentro /etc/vsftpd.conf' }
      const has = (re: RegExp, what: string): string | null => (re.test(conf) ? null : `falta ${what} en vsftpd.conf`)
      for (const [re, what] of [
        [/local_enable\s*=\s*YES/i, 'local_enable=YES'],
        [/write_enable\s*=\s*YES/i, 'write_enable=YES'],
        [/chroot_local_user\s*=\s*YES/i, 'chroot_local_user=YES'],
        [/pasv_min_port\s*=\s*40000/i, 'pasv_min_port=40000'],
        [/pasv_max_port\s*=\s*40100/i, 'pasv_max_port=40100'],
      ] as [RegExp, string][]) {
        const miss = has(re, what)
        if (miss) return { pass: false, detail: miss }
      }
      if (!session.state.services?.['ftp']?.active) return { pass: false, detail: 'vsftpd no está activo (sudo systemctl start vsftpd)' }
      return { pass: true, detail: 'vsftpd instalado, configurado con jaula y pasivo, y en escucha' }
    },
  },
  related: RELATED,
}
