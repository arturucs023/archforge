import type { SectionContent } from '../../types'
import { p, h, ul, ol, cmd, out, info, tip, warn, deep, tbl, viz } from '../helpers'

export const networking3: Record<string, SectionContent> = {
  'net-bgp': {
    related: ['net-ospf', 'net-igp', 'net-routing', 'net-ipv4'],
    steps: [
      {
        id: 'netbgp-01-as',
        title: 'Sistemas autónomos: IGP vs EGP',
        goal: 'Entender qué es un AS y por qué Internet necesita BGP.',
        importance: 'required',
        minutes: 12,
        blocks: [
          p('Un Sistema Autónomo (AS) es una red bajo UNA administración con UNA política de encaminamiento: tu ISP, una universidad grande, una Big Tech. Cada AS tiene un número (ASN): 16 bits (1–64511 públicos, 64512–65534 privados, 65535 reservado) y 32 bits modernos (RFC 6793; privados 4200000000–4294967294 según RFC 6996). Dentro del AS manda el IGP (coste técnico); ENTRE AS manda BGP (política + dinero).'),
          tbl(
            ['Relación BGP', 'Quién paga a quién', 'Qué rutas se anuncian'],
            [
              ['Tránsito (proveedor → cliente)', 'El cliente paga', 'El proveedor anuncia TODO (full table o default) al cliente'],
              ['Peering (iguales)', 'Nadie (intercambio mutuo)', 'Solo clientes propios, NUNCA el tránsito completo (si no, regalas ancho de banda)'],
              ['Cliente → proveedor', 'Tú pagas', 'Tú anuncias SOLO tus prefijos'],
            ],
          ),
          warn('La regla de oro del peering', 'Nunca anuncies a un peer lo que aprendiste de otro peer o proveedor: te convertirías en tránsito gratis y tu red se saturaría. Gran parte de los outages históricos de BGP son violaciones de esta regla (route leaks).'),
        ],
        expect: 'Defines AS/ASN y las 3 relaciones económicas con sus anuncios correctos.',
      },
      {
        id: 'netbgp-02-mecanica',
        title: 'Mecánica: vecinos TCP, mensajes y path vector',
        goal: 'Describir cómo hablan dos routers BGP y qué anuncian.',
        importance: 'required',
        minutes: 15,
        blocks: [
          p('BGP es path vector sobre TCP/179 (sesión manual entre vecinos, no descubrimiento): eBGP entre AS distintos, iBGP dentro del mismo AS (con malla completa o route reflectors para no mallar N²). Intercambian:'),
          tbl(
            ['Mensaje', 'Función'],
            [
              ['OPEN', 'Negocia versión, ASN, hold time e ID. Si no encaja, NOTIFICATION y fuera.'],
              ['KEEPALIVE', '«Sigo vivo» periódico (1/3 del hold time).'],
              ['UPDATE', 'Anuncia (NLRI + atributos) o retira prefijos. El caballo de batalla.'],
              ['NOTIFICATION', '«Cierro por este error» y se cae la sesión (y todas sus rutas: por eso un flap BGP duele).'],
            ],
          ),
          h('Atributos clave (los que deciden)'),
          tbl(
            ['Atributo', 'Alcance', 'Idea en una línea'],
            [
              ['NEXT_HOP', 'El siguiente salto (¡cambia en eBGP, NO en iBGP!)', 'El error nº1 de iBGP: next-hop inalcanzable → ruta inactiva'],
              ['AS_PATH', 'Global', 'Lista de AS: evita bucles (si veo mi ASN, descarto) y mide «longitud»'],
              ['LOCAL_PREF', 'Dentro del AS', 'Mi preferencia de SALIDA: más alto = prefiero salir por ahí'],
              ['MED', 'Hacia el AS vecino', 'Sugerencia de por dónde ENTRAR en mi AS (más bajo = prefiero). Solo compara mismo AS vecino.'],
              ['ORIGIN', 'Global', 'Cómo nació el prefijo: IGP (i) > EGP (e) > Incomplete (?), los códigos que verás en «show ip bgp»'],
              ['Communities', 'Pactadas', 'Etiquetas (no anunciar a X, prepend en Y…): la automatización de la política'],
            ],
          ),
          info('iBGP no re-anuncia (split horizon)', 'Lo aprendido por iBGP no se pasa a otro iBGP: o malla completa o route reflectors/confederaciones. Es la trampa favorita de laboratorio: «iBGP up pero la ruta no aparece al tercer router».'),
        ],
        expect: 'Describes la sesión BGP, sus 4 mensajes y los 6 atributos.',
      },
      {
        id: 'netbgp-03-bestpath',
        title: 'Cómo BGP elige la mejor ruta (paso a paso)',
        goal: 'Aplicar el algoritmo de decisión ante varias rutas al mismo prefijo.',
        importance: 'required',
        minutes: 22,
        blocks: [
          p('BGP evalúa en ORDEN y se detiene en cuanto queda una ganadora: paso 0) descarta rutas con NEXT_HOP irresoluble por tu IGP (sin next-hop alcanzable la ruta es decoración); 1) LOCAL_PREF mayor, 2) AS_PATH más corto, 3) ORIGIN (IGP>EGP>incompleta), 4) MED menor, 5) preferir eBGP sobre iBGP, 6) menor coste IGP al next-hop, 7) Router-ID menor. Política (1) antes que técnica (2+). Es la lista vendor-neutral; Cisco antepone además su Weight propietario (local al router) y añade desempates finales (Cluster-list, Originator-ID…). Míralo en acción:'),
          viz('bgp', 'Tres rutas, un prefijo: sigue la eliminación'),
          deep('Caso realista: MED solo entre iguales', 'El MED compara ENTRADAS desde el MISMO AS vecino; entre AS distintos se ignora (o se compara si siempre-compare-med, con cuidado). Y LOCAL_PREF no sale de tu AS: es tu política interna de salida. Confundir el alcance de cada atributo es el error conceptual nº 1 en BGP.', ['NEXT_HOP: si no es alcanzable por tu IGP, la ruta BGP es decoración.']),
          h('Agregación, filtrado y redistribución'),
          ul('Agrega en el borde (aggregate-address): menos prefijos, más estabilidad; con cuidado de no enterrar agujeros.', 'Filtra TODO con prefix-lists + max-prefix: acepta solo lo de tu cliente/peer y corta sesiones que inunden (memoria finita).', 'Redistribuye IGP→BGP con filtros estrictos (nunca «redistribute connected» a lo loco) y marca communities para automatizar la política aguas abajo.'),
        ],
        expect: 'Dadas 3 rutas con atributos, determinas la ganadora y el criterio decisivo.',
      },
    ],
  },

  'net-nat': {
    related: ['net-ipv4', 'net-routing', 'net-servicios'],
    steps: [
      {
        id: 'netnat-01-porque',
        title: 'Por qué existe NAT',
        goal: 'Explicar NAT como consecuencia del agotamiento de IPv4.',
        importance: 'required',
        minutes: 10,
        blocks: [
          p('IPv4 tiene 4 294 M de direcciones: insuficientes desde hace años (el pool libre de IANA se agotó en 2011). NAT permite que TODA una LAN privada salga con UNA (o pocas) IP públicas, reutilizando el espacio RFC 1918 en millones de redes a la vez. Sin NAT, IPv4 habría colapsado en los 2000; con NAT + CIDR aguantó hasta IPv6. Relación directa: NAT es el parche que nos dio 20 años de aire.'),
          tbl(
            ['Lado', 'Direcciones', 'Ejemplo'],
            [
              ['Inside (privado)', 'RFC 1918, solo válidas en tu LAN', '192.168.1.10'],
              ['Outside (público)', 'Globales, enrutables en Internet', '203.0.113.5'],
            ],
          ),
          info('NAT ≠ firewall (pero ayuda)', 'NAT por sí mismo oculta topología y bloquea conexiones entrantes no solicitadas (no hay entrada en la tabla → se descarta), pero NO inspecciona ni decide por política: un firewall stateful sí. «Estoy tras NAT, estoy seguro» es falso: el malware sale igual y hay técnicas de NAT traversal.'),
        ],
        expect: 'Vinculas agotamiento IPv4 → RFC 1918 → NAT y matizas NAT vs firewall.',
      },
      {
        id: 'netnat-02-tipos',
        title: 'Estático, dinámico, PAT y port forwarding',
        goal: 'Elegir el tipo de NAT y predecir la traducción de un paquete.',
        importance: 'required',
        minutes: 18,
        blocks: [
          viz('nat', 'El paquete antes y después: elige escenario'),
          tbl(
            ['Tipo', 'Mapeo', 'Cuándo'],
            [
              ['Estático 1:1', 'IP privada ↔ IP pública fija, por defecto sin cambiar puertos (salvo static-PAT explícito)', 'Servidor que debe ser siempre la misma IP pública'],
              ['Dinámico (pool)', 'Privada ↔ primera libre del pool', 'Raro hoy (gasta públicas casi como el estático)'],
              ['PAT / overload (N:1)', 'Muchas privadas → 1 pública, distinguiendo por PUERTO', 'El 99 % de hogares y pymes: lo que hace tu router'],
              ['Port forwarding (DNAT)', 'Pública:puerto → privada:puerto (tráfico ENTRANTE)', 'Publicar un servicio casero (ojo a seguridad)'],
            ],
          ),
          h('La tabla NAT'),
          p('El router guarda por flujo: inside local/puerto ↔ inside global/puerto ↔ outside/destino, con temporizadores. Sin entrada no hay vuelta: por eso las conexiones las INICIA el interior (o una regla estática las espera). Tabla llena o timeout corto = «se cortan las conexiones» (típico en CGNAT saturado).'),
          deep('Hairpin NAT y límites reales', 'Hairpin: acceder a tu propio servidor por su IP PÚBLICA desde dentro (el router debe «doblar» el tráfico). Si falla, usa split-DNS (dentro resuelve la privada). Límites de NAT: rompe el principio extremo-a-extremo (IPsec original, FTP activo, SIP… necesitan helpers/ALG), dificulta P2P/servidores y concentra fallos. IPv6 lo elimina por diseño.', ['CGNAT (100.64/10): tu ISP ya te hace NAT antes de Internet. Doble NAT = UPnP roto, juegos con NAT estricta, servidores caseros complicados.']),
        ],
        expect: 'Dado un escenario, eliges el NAT correcto y describes su tabla.',
      },
    ],
  },

  'net-servicios': {
    related: ['net-fundamentos', 'net-ipv4', 'net-nat'],
    steps: [
      {
        id: 'netsvc-01-dhcp-dns',
        title: 'DHCP y DNS (los imprescindibles)',
        goal: 'Explicar DORA y la resolución DNS con sus registros.',
        importance: 'required',
        minutes: 20,
        blocks: [
          h('DHCP: DORA'),
          ol('Discover (broadcast): «¿hay algún servidor?»', 'Offer (unicast, o broadcast si el cliente puso el flag BROADCAST): «te ofrezco IP X, gateway, DNS, lease T»', 'Request (en broadcast, para que TODOS los servidores que ofertaron se enteren de a quién elegiste): «acepto la X»', 'ACK: «confirmado, tuya durante T» (renueva a T/2, reintenta en broadcast a 7T/8; también existen NAK, Decline y Release)'),
          cmd({ caption: 'DHCP y DNS en Arch' }, '# ¿IP por DHCP? ¿gateway? ¿lease?', 'ip -br addr show', 'ip route show default', '# ¿Qué DNS uso?', 'cat /etc/resolv.conf', '# Preguntar a mano (paquete bind)', 'nslookup archlinux.org', 'dig +short archlinux.org AAAA'),
          h('DNS: la guía telefónica jerárquica'),
          p('Resolución: tu equipo (stub) pregunta a SU resolver recursivo (el de tu ISP o 1.1.1.1/8.8.8.8); es el RECURSIVO quien itera la jerarquía: ¿está en caché? → raíz (.) → TLD (.org) → autoritativo (archlinux.org) → IP. No confundas roles: el autoritativo responde de SUS zonas, el recursivo trabaja para ti. Registros clave: A/AAAA (nombre→IP), CNAME (alias), MX (correo), TXT (SPF/DKIM/DMARC), PTR (inversa), NS/SOA (delegación).'),
          warn('Si ves 169.254.x.x, tu DHCP falla', 'APIPA = el cliente gritó Discover y nadie contestó (servidor caído, VLAN mal puesta, cable/puerto, o el Discover no vuelve: ojo a relays en inter-VLAN — ip helper / DHCP relay). Diagnóstico: captura el DORA; donde se rompa la cadena está el culpable.'),
        ],
        expect: 'Narras DORA y una resolución DNS completa, y diagnosticas un fallo DHCP.',
      },
      {
        id: 'netsvc-02-tiempo-logs-mon',
        title: 'NTP, Syslog y SNMP',
        goal: 'Entender por qué el tiempo y los logs sostienen todo lo demás.',
        importance: 'recommended',
        minutes: 12,
        blocks: [
          tbl(
            ['Servicio', 'Puerto', 'Para qué (en serio)'],
            [
              ['NTP (UDP/123)', 'Hora exacta (stratum)', 'Sin hora común: TLS falla, Kerberos falla, los logs son inútiles y el troubleshooting es ciego. chrony/systemd-timesyncd en Arch.'],
              ['Syslog (UDP/TCP 514)', 'Logs centralizados', 'Switches/routers con buffer tiny: sin syslog remoto, el log del apagón muere con el equipo.'],
              ['SNMP (UDP 161/162)', 'Monitorización (poll + traps)', 'Grafica CPU/tráfico/errores; v3 con auth+priv (v2c «public» = regalo al atacante).'],
            ],
          ),
          cmd({ caption: 'Hora y logs en Arch' }, 'timedatectl status', 'journalctl -b -p err --no-pager | head -20'),
          info('NTP antes que TLS', 'Un reloj desviado años invalida certificados (¿«tu certificado aún no es válido» en equipo nuevo? mira la pila CMOS/NTP). NTP es infraestructura de seguridad, no «un reloj bonito».'),
        ],
        expect: 'Justificas NTP/Syslog/SNMP como base operativa, no como extras.',
      },
      {
        id: 'netsvc-03-web-ssh-tls',
        title: 'SSH, HTTP/HTTPS y TLS',
        goal: 'Distinguir transporte seguro de protocolo, y qué valida TLS.',
        importance: 'required',
        minutes: 15,
        blocks: [
          tbl(
            ['Servicio', 'Puerto', 'Seguridad'],
            [
              ['SSH', '22', 'Cifrado + autenticación (claves > password). Todo admin remota va aquí: Telnet está muerto.'],
              ['HTTP', '80', 'Texto plano: solo para redireccionar a HTTPS o redes cautivas.'],
              ['HTTPS = HTTP + TLS', '443', 'Confidencialidad + integridad + autenticidad del SERVIDOR (y cliente si mTLS).'],
            ],
          ),
          h('Qué hace TLS (sin humo)'),
          ol('Handshake: negocian versión y cifrados, el servidor presenta su certificado (cadena hasta una CA de confianza + nombre coincidente + fechas + no revocado).', 'Autenticación: el cliente valida la cadena. Sin esto, cifrado contra un impostor = inútil.', 'Claves de sesión efímeras con suites ECDHE/DHE (forward secrecy: cada sesión, claves nuevas que no se derivan de la clave del certificado). En TLS 1.3 todo intercambio es efímero; en 1.2 con RSA estático NO hay forward secrecy.', 'Cifrado simétrico del tráfico + integridad (AEAD).'),
          warn('HTTPS cifra, no legitima', 'El candado dice «la conexión con ESTE nombre es privada», no «este sitio es honesto». El phishing también usa HTTPS (gratis con Let’s Encrypt). Valida el DOMINIO, no el candado.'),
          cmd({ caption: 'Inspección rápida' }, '# ¿Qué certificado sirve un sitio? (openssl)', 'echo | openssl s_client -connect archlinux.org:443 -servername archlinux.org 2>/dev/null | openssl x509 -noout -issuer -dates -ext subjectAltName'),
        ],
        expect: 'Explicas el handshake TLS y qué garantiza (y qué no) el candado.',
      },
    ],
  },

  'net-seguridad': {
    related: ['net-switching', 'net-servicios', 'net-nat'],
    steps: [
      {
        id: 'netsec-01-acl-firewall',
        title: 'ACL y firewalls (stateless vs stateful)',
        goal: 'Escribir ACL con criterio y explicar la tabla de estados.',
        importance: 'required',
        minutes: 18,
        blocks: [
          p('Una ACL es una lista ordenada de reglas (permit/deny por IP, puerto, protocolo) con DENY implícito al final: la PRIMERA coincidencia decide, así que el orden es la configuración. Van en routers, switches L3 y firewalls; también en Linux (nftables/iptables).'),
          cmd({ caption: 'La misma idea en tu Arch (nftables)' }, '# Ver reglas actuales', 'nft list ruleset', '# Política sensata de ejemplo (¡adapta la interfaz!)', 'nft add rule inet filter input ct state established,related accept', 'nft add rule inet filter input iif lo accept', 'nft add rule inet filter input tcp dport 22 accept', 'nft add rule inet filter input drop'),
          h('Sin estado vs con estado'),
          tbl(
            ['Tipo', 'Qué mira', 'Ejemplo de fallo'],
            [
              ['Stateless (ACL pura)', 'Cada paquete aislado', 'Permites «salir al 80» pero debes permitir a mano la VUELTA (puertos altos): o abres de más o rompes cosas.'],
              ['Stateful', 'Conexión completa (tabla de estados: SYN visto, establecido…)', '«Permitir salida y su retorno» en una regla: established,related. Es lo que hace tu router doméstico y nftables/ufw.'],
            ],
          ),
          warn('El established,related va PRIMERO', 'Si tu regla de aceptar retorno está después del drop, nada vuelve. Orden clásico: 1) established/related, 2) loopback, 3) lo explícito (SSH…), 4) drop/log. Verifica siempre con nmap desde fuera.'),
        ],
        expect: 'Escribes una política mínima ordenada y explicas la tabla de estados.',
      },
      {
        id: 'netsec-02-ids-vpn',
        title: 'IDS/IPS, VPN e IPsec',
        goal: 'Situar detección y túneles sin confundirlos con el firewall.',
        importance: 'required',
        minutes: 15,
        blocks: [
          tbl(
            ['Pieza', 'Qué hace', 'Dónde vive'],
            [
              ['IDS (detección)', 'Detecta y ALERTA (firmas + anomalías). No toca el tráfico.', 'En span/tap del tráfico'],
              ['IPS (prevención)', 'Detecta y BLOQUEA en línea.', 'En el camino del tráfico (o firewall con módulo IPS)'],
              ['VPN', 'Túnel cifrado sobre red insegura (acceso remoto o site-to-site).', 'Cliente↔sede, sede↔sede'],
              ['IPsec', 'EL estándar de túneles L3 (AH/ESP, IKEv2, modos transporte/túnel).', 'Routers/firewalls; WireGuard es la alternativa moderna L3 simple y rápida'],
            ],
          ),
          info('VPN ≠ privacidad total', 'Una VPN mueve tu punto de salida: tu ISP ve «túnel a X» y X ve tu tráfico. Protege del Wi-Fi ajeno y del ISP curioso, pero el proveedor VPN se vuelve tu nuevo ISP: elóigelo con el mismo escepticismo. Para anonimato real el modelo es otro (Tor).'),
          deep('IPsec en 4 ideas', 'ESP cifra+autentica; IKEv2 negocia y re-negocia claves; modo TÚNEL (gateway↔gateway, típico site-to-site) vs TRANSPORTE (host↔host); y NAT-T existe porque IPsec y NAT se llevan regular (ver net-nat: otro motivo por el que NAT rompe el extremo a extremo). WireGuard hace lo mismo con 4.000 líneas y roaming nativo: por eso arrasa en despliegues nuevos.', ['Site-to-site = siempre activo; acceso remoto = bajo demanda con MFA.']),
        ],
        expect: 'Distingues IDS de IPS y VPN de IPsec, y eliges modo de túnel.',
      },
      {
        id: 'netsec-03-arquitectura-ddos',
        title: 'Segmentación, Zero Trust y DoS/DDoS',
        goal: 'Diseñar defensa en profundidad a nivel conceptual.',
        importance: 'recommended',
        minutes: 15,
        blocks: [
          h('Segmentación: que un fallo no sea total'),
          ul('VLANs + firewall inter-VLAN (invitados, IoT, servidores, gestión: nada habla con nada por defecto).', 'DMZ: lo expuesto a Internet vive aparte, con reglas mínimas hacia dentro (idealmente ninguna iniciada desde DMZ).', 'Microsegmentación / Zero Trust: «nunca confíes, verifica siempre» — identidad + MFA + políticas por carga, no por estar «dentro». El perímetro difuso (cloud, remoto) mató el castillo-con-foso.'),
          h('DoS/DDoS (conceptual)'),
          tbl(
            ['Tipo', 'Idea', 'Defensa (concepto)'],
            [
              ['Volumétrico (UDP floods, amplificación DNS/NTP)', 'Saturar el tubo', 'Absorción aguas arriba (ISP, CDN, centro de scrubbing/limpieza), anycast'],
              ['Protocolo (SYN flood)', 'Agotar tablas/estados', 'SYN cookies, límites, stateful bien dimensionado'],
              ['Aplicación (HTTP lento, L7)', 'Agotar la app con poco tráfico', 'WAF, rate-limit, caché/CDN, escalar'],
            ],
          ),
          warn('No «mitigues DDoS» en tu router casero', 'Un volumétrico serio (cientos de Gbps) solo se absorbe con capacidad distribuida (proveedor/CDN). Tu parte: arquitectura que no amplifique (sin open resolvers/relays), monitoreo para detectarlo y un plan (a quién llamas, qué apagas primero).'),
        ],
        expect: 'Propones segmentación + Zero Trust y clasificas un DDoS con su defensa.',
      },
    ],
  },
}
