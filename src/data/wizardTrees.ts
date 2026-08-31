import { cmd } from './helpers'

export interface DiagNode {
  id: string
  question: string
  hint?: string
  /** comandos de comprobación sugeridos */
  check?: string[]
  yes?: string | DiagNode
  no?: string | DiagNode
}

export interface DiagLeaf {
  id: string
  title: string
  cause: string
  lines?: string[]
  linkSection?: string
}

const LEAVES: Record<string, DiagLeaf> = {
  'audio-app': {
    id: 'audio-app', title: 'El sistema de audio está bien: es esa app',
    cause: 'speaker-test suena y el enrutado es correcto: reinicia la aplicación concreta (o revisa su salida de audio interna).',
    lines: ['# Cierra y abre la app; si persiste revisa SU selector de dispositivo'],
    linkSection: 'audio',
  },
  'svc-ok': {
    id: 'svc-ok', title: 'El servicio está activo y sano',
    cause: 'Active (running): el problema real estará en otro componente (puerto, config de la app, firewall). Usa el buscador de problemas con el síntoma concreto.',
    lines: ['journalctl -u NOMBRE -f   # observa mientras reproduces el problema'],
    linkSection: 'troubleshooting',
  },
  'puerto-libre': {
    id: 'puerto-libre', title: 'Nadie ocupa el puerto ahora mismo',
    cause: 'Tu app quizá ya arrancó correctamente, o escucha solo en 127.0.0.1 cuando esperabas 0.0.0.0 (o viceversa). Revisa SU log.',
    lines: ['ss -tlnp | grep TU-APP', 'journalctl --user -u tu-app -e'],
    linkSection: 'network',
  },
  /* ------------------------------- Red ------------------------------- */
  'red-sin-interfaz': {
    id: 'red-sin-interfaz', title: 'No existe la interfaz de red',
    cause: 'El kernel no ve ninguna tarjeta: driver sin cargar o hardware desactivado a nivel firmware.',
    lines: [
      'lspci -k | grep -iA3 network',
      'sudo dmesg | grep -iE "firmware|wlan|eth" | tail',
    ],
    linkSection: 'network',
  },
  'red-apagada': {
    id: 'red-apagada', title: 'Interfaz DOWN',
    cause: 'La interfaz existe pero está administrativamente apagada (o rfkill bloquea la radio WiFi).',
    lines: ['nmcli device connect NOMBRE', 'rfkill unblock all'],
    linkSection: 'network',
  },
  'red-sin-dhcp': {
    id: 'red-sin-dhcp', title: 'Sin dirección IP (DHCP no responde)',
    cause: 'El gestor de red no obtuvo lease: cable/router en fallo, portal cautivo, o NetworkManager parado.',
    lines: ['systemctl status NetworkManager --no-pager', 'nmcli device connect NOMBRE'],
    linkSection: 'network',
  },
  'red-apiPA': {
    id: 'red-apiPA', title: 'IP 169.254.x.x (APIPA)',
    cause: 'El equipo se auto-asignó una IP porque ningún servidor DHCP respondió. Causa casi siempre física o del router.',
    lines: ['ip addr show', '# Prueba otro cable/puerto y reinicia el router'],
    linkSection: 'network',
  },
  'red-lan-ok': {
    id: 'red-lan-ok', title: 'LAN funciona, Internet no',
    cause: 'Llegas al router pero él no llega fuera: caída del ISP, WAN caída o firewall del router.',
    lines: ['# Reinicia el router; si persiste, contacta a tu ISP con la ruta del traceroute', 'traceroute -m 8 1.1.1.1'],
    linkSection: 'troubleshooting',
  },
  'red-dns': {
    id: 'red-dns', title: 'DNS roto',
    cause: 'Hay conectividad IP real pero la resolución de nombres falla: servidores DNS mal asignados o resolved caído.',
    lines: ['resolvectl status | head -15', 'sudo resolvectl dns NOMBRE-INTERFAZ 1.1.1.1 9.9.9.9'],
    linkSection: 'network',
  },
  'red-proxy': {
    id: 'red-proxy', title: 'Todo OK por comando pero apps sin conexión',
    cause: 'Variables http_proxy/https_proxy heredadas apuntan a un proxy muerto, o firewall saliente bloquea puertos específicos.',
    lines: ['env | grep -i proxy', 'curl -I https://archlinux.org'],
    linkSection: 'firewall',
  },
  /* ------------------------------ Audio ------------------------------ */
  'audio-servicio': {
    id: 'audio-servicio', title: 'PipeWire/WirePlumber no corren',
    cause: 'El stack de audio está parado para tu usuario.',
    lines: ['systemctl --user restart pipewire wireplumber pipewire-pulse', 'wpctl status'],
    linkSection: 'audio',
  },
  'audio-mute': {
    id: 'audio-mute', title: 'Silenciado a nivel ALSA',
    cause: 'Causa nº1 histórica: canales con MM (mute) en alsamixer aunque el volumen esté alto.',
    lines: ['alsamixer   # F6 tarjeta · M desmuta · flechas suben'],
    linkSection: 'audio',
  },
  'audio-perfil': {
    id: 'audio-perfil', title: 'Perfil/salida equivocada',
    cause: 'El sonido va al HDMI del monitor o a un dispositivo BT fantasma en vez de tus altavoces.',
    lines: ['pavucontrol   # pestaña Output Device + Configuration'],
    linkSection: 'audio',
  },
  'audio-hw': {
    id: 'audio-hw', title: 'Hardware no detectado',
    cause: 'aplay no lista tarjetas: falta firmware o el chip necesita un módulo concreto.',
    lines: ['aplay -l', 'sudo dmesg | grep -i audio | tail'],
    linkSection: 'audio',
  },
  /* ---------------------------- Servicios ---------------------------- */
  'svc-no-existe': {
    id: 'svc-no-existe', title: 'La unidad no existe',
    cause: 'Nombre mal escrito o paquete no instalado. Los nombres distinguen mayúsculas (NetworkManager).',
    lines: ['systemctl list-unit-files | grep -i nombre'],
    linkSection: 'basic-config',
  },
  'svc-failed': {
    id: 'svc-failed', title: 'Unidad failed: lee su log',
    cause: 'Arrancó y murió (o rechazó arrancar): el motivo exacto está en su journal, casi siempre config inválida o permisos.',
    lines: ['journalctl -u NOMBRE -b -e --no-pager | tail -30', 'systemctl cat NOMBRE'],
    linkSection: 'first-boot',
  },
  'svc-disabled': {
    id: 'svc-disabled', title: 'Inactivo y deshabilitado',
    cause: 'Nunca se habilitó tras instalar: no arrancará solo en este ni próximos boots hasta enable --now.',
    lines: ['sudo systemctl enable --now NOMBRE'],
    linkSection: 'basic-config',
  },
  'svc-dependencia': {
    id: 'svc-dependencia', title: 'Falla por dependencia no satisfecha',
    cause: 'Requiere red/DBUS/otra unidad que aún no está lista: revisa journalctl -u y las Wants=/After= de su fichero.',
    lines: ['systemctl list-dependencies NOMBRE', 'journalctl -u NOMBRE -b --no-pager | head -30'],
    linkSection: 'expert',
  },
  /* ----------------------------- Puertos ----------------------------- */
  'puerto-proceso': {
    id: 'puerto-proceso', title: 'Otro proceso ocupa el puerto',
    cause: 'ss reveló el PID dueño: decide matarlo o cambia el puerto de TU aplicación.',
    lines: ['ss -tulpn | grep :PUERTO', 'kill PID'],
    linkSection: 'docker',
  },
  'puerto-time-wait': {
    id: 'puerto-time-wait', title: 'Sockets en TIME_WAIT',
    cause: 'Conexiones recientes cerrándose: espera ~60s o habilita SO_REUSEADDR en tu app. No es un proceso vivo.',
    lines: ['ss -tan | grep :PUERTO'],
    linkSection: 'network',
  },
  'puerto-docker': {
    id: 'puerto-docker', title: 'Docker/proxy publicó ese puerto',
    cause: 'Un contenedor mapeó HOST:puerto (-p). docker ps lo muestra; reasigna o para el contenedor.',
    lines: ['docker ps --format "table {{.Names}}\\t{{.Ports}}"'],
    linkSection: 'docker',
  },
}

