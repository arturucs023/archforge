/* Curso DHCP — servidor isc-dhcp-server / dhcpd */
import { cmd, danger, deep, file, h, info, ol, out, p, tip, tbl, ul, warn } from '../helpers'
import type { QuizData } from '../../types'
import { srvModule } from './types'
import type { RelatedLink } from './types'
import type { ServerCourse } from './types'

const q1: QuizData = {
  id: 'dhcp-quiz-dora',
  difficulty: 'beginner',
  question: '¿En qué mensaje DORA el cliente ELIGE una de las ofertas recibidas?',
  options: [
    { text: 'Discover', why: 'Discover es el grito inicial «¿hay algún servidor DHCP por ahí?».' },
    { text: 'Offer', why: 'Offer es la RESPUESTA del servidor proponiendo configuración.' },
    { text: 'Request', why: 'Correcto: con Request el cliente anuncia qué oferta acepta (broadcast, para que los demás servidores retiren la suya).' },
    { text: 'Acknowledge', why: 'ACK es la confirmación final del servidor; después de Request.' },
  ],
  answer: 2,
}

const q2: QuizData = {
  id: 'dhcp-quiz-reserva',
  difficulty: 'intermediate',
  question: 'Necesitas que la impresora SIEMPRE reciba 192.168.1.50. ¿Qué usas?',
  options: [
    { text: 'Un rango pool aparte', why: 'Los pools reparten IPs dinámicas; nada garantiza que toque siempre la misma.' },
    { text: 'Una reserva (fixed-address) ligada a su MAC', why: 'Exacto: la reserva asocia hardware (MAC) a IP fija manteniendo la gestión centralizada en DHCP.' },
    { text: 'Configurar la IP a mano en la impresora', why: 'Funciona, pero rompes la ventaja del DHCP y arriesgas colisiones si nadie apunta esa IP en el rango excluido.' },
    { text: 'Subir el lease time al máximo', why: 'Alarga el préstamo pero no lo hace permanente ni determinista.' },
  ],
  answer: 1,
}


/* Recomendaciones basadas en relaciones REALES del contenido:
   · 🌐 Servidor DNS → la opción domain-name-servers apunta a tu BIND
   · Red → IPs, gateways y rutas que DHCP entrega
   · Firewall → puerto 67/udp y rogue DHCP */
const RELATED: RelatedLink[] = [
  { label: '🌐 Servidor DNS', kind: 'course', to: 'dns' },
  { label: 'Red', kind: 'section', to: 'network' },
  { label: 'Firewall', kind: 'section', to: 'firewall' },
]

