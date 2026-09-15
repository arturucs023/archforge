import type { CommandEntry } from './meta'

/* Ampliación admin/ASIR: red avanzada, SSH, permisos, discos, sistema, pacman y shell.
   Estilo idéntico al resto del catálogo; flags verificados contra util-linux/iproute2/
   systemd/pacman/OpenBSD-netcat actuales. */

export const ADMIN_COMMANDS: CommandEntry[] = [
  /* --------------------------------- RED AVANZADA -------------------------------- */
  {
    id: 'tcpdump', name: 'tcpdump', cat: 'red', distro: ['arch', 'debian'], important: true,
    summary: 'Captura tráfico real de una interfaz: el Wireshark de terminal para diagnosticar.',
    breakdown: [
      { token: '-i any', meaning: 'escucha en TODAS las interfaces (o -i eth0 para una)' },
      { token: '-n', meaning: 'sin resolver nombres (rápido y legible)' },
      { token: '-c 20', meaning: 'para tras 20 paquetes' },
      { token: 'port 80 / host X', meaning: 'filtro BPF: solo ese tráfico' },
      { token: '-w cap.pcap', meaning: 'guarda para abrir en Wireshark (-r para releer)' },
    ],
    examples: [
      { desc: '¿qué pide mi equipo al navegar?', lines: ['sudo tcpdump -i any -n port 80 or port 443'] },
      { desc: 'DHCP o DNS sospechoso', lines: ['sudo tcpdump -i eth0 -n port 67 or port 68', 'sudo tcpdump -i any -n port 53'] },
      { desc: 'guardar evidencia', lines: ['sudo tcpdump -i eth0 -w captura.pcap -c 500'] },
    ],
    whatHappens: 'Pone la interfaz en modo promiscuo y vuelca cada paquete que coincide con el filtro: verás ARP, DNS, handshakes… tal cual viajan.',
    errors: [{ symptom: '0 packets captured con tráfico evidente.', cause: 'Interfaz equivocada o filtro demasiado estricto.', fix: 'Empieza con -i any sin filtro y estrecha después.' }],
    warnNote: 'Capturar tráfico ajeno sin permiso puede ser ilegal: úsalo en tus redes y equipos.',
    related: ['ss', 'nmap'],
    intents: ['capturar tráfico red', 'ver paquetes', 'sniffer terminal', 'diagnosticar dhcp dns tráfico'],
  },
  {
    id: 'nmap', name: 'nmap', cat: 'red', distro: ['arch', 'debian'], important: true,
    summary: 'Escáner de red: qué hosts viven y qué puertos tienen abiertos.',
    breakdown: [
      { token: '-sn', meaning: 'solo descubrimiento (ping scan, sin tocar puertos)' },
      { token: '-sV', meaning: 'detecta servicio Y versión de cada puerto abierto' },
      { token: '-p 22,80,443 / -p-', meaning: 'puertos concretos / TODOS (lento, úsalo a conciencia)' },
      { token: '-O', meaning: 'huella del SO (requiere root)' },
      { token: '-oN informe.txt', meaning: 'guarda el resultado en texto' },
    ],
    examples: [
      { desc: '¿quién hay en mi LAN?', lines: ['nmap -sn 192.168.1.0/24'] },
      { desc: 'auditar un servidor propio', lines: ['sudo nmap -sV -O 192.168.1.10'] },
    ],
    errors: [{ symptom: 'Todos los puertos «filtered».', cause: 'Firewall intermedio o host caído.', fix: 'Combina con -Pn si sabes que vive, y prueba -sT si el SYN va filtrado.' }],
    warnNote: 'Escanear redes que no son tuyas o sin autorización puede ser delito: limita nmap a tu LAN, tus servidores y laboratorios.',
    related: ['ss', 'tcpdump'],
    intents: ['escanear red', 'puertos abiertos lan', 'qué equipos hay en mi red', 'auditar puertos'],
  },
  {
    id: 'nc', name: 'nc', cat: 'red', distro: ['arch', 'debian'],
    summary: 'Navaja suiza TCP/UDP: comprobar puertos, transferir datos y escucha rápida (sintaxis OpenBSD).',
    breakdown: [
      { token: '-vz host puerto', meaning: 'prueba si el puerto responde (verbose, sin enviar datos)' },
      { token: '-l 8080', meaning: 'escucha en ese puerto (servidor de usar y tirar)' },
      { token: '-w 3', meaning: 'timeout de conexión' },
      { token: '-u', meaning: 'modo UDP en vez de TCP' },
    ],
    examples: [
      { desc: '¿responde el SSH?', lines: ['nc -vz 192.168.1.10 22'] },
      { desc: 'tubería improvisada entre dos terminales', lines: ['nc -l 9999 > recibido.bin', 'nc 192.168.1.10 9999 < enviar.bin'] },
    ],
    errors: [{ symptom: 'Ncat: Connection refused vs timed out.', fix: 'refused = llegas pero nada escucha; timed out = firewall/ruta (mira traceroute).' }],
    whatHappens: 'Sintaxis OpenBSD (paquete openbsd-netcat). GNU netcat escucha con -l -p PUERTO: si un tutorial no te funciona, casi siempre es esta diferencia.',
    related: ['ssh', 'curl'],
    intents: ['probar si un puerto está abierto', 'conectar tcp manual', 'servidor temporal puerto'],
  },
  {
    id: 'ethtool', name: 'ethtool', cat: 'red', distro: ['arch', 'debian'],
    summary: 'Estado físico del enlace: velocidad negociada, dúplex, driver y estadísticas.',
    breakdown: [
      { token: 'ethtool eth0', meaning: 'velocidad, dúplex, link detected, auto-negociación' },
      { token: '-i', meaning: 'driver y firmware de la tarjeta' },
      { token: '-S', meaning: 'contadores (errores, drops, CRC: salud del cable)' },
      { token: '-s … speed/duplex/autoneg', meaning: 'forzar parámetros (raro, pero salva enlaces tercos)' },
    ],
    examples: [
      { lines: ['ethtool eth0', 'ethtool -S eth0 | grep -i -E "error|drop|crc"'] },
      { desc: '¿el cable negocia a 1 Gbps?', lines: ['ethtool eth0 | grep -E "Speed|Duplex|Link detected"'] },
    ],
    errors: [{ symptom: 'Link detected: no con cable puesto.', fix: 'Cable/puerto/switch: prueba otro cable y otro puerto antes de culpar al driver.' }],
    intents: ['velocidad tarjeta red', 'link red caído', 'errores físicos red', 'driver ethernet'],
  },
  {
    id: 'iw', name: 'iw', cat: 'red', distro: ['arch', 'debian'],
    summary: 'Wi-Fi moderno (sustituye a iwconfig): estado del enlace, redes visibles y potencia.',
    breakdown: [
      { token: 'dev', meaning: 'lista interfaces inalámbricas y su modo' },
      { token: 'dev wlan0 link', meaning: 'a qué AP estás conectado, señal y bitrate' },
      { token: 'dev wlan0 scan', meaning: 'escaneo de redes (combina con grep SSID)' },
    ],
    examples: [
      { lines: ['iw dev', 'iw dev wlan0 link'] },
      { desc: 'ver redes alrededor', lines: ['sudo iw dev wlan0 scan | grep -E "SSID|signal|freq"'] },
    ],
    errors: [{ symptom: 'command failed: Operation not supported.', cause: 'Driver sin soporte nl80211 completo o interfaz gestionada por otro driver.', fix: 'Revisa dmesg | grep -i firm y el driver con ethtool -i.' }],
    intents: ['wifi señal', 'a qué wifi estoy conectado', 'escanear wifis terminal'],
  },
  {
    id: 'resolvectl', name: 'resolvectl', cat: 'red', distro: ['arch', 'debian'], important: true,
    summary: 'DNS de systemd-resolved: qué servidores usas, consultas de prueba y limpieza de caché.',
    breakdown: [
      { token: 'status', meaning: 'servidores DNS por enlace + protocolos (DNSOverTLS, DNSSEC)' },
      { token: 'query ejemplo.com', meaning: 'resuelve pasando por tu resolved (respeta caché y split-DNS)' },
      { token: 'dns wlan0 1.1.1.1', meaning: 'fija DNS de un enlace (temporal)' },
      { token: 'flush-caches', meaning: 'vacía la caché tras cambiar DNS' },
    ],
    examples: [
      { lines: ['resolvectl status', 'resolvectl query archlinux.org'] },
      { desc: '¿uso el DNS que creo?', lines: ['resolvectl dns', 'cat /etc/resolv.conf'] },
    ],
    whatHappens: 'Requiere systemd-resolved activo. Si /etc/resolv.conf apunta a otro sitio (NetworkManager puro, dhclient), resolvectl y tu sistema pueden ver DNS distintos.',
    errors: [{ symptom: 'resolvectl: command not found o «not running».', fix: 'Activa systemd-resolved (systemctl enable --now) o usa dig/getent según tu stack.' }],
    related: ['dig', 'nmcli'],
    intents: ['qué dns uso', 'probar resolución dns', 'limpiar caché dns', 'dns no resuelve'],
  },
  {
    id: 'getent', name: 'getent', cat: 'diagnostico', distro: ['arch', 'debian'],
    summary: 'Pregunta a las bases del sistema (NSS): hosts, usuarios, grupos, servicios.',
    breakdown: [
      { token: 'hosts ejemplo.com', meaning: 'resolución como la ven TUS programas (respeta nsswitch.conf)' },
      { token: 'passwd ana / group sudo', meaning: 'usuario/grupo incluyendo LDAP/SSSD, no solo /etc' },
      { token: 'services ssh', meaning: 'puerto y protocolo registrados' },
    ],
    examples: [
      { desc: '¿resuelve como mis apps o como dig?', lines: ['getent hosts ejemplo.com', 'dig ejemplo.com +short'] },
      { lines: ['getent passwd ana', 'getent group wheel sudo'] },
    ],
    whatHappens: 'Si dig resuelve pero getent no, el problema está en nsswitch.conf (orden files/dns/myhostname), no en la red.',
    intents: ['nsswitch', 'usuario existe ldap', 'diferencia dig getent'],
  },

  /* ------------------------------------ SSH + ----------------------------------- */
  {
    id: 'ssh-agent', name: 'ssh-agent', cat: 'ssh', distro: ['arch', 'debian'], important: true,
    summary: 'Guardián de claves SSH: pide la passphrase UNA vez por sesión y la reutiliza.',
    breakdown: [
      { token: 'eval "$(ssh-agent -s)"', meaning: 'arranca el agente y exporta sus variables en ESTA shell' },
      { token: 'ssh-add ~/.ssh/id_ed25519', meaning: 'carga la clave (pregunta la passphrase una vez)' },
      { token: '-l', meaning: 'lista claves cargadas (-L muestra las públicas)' },
      { token: '-t 8h', meaning: 'la clave caduca en 8 h (higiene en equipos compartidos)' },
    ],
    examples: [
      { lines: ['eval "$(ssh-agent -s)"', 'ssh-add ~/.ssh/id_ed25519', 'ssh-add -l'] },
      { desc: 'auto en cada login (bashrc/zshrc)', lines: ['pgrep -u "$USER" ssh-agent >/dev/null || eval "$(ssh-agent -s)" >/dev/null'] },
    ],
    errors: [{ symptom: 'Could not open a connection to your authentication agent.', fix: 'El agente no corre en ESTA shell: re-ejecuta el eval (cada terminal nueva lo necesita).' }],
    related: ['ssh-keygen', 'ssh-copy-id', 'ssh'],
    intents: ['no repetir passphrase ssh', 'agente ssh', 'cargar clave ssh sesión'],
  },

  /* --------------------------------- PERMISOS + --------------------------------- */
  {
    id: 'visudo', name: 'visudo', cat: 'permisos', distro: ['arch', 'debian'], important: true,
    summary: 'Edita /etc/sudoers CON validación: un error de sintaxis aquí te deja sin sudo.',
    breakdown: [
      { token: '%wheel ALL=(ALL:ALL) ALL', meaning: 'el grupo wheel puede todo (descomenta en Arch)' },
      { token: 'ana ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart nginx', meaning: 'permiso quirúrgico sin contraseña para una tarea' },
      { token: '-c', meaning: 'solo valida la sintaxis, sin editar' },
    ],
    examples: [
      { lines: ['sudo visudo', 'sudo visudo -c'] },
      { desc: 'fragmento dedicado (mejor que tocar sudoers)', lines: ['echo "%wheel ALL=(ALL:ALL) ALL" | sudo tee /etc/sudoers.d/wheel'] },
    ],
    errors: [{ symptom: 'sudo: parse error in /etc/sudoers (y pánico).', fix: 'Desde root (su - o live USB): visudo para corregir. Por eso NUNCA se edita con nano directo.' }],
    intents: ['dar sudo a usuario', 'editar sudoers seguro', 'sudo sin contraseña'],
  },
  {
    id: 'chattr', name: 'chattr', cat: 'permisos', distro: ['arch', 'debian'],
    summary: 'Atributos inmutables del FS: +i congela un archivo hasta contra root.',
    breakdown: [
      { token: '+i', meaning: 'immutable: ni root puede modificar/borrar/mover (quitar con -i)' },
      { token: '+a', meaning: 'append-only: solo añadir al final (logs a prueba de borrado)' },
      { token: 'lsattr', meaning: 'ver atributos (ls no los muestra)' },
    ],
    examples: [
      { lines: ['sudo chattr +i /etc/resolv.conf', 'lsattr /etc/resolv.conf', 'sudo chattr -i /etc/resolv.conf'] },
    ],
    whatHappens: 'Funciona en ext4 y FS tradicionales; en btrfs/xfs/tmpfs el soporte es parcial. Es capa extra, no sustituto de permisos.',
    errors: [{ symptom: 'Operation not permitted haciendo rm como root.', fix: 'Mira lsattr: casi seguro hay +i. Quítalo con chattr -i.' }],
    intents: ['archivo inmutable', 'proteger resolv.conf', 'nadie borre un archivo'],
  },
  {
    id: 'acl', name: 'ACL (setfacl/getfacl)', cat: 'permisos', distro: ['arch', 'debian'],
    summary: 'Permisos finos más allá de dueño/grupo/otros: usuarios y grupos extra por archivo.',
    breakdown: [
      { token: '-m u:ana:rx', meaning: 'da a ana leer+entrar sin tocar dueño/grupo' },
      { token: '-m g:devs:rwx', meaning: 'añade un segundo grupo con acceso total' },
      { token: '-d -m …', meaning: 'ACL POR DEFECTO: la heredan los archivos nuevos del dir' },
      { token: '-b', meaning: 'borra TODAS las ACL (vuelve a modo clásico)' },
    ],
    examples: [
      { lines: ['getfacl /srv/web', 'sudo setfacl -m u:ana:rx /srv/web', 'sudo setfacl -R -d -m g:devs:rwx /srv/web'] },
    ],
    errors: [{ symptom: 'getfacl muestra effective: distinto al pedido.', cause: 'La máscara (mask::) limita el máximo efectivo.', fix: 'Ajusta con setfacl -m mask::rwx o recalcula con -n.' }],
    intents: ['permisos varios usuarios', 'acl linux', 'dar acceso sin cambiar grupo'],
  },

  /* ---------------------------------- DISCOS + ---------------------------------- */
  {
    id: 'fsck', name: 'fsck', cat: 'discos', distro: ['arch', 'debian'],
    summary: 'Chequea y repara filesystems. REGLA DE ORO: nunca sobre un FS montado en lectura-escritura.',
    breakdown: [
      { token: '-n', meaning: 'solo mira, no toca (seguro, para diagnosticar)' },
      { token: '-y', meaning: 'responde sí a todo (reparación desatendida)' },
      { token: '-f', meaning: 'fuerza el chequeo aunque parezca limpio' },
    ],
    examples: [
      { desc: 'diagnóstico seguro', lines: ['sudo fsck -n /dev/sdb1'] },
      { desc: 'reparar partición DESMONTADA', lines: ['sudo umount /dev/sdb1', 'sudo fsck -y /dev/sdb1'] },
    ],
    errors: [{ symptom: 'fsck avisa de que el FS está montado.', fix: 'Para: desmonta, usa el live USB o deja que el boot lo haga. Forzarlo corrompe datos.' }],
    warnNote: 'fsck -y sobre el disco equivocado o montado destruye datos: verifica con lsblk -f y desmonta primero.',
    intents: ['reparar filesystem', 'chequear disco errores', 'partición corrupta'],
  },
  {
    id: 'swap', name: 'swap (mkswap/swapon)', cat: 'discos', distro: ['arch', 'debian'],
    summary: 'Memoria de intercambio: crear área swap, activarla y verla.',
    breakdown: [
      { token: 'mkswap', meaning: 'formatea partición/archivo COMO swap (borra su contenido)' },
      { token: 'swapon / swapoff', meaning: 'activa / desactiva (swapoff -a = todo)' },
      { token: '--show / free -h', meaning: 'ver swap activa y uso' },
    ],
    examples: [
      { desc: 'partición swap', lines: ['sudo mkswap /dev/sda2', 'sudo swapon /dev/sda2'] },
      { desc: 'archivo swap de 4 GiB', lines: ['sudo dd if=/dev/zero of=/swapfile bs=1M count=4096 status=progress', 'sudo chmod 600 /swapfile', 'sudo mkswap /swapfile', 'sudo swapon /swapfile'] },
      { desc: 'persistente en fstab', lines: ['echo "UUID=xxxx none swap defaults 0 0" | sudo tee -a /etc/fstab'] },
    ],
    errors: [{ symptom: 'swapon failed: Invalid argument (en archivo).', cause: 'Permisos laxos o agujeros (fallocate en btrfs).', fix: 'chmod 600 estricto; en btrfs usa archivo nocow o partición dedicada.' }],
    intents: ['crear swap', 'activar intercambio', 'ampliar memoria swap'],
  },
  {
    id: 'cryptsetup', name: 'cryptsetup', cat: 'discos', distro: ['arch', 'debian'], important: true,
    summary: 'Cifrado LUKS de discos/particiones: luksFormat, open, close.',
    breakdown: [
      { token: 'luksFormat', meaning: 'CIFRA desde cero (DESTRUYE todo lo anterior)' },
      { token: 'luksOpen DEV nombre', meaning: 'desbloquea como /dev/mapper/nombre' },
      { token: 'luksClose nombre', meaning: 'cierra el mapeo' },
      { token: 'luksDump', meaning: 'inspecciona cabecera y slots de clave (seguro)' },
    ],
    examples: [
      { desc: 'cifrar un USB (¡borra todo!)', lines: ['sudo cryptsetup luksFormat /dev/sdc1', 'sudo cryptsetup luksOpen /dev/sdc1 usb', 'sudo mkfs.ext4 -L usb /dev/mapper/usb'] },
      { desc: 'abrir y cerrar en el día a día', lines: ['sudo cryptsetup luksOpen /dev/sdc1 usb', 'sudo cryptsetup luksClose usb'] },
    ],
    errors: [{ symptom: 'No key available with this passphrase.', fix: 'Teclado (layout), mayúsculas o slot equivocado: prueba luksDump para ver slots ocupados.' }],
    warnNote: 'luksFormat no pregunta dos veces: verifica el dispositivo con lsblk y ten backup. Sin passphrase no hay recuperación posible.',
    intents: ['cifrar disco luks', 'usb cifrado', 'abrir partición cifrada'],
  },
  {
    id: 'findmnt', name: 'findmnt', cat: 'discos', distro: ['arch', 'debian'],
    summary: 'Qué hay montado, dónde y con qué opciones: el mount legible.',
    breakdown: [
      { token: 'findmnt', meaning: 'árbol completo de montajes' },
      { token: '/ruta', meaning: 'a qué dispositivo/opciones corresponde esa ruta' },
      { token: '-t ext4,btrfs', meaning: 'filtra por tipo de FS' },
      { token: '--df', meaning: 'añade uso de espacio estilo df' },
    ],
    examples: [
      { lines: ['findmnt', 'findmnt /home', 'findmnt -t vfat --df'] },
    ],
    intents: ['dónde está montado', 'opciones de montaje', 'ver montajes'],
  },
  {
    id: 'lvm', name: 'LVM (pvs/vgs/lvs)', cat: 'discos', distro: ['arch', 'debian'],
    summary: 'Volúmenes lógicos: agrupa discos (VG) y reparte espacio flexible (LV) con snapshots.',
    breakdown: [
      { token: 'pvs / vgs / lvs', meaning: 'físicos / grupos / lógicos: el estado de un vistazo' },
      { token: 'lvextend -r -L +10G vg/lv', meaning: 'agranda LV + filesystem a la vez (-r)' },
      { token: 'lvcreate -s', meaning: 'snapshot instantáneo (backup consistente)' },
    ],
    examples: [
      { lines: ['sudo pvs', 'sudo vgs', 'sudo lvs'] },
      { desc: 'darle 10 GiB más a home', lines: ['sudo lvextend -r -L +10G vg0/home'] },
    ],
    errors: [{ symptom: 'Insufficient free space.', fix: 'El VG no tiene hueco: añade un PV (vgextend) o reduce otro LV primero.' }],
    intents: ['lvm ampliar partición', 'volúmenes lógicos', 'snapshot lvm'],
  },

  /* --------------------------------- SISTEMA + ---------------------------------- */
  {
    id: 'loginctl', name: 'loginctl', cat: 'sistema', distro: ['arch', 'debian'],
    summary: 'Sesiones y usuarios de systemd-logind: ver, inspeccionar y cerrar sesiones.',
    breakdown: [
      { token: 'list-sessions / user-status', meaning: 'sesiones activas / detalle por usuario' },
      { token: 'show-session N -p …', meaning: 'propiedades (Remote, State, TTY…)' },
      { token: 'terminate-user ana', meaning: 'cierra TODAS sus sesiones y procesos' },
      { token: 'enable-linger ana', meaning: 'sus servicios --user sobreviven al logout' },
    ],
    examples: [
      { lines: ['loginctl list-sessions', 'loginctl user-status'] },
      { desc: 'echar a un usuario colgado', lines: ['sudo loginctl terminate-user ana'] },
    ],
    intents: ['sesiones systemd', 'cerrar sesión usuario remoto', 'linger servicios usuario'],
  },
  {
    id: 'localectl', name: 'localectl', cat: 'sistema', distro: ['arch', 'debian'],
    summary: 'Locale del sistema y mapa de teclado (consola + X11) vía systemd.',
    breakdown: [
      { token: 'status', meaning: 'locale y keymaps actuales' },
      { token: 'set-locale LANG=…', meaning: 'idioma del sistema (requiere locale generado)' },
      { token: 'set-keymap es', meaning: 'teclado de consola (list-keymaps para ver)' },
      { token: 'set-x11-keymap es', meaning: 'teclado en gráfico' },
    ],
    examples: [
      { lines: ['localectl status', 'sudo localectl set-locale LANG=es_ES.UTF-8', 'sudo localectl set-keymap es'] },
    ],
    errors: [{ symptom: 'set-locale se queja de locale inválido.', fix: 'Genera primero: descomenta en /etc/locale.gen y ejecuta locale-gen.' }],
    intents: ['idioma sistema', 'teclado español consola', 'locale arch'],
  },
  {
    id: 'coredumpctl', name: 'coredumpctl', cat: 'diagnostico', distro: ['arch', 'debian'],
    summary: 'Coredumps gestionados por systemd: qué programa petó y con qué señal.',
    breakdown: [
      { token: 'list', meaning: 'últimos crashes (programa, PID, señal, fecha)' },
      { token: 'info PID', meaning: 'detalle: exe, cmdline, stack parcial' },
      { token: '--vacuum-size=100M', meaning: 'poda el almacén de dumps' },
    ],
    examples: [
      { lines: ['coredumpctl list', 'coredumpctl info $(pidof -s miapp || echo 0)'] },
      { desc: '¿por qué murió anoche?', lines: ['coredumpctl --since yesterday'] },
    ],
    whatHappens: 'En Arch requiere systemd-coredump + sysctl kernel.core_pattern; sin él, los dumps van a la nada y «no hay rastro».',
    intents: ['programa se cierra solo', 'segfault diagnosticar', 'core dump ver'],
  },
  {
    id: 'sar', name: 'sar', cat: 'monitorizacion', distro: ['arch', 'debian'],
    summary: 'Histórico de rendimiento sysstat: CPU, RAM, disco y red de AYER y de ahora.',
    breakdown: [
      { token: '-u 1 3', meaning: 'CPU ahora: 3 muestras de 1 s' },
      { token: '-r', meaning: 'memoria (incluye %memused y buffers)' },
      { token: '-d', meaning: 'actividad por disco' },
      { token: '-f /var/log/sa/sa12', meaning: 'consulta el día 12 (histórico)' },
    ],
    examples: [
      { lines: ['sar -u 1 3', 'sar -r', 'sar -d'] },
      { desc: '¿a qué hora petó ayer?', lines: ['sar -f /var/log/sa/sa$(date -d yesterday +%d | sed "s/^0//")'] },
    ],
    whatHappens: 'Necesita el recolector activo (sysstat / sysstat-collect.timer); sin histórico solo verás el AHORA.',
    intents: ['histórico cpu', 'rendimiento ayer', 'sar sysstat'],
  },

  /* --------------------------------- PAQUETES + --------------------------------- */
  {
    id: 'pacman-query', name: 'pacman -Q (consultas)', cat: 'paquetes', distro: ['arch'], important: true,
    summary: 'Interroga la base local: explícitos, huérfanos, dueño de archivos y bases remotas.',
    breakdown: [
      { token: '-Qe', meaning: 'instalados EXPLÍCITAMENTE por ti (tu «lista de deseos» para replicar el sistema)' },
      { token: '-Qdt (y -Qtdq)', meaning: 'huérfanos: dependencias que ya nadie necesita (lista cruda para -Rns)' },
      { token: '-Qo /ruta', meaning: '¿a qué paquete pertenece este archivo?' },
      { token: '-Ql pqte', meaning: 'lista TODOS los archivos que instala' },
      { token: '-Qk pqte', meaning: 'verifica integridad (archivos modificados/faltantes)' },
      { token: '-Qu', meaning: 'qué se actualizaría con -Syu (sin tocar nada)' },
      { token: '-Fy + -F texto', meaning: 'busca ARCHIVOS en los repos (aunque no estén instalados)' },
      { token: '-D --asexplicit pqte', meaning: 'marca como explícito (protege de la limpieza de huérfanos)' },
    ],
    examples: [
      { desc: 'auditoría del sistema', lines: ['pacman -Qe', 'pacman -Qdt', 'pacman -Qu'] },
      { desc: '¿de quién es este binario? ¿y este error de integridad?', lines: ['pacman -Qo /usr/bin/ls', 'pacman -Qk filesystem'] },
      { desc: 'qué paquete trae este header que falta al compilar', lines: ['sudo pacman -Fy', 'pacman -F stdio.h'] },
      { desc: 'limpieza de huérfanos (mirar ANTES de borrar)', lines: ['pacman -Qtdq', 'sudo pacman -Rns $(pacman -Qtdq)'] },
    ],
    errors: [{ symptom: 'pacman -Rns $(pacman -Qtdq): nada que hacer pero esperabas huérfanos.', fix: 'Normal si todo es explícito o requerido. Revisa con pacman -Qe qué marcaste tú.' }],
    related: ['pacman', 'pacman-cache'],
    intents: ['paquetes huérfanos', 'qué paquete trae un archivo', 'listar instalados explícitos', 'verificar integridad paquetes', 'buscar archivo en repos'],
  },
  {
    id: 'pacman-cache', name: 'pacman -Sc/-Scc y paccache', cat: 'paquetes', distro: ['arch'],
    summary: 'Caché de /var/cache/pacman/pkg: descargar sin instalar y podar con criterio.',
    breakdown: [
      { token: '-Sw pqte', meaning: 'descarga SIN instalar (preparar offline)' },
      { token: '-Sc', meaning: 'borra versiones YA desinstaladas (seguro)' },
      { token: '-Scc', meaning: 'VACÍA toda la caché (pierdes rollback rápido)' },
      { token: 'paccache -r[kN]', meaning: 'conserva N versiones (defecto 3): poda inteligente' },
    ],
    examples: [
      { lines: ['paccache -r', 'paccache -rk1', 'paccache --dryrun -r'] },
      { desc: 'disco lleno: artillería', lines: ['du -sh /var/cache/pacman/pkg', 'sudo pacman -Scc'] },
    ],
    whatHappens: 'Cada -Syu guarda el .pkg anterior: la caché ES tu downgrade rápido (pacman -U /var/cache/.../paquete-versión.pkg). Podar con cabeza.',
    errors: [{ symptom: 'Quiero volver a la versión anterior y ya hice -Scc.', fix: 'Tira del Archive (archive.archlinux.org) o del ALA: la caché vacía no perdona.' }],
    related: ['pacman', 'pacman-query'],
    intents: ['limpiar caché pacman', 'liberar espacio var cache', 'downgrade paquete arch'],
  },

  /* ------------------------------ SHELL Y ARCHIVOS + ----------------------------- */
  {
    id: 'man', name: 'man', cat: 'sistema', distro: ['arch', 'debian'], important: true,
    summary: 'El manual del sistema: sintaxis, flags y archivos de CUALQUIER comando.',
    breakdown: [
      { token: 'man 5 passwd', meaning: 'sección 5 = formato de /etc/passwd (sin número verías el comando passwd, sección 1)' },
      { token: 'man -k partición', meaning: 'apropos: busca en DESCRIPCIONES («¿qué comando hace X?»)' },
      { token: 'whatis ls', meaning: 'una línea por comando (qué es, de un vistazo)' },
      { token: 'man -f / man -w', meaning: 'sinónimos de whatis / muestra la ruta del fichero del manual' },
    ],
    examples: [
      { lines: ['man pacman.conf', 'man -k "copy files"', 'whatis chmod'] },
      { desc: 'dentro del manual: /buscar · n · q (es less)', lines: ['man systemd.unit'] },
    ],
    whatHappens: 'Secciones: 1 comandos, 2 syscalls, 3 libc, 5 formatos, 8 admin. man-db indexa con mandb; si -k no encuentra, ejecuta sudo mandb.',
    errors: [{ symptom: 'No manual entry for X.', fix: 'Paquete sin docs instalada (a veces en paquete aparte -doc) o manda compilado sin man.' }],
    intents: ['ayuda de un comando', 'manual linux', 'qué hace este comando', 'buscar comando por descripción'],
  },
  {
    id: 'rsync', name: 'rsync', cat: 'archivos', distro: ['arch', 'debian'], important: true,
    summary: 'Copia diferencial local/remota: solo transfiere lo cambiado. El rey de backups.',
    breakdown: [
      { token: '-a', meaning: 'archive: recursivo + permisos + tiempos + enlaces (base de todo)' },
      { token: '-v -h --progress', meaning: 'verboso, legible, con progreso por archivo' },
      { token: '-n / --dry-run', meaning: 'SIMULACRO: muestra lo que haría sin tocar nada (úsalo antes de --delete)' },
      { token: '--delete', meaning: 'borra en destino lo que ya no existe en origen (¡peligroso sin -n previo!)' },
      { token: 'origen/ (con barra)', meaning: 'copia el CONTENIDO; sin barra copia LA CARPETA (el error nº 1)' },
      { token: '-e ssh', meaning: 'túnel por SSH (puerto con -e "ssh -p 2222")' },
    ],
    examples: [
      { desc: 'backup casero (simula primero)', lines: ['rsync -avhn ~/docs/ /mnt/backup/docs/', 'rsync -avh --delete ~/docs/ /mnt/backup/docs/'] },
      { desc: 'remoto por SSH', lines: ['rsync -avh -e ssh ~/web/ ana@server:/srv/web/'] },
    ],
    errors: [{ symptom: 'Se duplicó la carpeta (docs/docs).', cause: 'Barra final: origen/ copia contenido, origen copia la carpeta.', fix: 'Decide con -n cuál quieres y repite.' }],
    warnNote: '--delete borra de verdad en destino: ensaya siempre con -n y apunta bien origen/destino (invertirlos es catastrófico).',
    related: ['scp', 'cp', 'tar'],
    intents: ['copiar carpetas backup', 'sincronizar directorios', 'backup incremental', 'copiar por ssh'],
  },
  {
    id: 'tmux', name: 'tmux', cat: 'bash-shell', distro: ['arch', 'debian'], important: true,
    summary: 'Multiplexor de terminal: sesiones que sobreviven a cierres de SSH + paneles.',
    breakdown: [
      { token: 'new -s nombre', meaning: 'nueva sesión con nombre' },
      { token: 'attach -t nombre', meaning: 'reengancha (tras cerrar el portátil, todo sigue ahí)' },
      { token: 'Ctrl-b d', meaning: 'desancla (detach) dejando todo corriendo' },
      { token: 'Ctrl-b % / "', meaning: 'divide vertical / horizontal' },
      { token: 'Ctrl-b c / n / p', meaning: 'nueva ventana / siguiente / anterior' },
      { token: 'ls / kill-session', meaning: 'listar / cerrar sesiones' },
    ],
    examples: [
      { lines: ['tmux new -s trabajo', 'tmux attach -t trabajo', 'tmux ls'] },
      { desc: 'actualización larga en servidor remoto', lines: ['tmux new -s update', 'sudo pacman -Syu'] },
    ],
    whatHappens: 'El servidor tmux vive aparte de tu terminal: cerrar SSH no mata nada. Es EL flujo para administar remoto sin nohup.',
    related: ['nohup', 'ssh'],
    intents: ['sesión persistente ssh', 'dividir terminal paneles', 'que no se corte al cerrar ssh'],
  },
  {
    id: 'disown', name: 'disown', cat: 'bash-shell', distro: ['arch', 'debian'],
    summary: 'Desvincula un job del shell para que sobreviva al cierre (builtin).',
    breakdown: [
      { token: 'comando & disown', meaning: 'lanza en fondo y lo suelta' },
      { token: 'disown -h %1', meaning: 'marca para NO recibir SIGHUP (sigue en jobs)' },
      { token: 'disown -a', meaning: 'suelta todos los jobs' },
    ],
    examples: [{ lines: ['./backup-largo.sh & disown', 'disown -h %1'] }],
    alternatives: [{ name: 'tmux', note: 'mejor para sesiones interactivas' }, { name: 'nohup', note: 'para lanzar ya inmune' }, { name: 'systemd-run', note: 'supervisión real con journal' }],
    intents: ['proceso sobreviva cierre', 'desvincular job shell'],
  },
  {
    id: 'fuser', name: 'fuser', cat: 'procesos', distro: ['arch', 'debian'],
    summary: 'Qué procesos usan un archivo, directorio o socket (psmisc).',
    breakdown: [
      { token: '-v', meaning: 'verboso: usuario, PID, qué hace (f=file, m=mmap, c=cwd…)' },
      { token: '-k', meaning: 'MATA a los que lo usan (tras -v, nunca a ciegas)' },
      { token: '-n tcp 8080', meaning: 'por socket en vez de por archivo' },
    ],
    examples: [
      { desc: '¿quién bloquea el desmontaje?', lines: ['fuser -v /mnt/datos'] },
      { desc: 'puerto ocupado sin ss', lines: ['fuser -v -n tcp 8080'] },
    ],
    related: ['lsof', 'umount'],
    intents: ['quién usa este archivo', 'dispositivo ocupado desmontar', 'proceso bloquea usb'],
  },
  {
    id: 'pstree', name: 'pstree', cat: 'procesos', distro: ['arch', 'debian'],
    summary: 'Árbol de procesos: quién lanzó a quién de un vistazo (psmisc).',
    breakdown: [
      { token: '-p', meaning: 'muestra PIDs' },
      { token: '-s PID', meaning: 'solo ancestros de ese PID (cadena de paternidad)' },
      { token: '-u', meaning: 'cambios de usuario entre padre e hijo' },
    ],
    examples: [
      { lines: ['pstree -p', 'pstree -s $$'] },
      { desc: '¿de dónde cuelga este demonio?', lines: ['pstree -s $(pgrep -o nginx)'] },
    ],
    intents: ['árbol de procesos', 'quién lanzó este proceso', 'jerarquía procesos'],
  },
  {
    id: 'killall', name: 'killall', cat: 'procesos', distro: ['arch', 'debian'],
    summary: 'Mata por NOMBRE exacto de proceso (psmisc). Rápido, exige puntería.',
    breakdown: [
      { token: 'nombre', meaning: 'coincidencia con el nombre del ejecutable (comm, 15 car.)' },
      { token: '-u ana', meaning: 'solo los de ese usuario' },
      { token: '-s SIGKILL / -9', meaning: 'señal a enviar (defecto TERM, educado)' },
    ],
    examples: [{ lines: ['killall firefox', 'killall -u ana vlc'] }],
    warnNote: 'Mata TODAS las coincidencias: killall python fulmina cada script python en marcha. Prefiere pkill -f o kill PID cuando haya duda.',
    related: ['kill', 'pkill'],
    intents: ['matar todos los procesos de un programa', 'cerrar programa colgado'],
  },
]
