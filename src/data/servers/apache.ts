/* Curso Apache (httpd / apache2) */
import { cmd, danger, deep, file, h, info, ol, out, p, tip, tbl, ul, warn } from '../helpers'
import type { QuizData } from '../../types'
import { srvModule } from './types'
import type { RelatedLink } from './types'
import type { ServerCourse } from './types'

const q1: QuizData = {
  id: 'apache-quiz-vhost',
  difficulty: 'beginner',
  question: 'Creaste /etc/httpd/conf/extra/misitio.conf pero Apache sigue sirviendo el sitio por defecto. ¿Por qué?',
  options: [
    { text: 'Falta incluir ese fichero desde la configuración principal', why: 'Correcto: a diferencia de nginx conf.d/, en Arch NADA carga extra/*.conf sin tu línea Include.' },
    { text: 'El fichero debe llamarse .vhost', why: 'La extensión es libre; lo que importa es que se incluya.' },
    { text: 'Apache no soporta varios sitios', why: 'Los VirtualHosts son una función nuclear de Apache desde hace décadas.' },
    { text: 'Hay que borrar httpd.conf', why: '¡Jamás! Es la config maestra que precisamente debes editar para incluir tu sitio.' },
  ],
  answer: 0,
}


/* Recomendaciones basadas en relaciones REALES del contenido:
   · 🌐 Servidor web Nginx → reverse proxy delante de Apache
   · Firewall → conflicto de puertos y reglas
   · Usuarios y permisos → www-data/http y permisos de web root */
const RELATED: RelatedLink[] = [
  { label: '🌐 Servidor web Nginx', kind: 'course', to: 'nginx' },
  { label: 'Firewall', kind: 'section', to: 'firewall' },
  { label: 'Usuarios y permisos', kind: 'section', to: 'users' },
]

