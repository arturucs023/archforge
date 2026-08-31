import type { Problem } from '../types'
import { cmd, info, p, ul, warn } from './helpers'

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

/* ============================== RED (extra) ============================== */

export const NET_PROBLEMS: Problem[] = [
  mk({
    id: 'dns-no-resuelve', title: 'DNS no resuelve dominios', category: 'Red', level: 'intermedio', severity: 'high',
    symptoms: ['ping IP funciona pero ping dominio falla', 'DNS_PROBE_FINISHED_NXDOMAIN en el navegador'],
    causes: ['Servidores DNS mal asignados por DHCP', 'systemd-resolved caído o caché corrupta', '/etc/resolv.conf sobrescrito por una VPN'],
    diagnose: [cmd({},
      'ping -c2 1.1.1.1                     # conectividad IP real',
      'resolvectl status | head -12         # DNS activo por enlace',
      'dig @1.1.1.1 archlinux.org +short    # prueba contra DNS externo directo')],
    solutions: [
      { title: 'Fijar DNS conocidos y vaciar caché', blocks: [cmd({}, 'sudo resolvectl dns NOMBRE-INTERFAZ 1.1.1.1 9.9.9.9', 'sudo resolvectl flush-caches')] },
      { title: 'Si una VPN rompió la config', blocks: [p('Desactiva la VPN y reinicia NetworkManager para que reescriba resolv.conf automáticamente.')] },
    ],
    finalCheck: 'ping archlinux.org resuelve y dig @1.1.1.1 responde.',
    alternatives: ['/etc/hosts para excepciones puntuales.'],
  }),
  mk({
    id: 'ip-incorrecta', title: 'Dirección IP incorrecta (169.254.x.x)', category: 'Red', level: 'facil', severity: 'high',
    symptoms: ['La interfaz tiene una IP 169.254.x.x', 'No llegas ni al router'],
    causes: ['DHCP no respondió y el equipo se autoconfiguró (APIPA)', 'Cable o puerto del router en fallo'],
    diagnose: [cmd({}, 'ip -brief address')],
    solutions: [{ title: 'Renovar DHCP', blocks: [cmd({}, 'sudo dhclient -v -r && sudo dhclient -v', '# o con NetworkManager:', 'nmcli device connect NOMBRE')] }],
    finalCheck: 'IP de tu subred real asignada y ping al gateway OK.',
  }),
  mk({
    id: 'gateway-mal', title: 'Gateway mal configurado', category: 'Red', level: 'intermedio',
    symptoms: ['Llegas a hosts locales pero no a Internet', 'Ruta default apuntando a otra interfaz'],
    causes: ['Dos conexiones activas peleándose la ruta default', 'Config manual errónea'],
    diagnose: [cmd({}, 'ip route   # ¿cuántas «default» hay y con qué métrica?')],
    solutions: [
      { title: 'Corregir la ruta default', blocks: [cmd({}, 'sudo ip route replace default via 192.168.1.1 dev TU-INTERFAZ')] },
      { title: 'Si una VPN la secuestró', blocks: [p('Cierra la VPN correctamente o revisa su opción «todo por el túnel» antes de tocar rutas a mano.')] },
    ],
    finalCheck: 'Una única default vía TU router y ping 1.1.1.1 correcto.',
  }),
  mk({
    id: 'firewall-bloquea', title: 'El firewall bloquea conexiones', category: 'Red', level: 'intermedio',
    symptoms: ['Puerto accesible solo desde localhost', 'Aplicación sin conexiones entrantes'],
    causes: ['ufw/nftables deny incoming sin regla del puerto', 'Docker publicó el puerto saltándose tus reglas'],
    diagnose: [cmd({}, 'sudo ufw status verbose', 'ss -tulpn | grep :PUERTO')],
    solutions: [
      { title: 'Abrir solo lo necesario', blocks: [cmd({}, 'sudo ufw allow 8080/tcp comment "mi servicio"')] },
      { title: 'Contenedor Docker', blocks: [warn('Docker inserta reglas ANTES de ufw', 'Publica en loopback (-p 127.0.0.1:5432:5432) o filtra en DOCKER-USER.')] },
    ],
    finalCheck: 'Desde otra máquina de la red nc -zv IP PUERTO conecta.',
    alternatives: ['nftables nativo para control fino.'],
  }),
  mk({
    id: 'ssh-no-conecta', title: 'SSH no conecta', category: 'SSH', level: 'intermedio',
    symptoms: ['ssh cuelga o Connection refused', 'Permission denied (publickey)'],
    causes: ['sshd parado o firewall sin puerto 22', 'Permisos de claves incorrectos'],
    diagnose: [cmd({},
      'ss -tlnp | grep :22          # ¿escucha sshd?',
      'ssh -v usuario@host 2>&1 | tail -20')],
    solutions: [
      { title: 'Refused → servidor', blocks: [cmd({}, 'sudo systemctl enable --now sshd', 'sudo ufw allow OpenSSH')] },
      { title: 'Publickey → permisos/claves', blocks: [
        ul('~/.ssh 700 · clave privada 600 · authorized_keys 600', 'Verifica que tu pública esté en authorized_keys del servidor'),
        cmd({}, 'ssh-copy-id usuario@host'),
      ] },
    ],
    finalCheck: 'ssh entra por clave y ssh -v termina en Authentication succeeded.',
    alternatives: ['ssh -vvv para depurar a fondo.'],
  }),
  mk({
    id: 'nm-no-inicia', title: 'NetworkManager no inicia', category: 'NetworkManager', level: 'intermedio',
    symptoms: ['NetworkManager.service failed', 'Sin red tras arrancar pese al hardware OK'],
    causes: ['Conflicto con systemd-networkd/iwd habilitados también', 'Perfil corrupto en system-connections'],
    diagnose: [cmd({},
      'journalctl -u NetworkManager -b --no-pager | tail -30',
      'systemctl is-enabled systemd-networkd iwd 2>/dev/null || true')],
    solutions: [{ title: 'Un gestor único', blocks: [cmd({}, 'sudo systemctl disable --now systemd-networkd iwd 2>/dev/null || true', 'sudo systemctl enable --now NetworkManager')] }],
    finalCheck: 'Active(running) e interfaz con IP tras reiniciar.',
  }),
  mk({
    id: 'dhcp-sin-ip', title: 'DHCP no asigna IP', category: 'NetworkManager', level: 'intermedio',
    symptoms: ['Interfaz UP sin inet', 'dhclient timeouts'],
    causes: ['DHCP desactivado en ese switch/VLAN', 'MAC filtrada o 802.1X pendiente'],
    diagnose: [cmd({}, 'sudo dhclient -v -r TU-IF && sudo dhclient -v TU-IF')],
    solutions: [{ title: 'Logs y registro corporativo', blocks: [cmd({}, 'journalctl -u NetworkManager | grep -i dhcp | tail', '# Red corporativa: contacta con redes para 802.1X')] }],
    finalCheck: 'IP válida de la subred esperada visible en ip -brief.',
  }),
  mk({
    id: 'eth-ok-wifi-no', title: 'Ethernet funciona pero WiFi no', category: 'NetworkManager', level: 'facil',
    symptoms: ['Cable perfecto, WiFi desaparecido', 'rfkill muestra blocked'],
    causes: ['Radio bloqueada por teclado', 'Driver sin firmware', 'wpa_supplicant/iwd en conflicto'],
    diagnose: [cmd({}, 'rfkill list', 'nmcli radio', 'lsmod | grep -E "iwlwifi|rtw|ath"')],
    solutions: [
      { title: 'Desbloquear radios', blocks: [cmd({}, 'sudo rfkill unblock all', 'nmcli radio wifi on')] },
      { title: 'Firmware específico', blocks: [info('Linux-firmware cubre la mayoría', 'Si dmesg dice «firmware file missing», instala linux-firmware o el paquete exacto que pida.')] },
    ],
    finalCheck: 'nmcli device wifi list muestra redes y conectas establemente.',
  }),
]
