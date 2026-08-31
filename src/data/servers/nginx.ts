/* Curso Nginx — servidor web y proxy inverso */
import { cmd, danger, deep, file, h, info, ol, out, p, tip, tbl, ul, warn } from '../helpers'
import type { QuizData } from '../../types'
import { srvModule } from './types'
import type { RelatedLink } from './types'
import type { ServerCourse } from './types'

const q1: QuizData = {
  id: 'nginx-quiz-serverblock',
  difficulty: 'intermediate',
  question: 'Nginx sirve dos dominios (a.local y b.local) en el mismo puerto 80. ¿Cómo decide cuál responder?',
  options: [
    { text: 'Por orden de aparición en nginx.conf', why: 'Solo aplica como DESEMPATE cuando ninguno coincide; no es el mecanismo principal.' },
    { text: 'Por la cabecera Host de la petición contra los server_name', why: 'Exacto: el virtual hosting por nombre compara la cabecera Host con cada bloque server.' },
    { text: 'Por la IP de destino del paquete', why: 'Eso sería hosting por IP (un IP por sitio); aquí ambas IP son la misma.' },
    { text: 'Aleatoriamente entre bloques activos', why: 'Nada de azar: el matching de server_name es determinista.' },
  ],
  answer: 1,
}


/* Recomendaciones basadas en relaciones REALES del contenido:
   · 🌐 Servidor web Apache → el otro gran servidor web, comparación directa
   · 🔐 Servidor SSH → administra tu servidor remoto con claves
   · Firewall → 80/443 y Docker vs ufw
   · Virtualización → monta una VM para practicar sin miedo */
const RELATED: RelatedLink[] = [
  { label: '🌐 Servidor web Apache', kind: 'course', to: 'apache' },
  { label: '🔐 Servidor SSH', kind: 'course', to: 'ssh' },
  { label: 'Firewall', kind: 'section', to: 'firewall' },
  { label: 'Virtualización', kind: 'section', to: 'virtualization' },
]

