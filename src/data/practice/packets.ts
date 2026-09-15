/* Escenarios del Packet Inspector: flujos de mensajes simulados con campos
   educativos por capa. Nada real: solo comprensión de protocolos. */

export interface PacketField {
  k: string
  v: string
  /** resaltado pedagógico */
  hot?: boolean
}

export interface PacketLayer {
  name: string
  fields: PacketField[]
}

export interface PacketMessage {
  from: string
  to: string
  label: string
  note: string
  layers: PacketLayer[]
}

export interface PacketScenario {
  id: string
  protocol: string
  title: string
  story: string
  messages: PacketMessage[]
}

export const PACKET_SCENARIOS: PacketScenario[] = [
  {
    id: 'pkt-arp',
    protocol: 'ARP',
    title: 'ARP: ¿quién tiene 192.168.1.20?',
    story: 'PC1 (.10) quiere hablar con PC2 (.20) en su misma LAN y solo conoce su IP.',
    messages: [
      {
        from: 'PC1', to: 'Broadcast', label: 'ARP Request',
        note: 'Al no conocer la MAC destino, pregunta a toda la LAN.',
        layers: [
          { name: 'Ethernet', fields: [{ k: 'Source MAC', v: 'aa:bb:cc:11:22:33', hot: true }, { k: 'Destination MAC', v: 'ff:ff:ff:ff:ff:ff', hot: true }, { k: 'EtherType', v: '0x0806 (ARP)' }] },
          { name: 'ARP', fields: [{ k: 'Sender IP', v: '192.168.1.10' }, { k: 'Sender MAC', v: 'aa:bb:cc:11:22:33' }, { k: 'Target IP', v: '192.168.1.20', hot: true }, { k: 'Target MAC', v: '00:00:00:00:00:00 (vacía)' }] },
        ],
      },
      {
        from: 'PC2', to: 'PC1', label: 'ARP Reply',
        note: 'Solo el dueño responde, por unicast. PC1 guarda la entrada en su tabla.',
        layers: [
          { name: 'Ethernet', fields: [{ k: 'Source MAC', v: 'dd:ee:ff:44:55:66' }, { k: 'Destination MAC', v: 'aa:bb:cc:11:22:33' }, { k: 'EtherType', v: '0x0806 (ARP)' }] },
          { name: 'ARP', fields: [{ k: 'Sender IP', v: '192.168.1.20' }, { k: 'Sender MAC', v: 'dd:ee:ff:44:55:66', hot: true }, { k: 'Target IP', v: '192.168.1.10' }, { k: 'Target MAC', v: 'aa:bb:cc:11:22:33' }] },
        ],
      },
    ],
  },
  {
    id: 'pkt-eth',
    protocol: 'Ethernet',
    title: 'Ethernet: una trama entre vecinos',
    story: 'PC1 envía un paquete IP a su gateway. La trama solo vive hasta el próximo salto.',
    messages: [
      {
        from: 'PC1', to: 'Gateway', label: 'Frame Ethernet II',
        note: 'Destino = MAC del gateway (no del destino final). Cada router la destruye y crea una nueva.',
        layers: [
          { name: 'Ethernet', fields: [{ k: 'Destination MAC', v: 'MAC del gateway', hot: true }, { k: 'Source MAC', v: 'MAC de PC1' }, { k: 'EtherType', v: '0x0800 (IPv4)' }, { k: 'FCS', v: 'checksum de integridad' }] },
          { name: 'IPv4 (carga)', fields: [{ k: 'IP destino final', v: '93.184.216.34 (¡distinta!)', hot: true }] },
        ],
      },
    ],
  },
  {
    id: 'pkt-ipv4',
    protocol: 'IPv4',
    title: 'IPv4: la cabecera que enruta',
    story: 'Campos que todo router lee para decidir el próximo salto.',
    messages: [
      {
        from: 'Origen', to: 'Destino', label: 'Paquete IPv4',
        note: 'TTL evita bucles eternos; Protocolo dice qué hay dentro (6=TCP, 17=UDP, 1=ICMP).',
        layers: [
          { name: 'IPv4', fields: [{ k: 'Source IP', v: '192.168.1.10' }, { k: 'Destination IP', v: '93.184.216.34', hot: true }, { k: 'TTL', v: '64 (decrementa por salto)', hot: true }, { k: 'Protocol', v: '6 (TCP)' }, { k: 'Flags + Fragment Offset', v: 'DF = no fragmentar (PMTU)' }, { k: 'Header Checksum', v: 'solo cabecera' }] },
        ],
      },
    ],
  },
  {
    id: 'pkt-icmp',
    protocol: 'ICMP',
    title: 'ICMP: ping y errores',
    story: 'PC1 comprueba si el gateway responde.',
    messages: [
      {
        from: 'PC1', to: 'Gateway', label: 'Echo Request (type 8)',
        note: 'Type 8 = pregunta. Incluye identificador y secuencia para emparejar respuestas.',
        layers: [
          { name: 'IPv4', fields: [{ k: 'Protocol', v: '1 (ICMP)', hot: true }] },
          { name: 'ICMP', fields: [{ k: 'Type', v: '8 (echo request)', hot: true }, { k: 'Code', v: '0' }, { k: 'Identifier / Sequence', v: 'emparejan pregunta-respuesta' }] },
        ],
      },
      {
        from: 'Gateway', to: 'PC1', label: 'Echo Reply (type 0)',
        note: 'Type 0 = respuesta. El RTT mide la ida y vuelta.',
        layers: [
          { name: 'IPv4', fields: [{ k: 'Protocol', v: '1 (ICMP)' }] },
          { name: 'ICMP', fields: [{ k: 'Type', v: '0 (echo reply)', hot: true }, { k: 'Code', v: '0' }] },
        ],
      },
    ],
  },
  {
    id: 'pkt-tcp',
    protocol: 'TCP',
    title: 'TCP: apretón de manos en 3 vías',
    story: 'Cliente abre conexión HTTPS al puerto 443 del servidor.',
    messages: [
      {
        from: 'Cliente', to: 'Servidor', label: 'SYN',
        note: 'SYN=1 propone secuencia inicial. Puertos: efímero → 443.',
        layers: [
          { name: 'TCP', fields: [{ k: 'Source port', v: '52344 (efímero)', hot: true }, { k: 'Destination port', v: '443', hot: true }, { k: 'Flags', v: 'SYN', hot: true }, { k: 'Sequence', v: '1000 (ISN)' }] },
        ],
      },
      {
        from: 'Servidor', to: 'Cliente', label: 'SYN + ACK',
        note: 'Acepta (ACK 1001) y propone su propia secuencia.',
        layers: [
          { name: 'TCP', fields: [{ k: 'Flags', v: 'SYN, ACK', hot: true }, { k: 'Sequence', v: '7800 (ISN)' }, { k: 'Acknowledgment', v: '1001 (= SEQ+1)', hot: true }] },
        ],
      },
      {
        from: 'Cliente', to: 'Servidor', label: 'ACK',
        note: 'Conexión ESTABLISHED: empiezan los datos (y luego TLS).',
        layers: [
          { name: 'TCP', fields: [{ k: 'Flags', v: 'ACK' }, { k: 'Acknowledgment', v: '7801', hot: true }] },
        ],
      },
    ],
  },
  {
    id: 'pkt-udp',
    protocol: 'UDP',
    title: 'UDP: mínimo viable',
    story: 'Consulta DNS al puerto 53: una pregunta, una respuesta, sin conexión.',
    messages: [
      {
        from: 'Cliente', to: 'DNS 1.1.1.1', label: 'Datagrama UDP',
        note: '8 bytes de cabecera y listo: sin secuencia, sin ACK, sin reintentos.',
        layers: [
          { name: 'UDP', fields: [{ k: 'Source port', v: '53210' }, { k: 'Destination port', v: '53 (DNS)', hot: true }, { k: 'Length / Checksum', v: 'tamaño + integridad' }] },
          { name: 'DNS (carga)', fields: [{ k: 'Query', v: 'archlinux.org A?' }] },
        ],
      },
    ],
  },
  {
    id: 'pkt-dhcp',
    protocol: 'DHCP',
    title: 'DHCP: el ciclo DORA',
    story: 'Un portátil recién conectado pide red. Fíjate en broadcast vs unicast.',
    messages: [
      {
        from: 'Cliente (0.0.0.0)', to: 'Broadcast', label: 'Discover',
        note: 'Sin IP aún: origen 0.0.0.0, destino broadcast, puerto UDP 67.',
        layers: [
          { name: 'UDP', fields: [{ k: 'Source port', v: '68 (cliente)', hot: true }, { k: 'Destination port', v: '67 (servidor)', hot: true }] },
          { name: 'DHCP', fields: [{ k: 'Mensaje', v: 'DISCOVER', hot: true }, { k: 'Transaction ID', v: 'empareja las 4 fases' }] },
        ],
      },
      {
        from: 'Servidor', to: 'Broadcast', label: 'Offer',
        note: '«Te ofrezco .50, gateway, DNS y lease». Puede haber varias ofertas.',
        layers: [
          { name: 'DHCP', fields: [{ k: 'Mensaje', v: 'OFFER' }, { k: 'Your IP', v: '192.168.1.50', hot: true }, { k: 'Subnet / Router / DNS', v: 'máscara, gateway, DNS' }, { k: 'Lease time', v: 'duración de la concesión' }] },
        ],
      },
      {
        from: 'Cliente', to: 'Broadcast', label: 'Request',
        note: 'En broadcast para que TODOS los servidores sepan a quién eligió.',
        layers: [{ name: 'DHCP', fields: [{ k: 'Mensaje', v: 'REQUEST', hot: true }, { k: 'Requested IP', v: '192.168.1.50' }] }],
      },
      {
        from: 'Servidor', to: 'Cliente', label: 'ACK',
        note: 'Confirmado: la IP es tuya durante el lease (renueva a T/2).',
        layers: [{ name: 'DHCP', fields: [{ k: 'Mensaje', v: 'ACK', hot: true }] }],
      },
    ],
  },
  {
    id: 'pkt-dns',
    protocol: 'DNS',
    title: 'DNS: pregunta y respuesta',
    story: 'El resolver pregunta por archlinux.org; el servidor responde con registros.',
    messages: [
      {
        from: 'Resolver', to: 'Servidor', label: 'Query (recursiva)',
        note: 'QR=0 (pregunta). El stub solo habla con su recursivo.',
        layers: [
          { name: 'DNS', fields: [{ k: 'QR', v: '0 = query', hot: true }, { k: 'Question', v: 'archlinux.org IN A' }, { k: 'RD', v: '1 = quiero recursión' }] },
        ],
      },
      {
        from: 'Servidor', to: 'Resolver', label: 'Response',
        note: 'QR=1 con las secciones Answer/Authority/Additional.',
        layers: [
          { name: 'DNS', fields: [{ k: 'QR', v: '1 = respuesta', hot: true }, { k: 'Answer', v: 'A 95.217.163.246 (ejemplo)' }, { k: 'TTL', v: 'cuánto cachear' }] },
        ],
      },
    ],
  },
  {
    id: 'pkt-ndp',
    protocol: 'NDP',
    title: 'NDP: el «ARP» de IPv6',
    story: 'Host pregunta por el vecino fe80::2 con ICMPv6 multicast (sin broadcasts en IPv6).',
    messages: [
      {
        from: 'Host', to: ' solicited-node multicast', label: 'Neighbor Solicitation (135)',
        note: 'ICMPv6 tipo 135. El multicast llega solo a quien debe.',
        layers: [
          { name: 'IPv6', fields: [{ k: 'Next Header', v: '58 (ICMPv6)', hot: true }] },
          { name: 'ICMPv6', fields: [{ k: 'Type', v: '135 (solicitation)', hot: true }, { k: 'Target', v: 'fe80::2' }, { k: 'Opción', v: 'mi link-layer address' }] },
        ],
      },
      {
        from: 'Vecino', to: 'Host', label: 'Neighbor Advertisement (136)',
        note: 'Tipo 136 por unicast con su MAC. También sirve para DAD y router discovery.',
        layers: [
          { name: 'ICMPv6', fields: [{ k: 'Type', v: '136 (advertisement)', hot: true }, { k: 'Flags', v: 'S (solicited) / O (override)' }] },
        ],
      },
    ],
  },
  {
    id: 'pkt-ipv6',
    protocol: 'IPv6',
    title: 'IPv6: cabecera simplificada',
    story: 'Lo que todo router IPv6 lee: poco y fijo (40 bytes).',
    messages: [
      {
        from: 'Origen', to: 'Destino', label: 'Paquete IPv6',
        note: 'Sin checksum (lo hace L2/L4), sin fragmentación en ruta. Hop Limit = TTL.',
        layers: [
          { name: 'IPv6', fields: [{ k: 'Source', v: '2001:db8::10' }, { k: 'Destination', v: '2001:db8::80', hot: true }, { k: 'Hop Limit', v: '64', hot: true }, { k: 'Next Header', v: '6 (TCP)' }, { k: 'Flow Label', v: 'QoS por flujo' }] },
        ],
      },
    ],
  },
  {
    id: 'pkt-http',
    protocol: 'HTTP',
    title: 'HTTP: petición y respuesta',
    story: 'GET a / con Host obligatorio (virtual hosting).',
    messages: [
      {
        from: 'Cliente', to: 'Servidor', label: 'GET / HTTP/1.1',
        note: 'Método + ruta + versión. Host decide qué web sirve.',
        layers: [
          { name: 'HTTP', fields: [{ k: 'Request line', v: 'GET / HTTP/1.1', hot: true }, { k: 'Host', v: 'ejemplo.com', hot: true }, { k: 'User-Agent / Accept', v: 'quién pide y qué acepta' }] },
        ],
      },
      {
        from: 'Servidor', to: 'Cliente', label: '200 OK',
        note: '2xx éxito · 3xx redirección · 4xx tu culpa · 5xx la suya.',
        layers: [
          { name: 'HTTP', fields: [{ k: 'Status', v: '200 OK', hot: true }, { k: 'Content-Type/Length', v: 'qué viene y cuánto' }] },
        ],
      },
    ],
  },
  {
    id: 'pkt-tls',
    protocol: 'TLS',
    title: 'TLS: antes del primer byte HTTP',
    story: 'El handshake valida al servidor y pacta claves efímeras (forward secrecy).',
    messages: [
      {
        from: 'Cliente', to: 'Servidor', label: 'ClientHello',
        note: 'Versión, cifrados que acepto y nonce aleatorio.',
        layers: [
          { name: 'TLS', fields: [{ k: 'Mensaje', v: 'ClientHello', hot: true }, { k: 'Cipher suites', v: 'lista ofrecida' }, { k: 'Random', v: 'entropía del cliente' }] },
        ],
      },
      {
        from: 'Servidor', to: 'Cliente', label: 'ServerHello + Certificado',
        note: 'Elige suite, manda su nonce Y su certificado: aquí se valida la cadena.',
        layers: [
          { name: 'TLS', fields: [{ k: 'Mensajes', v: 'ServerHello, Certificate…', hot: true }, { k: 'Certificate', v: 'cadena hasta CA + nombre + fechas', hot: true }] },
        ],
      },
      {
        from: 'Ambos', to: 'Ambos', label: 'Finished → tráfico cifrado',
        note: 'Con ECDHE cada sesión tiene claves nuevas: robar la clave del certificado NO descifra el pasado.',
        layers: [
          { name: 'TLS', fields: [{ k: 'Claves', v: 'efímeras por sesión (forward secrecy)', hot: true }] },
        ],
      },
    ],
  },
]

export const PACKET_MAP = new Map(PACKET_SCENARIOS.map((s) => [s.id, s]))