export const apacheCourse: ServerCourse = {
  id: 'apache',
  icon: '🌐',
  title: 'Servidor web Apache',
  tagline: 'Apache HTTP Server: instalación, VirtualHosts, módulos, .htaccess, logs e HTTPS.',
  level: 'intermediate',
  recommended: ['arch', 'debian'],
  minutes: 105,
  keywords: ['apache', 'httpd', 'apache2', 'virtualhost', '.htaccess', 'modulos', 'a2enmod'],
  prereqs: [
    { label: 'Servicios y systemd', icon: 'expert', to: '/section/expert' },
    { label: 'Permisos', icon: 'users', to: '/section/users' },
  ],
  cheatsheetIds: ['systemctl', 'journalctl', 'ss'],
  problemIds: ['srv-apache-no-inicia', 'srv-puerto-80-ocupado', 'srv-nginx-permisos-403'],
  modules: [
    srvModule('que-es-apache', '01', 'Qué es Apache y cuándo elegirlo', 8, ['Situar Apache frente a Nginx'], [
      p('Apache HTTP Server es el servidor web veterano (1995): dominó la web durante dos décadas y sigue siendo enorme en hosting compartido. Su filosofía difiere de Nginx: un modelo de MPM (Multi-Processing Module) configurable y un sistema de módulos que añade funcionalidad IN-PROCESS (PHP clásico, autenticaciones, rewrites).'),
      tbl(['Aspecto', 'Apache', 'Nginx'], [
        ['Arquitectura', 'MPM: procesos/hilos por conexión (event MPM moderno mitiga)', 'Event-driven asíncrono puro'],
        ['Config por directorio', '.htaccess SIN reiniciar (oro en shared hosting)', 'No existe: todo central'],
        ['Módulos dinámicos', 'Cientos cargables en caliente (a2enmod)', 'Conjunto fijo compilado'],
        ['Punto fuerte hoy', 'Compatibilidad, .htaccess, ecosistema', 'Concurrencia masiva, proxy'],
      ]),
      info('Veredicto práctico', 'Ambos son excelentes. Apache gana cuando necesitas .htaccess o módulos concretos; Nginx cuando esperas miles de conexiones o actúa como proxy. Saber configurar AMBOS te hace completo.'),
      warn('Nombres según familia — otra vez', 'Arch: paquete apache, demonio httpd.service. Ubuntu: paquete apache2, demonio apache2.service. El binario real es idéntico (httpd); solo cambia el empaquetado. Este curso señala cada divergencia.'),
    ]),

    srvModule('instalacion', '02', 'Instalación', 6, ['Instalar Apache en ambas familias'], [
      cmd({ caption: '🐧 Arch Linux' }, 'sudo pacman -S apache'),
      cmd({ caption: '🟠 Debian / Ubuntu' }, 'sudo apt update', 'sudo apt install apache2'),
      h('Mapa de configuración tras instalar'),
      tbl(['Ruta', 'Arch (/etc/httpd/)', 'Ubuntu (/etc/apache2/)'], [
        ['Config maestra', 'conf/httpd.conf (todo-en-uno)', 'apache2.conf + includes'],
        ['Sitios disponibles', 'conf/extra/*.conf (manual)', 'sites-available/'],
        ['Sitios ACTIVOS', 'la Include que TÚ escribas', 'symlink en sites-enabled/'],
        ['Módulos', 'LoadModule en httpd.conf', 'mods-available/ + a2enmod'],
      ]),
      warn('Dos filosofías de organización', 'Ubuntu trae utilidades a2ensite/a2enmod/a2dissite que gestionan symlinks por ti. En Arch todo es explícito: abres httpd.conf y escribes las líneas Include tú mismo. Más manual, más didáctico: ves EXACTAMENTE qué se carga.'),
    ]),

    srvModule('estructura', '03', 'Estructura y arranque inicial', 7, ['Arrancar Apache y verificar el sitio por defecto'], [
      cmd({ caption: '🐧 Arch Linux' }, '# descomenta en /etc/httpd/conf/httpd.conf:\n# LoadModule mpm_event_module modules/mod_mpm_event.so'.split('\n').join('\n'), 'sudo systemctl start httpd'),
      out('nota arch: servername', `AH00558: httpd: Could not reliably determine the server's fully qualified domain name.\nSet the 'ServerName' directive globally to suppress this message`),
      p('Ese aviso no es error: Apache quiere UN ServerName global. Añade al final del httpd.conf: ServerName localhost — y desaparece. Es el primer toque personal de cualquier Apache recién instalado.'),
      cmd({ caption: '🟠 Debian / Ubuntu' }, 'sudo systemctl start apache2   # apt ya lo arrancó probablemente'),
      cmd({ caption: 'verificación común' }, 'systemctl is-active httpd   # ubuntu: apache2', 'ss -tlnp | grep :80', 'curl -I http://localhost'),
      out('cabecera esperada', `HTTP/1.1 200 OK\nServer: Apache/2.4.62`),
      tip('Prueba en la simulación', 'En la terminal virtual: sudo pacman -S apache && sudo systemctl start httpd && systemctl status httpd. El estado persiste para el laboratorio.'),
    ]),

    srvModule('configuracion', '04', 'Configuración esencial', 8, ['Leer las directivas nucleares de httpd.conf/apache2.conf'], [
      file('/etc/httpd/conf/httpd.conf (directivas clave)', `Listen 80                     # puerto de escucha\nServerName localhost          # identidad global\nDocumentRoot "/srv/http"      # sitio por defecto (arch)\n<Directory "/srv/http">\n    Options Indexes FollowSymLinks\n    AllowOverride None        # ← habilitará .htaccess\n    Require all granted       # quién puede acceder\n</Directory>`),
      ul(
        'Listen: cambia aquí si necesitas otro puerto (o añade Listen 8080 adicional).',
        'Require all granted/denied: control de acceso declarativo moderno (sustituye al viejo Order/Deny).',
        'AllowOverride All permite que los .htaccess sobreescriban directivas POR DIRECTORIO — poderoso y peligroso (módulo 07).',
      ),
      deep('<Directory> vs <Location>', '<Directory> aplica al FILESYSTEM (rutas de disco); <Location> a URLs servidas. Confundirlos genera configs que «no aplican». Pregunta mental: ¿hablo de dónde está el fichero (Directory) o de qué URL pide el cliente (Location)?'),
    ]),

    srvModule('virtual-hosts', '05', 'Virtual Hosts', 11, ['Montar dos sitios independientes en un mismo Apache'], [
      p('Un VirtualHost es el equivalente exacto al server block de Nginx: nombre+root+logs por sitio. Este es el patrón canónico:'),
      file('Arch · /etc/httpd/conf/extra/archforge.conf', `<VirtualHost *:80>\n    ServerName www.archforge.local\n    DocumentRoot "/srv/archforge"\n    ErrorLog "/var/log/httpd/archforge-error.log"\n    CustomLog "/var/log/httpd/archforge-access.log" combined\n    <Directory "/srv/archforge">\n        Require all granted\n    </Directory>\n</VirtualHost>`),
      cmd({ caption: 'activarlo en Arch: include explícito', }, '# al FINAL de /etc/httpd/conf/httpd.conf añade:\nInclude conf/extra/archforge.conf', '# además comenta o edita el DocumentRoot del sitio default si colisiona', 'sudo apachectl configtest   # Syntax OK', 'sudo systemctl reload httpd'),
      cmd({ caption: '🟠 Ubuntu: utilidades a2ensite' }, 'sudo nano /etc/apache2/sites-available/archforge.conf   # mismo contenido VirtualHost', 'sudo a2ensite archforge     # crea el symlink en sites-enabled/', 'sudo apachectl configtest', 'sudo systemctl reload apache2'),
      out('prueba de ambos sitios' , `curl -H "Host: www.archforge.local" http://localhost\n<h1>Hola desde ArchForge sobre Apache</h1>`),
      warn('El primer vhost es especial', 'Apache usa el PRIMER VirtualHost del puerto como DEFAULT para Hosts desconocidos (igual que nginx). Orden consciente o ServerName catch-all evita sorpresas de «me sirve otro sitio».'),
    ]),

    srvModule('modulos', '06', 'Módulos', 8, ['Activar funcionalidad con LoadModule/a2enmod'], [
      p('Todo en Apache es un módulo: rewrite, ssl, headers, php… Sin el módulo cargado, sus directivas producen ERROR de sintaxis («Invalid command RewriteEngine»). Primero activas el módulo, luego usas sus directivas — orden lógico que muchos olvidan.'),
      cmd({ caption: '🟠 Ubuntu: gestión cómoda' }, 'sudo a2enmod rewrite ssl headers', 'sudo systemctl reload apache2', 'apache2ctl -M        # lista módulos activos'),
      cmd({ caption: '🐧 Arch: LoadModule manual' }, '# en httpd.conf, asegúrate de tener líneas como:\n# LoadModule rewrite_module modules/mod_rewrite.so\n# LoadModule ssl_module modules/mod_ssl.so', 'sudo apachectl -M | grep rewrite'),
      tbl(['Módulo', 'Para qué lo querrás'], [
        ['mod_rewrite', 'URLs amigables (WordPress/Laravel exigen RewriteEngine On)'],
        ['mod_ssl', 'HTTPS'],
        ['mod_headers', 'Cabeceras de seguridad (HSTS, CSP)'],
        ['mod_proxy + mod_proxy_http', 'Comportarse como reverse proxy'],
      ]),
      danger('.htaccess exige mod_rewrite + AllowOverride', 'El trío clásico de «las URLs limpias no funcionan»: ① mod_rewrite activo ② AllowOverride All en el Directory correcto ③ RewriteBase bien puesto. Los tres o ninguno.'),
    ]),

    srvModule('htaccess-permisos', '07', '.htaccess y permisos', 9, ['Entender qué resuelve .htaccess y su coste'], [
      p('.htaccess es configuración distribuida: un fichero EN EL DIRECTORIO que aplica directivas a ese árbol SIN recargar Apache. Por eso domina el hosting compartido: cada usuario gestiona el suyo sin tocar la config global.'),
      file('/srv/archforge/.htaccess (típico)', `RewriteEngine On\nRewriteCond %{REQUEST_FILENAME} !-f\nRewriteCond %{REQUEST_FILENAME} !-d\nRewriteRule ^ index.php [L]\n\n# cabeceras de seguridad básicas:\nHeader set X-Content-Type-Options "nosniff"`),
      h('El precio que pagas'),
      ul(
        'Apache BUSCA y lee .htaccess en CADA directorio de cada petición → penalización real de rendimiento.',
        'Por defecto está DESACTIVADO (AllowOverride None): activarlo por directorio concreto, nunca globalmente.',
        'Un .htaccess malintencionado en un directorio subido por usuarios = código ejecutado en TU servidor: audita qué pueden subir.',
      ),
      cmd({ caption: 'diagnóstico de permisos (idéntico a nginx)' }, 'namei -l /srv/archforge/index.html', '# usuario del proceso:\nps aux | grep -E "httpd|apache2" | head -3'),
      out('usuario del servicio según familia', `🐧 Arch  → http\n🟠 Ubuntu → www-data`),
      info('403 Forbidden: misma medicina', 'Como aprendiste con Nginx: cadena completa de directorios con x, ficheros r, propietario coherente. La herramienta namei -l es universal para ambos servidores.'),
    ]),

    srvModule('logs', '08', 'Logs', 6, ['access.log combinado y error.log'], [
      cmd({}, 'sudo tail -f /var/log/httpd/access_log   # ubuntu: /var/log/apache2/access.log', 'sudo tail -30 /var/log/httpd/error_log'),
      out('formato combined disecado', `192.168.1.50 - - [25/Aug/2026:15:20:33 +0000] "GET /index.html HTTP/1.1" 200 612 "https://google.com" "Mozilla/5.0..."\n└IP            └fecha                       └petición             └código└bytes└REFERER           └user-agent`),
      p('El formato combined añade Referer y User-Agent al común: sabrás DE DÓNDE llega el tráfico y CON QUÉ navegador. Para depurar errores internos (permisos, PHP fatal), error_log narra la causa; access.log solo registra el síntoma (el código 500).'),
    ]),

    srvModule('firewall', '09', 'Firewall', 5, ['Exponer 80/443 igual que en Nginx'], [
      cmd({}, 'sudo ufw allow 80/tcp', 'sudo ufw allow 443/tcp', 'sudo ufw status verbose'),
      p('Idéntico al módulo firewall del curso Nginx: el firewall protege PUERTOS, no aplicaciones. Lo nuevo aquí es la convivencia: si Apache y Nginx comparten máquina, SOLO uno puede tener el :80 — decide cuál hace front (el otro como proxy interno en puerto alto) o muévelos de puerto.'),
      danger('Conflicto de puertos entre cursos', 'Instalaste nginx en el curso anterior y ahora apache no arranca: «Address already in use». No es bug: dos procesos quieren el mismo puerto. ss -tlnp | grep :80 nombra al culpable; para este laboratorio detén el otro servicio (sudo systemctl stop nginx) y documenta la decisión.'),
    ]),

    srvModule('https', '10', 'HTTPS con mod_ssl', 8, ['Certificado TLS y vhost 443'], [
      cmd({ caption: 'certificado autofirmado para laboratorio (común)' }, 'sudo openssl req -x509 -nodes -days 365 \\\n  -newkey rsa:2048 \\\n  -keyout /etc/ssl/private/archforge.key \\\n  -out /etc/ssl/certs/archforge.crt'.replace(/\\\n/g, ' \\')),
      file('vhost https', `<VirtualHost *:443>\n    ServerName www.archforge.local\n    DocumentRoot "/srv/archforge"\n\n    SSLEngine on\n    SSLCertificateFile      /etc/ssl/certs/archforge.crt\n    SSLCertificateKeyFile   /etc/ssl/private/archforge.key\n</VirtualHost>`),
      ol(
        'Activa mod_ssl (a2enmod ssl en ubuntu / LoadModule en arch) y Listen 443 https en la config.',
        'apachectl configtest antes de reload — SSLEngine sin certificado NO arranca.',
        'Producción real: Let\'s Encrypt con certbot --apache automatiza emisión Y renovación.',
      ),
      warn('Autofirmado = cifrado sí, confianza no', 'El navegador mostrará advertencia porque NADIE avala tu identidad. Perfecto para laboratorio interno; inaceptable para público. Concepto clave: HTTPS cifra siempre; el certificado público demuestra QUIÉN eres.'),
    ]),

    srvModule('troubleshooting', '11', 'Troubleshooting', 8, ['Diagnosticar arranque, sitios y permisos'], [
      ol(
        '¿Arranca? systemctl status → failed: journalctl -u httpd/apache2 nombra la directiva culpable.',
        '¿Puerto ocupado? ss -tlnp | grep :80 — suele ser el OTRO servidor web del sistema.',
        '¿Sintaxis? apachectl configtest SIEMPRE tras editar. Ahorra restarts ciegos.',
        '¿Mi vhost no aplica? apache2ctl -S muestra TODOS los vhosts reconocidos y cuál es default.',
        '403 → namei -l + propietario http/www-data. 500 → tail error_log (PHP fatal típico).',
      ),
      tbl(['Síntoma', 'Traducción', 'Módulo'], [
        ['Address already in use', 'Otro proceso tiene el :80', '09'],
        ['Invalid command RewriteEngine', 'mod_rewrite no cargado', '06'],
        ['AH00558 FQDN warning', 'Falta ServerName global', '03'],
        ['Mi sitio no aparece', 'Include/symlink ausente (a2ensite)', '05'],
      ]),
      info('Solucionador integrado', '«Apache no inicia» y «puerto 80 ocupado» tienen ficha completa en Troubleshooting de ArchForge.'),
    ]),

    srvModule('laboratorio', '12', 'Laboratorio', 18, ['Publicar tu sitio con Apache en la terminal virtual'], []),
  ],
  lab: {
    objective: 'Instala Apache, publica /srv/www/archforge/index.html, declara el VirtualHost de www.archforge.local y deja el demonio activo escuchando en el 80.',
    intro: 'Estado FINAL: apache instalado · index creado · VirtualHost con ServerName · servicio active.',
    tasks: [
      'sudo pacman -S apache',
      'su · mkdir -p /srv/www/archforge · echo "<h1>Apache ArchForge</h1>" > /srv/www/archforge/index.html',
      'nano /etc/httpd/conf/extra/archforge.conf → VirtualHost con ServerName www.archforge.local y DocumentRoot /srv/www/archforge',
      'sudo systemctl start httpd',
      'verifica: systemctl status httpd · ss -tlnp | grep :80',
    ],
    hints: [
      'sudo pacman -S --noconfirm apache',
      'su → mkdir -p /srv/www/archforge → echo contenido > index.html',
      '<VirtualHost *:80> … ServerName www.archforge.local … DocumentRoot "/srv/www/archforge" … </VirtualHost>',
      'sudo systemctl start httpd  ·  ss -tlnp | grep :80',
    ],
    validate(session) {
      const pkgOk = session.state.pkgs.arch.installed['apache'] !== undefined || session.state.pkgs.debian.installed['apache2'] !== undefined
      if (!pkgOk) return { pass: false, detail: 'falta instalar apache (apache / apache2)' }
      let idx = ''
      try { idx = session.vfs.readFile('/srv/www/archforge/index.html') } catch { /* falta */ }
      if (!idx.trim()) return { pass: false, detail: 'no existe /srv/www/archforge/index.html con contenido' }
      let found = false
      for (const c of ['/etc/httpd/conf/extra/archforge.conf', '/etc/apache2/sites-available/archforge.conf', '/etc/apache2/sites-enabled/archforge.conf']) {
        try {
          const conf = session.vfs.readFile(c)
          if (/VirtualHost\s+\*:80/.test(conf) && /ServerName\s+www\.archforge\.local/.test(conf) && /\/srv\/www\/archforge/.test(conf)) { found = true; break }
        } catch { /* next */ }
      }
      if (!found) return { pass: false, detail: 'no encuentro el VirtualHost válido (*:80 + ServerName www.archforge.local + DocumentRoot /srv/www/archforge)' }
      if (!session.state.services?.['apache']?.active) return { pass: false, detail: `el demonio no está activo (sudo systemctl start ${session.distro === 'arch' ? 'httpd' : 'apache2'})` }
      const ss = session.execute('ss -tlnp').map((l) => l.text).join('\n')
      session.drain()
      // si ss no está instalado, el estado del servicio ya es prueba suficiente
      if (ss.includes('LISTEN') && !ss.includes(':80')) return { pass: false, detail: 'no hay nadie escuchando en :80' }
      return { pass: true, detail: 'Apache instalado con VirtualHost publicado y demonio en escucha' }
    },
  },
  related: RELATED,
}
