import type { BashLesson } from './types'

export const MODULES_2: BashLesson[] = [
  /* ================================== 06 EXIT CODES ================================== */
  {
    id: 'exit-codes',
    num: '06',
    title: 'Exit codes',
    level: 'beginner',
    minutes: 12,
    goals: [
      'Leer y fijar exit status con $? y exit N',
      'Usar los códigos como lenguaje de comunicación entre comandos',
    ],
    simple: [
      'Todo comando termina devolviendo un número al que lo llamó. 0 = éxito; cualquier otro = fallo (y el número suele indicar por qué). $? contiene el del ÚLTIMO comando terminado.',
      'exit cierra tu script devolviendo un código: exit 0 «todo bien», exit 1 «error genérico», exit 2 «uso incorrecto»… son tu API invisible hacia quien automatice tu script.',
    ],
    technical: [
      '$? se actualiza tras CADA comando (incluidos tests [ ]). En pipelines, $? es el del último elemento salvo pipefail. 126 = no ejecutable, 127 = no encontrado, 128+N = muerto por señal N (130 = Ctrl+C). Convenciones BSD/sysexits existen pero 0/1/2 bastan en la práctica.',
    ],
    examples: [
      { caption: 'consultar', lines: ['ls /etc/passwd', 'echo "ls ok → $?"', 'ls /no-existe', 'echo "ls fallido → $?"'] },
      { caption: 'fijar en scripts', lines: ['# dentro de un script:', 'if [ ! -f config.conf ]; then', '  echo "falta config.conf" >&2', '  exit 1', 'fi', '# ... trabajo ...', 'exit 0'] },
    ],
    breakdowns: [
      { caption: 'grep -q patrón fichero || { echo "no está" >&2; exit 1; }', tokens: [
        { token: '-q', meaning: 'quiet: grep solo devuelve código, sin imprimir' },
        { token: '||', meaning: 'ejecuta la derecha SOLO si grep falló (código ≠0)' },
        { token: '{ …; }', meaning: 'grupo de comandos como una unidad (ojo al ; antes de })' },
        { token: 'exit 1', meaning: 'termina el SCRIPT comunicando fallo' },
      ] },
    ],
    exercises: [
      {
        id: 'b6e1', kind: 'predict',
        question: '¿Qué imprime la última línea?',
        context: '$ false\n$ true\n$ echo $? ',
        options: [
          { text: '1 (de false)', why: 'true ya sobrescribió $? después.' },
          { text: '0 — true fue el último comando', why: '$? siempre mira el comando INMEDIATAMENTE anterior.' },
          { text: 'Nada', why: 'echo imprime siempre algo.' },
          { text: '255', why: 'Sería un exit 255 explícito o señal rara.' },
        ],
        answer: 1,
        solutionLines: ['false; true; echo "$?"'],
        explanation: 'Truco de depuración: echo $? justo tras el comando sospechoso, nunca dos líneas después.',
      },
      {
        id: 'b6e2', kind: 'choice',
        question: 'Tu script copia archivos y falla a mitad. ¿Qué exit conviene?',
        options: [
          { text: 'exit 0 con mensaje de aviso', why: '0 promete éxito: quien te automatice seguirá ciegamente.' },
          { text: 'exit ≠0 (p.ej. 1) tras informar del error por stderr', why: 'Comunicación honesta: mensajes→stderr, código≠0 para que && / CI reaccionen.' },
          { text: 'No importa el número', why: 'Importa muchísimo: es tu contrato con otros programas.' },
          { text: 'exit -1', why: 'Los códigos van 0-255; -1 se trunca a 255 (funciona pero confunde).' },
        ],
        answer: 1,
        solutionLines: ['cp archivo destino || { echo "copia fallida" >&2; exit 1; }'],
        explanation: 'Patrón universal de robustez mínima en una línea.',
      },
    ],
    summary: [
      '$? = resultado del último; 0 éxito · 127 no existe · 130 Ctrl+C.',
      'exit N termina tu script comunicando ese N.',
      'Diseña códigos: son la interfaz entre tus scripts y el resto del sistema.',
    ],
  },

  /* ========================= 07 OPERADORES Y REDIRECCIONES ========================= */
  {
    id: 'operadores-redirecciones',
    num: '07',
    title: 'Operadores y redirecciones',
    level: 'beginner',
    minutes: 20,
    goals: [
      'Dominar > >> < 2> 2>&1 & | || && ;',
      'Saber exactamente qué flujo va dónde',
      'Silenciar selectivamente salida o errores',
    ],
    simple: [
      '> guarda stdout (sobrescribe), >> añade. 2> captura ERRORES, 2>> añade errores. 2>&1 junta errores con la salida normal. < mete un archivo por stdin.',
      '| conecta la salida de un comando con la entrada del siguiente; && ejecuta lo siguiente SOLO si todo fue bien; || si falló; ; ejecuta siempre en orden. & suelta el proceso al fondo.',
    ],
    technical: [
      'El shell aplica redirecciones ANTES de exec: dup2() sobre fds 0/1/2. Orden importa: cmd >f 2>&1 manda ambos a f; cmd 2>&1 >f deja stderr en pantalla. >f abre con O_TRUNC aunque el comando falle después. | crea pipe(2) real: los procesos corren EN PARALELO con contrapresión.',
    ],
    examples: [
      { caption: 'guardar y añadir', lines: ['ls -la > inventario.txt', 'date >> inventario.txt', 'cat inventario.txt'] },
      { caption: 'errores aparte y juntos', lines: ['find / -name "*.conf" 2>/dev/null', 'make build > build.log 2>&1'] },
      { caption: 'encadenar con criterio', lines: ['mkdir -p proyecto && cd proyecto && echo "listo"', 'ping -c1 192.0.2.1 >/dev/null 2>&1 || echo "sin red al lab"' ] },
    ],
    breakdowns: [
      { caption: 'comando > salida.log 2>&1', tokens: [
        { token: '> salida.log', meaning: 'stdout → archivo (trunca)' },
        { token: '2>&1', meaning: 'stderr → DONDE APUNTE ahora stdout (el archivo)' },
        { token: 'orden', meaning: 'si inviertes (2>&1 >log) stderr queda en pantalla' },
      ] },
    ],
    sim: {
      intro: 'Prueba encadenados simples; esta sim soporta ; y evalúa comando a comando.',
      tasks: ['pwd; whoami; date', 'echo uno && echo dos', 'false || echo "fallback ejecutado"'],
    },
    exercises: [
      {
        id: 'b7e1', kind: 'write',
        question: 'Ejecuta backup.sh guardando stdout Y stderr en run.log (una línea):',
        accept: ['./backup.sh >run.log 2>&1', './backup.sh > run.log 2>&1', 'bash backup.sh >run.log 2>&1'],
        solutionLines: ['./backup.sh > run.log 2>&1'],
        explanation: 'Primero mandas stdout al archivo; luego duplicas 2 hacia donde apunta 1. El orden de los dos operadores ES el significado.',
      },
      {
        id: 'b7e2', kind: 'predict',
        question: 'cmd1 && cmd2 || cmd3 — ¿cuándo corre cmd3?',
        context: 'A) cmd1 falla   B) cmd1 ok + cmd2 falla   C) cmd1 ok + cmd2 ok',
        options: [
          { text: 'Solo en A', why: 'Si cmd1 falla ni siquiera cmd2 corre… pero entonces sí corre cmd3.' },
          { text: 'En A y en B (cualquier fallo previo)', why: '&& corta ante el primer fallo; || recoge ESE fallo. Ojo: NO es try/catch — si cmd3 tiene éxito tras B, no hay «rollback».' },
          { text: 'Solo en C', why: 'En C nada falló: || no dispara.' },
          { text: 'Nunca', why: '|| siempre vigila el resultado inmediato previo.' },
        ],
        answer: 1,
        solutionLines: ['false && echo "no llega" || echo "cmd3 corre"', 'true && false || echo "también aquí"'],
        explanation: 'Útil y común, pero para lógica compleja usa if: más claro e igual de rápido.',
      },
      {
        id: 'b7e3', kind: 'write',
        question: 'Ejecuta noisy-tool silenciando TODO (stdout y stderr a /dev/null):',
        accept: ['noisy-tool >/dev/null 2>&1', 'noisy-tool > /dev/null 2>&1', 'noisy-tool &>/dev/null'],
        solutionLines: ['noisy-tool > /dev/null 2>&1'],
        explanation: '&>/dev/null es azúcar de Bash equivalente. /dev/null descarga infinita: acepta todo, guarda nada.',
      },
    ],
    challenge: {
      text: 'Crea registro.txt; añade una cabecera con fecha; ejecuta df -h añadiendo su salida; y por último muestra cuántas líneas tiene (wc -l) SIN contar la cabecera (tail -n +2).',
      hints: ['>> para añadir', 'tail -n +2 empieza desde la línea 2', 'combina tail con wc usando pipe'],
      solutionLines: ['echo "# uso de disco $(date +%F)" > registro.txt', 'df -h >> registro.txt', 'tail -n +2 registro.txt | wc -l'],
    },
    summary: [
      '> truncar · >> añadir · 2> errores · 2>&1 fusiona (¡orden!) · < stdin.',
      '| paralelo y con backpressure; && corto-éxito; || corto-fallo; ; secuencial.',
      '>/dev/null 2>&1 silencio total — úsalo cuando SOLO importe el exit code.',
    ],
  },

  /* ================================= 08 CONDICIONALES ================================= */
  {
    id: 'condicionales',
    num: '08',
    title: 'Condicionales',
    level: 'beginner',
    minutes: 22,
    goals: [
      'Escribir if/elif/else correctos (los espacios SÍ importan)',
      'Testear archivos (-f -d -r -w -x -e) y comparar números/cadenas',
      'Elegir entre múltiples valores con case',
    ],
    simple: [
      'if [ condición ]; then … fi decide. Los corchetes SON un comando (test): necesitan espacios alrededor y cierre con ; then en la misma línea.',
      'Para archivos: -f existe y es archivo, -d directorio, -r/-w/-x permisos, -e existe (lo que sea), -z cadena vacía, -n no vacía. Números: -eq -ne -lt -le -gt -ge. Cadenas: = != < >. Para múltiples casos exactos: case … esac.',
    ],
    technical: [
      '[ ] es test (builtin); [[ ]] es keyword Bash: permite == con patrones, =~ regex, && || dentro, y NO hace word-splitting de variables (menos comillas necesarias). (( )) evalúa aritmética con operadores C (< > ==). case usa globs por patrón; ;; separa ramas, ;;& cae-through condicional (Bash4+).',
    ],
    examples: [
      { caption: 'if completo', lines: ['read -rp "Ruta a comprobar: " RUTA', 'if [ -d "$RUTA" ]; then', '  echo "es un directorio"', 'elif [ -f "$RUTA" ]; then', '  echo "es un archivo"', 'else', '  echo "no existe"', 'fi'] },
      { caption: 'tests frecuentes', lines: ['[ -w /tmp ] && echo "/tmp escribible"', '[ -z "$HOME" ] && echo "HOME vacía"', '[ "$UID" -eq 0 ] && echo "eres root" || echo "usuario normal"'] },
      { caption: 'case de menú', lines: ['read -rp "acción (start|stop|status): " ACCION', 'case "$ACCION" in', '  start) echo "arrancando…" ;;', '  stop)  echo "parando…" ;;', '  status) echo "estado: ok" ;;', '  *) echo "opción desconocida" >&2; exit 2 ;;', 'esac'] },
    ],
    breakdowns: [
      { caption: 'if [ "$EDAD" -ge 18 ]; then … fi', tokens: [
        { token: 'if', meaning: 'evalúa el exit status de lo que sigue (¡no compara por arte de magia!)' },
        { token: '[', meaning: 'comando test; NECESITA espacio después' },
        { token: '"$EDAD"', meaning: 'entre comillas: evita romperse si viene vacía' },
        { token: '-ge 18', meaning: 'greater-or-equal numérico (jamás usar > aquí)' },
        { token: ']', meaning: 'cierra test; espacio antes también obligatorio' },
        { token: '; then', meaning: '; separa, then abre el bloque' },
      ] },
    ],
    exercises: [
      {
        id: 'b8e1', kind: 'write',
        question: 'Una línea: si existe ~/.bashrc imprime «existe» (usa if en una línea con then/fi).',
        accept: ['if [ -f ~/.bashrc ]; then echo existe; fi', 'if [ -f "$home/.bashrc" ]; then echo existe; fi', 'if [ -e ~/.bashrc ]; then echo existe; fi', 'if [ -f ~/.bashrc ];then echo existe; fi'],
        placeholder: '$ if …; then …; fi',
        solutionLines: ['if [ -f ~/.bashrc ]; then echo existe; fi'],
        explanation: '~ expande a home antes del test; -f exige ARCHIVO regular (si fuera dir, fallaría: eso es precisión deseable).',
      },
      {
        id: 'b8e2', kind: 'choice',
        question: '¿Por qué falla: if [$X -eq 5]?',
        options: [
          { text: 'Falta fi', why: 'Faltaría para el bloque completo, pero ESTA línea ya revienta antes.' },
          { text: '[ necesita espacios alrededor: [ "$X" -eq 5 ]', why: '[ es un COMANDO: sin espacio Bash busca el ejecutable «[$X».' },
          { text: '-eq es para strings', why: 'Al revés: -eq es numérico; = compara cadenas.' },
          { text: 'Las variables nunca llevan comillas en tests', why: 'Al contrario: sin comillas una X vacía produce [ -eq 5 ] → error.' },
        ],
        answer: 1,
        solutionLines: ['X=5', 'if [ "$X" -eq 5 ]; then echo cinco; fi'],
        explanation: 'El 90% de errores de principiante en if son espacios faltantes o variables sin comillar.',
      },
      {
        id: 'b8e3', kind: 'write',
        question: 'Con case: imprime «verde» para g|green|verde, «rojo» para r|red|rojo, y «desconocido» para lo demás (estructura completa):',
        accept: ['case color in g|green|verde) echo verde;; r|red|rojo) echo rojo;; *) echo desconocido;; esac'],
        placeholder: '$ case … esac',
        solutionLines: ['read -rp "color: " COLOR', 'case "$COLOR" in', '  g|green|verde) echo verde ;;', '  r|red|rojo) echo rojo ;;', '  *) echo desconocido ;;', 'esac'],
        explanation: '| dentro de un patrón lista alternativas; *) es el catch-all; ;; cierra cada rama. Siempre cubre el caso * con error si esperas valores acotados.',
      },
    ],
    challenge: {
      text: 'Script mental: dado un argumento ($1) imprime «archivo» si -f, «directorio» si -d, «otra cosa» si -e, y «no existe» + exit 1 en caso contrario.',
      hints: ['Ordena los tests de específico a genérico', '-e engloba -f y -d: déjalo al final', 'Puedes probarlo pasando argumentos reales'],
      solutionLines: ['#!/usr/bin/env bash', 'if [ -f "$1" ]; then echo archivo', 'elif [ -d "$1" ]; then echo directorio', 'elif [ -e "$1" ]; then echo "otra cosa"', 'else echo "no existe" >&2; exit 1', 'fi'],
    },
    summary: [
      '[ ] = test: espacios obligatorios; "$VAR" siempre entre comillas.',
      'Archivos: -e -f -d -r -w -x · Números: -eq…-ge · Cadenas: = != -z -n.',
      '[[ ]] moderno y case para menús; else-if = elif; cierres: fi / esac.',
    ],
  },

  /* ===================================== 09 BUCLES ===================================== */
  {
    id: 'bucles',
    num: '09',
    title: 'Bucles',
    level: 'beginner',
    minutes: 20,
    goals: [
      'Iterar listas, rangos y archivos con for',
      'Repetir mientras/until una condición se cumpla',
      'Controlar el flujo con break y continue',
    ],
    simple: [
      'for VAR in lista; do … done repite por cada elemento. while condición; do … done repite MIENTRAS sea verdadera; until repite HASTA que lo sea.',
      'continue salta a la siguiente vuelta; break rompe el bucle entero. Con read puedes recorrer un archivo línea a línea de forma segura.',
    ],
    technical: [
      'for x in a b c itera PALABRAS ya expandidas (globs/braces incluidos): nunca partirá rutas con espacios SI la fuente es un glob. NUNCA uses for sobre $(ls): parsing frágil. El patrón while IFS= read -r line; do … done < file preserva espacios y backslashes: IFS= evita recortes, -r evita escapes.',
      'C-style: for ((i=0; i<10; i++)) con aritmética nativa. seq existe pero {1..10} y (( )) son builtins más rápidos.',
    ],
    examples: [
      { caption: 'for básico y rangos', lines: ['for fruta in manzana pera uva; do echo "me como una $fruta"; done', 'for i in {1..5}; do echo "vuelta $i"; done', 'for ((i=10; i>=0; i-=2)); do echo "$i…"; done'] },
      { caption: 'iterar archivos (seguro)', lines: ['for f in *.txt; do', '  [ -e "$f" ] || continue', '  echo "procesando $f ($(wc -l < "$f") líneas)"', 'done'] },
      { caption: 'while línea a línea', lines: ['while IFS= read -r linea; do', '  echo "-> $linea"', 'done < notas.txt'] },
      { caption: 'until + break/continue', lines: ['i=0', 'until [ "$i" -ge 3 ]; do', '  i=$((i+1))', '  [ "$i" -eq 2 ] && continue', '  echo "iteración $i"', 'done'] },
    ],
    breakdowns: [
      { caption: 'while IFS= read -r linea; do … done < file', tokens: [
        { token: 'IFS=', meaning: 'vacía separadores SOLO para este read: conserva espacios inicial/final' },
        { token: '-r', meaning: 'sin interpretar backslashes' },
        { token: '< file', meaning: 'stdin del WHILE entero = el fichero (read consume línea a línea)' },
        { token: 'linea', meaning: 'variable de cada iteración (sin $ al asignar)' },
      ] },
    ],
    exercises: [
      {
        id: 'b9e1', kind: 'predict',
        question: 'for n in 1 2*3 hola; do echo "$n"; done — ¿cuántas líneas y cuáles?',
        context: 'Nota: no hay archivos llamados 2*3 en el directorio.',
        options: [
          { text: 'Tres líneas: 1, 6, hola', why: 'Bash NO evalúa aritmética en globbing: 2*3 queda literal si no coincide ningún archivo.' },
          { text: 'Dos líneas: 1 y hola (2*3 desaparece)', why: 'Sin nullglob, un glob sin coincidencias se pasa LITERAL: tres elementos.' },
          { text: 'Una línea con todo junto', why: 'Cada palabra de la lista es una iteración independiente.' },
          { text: 'Error de sintaxis', why: 'Es sintaxis válida: la sorpresa es semántica (glob literal).' },
        ],
        answer: 1,
        solutionLines: ['mkdir -p /tmp/b9demo && cd /tmp/b9demo', 'for n in 1 2*3 hola; do echo "$n"; done', 'touch 24.txt && mv 24.txt 23x.txt', 'cd /tmp/b9demo && ls'],
        explanation: 'Lección doble: los globs sin match quedan literales (salvo shopt -s nullglob) y la aritmética requiere $(( )).',
      },
      {
        id: 'b9e2', kind: 'write',
        question: 'Bucle for C-style que imprima 3 2 1 ¡ya! (una sola estructura for):',
        accept: ['for ((i=3;i>0;i--)); do echo "$i"; done; echo "¡ya!"', 'for ((i=3; i>0; i--)); do echo $i; done; echo ya'],
        placeholder: '$ for ((…)); do …; done; echo …',
        solutionLines: ['for ((i=3; i>0; i--)); do echo "$i"; done', 'echo "¡ya!"'],
        explanation: '(( )) admite i-- y comparaciones estilo C. Fuera del bucle, el echo final sale tras terminar.',
      },
    ],
    challenge: {
      text: 'Recorre logs/2024.log, logs/2025.log y logs/2026.log (créalos vacíos primero) imprimiendo «nombre: N líneas» usando for sobre un glob logs/*.log.',
      hints: ['touch logs/{2024..2026}.log crea los tres', 'wc -l < fichero da el número limpio', 'protege con [ -e "$f" ] || continue'],
      solutionLines: ['mkdir -p logs && touch logs/{2024..2026}.log', 'echo dato >> logs/2025.log', 'for f in logs/*.log; do', '  echo "$f: $(wc -l < "$f") líneas"', 'done'],
    },
    summary: [
      'for listas/rangos/globs · while condición · until inverso.',
      'Lectura canónica de ficheros: while IFS= read -r line < file.',
      'break corta; continue salta; jamás parses ls con for.',
    ],
  },
]
