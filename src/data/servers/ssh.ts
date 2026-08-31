/* Curso SSH — servidor sshd, claves y endurecimiento */
import { cmd, danger, deep, file, h, info, ol, out, p, tip, tbl, ul, warn } from '../helpers'
import type { QuizData } from '../../types'
import { srvModule } from './types'
import type { RelatedLink } from './types'
import type { ServerCourse } from './types'

const q1: QuizData = {
  id: 'ssh-quiz-claves',
  difficulty: 'beginner',
  question: 'Tras copiar tu clave pública con ssh-copy-id, el servidor SIGUE pidiendo contraseña. ¿Qué verificas primero en el SERVIDOR?',
  options: [
    { text: 'Que ~/.ssh/authorized_keys exista y contenga tu clave', why: 'Correcto: es el único fichero que el servidor lee para aceptar claves. Sin él (o sin permisos correctos) cae siempre a contraseña.' },
    { text: 'Que el puerto 22 esté abierto', why: 'Si te pide contraseña, ya hay conexión: el puerto funciona.' },
    { text: 'Que ssh-keygen haya generado la clave', why: 'Si ssh-copy-id funcionó, la clave existe; el problema está del lado servidor.' },
    { text: 'Que PasswordAuthentication esté en yes', why: 'Eso permitiría AMBOS métodos; no explica por qué falla solo la clave.' },
  ],
  answer: 0,
}


/* Recomendaciones basadas en relaciones REALES del contenido:
   · 🌐 Servidor web Nginx → despliega tus primeros sitios vía SSH
   · Seguridad → modelo de amenazas y mínimo privilegio
   · Firewall → ufw limit ssh y acceso por origen */
const RELATED: RelatedLink[] = [
  { label: '🌐 Servidor web Nginx', kind: 'course', to: 'nginx' },
  { label: 'Seguridad', kind: 'section', to: 'security' },
  { label: 'Firewall', kind: 'section', to: 'firewall' },
]