export const nginxCourse: ServerCourse = {
  id: 'nginx',
  icon: '🌐',
  title: 'Servidor web Nginx',
  tagline: 'Sirve sitios con Nginx: document root, server blocks, virtual hosts, reverse proxy e introducción a HTTPS.',
  level: 'beginner',
  recommended: ['arch', 'debian'],
  minutes: 110,
  keywords: ['nginx', 'servidor web', 'http', 'server block', 'virtual host', 'reverse proxy', 'https', 'document root'],
  prereqs: [
    { label: 'Servicios y systemd', icon: 'expert', to: '/section/expert' },
    { label: 'Red', icon: 'network', to: '/section/network' },
  ],
  cheatsheetIds: ['systemctl', 'journalctl', 'ss'],
  problemIds: ['srv-nginx-no-inicia', 'srv-puerto-80-ocupado', 'srv-nginx-config-invalida', 'srv-nginx-permisos-403'],
  modules: [
    srvModule('que-es-servidor-web', '01', 'Qué es un servidor web', 7, ['Entender el rol exacto del software de servidor web'], [
      p('Un servidor web hace algo aparentemente trivial: recibe una petición HTTP («dame /index.html») y responde contenido (fichero estático, salida de un backend, o un error). La complejidad real vive en hacerlo para MILES de conexiones simultáneas de forma eficiente — ahí compiten las arquitecturas.'),
      tbl(['Modelo', 'Idea', 'Representante'], [
        ['Proceso/hilo por conexión', 'Uno cada vez, sencillo pero costoso', 'Apache clásico (prefork)'],
        ['Event-driven asíncrono', 'Un worker gestiona miles de conexiones', 'Nginx, Caddy'],
      ]),
      p('Nginx nació (2004) precisamente para resolver el problema C10k: diez mil conexiones concurrentes. Hoy es el servidor más desplegado del mundo y además brilla como PROXY INVERSO: puerta de entrada que reparte tráfico hacia backends internos.'),
      info('Dos usos que aprenderás aquí', '① Servir ficheros estáticos directamente. ② Actuar como reverse proxy frente a aplicaciones. Ambos se configuran con la misma gramática de bloques.'),
    ]),

    srvModule('http-https', '02', 'HTTP/HTTPS', 8, ['Leer una conversación HTTP real'], [
      p('HTTP es texto sobre TCP: petición → respuesta, sin memoria entre ellas (stateless). Verlo crudo desmitifica todo lo demás:'),
      file('conversación http.txt', `► PETICIÓN\nGET /index.html HTTP/1.1\nHost: www.archforge.local\nUser-Agent: curl/8.11\n\n◄ RESPUESTA\nHTTP/1.1 200 OK\nContent-Type: text/html\nContent-Length: 612\n\n<html>…`),
      ul(
        'La cabecera Host decide QUÉ sitio sirves cuando varios viven en la misma IP: base del virtual hosting (módulo 07).',
        'Códigos: 2xx éxito · 3xx redirección · 4xx culpa del cliente (403 permisos, 404 no existe) · 5xx culpa del servidor.',
        'HTTPS = HTTP DENTRO de TLS: mismo protocolo envuelto en cifrado+identidad (certificado). Mismo puerto distinto (443 vs 80).',
      ),
      cmd({ caption: 'ver HTTP crudo desde tu terminal' }, 'curl -v http://archlinux.org -o /dev/null 2>&1 | head -20'),
    ]),

    srvModule('instalacion', '03', 'Instalación', 6, ['Instalar nginx y localizar sus ficheros'], [
      cmd({ caption: '🐧 Arch Linux' }, '# 🐧 Arch Linux', 'sudo pacman -S nginx'),
      cmd({ caption: '🟠 Debian / Ubuntu' }, '# 🟠 Debian / Ubuntu', 'sudo apt update', 'sudo apt install nginx'),
      h('Mapa de ficheros tras instalar'),
      tbl(['Ruta', 'Qué contiene'], [
        ['/etc/nginx/nginx.conf', 'Configuración MAESTRA: incluye el resto'],
        ['Arch: /etc/nginx/sites-enabled/ · Debian: igual', 'Un fichero por sitio virtual'],
        ['/usr/share/nginx/html o /var/www/html', 'Document root de ejemplo'],
        ['/var/log/nginx/', 'access.log y error.log'],
      ]),
      warn('Diferencia clave entre familias', 'Debian organiza cada sitio en sites-available/ + symlink a sites-enabled/. El nginx.conf de ARCH NO incluye ese directorio: o creas los bloques directamente en conf.d/ (que sí incluye) o añades la línea include sites-enabled/*.conf; tú mismo. Saber dónde busca nginx evita el clásico «creé el fichero y no pasa nada».'),
    ]),

    srvModule('systemd', '04', 'systemd', 7, ['Gestionar nginx con systemctl correctamente'], [
      cmd({ caption: 'el ciclo completo profesional' }, 'sudo systemctl start nginx       # arrancar ahora\nsudo systemctl enable --now nginx # permanente + inmediato'.replace(/\n/g, '\n'), '# tras CAMBIAR configuración:\nsudo systemctl reload nginx       # sin cortar conexiones activas'),
      out('estado sano', `● nginx.service - A high performance web server...\n     Active: active (running)\n   Main PID: 1237 (nginx)`),
      h('reload vs restart: decisión real'),
      ul(
        'reload: relee config SIN tirar conexiones. Ideal en producción con usuarios conectados.',
        'restart: parada total + arranque. Necesario solo si cambió binario o hay estados raros.',
        'Si la config es inválida, reload falla manteniendo el servicio VIEJO vivo (¡bien!): otra razón de preferirlo.',
      ),
      tip('Prueba en la simulación', 'En la terminal virtual: sudo pacman -S nginx && sudo systemctl enable --now nginx && systemctl status nginx. El estado del servicio persiste en tu sesión y el laboratorio lo validará.'),
    ]),

    srvModule('document-root', '05', 'Document root', 7, ['Publicar tu primer HTML y entender rutas URL↔sistema'], [
      p('El document root es el directorio del DISCO que nginx mapea al raíz «/» del SITIO web. La petición GET /foto.jpg se traduce a root+/foto.jpg — esa concatenación mental resuelve el 90% de dudas de rutas.'),
      cmd({ caption: 'crear tu propio sitio (común)' }, 'sudo mkdir -p /var/www/archforge', "sudo sh -c \"echo '<h1>Hola desde ArchForge</h1>' > /var/www/archforge/index.html\"", 'sudo chown -R http:http /var/www/archforge   # arch\n# ubuntu usa www-data:www-data'),
      out('usuarios del servicio según familia', `🐧 Arch  → usuario/grupo http\n🟠 Ubuntu → usuario/grupo www-data`),
      danger('El error 403 Forbidden nace aquí', 'nginx corre como http/www-data. Si TU usuario creó /var/www/archforge con permisos 750, el proceso del servidor NO PUEDE ENTRAR → 403. Regla: cada directorio del camino necesita x para todos (755) y los ficheros r (644). Los errores de permisos se diagnostican con namei -l /var/www/archforge.'),
    ]),

    srvModule('nginx-conf', '06', 'nginx.conf', 9, ['Comprender la jerarquía de bloques http→server→location'], [
      p('La config de nginx es una jerarquía heredable: directivas globales → bloque events → bloque http (todo lo web) → server (UN sitio) → location (rutas dentro del sitio). Cada nivel hereda del anterior y puede sobreescribirlo.'),
      file('/etc/nginx/nginx.conf (esqueleto)', `user http;                    # ubuntu: user www-data;\nworker_processes auto;        # un worker por CPU\n\nevents {\n    worker_connections 1024;  # conexiones máx por worker\n}\n\nhttp {\n    include mime.types;\n    sendfile on;\n    keepalive_timeout 65;\n\n    include conf.d/*.conf;    # ← TUS sitios van aquí\n}`),
      h('Mentalidad de administrador'),
      ul(
        'NO edites nginx.conf para añadir sitios: crea UN fichero por sitio en conf.d/ (o sites-available). Separación limpia = mantenimiento posible.',
        'worker_connections × workers ≈ máximo teórico de conexiones: dimensionar es multiplicar bien.',
        'mime.types asocia extensiones a Content-Type: sin él, los navegadores descargan en vez de renderizar CSS/JS.',
      ),
      deep('¿Por qué auto y no número?', 'worker_processes auto consulta las CPUs disponibles y genera un worker por núcleo. En contenedores con límites de CPU puede mentir: fijar número explícito es el ajuste fino profesional en esos casos.'),
    ]),

    srvModule('server-blocks', '07', 'Server blocks', 10, ['Escribir tu primer server block funcional'], [
      p('Un bloque server ES un sitio virtual: escucha en un puerto y responde por su server_name (la cabecera Host). Este es el mínimo completo:'),
      file('/etc/nginx/conf.d/archforge.conf', `server {\n    listen 80;\n    server_name www.archforge.local archforge.local;\n\n    root /var/www/archforge;\n    index index.html;\n\n    access_log /var/log/nginx/archforge.access.log;\n    error_log  /var/log/nginx/archforge.error.log;\n}`),
      h('Línea a línea'),
      ul(
        'listen 80: puerto IPv4 (añade [::]:80 para IPv6).',
        'server_name: nginx elige bloque comparando esta lista con la cabecera Host — hosting múltiple en una sola IP.',
        'root: tu document root del módulo anterior. index: fichero servido cuando piden «/».',
        'Logs propios POR SITIO: imprescindible cuando conviven varios.',
      ),
      cmd({ caption: 'aplicar siempre con este ritual' }, 'sudo nginx -t                 # valida sintaxis\nsudo systemctl reload nginx   # aplica sin corte'),
      out('respuesta esperada', `curl -H "Host: www.archforge.local" http://localhost\n<h1>Hola desde ArchForge</h1>`),
      warn('nginx -t ANTES de reload, SIEMPRE', 'Una llave perdida deja la config inválida: reload la rechazará (servicio viejo sigue), restart podría dejarte SIN WEB. nginx -t cuesta un segundo y evita el susto. Hábito innegociable.'),
    ]),

    srvModule('virtual-hosts', '08', 'Virtual hosts', 9, ['Servir dos sitios distintos en la misma máquina/IP'], [
      p('Con dos bloques server en el mismo puerto, nginx despacha por server_name. Es la magia del hosting compartido moderno: una IP, muchos sitios.'),
      file('/etc/nginx/conf.d/docs.conf (segundo sitio)', `server {\n    listen 80;\n    server_name docs.archforge.local;\n    root /var/www/docs;\n    index index.html;\n}`),
      ol(
        'Crea /var/www/docs con su index.html (permisos 755/644 como antes).',
        'nginx -t && reload.',
        'Prueba ambos: curl -H "Host: docs..." http://localhost vs www....',
      ),
      deep('Desempate cuando nada coincide', 'Si llega un Host desconocido, nginx usa el PRIMER bloque server del puerto (o el marcado default_server). Explotarlo conscientemente: un bloque catch-all que devuelve 444 (cerrar sin respuesta) neutraliza escaneos por IP directa. Truco pro de endurecimiento.'),
    ]),

    srvModule('logs', '09', 'Logs', 8, ['Leer access.log y error.log para diagnosticar de verdad'], [
      cmd({}, 'sudo tail -f /var/log/nginx/access.log', 'sudo tail -50 /var/log/nginx/error.log'),
      out('una línea de access.log disecada', `192.168.1.50 - - [25/Aug/2026:15:02:11] "GET /index.html HTTP/1.1" 200 612 "-" "curl/8.11"\n└IP cliente     └fecha                └petición              └código └bytes  └agente`),
      h('Qué buscas en cada log'),
      tbl(['Log', 'Contiene', 'Uso diagnóstico'], [
        ['access.log', 'TODAS las peticiones con código', '¿Llegó mi petición? ¿qué respondió? ¿quién ataca?'],
        ['error.log', 'Fallos internos de nginx', 'Permisos, rutas inexistentes, upstream caído'],
      ]),
      p('Regla de oro: 403/404 aparecen en AMBOS lados pero la CAUSA suele narrarse en error.log («permission denied», «open() failed»). Ante cualquier código 4xx/5xx inesperado: error.log primero, access.log después para contexto.'),
    ]),

    srvModule('permisos', '10', 'Permisos', 7, ['Dominar http/www-data y la cadena completa de acceso'], [
      p('Los errores de permisos web tienen SIEMPRE la misma anatomía: el proceso corre como X, los ficheros pertenecen a Y con modos Z. Herramienta definitiva: namei muestra TODOS los directorios del camino, no solo el final.'),
      cmd({ caption: 'diagnóstico quirúrgico' }, 'namei -l /var/www/archforge/index.html'),
      out('lectura del resultado', `drwxr-xr-x root  root   /\ndrwxr-xr-x root  root   var\ndrwxr-xr-x root  root   www\ndrwx------ ana   ana    archforge   ← ¡aquí falla! http no puede entrar (falta x para otros)`),
      cmd({ caption: 'reparación estándar' }, 'sudo chown -R http:http /var/www/archforge    # ubuntu: www-data:www-data\nsudo chmod -R u=rwX,g=rX,o=rX /var/www/archforge'),
      p('El X mayúscula de chmod es inteligente: aplica ejecución SOLO a directorios (y ficheros ya ejecutables). Evita marcar todos los .html como ejecutables, error común con chmod -R 755.'),
    ]),

    srvModule('firewall', '11', 'Firewall', 6, ['Abrir 80/443 con criterio'], [
      cmd({ caption: 'ufw — común a ambas familias' }, 'sudo ufw allow 80/tcp', 'sudo ufw allow 443/tcp', 'sudo ufw status'),
      out('reglas esperadas', `80/tcp                     ALLOW    Anywhere\n443/tcp                    ALLOW    Anywhere`),
      ul(
        'Sin 80 abierto, tu web funciona en localhost y muere ante el mundo: síntoma «desde el servidor va, desde fuera nada».',
        'Solo servirás LAN interna: ufw allow from 192.168.1.0/24 to any port 80.',
        'Recuerda: Docker manipula iptables POR DEBAJO de ufw — contenedores publicados saltan tus reglas (ver sección Firewall de ArchForge).',
      ),
    ]),

    srvModule('https-tls', '12', 'HTTPS / TLS (introducción)', 9, ['Entender certificados y montar HTTPS básico'], [
      p('HTTPS envuelve HTTP en TLS: cifrado (nadie lee el tráfico) + identidad (un certificado firmado demuestra QUE ERES quien dices) + integridad (nadie lo modifica en ruta). El certificado lo emite una CA; Let\'s Encrypt lo emite GRATIS y automatizado con certbot.'),
      cmd({ caption: 'certbot en ambas familias' }, '# 🐧 Arch:\nsudo pacman -S certbot certbot-nginx\n# 🟠 Ubuntu:\nsudo apt install certbot python3-certbot-nginx', '# emisión automática (necesita dominio REAL + 80 abierto):\nsudo certbot --nginx -d www.tudominio.com'),
      file('bloque https resultante (manual mínimo)', `server {\n    listen 443 ssl;\n    server_name www.archforge.local;\n    root /var/www/archforge;\n\n    ssl_certificate     /etc/ssl/certs/tu-cert.pem;\n    ssl_certificate_key /etc/ssl/private/tu-key.pem;\n}`),
      ul(
        'El redirect canónico: otro server block en :80 que devuelve 301 https://$host$request_uri. Todo tráfico forzado a TLS.',
        'Let\'s Encrypt renueva solo vía timer de systemd (certbot-renew): verifica con certbot renew --dry-run.',
        'Para LABORATORIO interno sin dominio público: certificado autofirmado (openssl req -x509…) — el navegador protestará porque nadie avala la identidad, pero el cifrado es real.',
      ),
      warn('Los detalles TLS envejecen', 'Protocolos y cifrados recomendados cambian con años (TLS 1.2→1.3, cifrados deprecados). Usa generadores actuales (mozilla.github.io/server-side-tls) en vez de copiar configs antiguas de blogs: principio aplicado a TODO este curso rolling-release.'),
    ]),

    srvModule('reverse-proxy', '13', 'Reverse proxy', 10, ['Poner nginx delante de una aplicación backend'], [
      p('Como proxy inverso, nginx recibe el tráfico público y lo reenvía a backends privados (Node en :3000, Python en :8000…). Ganas: TLS centralizado, compresión, cacheo, balanceo entre varias instancias y backends JAMÁS expuestos a Internet.'),
      file('/etc/nginx/conf.d/app.conf', `upstream backend {\n    server 127.0.0.1:3000;      # tu aplicación Node/Python/etc.\n}\nserver {\n    listen 80;\n    server_name app.archforge.local;\n\n    location / {\n        proxy_pass http://backend;\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n    }\n}`),
      h('Las cabeceras que SÍ importan'),
      ul(
        'Host: muchas apps construyen URLs absolutas; sin ella generan http://127.0.0.1:3000/... públicas rotas.',
        'X-Real-IP/X-Forwarded-For: sin ellas tu app cree que TODOS los clientes son 127.0.0.1 — logs inútiles y rate-limits rotos.',
      ),
      cmd({ caption: 'diagnóstico de proxy' }, 'curl -i http://app.archforge.local/api/health', 'sudo tail -5 /var/log/nginx/error.log   # si sale 502: backend caído'),
      out('502 Bad Gateway significa', 'nginx VIVO pero backend NO CONTESTA: proceso muerto, puerto equivocado o firewall local. El error.log lo dirá: connect() failed (111: Connection refused) while connecting to upstream.'),
    ]),

    srvModule('troubleshooting', '14', 'Troubleshooting', 10, ['Diagnosticar arranque, puertos, config y permisos'], [
      ol(
        '¿Arranca? systemctl status nginx → failed: journalctl -u nginx dice LA línea culpable.',
        '¿Escucha? ss -tlnp | grep :80 → nada: config no cargó o conflicto de puerto.',
        '«Address already in use» → OTRO proceso tiene el 80 (apache típico): ss -tlnp | grep :80 lo nombra.',
        'Config sospechosa → nginx -t SIEMPRE primero; señala fichero:línea.',
        '403 → namei -l sobre el recurso; 404 → root/index mal; 502 → backend caído (proxy).',
      ),
      tbl(['Síntoma', 'Causa más probable', 'Módulo'], [
        ['Job for nginx.service failed', 'Sintaxis inválida o puerto ocupado', '14'],
        ['403 Forbidden', 'Permisos: http/www-data sin x/r', '05·10'],
        ['404 en «/»', 'index ausente o root erróneo', '05'],
        ['Welcome to nginx! genérica', 'Está respondiendo el site DEFAULT, no el tuyo', '07–08'],
        ['502 Bad Gateway', 'Backend del upstream caído', '13'],
      ]),
      info('Solucionador integrado', '«Nginx no inicia», «puerto 80 ocupado», «configuración inválida» y «permisos incorrectos (403)» están desarrollados en Troubleshooting de ArchForge con pasos verificables.'),
    ]),

    srvModule('laboratorio', '15', 'Laboratorio', 20, ['Publicar un sitio completo en la terminal virtual'], []),
  ],
  lab: {
    objective: 'Instala nginx, publica un index.html en /var/www/archforge con permisos correctos, declara un server block para www.archforge.local y deja el servicio activo y en escucha en el 80.',
    intro: 'Estado FINAL: nginx instalado · index creado · server block con server_name · servicio active.',
    tasks: [
      'sudo pacman -S nginx',
      'su · mkdir -p /var/www/archforge · echo "<h1>ArchForge</h1>" > /var/www/archforge/index.html',
      'nano /etc/nginx/conf.d/archforge.conf → server block con listen 80 y root /var/www/archforge',
      'sudo systemctl start nginx',
      'comprueba: systemctl status nginx · ss -tlnp | grep :80',
    ],
    hints: [
      'sudo pacman -S --noconfirm nginx',
      'su → mkdir -p /var/www/archforge && echo hola > /var/www/archforge/index.html',
      'nano /etc/nginx/conf.d/archforge.conf: server { listen 80; server_name www.archforge.local; root /var/www/archforge; index index.html; }',
      'sudo systemctl start nginx  ·  ss -tlnp | grep :80',
    ],
    validate(session) {
      const pkgOk = session.state.pkgs.arch.installed['nginx'] !== undefined || session.state.pkgs.debian.installed['nginx'] !== undefined
      if (!pkgOk) return { pass: false, detail: 'falta instalar nginx' }
      let idx = ''
      try { idx = session.vfs.readFile('/var/www/archforge/index.html') } catch { /* falta */ }
      if (!idx.trim()) return { pass: false, detail: 'no existe /var/www/archforge/index.html con contenido' }
      let foundBlock = false
      for (const c of ['/etc/nginx/conf.d/archforge.conf', '/etc/nginx/sites-enabled/archforge.conf', '/etc/nginx/sites-available/archforge.conf']) {
        try {
          const conf = session.vfs.readFile(c)
          if (/listen\s+80/.test(conf) && /server_name[^;]*www\.archforge\.local/.test(conf) && /root\s+\/var\/www\/archforge\s*;/.test(conf)) { foundBlock = true; break }
        } catch { /* next */ }
      }
      if (!foundBlock) return { pass: false, detail: 'no encuentro el server block válido (listen 80 + server_name www.archforge.local + root /var/www/archforge)' }
      if (!session.state.services?.['nginx']?.active) return { pass: false, detail: 'nginx no está activo (sudo systemctl start nginx)' }
      const ss = session.execute('ss -tlnp').map((l) => l.text).join('\n')
      session.drain()
      // si ss no está instalado, el estado del servicio ya es prueba suficiente
      if (ss.includes('LISTEN') && !ss.includes(':80')) return { pass: false, detail: 'nginx no aparece escuchando en :80 (comprueba con ss -tlnp)' }
      return { pass: true, detail: 'nginx instalado, sitio publicado con server block y servicio en escucha' }
    },
  },
  related: RELATED,
}