export const dhcpCourse: ServerCourse = {
  id: 'dhcp',
  icon: '📡',
  title: 'Servidor DHCP',
  tagline: 'Asigna IPs automáticamente: protocolo DORA paso a paso, rangos, reservas por MAC y leases.',
  level: 'intermediate',
  recommended: ['arch', 'debian'],
  minutes: 110,
  keywords: ['dhcp', 'dhcpd', 'dora', 'lease', 'reserva', 'isc-dhcp-server', 'ip automática'],
  prereqs: [
    { label: 'Red', icon: 'network', to: '/section/network' },
    { label: 'Servicios y systemd', icon: 'expert', to: '/section/expert' },
  ],
  cheatsheetIds: ['systemctl', 'journalctl', 'dhclient' ],
  problemIds: ['srv-dhcp-cliente-sin-ip', 'srv-dhcp-no-inicia', 'srv-dhcp-rango-agotado'],
  modules: [
    srvModule('que-es-dhcp', '01', 'Qué es DHCP', 8, ['Entender qué resuelve DHCP y qué parámetros entrega'], [
      p('DHCP (Dynamic Host Configuration Protocol) entrega a cada dispositivo que se conecta TODO lo necesario para hablar en la red: su IP, la máscara, el gateway por donde salir y los DNS que usarán. Sin él configurarías cada portátil, móvil y TV a mano — y una IP duplicada tumba a las dos máquinas implicadas.'),
      p('Además de comodidad, DHCP centraliza la verdad: cambias el gateway de tu red editando UN fichero de un servidor y todos los clientes lo heredarán en su próximo lease.'),
      h('Lo que un servidor DHCP entrega normalmente'),
      tbl(['Parámetro', 'Opción DHCP', 'Ejemplo'], [
        ['Dirección IP', '1 (subnet-mask aparte)', '192.168.1.87'],
        ['Máscara', '1', '255.255.255.0'],
        ['Gateway/router', '3', '192.168.1.1'],
        ['DNS', '6', '192.168.1.10'],
        ['Nombre de dominio', '15', 'archforge.local'],
        ['Duración del lease', '51', '12 horas'],
      ]),
      info('Relación con tu curso DNS', 'La opción 6 es exactamente el nameserver del módulo 15 del curso DNS: DHCP es quien dice a los clientes «pregunta al 192.168.1.10». Los servicios se apoyan entre sí.'),
    ]),

    srvModule('dora', '02', 'DORA', 10, ['Narrar el baile Discover→Offer→Request→ACK'], [
      p('Todo cliente nuevo sin IP participa en un diálogo de cuatro mensajes que el acrónimo DORA hace memorable:'),
      file('dora.txt', `Cliente (0.0.0.0)\n   │ ① DHCPDISCOVER   broadcast 255.255.255.255\n   ▼        «¿hay algún servidor DHCP?»\nServidor DHCP\n   │ ② DHCPOFFER      «yo te ofrezco 192.168.1.87»\n   ▼\nCliente\n   │ ③ DHCPREQUEST    broadcast     «acepto LA oferta de X»\n   ▼        (broadcast para que otros servidores retiren la suya)\nServidor DHCP\n   │ ④ DHCPACK        «hecho: es tuya hasta T»`, 'El apretón de manos DORA completo'),
      ul(
        'DISCOVER viaja en broadcast porque el cliente aún no tiene IP con la que dirigirse a nadie.',
        'Puede haber VARIOS OFFER si hay dos servidores: el cliente solo REQUESTea uno y los demás devuelven su IP al pool.',
        'El ACK convierte la oferta en contrato con fecha de caducidad: el lease.',
        'A mitad de lease el cliente renueva (REQUEST unicast). Si pierde el lease, vuelve a DISCOVER.',
      ),
      deep('¿Por qué REQUEST también es broadcast?', 'Si hubiera dos servidores y el cliente aceptara por unicast solo a uno, el otro seguiría creyendo su oferta aceptada y reservaría esa IP inútilmente. El broadcast de Request es una cortesía de cancelación pública.'),
    ]),

    srvModule('instalacion', '03', 'Instalación', 6, ['Instalar el servidor DHCP en ambas familias'], [
      p('El software de referencia sigue siendo el ISC DHCP Server (dhcpd). Instalarlo no arranca nada ni activa escucha: dhcpd se niega a arrancar sin configuración válida, un fallo-seguro muy sensato para algo que puede romper una red entera.'),
      cmd({ caption: '🐧 Arch Linux' }, '# 🐧 Arch Linux', 'sudo pacman -S dhcp'),
      cmd({ caption: '🟠 Debian / Ubuntu' }, '# 🟠 Debian / Ubuntu', 'sudo apt update', 'sudo apt install isc-dhcp-server'),
      warn('Debian pide interfaz ANTES de arrancar', 'En Ubuntu el fichero /etc/default/isc-dhcp-server declara INTERFACESv4="eth0" — la tarjeta donde escuchar. Si falta o nombra una interfaz inexistente, el servicio falla al iniciar aunque dhcpd.conf sea perfecto. Es la trampa nº1 del paquete Debian.'),
      info('En la simulación', 'ArchForge valida instalación + fichero + servicio activo. Las trampas de INTERFACESv4 se explican porque aparecerán en cualquier Ubuntu real.'),
    ]),

    srvModule('configuracion', '04', 'Configuración', 10, ['Escribir dhcpd.conf entendiendo cada bloque'], [
      p('Toda la configuración vive en un único fichero declarativo con dos niveles: opciones GLOBALES (heredadas por todas las redes) y bloques subnet (lo específico de cada red servida).'),
      tbl(['Distribución', 'Ruta del fichero'], [
        ['Arch', '/etc/dhcpd.conf'],
        ['Debian/Ubuntu', '/etc/dhcp/dhcpd.conf'],
      ]),
      info('Común a ambas distribuciones', 'La SINTAXIS del fichero es idéntica: mismo demonio ISC, mismos bloques. Solo cambia la ruta. Todo lo que aprendas aquí te sirve en cualquier Linux con ISC DHCP.'),
    ]),

    srvModule('rangos', '05', 'Rangos DHCP', 9, ['Definir subnet + range sin colisionar con IPs fijas'], [
      p('El bloque subnet describe TU red real: si la máscara o la red no coinciden con la interfaz del servidor, dhcpd se queja («No subnet declaration») o directamente no sirve ahí. El range es el trozo de esa red que DHCP puede prestar.'),
      file('/etc/dhcp/dhcpd.conf (Ubuntu) · /etc/dhcpd.conf (Arch)', `subnet 192.168.1.0 netmask 255.255.255.0 {\n    range 192.168.1.100 192.168.1.200;\n    option routers 192.168.1.1;\n}`, 'Bloque mínimo funcional'),
      h('Por qué el range empieza en .100'),
      p('Las IPs bajas (.1–.99) quedan libres para infraestructura estática: router, servidores, impresoras con reserva. Mezclar prestadas y fijas en el MISMO hueco produce la pesadilla clásica: «esta IP ya está en uso» — DHCP no sabe que tú pusiste manualmente un host dentro de su range.'),
      danger('Colisión silenciosa', 'Nunca declares un range que incluya IPs asignadas estáticamente. Si necesitas fijas dentro del rango natural, usa RESERVAS por MAC (módulo 09), nunca configuración manual a ciegas.'),
    ]),

    srvModule('gateway', '06', 'Gateway', 6, ['Publicar la puerta de enlace correcta'], [
      p('La opción routers le dice a cada cliente POR DÓNDE salir hacia otras redes. Un valor erróneo produce la queja más confusa del helpdesk: «tengo IP y hago ping a mi compañero, pero no hay Internet». El tráfico local funciona; el salto a otra red muere.'),
      file('opción global vs de subnet', `# global (hereda todo):\noption domain-name "archforge.local";\n\nsubnet 192.168.1.0 netmask 255.255.255.0 {\n    option routers 192.168.1.1;   # específico de ESTA red\n}`),
      tip('Diagnóstico exprés desde el cliente', 'Con IP pero sin Internet: ip route debe mostrar default via 192.168.1.1. Si muestra otra cosa o nada, el DHCP publicó mal routers (o el cliente ignoró la opción).'),
    ]),

    srvModule('dns', '07', 'DNS', 5, ['Entregar resolutores vía opción domain-name-servers'], [
      p('La opción domain-name-servers publica QUÉ DNS usarán los clientes. Aquí conectas este curso con el de DNS: apunta a tu BIND interno (192.168.1.10) y toda la red resolverá archforge.local automáticamente al conectar.'),
      file('publicar tu propio DNS', `subnet 192.168.1.0 netmask 255.255.255.0 {\n    option domain-name-servers 192.168.1.10, 1.1.1.1;\n    # primario: tu BIND · secundario público como respaldo\n}`),
      p('Se pueden listar varios: el cliente usa el primero y salta al siguiente ante fallos. Publicar SOLO el DNS interno sin respaldo convierte tu BIND en punto único de fallo de TODA la navegación.'),
    ]),

    srvModule('lease-time', '08', 'Lease time', 8, ['Dimensionar max-lease-time/default-lease-time'], [
      p('Un lease es un PRÉSTAMO temporal, no propiedad. Los temporizadores definen cuánto dura y cuándo renueva el cliente: demasiados cortos inundan la red de renovaciones; demasiado largos agotan el pool cuando muchos huéspedes pasan por la misma red.'),
      tbl(['Escenario', 'default/max recomendado', 'Motivo'], [
        ['Red de oficina estable', '12h / 24h', 'Renovación diaria imperceptible'],
        ['WiFi de invitados', '30min / 1h', 'Reciclar IPs rápido: rotación alta'],
        ['Laboratorio/prácticas', '10min / 30min', 'Ver efectos y errores rápido'],
      ]),
      file('temporizador en dhcpd.conf', `default-lease-time 43200;   # 12 h\nmax-lease-time 86400;       # 24 h (techo que puede pedir el cliente)`),
      info('¿Dónde se ven los leases activos?', 'Archivo real: /var/lib/dhcp/dhcpd.leases (Debian) o /var/state/dhcp/dhcpd.leases (Arch). Cada entrada guarda MAC, IP, fechas de inicio/fin. Es tu fuente de verdad para saber QUIÉN está en tu red.'),
    ]),

    srvModule('reservas', '09', 'Reservas', 9, ['Fijar IP por MAC con fixed-address'], [
      p('Una reserva (o «asignación estática por DHCP») ata una MAC concreta a una IP concreta para siempre. Combina lo mejor de ambos mundos: la impresora siempre en .50, pero gestionada centralizadamente — cambias la política en el servidor, no en 20 dispositivos.'),
      file('reserva fuera del range', `host impresora-despacho {\n    hardware ethernet aa:bb:cc:dd:ee:ff;\n    fixed-address 192.168.1.50;\n}`),
      ul(
        'La MAC se obtiene del cliente con ip link (o la pegatina del equipo).',
        'Elegir una IP FUERA del range evita que dhcpd la prometa a otro antes de tiempo.',
        'Las reservas viven en host {} globales o dentro del subnet; el efecto es idéntico.',
      ),
      warn('MAC aleatorias de privacidad', 'Android/iOS modernos rotan MAC por red WiFi (randomized MACs). Una reserva por MAC fallará «sin motivo»: localiza la MAC REAL en el panel del router o desactiva privacidad en ese dispositivo.'),
    ]),

    srvModule('clientes', '10', 'Clientes', 7, ['Pedir y liberar leases desde el cliente'], [
      p('Del lado cliente, dhclient negocia el lease (el mismo DORA visto antes). Es la herramienta de diagnóstico perfecta: sus -v muestran los cuatro mensajes tal cual cruzan la red.'),
      cmd({ caption: 'ciclo completo desde el cliente' }, 'sudo dhclient -v eth0        # pedir/renew', 'sudo dhclient -r eth0        # release: devolver la IP'),
      out('salida típica de -v', `DHCPDISCOVER on eth0 to 255.255.255.255 port 67 interval 3\nDHCPOFFER of 192.168.1.87 from 192.168.1.5\nDHCPREQUEST for 192.168.1.87 on eth0 to 255.255.255.255 port 67\nDHCPACK of 192.168.1.87 from 192.168.1.5`),
      p('Reconocer DISCOVER/OFFER/REQUEST/ACK en esta salida convierte el módulo DORA en algo tangible: acabas de ver el protocolo respirando. En sistemas de escritorio NetworkManager llama a dhclient (o su cliente interno) por ti tras cada conexión.'),
    ]),

    srvModule('comprobacion', '11', 'Comprobación', 8, ['Validar el servicio de punta a punta'], [
      p('Secuencia profesional de validación tras tocar config: sintaxis → estado → escucha → lease real. Cada paso confirma la base del siguiente.'),
      cmd({ caption: '🐧 Arch Linux' }, '# validar sintaxis SIN arrancar:\nsudo dhcpd -t -cf /etc/dhcpd.conf', '# estado y escucha:\nsystemctl status dhcpd', 'ss -ulpn | grep 67'),
      cmd({ caption: '🟠 Debian / Ubuntu' }, 'sudo dhcpd -t -cf /etc/dhcp/dhcpd.conf', 'sudo systemctl status isc-dhcp-server', 'ss -ulpn | grep 67'),
      out('qué esperar en ss', `udp   UNCONN 0  0  0.0.0.0:67  0.0.0.0:*  users:(("dhcpd",pid=1310,fd=7))`),
      p('El puerto 67/udp ES el servidor DHCP (el 68 es el cliente). Sin línea en ss ningún cliente del mundo recibirá oferta, por perfecto que esté el fichero.'),
      info('En la terminal virtual de ArchForge', 'systemctl status dhcpd refleja el estado real del servicio simulado y journalctl -u dhcpd muestra sus logs: úsalos para validar tu laboratorio final.'),
    ]),

    srvModule('logs', '12', 'Logs', 6, ['Leer el diario del servidor: ofertas, ACKs y errores'], [
      cmd({}, 'sudo journalctl -u dhcpd -f          # en vivo', 'sudo journalctl -u isc-dhcp-server -n 50   # ubuntu'),
      out('líneas que debes saber leer', `dhcpd[1310]: DHCPDISCOVER from aa:bb:cc:dd:ee:ff via eth0\ndhcpd[1310]: DHCPOFFER on 192.168.1.87 to aa:bb:cc:dd:ee:ff\ndhcpd[1310]: DHCPREQUEST for 192.168.1.87\ndhcpd[1310]: DHCPACK on 192.168.1.87 to aa:bb:cc:dd:ee:ff`),
      p('Cada línea corresponde a un mensaje DORA. Ver DISCOVER sin OFFER posterior = pool vacío o subnet mal declarada. Ver OFFER sin ACK = el cliente eligió otro servidor. El log narra la conversación completa: acostúmbrate a leerla como una historia.'),
      deep('NAT del problema «no llega broadcast»', 'DHCP depende de broadcasts L2. Tras un router mal configurado o VLANs sin dhcp relay (ip helper-address), los DISCOVER jamás llegan: el log del servidor estará VACÍO y eso también es información diagnóstica.'),
    ]),

    srvModule('seguridad', '13', '🔐 Seguridad', 8, ['Identificar rogue DHCP, starvation y mitigaciones'], [
      danger('Rogue DHCP: el secuestro más fácil de la red', 'Cualquier portátil con dhcpd instalado puede responder MÁS RÁPIDO que tu servidor legítimo y ofrecer como gateway SU máquina: todo el tráfico de la red pasaría por el atacante (MITM). No requiere exploit: solo arrancar un servicio.'),
      h('Mitigaciones por capas'),
      ol(
        'En switches gestionados: DHCP snooping — solo puertos CONFIADOS pueden enviar OFFER.',
        'Puertos de invitados separados en VLAN propia con su propio DHCP controlado.',
        'Vigila leases inexplicables en dhcpd.leases: MACs desconocidas son la firma de un rogue.',
        'Monitoriza duplicidad: dos servidores respondiendo genera quejas intermitentes difíciles de reproducir.',
      ),
      warn('DHCP starvation', 'Variante ofensiva: solicitar (con MACs falsificadas) TODAS las IPs del range hasta agotarlo → denegación de servicio para usuarios legítimos. Rangos grandes + snooping mitigan ambos ataques.'),
    ]),

    srvModule('troubleshooting', '14', 'Troubleshooting', 9, ['Diagnosticar: cliente sin IP, servicio caído, pool agotado'], [
      ol(
        '¿El cliente pidió? En el SERVIDOR: journalctl -u dhcpd | tail. ¿Hay DISCOVER entrante? Sí → el problema es respuesta/pool. No → broadcast no llega (cable, VLAN, relay).',
        '¿El servicio vive? systemctl status dhcpd/isc-dhcp-server.',
        '¿Escucha 67/udp? ss -ulpn | grep 67.',
        '¿Configura válida? dhcpd -t -cf … — valida ANTES de restart, siempre.',
        '¿Quedan IPs libres? cuenta el range menos los leases del fichero .leases.',
      ),
      tbl(['Síntoma', 'Causa probable', 'Módulo'], [
        ['Cliente en 169.254.x.x (APIPA)', 'Ningún OFFER llegó: servicio caído o broadcast bloqueado', '14'],
        ['dhcpd failed en systemctl', 'Sintaxis o INTERFACESv4 erróneo (ubuntu)', '03–05'],
        ['«no free leases» en el log', 'Pool agotado: rangos pequeños o leases zombi', '08'],
        ['IP cambia cada día', 'Lease corto + reserva ausente', '09'],
      ]),
      info('Solucionador integrado', '«Cliente no recibe IP», «el servidor DHCP no inicia» y «rango agotado» están desarrollados paso a paso en la sección Troubleshooting de ArchForge.'),
    ]),

    srvModule('laboratorio', '15', 'Laboratorio final', 20, ['Montar un DHCP con rango, gateway, DNS y una reserva'], []),
  ],
  lab: {
    objective: 'Instala el servidor DHCP, escribe dhcpd.conf con subnet 192.168.1.0/24, range .100-.200, gateway .1 y DNS .10, arranca el servicio y comprueba su estado.',
    intro: 'Estado FINAL buscado: paquete instalado · dhcpd.conf con subnet+range+routers+dns · servicio activo.',
    tasks: [
      'instala: sudo pacman -S dhcp (ubuntu: sudo apt install isc-dhcp-server)',
      'su · mkdir -p /etc/dhcp · nano /etc/dhcp/dhcpd.conf (en ubuntu) o /etc/dhcpd.conf (en arch)',
      'declara subnet 192.168.1.0 netmask 255.255.255.0 con range 192.168.1.100 192.168.1.200',
      'añade option routers 192.168.1.1; y option domain-name-servers 192.168.1.10;',
      'sudo systemctl start dhcpd (ubuntu: sudo systemctl start isc-dhcp-server)',
    ],
    hints: [
      'sudo pacman -S --noconfirm dhcp  ·  ubuntu: sudo apt install isc-dhcp-server -y',
      'su  →  mkdir -p /etc/dhcp  →  nano /etc/dhcp/dhcpd.conf',
      'subnet 192.168.1.0 netmask 255.255.255.0 { range 192.168.1.100 192.168.1.200; option routers 192.168.1.1; option domain-name-servers 192.168.1.10; }',
      'sudo systemctl start dhcpd  ·  systemctl is-active dhcpd',
    ],
    validate(session) {
      const distro = session.distro
      const pkgOk = distro === 'arch'
        ? session.state.pkgs.arch.installed['dhcp'] !== undefined
        : session.state.pkgs.debian.installed['isc-dhcp-server'] !== undefined
      if (!pkgOk) return { pass: false, detail: 'falta instalar el paquete DHCP (dhcp en arch / isc-dhcp-server en ubuntu)' }

      const candidates = ['/etc/dhcp/dhcpd.conf', '/etc/dhcpd.conf']
      let conf = ''
      for (const c of candidates) {
        try { conf += '\n' + session.vfs.readFile(c) } catch { /* probar siguiente */ }
      }
      if (!conf.trim()) return { pass: false, detail: 'no encuentro dhcpd.conf en /etc/dhcp/ ni /etc/' }
      if (!/subnet\s+192\.168\.1\.0\s+netmask\s+255\.255\.255\.0/i.test(conf)) return { pass: false, detail: 'falta el bloque subnet 192.168.1.0 netmask 255.255.255.0' }
      if (!/range\s+192\.168\.1\.100\s+192\.168\.1\.200\s*;/i.test(conf)) return { pass: false, detail: 'falta range 192.168.1.100 192.168.1.200;' }
      if (!/option\s+routers\s+192\.168\.1\.1\s*;/i.test(conf)) return { pass: false, detail: 'falta option routers 192.168.1.1;' }
      if (!/option\s+domain-name-servers[^;]*192\.168\.1\.10/i.test(conf)) return { pass: false, detail: 'falta option domain-name-servers con 192.168.1.10' }

      const svc = session.state.services?.['dhcp']
      if (!svc?.active) return { pass: false, detail: `el servicio DHCP no está activo (sudo systemctl start ${distro === 'arch' ? 'dhcpd' : 'isc-dhcp-server'})` }
      return { pass: true, detail: 'paquete instalado, dhcpd.conf completo y servicio activo' }
    },
  },
  related: RELATED,
}