export const sshCourse: ServerCourse = {
  id: 'ssh',
  icon: '🔐',
  title: 'Servidor SSH',
  tagline: 'Acceso remoto seguro: sshd, claves ed25519, authorized_keys, endurecimiento y diagnóstico.',
  level: 'beginner',
  recommended: ['arch', 'debian'],
  minutes: 120,
  keywords: ['ssh', 'sshd', 'sshd_config', 'clave publica', 'authorized_keys', 'ssh-keygen', 'ed25519', 'puerto 22'],
  prereqs: [
    { label: 'Usuarios y permisos', icon: 'users', to: '/section/users' },
    { label: 'Terminal/Bash básico', icon: 'bash', to: '/section/bash' },
  ],
  cheatsheetIds: ['systemctl', 'journalctl', 'ssh', 'ssh-keygen'],
  problemIds: ['srv-ssh-refused', 'srv-ssh-permission-denied', 'srv-ssh-clave-rechazada'],
  modules: [
    srvModule('que-es-ssh', '01', 'Qué es SSH', 7, ['Entender qué aporta SSH frente a los protocolos que reemplazó'], [
      p('SSH (Secure Shell) da terminal remota Y transferencias cifradas. Reemplazó a telnet/rsh porque TODO viaja cifrado y con autenticación fuerte: ni contraseñas ni comandos son legibles en el camino. Es LA herramienta de administración de servidores Linux — casi ningún profesional toca un servidor sin él.'),
      p('Además de shell, SSH tunela otros protocolos (SFTP para ficheros, reenvío de puertos X11/TCP), lo que convierte al demonio sshd en la puerta de entrada multiuso de cualquier servidor.'),
      tbl(['Protocolo', 'Puerto', 'Cifrado', 'Estado actual'], [
        ['telnet', '23', 'Ninguno', 'Obsoleto: contraseñas en claro'],
        ['rsh/rexec', 'varios', 'Ninguno', 'Muerto históricamente'],
        ['SSH', '22', 'Total (AES/ChaCha20)', 'Estándar absoluto'],
      ]),
      info('Implementación', 'OpenSSH es la suite dominante (cliente ssh + servidor sshd). En Arch el paquete openssh trae ambos; en Debian se separan: openssh-client (preinstalado) y openssh-server (a instalar).'),
    ]),

    srvModule('cliente-servidor', '02', 'Cliente y servidor', 8, ['Distinguir roles, binarios y ficheros de cada lado'], [
      p('SSH es cliente/servidor estricto: el SERVIDOR (sshd) escucha en 22/tcp esperando conexiones; el CLIENTE (ssh) inicia todas ellas. Tu portátil suele tener cliente; un servidor recién instalado NO tiene servidor hasta que lo instales tú.'),
      tbl(['Lado', 'Binario', 'Configuración', 'Claves'], [
        ['Servidor', 'sshd', '/etc/ssh/sshd_config', 'host keys en /etc/ssh/ssh_host_*'],
        ['Cliente', 'ssh', '~/.ssh/config (por usuario)', '~/.ssh/id_ed25519 + .pub'],
      ]),
      h('Las tres familias de claves que conviene no confundir'),
      ul(
        'Host keys (servidor): identidad DEL SERVIDOR. Generadas al instalar; su huella es lo que verificas ante «host key changed».',
        'Claves de usuario (cliente): TU identidad. Par público/privado; la pública vive en el servidor.',
        'authorized_keys (servidor): la lista de claves públicas ACEPTADAS por cada usuario.',
      ),
      deep('¿Por qué existe known_hosts?', 'Primera vez que conectas, el cliente guarda la host key del servidor en ~/.ssh/known_hosts. Si un día cambia SIN motivo, ssh avisa (posible MITM). Ese mecanismo de confianza-en-primer-uso es la razón de los famosos warnings de host key.'),
    ]),

    srvModule('instalacion', '03', 'Instalación', 6, ['Instalar el servidor SSH en ambas familias'], [
      cmd({ caption: '🐧 Arch Linux' }, '# 🐧 Arch Linux — paquete único cliente+servidor:', 'sudo pacman -S openssh'),
      cmd({ caption: '🟠 Debian / Ubuntu' }, '# 🟠 Debian / Ubuntu — paquete separado:', 'sudo apt update', 'sudo apt install openssh-server'),
      warn('Ubuntu instala y ARRANCA automáticamente', 'A diferencia de Arch, apt activa sshd inmediatamente con contraseña habilitada. En un VPS público esos primeros minutos son ventana de ataque: termina el endurecimiento (módulos 10–12) ANTES de abrir puertos al mundo.'),
      cmd({ caption: 'verificar instalación' }, 'which sshd || which /usr/sbin/sshd', 'systemctl status sshd   # ubuntu: systemctl status ssh'),
      out('estado inicial (arch)', `○ sshd.service - OpenSSH Daemon\n     Loaded: loaded (...; disabled)\n     Active: inactive (dead)`),
      info('El nombre de la unidad cambia entre familias', 'Arch: sshd.service · Ubuntu: ssh.service. Mismo demonio, distinta convención de empaquetado. Los alias (systemctl status sshd en ubuntu) suelen resolver, pero conocer el nombre REAL evita sorpresas en scripts.'),
    ]),

    srvModule('sshd', '04', 'sshd', 7, ['Arrancar, habilitar y verificar el demonio'], [
      p('Arrancar (start) y hacer permanente (enable) son acciones DISTINTAS que systemd mantiene separadas a propósito:'),
      cmd({}, '# start = arrancar AHORA (no persiste tras reboot)\nsudo systemctl start sshd\n# enable = arrancar en CADA arranque (no inicia nada hoy)\nsudo systemctl enable sshd\n# la forma idiomática hace ambas:\nsudo systemctl enable --now sshd'),
      p('enable crea el symlink en multi-user.target.wants/: systemd leerá esa lista en cada boot. No inicia NADA en este momento — confusión clásica de principiantes que hacen enable y creen que el servicio ya corre.'),
      cmd({ caption: 'verificación completa' }, 'systemctl is-active sshd', 'systemctl is-enabled sshd', 'ss -tlnp | grep :22'),
      out('todo sano', `active\nenabled\ntcp LISTEN 0 128 0.0.0.0:22 0.0.0.0:* users:(("sshd",pid=1250,fd=3))`),
    ]),

    srvModule('configuracion', '05', 'Configuración', 10, ['Leer y editar sshd_config con criterio'], [
      p('/etc/ssh/sshd_config usa directivas Clave Valor (una por línea, # como comentario). El fichero de fábrica viene casi todo comentado mostrando DEFAULTS: descomentar solo tiene sentido para CAMBIAR el valor.'),
      file('/etc/ssh/sshd_config (fragmento típico)', `Port 22                          # o un puerto alto si decides cambiarlo\nPermitRootLogin no               # nadie entra como root directamente\nPasswordAuthentication yes       # yes SOLO hasta tener claves (módulo 11)\nPubkeyAuthentication yes         # claves públicas: el objetivo final\nX11Forwarding no                 # no necesario en servidores`),
      danger('Tras editar sshd_config SIEMPRE: validar + reiniciar', 'Un error de sintaxis puede dejar sshd incapaz de arrancar EN EL PRÓXIMO REBOOT aunque tu sesión actual siga viva. Rutina sagrada: sudo sshd -t (valida) → sudo systemctl restart sshd → prueba desde OTRA terminal antes de cerrar la actual.'),
      tip('La regla de oro del administrador', 'Nunca cierres la sesión SSH que funciona hasta probar una conexión NUEVA con la config aplicada. Es tu única red de seguridad contra quedarte fuera de un servidor remoto.'),
    ]),

    srvModule('usuarios', '06', 'Usuarios', 6, ['Controlar QUIÉN puede entrar'], [
      p('Por defecto cualquier usuario local con contraseña puede entrar por SSH. En servidores reales se acota explícitamente:'),
      file('directivas de control de acceso', `AllowUsers ana carlos        # lista blanca explícita\n# o por grupos:\nAllowGroups admins           # solo miembros del grupo admins`),
      ul(
        'AllowUsers/AllowGroups son listas BLANCAS: lo no listado queda bloqueado. Más seguro que denegar.',
        'DenyUsers existe, pero las listas negras envejecen mal: siempre aparece un usuario nuevo que olvidaste denegar.',
        'Root debe estar SIEMPRE fuera (PermitRootLogin no): los bots atacan root primero.',
      ),
      cmd({ caption: 'crear usuario administrador de ejemplo' }, 'sudo useradd -m -s /bin/bash ana', 'sudo passwd ana', '# añádela a wheel/sudo según tu distro para sudo:'),
      cmd({ caption: '🐧 Arch Linux' }, 'sudo gpasswd -a ana wheel'),
      cmd({ caption: '🟠 Debian / Ubuntu' }, 'sudo adduser ana sudo'),
    ]),

    srvModule('claves', '07', 'Claves SSH', 9, ['Entender criptografía de clave pública aplicada a SSH'], [
      p('Una clave SSH es un par matemático: PRIVADA (secreto absoluto, nunca sale de tu máquina) y PÚBLICA (puedes pegarla donde quieras). El servidor reta a tu cliente a firmar un dato con la privada; verifica la firma con la pública. La privada JAMÁS viaja por red — eso elimina el robo de credenciales que sufre todo password.'),
      file('relación entre piezas', `CLIENTE                              SERVIDOR\n~/.ssh/id_ed25519        (privada)\n~/.ssh/id_ed25519.pub ──copiar──►  ~/.ssh/ana/authorized_keys\n                                   (la lista de públicas aceptadas)`),
      tbl(['Algoritmo', 'Veredicto actual'], [
        ['ed25519', 'Recomendado: moderno, rápido, clave corta'],
        ['rsa ≥ 3072 bits', 'Válido si necesitas compatibilidad antigua'],
        ['dsa', 'PROHIBIDO (roto hace años)'],
        ['ecdsa', 'Correcto pero innecesario teniendo ed25519'],
      ]),
      info('Frase de contraseña (passphrase)', 'ssh-keygen pregunta una passphrase: cifra la CLAVE PRIVADA en tu disco. Así, aunque te roben el portátil, la clave inútil. Con ssh-agent la tecleas una vez por sesión. Contraseña del sistema ≠ passphrase de la clave: conceptos separados.'),
    ]),

    srvModule('ssh-keygen', '08', 'ssh-keygen', 7, ['Generar tu par ed25519 correctamente'], [
      cmd({ caption: 'generación moderna (común a ambas distros)' }, 'ssh-keygen -t ed25519 -C "ana@archforge"'),
      out('diálogo completo', `Generating public/private ed25519 key pair.\nEnter file in which to save the key (/home/ana/.ssh/id_ed25519):\nEnter passphrase (empty for no passphrase): ********\nYour identification has been saved in /home/ana/.ssh/id_ed25519\nYour public key has been saved in /home/ana/.ssh/id_ed25519.pub\nThe key fingerprint is:\nSHA256:nThbg6kXUpJWGl7E1IGOCspRomTxdCARLviKw6E5SY8 ana@archforge`),
      ul(
        '-t ed25519 elige algoritmo; -C es solo una ETIQUETA legible (aparecerá en logs y authorized_keys).',
        'Aceptar la ruta por defecto evita dolores: ssh busca ahí automáticamente.',
        'La .pub es UNA línea: tipo espacio base64 espacio-comentario. Eso es lo que copias al servidor.',
      ),
      cmd({ caption: 'ver tu clave pública (jamás la privada)' }, 'cat ~/.ssh/id_ed25519.pub'),
      out('formato', `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI... ana@archforge`),
      danger('La privada no se comparte NI se pega en tickets/chats', 'id_ed25519 (sin .pub) es tu identidad. Quien la posea ES tú. Si sospechas fuga: genera otra, distribuye la nueva, borra la vieja de todos los authorized_keys.'),
      info('En la simulación', 'ssh-keygen -t ed25519 funciona en la terminal virtual: crea ~/.ssh/id_ed25519 y .pub reales dentro del VFS, con permisos 700/600 correctos. El laboratorio final los valida.'),
    ]),

    srvModule('authorized-keys', '09', 'authorized_keys', 8, ['Instalar tu pública en el servidor'], [
      p('El servidor acepta exactamente las claves listadas en ~/.ssh/authorized_keys DE CADA USUARIO. Dos caminos equivalentes: automático (ssh-copy-id, recomendado) o manual (append).'),
      cmd({ caption: 'camino automático (desde el CLIENTE)' }, 'ssh-copy-id ana@192.168.1.10'),
      out('qué hace por ti', `Number of key(s) added: 1\nNow try logging into the machine, with:   "ssh 'ana@192.168.1.10'"`),
      cmd({ caption: 'camino manual (equivalente)' }, '# en el cliente, mostrar y copiar:', 'cat ~/.ssh/id_ed25519.pub', '# en el servidor, como ana:', 'mkdir -p ~/.ssh && chmod 700 ~/.ssh', 'echo "ssh-ed25519 AAAA... ana@archforge" >> ~/.ssh/authorized_keys', 'chmod 600 ~/.ssh/authorized_keys'),
      h('Los permisos SON parte del protocolo'),
      p('sshd rechaza silenciosamente (cae a contraseña) si ~/.ssh es más permisiva que 700 o authorized_keys distinta de 600: un directorio escribible por otros podría haber sido manipulado. Este es EL fallo nº1 cuando «la clave no va» y nadie sabe por qué.'),
      info('Practícalo ahora', 'En la terminal virtual: ssh-keygen -t ed25519 → sudo systemctl start sshd → ssh-copy-id user@localhost → ssh user@localhost. El flujo completo funciona y deja estado real inspeccionable.'),
    ]),

    srvModule('permisos', '10', 'Permisos', 6, ['Auditar permisos SSH con un comando'], [
      cmd({ caption: 'auditoría visual rápida' }, 'ls -ld ~/.ssh ~/.ssh/authorized_keys', 'ls -l ~/.ssh/'),
      out('lo CORRECTO', `drwx------  ana ana  ~/.ssh            → 700\n-rw-------  ana ana  ~/.ssh/authorized_keys → 600\n-rw-------  ana ana  ~/.ssh/id_ed25519       → 600\n-rw-r--r--  ana ana  ~/.ssh/id_ed25519.pub   → 644 (pública: ok)`),
      cmd({ caption: 'reparación express si algo difiere' }, 'chmod 700 ~/.ssh', 'chmod 600 ~/.ssh/authorized_keys ~/.ssh/id_ed25519'),
      deep('¿Y el home?', 'Si /home/ana fuera escribible por grupo/otros (777), sshd también protesta: alguien podría renombrar tu .ssh. Home 755 propietario correcto es suficiente. En entornos corporativos con NFS estricto verás StrictModes=yes en sshd_config: es esta comprobación.'),
    ]),

    srvModule('sin-password', '11', 'Desactivar autenticación por contraseña', 8, ['Cerrar la puerta a fuerza bruta definitivamente'], [
      p('Con tus claves funcionando VERIFICADAS, apagar la contraseña transforma la superficie de ataque: la fuerza bruta pasa de «riesgo permanente» a «matemáticamente imposible». Es el cambio de mayor impacto por línea editada en todo el endurecimiento de un Linux.'),
      file('/etc/ssh/sshd_config', `PasswordAuthentication no\nKbdInteractiveAuthentication no\nPubkeyAuthentication yes`),
      cmd({ caption: 'aplicar con la rutina sagrada' }, 'sudo sshd -t                     # valida sintaxis\nsudo systemctl restart sshd', '# DESDE OTRA TERMINAL, sin cerrar la actual:\nssh ana@192.168.1.10             # debe entrar SIN pedir password'),
      danger('Orden irreversible si te equivocas', 'PasswordAuthentication no ANTES de verificar que tu clave entra = quedarte fuera del servidor (necesitarías consola física/VPS rescue). Verifica primero, cierra después. Siempre.'),
      out('cómo confirmas que ya no pide contraseña', `debug1: Authentications that can continue: publickey` ),
      p('Esa línea (con ssh -v) demuestra que el servidor SOLO ofrece publickey: la puerta de contraseña ya no existe ni para los bots.'),
    ]),

    srvModule('cambiar-puerto', '12', 'Cambiar puerto', 7, ['Mover sshd fuera del ruido de escaneos'], [
      p('Cambiar el 22 por defecto (p.ej. 2222) NO aumenta la seguridad real — un escáner serio encuentra el puerto igual. Lo que reduce drásticamente es el RUIDO: miles de bots tontos solo prueban el 22, así que tu log pasa de cientos de intentos diarios a silencio.'),
      file('/etc/ssh/sshd_config', `Port 2222`),
      cmd({ caption: 'aplicar y conectar' }, 'sudo sshd -t && sudo systemctl restart sshd', 'ssh -p 2222 ana@192.168.1.10'),
      ul(
        'Recuerda abrir el nuevo puerto en el firewall ANTES de reiniciar sshd (y cerrar el 22 después).',
        'Con SELinux (ubuntu server) además: semanage port -a -t ssh_port_t -p tcp 2222.',
        'Alternativa más elegante: mantener el 22 y filtrar por firewall/fail2ban — decide por contexto.',
      ),
      warn('Es cosmética, dilo honestamente', 'Presentarlo como «seguridad» infla falsamente tu postura. Útil sí (logs limpios); sustituto de claves+AllowUsers, jamás.'),
    ]),

    srvModule('firewall', '13', 'Firewall', 6, ['Abrir 22 solo donde toque'], [
      p('Un sshd escuchando sin firewall depende SOLO de su propia config. La defensa en profundidad añade la capa de red:'),
      cmd({ caption: 'ufw — común a ambas distros' }, 'sudo ufw allow from 192.168.1.0/24 to any port 22 proto tcp   # solo LAN', '# acceso total (menos seguro):\nsudo ufw allow 22/tcp', 'sudo ufw status verbose'),
      out('regla restrictiva bien puesta', `22/tcp   ALLOW IN   192.168.1.0/24`),
      p('Limitar por ORIGEN (from) es la mejora gratis que casi nadie aplica: si solo administramos desde la oficina/VPN, el resto del mundo ni siquiera ve el puerto abierto. Complemento ideal: ufw limit ssh, que banea temporalmente IPs con demasiados intentos.'),
    ]),

    srvModule('logs', '14', 'Logs', 7, ['Detectar ataques y fallos de auth en journalctl'], [
      cmd({}, 'sudo journalctl -u sshd -n 50 --no-pager     # ubuntu: -u ssh', '# solo intentos fallidos (fuerza bruta visible):\nsudo journalctl -u sshd | grep -i failed | tail'),
      out('patrones que debes reconocer', `sshd[1901]: Failed password for root from 203.0.113.66 port 51234 ssh2\nsshd[1902]: Invalid user admin from 198.51.100.23 port 40222\nsshd[1910]: Accepted publickey for ana from 192.168.1.50 port 51000 ssh2`),
      ul(
        'Failed password for ROOT desde IPs externas = bots genéricos. Si PermitRootLogin no, son ruido inofensivo (pero feo en logs → módulo 12).',
        'Invalid user X = diccionario de usuarios. AllowUsers los neutraliza.',
        'Accepted PUBLICKEY para tu usuario = login sano por clave. Debe ser la ÚNICA forma normal de entrar.',
      ),
      deep('auth.log vs journal', 'En Ubuntu además del journal existe /var/log/auth.log (rsyslog). Contenido equivalente, formato distinto. En Arch solo journal (sin rsyslog por defecto). Saber dónde mirar según distro evita «no encuentro los logs».'),
    ]),

    srvModule('seguridad', '15', '🔐 Seguridad', 10, ['Checklist completo de endurecimiento de SSH'], [
      danger('SSH expuesto a Internet = objetivo nº1', 'Todo servidor público recibe escaneos constantes contra el 22. La pregunta no es SI te atacarán sino CUÁNTO ruido quieres soportar y qué capas pondrás antes de la contraseña.'),
      h('El checklist ordenado por impacto'),
      ol(
        'Claves SÍ, contraseñas NO: PasswordAuthentication no tras verificar acceso (módulo 11). Impacto: elimina fuerza bruta.',
        'PermitRootLogin no: root entra solo con sudo tras login normal.',
        'AllowUsers/AllowGroups explícito: lista blanca de humanos reales.',
        'fail2ban: ban temporal de IPs repetidoras (protección extra y logs limpios).',
        'Firewall por origen: solo redes de administración ven el puerto.',
        '2FA opcional con google-authenticator/pam si el riesgo lo justifica.',
        'Actualiza openssh con el sistema: CVEs de sshd son críticos.',
      ),
      cmd({ caption: 'instalar fail2ban (común)' }, 'sudo pacman -S fail2ban   # ubuntu: sudo apt install fail2ban', 'sudo systemctl enable --now fail2ban', 'sudo fail2ban-client status sshd'),
      out('banes activos', `Status for the jail: sshd\n|- Currently banned:\`  203.0.113.66`),
      tip('Tu postura objetivo', 'publickey-only + root off + AllowUsers + fail2ban + firewall por origen cubre el 95% de escenarios reales. Todo cabe en ~10 líneas de sshd_config y dos comandos de firewall: no hay excusa.'),
    ]),

    srvModule('troubleshooting', '16', 'Troubleshooting', 9, ['Diagnosticar refused, permission denied y clave rechazada'], [
      ol(
        'Connection REFUSED → ¿escucha? ss -tlnp | grep :22. ¿Activo? systemctl status. ¿Puerto cambiado? Prueba ssh -p.',
        'Timed out → firewall/ruta, no sshd: revisa ufw y que la IP sea alcanzable (ping).',
        'Permission denied → autenticación rechazada: mira journalctl -u sshd EN EL SERVIDOR: dirá si probó publickey/password y por qué falló.',
        'Clave ignorada → permisos de ~/.ssh (700) y authorized_keys (600), dueño correcto, home no escribible por otros.',
        'Host key CHANGED → ¿reinstalaste el server? Esperado. Si NO: detente, posible MITM.',
      ),
      cmd({ caption: 'el comando diagnóstico universal' }, 'ssh -v ana@192.168.1.10   # -vvv para máxima verbosidad'),
      out('leer debug1 como un pro', `debug1: Offering public key: /home/ana/.ssh/id_ed25519 ...\ndebug1: Server accepts key: ...        ← ¡aceptada!\ndebug1: Authentications that can continue: publickey,password  ← qué permite el server`),
      tbl(['Mensaje', 'Significado', 'Ir a'], [
        ['Connection refused', 'sshd caído o puerto distinto', 'módulo 04'],
        ['Permission denied (publickey)', 'Server solo acepta claves y la tuya no vale', '09–10'],
        ['Permission denied (password)', 'Contraseña mal o PasswordAuthentication no', '11'],
        ['REMOTE HOST IDENTIFICATION HAS CHANGED!', 'Host key distinta: reinstal o ataque', 'known_hosts'],
      ]),
      info('Solucionador integrado', 'Los tres grandes («Connection refused», «Permission denied», «clave rechazada») tienen ficha paso a paso en Troubleshooting de ArchForge.'),
    ]),

    srvModule('laboratorio', '17', 'Laboratorio', 18, ['Endurecer el SSH local completo en la terminal virtual'], []),
  ],
  lab: {
    objective: 'Completa el ciclo SSH seguro en la máquina virtual: instala openssh, genera clave ed25519, arranca sshd, copia tu clave con ssh-copy-id y conecta usando publickey.',
    intro: 'Estado FINAL: openssh instalado · clave ed25519 creada · authorized_keys presente con permisos 700/600 · sshd active.',
    tasks: [
      'sudo pacman -S openssh (ubuntu: sudo apt install openssh-server)',
      'ssh-keygen -t ed25519',
      'sudo systemctl start sshd (ubuntu: sudo systemctl start ssh)',
      'ssh-copy-id user@localhost',
      'ssh user@localhost → debe autenticar con publickey',
    ],
    hints: [
      'sudo pacman -S --noconfirm openssh',
      'ssh-keygen -t ed25519  → acepta rutas por defecto',
      'sudo systemctl start sshd  ·  ssh-copy-id user@localhost',
      'ssh user@localhost  → busca la línea Authenticated ... publickey',
    ],
    validate(session) {
      const pkgOk = session.state.pkgs.arch.installed['openssh'] !== undefined || session.state.pkgs.debian.installed['openssh-server'] !== undefined
      if (!pkgOk) return { pass: false, detail: 'falta instalar el servidor SSH (openssh / openssh-server)' }
      const pub = (() => { try { return session.vfs.readFile('/home/user/.ssh/id_ed25519.pub') } catch { return '' } })()
      if (!pub.trim()) return { pass: false, detail: 'no existe la clave pública (~/.ssh/id_ed25519.pub) — genera una con ssh-keygen -t ed25519' }
      const ak = (() => { try { return session.vfs.readFile('/home/user/.ssh/authorized_keys') } catch { return '' } })()
      if (!ak.includes('ssh-ed25519')) return { pass: false, detail: 'authorized_keys no contiene tu clave — usa ssh-copy-id user@localhost' }
      const dirMode = session.vfs.get('/home/user/.ssh')?.mode ?? 0
      if ((dirMode & 0o077) !== 0) return { pass: false, detail: `~/.ssh debe ser 700 (ahora ${dirMode.toString(8)})` }
      const akMode = session.vfs.get('/home/user/.ssh/authorized_keys')?.mode ?? 0
      if ((akMode & 0o077) !== 0) return { pass: false, detail: `authorized_keys debe ser 600 (ahora ${akMode.toString(8)})` }
      if (!session.state.services?.['ssh']?.active) return { pass: false, detail: `sshd no está activo (sudo systemctl start ${session.distro === 'arch' ? 'sshd' : 'ssh'})` }
      const conn = session.execute('ssh user@localhost').map((l) => l.text).join('\n')
      session.drain()
      if (!conn.includes('publickey')) return { pass: false, detail: 'ssh user@localhost no autentica por publickey — revisa los pasos anteriores' }
      return { pass: true, detail: 'ciclo SSH completo: clave generada, instalada con permisos correctos y login por publickey' }
    },
  },
  related: RELATED,
}
