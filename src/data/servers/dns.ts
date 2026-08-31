/* Curso DNS (BIND) — servidor autoritativo para archforge.local */
import { cmd, danger, deep, file, h, info, ol, out, p, tip, tbl, ul, warn } from '../helpers'
import type { QuizData } from '../../types'
import { srvModule } from './types'
import type { RelatedLink } from './types'
import type { ServerCourse } from './types'

const q1: QuizData = {
  id: 'dns-quiz-registros',
  difficulty: 'beginner',
  question: '¿Qué registro necesitas crear para que ftp.archforge.local apunte a la MISMA IP que server.archforge.local sin duplicar direcciones?',
  options: [
    { text: 'Un segundo registro A con la misma IP', why: 'Funciona, pero duplicas información: si la IP cambia debes editar dos líneas.' },
    { text: 'Un registro CNAME que apunte a server', why: 'Correcto: CNAME es un alias. Si la IP cambia, solo editas el registro A original.' },
    { text: 'Un registro MX', why: 'MX es para correo, no para alias de nombres de host.' },
    { text: 'Un registro PTR', why: 'PTR resuelve IP→nombre (zona inversa), no nombre→IP.' },
  ],
  answer: 1,
}

const q2: QuizData = {
  id: 'dns-quiz-zona',
  difficulty: 'intermediate',
  question: 'BIND arranca pero dig devuelve SERVFAIL y el log dice «zone archforge.local/IN: loading failed». ¿Qué es lo más probable?',
  options: [
    { text: 'El cliente no tiene el DNS configurado', why: 'Eso produciría «connection timed out» en el cliente, no SERVFAIL con error de carga.' },
    { text: 'El fichero de zona tiene un error de sintaxis o no existe donde named.conf dice', why: 'Exacto: SERVFAIL + loading failed significa que BIND no pudo cargar TU fichero de zona.' },
    { text: 'El puerto 53 está bloqueado por el firewall', why: 'Eso da timeouts de conexión; la zona sí cargaría.' },
    { text: 'Falta el paquete bind-utils', why: 'Sin dig ni siquiera podrías lanzar la consulta; el error sería otro.' },
  ],
  answer: 1,
}


/* Recomendaciones basadas en relaciones REALES del contenido:
   · 📡 Servidor DHCP → el DHCP publica tu DNS a toda la red
   · Red → resolv.conf, NetworkManager y clientes
   · systemd → unidades, journal y arranque de servicios
   · Firewall → abrir el puerto 53 con criterio */
const RELATED: RelatedLink[] = [
  { label: '📡 Servidor DHCP', kind: 'course', to: 'dhcp' },
  { label: 'Red', kind: 'section', to: 'network' },
  { label: 'systemd', kind: 'section', to: 'expert' },
  { label: 'Firewall', kind: 'section', to: 'firewall' },
]

