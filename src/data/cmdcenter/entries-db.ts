import type { CommandEntry } from './meta'

/* Comandos de bases de datos: clientes, backups y diagnóstico.
   Flags verificados contra PostgreSQL 16 y MariaDB 11. */

export const DB_COMMANDS: CommandEntry[] = [
  {
    id: 'psql', name: 'psql', cat: 'bases-datos', distro: ['arch', 'debian'], important: true,
    summary: 'Cliente interactivo de PostgreSQL: conectar, consultar y administrar.',
    breakdown: [
      { token: '-U usuario', meaning: 'rol con el que conectas (por defecto tu usuario del SO)' },
      { token: '-d base', meaning: 'base inicial (por defecto una con tu nombre)' },
      { token: '-h host -p puerto', meaning: 'TCP remoto (por defecto socket local + 5432)' },
      { token: '-c "SQL"', meaning: 'ejecuta UNA sentencia y sale (ideal scripts)' },
      { token: '-f archivo.sql', meaning: 'ejecuta un script (restaurar volcados planos)' },
      { token: '-l', meaning: 'lista bases de datos y sale' },
    ],
    examples: [
      { desc: 'entrar local como postgres', lines: ['sudo -iu postgres psql'] },
      { desc: 'una consulta sin entrar', lines: ['psql -U tienda_app -d tienda -h localhost -c "SELECT count(*) FROM pedidos;"'] },
      { desc: 'restaurar volcado plano', lines: ['psql -d tienda_test -f tienda.sql'] },
    ],
    whatHappens: 'Negocia conexión (socket o TCP), autentica según pg_hba.conf y ejecuta. -c/-f no abren el prompt.',
    errors: [
      { symptom: 'FATAL: Peer authentication failed.', fix: 'Por socket mapea tu usuario SO al rol: usa sudo -iu postgres o crea rol + password y conecta por -h localhost.' },
      { symptom: 'could not connect: Connection refused.', fix: 'Servicio parado (systemctl status postgresql) o listen_addresses sin tu interfaz.' },
    ],
    related: ['pg_dump', 'systemctl', 'ss'],
    intents: ['conectar postgresql', 'cliente postgres', 'ejecutar sql postgres', 'entrar a la base de datos'],
  },
  {
    id: 'pg_dump', name: 'pg_dump', cat: 'bases-datos', distro: ['arch', 'debian'], important: true,
    summary: 'Volcados lógicos de PostgreSQL: plano, custom, solo esquema o solo datos.',
    breakdown: [
      { token: '-Fc', meaning: 'formato custom comprimido (restaura selectivo/paralelo con pg_restore)' },
      { token: '-Fp', meaning: 'plano SQL legible (defecto; se restaura con psql -f)' },
      { token: '-f archivo', meaning: 'destino (sin -f vuelca a stdout)' },
      { token: '--schema-only / -a', meaning: 'solo estructura / solo datos' },
      { token: '-t tabla', meaning: 'solo esa tabla (repetible)' },
    ],
    examples: [
      { desc: 'custom diario con fecha', lines: ['pg_dump -Fc tienda -f tienda-$(date +%F).dump'] },
      { desc: 'plano para migrar legible', lines: ['pg_dump tienda > tienda.sql'] },
      { desc: 'solo esquema de dos tablas', lines: ['pg_dump --schema-only -t pedidos -t clientes tienda > esquema.sql'] },
    ],
    errors: [{ symptom: 'pg_dump: server version mismatch.', cause: 'Cliente más viejo que el servidor.', fix: 'Vuelca con el pg_dump DE LA VERSIÓN del servidor (o actualiza el cliente).' }],
    related: ['pg_restore', 'psql'],
    intents: ['backup postgres', 'volcar base de datos', 'pg_dump custom'],
  },
  {
    id: 'pg_restore', name: 'pg_restore', cat: 'bases-datos', distro: ['arch', 'debian'],
    summary: 'Restaura volcados custom/directory (para .sql usa psql -f).',
    breakdown: [
      { token: '-d base', meaning: 'BD destino (créala antes si no existe)' },
      { token: '-j 4', meaning: '4 trabajos en paralelo (solo custom/directory)' },
      { token: '-c / --clean', meaning: 'DROP antes de crear (limpia restos)' },
      { token: '--if-exists', meaning: 'con -c, no falla si no existía' },
      { token: '-l / -L lista', meaning: 'lista contenido / restaura solo lo listado' },
    ],
    examples: [
      { desc: 'restaurar a BD de prueba', lines: ['createdb tienda_test', 'pg_restore -d tienda_test tienda.dump'] },
      { desc: 'rápido y limpio', lines: ['pg_restore -j4 -c --if-exists -d tienda tienda.dump'] },
      { desc: 'ver qué trae dentro', lines: ['pg_restore -l tienda.dump | head -20'] },
    ],
    errors: [{ symptom: 'already exists (cientos de avisos).', fix: 'Normal sin -c: ignóralos o reintenta con -c --if-exists sobre BD vacía.' }],
    related: ['pg_dump', 'psql'],
    intents: ['restaurar backup postgres', 'pg_restore paralelo'],
  },
  {
    id: 'createdb', name: 'createdb/dropdb', cat: 'bases-datos', distro: ['arch', 'debian'],
    summary: 'Crear y borrar bases (y roles con createuser) sin entrar a psql.',
    breakdown: [
      { token: 'createdb nombre', meaning: 'crea BD (dueño: tu rol)' },
      { token: '-O dueño', meaning: 'dueño distinto al que ejecuta' },
      { token: '-T plantilla', meaning: 'clona desde esa BD en vez de template1' },
      { token: 'dropdb / dropuser', meaning: 'borra BD / rol (irreversible)' },
    ],
    examples: [
      { lines: ['createdb tienda', 'createdb -O tienda_app tienda', 'createuser -P app_lectura'] },
      { desc: 'clonar para probar migraciones', lines: ['createdb -T tienda tienda_test'] },
    ],
    errors: [{ symptom: 'database "tienda" already exists.', fix: 'Elige otro nombre o dropdb primero (con backup si importa).' }],
    related: ['psql'],
    intents: ['crear base de datos postgres', 'borrar base de datos', 'crear usuario postgres'],
  },
  {
    id: 'pg_isready', name: 'pg_isready', cat: 'bases-datos', distro: ['arch', 'debian'],
    summary: '¿Acepta conexiones este PostgreSQL? Chequeo de 1 segundo para scripts y systemd.',
    breakdown: [
      { token: '-h host -p puerto', meaning: 'dónde preguntar (defecto: socket local, 5432)' },
      { token: '-q', meaning: 'silencioso: solo exit code (0 = ok)' },
      { token: '-t segundos', meaning: 'timeout de espera' },
    ],
    examples: [
      { lines: ['pg_isready', 'pg_isready -h localhost -q && echo "arriba"'] },
    ],
    whatHappens: 'Hace el handshake mínimo sin autenticar del todo: distingue «caído» de «credenciales mal».',
    related: ['systemctl', 'ss'],
    intents: ['postgres responde', 'comprobar postgresql arriba', 'healthcheck postgres'],
  },
  {
    id: 'mariadb', name: 'mariadb', cat: 'bases-datos', distro: ['arch', 'debian'], important: true,
    summary: 'Cliente de MariaDB/MySQL (mysql sigue como symlink). Consultar y administrar.',
    breakdown: [
      { token: '-u usuario -p', meaning: 'usuario + pide password (pegado: -pmiclave, evita historial)' },
      { token: '-h host -P puerto', meaning: 'remoto (defecto: socket local, 3306)' },
      { token: '-e "SQL"', meaning: 'una sentencia y salir (scripts)' },
      { token: '-D base', meaning: 'base inicial' },
    ],
    examples: [
      { desc: 'local como root (unix_socket)', lines: ['sudo mariadb'] },
      { desc: 'una consulta sin entrar', lines: ['mariadb -u tienda_app -p -e "SELECT count(*) FROM tienda.pedidos;"'] },
      { desc: 'restaurar volcado', lines: ['mariadb tienda_restaurada < tienda.sql'] },
    ],
    errors: [
      { symptom: "Access denied for user 'x'@'y'.", fix: 'Usuario, host o password mal —o ese usuario@host no existe—. Revisa SELECT user,host FROM mysql.user.' },
      { symptom: "Can't connect through socket.", fix: 'Servicio parado (systemctl status mariadb) o socket en otra ruta.' },
    ],
    related: ['mariadb-dump', 'mysqladmin'],
    intents: ['conectar mariadb', 'cliente mysql', 'ejecutar sql mariadb'],
  },
  {
    id: 'mariadb-dump', name: 'mariadb-dump', cat: 'bases-datos', distro: ['arch', 'debian'], important: true,
    summary: 'Volcados lógicos (mysqldump sigue como symlink): consistentes con --single-transaction.',
    breakdown: [
      { token: '--single-transaction', meaning: 'foto coherente InnoDB sin bloquear escrituras' },
      { token: '--routines --events', meaning: 'incluye procedimientos y eventos (¡no van por defecto!)' },
      { token: '--all-databases', meaning: 'todo el servidor (incluye mysql.* con usuarios)' },
      { token: '--no-data', meaning: 'solo esquema' },
    ],
    examples: [
      { desc: 'volcado completo de una BD', lines: ['mariadb-dump --single-transaction --routines --events tienda > tienda-$(date +%F).sql'] },
      { desc: 'todo el servidor', lines: ['mariadb-dump --single-transaction --routines --events --all-databases > full.sql'] },
    ],
    errors: [{ symptom: 'Tablas que cambian a mitad del volcado.', cause: 'Sin --single-transaction (o con MyISAM, que no transacciona).', fix: 'Usa el flag; para MyISAM asume bloqueo con --lock-tables.' }],
    related: ['mariadb', 'mysqladmin'],
    intents: ['backup mariadb', 'volcar mysql', 'mysqldump consistente'],
  },
  {
    id: 'mysqladmin', name: 'mysqladmin', cat: 'bases-datos', distro: ['arch', 'debian'],
    summary: 'Utilidades rápidas del servidor: ping, estado, crear/borrar BD, recargar.',
    breakdown: [
      { token: 'ping', meaning: '¿vive? (exit 0 = sí)' },
      { token: 'status', meaning: 'uptime, hilos, queries/s de un vistazo' },
      { token: 'create/drop nombre', meaning: 'crear/borrar BD sin entrar' },
      { token: 'flush-logs / flush-privileges', meaning: 'rota logs / recarga grants tras editar mysql.* a mano' },
    ],
    examples: [
      { lines: ['mysqladmin ping', 'mysqladmin status'] },
      { desc: 'crear BD de un plumazo', lines: ['mysqladmin create tienda_test'] },
    ],
    related: ['mariadb', 'systemctl'],
    intents: ['estado mariadb', 'ping mysql', 'crear base de datos rápido'],
  },
  {
    id: 'mariadb-check', name: 'mariadb-check', cat: 'bases-datos', distro: ['arch', 'debian'],
    summary: 'Chequeo, reparación y optimización de tablas (mysqlcheck es el symlink clásico).',
    breakdown: [
      { token: '--all-databases', meaning: 'todas las BD de una pasada' },
      { token: '--auto-repair', meaning: 'chequea y repara lo marcado como corrupto' },
      { token: '--optimize', meaning: 'reorganiza (ANALYZE+OPTIMIZE según motor)' },
    ],
    examples: [
      { lines: ['mariadb-check --all-databases', 'mariadb-check --auto-repair tienda'] },
    ],
    errors: [{ symptom: 'note: Table does not support optimize.', fix: 'Normal en InnoDB moderno (lo hace online solo): ignóralo salvo lentitud real.' }],
    intents: ['reparar tablas mysql', 'chequear base de datos corrupta', 'optimizar tablas'],
  },
]
