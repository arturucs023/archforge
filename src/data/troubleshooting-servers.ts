/* Problemas específicos de SERVIDORES: DNS, DHCP, FTP, SSH, Nginx, Apache, Samba y NFS.
   Se fusionan en PROBLEMS desde troubleshooting.ts. */

import type { Problem } from '../types'
import { cmd, danger, file, info, ol, out, p, tip, ul, warn } from './helpers'

export const SERVER_PROBLEMS: Problem[] = [
  /* ---------------------------------- DNS ---------------------------------- */
  {
    id: 'srv-dns-no-responde',
    title: 'El servidor DNS no responde (connection refused / timed out)',
    category: 'Servidores',
    level: 'intermedio',
    severity: 'high',
    symptoms: ['dig devuelve «connection refused»', 'dig se queda en «timed out; no servers could be reached»', 'Los clientes no resuelven NINGÚN nombre'],
    causes: ['named/bind9 parado o fallando al arrancar', 'Firewall bloquea el puerto 53/udp+tcp', 'listen-on apunta a una IP que la máquina no tiene'],
    diagnose: [
      p('Tres comprobaciones en orden — cada una descarta una capa distinta:'),
      cmd({},
        '# 1) ¿el proceso vive?\nsudo systemctl status named        # ubuntu: bind9\n# 2) ¿escucha en :53?\nss -ulpn | grep :53\nss -tlnp | grep :53\n# 3) ¿responde LOCALMENTE el propio server?\ndig @127.0.0.1 archforge.local +short'),
      p('Si status muestra failed → ve al journal. Si está active pero ss no muestra :53 → listen-on mal puesto. Si escucha y dig @127.0.0.1 funciona → el problema es firewall o el cliente apunta a otro sitio.'),
      cmd({}, '# lectura del error concreto:\nsudo journalctl -u named -n 30 --no-pager   # ubuntu: -u bind9'),
    ],
    solutions: [
      {
        title: 'Servicio parado o fallando',
        blocks: [
          cmd({},
            '# arranca y hazlo permanente:\nsudo systemctl enable --now named     # ubuntu: bind9'),
          p('Si falla al arrancar, journalctl nombra fichero y línea del problema típico: sintaxis en named.conf o zona inexistente.'),
          tip('Valida antes de reiniciar', 'sudo named-checkconf detecta errores de configuración SIN arrancar nada. Hábito que evita casi todos estos fallos.'),
        ],
      },
      {
        title: 'Firewall bloquea el 53',
        blocks: [
          cmd({},
            '# ufw:\nsudo ufw allow from 192.168.1.0/24 to any port 53\nsudo ufw allow from 192.168.1.0/24 to any port 53 proto udp\nsudo ufw status | grep 53'),
          warn('DNS usa UDP y TCP', 'Las respuestas grandes (transferencias, TXT largos) viajan por TCP. Abrir solo UDP produce fallos intermitentes difíciles de reproducir.'),
        ],
      },
      {
        title: 'listen-on con IP inexistente',
        blocks: [
          file('/etc/named.conf', 'options {\n    listen-on port 53 { 127.0.0.1; 192.168.1.10; };  # ← ¿EXISTE esa IP aquí?\n};', 'Verifica con ip -br addr que la IP listada esté asignada a una interfaz local.'),
          p('BIND se niega a arrancar si listen-on menciona una IP que no posee la máquina. Es un fallo-seguro deliberado tras copiar configs entre servidores.'),
        ],
      },
    ],
    alternatives: ['Prueba desde otro host para descartar el cliente (dig @192.168.1.10 ...).', 'rndc status muestra estado interno de BIND sin reiniciar.'],
    finalCheck: 'dig @<ip-del-server> <nombre-de-tu-zona> +short responde con autoridad desde un cliente externo.',
  },
  {
    id: 'srv-dns-zona-no-carga',
    title: 'La zona DNS no carga (SERVFAIL / loading failed)',
    category: 'Servidores',
    level: 'intermedio',
    severity: 'medium',
    symptoms: ['dig devuelve SERVFAIL', 'journal dice «zone X/IN: loading failed»', 'Otros dominios responden bien pero el tuyo no'],
    causes: ['Error de sintaxis dentro del fichero de zona', 'Ruta del file en named.conf no coincide con el disco', 'Permisos: BIND no puede leer el fichero como usuario named'],
    diagnose: [
      cmd({},
        'sudo journalctl -u named | grep -i zone\nsudo named-checkzone archforge.local /etc/named/zones/db.archforge.local'),
      out('salidas típicas del checkzone', `db.archforge.local:12: unknown RR type 'Arecord'  ← errata\ndb.archforge.local:5: no owner name at top of zone ← línea suelta\nzone archforge.local/IN: loaded serial 2026010101  ← OK`),
    ],
    solutions: [
      {
        title: 'Corregir sintaxis señalada por named-checkzone',
        blocks: [
          p('El validador indica FICHERO:LÍNEA exactos. Los tres clásicos: punto final faltante en nombres absolutos, registro fuera de cualquier nombre (línea vacía con espacios) y rdata inválido (IP en MX, texto TXT sin comillas).'),
        ],
      },
      {
        title: 'Ruta incorrecta en el bloque zone{}',
        blocks: [
          p('En Arch, file "db.archforge.local" es RELATIVO a directory "/var/named" de options. Si tu fichero vive en /etc/named/zones, o mueves el fichero o usas ruta absoluta. En Debian lo habitual es ruta absoluta completa.'),
          cmd({},
            '# verifica dónde ESTÁ realmente:\nls -l /etc/named/zones/ 2>/dev/null; ls -l /var/named/ 2>/dev/null'),
        ],
      },
      {
        title: 'Permisos de lectura para el usuario named',
        blocks: [
          cmd({},
            '# ¿quién corre BIND? ¿puede leer la zona?\nps aux | grep named | head -2\nnamei -l /etc/named/zones/db.archforge.local\nsudo chown root:named /etc/named/zones/db.archforge.local && chmod 640 /etc/named/zones/db.archforge.local'),
        ],
      },
    ],
    alternatives: ['rndc reload archforge.local recarga SOLO esta zona sin tocar el resto.'],
    finalCheck: 'named-checkzone sale OK, journal ya no registra loading failed y dig @127.0.0.1 devuelve NOERROR con flag aa.',
  },
  {
    id: 'srv-dns-registro-no-resuelve',
    title: 'Un registro específico no resuelve (NXDOMAIN)',
    category: 'Servidores',
    level: 'facil',
    severity: 'low',
    symptoms: ['dig nombre.dominio → NXDOMAIN', 'Otros registros de la MISMA zona sí funcionan'],
    causes: ['El registro no existe (o está mal escrito)', 'Falta el punto final: nombre absoluto interpretado como relativo', 'Serial sin incrementar: los esclavos/caches sirven la versión vieja'],
    diagnose: [
      cmd({},
        'dig @127.0.0.1 sospechoso.archforge.local +short\ngrep -i sospechoso /etc/named/zones/db.archforge.local'),
      p('Si grep NO encuentra la línea: nunca existió o hay typo. Si SÍ existe pero NXDOMAIN: mira la sintaxis de ESA línea (el bug del punto final genera nombres duplicados tipo host.dominio.dominio.).'),
    ],
    solutions: [
      {
        title: 'Añadir/corregir el registro y subir el serial',
        blocks: [
          file('corrección típica', '@ IN SOA ... (\n    2026082501 ; ← SUBE este número SIEMPRE que edites', ),
          cmd({},
            'sudo nano /etc/named/zones/db.archforge.local\n# edita + incrementa serial\nsudo rndc reload archforge.local\ndig @127.0.0.1 sospechoso.archforge.local +short'),
          danger('Editar sin incrementar el serial = cambio invisible', 'Los secundarios comparan el número SOA: si no sube, jamás transferirán tus cambios. Es LA causa de «modifiqué el DNS y nada cambió».'),
        ],
      },
    ],
    alternatives: ['Comprueba TTLs bajos mientras depuras: $TTL 60 hace las pruebas ágiles.'],
    finalCheck: 'El grep localiza el registro, checkzone pasa y dig devuelve el valor esperado.',
  },
  {
    id: 'srv-dns-local-si-remoto-no',
    title: 'DNS funciona localmente pero no desde otros clientes',
    category: 'Servidores',
    level: 'intermedio',
    severity: 'medium',
    symptoms: ['En el servidor todo responde perfecto', 'Desde otro PC: refused/timed out/NXDOMAIN'],
    causes: ['allow-query restringido a localhost', 'Firewall del servidor filtra 53', 'El cliente apunta a otro resolutor (su resolv.conf)'],
    diagnose: [
      p('El servidor ES la autoridad — el corte está ENTRE él y el cliente. Aísla la capa:'),
      cmd({},
        '# EN EL CLIENTE:\ndig @192.168.1.10 server.archforge.local   # fuerza TU servidor\ncat /etc/resolv.conf                       # ¿a quién pregunta de verdad?'),
      out('lectura rápida', `refused al forzar @ip → allow-query/firewall\ntimed out → red/firewall\nresponde @ip pero falla sin @ → el cliente NO usa tu DNS`),
    ],
    solutions: [
      {
        title: 'allow-query demasiado restrictivo',
        blocks: [
          file('/etc/named.conf', 'options {\n    allow-query { localhost; 192.168.1.0/24; };  # incluye TU red\n};'),
          cmd({}, 'sudo named-checkconf && sudo systemctl reload named'),
        ],
      },
      {
        title: 'El cliente pregunta a otro resolutor',
        blocks: [
          p('Con NetworkManager el resolv.conf se regenera: fija tu DNS de forma persistente en el cliente:'),
          cmd({},
            'nmcli con mod "MiWiFi" ipv4.dns "192.168.1.10"\nnmcli con mod "MiWiFi" ipv4.ignore-auto-dns yes\nnmcli con up "MiWiFi"'),
        ],
      },
    ],
    alternatives: ['tcpdump -i any port 53 en el servidor muestra si llegan consultas del cliente: verlas llegar descarta red.'],
    finalCheck: 'Desde el cliente, dig @server +short resuelve Y cat /etc/resolv.conf apunta al server.',
  },

  /* ---------------------------------- DHCP --------------------------------- */
  {
    id: 'srv-dhcp-cliente-sin-ip',
    title: 'El cliente no recibe IP del DHCP',
    category: 'Servidores',
    level: 'intermedio',
    severity: 'high',
    symptoms: ['El cliente queda en 169.254.x.x (APIPA) o sin IP', 'dhclient -v muestra DISCOVER repetidos sin OFFER'],
    causes: ['dhcpd parado o sin escucha en 67/udp', 'Broadcast bloqueado (VLAN/puerto de switch)', 'subnet declarada no coincide con la red real del servidor'],
    diagnose: [
      p('Primero determina si los DISCOVER llegan AL SERVIDOR — eso parte el problema en dos mitades:'),
      cmd({},
        '# EN EL SERVIDOR:\nsudo systemctl status dhcpd            # ubuntu: isc-dhcp-server\nss -ulpn | grep :67\nsudo journalctl -u dhcpd -f            # ¿aparece algún DHCPDISCOVER entrante?'),
      out('dos mundos posibles', `Hay DISCOVERs en el log → el problema es RESPUESTA (pool/config)\nNO llega ninguno       → el problema es RED (broadcast/VLAN)`),
    ],
    solutions: [
      {
        title: 'Servidor vivo pero no ofrece: revisa subnet y pool',
        blocks: [
          file('/etc/dhcp/dhcpd.conf', 'subnet 192.168.1.0 netmask 255.255.255.0 {   # debe COINCIDIR con tu red real\n    range 192.168.1.100 192.168.1.200;\n    option routers 192.168.1.1;\n}'),
          cmd({}, 'sudo dhcpd -t -cf /etc/dhcp/dhcpd.conf   # valida ANTES de restart'),
          p('«No subnet declaration for …» en el log = la subnet declarada no cubre la interfaz donde llegó el DISCOVER.'),
        ],
      },
      {
        title: 'No llega ningún DISCOVER: capa física/red',
        blocks: [
          ul('Cable/AP asociado correcto: prueba IP estática manual en el cliente — si tampoco va, no es tema DHCP.',
             'VLANs: los puertos de cliente deben permitir broadcast de su VLAN; entre VLANs hace falta dhcp relay (ip helper-address).',
             'Un ROUTER doméstico también hace DHCP: dos servidores compitiendo generan comportamientos caóticos.'),
        ],
      },
    ],
    alternatives: ['dhclient -v en el cliente narra el DORA completo: dónde se corta la secuencia orienta el diagnóstico.'],
    finalCheck: 'dhclient obtiene IP del range y journalctl del server registra OFFER+ACK correspondientes.',
  },
  {
    id: 'srv-dhcp-no-inicia',
    title: 'El servidor DHCP no inicia (failed)',
    category: 'Servidores',
    level: 'facil',
    severity: 'medium',
    symptoms: ['systemctl status dhcpd → failed', 'journal menciona errores de configuración o interfaces'],
    causes: ['Sintaxis inválida en dhcpd.conf', 'Ubuntu: INTERFACESv4 mal puesto en /etc/default/isc-dhcp-server', 'Otro proceso ocupa el 67 (raro, pero posible con contenedores)'],
    diagnose: [
      cmd({},
        'sudo journalctl -u dhcpd -n 20 --no-pager\nsudo dhcpd -t -cf /etc/dhcp/dhcpd.conf'),
      out('errores nombrados', `/etc/dhcp/dhcpd.conf line 12: semicolon expected\nNo subnet declaration for eth0 (192.168.1.5).  ← falta la subnet de ESA red`),
    ],
    solutions: [
      {
        title: 'Corregir la línea señalada',
        blocks: [p('dhcpd -t señala fichero:línea. Los clásicos: punto y coma faltante, llave sin cerrar, option routers fuera de subnet/global válido.')],
      },
      {
        title: 'Ubuntu: declarar la interfaz de escucha',
        blocks: [
          file('/etc/default/isc-dhcp-server', 'INTERFACESv4="eth0"   # el nombre REAL de tu tarjeta (ip -br link)'),
          cmd({}, 'sudo systemctl restart isc-dhcp-server'),
        ],
      },
    ],
    alternatives: ['systemd-analyze verify dhcpd.service detecta unit files rotos además de config.'],
    finalCheck: 'dhcpd -t silencioso + systemctl is-active → active + ss -ulpn muestra :67.',
  },
  {
    id: 'srv-dhcp-rango-agotado',
    title: 'Pool agotado («no free leases»)',
    category: 'Servidores',
    level: 'intermedio',
    severity: 'medium',
    symptoms: ['Nuevos clientes sin IP aunque el servicio corre', 'Log repite «no free leases on subnet»'],
    causes: ['Range demasiado pequeño para los dispositivos', 'Leases muy largos retienen IPs de equipos ya marchados', 'Reservas/fijas manuales invaden el range'],
    diagnose: [
      cmd({},
        'sudo journalctl -u dhcpd | grep -c "no free leases"\ngrep -c lease /var/lib/dhcp/dhcpd.leases   # nº de leases registrados'),
      p('Compara: tamaño del range vs leases activos. Un range .100-.200 son 101 IPs; con WiFi público se agotan rápido si max-lease-time es de días.'),
    ],
    solutions: [
      {
        title: 'Ampliar range y acortar leases',
        blocks: [
          file('/etc/dhcp/dhcpd.conf', 'default-lease-time 3600;\nmax-lease-time 7200;\n\nsubnet 192.168.1.0 netmask 255.255.255.0 {\n    range 192.168.1.100 192.168.1.240;   # ampliado\n}'),
          cmd({}, 'sudo dhcpd -t -cf /etc/dhcp/dhcpd.conf && sudo systemctl restart dhcpd'),
        ],
      },
    ],
    alternatives: ['VLAN/red de invitados aparte con su propio pool pequeño.', 'Purgar leases muertos del fichero .leases (solo con servicio parado).'],
    finalCheck: 'Un cliente nuevo obtiene IP y el log registra ACK sin mensajes de agotamiento.',
  },

  /* ----------------------------------- FTP --------------------------------- */
  {
    id: 'srv-ftp-login-falla',
    title: 'FTP: login rechazado (530 Login incorrect)',
    category: 'Servidores',
    level: 'facil',
    severity: 'medium',
    symptoms: ['Cliente FTP recibe «530 Login incorrect»', 'Credenciales verificadas correctas y aún así falla'],
    causes: ['Usuario no dado de alta con smbpasswd… perdón: sin contraseña FTP establecida', 'Shell nologin rechazada por PAM (ubuntu)', 'Usuario en lista de denegados (/etc/ftpusers o userlist)'],
    diagnose: [
      cmd({},
        'sudo journalctl -u vsftpd | tail -10\nid ftpupload   # ¿existe?\ncat /etc/shells | grep nologin'),
    ],
    solutions: [
      {
        title: 'Ubuntu: registrar nologin en /etc/shells',
        blocks: [
          cmd({}, 'echo /usr/sbin/nologin | sudo tee -a /etc/shells', '# reintenta el login'),
        ],
      },
      {
        title: 'Revisar listas de control',
        blocks: [
          file('/etc/vsftpd.conf', 'userlist_enable=YES\nuserlist_file=/etc/vsftpd.userlist\nuserlist_deny=YES   # la lista DENIEGA (invierte con NO)'),
          p('Si userlist_deny=YES y tu usuario figura ahí, siempre 530. También comprueba /etc/ftpusers: root y system users deben estar; tu usuario NO.'),
        ],
      },
    ],
    alternatives: ['Prueba smbclient… no: prueba ftp localhost desde el propio server para aislar red.', 'vsftpd con pam_service_name=vsftpd explícito evita PAM sorpresas.'],
    finalCheck: 'Login interactivo OK (230) y journal registra OK LOGIN.',
  },
  {
    id: 'srv-ftp-pasivo-bloqueado',
    title: 'FTP: el login funciona pero ls/put se cuelga',
    category: 'Servidores',
    level: 'intermedio',
    severity: 'medium',
    symptoms: ['Autenticación OK', 'LIST o transfers quedan colgados indefinidamente', 'Desde LAN va, desde fuera no (o viceversa)'],
    causes: ['Rango pasivo cerrado en el firewall', 'pasv_min/max_port no coinciden con lo abierto', 'Tras NAT: pasv_address anuncia IP privada'],
    diagnose: [
      p('Síntoma estrella del canal de DATOS: control OK, datos muertos. Verifica la coherencia triple:'),
      cmd({},
        'grep -E "pasv" /etc/vsftpd.conf\nsudo ufw status | grep -E "40000|40100|21/tcp"'),
      out('debe verse EXACTO', `pasv_min_port=40000 ↔ ufw 40000:40100/tcp abierto\npasv_max_port=40100 ↗`),
    ],
    solutions: [
      {
        title: 'Alinear rango pasivo y firewall',
        blocks: [
          file('/etc/vsftpd.conf', 'pasv_enable=YES\npasv_min_port=40000\npasv_max_port=40100'),
          cmd({}, 'sudo ufw allow 21/tcp', 'sudo ufw allow 40000:40100/tcp'),
        ],
      },
      {
        title: 'NAT: anunciar IP pública',
        blocks: [
          file('/etc/vsftpd.conf', '# solo si el server está tras NAT:\npasv_address=203.0.113.10'),
          p('La respuesta PASV incluye la IP donde conectar. Si anuncia 192.168.x.x privada, clientes externos intentarán alcanzar una IP inalcanzable: cuelgue garantizado.'),
        ],
      },
    ],
    alternatives: ['Modo activo para redes legacy (raro hoy).', 'Migrar a SFTP elimina TODO este módulo de problemas.'],
    finalCheck: 'Transferencia completa desde red externa (226 Transfer complete).',
  },

  /* ----------------------------------- SSH --------------------------------- */
  {
    id: 'srv-ssh-refused',
    title: 'SSH: Connection refused',
    category: 'Servidores',
    level: 'facil',
    severity: 'high',
    symptoms: ['ssh user@host → «connect to host … port 22: Connection refused»'],
    causes: ['sshd no está instalado o parado', 'sshd escucha en OTRO puerto (Port cambiado)', 'Firewall REJECT (a diferencia de DROP, que da timeout)'],
    diagnose: [
      p('Refused significa: ALGUIEN respondió «aquí no hay nadie». La conexión llega a la máquina pero ningún proceso atiende ese puerto:'),
      cmd({},
        '# EN EL SERVIDOR:\nsystemctl status sshd          # ubuntu: ssh\nss -tlnp | grep :22'),
      out('interpretación', `sin línea en ss → sshd parado/no instalado\nlínea con :2222 → ¡está en otro puerto! conecta con ssh -p 2222\nactive + :22 visible → mira firewall (ufw REJECT)`),
    ],
    solutions: [
      {
        title: 'Instalar y arrancar el demonio',
        blocks: [
          cmd({ caption: '🐧 Arch Linux' }, 'sudo pacman -S openssh', 'sudo systemctl enable --now sshd'),
          cmd({ caption: '🟠 Debian / Ubuntu' }, 'sudo apt install openssh-server', 'sudo systemctl enable --now ssh'),
        ],
      },
      {
        title: 'Puerto personalizado',
        blocks: [
          cmd({}, 'grep "^Port" /etc/ssh/sshd_config', 'ssh -p 2222 user@host   # usa el puerto real'),
          warn('Firewall antes de restart', 'Si cambiaste Port, abre el nuevo en ufw ANTES de reiniciar sshd o te quedas fuera.'),
        ],
      },
    ],
    alternatives: ['Desde el servidor: ssh localhost prueba la pila interna sin red física.'],
    finalCheck: 'ssh user@host abre sesión remota normalmente.',
  },
  {
    id: 'srv-ssh-permission-denied',
    title: 'SSH: Permission denied (publickey,password)',
    category: 'Servidores',
    level: 'intermedio',
    severity: 'high',
    symptoms: ['Se conecta pero rechaza credenciales', 'El mensaje enumera los métodos permitidos entre paréntesis'],
    causes: ['Contraseña incorrecta O PasswordAuthentication=no sin claves válidas', 'AllowUsers no incluye a tu usuario', 'Cuenta bloqueada/expirada'],
    diagnose: [
      p('El paréntesis ES el diagnóstico: qué métodos acepta el servidor. Luego el verbose te dice qué intentó TÚ:'),
      cmd({}, 'ssh -v ana@192.168.1.10 2>&1 | grep -E "Authentications|Offering|denied"'),
      cmd({},
        '# EN EL SERVIDOR, la verdad oficial:\nsudo journalctl -u sshd -n 20 | grep -iE "failed|invalid|denied"'),
    ],
    solutions: [
      {
        title: '(publickey) solamente: necesitas clave instalada',
        blocks: [
          cmd({}, 'ssh-copy-id ana@192.168.1.10   # desde el cliente, con acceso actual'),
          p('Sin acceso previo: consola física/VPS rescue para instalar authorized_keys a mano (módulo 09 del curso SSH).'),
        ],
      },
      {
        title: 'Tu usuario no está permitido',
        blocks: [
          file('/etc/ssh/sshd_config', 'AllowUsers ana carlos   # ¿está TU usuario?'),
          cmd({}, 'sudo sshd -t && sudo systemctl reload sshd'),
        ],
      },
    ],
    alternatives: ['fail2ban puede haber baneado tu IP por intentos previos: fail2ban-client status sshd.'],
    finalCheck: 'ssh -v termina en «Authenticated to … using publickey» o acepta password según config elegida.',
  },
  {
    id: 'srv-ssh-clave-rechazada',
    title: 'SSH: mi clave pública es ignorada por el servidor',
    category: 'Servidores',
    level: 'intermedio',
    severity: 'medium',
    symptoms: ['authorized_keys existe y contiene la clave', 'El servidor sigue ofreciendo password o deniega publickey'],
    causes: ['Permisos: ~/.ssh ≠700 o authorized_keys ≠600', 'Propietario incorrecto (copiaste con sudo/sobre otro usuario)', 'Home escribible por grupo/otros (StrictModes)'],
    diagnose: [
      p('sshd es PARANOICO por diseño con permisos: si ~/.ssh pudiera haber sido manipulada por terceros, la ignora SILENCIOSAMENTE. Es la causa nº1 y nadie la ve:'),
      cmd({},
        '# EN EL SERVIDOR:\nls -ld /home/ana /home/ana/.ssh /home/ana/.ssh/authorized_keys\nsudo journalctl -u sshd | grep -i "Authentication refused"'),
      out('la línea que lo confiesa', `sshd[2103]: Authentication refused: bad ownership or modes for directory /home/ana/.ssh`),
    ],
    solutions: [
      {
        title: 'Reparar permisos (el 95% de los casos)',
        blocks: [
          cmd({},
            '# EN EL SERVIDOR, como el usuario afectado:\nchmod 700 ~/.ssh\nchmod 600 ~/.ssh/authorized_keys\nchmod go-w ~           # home no escribible por otros'),
          out('estado correcto', `drwx------ ana ana  /home/ana/.ssh\n-rw------- ana ana  /home/ana/.ssh/authorized_keys\ndrwxr-xr-x ana ana  /home/ana`),
        ],
      },
    ],
    alternatives: ['SELinux (centos/ubuntu-server): restorecon -Rv ~/.ssh tras restauraciones manuales.'],
    finalCheck: 'ssh entra SIN pedir contraseña y journal deja de registrar Authentication refused.',
  },

  /* ------------------------------- NGINX/APACHE ----------------------------- */
  {
    id: 'srv-nginx-no-inicia',
    title: 'Nginx no inicia (Job for nginx.service failed)',
    category: 'Servidores',
    level: 'facil',
    severity: 'high',
    symptoms: ['start/restart falla', 'journal cita líneas de nginx.conf o zonas incluidas'],
    causes: ['Error de sintaxis (llave/punto-y-coma)', 'Directiva desconocida (versión antigua o módulo ausente)', 'Puerto ocupado por otro proceso'],
    diagnose: [
      cmd({},
        'sudo journalctl -u nginx -n 20 --no-pager\nsudo nginx -t'),
      out('nginx -t señala con precisión quirúrgica', `nginx: [emerg] unknown directive "proxy_cach" in /etc/nginx/conf.d/app.conf:9\nnginx: configuration file ... test failed`),
    ],
    solutions: [
      {
        title: 'Corregir la línea indicada por nginx -t',
        blocks: [p('El validador da FICHERO y LÍNEA exactos. Corrige y vuelve a validar hasta ver «test is successful» antes de cualquier start.')],
      },
      {
        title: 'Directiva de otra versión/módulo',
        blocks: [
          p('Copiar configs de tutoriales antiguos trae directivas retiradas o de builds con módulos extra. Ante unknown directive: busca el equivalente actual en la documentación de TU versión (nginx -v), no en el tutorial.'),
        ],
      },
    ],
    alternatives: ['Arranca en foreground manual (nginx -g "daemon off;") para depurar entornos raros.'],
    finalCheck: 'nginx -t OK + systemctl is-active → active.',
  },
  {
    id: 'srv-puerto-80-ocupado',
    title: 'Puerto 80 ocupado (Address already in use)',
    category: 'Servidores',
    level: 'facil',
    severity: 'medium',
    symptoms: ['Nginx o Apache no arranca citando bind() to 0.0.0.0:80 failed', 'El OTRO servidor web estaba funcionando'],
    causes: ['Dos servidores web instalados queriendo el mismo puerto', 'Aplicación de desarrollo (vite/node) escuchando en 80', 'Restos zombie de un servicio anterior'],
    diagnose: [
      cmd({}, 'ss -tlnp | grep :80', '# o el general:\nsudo lsof -i :80'),
      out('el culpable tiene nombre', `tcp LISTEN 0 511 0.0.0.0:80 users:(("nginx",pid=1237,...))   ← nginx tiene el 80`),
    ],
    solutions: [
      {
        title: 'Decidir quién manda en el 80',
        blocks: [
          p('Solo UN proceso puede escuchar un puerto. Dos caminos legítimos:'),
          ol('Detén al perdedor: sudo systemctl stop apache2 && sudo systemctl disable apache2 (y viceversa).',
             'Convivencia profesional: uno hace front en 80/443 y sirve de reverse proxy hacia el otro en puerto interno (8080).'),
        ],
      },
    ],
    alternatives: ['Cambiar el segundo servidor a 8080 temporalmente mientras decides.'],
    finalCheck: 'ss -tlnp muestra UN único dueño del :80 y el servicio elegido responde.',
  },
  {
    id: 'srv-nginx-config-invalida',
    title: 'Configuración inválida aplicada a medias (reload falla)',
    category: 'Servidores',
    level: 'intermedio',
    severity: 'medium',
    symptoms: ['reload devuelve error pero la web SIGUE arriba (con config vieja)', 'Cambios que no surten efecto sin mensaje claro'],
    causes: ['Editaste un include con sintaxis rota', 'Duplicaste server_name/listen en conflicto', 'Fichero nuevo en directorio NO incluido (sites-enabled sin include en Arch)'],
    diagnose: [
      cmd({},
        'sudo nginx -T | tail -30    # vuelca la config EFECTIVA completa fusionada\nsudo nginx -t'),
      p('nginx -T es oro puro: muestra TODO lo cargado (incluidos includes). Si TU fichero no aparece en el volcado, nunca fue incluido — eso explica «edito y no pasa nada».'),
    ],
    solutions: [
      {
        title: 'Fichero no incluido (típico en Arch)',
        blocks: [
          file('/etc/nginx/nginx.conf', 'http {\n    ...\n    include conf.d/*.conf;          # ← ¿tu fichero cae aquí?\n    # include sites-enabled/*.conf; # ← o aquí si lo usas\n}'),
        ],
      },
    ],
    alternatives: ['diff entre nginx -T actual y el último backup conocido para localizar el cambio rompedor.'],
    finalCheck: 'nginx -t successful + reload limpio + curl confirma el comportamiento nuevo.',
  },
  {
    id: 'srv-apache-no-inicia',
    title: 'Apache no inicia (AH00558 / Invalid command)',
    category: 'Servidores',
    level: 'facil',
    severity: 'medium',
    symptoms: ['httpd/apache2 failed', 'journal cita AH0xxxx codes o directivas desconocidas'],
    causes: ['ServerName global ausente (warning, no fatal) combinado con otro error real', 'Módulo no cargado para una directiva usada (RewriteEngine sin mod_rewrite)', 'MPM descomentado duplicado o SSL sin certificados definidos'],
    diagnose: [
      cmd({},
        'sudo journalctl -u httpd -n 25 --no-pager   # ubuntu: apache2\nsudo apachectl configtest'),
      out('ejemplos nombrados', `Invalid command 'RewriteEngine', perhaps misspelled or defined by a module not included\nSSLCertificateFile: file does not exist`),
    ],
    solutions: [
      {
        title: 'Activar el módulo que falta',
        blocks: [
          cmd({ caption: '🟠 Ubuntu' }, 'sudo a2enmod rewrite ssl headers', 'sudo systemctl restart apache2'),
          cmd({ caption: '🐧 Arch' }, '# descomenta en /etc/httpd/conf/httpd.conf:\n# LoadModule rewrite_module modules/mod_rewrite.so'),
        ],
      },
      {
        title: 'SSL referenciado sin certificados',
        blocks: [
          p('Si SSLEngine on existe, los dos ficheros de certificado DEBEN existir y ser legibles. Para laboratorio genera autofirmado (módulo HTTPS del curso Apache); en producción, certbot --apache automatiza todo.'),
        ],
      },
    ],
    alternatives: ['apachectl -M lista módulos activos: confirma antes de usar sus directivas.'],
    finalCheck: 'configtest → Syntax OK + is-active → active.',
  },
  {
    id: 'srv-nginx-permisos-403',
    title: 'Web devuelve 403 Forbidden (permisos)',
    category: 'Servidores',
    level: 'facil',
    severity: 'low',
    symptoms: ['curl/navegador reciben 403', 'error.log registra «permission denied» abriendo el recurso'],
    causes: ['Directorio sin permiso x para el usuario del servicio (http/www-data)', 'index ausente + autoindex off', 'SELinux/AppArmor en sistemas reforzados'],
    diagnose: [
      p('El 403 es nginx/apache diciendo «el FILESYSTEM me impide servirlo». Audita TODA la cadena de directorios, no solo el final:'),
      cmd({},
        'namei -l /var/www/archforge/index.html\nsudo tail -5 /var/log/nginx/error.log'),
      out('namei revela el eslabón roto', `drwx------ ana ana  archforge   ← http/www-data no puede ENTRAR (falta x)`),
    ],
    solutions: [
      {
        title: 'Permisos canónicos de web root',
        blocks: [
          cmd({},
            '# 🐧 Arch:\nsudo chown -R http:http /var/www/archforge\n# 🟠 Ubuntu:\nsudo chown -R www-data:www-data /var/www/archforge\n\n# común: dirs navegables, ficheros legibles, NADA escribible por otros:\nsudo chmod -R u=rwX,g=rX,o=rX /var/www/archforge'),
          tip('chmod X mayúscula', 'Aplica ejecución solo a DIRECTORIOS (y ya-ejecutables): evita marcar .html/.css como ejecutables, el error habitual con chmod -R 755.'),
        ],
      },
    ],
    alternatives: ['autoindex on expone listados (SOLO laboratorio): alternativa al index ausente.'],
    finalCheck: 'curl -I devuelve 200 y error.log callado.',
  },

  /* ---------------------------------- SAMBA -------------------------------- */
  {
    id: 'srv-samba-acceso-denegado',
    title: 'Samba: NT_STATUS_ACCESS_DENIED al acceder al share',
    category: 'Servidores',
    level: 'intermedio',
    severity: 'medium',
    symptoms: ['Windows/Linux cliente ven el share pero deniegan entrada o escritura'],
    causes: ['Usuario sin alta en SAMBA (smbpasswd) o fuera de valid users', 'Capa POSIX: dueños/modos del path no permiten escribir'],
    diagnose: [
      p('Recuerda la doble capa: SAMBA decide si te ADMITE; LINUX decide si puedes TOCAR. Aísla cuál falla:'),
      cmd({},
        '# 1) ¿te admite samba? (desde el propio server):\nsmbclient //localhost/publico -U ana -c ls\n# 2) ¿te deja linux escribir?\nls -ld /srv/samba/publico\ngroups ana'),
      out('diagnóstico dividido', `smbclient falla → capa SAMBA (usuarios/válidos)\nsmbclient OK pero escritura no → capa POSIX (chown/chmod)`),
    ],
    solutions: [
      {
        title: 'Capa Samba: alta y valid users',
        blocks: [
          cmd({}, 'sudo smbpasswd -a ana', '# y en smb.conf:\n# valid users = @familia ana'),
        ],
      },
      {
        title: 'Capa POSIX: dueño/grupo/setgid',
        blocks: [
          cmd({},
            'sudo chgrp familia /srv/samba/publico\nsudo chmod 2775 /srv/samba/publico\nsudo gpasswd -a ana familia'),
          tip('setgid (2xxx)', 'Hace que lo creado herede el GRUPO del directorio: imprescindible en carpetas colaborativas multiusuario.'),
        ],
      },
    ],
    alternatives: ['Windows cacheó credenciales viejas: net use * /delete en el cliente y reconectar.'],
    finalCheck: 'Escritura real desde cliente externo y ficheros con grupo esperado (ls -l desde el server).',
  },
  {
    id: 'srv-samba-no-visible',
    title: 'El share Samba no aparece en «Red» de Windows',
    category: 'Servidores',
    level: 'facil',
    severity: 'low',
    symptoms: ['\\servidor\publico funciona por IP pero el equipo no sale al explorar la red'],
    causes: ['nmbd parado (browsing NetBIOS)', 'Firewall filtra 137/udp o 445/tcp', 'Descubrimiento moderno WSD/mDNS no soportado por Samba básico'],
    diagnose: [
      cmd({},
        'systemctl status smbd nmbd        # ubuntu: smbd nmbd\nss -ulnp | grep -E ":137|:138"\nsmbclient -L localhost -N         # inventario local de shares'),
    ],
    solutions: [
      {
        title: 'Usar ruta directa (y arreglar browsing después)',
        blocks: [
          p('\\192.168.1.10\publico FUNCIONA sin browsing: enseña esto como método primario. El explorador de red es cosmética frágil dependiente de nmbd/WSD/broadcast — no confundir visibilidad con funcionalidad.'),
          cmd({}, 'sudo systemctl enable --now nmbd', 'sudo ufw allow from 192.168.1.0/24 to any proto tcp port 445', 'sudo ufw allow from 192.168.1.0/24 to any proto udp port 137:138'),
        ],
      },
    ],
    alternatives: ['wsdd2 añade descubrimiento WSD para Windows 10/11 modernos (paquete separado).'],
    finalCheck: 'Acceso por \\IP\share OK desde Windows y shares listables con smbclient -L.',
  },

  /* ------------------------------------ NFS -------------------------------- */
  {
    id: 'srv-nfs-mount-failed',
    title: 'mount.nfs falla (timed out / access denied by server)',
    category: 'Servidores',
    level: 'intermedio',
    severity: 'high',
    symptoms: ['mount -t nfs se cuelga y acaba en timeout', 'O directamente: «access denied by server while mounting»'],
    causes: ['timeout: firewall (111/2049), IP errónea o nfs-server caído', 'access denied: tu IP no está declarada en /etc/exports (o exportfs -ra pendiente)'],
    diagnose: [
      p('Los DOS mensajes tienen causas opuestas — identifica primero cuál tienes:'),
      cmd({},
        '# EN EL SERVIDOR:\nsystemctl status nfs-server        # ubuntu: nfs-kernel-server\nsudo exportfs -v                   # ¿tu IP/red figura?\nss -tlnp | grep -E "2049|111"\n# DESDE EL CLIENTE:\nshowmount -e 192.168.1.10'),
      out('showmount traduce el estado real', `Export list: /srv/nfs/publico 192.168.1.0/24  ← ¿tu IP cae ahí?\nrpc mount export RPC: Timed out               ← firewall/rpcbind`),
    ],
    solutions: [
      {
        title: 'Access denied: corregir /etc/exports',
        blocks: [
          file('/etc/exports', '/srv/nfs/publico   192.168.1.0/24(rw,sync,no_subtree_check)'),
          cmd({}, 'sudo exportfs -ra', '# ¡OJO! sin espacio antes del paréntesis:\n# 192.168.1.0/24 (rw,...)  ← CON espacio = opciones PARA EL MUNDO'),
        ],
      },
      {
        title: 'Timed out: abrir puertos NFS',
        blocks: [
          cmd({},
            'sudo ufw allow from 192.168.1.0/24 to any port 2049 proto tcp\nsudo ufw allow from 192.168.1.0/24 to any port 111'),
          p('NFSv4 necesita solo 2049; v3 además rpcbind(111)+mountd dinámico — si el server es v3, fija puertos estáticos o habilita v4 en ambos extremos.'),
        ],
      },
    ],
    alternatives: ['rpcinfo -p server confirma el mapa RPC vivo desde el cliente.'],
    finalCheck: 'mount -t nfs4 exitoso + touch dentro crea fichero con dueño esperado.',
  },
  {
    id: 'srv-nfs-permisos',
    title: 'NFS montado pero «Permission denied» al escribir',
    category: 'Servidores',
    level: 'intermedio',
    severity: 'medium',
    symptoms: ['El mount funciona y ls lista', 'touch/mkdir devuelven Permission denied'],
    causes: ['root_squash aplastando a nobody (esperado para root)', 'UIDs distintos entre cliente y servidor', 'Permisos POSIX del directorio exportado sin w para tu uid'],
    diagnose: [
      p('NFS transmite UIDs numéricos crudos. El test del toque revela QUIÉN eres para el servidor:'),
      cmd({},
        'touch /mnt/publico/test && ls -l /mnt/publico/test'),
      out('leer el dueño resultante', `nobody:nogroup  → eras root y root_squash actuó (normal)\ntu-uid-numérico sin nombre → uid existe en server pero SIN usuario asignado\nPermission denied directo → uid sin permiso w en el dir exportado`),
    ],
    solutions: [
      {
        title: 'Alinear usuarios y permisos',
        blocks: [
          cmd({},
            '# en AMBAS máquinas, mismo uid:\nid 1001   # ¿es ana en las dos?\n# en el servidor:\nsudo chown -R nobody:nogroup /srv/nfs/publico   # o el grupo compartido\nsudo chmod 2775 /srv/nfs/publico'),
          tip('Para backups como root', 'Es el caso legítimo de no_root_squash — SOLO en exports dedicados a máquinas de backup concretas, nunca generales.'),
        ],
      },
    ],
    alternatives: ['all_squash + anonuid/anongid para exports públicos de solo-escritura-anónima controlados.'],
    finalCheck: 'Creación de ficheros desde el cliente con dueño/grupo previsto en ambos lados.',
  },
]