function node(n: DiagNode): DiagNode {
  return n
}

export const WIZARD_TREES: Record<string, { label: string; root: DiagNode }> = {
  red: {
    label: 'Red / Internet',
    root: node({
      id: 'r-iface', question: '¿Existe alguna interfaz de red? (ip -brief address muestra algo más que «lo»)',
      check: ['ip -brief address'],
      hint: 'Busca eth0/enp*/wlan*/wl* además de lo (loopback).',
      yes: node({
        id: 'r-up', question: '¿Está UP y con LOWER_UP? (la palabra UP aparece entre < >)',
        check: ['ip link'],
        yes: node({
          id: 'r-ip', question: '¿Tiene dirección IP asignada (inet …)?',
          check: ['ip addr show'],
          yes: node({
            id: 'r-gw', question: '¿Hay ruta por defecto? (línea que empieza por default)',
            check: ['ip route'],
            yes: node({
              id: 'r-ping-gw', question: '¿Responde el ping a tu gateway/router?',
              check: ['ping -c2 $(ip route | awk \'/default/ {print $3; exit}\')'],
              yes: node({
                id: 'r-ping-ext', question: '¿Responde ping -c2 1.1.1.1 (Internet por IP)?',
                check: ['ping -c2 1.1.1.1'],
                yes: node({
                  id: 'r-dns', question: '¿Responde ping -c2 archlinux.org (por nombre)?',
                  check: ['ping -c2 archlinux.org'],
                  yes: 'red-proxy',
                  no: 'red-dns',
                }),
                no: 'red-lan-ok',
              }),
              no: 'red-sin-dhcp',
            }),
            no: 'red-apiPA',
          }),
          no: 'red-apagada',
        }),
      }),
      no: 'red-sin-interfaz',
    }),
  },
  audio: {
    label: 'Audio',
    root: node({
      id: 'a-svc', question: '¿wpctl status muestra PipeWire y WirePlumber como running?',
      check: ['wpctl status'],
      yes: node({
        id: 'a-dev', question: '¿Aparece tu dispositivo en Sinks/Sources (no vacío)?',
        yes: node({
          id: 'a-mute', question: '¿Volumen > 0 y SIN [MUTED]? (comprueba también alsamixer)',
          check: ['wpctl status', 'alsamixer'],
          yes: node({
            id: 'a-route', question: '¿Tu app aparece reproduciendo hacia el sink CORRECTO en pavucontrol?',
            check: ['pavucontrol'],
            yes: node({
              id: 'a-test', question: '¿speaker-test -c2 produce ruido rosa?',
              check: ['speaker-test -c2 -twav'],
              yes: 'audio-app',
              no: 'audio-hw',
            }),
            no: 'audio-perfil',
          }),
          no: 'audio-mute',
        }),
        no: 'audio-hw',
      }),
      no: 'audio-servicio',
    }),
  },
  servicios: {
    label: 'Un servicio no inicia',
    root: node({
      id: 's-exists', question: '¿systemctl status NOMBRE dice «could not be found»?',
      check: ['systemctl status NOMBRE --no-pager'],
      yes: 'svc-no-existe',
      no: node({
        id: 's-enabled', question: '¿Active: active (running)?',
        yes: 'svc-ok',
        no: node({
          id: 's-failed', question: '¿Active: failed?',
          yes: 'svc-failed',
          no: node({
            id: 's-inactive', question: '¿inactive (dead) + disabled?',
            yes: 'svc-disabled',
            no: 'svc-dependencia',
          }),
        }),
      }),
    }),
  },
  puerto: {
    label: 'Puerto ocupado',
    root: node({
      id: 'p-listen', question: '¿ss -tulpn muestra ALGUIEN escuchando en ese puerto?',
      check: ['ss -tulpn | grep :PUERTO'],
      yes: node({
        id: 'p-docker', question: '¿El proceso dueño es docker-proxy o similar?',
        yes: 'puerto-docker',
        no: 'puerto-proceso',
      }),
      no: node({
        id: 'p-tw', question: '¿Aparecen sockets TIME-WAIT en ss -tan?',
        check: ['ss -tan | grep :PUERTO'],
        yes: 'puerto-time-wait',
        no: 'puerto-libre',
      }),
    }),
  },
}

/** Resuelve referencias de árbol a hojas para renderizar el resultado final. */
export function resolveLeaf(id: string): DiagLeaf | undefined {
  return LEAVES[id]
}