export const dnsCourse: ServerCourse = {
  id: 'dns',
  icon: '🌐',
  title: 'Servidor DNS',
  tagline: 'Traduce nombres a IPs con BIND: zonas, registros A/CNAME/MX/TXT, zona inversa y diagnóstico con dig.',
  level: 'intermediate',
  recommended: ['arch', 'debian'],
  minutes: 150,
  keywords: ['dns', 'bind', 'named', 'dig', 'zona', 'registro a', 'cname', 'mx', 'nslookup', 'resolv.conf'],
  prereqs: [
    { label: 'Red', icon: 'network', to: '/section/network' },
    { label: 'Servicios y systemd', icon: 'expert', to: '/section/expert' },
    { label: 'Permisos', icon: 'users', to: '/section/users' },
  ],
  cheatsheetIds: ['systemctl', 'journalctl', 'dig'],
  problemIds: ['srv-dns-no-responde', 'srv-dns-zona-no-carga', 'srv-dns-registro-no-resuelve', 'srv-dns-local-si-remoto-no'],
  modules: [
    srvModule('que-es-dns', '01', 'Qué es DNS', 8, ['Entender qué problema resuelve el DNS', 'Distinguir resolutor recursivo y servidor autoritativo'], [
      p('DNS (Domain Name System) traduce nombres como archlinux.org a direcciones IP. Existe porque las IP cambian, son difíciles de recordar y porque un mismo servicio puede moverse de máquina sin que nadie se entere.'),
      p('Cuando montas tu propio servidor DNS con BIND no usas «Internet» para resolver: te conviertes en autoridad de tus propios dominios, por ejemplo archforge.local. Ningún servidor externo sabe qué es archforge.local — solo TU servidor puede responderlo. Por eso las redes internas (empresas, laboratorios, homelabs) montan DNS propio.'),
      h('Dos papeles distintos que suelen confundirse'),
      tbl(['Papel', 'Qué hace', 'Ejemplo'], [
        ['Resolutor (recursivo)', 'Recibe tu consulta y sale a Internet a buscarla', '1.1.1.1, el de tu router'],
        ['Autoritativo', 'Responde con autoridad sobre SU zona; no pregunta a nadie', 'Tu BIND con archforge.local'],
      ]),
      info('En este curso', 'BIND hará de servidor AUTORITATIVO para archforge.local: quien le pregunte por ese dominio recibirá respuestas definitivas desde tus ficheros de zona.'),
      warn('Por qué .local puede doler en redes reales', 'El sufijo .local está reservado para mDNS (Avahi/Bonjour). En un laboratorio aislado es perfecto; en una red corporativa real con mDNS activo elige otro sufijo como .lan o .intra.'),
    ]),

    srvModule('consulta-dns', '02', 'Cómo funciona una consulta DNS', 10, ['Seguir el recorrido de una consulta paso a paso', 'Entender caché y TTL sin memorizar'], [
      p('Cuando escribes ping server.archforge.local ocurre esto:'),
      ol(
        'El cliente mira su caché y su fichero /etc/hosts. Si está ahí, no hay DNS.',
        'Si no, pregunta al resolutor configurado en /etc/resolv.conf.',
        'El resolutor (si no conoce la respuesta) escala: raíz → TLD local → tu servidor autoritativo.',
        'Tu BIND responde desde su fichero de zona con autoridad (flag aa).',
        'La respuesta se cachea durante el TTL declarado en el registro.',
      ),
      h('El recorrido visto como diagrama'),
      file('flujo-dns.txt', `Cliente\n   ↓  «¿cuál es la IP de server.archforge.local?»\n/etc/resolv.conf → resolutor (127.0.0.1 si es tu propio BIND)\n   ↓\nServidor DNS (BIND, puerto 53/udp)\n   ↓  busca en sus ficheros de zona\nZona archforge.local\n   ↓\nRegistro A → 192.168.1.10`, 'Flujo lógico de una consulta cuando tú eres la autoridad'),
      tip('TTL = tiempo de verdad', 'Cada registro lleva un TTL (segundos que la respuesta puede cachearse). Un TTL bajo (60s) propaga cambios rápido pero genera más consultas; uno alto (86400) descarga tu servidor pero congela errores durante horas. En laboratorio usa TTL cortos.'),
    ]),

    srvModule('tipos-servidores', '03', 'Tipos de servidores DNS', 8, ['Clasificar servidores: maestro, esclavo, caché, reenviador'], [
      p('No todos los servidores DNS hacen lo mismo. Estas cuatro categorías cubren el 99% de los casos reales:'),
      ul(
        'Maestro (primario): posee los ficheros de zona y permite editarlos. El nuestro.',
        'Esclavo (secundario): copia la zona del maestro por transferencia de zona (AXFR). Redundancia.',
        'Solo caché (caching): no tiene zonas propias; acelera y centraliza las consultas de una red.',
        'Reenviador (forwarder): recibe consultas y las pasa a otro resolutor (típico: 8.8.8.8).',
      ),
      deep('BIND hace todo esto a la vez', 'Un mismo named puede ser autoritativo para archforge.local y, para el resto de dominios, comportarse como caché/reenviador. Por eso su configuración distingue claramente las zonas (zones {}) del resto de opciones (options {}).'),
    ]),

    srvModule('bind', '04', 'BIND', 7, ['Saber qué es BIND y por qué es el estándar histórico', 'Conocer sus alternativas modernas'], [
      p('BIND (Berkeley Internet Name Domain) lleva desde los años 80 siendo EL software de referencia para DNS: implementa todo el estándar y es el que usarás en exámenes y entornos profesionales. Su demonio se llama named («name daemon») y NO «bind» — detalle que despista a muchos.'),
      tbl(['Software', 'Filosofía', 'Cuándo elegirlo'], [
        ['BIND (named)', 'Completo, estándar de facto', 'Aprender DNS de verdad, entornos corporativos'],
        ['dnsmasq', 'Mínimo: DNS+DHCP para LAN pequeñas', 'Router casero, laboratorio liviano'],
        ['Unbound', 'Resolutor validador (DNSSEC)', 'Caché local, privacidad'],
        ['PowerDNS', 'Zonas en base de datos', 'Proveedores, automatización'],
      ]),
      info('Nombres de paquete y unidad según distribución', 'En Arch el paquete es bind y la unidad named.service. En Debian/Ubuntu el paquete es bind9 y la unidad bind9.service. Misma versión de BIND por dentro, empaquetado distinto por fuera.'),
    ]),

    srvModule('instalacion', '05', 'Instalación', 6, ['Instalar BIND en Arch y en Debian/Ubuntu', 'Verificar qué binarios trae'], [
      p('La instalación trae el demonio named y las utilidades de cliente (dig, nslookup). Instalar el paquete NO arranca nada: eso es deliberado — un DNS mal configurado puede dejar sin red a toda una organización, así que siempre se configura antes de activar.'),
      cmd({ caption: '🐧 Arch Linux' }, '# 🐧 Arch Linux', 'sudo pacman -S bind'),
      cmd({ caption: '🟠 Debian / Ubuntu' }, '# 🟠 Debian / Ubuntu', 'sudo apt update', 'sudo apt install bind9 dnsutils'),
      p('Comprueba qué acabas de instalar:'),
      cmd({}, 'which named', 'dig -v'),
      out('salida esperada', '/usr/bin/named', 'DiG 9.x.x'),
      warn('En Debian, dnsutils es el cliente', 'El paquete del servidor (bind9) ya arrastra dnsutils como dependencia, pero instalarlo explícito deja claro que dig/nslookup son herramientas de CLIENTE: funcionan aunque tu máquina no sea servidor DNS.'),
    ]),

    srvModule('config-basica', '06', 'Configuración básica', 9, ['Entender la estructura de named.conf', 'Localizar los ficheros en cada distribución'], [
      p('BIND se controla desde UN fichero principal que define dos cosas: opciones globales del demonio y qué zonas sirve. La sintaxis es declarativa y estricta: un punto y coma olvidado impide arrancar TODO el servicio. Es la causa número uno de «no inicia» en este curso.'),
      tbl(['Distribución', 'Fichero principal', 'Directorio típico de zonas'], [
        ['Arch', '/etc/named.conf', '/etc/named/zones (o /var/named)'],
        ['Debian/Ubuntu', '/etc/bind/named.conf (+ includes)', '/etc/bind/zones (o /var/lib/bind)'],
      ]),
      info('En la simulación de ArchForge', 'La terminal virtual lee zonas de /etc/named/zones y /etc/bind indistintamente, así que puedes practicar ambas rutas. Recuerda escribir como root: primero su, luego nano fichero (el editor integrado abre al invocar nano/vim/edit).'),
      deep('¿Y named.conf.options / named.conf.local?', 'En Debian el fichero principal incluye otros: named.conf.options para ajustes globales y named.conf.local para TUS zonas. Es pura organización — BIND los fusiona al cargar. Arch prefiere un único named.conf monolítico. Ambos enfoques son válidos; separar facilita automatizar.'),
    ]),

    srvModule('named-conf', '07', '/etc/named.conf', 12, ['Escribir un named.conf mínimo funcional línea a línea'], [
      p('Este es el fichero completo para servir archforge.local. Léelo línea a línea: cada opción existe POR ALGO.'),
      file('/etc/named.conf', `options {\n    directory "/var/named";          // chroot interno de BIND\n    allow-query { any; };            // quién puede preguntarnos\n    listen-on port 53 { 127.0.0.1; 192.168.1.10; };\n    listen-on-v6 { none; };          // laboratorio: sin IPv6\n};\n\nzone "archforge.local" IN {\n    type master;                     // somos la fuente de verdad\n    file "db.archforge.local";       // relativo a directory\n};`, 'Configuración mínima de un servidor maestro'),
      h('Por qué cada línea importa'),
      ul(
        'allow-query { any; }: sin él, BIND solo responde a localhost y tus clientes «no tienen DNS». En producción limita a tu red: { 192.168.1.0/24; };',
        'listen-on: BIND escucha SOLO en las IP listadas. Si pones una IP que tu máquina no tiene, falla el arranque — error clásico.',
        'type master: declara autoridad. type slave haría que BIND intentara transferir la zona de otro servidor.',
        'file: ruta RELATIVA al directory de options. Confundir ruta absoluta/relativa aquí produce «zone not loaded».',
      ),
      warn('Variante Debian', 'En Ubuntu el bloque zone{} va en /etc/bind/named.conf.local y el fichero suele referenciarse con ruta absoluta: file "/etc/bind/zones/db.archforge.local";. La semántica es idéntica.'),
    ]),

    srvModule('zona-directa', '08', 'Crear una zona directa', 12, ['Escribir tu primer fichero de zona con SOA correcto', 'Entender el serial'], [
      p('Una zona directa mapea NOMBRE → IP. Todo fichero de zona empieza con un registro SOA (Start of Authority) que describe la propia zona: quién es el nameserver primario, un correo del admin (sin @, se escribe punto) y cinco temporizadores.'),
      file('/etc/named/zones/db.archforge.local', `$ORIGIN archforge.local.\n$TTL 300\n@       IN SOA  ns.archforge.local. admin.archforge.local. (\n                2026010101 ; serial AAAAMMDDnn\n                3600       ; refresh (esclavos)\n                900        ; retry\n                1209600    ; expire\n                3600 )     ; negative TTL\n@       IN NS   ns.archforge.local.\nns      IN A    192.168.1.10\nserver  IN A    192.168.1.10`, 'Zona mínima pero completa'),
      h('El serial: el campo más importante y más ignorado'),
      p('Los esclavos deciden si copiar la zona comparando este número: si sube, transfieren. Por eso la convención AAAAMMDDnn (dos cambios el mismo día → nn=01,02…). Editar la zona SIN incrementar el serial es la manera canónica de «he cambiado el DNS y no pasa nada».'),
      tip('En la simulación', 'ArchForge valida el ESTADO FINAL: tu zona necesita $ORIGIN (o llamarse db.dominio) y al menos un registro A. El SOA completo es buena práctica profesional incluso si la simulación no lo exige.'),
    ]),

    srvModule('registros-a-aaaa', '09', 'Registros A y AAAA', 8, ['Diferenciar A (IPv4) y AAAA (IPv6)', 'Añadir hosts a tu zona'], [
      p('El registro A asocia un nombre a una IPv4; AAAA a una IPv6 (4 A = 16 bytes, de ahí las cuatro letras). Son el pan de cada día del DNS: casi todo lo demás existe para apoyarlos.'),
      file('extracto de zona', `server  IN A     192.168.1.10\nserver  IN AAAA  fd00::10\nweb     IN A     192.168.1.20\nftp     IN A     192.168.1.30`),
      p('Fíjate: nombres SIN punto final al principio de línea se completan con el $ORIGIN. web significa web.archforge.local. Pero el lado derecho de los A es una IP — ahí nunca aplica el origin. Este contraste (izquierda relativa, derecha absoluta) explica la mayoría de errores de principiantes.'),
      danger('El punto final que lo cambia todo', 'Escribir server.archforge.local (sin punto final) en el CAMPO NOMBRE produce server.archforge.local.archforge.local. — el famoso bug del dominio duplicado. Si ves ese sufijo repetido en dig, buscas un punto faltante.'),
    ]),

    srvModule('cname', '10', 'CNAME', 7, ['Usar alias sin duplicar IPs', 'Saber cuándo NO usar CNAME'], [
      p('CNAME = Canonical NAME: «este nombre ES OTRO nombre». www.archforge.local es CNAME de server.archforge.local significa: pregúntale a server su IP. Si mañana mueves el servidor, cambias UN registro A y todos los alias siguen vivos.'),
      file('alias en la zona', `www   IN CNAME  server\nmail  IN CNAME  server`),
      ul(
        'Ventaja: una sola IP que mantener.',
        'Coste: cada CNAME añade una consulta extra (la cadena debe resolverse).',
        'Regla dura: un nombre con CNAME no puede tener TAMBIÉN registros A/MX/SOA. El estándar lo prohíbe.',
        'Excepción clásica: el apex del dominio (@) no admite CNAME porque ya tiene SOA+NS.',
      ),
      info('Alternativa moderna', 'Muchos proveedores ofrecen registros ALIAS/ANAME (apex que behave como CNAME). No son estándar DNS sino inventos de proveedor — útiles, pero saber CNAME sigue siendo obligatorio.'),
    ]),

    srvModule('ns', '11', 'NS', 6, ['Declarar quién responde por la zona', 'Relacionar NS con glue records'], [
      p('El registro NS responde: «quién es autoridad para esta zona». Toda zona necesita al menos dos (redundancia exigida por RFC), aunque en laboratorio uno basta.'),
      file('NS + glue record', `@   IN NS  ns1.archforge.local.\n@   IN NS  ns2.archforge.local.\nns1 IN A   192.168.1.10\nns2 IN A   192.168.1.11`),
      p('Los registros A de los propios nameservers se llaman glue records. Sin ellos hay paradoja: para preguntar a ns1.archforge.local necesitas resolver ns1.archforge.local… y el glue rompe el círculo publicando la IP DENTRO de la misma zona.'),
      deep('NS delega subdominios', 'NS también crea subdominios gestionados por otros servidores: lab.archforge.local. IN NS ns.lab.archforge.local. delega todo el subdominio lab. Es exactamente como los TLD (.com) delegan en los registradores.'),
    ]),

    srvModule('mx', '12', 'MX', 7, ['Configurar el reparto de correo de la zona', 'Leer prioridades'], [
      p('MX dice dónde entregar el correo de @archforge.local. Cada MX lleva prioridad: menor número = más preferido. Con dos MX de prioridad distinta, el emisor prueba primero el 10; si cae, usa el 20. Así sobrevive un servidor de correo caído.'),
      file('correo en la zona', `@     IN MX 10 mail1.archforge.local.\n@     IN MX 20 mail2.archforge.local.\nmail1 IN A  192.168.1.21\nmail2 IN A  192.168.1.22`),
      warn('MX apunta a nombres, nunca a IP', 'El rdata de un MX DEBE ser un nombre con registro A. Poner una IP directamente viola el estándar y algunos servidores rechazarán la zona entera. Mismo criterio que NS: nombres con punto final.'),
      info('Prueba real', 'dig archforge.local MX +short debe devolver «10 mail1.archforge.local.» seguido de «20 mail2...». Si devuelve la IP, revisa que el destino tenga su registro A.'),
    ]),

    srvModule('txt', '13', 'TXT', 6, ['Publicar datos arbitrarios: SPF y verificación'], [
      p('TXT guarda texto libre. Hoy su uso estrella es la verificación: SPF (qué servidores pueden enviar correo de tu dominio), DKIM/DMARC (firmas y política) y la validación de propiedad ante proveedores («añade este TXT para demostrar que el dominio es tuyo»).'),
      file('TXT típicos', `@    IN TXT "v=spf1 mx -all"\ndefault._domainkey IN TXT "v=DKIM1; k=rsa; p=MIIB..."`),
      ul('SPF «v=spf1 mx -all»: solo mis MX pueden enviar correo de este dominio; el resto (-all) se rechaza.', 'Las cadenas TXT van SIEMPRE entre comillas dobles dentro del fichero de zona.', 'Un TXT >255 caracteres se parte en varias cadenas adyacentes.'),
    ]),

    srvModule('zona-inversa', '14', 'Zona inversa', 10, ['Crear resolución IP→nombre con PTR', 'Entender in-addr.arpa'], [
      p('Hasta ahora resolvías nombre→IP. La zona inversa hace lo contrario (IP→nombre) y existe porque muchas tecnologías confían en ella: servidores de correo anti-spam, logs legibles, autenticaciones rhost. Usa el dominio especial in-addr.arpa donde la IP se escribe AL REVÉS.'),
      p('Para la red 192.168.1.0/24 la zona se llama 1.168.192.in-addr.arpa y cada host es el último octeto con tipo PTR.'),
      file('/etc/named/zones/db.192.168.1', `$ORIGIN 1.168.192.in-addr.arpa.\n$TTL 300\n@    IN SOA ns.archforge.local. admin.archforge.local. ( 2026010101 3600 900 1209600 3600 )\n@    IN NS   ns.archforge.local.\n10   IN PTR  server.archforge.local.\n20   IN PTR  web.archforge.local.`),
      p('Declara la zona inversa en named.conf igual que la directa, con su bloque zone {}. El comando dig -x 192.168.1.10 es azúcar para consultar esa zona automáticamente.'),
      cmd({ caption: 'verificar la inversa' }, 'dig -x 192.168.1.10 +short'),
      out('respuesta', 'server.archforge.local.'),
      info('¿Es obligatoria?', 'Funcionalmente no: tu red funciona sin PTR. Profesionalmente sí para correo (muchos MTAs rechazan IPs sin PTR válido) y para diagnósticos limpios. Los grandes operadores las mantienen religiosamente.'),
    ]),

    srvModule('configurar-clientes', '15', 'Configurar clientes', 9, ['Apuntar clientes a tu DNS con resolv.conf y NetworkManager'], [
      p('Un servidor DNS sin clientes configurados resuelve mucho y sirve poco. El cliente decide a QUÉ servidor preguntar mediante /etc/resolv.conf — un fichero simple con una directiva por nameserver, probadas en orden.'),
      file('/etc/resolv.conf', `nameserver 127.0.0.1\n# fallback opcional:\nnameserver 1.1.1.1\nsearch archforge.local`),
      ul(
        'nameserver 127.0.0.1: «pregunta a BIND en ESTA máquina». Para clientes remotos pon la IP del servidor (192.168.1.10).',
        'search archforge.local: permite escribir ssh server sin el sufijo — se completa solo.',
        'El orden importa: si el primero no contesta (timeout ~5s) se prueba el siguiente. Un DNS lento degrada TODA la navegación.',
      ),
      warn('NetworkManager puede pisarte el fichero', 'Con NetworkManager activo, resolv.conf se regenera en cada conexión. Para hacerlo persistente: nmcli con mod ipv4.dns "192.168.1.10" y mod ipv4.ignore-auto-dns yes. Ediciones manuales duran hasta el próximo DHCP.'),
    ]),

    srvModule('probar-dig', '16', 'Probar con dig', 10, ['Dominar dig: consultas A/AAAA/MX/TXT/PTR, +short, @servidor', 'Interpretar flags aa y NXDOMAIN'], [
      p('dig (Domain Information Groper) es el bisturí de DNS: muestra EXACTAMENTE lo que viajó por la red, incluidos códigos de estado y flags. Aprenderte su salida es invertir en toda tu carrera con Linux.'),
      cmd({ caption: 'consulta básica y versión compacta' }, 'dig server.archforge.local', 'dig server.archforge.local +short', 'dig @127.0.0.1 server.archforge.local   # forzar servidor concreto'),
      out('salida completa (recortada)', `;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 51271\n;; flags: qr aa rd; QUERY: 1, ANSWER: 1, AUTHORITY: 0\n\n;; ANSWER SECTION:\nserver.archforge.local.\t300\tIN\tA\t192.168.1.10`),
      h('Lectura de la cabecera'),
      tbl(['Campo', 'Significado', 'Lo que quieres ver'], [
        ['status:', 'NOERROR / NXDOMAIN / SERVFAIL / REFUSED', 'NOERROR'],
        ['flags: qr aa rd', 'qr=respuesta, aa=AUTHORITATIVE, rd=recursión deseada', 'aa presente en tu zona'],
        ['ANSWER: n', 'nº de respuestas', '> 0'],
      ]),
      p('El flag aa confirma que TU servidor respondió con autoridad (desde su fichero de zona) en vez de reenviar. Si falta, estás hablando con un resolutor intermedio.'),
      cmd({ caption: 'otros tipos de consulta' }, 'dig web.archforge.local AAAA +short', 'dig archforge.local MX +short', 'dig archforge.local TXT +short', 'dig -x 192.168.1.10 +short   # PTR inversa'),
      info('exit codes educativos', 'NXDOMAIN = el nombre NO existe en la zona. REFUSED = el servidor no quiere responderte (allow-query). SERVFAIL = el servidor quiso pero no pudo (zona rota). Tres fallos, tres causas distintas: memorízalos y diagnosticarás en segundos.'),
    ]),

    srvModule('probar-nslookup', '17', 'Probar con nslookup', 5, ['Usar nslookup como alternativa rápida'], [
      p('nslookup es más antiguo y menos expresivo que dig, pero existe en Windows y macOS nativamente — lo usarás para verificar tu DNS desde máquinas cliente no-Linux. Su salida mínima es perfecta para comprobaciones rápidas.'),
      cmd({}, 'nslookup server.archforge.local', 'nslookup server.archforge.local 127.0.0.1'),
      out('salida', `Server:\t\t127.0.0.1\nAddress:\t127.0.0.1#53\n\nName:\tserver.archforge.local\nAddress: 192.168.1.10`),
      tip('dig para aprender, nslookup para comprobar', 'Cuando enseñes a alguien o verifiques desde Windows, nslookup. Cuando depures de verdad (cabeceras, secciones, flags), dig.'),
    ]),

    srvModule('logs-diagnostico', '18', 'Logs y diagnóstico', 9, ['Leer journalctl de named', 'Validar configuración ANTES de reiniciar'], [
      p('BIND escribe todo lo relevante al journal. Tras cualquier cambio, journalctl -u es tu primera parada: dirá exactamente qué línea de qué fichero no gustó.'),
      cmd({ caption: '🐧 Arch Linux' }, 'sudo systemctl status named', 'sudo journalctl -u named -n 50 --no-pager'),
      cmd({ caption: '🟠 Debian / Ubuntu' }, 'sudo systemctl status bind9', 'sudo journalctl -u bind9 -n 50 --no-pager'),
      out('ejemplo de error real', `named[812]: /etc/named.zones:12: unknown option 'file'\nnamed[812]: configuration file /etc/named.conf test failed`),
      h('El hábito profesional: validar antes de aplicar'),
      cmd({ caption: 'comprobador de sintaxis integrado (común a ambas distros)' }, 'sudo named-checkconf', 'sudo named-checkzone archforge.local /etc/named/zones/db.archforge.local'),
      p('named-checkconf parsea la configuración sin arrancar nada; named-checkzone valida una zona concreta. Ambos salen en silencio cuando todo va bien — silencio = éxito, como chmod. Incorporarlos a tu rutina elimina el 90% de «reinicié y ya no arranca».'),
      deep('rndc: el mando a distancia de BIND', 'rndc reload recarga zonas SIN tirar el servicio (las consultas activas no se cortan); rndc flush vacía la caché. Mucho más elegante que restart para cambios de zona. En Debian puede requerir rndc-confgen previo según versión.'),
    ]),

    srvModule('seguridad', '19', '🔐 Seguridad', 10, ['Cerrar recursión abierta, TSIG y exposición mínima'], [
      danger('Open resolver: tu servidor como arma ajena', 'Un BIND con allow-query { any; } Y recursión activa es un open resolver: cualquiera puede abusarlo para ataques de amplificación DNS usando tu ancho de banda. Es de los hallazgos más frecuentes en auditorías de servidores mal configurados.'),
      h('Checklist de endurecimiento'),
      ol(
        'allow-query limitado a TU red: { 127.0.0.1; 192.168.1.0/24; }. Nunca any en servidores domésticos.',
        'Si solo sirves tu zona (sin cachear Internet): recursion no;. Mata la amplificación de raíz.',
        'Firewall: abre 53/udp+tcp SOLO a la red local (ufw allow from 192.168.1.0/24 to any port 53).',
        'Transferencias de zona: allow-transfer { clave-esclavo; }; con TSIG si algún día añades esclavos — sin clave, cualquiera puede descargar tu zona entera (enumeración).',
        'BIND corre como usuario dedicado (named/bind) sin shell: jamás lo ejecutes como root.',
      ),
      cmd({ caption: 'cerrar recursión (bloque options)' }, '# recursion no;  ← descomenta si solo eres autoritativo', '# allow-transfer { none; };  ← por defecto, nadie'),
      info('Versiones rolling', 'Arch actualiza BIND a menudo: las opciones deprecadas desaparecen y named-checkconf lo gritará tras actualizar. Ante un BIND que deja de arrancar después de pacman -Syu, lee journalctl ANTES de tocar config: casi siempre es una opción retirada.'),
    ]),

    srvModule('troubleshooting', '20', 'Troubleshooting', 10, ['Diagnosticar con método: servicio → config → red → cliente'], [
      p('Ante «no funciona el DNS», recorre esta escalera de abajo arriba; cada peldaño descarta media causa posible:'),
      ol(
        '¿El proceso vive? systemctl status named — inactive, failed o active cambia TODO el diagnóstico.',
        '¿Escucha? ss -ulpn | grep 53. Sin línea = no arrancó o listen-on apunta a otra IP.',
        '¿Configura bien? named-checkconf && named-checkzone … — errores de sintaxis nombrados al carácter.',
        '¿La zona carga? journalctl -u named | grep -i zone.',
        '¿Responde localmente? dig @127.0.0.1 server.archforge.local — si SÍ, el problema es red/cliente; si NO, es tuyo.',
        '¿El cliente pregunta al sitio? cat /etc/resolv.conf — el 80% de «no funciona» acaba aquí.',
      ),
      h('Mapa síntoma → causa probable'),
      tbl(['Síntoma (dig)', 'Causa típica', 'Ir a'], [
        ['connection refused', 'named parado o listen-on mal', 'paso 1–2'],
        ['timed out', 'firewall bloquea 53/udp', 'seguridad'],
        ['SERVFAIL + loading failed', 'error de sintaxis en zona', 'paso 3–4'],
        ['NXDOMAIN', 'registro ausente o punto final erróneo', 'módulo 09'],
        ['Respuesta SIN flag aa', 'estás hablando con un resolutor, no con tu BIND', '@127.0.0.1'],
      ]),
      info('Puente directo', 'Estos síntomas están desarrollados paso a paso en el Solucionador: «servidor DNS no responde», «la zona no carga», «un registro no resuelve» y «funciona local pero no en clientes». Búscalos desde la ficha del curso.'),
    ]),

    srvModule('laboratorio', '21', 'Laboratorio final', 25, ['Montar el DNS completo de archforge.local en la terminal virtual'], []),
  ],
  lab: {
    objective: 'Configura un servidor DNS autoritativo que resuelva server.archforge.local → 192.168.1.10 (y un alias www) desde la terminal virtual: instala BIND, crea la zona, arranca el servicio y comprueba con dig.',
    intro: 'Objetivo FINAL del estado: bind instalado · zona con A y alias · named activo · dig devolviendo 192.168.1.10.',
    tasks: [
      'instala el paquete de BIND (pacman -S bind / apt install bind9)',
      'su y luego mkdir -p /etc/named/zones',
      'nano /etc/named/zones/db.archforge.local → crea la zona con $ORIGIN y registro A de server → 192.168.1.10',
      'sudo systemctl start named (en ubuntu: sudo systemctl start bind9)',
      'echo "nameserver 127.0.0.1" > /tmp/resolv.tmp como root si quieres probar sin @',
      'dig @127.0.0.1 server.archforge.local +short → debe salir 192.168.1.10',
    ],
    hints: [
      'sudo pacman -S --noconfirm bind  (ubuntu: sudo apt install bind9 -y)',
      'su  ·  mkdir -p /etc/named/zones  ·  nano /etc/named/zones/db.archforge.local',
      '$ORIGIN archforge.local  +  línea:  server IN A 192.168.1.10',
      'sudo systemctl start named  ·  dig @127.0.0.1 server.archforge.local +short',
    ],
    validate(session) {
      const distro = session.distro
      const pkgOk = distro === 'arch'
        ? session.state.pkgs.arch.installed['bind'] !== undefined
        : session.state.pkgs.debian.installed['bind9'] !== undefined
      if (!pkgOk) return { pass: false, detail: 'falta instalar el paquete del servidor DNS (bind en arch / bind9 en ubuntu)' }

      let zoneContent = ''
      for (const dir of ['/etc/named/zones', '/etc/bind']) {
        try {
          const absDir = session.vfs.resolve(dir)
          if (!session.vfs.isDir(absDir)) continue
          for (const name of session.vfs.listDir(absDir)) {
            try {
              const c = session.vfs.readFile(`${dir}/${name}`)
              if (c.includes('$ORIGIN') || name.startsWith('db.') || name.includes('archforge')) zoneContent += '\n' + c
            } catch { /* skip */ }
          }
        } catch { /* skip */ }
      }
      if (!zoneContent.trim()) return { pass: false, detail: 'no encuentro ningún fichero de zona en /etc/named/zones ni /etc/bind' }
      if (!/server\s+(IN\s+)?A\s+192\.168\.1\.10/i.test(zoneContent)) return { pass: false, detail: 'la zona no contiene el registro A de server → 192.168.1.10' }

      const svcId = distro === 'arch' ? 'dns' : 'dns'
      const svc = session.state.services?.[svcId]
      if (!svc?.active) return { pass: false, detail: `el servicio DNS no está activo (sudo systemctl start ${distro === 'arch' ? 'named' : 'bind9'})` }

      const digOut = session.execute('dig @127.0.0.1 server.archforge.local +short').map((l) => l.text).join('\n')
      session.drain()
      if (!digOut.includes('192.168.1.10')) return { pass: false, detail: 'dig @127.0.0.1 server.archforge.local +short no devuelve 192.168.1.10' }
      return { pass: true, detail: 'BIND instalado, zona cargada con A correcto, servicio activo y dig resuelve' }
    },
  },
  related: RELATED,
}
