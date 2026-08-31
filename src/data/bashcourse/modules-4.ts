import type { BashLesson } from './types'

export const MODULES_4: BashLesson[] = [
  /* ============================ 14 PROCESAMIENTO DE TEXTO ============================ */
  {
    id: 'procesamiento-texto',
    num: '14',
    title: 'Procesamiento de texto',
    level: 'intermediate',
    minutes: 20,
    goals: [
      'Conocer las herramientas básicas de texto y su rol',
      'Elegir la herramienta correcta para cada tarea',
    ],
    simple: [
      'UNIX trata casi todo como texto, así que existen herramientas pequeñas y perfectas para cortar (cut), ordenar (sort), quitar repetidos (uniq), contar (wc), recortar por extremos (head/tail) y traducir caracteres (tr).',
      'La gracia está en COMBINARLAS con pipes: cada una hace UNA cosa bien.',
    ],
    technical: [
      'cut corta por delimitador (-d -f) o columnas (-c); sort ordena con claves (-k N), numérico (-n), reverso (-r) y único (-u); uniq SOLO colapsa consecutivos (por eso sort | uniq); tr trabaja carácter a carácter SIN archivos (solo stdin); head/tail aceptan -n K y tail -f sigue en vivo; xargs convierte stdin en ARGUMENTOS (no en stdin) del comando siguiente.',
    ],
    keyCommands: [
      { name: 'cut', syntax: 'cut -dDELIM -fN [archivo]', what: 'Extrae campos/columnas.', exit: '0; ≠0 si falta delimitador en línea (con -s se salta)' },
      { name: 'sort', syntax: 'sort [-nru] [-k N] [archivo]', what: 'Ordena líneas.', exit: '0' },
      { name: 'uniq', syntax: 'uniq [-c] [entrada]', what: 'Colapsa duplicados CONSECUTIVOS.', exit: '0' },
      { name: 'tr', syntax: 'tr SET1 SET2 < entrada', what: 'Traduce/borra caracteres.', exit: '0' },
      { name: 'xargs', syntax: '… | xargs comando', what: 'stdin → argumentos.', exit: 'el del comando final' },
    ],
    examples: [
      { caption: 'usuarios del sistema (cut)', lines: ['cut -d: -f1 /etc/passwd'] },
      { caption: 'top 5 shells más usadas (sort+uniq+sort+head)', lines: ['cut -d: -f7 /etc/passwd | sort | uniq -c | sort -rn | head -5'] },
      { caption: 'tr + xargs', lines: ['echo "hola-mundo-en-bash" | tr "-" " " | tr "[:lower:]" "[:upper:]"', 'cat lista-archivos.txt | xargs -I{} echo "procesando {}"'] },
    ],
    exercises: [
      {
        id: 'b14e1', kind: 'choice',
        question: '¿Por qué sort ANTES de uniq?',
        options: [
          { text: 'Porque uniq no funciona sin pipe', why: 'uniq acepta archivo directo; el requisito es OTRO.' },
          { text: 'uniq solo colapsa REPETIDOS CONSECUTIVOS: sort los agrupa', why: 'Exacto: a,b,a → uniq deja a,b,a; tras sort: a,a,b → a,b. Es LA pareja clásica.' },
          { text: 'Por rendimiento de grep', why: 'grep no interviene aquí.' },
          { text: 'No hace falta nunca', why: 'Sin sort pierdes deduplicación global.' },
        ],
        answer: 1,
        solutionLines: ['printf "b\\na\\nb\\n" | uniq', 'printf "b\\na\\nb\\n" | sort | uniq'],
        explanation: 'Ejecuta ambas y verás la diferencia en vivo.',
      },
      {
        id: 'b14e2', kind: 'write',
        question: 'De /etc/passwd extrae solo las rutas de shell (campo 7) sin repetir ninguna:',
        accept: ['cut -d: -f7 /etc/passwd | sort -u', 'cut -d: -f7 /etc/passwd|sort|uniq'],
        placeholder: '$ cut … | …',
        solutionLines: ['cut -d: -f7 /etc/passwd | sort -u'],
        explanation: 'sort -u = sort|uniq comprimido. El delimitador : define los campos.',
      },
    ],
    summary: [
      'cut campos · sort ordena (-n -r -u -k) · uniq consecutivos (-c cuenta).',
      'tr solo stdin · head/tail ventanas · xargs stdin→argumentos.',
      'Combínalas antes de llegar a sed/awk: muchas veces basta.',
    ],
  },

  /* ====================================== 15 GREP ====================================== */
  {
    id: 'grep',
    num: '15',
    title: 'grep a fondo',
    level: 'intermediate',
    minutes: 25,
    goals: [
      'Filtrar texto por patrones con soltura',
      'Dominar los flags esenciales (-i -v -n -r -l -c -w -o -E -F)',
      'Entender qué es un patrón regex básico',
    ],
    simple: [
      'grep BUSCA líneas que contengan un patrón y las imprime: grep "ERROR" app.log muestra solo las líneas con ERROR. Es EL filtro universal de la terminal.',
      'Los flags cambian CÓMO busca: -i ignora mayúsculas, -v invierte, -n numera, -r baja por carpetas, -l lista nombres de archivo, -c cuenta, -o imprime solo lo que coincide.',
    ],
    technical: [
      'Patrones son expresiones regulares BRE por defecto: punto, estrella, anclas y corchetes ya funcionan; el más, el interrogante y la barra vertical requieren -E (ERE) o backslash delante. -F trata el patrón como TEXTO LITERAL (rápido, cero regex): ideal para buscar cadenas fijas. Exit status semántico: 0 encontró, 1 no encontró, 2 error — por eso grep -q alimenta if/&& perfectamente.',
    ],
    keyCommands: [
      { name: 'grep', syntax: 'grep [flags] PATRÓN [archivo...]', what: 'Filtra líneas que coinciden con el patrón.', exit: '0 si hubo match · 1 si ninguno · 2 error' },
    ],
    examples: [
      { caption: 'empezar simple', lines: ['grep "ERROR" aplicacion.log'] },
      { caption: 'los flags que usarás a diario', lines: ['grep -i error aplicacion.log', '# ignora mayúsculas', 'grep -v DEBUG aplicacion.log', '# TODO menos DEBUG', 'grep -n "ERROR" aplicacion.log', '# con número de línea', 'grep -c WARNING aplicacion.log', '# cuántas coinciden'] },
      { caption: 'buscar dentro de carpetas', lines: ['grep -R "password" /etc 2>/dev/null', '# recursivo mostrando archivo:línea', 'grep -rl "TODO" ~/proyecto/', '# solo nombres de archivo afectados', 'grep -L "licencia" *.md', '# archivos que NO la contienen'] },
      { caption: 'regex extendida y palabras completas', lines: ['grep -E "error|warning|fatal" aplicacion.log', '# cualquiera de las tres', 'grep -w "root" /etc/passwd', '# palabra exacta root (no roots)', 'grep -o "[0-9]\\{3\\}" texto.txt | head', '# solo los números hallados'] },
      { caption: '-F literal y -q silencioso', lines: ['grep -F "precio: $5" precios.txt', '# el $ NO es ancla: literal', 'if grep -q "^PermitRootLogin" /etc/ssh/sshd_config; then echo "directiva presente"; fi'] },
    ],
    breakdowns: [
      { caption: 'grep -inE "fail(ed)?|error" app.log', tokens: [
        { token: '-i', meaning: 'case-insensitive' },
        { token: '-n', meaning: 'prefija número de línea' },
        { token: '-E', meaning: 'regex extendida: habilita ( ) ? |' },
        { token: 'fail(ed)?', meaning: '"fail" seguido OPCIONALMENTE de "ed"' },
        { token: '|', meaning: 'alternancia: esto O aquello' },
        { token: 'app.log', meaning: 'archivo(s) objetivo' },
      ] },
    ],
    sim: {
      intro: 'grep SÍ está simulado sobre estos ficheros. Prueba flags reales.',
      files: {
        '/home/usuario/app.log': [
          '2026-01-01 09:00 INFO arranque del sistema',
          '2026-01-01 09:05 warning memoria al 70%',
          '2026-01-01 09:10 ERROR conexión perdida',
          '2026-01-01 09:12 info reconectado',
          '2026-01-01 09:30 ERROR timeout en api',
          '2026-01-01 10:00 WARNING disco lleno',
        ].join('\n'),
      },
      tasks: ['grep ERROR app.log', 'grep -i error app.log', 'grep -vn info app.log', 'grep -c ERROR app.log', 'grep -E "ERROR|WARNING" app.log'],
    },
    exercises: [
      {
        id: 'b15e1', kind: 'write',
        question: 'Muestra TODAS las líneas EXCEPTO las vacías de notas.txt (una línea, usa -v):',
        accept: ['grep -v "^$" notas.txt'],
        solutionLines: ['grep -v "^$" notas.txt'],
        explanation: '^$ = línea vacía (inicio inmediatamente seguido de fin). -v la excluye. Combinación diaria para limpiar salidas.',
      },
      {
        id: 'b15e2', kind: 'write',
        question: 'Cuenta cuántas veces aparece «todo» sin importar mayúsculas en tareas.md (solo el número):',
        accept: ['grep -ci "todo" tareas.md', 'grep -ic todo tareas.md'],
        solutionLines: ['grep -ci "todo" tareas.md'],
        explanation: '-c sustituye las líneas por su conteo; -i iguala mayúsculas/minúsculas. Nota: cuenta LÍNEAS con match, no ocurrencias totales (para eso: grep -oi | wc -l).',
      },
      {
        id: 'b15e3', kind: 'predict',
        question: 'echo "rojo verde azul" | grep -o "e[rs]" — ¿salida?',
        options: [
          { text: 'verde azul', why: '-o no filtra líneas: extrae fragmentos.' },
          { text: 'Dos líneas: er y es', why: '-o imprime CADA coincidencia en su propia línea: e+r de «verde», e+s de «azul».' },
          { text: 'Nada', why: 'Hay dos matches claros.' },
          { text: 'rojo', why: '«rojo» no contiene e[rs].' },
        ],
        answer: 1,
        solutionLines: ['echo "rojo verde azul" | grep -o "e[rs]"'],
        explanation: '-o convierte grep en extractor de fragmentos: base para contar tokens con | wc -l.',
      },
    ],
    challenge: {
      text: 'Sobre app.log simulada arriba: (1) líneas ERROR numeradas, (2) cuántos warnings hay sin distinguir mayúsculas, (3) archivos de tu home que mencionan bash buscando recursivamente la palabra completa.',
      hints: ['-n para numerar', '-ci para contar insensible', '-rw para palabra completa recursivo'],
      solutionLines: ['grep -n "ERROR" app.log', 'grep -ci "warning" app.log', 'grep -rlw bash ~ 2>/dev/null | head'],
    },
    summary: [
      'grep PATRÓN fichero: filtrar es su única misión (y la hace perfecto).',
      '-i -v -n -c -l -L -w -o -q cubren el 95% del uso real.',
      '-E activa regex moderna; -F literal; exit codes semánticos para if.',
    ],
  },

  /* ======================================= 16 SED ======================================= */
  {
    id: 'sed',
    num: '16',
    title: 'sed a fondo',
    level: 'intermediate',
    minutes: 28,
    goals: [
      'Entender sed como editor de FLUJO línea a línea',
      'Sustituir con s/// incluyendo flags g, p, i',
      'Borrar/seleccionar líneas y editar archivos IN PLACE con seguridad',
    ],
    simple: [
      'sed = Stream EDitor: lee el texto línea a línea, aplica comandos de edición y escribe el resultado. Su estrella: sustituir s/viejo/nuevo/.',
      'sed \'s/hola/adiós/\' archivo.txt NO toca el archivo: imprime el resultado modificado en pantalla. Para modificar DE VERDAD existe -i — y ahí empieza el peligro (sin backup, sin deshacer).',
    ],
    technical: [
      'Ciclo: lee línea al pattern space → ejecuta scripts separados por ; o -e → imprime (salvo -n) → repite. s/pat/repl/flags: g todas las ocurrencias (si no, solo la primera por línea); p con -n imprime matches; I case-insensitive (GNU). Direcciones: 5p línea 5; 5,10d borra rango; /regex/d borra matching. GNU -i[backup] crea copia de seguridad opcional (-i.bak). Delimitadores alternativos: s|ruta|otra|ruta evita escapar /.',
    ],
    keyCommands: [
      { name: 'sed', syntax: "sed [opts] 'comandos' [archivo]", what: 'Transforma texto en flujo.', exit: '0; ≠0 con script/dirección inválida' },
    ],
    examples: [
      { caption: 'primera sustitución (solo salida)', lines: ["echo 'hola mundo hola' | sed 's/hola/adiós/'", "# solo la PRIMERA ocurrencia de la línea"] },
      { caption: 'g = global por línea', lines: ["echo 'hola mundo hola' | sed 's/hola/adiós/g'"] },
      { caption: 'seleccionar líneas', lines: ['sed -n \'5p\' notas.txt', '# exactamente la línea 5', 'sed -n \'5,10p\' notas.txt', '# rango 5..10', 'sed -n \'$p\' notas.txt', '# última ($ = fin)'] },
      { caption: 'borrar líneas', lines: ['sed \'/^#/d\' config.conf', '# elimina comentarios', 'sed \'/^$/d\' config.conf', '# elimina vacías'] },
      { caption: 'editar EN EL ARCHIVO — con red de seguridad', lines: ["cp config.conf config.conf.bak", "sed -i 's/modo=debug/modo=prod/' config.conf", "# variante GNU con backup automático:", "sed -i.bak 's/foo/bar/g' archivo.txt"] },
      { caption: 'delimitadores alternativos', lines: ["sed 's|/usr/local|/opt|g' rutas.txt", "# | evita escapar cada /"] },
    ],
    breakdowns: [
      { caption: "sed 's/hola/adiós/g' archivo.txt", tokens: [
        { token: 'sed', meaning: 'stream editor' },
        { token: 's', meaning: 'comando substitute' },
        { token: '/hola/', meaning: 'patrón buscado (regex BRE)' },
        { token: '/adiós/', meaning: 'reemplazo (& reutiliza el match)' },
        { token: '/g', meaning: 'flag global: todas las apariciones de CADA línea' },
        { token: 'archivo.txt', meaning: 'entrada; sin él, sed lee stdin' },
      ] },
      { caption: 'sed -i.bak …', tokens: [
        { token: '-i', meaning: 'IN PLACE: reescribe el archivo real' },
        { token: '.bak', meaning: 'sufijo de backup automático ANTES de tocar nada' },
        { token: 'riesgo', meaning: 'sin backup ni control de versiones: un patrón mal escapado daña datos' },
      ] },
    ],
    sim: {
      intro: 'sed NO está simulado: estos bloques son para TU terminal real. Copia y practica con un archivo desechable:',
      tasks: ["printf 'hola\\nhola hola\\nchau\\n' > prueba.txt", "cat prueba.txt && sed 's/hola/hey/' prueba.txt", "sed 's/hola/hey/g' prueba.txt", "sed -i.bak 's/hola/hey/g' prueba.txt && diff prueba.txt{.bak,}"],
    },
    exercises: [
      {
        id: 'b16e1', kind: 'write',
        question: 'Imprime ÚNICAMENTE las líneas 3 a 6 de datos.txt (usa -n y p):',
        accept: ['sed -n "3,6p" datos.txt', "sed -n '3,6p' datos.txt"],
        solutionLines: ["sed -n '3,6p' datos.txt"],
        explanation: '-n silencia el auto-print; p explícito imprime SOLO lo seleccionado. Es el head/tail quirúrgico por rango arbitrario.',
      },
      {
        id: 'b16e2', kind: 'write',
        question: 'En config.ini cambia puerto=8080 por puerto=9090 MODIFICANDO el archivo con backup .orig:',
        accept: ["sed -i.orig 's/puerto=8080/puerto=9090/' config.ini"],
        solutionLines: ["sed -i.orig 's/puerto=8080/puerto=9090/' config.ini"],
        explanation: '-i.sufijo es tu seguro de vida: si el patrón estaba mal, restauras con mv config.ini.orig config.ini. Sin sufijo NO hay vuelta atrás.',
      },
      {
        id: 'b16e3', kind: 'choice',
        question: "sed 's/error/éxito/' registro.log — ¿qué pasa con registro.log?",
        options: [
          { text: 'Se modifica en disco', why: 'Solo con -i. Sin él, sed es un LECTOR transformador.' },
          { text: 'Nada: la versión modificada sale por stdout y el archivo queda intacto', why: 'Correcto: flujo vs disco. Esta distinción evita el 100% de los sustos con sed.' },
          { text: 'Se borra', why: 'Jamás: d borrará líneas de la SALIDA, nunca del archivo sin -i.' },
          { text: 'Depende de permisos', why: 'Sin -i no hay escritura: permisos irrelevantes.' },
        ],
        answer: 1,
        solutionLines: ["printf 'un error\\n' > reg.log", "sed 's/error/ok/' reg.log", 'cat reg.log'],
        explanation: 'Verifícalo con cat después: intacto. Recién -i escribe.',
      },
    ],
    challenge: {
      text: 'Sobre accesos.log (créalo con tres IPs repetidas): elimina duplicados EXACTOS consecutivos, luego transforma la IP inicial 10.0.0.1 a 10.0.0.9 GLOBalmente, y por último guarda el resultado en limpio.log sin tocar el original.',
      hints: ['uniq resuelve duplicados consecutivos sin sed', 's|vieja|nueva|g con delimitador alternativo', '> limpio.log dirige la salida'],
      solutionLines: ['printf "10.0.0.1\\n10.0.0.1\\n10.0.0.2\\n" > accesos.log', 'uniq accesos.log | sed "s/10\\.0\\.0\\.1/10.0.0.9/g" > limpio.log', 'cat limpio.log'],
    },
    summary: [
      'sed edita FLUJO: sin -i jamás toca disco.',
      's/// con g p I; direcciones 5p 5,10p $p /pat/d; -n silencio selectivo.',
      '-i es irreversible → SIEMPRE -i.bak o git clean antes.',
    ],
  },

  /* ======================================= 17 AWK ======================================= */
  {
    id: 'awk',
    num: '17',
    title: 'awk a fondo',
    level: 'expert',
    minutes: 30,
    goals: [
      'Entender awk como procesador REGISTRO→CAMPOS',
      'Seleccionar, calcular y formatear columnas',
      'Usar BEGIN/END, variables y condiciones reales',
    ],
    simple: [
      'awk lee el texto como TABLA: cada línea es un registro y cada palabra un campo. $1 primera columna, $2 segunda… $0 toda la línea. awk \'{print $1}\' archivo imprime la primera columna.',
      'Puedes FILTRAR antes de imprimir (awk \'$3 > 80 {print $1}\'), calcular sumas, y ejecutar algo al inicio (BEGIN) o final (END). Es la navaja suiza cuando los datos tienen estructura.',
    ],
    technical: [
      'Programa awk = patrón { acción }. Separadores: FS campo-entrada (-F: o -v FS=…), OFS salida. NR=nº registro global, NF=campos de esta línea. Variables persisten entre líneas (acumuladores); arrays asociativos incluidos; printf estilo C. Comparaciones numéricas si ambos lados son numéricos. -F: define ":"; múltiples archivos reinician FNR pero NR sigue global.',
    ],
    keyCommands: [
      { name: 'awk', syntax: "awk [-F sep] 'programa' [archivos]", what: 'Procesa registros/campos con lenguaje propio.', exit: '0; ≠0 por error de sintaxis del programa' },
    ],
    examples: [
      { caption: 'columnas esenciales', lines: ["awk '{print $1}' notas.txt", "awk '{print $1, $3}' notas.txt", "awk -F: '{print $1}' /etc/passwd"] },
      { caption: 'filtrar por condición', lines: ["awk '$3 >= 80 {print $1 \" aprueba\"}' notas.txt", "awk 'NF == 0 {vacías++} END {print \"vacías:\", vacías+0}' notas.txt"] },
      { caption: 'BEGIN/END y acumuladores', lines: ["awk 'BEGIN {print \"== informe ==\"} {total += $3} END {print \"media:\", total/NR}' notas.txt"] },
      { caption: 'formateo y utilidad diaria', lines: ["ps aux | awk 'NR>1 {cpu+=$3} END {printf \"CPU total: %.1f%%\\n\", cpu}'", "df -h / | awk 'NR==2 {print \"usado:\", $3\" de \"$2}'"] },
    ],
    breakdowns: [
      { caption: "awk '$3 > 80 {print $1}' notas.txt", tokens: [
        { token: '$3 > 80', meaning: 'PATRÓN: solo procesa líneas cuyo 3er campo supera 80 (comparación numérica)' },
        { token: '{print $1}', meaning: 'ACCIÓN: imprime primer campo de esas líneas' },
        { token: '$0', meaning: '(referencia) línea completa; $NF último campo' },
        { token: 'notas.txt', meaning: 'entrada; sin ella, stdin' },
      ] },
      { caption: "awk -F: '{print NR, $1}' /etc/passwd", tokens: [
        { token: '-F:', meaning: 'separador de CAMPOS = : (passwd es CSV de dos puntos)' },
        { token: 'NR', meaning: 'contador global de registros: numera la salida' },
        { token: '$1', meaning: 'usuario (primer campo)' },
      ] },
    ],
    sim: {
      intro: 'awk tampoco está simulado. Dataset sugerido para tu terminal real (cópialo):',
      tasks: ["printf 'ana 90\\nbob 45\\ncarol 78\\ndan 91\\n' > notas.txt", "awk '{print $1}' notas.txt", "awk '$2 >= 78 {print $1}' notas.txt", "awk '{s+=$2} END {print \"media\", s/NR}' notas.txt"],
    },
    exercises: [
      {
        id: 'b17e1', kind: 'write',
        question: 'Lista usuarios y sus shells (campos 1 y 7) de /etc/passwd separados por espacio:',
        accept: ["awk -F: '{print $1, $7}' /etc/passwd", "awk -F ':' '{print $1, $7}' /etc/passwd"],
        placeholder: "$ awk -F? '…' /etc/passwd",
        solutionLines: ["awk -F: '{print $1, $7}' /etc/passwd"],
        explanation: '-F: cambia FS; la coma DENTRO de print inserta OFS (espacio default). Sin coma concatenaría pegado.',
      },
      {
        id: 'b17e2', kind: 'predict',
        question: "awk '/ERROR/ {count++} END {print count+0}' app.log con 2 líneas ERROR y 3 INFO — ¿imprime?",
        context: 'app.log contiene 5 líneas: 2 con ERROR, 3 con INFO',
        options: [
          { text: '5', why: 'El patrón /ERROR/ filtra: INFO no entra a la acción.' },
          { text: '2', why: 'count se incrementa solo en líneas ERROR; print count+0 al final reporta 2 (+0 evita «» si fuese 0).' },
          { text: '0', why: 'Sería cierto solo sin errores.' },
          { text: 'Error de sintaxis', why: 'count++ y END son awk puro y corriente.' },
        ],
        answer: 1,
        solutionLines: ["printf 'INFO ok\\nERROR x\\nINFO ok\\nERROR y\\nINFO z\\n' > app.log", "awk '/ERROR/ {count++} END {print count+0}' app.log"],
        explanation: 'El trío patrón-acción + acumulador + END es el 80% del awk cotidiano.',
      },
      {
        id: 'b17e3', kind: 'write',
        question: 'Suma la columna 2 de notas.txt e imprime el TOTAL (palabra + valor) usando END:',
        accept: ['awk "{t+=\$2} end {print \"total\", t}" notas.txt'.toLowerCase(), "awk '{t+=$2} END {print \"total\", t}' notas.txt"],
        placeholder: "$ awk '…' notas.txt",
        solutionLines: ["awk '{t+=$2} END {print \"TOTAL:\", t}' notas.txt"],
        explanation: 'Las variables awk nacen vacías (=0 en aritmética). END corre una vez tras la última línea: sitio natural de los informes.',
      },
    ],
    challenge: {
      text: 'Sobre ps aux: calcula %CPU total consumido excluyendo la cabecera, y el proceso MÁS pesado (nombre + %CPU) usando awk con condición NR>1 y comparaciones $3>max → max=$3; nombre=$11.',
      hints: ['NR>1 salta la cabecera de ps', 'dos acciones: acumular y comparar máximo', 'END imprime ambos resultados'],
      solutionLines: ["ps aux | awk 'NR>1 {cpu+=$3; if ($3>max) {max=$3; nombre=$11}} END {printf \"CPU total: %.1f%%\\nTop: %s (%.1f%%)\\n\", cpu, nombre, max}'"],
    },
    summary: [
      'awk = registros→campos: $1…$NF, $0 completo, -F separa.',
      'patrón{acción}: filtra y actúa; NR/NF/FS/OFS orientan.',
      'BEGIN/END + variables persistentes = mini-informes SQL-like en una línea.',
    ],
  },
]
