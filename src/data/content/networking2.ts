import type { SectionContent } from '../../types'
import { p, h, ul, ol, cmd, out, info, tip, warn, deep, tbl, viz } from '../helpers'

export const networking2: Record<string, SectionContent> = {
  'net-stp': {
    related: ['net-switching', 'net-routing', 'net-ipv4'],
    steps: [
      {
        id: 'netstp-01-problema',
        title: 'El problema: bucles de capa 2',
        goal: 'Entender por qué un bucle físico mata la red en segundos.',
        importance: 'required',
        minutes: 15,
        blocks: [
          p('En capa 3 los paquetes tienen TTL: un bucle de routers se autodestruye. En capa 2 las tramas NO tienen TTL: un bucle físico (dos cables entre los mismos switches, o un triángulo) recircula tramas eternamente. Tres catástrofes simultáneas:'),
          h('1. Broadcast storm'),
          p('Un broadcast (ARP, DHCP) entra por un puerto, sale por todos, vuelve por el otro cable, sale por todos… crecimiento exponencial que satura enlaces y CPUs en segundos. La red «se queda colgada» sin que nada esté roto físicamente.'),
          h('2. Inestabilidad de la tabla MAC (MAC flapping)'),
          p('La misma MAC origen llega alternativamente por dos puertos (cada vuelta del bucle). El switch reescribe su tabla CAM sin parar y el forwarding unicast falla: los mensajes llegan a ráfagas o nunca. Los logs gritan «MAC flap between ports».'),
          h('3. Duplicados'),
          p('Cada vuelta entrega otra copia al destino. Protocolos sensibles (algunos industriales, clustering) enloquecen.'),
          warn('Redundancia sin STP = suicidio', 'La redundancia física es deseable (si cae un cable, queda otro), pero SIN un protocolo que bloquee lógicamente el camino extra, el segundo cable es una bomba. STP existe para tener enlaces de sobra dormidos y despertarlos solo si hace falta.'),
        ],
        expect: 'Explicas las 3 consecuencias de un bucle L2 y por qué el TTL no las evita.',
      },
      {
        id: 'netstp-02-piezas',
        title: 'Piezas: BPDU, BID, costes y puertos',
        goal: 'Dominar el vocabulario exacto con el que STP decide.',
        importance: 'required',
        minutes: 15,
        blocks: [
          tbl(
            ['Pieza', 'Qué es', 'Detalle'],
            [
              ['BPDU', 'Mensaje STP multicast (a 01:80:C2:00:00:00) que anuncia «quién creo que es el Root y cuánto me cuesta llegar»', 'Hello cada 2 s; Max Age 20 s (~10 Hellos perdidos): sin BPDU fresca, la info expira y se recalcula'],
              ['Bridge ID (BID)', 'Prioridad (defecto 32768, pasos de 4096) + MAC del switch', 'Comparación lexicográfica: menor prioridad gana; si empatan, menor MAC'],
              ['Root Bridge', 'El switch con menor BID: referencia de todo el árbol', 'TODOS los puertos del Root son Designated (reenvían)'],
              ['Root Port (RP)', 'El ÚNICO puerto de cada switch no-raíz con menor coste hacia el Root', 'Uno por switch no-raíz'],
              ['Designated Port (DP)', 'El puerto que reenvía en cada segmento (el del switch más cercano al Root)', 'Todos los del Root + uno por segmento'],
              ['Path Cost', 'Coste acumulado al Root (según velocidad: 10 Gbps=2, 1 Gbps=4, 100 Mbps=19)', 'Los costes clásicos cortos; existen versiones «long» para >10 Gbps'],
              ['Port ID', 'Prioridad de puerto (defecto 128) + número', 'Último desempate cuando todo lo demás empata'],
            ],
          ),
          info('Orden de desempate (memorizar)', '1) Menor BID → Root. 2) Menor coste al Root → Root Port. 3) Menor BID del vecino → Designated. 4) Menor Port ID. STP es determinista: con la misma topología, SIEMPRE converge igual.'),
          deep('Costes STP originales vs modernos', 'Los costes «cortos» (100 Mbps = 19, 1 Gbps = 4) son de 1998 y saturan en enlaces rápidos (10 Gbps = 2, y más allá todo vale 1-2). Existe el método «long» (2004) con granularidad fina hasta terabits. En redes mixtas, verifica que todos los switches usen la misma escala o los cálculos saldrán torcidos.', ['Cisco usa short por defecto en muchos equipos: ojo al mezclar con 25/40/100G.']),
        ],
        expect: 'Defines cada pieza y recitas el orden de desempate.',
      },
      {
        id: 'netstp-03-eleccion',
        title: 'La elección, animada',
        goal: 'Ver la elección de Root, Root Ports y el puerto bloqueado sobre un triángulo real.',
        importance: 'required',
        minutes: 20,
        blocks: [
          p('Teoría + animación: el triángulo S1 (4096) – S2 (8192) – S3 (32768), con el enlace S2–S3 lento (coste 19). Sigue los pasos y observa qué puerto muere.'),
          viz('stp', 'Elección de Root Bridge y puerto bloqueado'),
          h('Estados de puerto y convergencia'),
          tbl(
            ['Estado', '¿Recibe BPDU?', '¿Aprende MAC?', '¿Reenvía?'],
            [
              ['Blocking', 'Sí (escucha)', 'No', 'No'],
              ['Listening', 'Sí', 'No', 'No (15 s, evita bucles transitorios)'],
              ['Learning', 'Sí', 'Sí', 'No (15 s, llena la CAM)'],
              ['Forwarding', 'Sí', 'Sí', 'Sí'],
              ['Disabled', 'No', 'No', 'No (administrativo)'],
            ],
          ),
          p('Convergencia clásica ≈ 30–50 s (20 s Max Age + 2×15 s Forward Delay). Por eso nació RSTP: en la práctica nadie tolera un minuto sin red ante un cambio.'),
          info('Topology Change', 'Cuando la topología cambia, el switch avisa con TCN hacia el Root y este inunda BPDUs con flag TC. En STP clásico (802.1D) todas las CAMs acortan su envejecimiento al Forward Delay (15 s) para reaprender; en RSTP se purgan directamente las MACs afectadas (salvo puertos de borde). Un puerto flapping genera TCs constantes: síntoma de cable o negociación inestable.'),
          info('No confundir costes STP con costes OSPF', 'STP usa su propia escala (100 Mbps = 19, 1 Gbps = 4, 10 Gbps = 2) y OSPF otra (coste = referencia/ancho de banda). Son protocolos distintos con números distintos: un «coste 4» no significa lo mismo en uno que en otro.'),
        ],
        expect: 'Predices el puerto bloqueado de cualquier triángulo y describes los estados.',
      },
      {
        id: 'netstp-04-variantes',
        title: 'RSTP, MSTP y protecciones',
        goal: 'Elegir variante y blindar los bordes contra errores humanos.',
        importance: 'required',
        minutes: 18,
        blocks: [
          tbl(
            ['Protocolo', 'Idea', 'Cuándo'],
            [
              ['STP (802.1D-1998)', 'Un árbol para todas las VLANs, convergencia lenta', 'Legado / examen'],
              ['RSTP (802.1w, hoy dentro de 802.1D)', 'Roles alterno/backup, handshake propuesta-acuerdo, convergencia en ~1-6 s', 'Siempre que puedas: es el defecto sensato'],
              ['MSTP (802.1s)', 'Varias instancias (grupos de VLANs) con topologías distintas para balancear carga', 'Campus grandes con VLANs por varios caminos'],
              ['PVST+/RPVST+ (Cisco)', 'Un árbol POR VLAN (PVST) o su versión rápida (RPVST+)', 'Mundo Cisco clásico; ojo al consumo de CPU con muchas VLANs'],
            ],
          ),
          h('Protecciones de borde (imprescindibles)'),
          tbl(
            ['Mecanismo', 'Qué hace', 'Dónde'],
            [
              ['PortFast (+ equivalente)', 'Puerto de host salta Listening/Learning: PC listo al instante', 'SOLO puertos a un host. Jamás hacia otro switch.'],
              ['BPDU Guard', 'Si llega una BPDU a un puerto PortFast, lo desactiva (err-disable)', 'Todos los puertos de host: evita que un switch «casero» reescriba tu árbol'],
              ['Root Guard', 'Impide que por ese puerto llegue un «mejor» Root (bloquea el puerto, no lo negocia)', 'Puertos hacia zonas no confiables (cliente, DMZ)'],
              ['Loop Guard', 'Si un puerto deja de recibir BPDUs, pasa a «inconsistente» en vez de reenviar a ciegas', 'Enlaces redundantes (anti-bucle por fallo unidireccional de fibra)'],
              ['UDLD / DLDP', 'Detecta enlaces unidireccionales a nivel físico', 'Fibra entre edificios (nombres Cisco / HPE)'],
            ],
          ),
          warn('Vendor notes', 'Nombres y defectos varían: Cisco habla de PVST+/RPVST+, portfast/bpduguard; Juniper/Arista/HPE usan RSTP/MSTP con otro CLI pero la misma teoría 802.1. En examen vendor-neutral (CompTIA, CCNA actual) manda el estándar; en producción, manda el manual de TU equipo.'),
        ],
        expect: 'Eliges RSTP/MSTP con criterio y blindas bordes con las 4 protecciones.',
      },
    ],
  },

  'net-routing': {
    related: ['net-ipv4', 'net-igp', 'net-ospf', 'net-bgp'],
    steps: [
      {
        id: 'netrt-01-tabla',
        title: 'Qué es encaminar y la tabla de rutas',
        goal: 'Leer una tabla de rutas real y predecir el próximo salto.',
        importance: 'required',
        minutes: 15,
        blocks: [
          p('Encaminar (routing) = para cada paquete, elegir interfaz de salida y próximo salto consultando la TABLA DE RUTAS por longest prefix match. Reenviar (forwarding) = mover el paquete. El plano de control construye la tabla; el plano de datos la usa millones de veces por segundo.'),
          cmd({ caption: 'Tu propia tabla (Arch)' }, 'ip route show', '# Añadir una ruta estática de ejemplo (lab mental)', 'ip route add 10.99.0.0/16 via 192.168.1.254 dev wlan0'),
          out('ip route show (ejemplo)', 'default via 192.168.1.1 dev wlan0 proto dhcp metric 600', '192.168.1.0/24 dev wlan0 proto kernel scope link src 192.168.1.10', '10.99.0.0/16 via 192.168.1.254 dev wlan0'),
          h('Tipos de ruta'),
          tbl(
            ['Tipo', 'Origen', 'Ejemplo'],
            [
              ['Conectada (C)', 'Interfaz con IP: el router «está» en esa red', '192.168.1.0/24 dev eth0'],
              ['Estática', 'Configurada a mano', 'ip route 10.99.0.0/16 via …'],
              ['Por defecto', 'Estática especial 0.0.0.0/0', 'default via 192.168.1.1'],
              ['Dinámica', 'Aprendida por OSPF/BGP…', 'O, B, R… en la tabla'],
            ],
          ),
          info('Recursiva', 'Si el «via» no es vecino directo, el router resuelve recursivamente: busca cómo llegar AL next-hop y repite hasta una interfaz conectada. Por eso una estática con next-hop inalcanzable queda inactiva.'),
        ],
        expect: 'Lees cualquier tabla y distingues conectadas, estáticas y por defecto.',
      },
      {
        id: 'netrt-02-estaticas',
        title: 'Rutas estáticas, flotantes y por defecto',
        goal: 'Usar estáticas con criterio y como respaldo.',
        importance: 'required',
        minutes: 12,
        blocks: [
          p('Las estáticas son precisas y baratas (sin protocolo), ideales en bordes, stub y labs. Sus variantes:'),
          ul('Ruta por defecto (0.0.0.0/0): «todo lo que no sepa, al ISP». Todo host y toda red stub la tienen.', 'Estática flotante: misma red con DISTANCIA ADMINISTRATIVA peor que la dinámica → duerme hasta que la dinámica cae (respaldo barato).', 'Estática a interfaz vs a next-hop: a interfaz solo en punto a punto; en multiacceso (Ethernet) exige next-hop o el router tendrá que hacer ARP por cada destino (proxy-ARP mediante: lento y frágil).'),
          h('Distancia administrativa (AD) y métrica'),
          p('Si DOS fuentes ofrecen la misma red, gana la de menor AD (credibilidad de la fuente); si es la MISMA fuente, gana la menor MÉTRICA (coste del camino). AD decide QUIÉN habla; métrica decide QUÉ camino de ese quién.'),
          tbl(
            ['Fuente (Cisco)', 'AD típica', 'Nota'],
            [
              ['Conectada', '0', 'Imbatible'],
              ['Estática', '1', 'Flotante: se sube a mano (p. ej. 200)'],
              ['EIGRP interna', '90', '—'],
              ['OSPF', '110', '—'],
              ['RIP', '120', '—'],
              ['eBGP', '20', '¡Más creíble que OSPF! (política sobre topología)'],
              ['iBGP', '200', 'Peor que casi todo a propósito: el tráfico externo debe preferir salidas eBGP/IGP bien filtradas. No redistribuyas la tabla BGP completa al IGP (lo reventarías): iBGP viaja de borde a borde y el IGP solo lleva infraestructura + por defecto.'],
            ],
          ),
          warn('La AD es local y vendor-dependiente', 'Los valores de arriba son Cisco; Juniper usa «preference» con otros números. El concepto (preferencia por fuente) es universal; los números, no. Y la AD solo desempata la MISMA longitud de prefijo: LPM siempre va primero.'),
        ],
        expect: 'Diseñas una flotante de respaldo y predices qué fuente gana.',
      },
      {
        id: 'netrt-03-resumen-redist',
        title: 'Agregación y redistribución',
        goal: 'Resumir con criterio y entender los peligros de redistribuir.',
        importance: 'recommended',
        minutes: 12,
        blocks: [
          p('La agregación (route summarization) ya la viste en net-ipv4: aquí importa su efecto en routing: menos entradas, convergencia más rápida, pero riesgo de blackhole y subóptimo. Se configura en los bordes (ABR/ASBR en OSPF, peers en BGP).'),
          h('Redistribución'),
          p('Inyectar rutas de un protocolo en otro (estáticas→OSPF, OSPF→BGP…). Necesaria en fronteras, peligrosa en exceso: sin filtros, etiquetas y métricas semilla controladas, crea bucles y tormentas (el clásico «redistribución mutua en dos puntos» que reinyecta lo aprendido). Regla: redistribuye lo mínimo, filtra con prefix-lists y marca con tags.'),
          deep('Ruta «O IA» y «O E2»: por qué importan', 'En OSPF verás O (intra-área), O IA (inter-área, vía ABR: un router a caballo entre el backbone y otra área), O E1/E2 (externas que inyectó un ASBR: el router que redistribuye desde otro protocolo). E2 mantiene el coste externo fijo (típico para salir a otro protocolo); E1 suma el coste interno (mejor si hay varias salidas). Este matiz decide salidas a Internet en empresas multi-sede.', ['E2 es el defecto al redistribuir en OSPF: recuérdalo ante «tráfico que sale por el sitio raro».']),
        ],
        expect: 'Explicas cuándo resumir y por qué redistribuir exige filtros.',
      },
    ],
  },

  'net-igp': {
    related: ['net-routing', 'net-ospf', 'net-bgp'],
    steps: [
      {
        id: 'netigp-01-que-es-igp',
        title: 'Qué es un IGP y por qué existe',
        goal: 'Situar los IGP entre el routing estático y BGP.',
        importance: 'required',
        minutes: 10,
        blocks: [
          p('Un IGP (Interior Gateway Protocol) encamina DENTRO de un sistema autónomo (tu red). Existe porque las estáticas no escalan (cada cambio a mano, sin detección de caídas) y porque BGP es demasiado pesado y político para el interior: el IGP converge rápido y optimiza por coste técnico, no por dinero.'),
          tbl(
            ['Necesidad', 'Solución'],
            [
              ['Red pequeña / stub', 'Estáticas + por defecto (no necesitas IGP)'],
              ['Campus / empresa con redundancia', 'IGP (OSPF/IS-IS/EIGRP): convergencia automática'],
              ['Internet entre empresas', 'BGP (EGP): políticas, no solo coste'],
            ],
          ),
          info('IGP vs EGP', 'IGP = dentro del AS (velocidad de convergencia, coste). EGP = entre AS (BGP: políticas, filtrado, escala global). Ver net-bgp para el otro lado de la frontera.'),
        ],
        expect: 'Justificas cuándo un IGP sobra, cuándo es obligatorio y cuándo entra BGP.',
      },
      {
        id: 'netigp-02-comparativa',
        title: 'RIP, OSPF, IS-IS, EIGRP comparados',
        goal: 'Elegir protocolo con criterio y no confundir familias.',
        importance: 'required',
        minutes: 20,
        blocks: [
          tbl(
            ['Protocolo', 'Familia', 'Métrica', 'Convergencia', 'Escala', 'Nota'],
            [
              ['RIP (v2)', 'Vector-distancia (Bellman-Ford)', 'Saltos (máx 15)', 'Lenta (30 s + hold-down)', 'Tiny (<15 saltos)', 'Histórico/docente. RIPv2 con CIDR; RIPng para IPv6. Evita bucles con split horizon, poison reverse y holddown.'],
              ['OSPF', 'Estado de enlace (Dijkstra)', 'Coste (ancho de banda)', 'Rápida', 'Grande (áreas)', 'Estándar abierto. Ver unidad dedicada net-ospf.'],
              ['IS-IS', 'Estado de enlace (Dijkstra)', 'Coste', 'Muy rápida', 'Enorme (backbones ISP)', 'El favorito de Tier-1. Corre sobre L2 (no IP): flexible y austero. Niveles L1/L2 ≈ áreas.'],
              ['EIGRP', 'Híbrido (DUAL)', 'Compuesta (ancho+retardo)', 'Rapidísima (feasible successor)', 'Media-grande', 'Cisco (abierto desde 2013 pero ecosistema Cisco). DUAL precalcula respaldo sin recalcular.'],
            ],
          ),
          h('Vector-distancia vs estado de enlace (la idea en 1 minuto)'),
          ul('Vector-distancia (RIP): cada router cuenta rumores («yo llego en N saltos») a sus vecinos. Simple, pero lento y con riesgo de count-to-infinity (mitigado con split horizon/poison/holddown).', 'Estado de enlace (OSPF/IS-IS): cada router describe SUS enlaces a TODOS (inundación) y cada uno calcula el mapa completo con Dijkstra. Converge rápido y sin bucles, a cambio de más CPU/memoria.', 'EIGRP/DUAL: difunde vectores pero con lógica de factibilidad que garantiza rutas de respaldo libres de bucles (feasible successor): lo mejor de ambos mundos en redes Cisco.'),
          deep('Por qué IS-IS domina los backbones', 'IS-IS no depende de IP para transportarse (usa directamente L2/CLNS), su base de datos es TLV-extensible (añadir IPv6 fue trivial) y su diseño en niveles escala con menos fricción operativa. OSPF manda en empresa; IS-IS, en ISP grandes. Saber esto te evita proponer OSPF donde un Tier-1 usaría IS-IS.', ['En entrevista: «OSPF para empresa, IS-IS para backbone» es una respuesta senior.']),
        ],
        expect: 'Comparas los 4 IGP por familia, métrica, convergencia y caso de uso.',
      },
      {
        id: 'netigp-03-elegir',
        title: 'Cómo elegir (árbol de decisión)',
        goal: 'Decidir protocolo ante un escenario real.',
        importance: 'recommended',
        minutes: 10,
        blocks: [
          ol('¿Red diminuta y estable sin crecimiento? Estáticas + por defecto (RIP solo si heredas equipo legacy o para aprender vector-distancia en laboratorio).', '¿Empresa multi-sede multivendor? OSPF con áreas.', '¿Backbone de ISP / escala extrema? IS-IS.', '¿Todo Cisco y quieres convergencia exprés con poca cirugía? EIGRP.', '¿Entre organizaciones? No es IGP: BGP (net-bgp).'),
          warn('Mezclar IGPs sin necesidad es deuda técnica', 'Cada protocolo extra es una redistribución fronteriza que mantener. Un solo IGP bien diseñado + BGP en el borde cubre el 95 % de los casos.'),
        ],
        expect: 'Justificas la elección del IGP en 3 escenarios distintos.',
      },
    ],
  },

  'net-ospf': {
    related: ['net-igp', 'net-routing', 'net-bgp', 'net-ipv6'],
    steps: [
      {
        id: 'netospf-01-fundamentos',
        title: 'Fundamentos: RID, Hellos y vecinos',
        goal: 'Entender cómo dos routers deciden hablar OSPF.',
        importance: 'required',
        minutes: 15,
        blocks: [
          p('OSPF es estado de enlace: los routers se hacen vecinos (Hellos), sincronizan la misma LSDB y cada uno calcula sus rutas con Dijkstra. Todo empieza con el Hello a multicast 224.0.0.5 cada 10 s en redes broadcast/punto a punto (30 s en NBMA); si no hay Hellos en el Dead interval (40 s, o 120 s en NBMA), el vecino se declara caído. Ojo: 224.0.0.6 NO es para Hellos: es la dirección a la que los no-DR envían actualizaciones y ACKs al DR/BDR.'),
          tbl(
            ['Concepto', 'Qué es', 'Detalle'],
            [
              ['Router ID', 'Identificador único (formato IPv4, p. ej. 1.1.1.1)', 'Se elige: manual > loopback mayor > IP mayor. Debe ser ÚNICO y estable (usa loopback).'],
              ['Hello', '«Estoy aquí, área X, timers Y, vecinos vistos: […]»', 'Para ser vecinos (2-Way) deben coincidir: área, subred/máscara, Hello/Dead, flags y autenticación. La MTU no impide la vecindad, pero sí la adyacencia Full (ver estados).'],
              ['Neighbor vs Adjacency', 'Vecino = se ven. Adyacencia = sincronizan LSDB completa', 'En broadcast solo se es adyacente con DR/BDR (ver abajo): el resto queda en estado 2-Way'],
              ['Estados', 'Down → Init → 2-Way → ExStart → Exchange → Loading → Full', 'Full = LSDB sincronizada. Si se queda en ExStart/Exchange: MTU o unicast roto entre ellos.'],
            ],
          ),
          warn('El MTU rompe adyacencias (clásico)', 'Vecinos atascados en ExStart/Exchange casi siempre = MTU distinto a ambos lados o ACL filtrando unicast OSPF (IP 89). En examen y en producción, es LA causa nº 1.'),
        ],
        expect: 'Enumeras requisitos de vecindad y diagnosticas un Full que no llega.',
      },
      {
        id: 'netospf-02-lsdb-spf',
        title: 'LSAs, LSDB y Dijkstra (qué pasa al aprender una ruta)',
        goal: 'Narrar el ciclo completo desde un enlace nuevo hasta la tabla instalada.',
        importance: 'required',
        minutes: 20,
        blocks: [
          p('El corazón de OSPF en una frase: «todos tienen el mismo mapa (LSDB) y cada uno calcula sus caminos (SPF)». Cuando algo cambia (un enlace sube o cae), el ciclo es:'),
          viz('ospf', 'De los Hellos a la tabla: míralo en tu topología'),
          ol('El router afectado genera/actualiza su Router-LSA y lo INUNDA por el área (cada receptor re-inunda y confirma).', 'Todos recalculan Dijkstra con ellos mismos como raíz → árbol SPF de coste mínimo.', 'Cada router actualiza su tabla: next-hop = vecino hacia la rama, coste = acumulado.', 'Solo entonces reenvían distinto. Convergencia típica: segundos.'),
          tbl(
            ['LSA', 'Quién la crea', 'Alcance'],
            [
              ['Tipo 1 Router-LSA', 'Cada router', 'Su área: enlaces + costes'],
              ['Tipo 2 Network-LSA', 'El DR', 'Redes broadcast: quién cuelga del segmento'],
              ['Tipo 3 Summary-LSA', 'ABR', 'Resume otras áreas hacia dentro (y viceversa)'],
              ['Tipo 4 ASBR-Summary', 'ABR', '«Cómo llegar al ASBR»: sin ella, los routers de otras áreas no podrían usar las externas (tipo 5) porque no sabrían alcanzar a quien las originó'],
              ['Tipo 5 External-LSA', 'ASBR', 'Todo el AS (salvo stub): rutas redistribuidas'],
              ['Tipo 7 NSSA-External', 'ASBR en NSSA', 'Se convierte a tipo 5 en el ABR'],
            ],
          ),
          deep('Coste OSPF = referencia / ancho de banda', 'Coste = 10^8 / BW en bps con la referencia por defecto: 100 Mbps → coste 1, y todo lo más rápido también daría 1 (mínimo) y empataría. En redes ≥1 Gbps se sube la referencia (p. ej. a 10 Gbps) para que los costes discriminen. Si dos caminos «iguales» no lo son, mira auto-cost primero.', ['Cisco: auto-cost reference-bandwidth. Debe ser coherente en toda la red.']),
        ],
        expect: 'Narras inundación → SPF → tabla ante un cambio, citando LSAs implicadas.',
      },
      {
        id: 'netospf-03-dr-areas',
        title: 'DR/BDR y áreas',
        goal: 'Entender por qué existen DR y áreas, y los roles ABR/ASBR.',
        importance: 'required',
        minutes: 18,
        blocks: [
          p('En un segmento broadcast con N routers, sin DR habría N×(N−1)/2 adyacencias (malla de inundación). El DR (Designated Router) centraliza: todos son adyacentes con DR/BDR y el DR describe la red en la Network-LSA. Elección por prioridad (defecto 1; 0 = nunca) y desempate por RID mayor. Como las adyacencias cuestan, el DR reduce el caos a 2×N.'),
          info('El DR no es preemptivo (y los tipos de red importan)', 'Si arranca después un router con mejor prioridad, NO desbanca al DR/BDR existente: hay que forzar una reelección (reiniciar el proceso OSPF). Además, el DR solo existe en redes broadcast y NBMA; en punto a punto y punto-multipunto no hay DR/BDR porque solo hay dos vecinos. Por eso los timers difieren: 10/40 s en broadcast y punto a punto, 30/120 s en NBMA.'),
          h('Áreas: partir el mapa para escalar'),
          p('El área 0 (backbone) es obligatoria: TODAS las áreas cuelgan de ella (directa o por virtual-link). Cada área tiene su LSDB de detalle; entre áreas solo viajan resúmenes (tipo 3). Menos LSAs = menos SPF = más escala.'),
          tbl(
            ['Rol/tipo', 'Qué es'],
            [
              ['ABR', 'Router a caballo entre el backbone y otra área: genera Summary-LSAs'],
              ['ASBR', 'El que redistribuye rutas externas (estáticas, BGP…) dentro de OSPF'],
              ['Stub', 'No admite externas (tipo 5): el ABR inyecta una por defecto. Más pequeña y estable.'],
              ['Totally Stubby', 'Ni externas ni inter-área (solo por defecto). Mínimo absoluto (Cisco).'],
              ['NSSA', 'Stub que SÍ permite un ASBR dentro (tipo 7, convertido a 5 en el ABR). Típica salida con redistribución local.'],
            ],
          ),
          info('Autenticación y robustez', 'OSPF soporta autenticación (nula/simple/MD5/HMAC): sin ella, cualquiera en el segmento puede inyectar LSAs falsas y redirigir tráfico. En producción: autenticación + Hellos ajustados (o BFD para detección sub-segundo) + resúmenes en ABR.'),
        ],
        expect: 'Explicas DR, área 0, ABR/ASBR y eliges el tipo de área stub adecuado.',
      },
    ],
  },
}
