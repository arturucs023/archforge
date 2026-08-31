import type { BashLesson } from './types'

export const MODULES_5: BashLesson[] = [
  /* ======================= 18 PIPES Y COMPOSICIÓN DE COMANDOS ======================= */
  {
    id: 'pipes',
    num: '18',
    title: 'Pipes y composición',
    level: 'intermediate',
    minutes: 20,
    goals: [
      'Leer pipelines largos etapa por etapa',
      'Construir los tuyos conectando herramientas pequeñas',
      'Reconocer cuándo un pipe sobra (alternativa directa)',
    ],
    simple: [
      'El pipe | toma la SALIDA de un comando y la mete como ENTRADA del siguiente. Cada etapa transforma el texto un poco más: cat archivo | grep ERROR | sort | uniq es una cadena de montaje de datos.',
      'Para leer uno: mira qué recibe cada comando (su stdin) y qué entrega (su stdout). El resultado final es lo que imprime la ÚLTIMA etapa.',
    ],
    technical: [
      'pipe(2) crea un buffer kernel; Bash clona fds: escritor→write-end, lector→read-end. Procesos corren CONCURRENTES; si el lector muere, el escritor recibe SIGPIPE (típico: … | head). $? = última etapa; set -o pipefail propaga fallos intermedios. tee bifurca a pantalla+archivo a mitad de cadena. Anti-patrón: cat fichero | grep X → grep X fichero (UUOC); y grep ya lee archivos: pipes decorativos cuestan procesos.',
    ],
    examples: [
      { caption: 'cadena clásica comentada', lines: ['cat accesos.log \\', '  | grep "ERROR" \\', '  | cut -d" " -f1 \\', '  | sort \\', '  | uniq -c'] },
      { caption: 'equivalente sin cat (mejor)', lines: ['grep "ERROR" accesos.log | cut -d" " -f1 | sort | uniq -c'] },
      { caption: 'tee: ver Y guardar', lines: ['make build 2>&1 | tee build.log | tail -20'] },
    ],
    breakdowns: [
      { caption: 'grep ERROR app.log | sort | uniq -c', tokens: [
        { token: 'grep ERROR app.log', meaning: 'filtra líneas con ERROR (lee ARCHIVO directamente)' },
        { token: '|', meaning: 'stdout de la izquierda → stdin de la derecha' },
        { token: 'sort', meaning: 'recibe líneas filtradas por stdin y las ordena' },
        { token: 'uniq -c', meaning: 'recibe ordenadas: colapsa repetidos contando (-c)' },
        { token: 'resultado', meaning: 'conteo por tipo de error, descendente si añades | sort -rn al final' },
      ] },
    ],
    exercises: [
      {
        id: 'b18e1', kind: 'choice',
        question: '¿Por qué «grep ERROR fichero» es preferible a «cat fichero | grep ERROR»?',
        options: [
          { text: 'grep no sabe leer archivos', why: 'Al contrario: leer archivos es su modo natural.' },
          { text: 'Evita un proceso extra (cat) sin ganancia alguna — el famoso UUOC', why: 'Menos procesos, menos memoria, mismo resultado. cat solo aporta cuando CONCATENA o necesitas su streaming puro.' },
          { text: 'cat rompe los pipes', why: 'cat funciona perfecto en pipes; la crítica es de economía, no de corrección.' },
          { text: 'grep requiere tty', why: 'Nada más falso: grep vive del pipe en scripts.' },
        ],
        answer: 1,
        solutionLines: ['time (cat app.log | grep ERROR > /dev/null)', 'time (grep ERROR app.log > /dev/null)'],
        explanation: 'En archivos pequeños no se nota; en rotaciones de logs gigantes sí. Hábito profesional desde el día uno.',
      },
      {
        id: 'b18e2', kind: 'predict',
        question: 'printf "b\\na\\na\\nc\\n" | sort | uniq -c — salida exacta (3 líneas, ¿qué orden?):',
        options: [
          { text: 'b a a c en ese orden con contadores', why: 'uniq necesita consecutivos: sin sort no colapsaría nada útil… pero aquí SÍ hay sort antes.' },
          { text: '«2 a» · «1 b» · «1 c» — ordenadas alfabéticamente tras el uniq final', why: 'sort deja a,a,b,c → uniq -c produce 2 a / 1 b / 1 c (ya en orden).' },
          { text: 'Error: uniq exige -u', why: '-c cuenta; -u muestra solo únicos. Son flags distintos.' },
          { text: 'Solo «a»', why: '-c NO elimina líneas: las resume.' },
        ],
        answer: 1,
        solutionLines: ['printf "b\\na\\na\\nc\\n" | sort | uniq -c'],
        explanation: 'Esta tríada (sort|uniq -c|sort -rn) es EL ranking universal de la terminal.',
      },
    ],
    challenge: {
      text: 'Ranking de shells del sistema: de /etc/passwd saca el campo shell (7), cuenta cada una y ordénalas de mayor a menor uso mostrando las 3 primeras — TODO en un pipeline.',
      hints: ['cut -d: -f7 abre la cadena', 'sort|uniq -c cuenta', 'sort -rn ordena números desc; head -3 corta'],
      solutionLines: ['cut -d: -f7 /etc/passwd | sort | uniq -c | sort -rn | head -3'],
    },
    summary: [
      '| conecta stdouts→stdins en paralelo real.',
      'Lee pipelines etapa por etapa: stdin in → transformación → stdout out.',
      'Evita UUOC; tee inspecciona sin romper; pipefail para rigor en scripts.',
    ],
  },

  /* ==================================== 19 PROCESOS ==================================== */
  {
    id: 'procesos-curso',
    num: '19',
    title: 'Procesos',
    level: 'intermediate',
    minutes: 18,
    goals: [
      'Lanzar procesos en foreground/background y recuperarlos',
      'Localizar y terminar procesos por PID o nombre',
      'Entender $! y wait en scripts',
    ],
    simple: [
      'Un programa corriendo es un proceso con su PID. Lo ves con ps/htop, lo lanzas al FONDO terminando con &, lo traes con fg y lo devuelves con bg. jobs lista los tuyos.',
      'kill PID manda señal TERM (pide cierre); kill -9 fuerza. pgrep busca PIDs por nombre; pkill mata directamente por nombre.',
    ],
    technical: [
      '& hace fork manteniendo stdout/stderr al tty (redirige si molesta); $! guarda su PID inmediatamente. wait [pid…] bloquea hasta terminar y devuelve SU exit code: base del paralelismo en scripts. Señales clave: 15 SIGTERM educada, 9 SIGKILL inapelable, 1 SIGHUP recarga, 2 SIGINT Ctrl+C. pkill -f casa la línea completa; cuidado con patrones anchos matando inocentes.',
    ],
    examples: [
      { caption: 'background y control', lines: ['sleep 300 &', 'echo "PID: $!"', 'jobs', 'kill %1 2>/dev/null || true'] },
      { caption: 'buscar y terminar', lines: ['pgrep -a firefox', 'pkill firefox', 'ps aux | grep "[s]shd"', '# truco [s]: excluye al propio grep'] },
      { caption: 'paralelismo mínimo en script', lines: ['# dentro de un script:', 'tarea_lenta & P1=$!', 'otra_tarea & P2=$!', 'wait "$P1"; R1=$?', 'wait "$P2"; R2=$?', '[ "$R1" -eq 0 ] && [ "$R2" -eq 0 ] && echo todo-ok || echo fallo-parcial'] },
    ],
    breakdowns: [
      { caption: 'comando & echo "PID $!"', tokens: [
        { token: '&', meaning: 'lanza en background: el prompt vuelve YA' },
        { token: '$!', meaning: 'PID del último proceso lanzado así' },
        { token: 'jobs/fg/bg', meaning: 'listar · traer a primer plano · reenviar al fondo' },
        { token: 'wait PID', meaning: 'espera su fin y hereda su exit code' },
      ] },
    ],
    exercises: [
      {
        id: 'b19e1', kind: 'write',
        question: 'Termina TODOS los procesos llamados chrome usando el comando directo por nombre:',
        accept: ['pkill chrome'],
        solutionLines: ['pkill chrome'],
        explanation: 'pkill = pgrep+kill. Para forzar: pkill -9 chrome. Con -f casa la línea completa de comandos (útil con argumentos).',
      },
      {
        id: 'b19e2', kind: 'predict',
        question: 'sleep 60 & luego kill -9 $! — ¿con qué código termina el sleep y qué imprime wait "$!" ; echo $? ?',
        options: [
          { text: '0', why: '0 sería cierre normal; KILL no es normal.' },
          { text: '137 (128+9: muerto por señal 9)', why: 'Convención: exit = 128 + número_de_señal. Diagnóstico instantáneo de kills forzosos.' },
          { text: '1', why: '1 es fallo genérico de la propia aplicación.' },
          { text: 'No termina nunca', why: 'KILL es inapelable: el kernel lo recaucha al instante.' },
        ],
        answer: 1,
        solutionLines: ['sleep 60 & P=$!', 'kill -9 "$P" 2>/dev/null', 'wait "$P" 2>/dev/null; echo "exit=$?"'],
        explanation: '128+N te dice QUÉ señal mató: 137=KILL, 143=TERM, 130=INT(Ctrl+C).',
      },
    ],
    challenge: {
      text: 'Lanza dos sleeps (10 y 5 segundos) en background guardando sus PIDs; espera SOLO al corto; imprime cuántos jobs quedan con jobs; luego limpia el largo con kill %.',
      hints: ['$! captura CADA lanzamiento inmediatamente', 'wait acepta un PID concreto', 'jobs muestra estado actual'],
      solutionLines: ['sleep 10 & LARGO=$!', 'sleep 5 & CORTO=$!', 'wait "$CORTO"; echo "corto listo"', 'jobs', 'kill "$LARGO" 2>/dev/null', 'wait 2>/dev/null; echo limpio'],
    },
    summary: [
      '& fondo · $! su PID · fg/bg/jobs control de consola.',
      'pgrep/pkill por nombre; ps aux vista global; kill señales (TERM→KILL).',
      'wait sincroniza paralelismo y hereda exit codes para decidir.',
    ],
  },

  /* ============================ 20 VARIABLES DE ENTORNO ============================ */
  {
    id: 'variables-entorno',
    num: '20',
    title: 'Variables de entorno',
    level: 'beginner',
    minutes: 14,
    goals: [
      'Diferenciar variables de shell vs entorno exportado',
      'Manipular PATH correctamente',
      'Saber dónde se configuran permanentemente',
    ],
    simple: [
      'Las variables EXPORTADAS viajan a los programas que lances: son su configuración (idioma, editor, rutas de búsqueda). Las normales viven solo en tu shell.',
      'Las famosas: PATH (dónde buscar programas), HOME, USER, SHELL, PWD, LANG, EDITOR.',
    ],
    technical: [
      'execve copia environ al hijo: mutaciones posteriores del padre no retropropagan. PATH ordena la búsqueda secuencial; anteponer directorio da prioridad (y riesgo de shadowing). Persistencia: ~/.bash_profile|~/.profile (login), ~/.bashrc (interactivas), /etc/environment global, systemd user con environment.d. printenv VAR consulta SIN abrir subshell.',
    ],
    examples: [
      { caption: 'inspección', lines: ['printenv PATH', 'echo "$HOME — $USER — $SHELL"', 'env | sort | head -10'] },
      { caption: 'PATH: añadir con seguridad', lines: ['# en ~/.bashrc:', 'case ":$PATH:" in *":$HOME/.local/bin:"*) ;; *) export PATH="$HOME/.local/bin:$PATH";; esac'] },
      { caption: 'por-proceso (sin tocar tu entorno)', lines: ['EDITOR=vim crontab -e', 'LANG=C ls --help | head -3'] },
    ],
    exercises: [
      {
        id: 'b20e1', kind: 'choice',
        question: 'VAR=hola ./programa — ¿qué hace exactamente?',
        options: [
          { text: 'Exporta VAR para toda tu sesión', why: 'Solo afecta a ESA ejecución puntual.' },
          { text: 'Inyecta VAR=holo… perdón, hola SOLO en el entorno de ese proceso hijo', why: 'Asignación prefija = entorno efímero del comando: ideal para pruebas sin contaminar.' },
          { text: 'Crea alias', why: 'Alias es otra cosa totalmente distinta.' },
          { text: 'Falla si VAR no existía', why: 'Crear nuevas es perfectamente válido.' },
        ],
        answer: 1,
        solutionLines: ['FOO=prueba env | grep "^FOO="', 'echo "[${FOO:-vacía-en-tu-shell}"]'],
        explanation: 'Patrón diario para credenciales/flags sin ensuciar el entorno global.',
      },
      {
        id: 'b20e2', kind: 'write',
        question: 'Una línea segura (idempotente) para añadir ~/scripts AL FINAL del PATH solo si no está:',
        accept: ['case ":$PATH:" in *":$HOME/scripts:"*) ;; *) export PATH="$PATH:$HOME/scripts";; esac'],
        placeholder: '$ case ":$PATH:" in … esac',
        solutionLines: ['case ":$PATH:" in *":$HOME/scripts:"*) ;; *) export PATH="$PATH:$HOME/scripts";; esac'],
        explanation: 'El truco :$PATH: evita falsos positivos (~/scripts2 matchearía ~/scripts sin los delimitadores). Al FINAL: prioridad baja, respetando binarios del sistema.',
      },
    ],
    challenge: {
      text: 'Demuestra la frontera padre↔hijo: exporta DEMO=padre; lanza bash -c \'DEMO=hijo; echo "en hijo: $DEMO"\'; después imprime $DEMO en TU shell y explica la diferencia.',
      hints: ['cada bash -c es un proceso nuevo con COPIA', 'asignaciones internas no escapan'],
      solutionLines: ['export DEMO=padre', "bash -c 'DEMO=hijo; echo \"hijo ve: $DEMO\"'", 'echo "padre sigue viendo: $DEMO"'],
    },
    summary: [
      'export marca viaje a hijos; asignación prefija = entorno puntual.',
      'PATH decide qué binario corre; prepéndelo con criterio e idempotencia.',
      'Persistencia: bashrc/profile según caso; /etc/environment global.',
    ],
  },

  /* ============================== 21 MANEJO DE ERRORES ============================== */
  {
    id: 'manejo-errores',
    num: '21',
    title: 'Manejo de errores',
    level: 'expert',
    minutes: 22,
    goals: [
      'Comprobar $? conscientemente en cada paso crítico',
      'Aplicar set -euo pipefail sabiendo SUS riesgos',
      'Escribir limpieza garantizada con trap',
    ],
    simple: [
      'Script robusto = comprobar que cada paso crítico funcionó y avisar claro cuando no. Mínimo: if comando; then ok else error+exit.',
      'set -e aborta ante cualquier error; set -u falla con variables indefinidas; set -o pipefail hace que un pipe falle si falla CUALQUIER etapa. Juntos son el modo estricto — con matices.',
    ],
    technical: [
      '-e EXCEPCIONES documentadas: comandos en if/while, parte izquierda de && ||, negados !, y funciones llamadas en contexto condicional — fuente nº1 de bugs sutiles. -u convierte ${UNDEF} en error (usa ${VAR:-def} donde el vacío sea legítimo). pipefail: exit del pipe = último ≠0. trap \'cleanup\' EXIT INT TERM garantiza rm temporales/reinicio servicios incluso con Ctrl+C.',
    ],
    examples: [
      { caption: 'modo estricto estándar (cabecera de script serio)', lines: ['#!/usr/bin/env bash', 'set -euo pipefail', '', 'DESTINO="${1:?falta DESTINO}"', '', 'tmp=$(mktemp -d)', "trap 'rm -rf \"$tmp\"' EXIT", '', 'cp datos.txt "$tmp/"', 'echo "procesado en $tmp"'] },
      { caption: 'cuándo -e NO dispara (sorpresas oficiales)', lines: ['# dentro de set -e:', 'if false; then echo nunca; fi   # NO aborta (contexto if)', 'false || true                   # NO aborta (|| true lo cubre)', 'funcion_con_false               # SÍ aborta', '! false                          # NO aborta (! invierte)'] },
      { caption: 'trap multi-señal', lines: ["limpia() { echo '>> limpieza'; rm -rf /tmp/mi-lock; }", 'trap limpia EXIT INT TERM', 'touch /tmp/mi-lock', 'sleep 5', 'echo fin-normal'] },
    ],
    breakdowns: [
      { caption: 'set -euo pipefail', tokens: [
        { token: '-e', meaning: 'errexit: cualquier comando ≠0 termina el script' },
        { token: '-u', meaning: 'nounset: expandir variable INDEFINIDA es error fatal' },
        { token: '-o pipefail', meaning: 'pipe falla si falla cualquier etapa (no solo la última)' },
        { token: 'matiz', meaning: '-e tiene excepciones (if/&&/||/!) — no es infalible: valida lo crítico igualmente' },
      ] },
    ],
    exercises: [
      {
        id: 'b21e1', kind: 'predict',
        question: 'Bajo set -e: grep -q PATRON archivo || encontrado=false; luego echo continúa. ¿Llega el echo?',
        context: '#!/usr/bin/env bash\nset -e\ngrep -q "X" archivo.txt || encontrado=false\necho "continúa"',
        options: [
          { text: 'No: grep falló y -e aborta', why: 'La rama derecha de || protege: el compuesto devuelve 0.' },
          { text: 'Sí: el || absorbe el fallo del grep', why: 'Correcto: patrón idiomático «intentar o marcar». La excepción de -e aplica a lados izquierdos de ||/&&.' },
          { text: 'Depende de archivo.txt', why: 'Da igual el contenido: ambos caminos acaban bien para -e.' },
          { text: 'Solo con pipefail activo', why: 'pipefail afecta PIPES; aquí no hay ninguno.' },
        ],
        answer: 1,
        solutionLines: ['printf "sin x\\n" > /tmp/a21.txt', 'bash -e -c \'grep -q X /tmp/a21.txt || encontrado=false; echo "continúa ($?: $encontrado)"\''],
        explanation: 'Dominar las EXCEPCIONES de -e separa scripts frágiles de sólidos.',
      },
      {
        id: 'b21e2', kind: 'write',
        question: 'Cabecera completa del modo estricto (una línea, tres piezas):',
        accept: ['set -euo pipefail', 'set -e -u -o pipefail'],
        solutionLines: ['set -euo pipefail'],
        explanation: 'La firma de todo script serio moderno. Añade IFS=$\'\\n\\t\' solo si dominas sus efectos colaterales.',
      },
    ],
    challenge: {
      text: 'Script robusto-minimal: estricto on; crea temp con mktemp; trap que borre tmp al salir (EXIT); escribe algo en él; simula fallo con false PERO compruébalo con if para NO morir; imprime «fin controlado» y verifica que el temp desapareció.',
      hints: ["trap 'rm -rf \"$TMP\"' EXIT", 'if false; then … fi no dispara -e', 'ls $TMP tras ejecutar debe fallar'],
      solutionLines: ['#!/usr/bin/env bash', 'set -euo pipefail', 'TMP=$(mktemp -d)', "trap 'rm -rf \"$TMP\"' EXIT", 'echo dato > "$TMP/f.txt"', 'if false; then echo nunca; fi', 'echo "fin controlado; temp era $TMP"'],
    },
    summary: [
      '?$ + if explícito en pasos críticos: la base siempre.',
      'set -euo pipefail: estándar; conoce sus excepciones antes de confiar ciego.',
      'trap EXIT = limpieza garantizada (temporales, locks, servicios).',
    ],
  },

  /* ============================ 22 EXPRESIONES REGULARES ============================ */
  {
    id: 'regex',
    num: '22',
    title: 'Expresiones regulares',
    level: 'expert',
    minutes: 25,
    goals: [
      'Leer y escribir regex BRE/ERE sin miedo',
      'Aplicarlas en grep, sed y awk',
      'Anclar (^ $), cuantificar (* + ? {}), agrupar y alternar',
    ],
    simple: [
      'Una regex describe un PATRÓN de texto: ^empieza, acab$, . cualquier carácter, .* «lo que sea», [abc] una letra de esas, error|warning una u otra palabra.',
      'Tres sabores: BRE (grep/sed básico) donde + ? | () {} necesitan backslash; ERE (grep -E, awk) donde van desnudos. Empieza simple: literal + anclas resuelven medio mundo.',
    ],
    technical: [
      'Codiciosidad: * + {} intentan el máximo (retrocediendo si el resto del patrón lo exige). Clases POSIX [:digit:] [:alpha:] portables. GNU soporta \\b borde de palabra también en BRE. En sed replacement & = match completo; \\1..\\9 grupos. awk usa ERE SIEMPRE entre /…/. Lookahead NO existe en ERE/BRE POSIX: para eso perl/grep -P.',
    ],
    examples: [
      { caption: 'anclas y clases', lines: ['grep -n "^root" /etc/passwd', "# empieza por root", "grep -n \"bash$\" /etc/passwd", "# acaba en bash", "grep -c \"^[[:space:]]*$\" notas.txt", "# líneas vacías o con espacios"] },
      { caption: 'cuantificadores ERE', lines: ['grep -E "o{2,}" palabras.txt', '# oo, ooo…', 'grep -E "colou?r" textos.txt', '# color o colour', 'grep -E "^[0-9]{3}-[0-9]{4}$" telefonos.txt', '# formato 123-4567'] },
      { caption: 'grupos y captura en sed', lines: ["echo 'Ana:30' | sed -E 's/([A-Za-z]+):([0-9]+)/\\2 años → \\1/'", "# invierte campos usando \\1 \\2"] },
      { caption: 'regex en awk', lines: ["awk '/^ERROR/ {err++} END {print err+0}' app.log", "awk '$0 ~ /^[0-9]+$/ {print \"numérica\"}' <<< 42"] },
    ],
    breakdowns: [
      { caption: '^([A-Z][a-z]+) ([0-9]{4})$', tokens: [
        { token: '^', meaning: 'ancla inicio de línea' },
        { token: '(…)', meaning: 'grupo 1: capitalizable para capturar' },
        { token: '[A-Z][a-z]+', meaning: 'mayúscula inicial + minúsculas (una o más)' },
        { token: '[0-9]{4}', meaning: 'exactamente 4 dígitos (grupo 2)' },
        { token: '$', meaning: 'ancla fin: nada puede sobrar' },
      ] },
    ],
    exercises: [
      {
        id: 'b22e1', kind: 'write',
        question: 'grep (ERE) que case fechas ISO 2026-01-31 estilo AAAA-MM-DD en cualquier lugar de la línea de log.txt:',
        accept: ['grep -e "[0-9]{4}-[0-9]{2}-[0-9]{2}" log.txt'.toLowerCase(), 'grep -E "[0-9]{4}-[0-9]{2}-[0-9]{2}" log.txt'],
        placeholder: '$ grep -E … log.txt',
        solutionLines: ['grep -E "[0-9]{4}-[0-9]{2}-[0-9]{2}" log.txt'],
        explanation: '{n} cuantifica exacto. Para EXTRAER (no filtrar líneas) añadirías -o. Validación estricta de rangos reales (meses 01-12) requiere regex más fina: (0[1-9]|1[0-2]).',
      },
      {
        id: 'b22e2', kind: 'choice',
        question: 'En BRE (sed/grep sin -E), ¿cómo escribes «uno o más dígitos»?',
        options: [
          { text: '[0-9]+', why: '+ desnudo es ERE; en BRE sería LITERAL.' },
          { text: '[0-9]\\{1,\\}', why: 'BRE escapa llaves: \{1,\} significa «1 o más». Equivalente correcto.' },
          { text: '[0-9]*', why: '* incluye CERO: casaría también cadenas sin dígitos.' },
          { text: '\\d+', why: '\\d no existe en POSIX: eso es PCRE (grep -P).' },
        ],
        answer: 1,
        solutionLines: ['echo "abc123def" | grep -o "[0-9]\\{1,\\}"', 'echo "abc123def" | grep -Eo "[0-9]+"'],
        explanation: 'Dos dialectos, mismo objetivo. Cuando dudes, prueba con echo | grep antes de aplicarlo a datos reales.',
      },
    ],
    challenge: {
      text: 'De accesos.log (formato «IP FECHA URL») extrae SOLO las URLs que sean .css o .js usando UNA regex ERE con grupo alternado, contándolas.',
      hints: ['grep -Eo "patron" | wc -l', 'alternancia: \\.css|\\.js', 'escapa el punto: \\. es literal'],
      solutionLines: ['printf "1.2.3.4 hoy /a.css\\n5.6.7.8 hoy /app.js\\n9.9.9.9 hoy /x.html\\n" > accesos.log', 'grep -Eo "/[^ ]+\\.(css|js)" accesos.log | wc -l'],
    },
    summary: [
      'Anclas ^$ · clases [abc][:digit:] · cuantos * + ? {m,n}.',
      'BRE escapa +?|(){}; ERE (grep -E/awk) los usa libres.',
      'Prueba tus regex con echo | grep antes de dispararlas contra datos.',
    ],
  },
]
