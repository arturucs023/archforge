import type { BashLesson } from './types'

export const MODULES_3: BashLesson[] = [
  /* =================================== 10 SCRIPTS =================================== */
  {
    id: 'scripts',
    num: '10',
    title: 'Scripts',
    level: 'beginner',
    minutes: 18,
    goals: [
      'Crear y ejecutar tu primer script completo',
      'Entender qué ocurre exactamente al ejecutarlo',
      'Poner tus scripts disponibles en el PATH',
    ],
    simple: [
      'Un script es un archivo de texto con comandos que Bash ejecuta en orden. La primera línea —el shebang— dice QUÉ intérprete usar: #!/usr/bin/env bash.',
      'Tres pasos: escribes el archivo, le das permiso de ejecución (chmod +x), lo lanzas (./mi-script.sh). El ./ no es decorativo: sin él, Bash buscaría mi-script.sh en el PATH y no lo encontraría.',
    ],
    technical: [
      'Al ejecutar ./script, el kernel lee la línea shebang (#!) y lanza /usr/bin/env bash script como intérprete. env busca bash en PATH: más portable que hardcodear /bin/bash. El script corre en UN PROCESO HIJO: sus variables mueren con él (por eso source script.sí afecta a tu shell actual). chmod +x activa el modo de ejecución; sin él, execve falla con Permission denied aunque la sintaxis sea perfecta.',
    ],
    examples: [
      { caption: 'de cero a ejecutado', lines: ['mkdir -p ~/bin && cd ~/bin', '# crea hola.sh con este contenido:', 'cat > hola.sh <<\'EOF\'', '#!/usr/bin/env bash', 'NOMBRE="${1:-mundo}"', 'echo "Hola, $NOMBRE"', 'exit 0', 'EOF', 'chmod +x hola.sh', './hola.sh', './hola.sh ArchForge'] },
      { caption: 'diagnóstico cuando «no arranca»', lines: ['ls -l ~/bin/hola.sh', 'head -1 ~/bin/hola.sh', '~/bin/hola.sh'] },
    ],
    breakdowns: [
      { caption: '#!/usr/bin/env bash', tokens: [
        { token: '#!', meaning: 'número mágico que el kernel interpreta como «ejecuta esto con…»' },
        { token: '/usr/bin/env', meaning: 'busca el intérprete en PATH: portable entre sistemas' },
        { token: 'bash', meaning: 'el intérprete concreto' },
        { token: '${1:-mundo}', meaning: 'primer argumento o «mundo» si no vino ninguno' },
      ] },
    ],
    exercises: [
      {
        id: 'b10e1', kind: 'write',
        question: 'Comando para dar permisos de ejecución a backup.sh:',
        accept: ['chmod +x backup.sh'],
        solutionLines: ['chmod +x backup.sh'],
        explanation: '+x añade execute a dueño/grupo/otros. Alternativa restrictiva: chmod u+x solo tú.',
      },
      {
        id: 'b10e2', kind: 'choice',
        question: '¿Por qué ./script.sh y no script.sh a secas?',
        options: [
          { text: 'Es tradición, ambas iguales', why: 'No: sin ./ el shell IGNORA el directorio actual por seguridad.' },
          { text: 'PATH no incluye . : hay que decir explícitamente dónde está', why: 'Exacto: script.sh se busca en PATH; ./script.sh apunta al directorio actual.' },
          { text: './ compila antes', why: 'Bash no compila nada aquí.' },
          { text: 'Requiere root', why: 'Al contrario: no requiere nada especial.' },
        ],
        answer: 1,
        solutionLines: ['echo "$PATH" | tr ":" "\\n" | head -5', 'cp /bin/true ~/.local/bin/miscript && miscript && echo "funcionó desde PATH"'],
        explanation: 'Para invocar SIN ./ copia tus scripts a un directorio del PATH (~/bin o ~/.local/bin).',
      },
    ],
    challenge: {
      text: 'Crea saluda.sh que reciba un nombre ($1); si falta, usa «invitado»; imprime «Bienvenido, X»; y termina con exit 0. Hazlo ejecutable y pruébalo con y sin argumento.',
      hints: ['${1:-invitado} resuelve el defecto en una expresión', 'chmod +x y ./saluda.sh Ana'],
      solutionLines: ['cat > saluda.sh <<\'EOF\'', '#!/usr/bin/env bash', 'NOMBRE="${1:-invitado}"', 'echo "Bienvenido, $NOMBRE"', 'exit 0', 'EOF', 'chmod +x saluda.sh', './saluda.sh Grace', './saluda.sh'],
    },
    summary: [
      'Shebang #!/usr/bin/env bash → intérprete correcto siempre.',
      'chmod +x + ./script.sh; sin ./ se busca solo en PATH.',
      'El script corre en hijo: variables internas no contaminan tu shell.',
    ],
  },

  /* ================================== 11 ARGUMENTOS ================================== */
  {
    id: 'argumentos',
    num: '11',
    title: 'Argumentos',
    level: 'intermediate',
    minutes: 15,
    goals: [
      'Consumir $1..$9, $# y recorrer todos con "$@"',
      'Validar entrada antes de trabajar',
      'Entender "$@" vs "$*" de verdad',
    ],
    simple: [
      'Los parámetros posicionales alimentan tu script: ./script uno dos → $0=./script, $1=uno, $2=dos. $# dice cuántos llegaron. shift descarta el primero y corre el resto a la izquierda.',
      '"$@" conserva cada argumento COMO SEPARADO (aunque tenga espacios); "$*" los une en UNA sola cadena. Para pasarlos hacia delante: casi siempre "$@".',
    ],
    technical: [
      'Más allá de 9: ${10} ${11}. "$@" expande a N palabras citadas individualmente (safe forwarding universal); "$*" une usando el PRIMER carácter de IFS. $$ = PID del shell; $! = PID del último proceso en background; $? ya conocido. Validación mínima profesional: [ $# -eq 0 ] && usage.',
    ],
    examples: [
      { caption: 'inspección completa', lines: ['cat > args.sh <<\'EOF\'', '#!/usr/bin/env bash', 'echo "programa: $0"', 'echo "cantidad : $#"','echo "primero  : ${1:-<nada>}"', 'i=1', 'for arg in "$@"; do echo "  [$i] $arg"; i=$((i+1)); done', 'EOF', 'chmod +x args.sh', './args.sh "uno espaciado" dos tres'] },
      { caption: '"$@" vs "$*"', lines: ['printf "[%s]\\n" "$@"', 'echo "--- ahora \$* ---"', 'printf "[%s]\\n" "$*"'] },
      { caption: 'shift para opciones simples', lines: ['# dentro de un script:', 'while [ $# -gt 0 ]; do', '  case "$1" in', '    -v) VERBOSE=1 ;;', '    -o) OUT="$2"; shift ;;', '    *) break ;;', '  esac', '  shift', 'done'] },
    ],
    breakdowns: [
      { caption: 'grep "$PATRON" "$@"', tokens: [
        { token: '"$@"', meaning: 'expande a CADA argumento citado por separado: espacios preservados' },
        { token: '$*', meaning: '(sin comillas sería peor) une todo en una palabra única' },
        { token: 'uso típico', meaning: 'envolver herramientas: my-grep() { grep --color "$@"; }' },
      ] },
    ],
    exercises: [
      {
        id: 'b11e1', kind: 'write',
        question: 'Primera línea de un script que exige EXACTAMENTE 2 argumentos (si no: mensaje a stderr y exit 2):',
        accept: ['[ "$#" -ne 2 ] && { echo "uso: $0 <a> <b>" >&2; exit 2; }'],
        placeholder: '$ [ … ] && { …; }',
        solutionLines: ['[ "$#" -ne 2 ] || { echo "uso: $0 <a> <b>" >&2; exit 2; }'],
        explanation: '-ne 2 cubre 0,1,3… Ambas formas (&& con -eq, || con -ne) son equivalentes; elige una y sé consistente.',
      },
      {
        id: 'b11e2', kind: 'predict',
        question: 'Con $@ = ("a b" c): ¿cuántas palabras recibe printf "%s\\n" "$*"?',
        context: 'set -- "a b" c\nprintf "%s\\n" "$*"',
        options: [
          { text: 'Dos: «a b» y c', why: 'Eso es "$@" (con comillas dobles alrededor de @).' },
          { text: 'Una: «a b c»', why: '"$*" concatena TODOS con el primer carácter de IFS (espacio): un único argumento.' },
          { text: 'Tres: a, b, c', why: 'Sería $@ SIN comillas: word splitting destructivo.' },
          { text: 'Depende de LANG', why: 'IFS controla esto, no la localización.' },
        ],
        answer: 1,
        solutionLines: ['set -- "a b" c', 'printf "at: [%s]\\n" "$@"', 'printf "star: [%s]\\n" "$*"'],
        explanation: 'Mnemotecnia: @ = array (respeta elementos), * = string (une todo).',
      },
    ],
    challenge: {
      text: 'Script contar.sh que acepte cualquier número de rutas e imprima por cada una «ruta: existe» o «ruta: NO» (usando for sobre "$@"), y al final el total recibido con $#.',
      hints: ['for ruta in "$@"', '[ -e "$ruta" ] decide', '$# tras el bucle sigue siendo el total'],
      solutionLines: ['for ruta in "$@"; do', '  if [ -e "$ruta" ]; then echo "$ruta: existe"; else echo "$ruta: NO"; fi', 'done', 'echo "total: $#"'],
    },
    summary: [
      '$1..${N} · $# cuenta · shift rota · "$@" reenvía intacto.',
      '"$@" respeta elementos; "$*" fusiona: elije según intención.',
      'Validar $#, informar uso y exit ≠0: mínimo profesional.',
    ],
  },

  /* ==================================== 12 FUNCIONES ==================================== */
  {
    id: 'funciones',
    num: '12',
    title: 'Funciones',
    level: 'intermediate',
    minutes: 18,
    goals: [
      'Definir y llamar funciones con parámetros propios',
      'Devolver resultados con return (código) y echo+$( ) (datos)',
      'Encapsular con local y evitar colisiones globales',
    ],
    simple: [
      'Una función empaqueta comandos con nombre: saludo() { echo "hola $1"; } y luego llamas saludo Ana. Sus $1,$2 son SUS argumentos, no los del script.',
      'return devuelve un CÓDIGO (como exit pero para funciones); para devolver DATOS, imprime con echo y captura con $(nombre_función).',
    ],
    technical: [
      'Las funciones viven en el mismo proceso (sin subshell): las variables que tocan son GLOBALES salvo local (dinámico-scoped hasta el fin de función). $(f) SÍ abre subshell: cambios de variables ahí no escapan — patrón correcto: imprimir resultado y capturar. export -f comparte con hijos bash. Definición debe preceder al uso en flujo de ejecución.',
    ],
    examples: [
      { caption: 'definir, llamar, parametrizar', lines: ['saludo() {', '  echo "Hola, ${1:-desconocido}"', '}', 'saludo', 'saludo Ada'] },
      { caption: 'return (código) vs echo (dato)', lines: ['es_par() { [ $(( $1 % 2 )) -eq 0 ]; }', 'if es_par 42; then echo "42 es par"; fi', 'doble() { echo $(( $1 * 2 )); }', 'RESULTADO=$(doble 21)', 'echo "$RESULTADO"'] },
      { caption: 'local evita fugas', lines: ['contador=0', 'suma() { local total=$(( $1 + $2 )); contador=$((contador+1)); echo "$total"; }', 'R=$(suma 2 3)', 'echo "R=$R contador=$contador"'] },
    ],
    breakdowns: [
      { caption: 'R=$(doble 21)', tokens: [
        { token: 'doble', meaning: 'la función se ejecuta en un SUBSHELL' },
        { token: 'echo dentro', meaning: 'su stdout ES el valor devuelto' },
        { token: '$( )', meaning: 'captura esa salida como cadena' },
        { token: 'exit status', meaning: '$? tras capturar = el return de doble (0 default)' },
      ] },
    ],
    exercises: [
      {
        id: 'b12e1', kind: 'write',
        question: 'Define existe() que devuelva éxito si su primer argumento existe (-e):',
        accept: ['existe() { [ -e "$1" ]; }', 'existe(){ [ -e "$1" ]; }'],
        placeholder: '$ existe() { …; }',
        solutionLines: ['existe() { [ -e "$1" ]; }', 'existe /etc/passwd && echo sí'],
        explanation: 'El cuerpo entero ES un test: su exit status fluye automáticamente. Menos es más.',
      },
      {
        id: 'b12e2', kind: 'choice',
        question: 'Dentro de f() { X=5; }, ¿qué pasa con X fuera después de llamar f?',
        options: [
          { text: 'X queda =5 (global) salvo que se declarara local X', why: 'Sin local, asignaciones tocan el scope global del shell; local acota hasta cerrar la función.' },
          { text: 'X desaparece', why: 'unset sería necesario para eso.' },
          { text: 'Error de scope', why: 'Bash es dinámico-permisivo: no error.' },
          { text: 'X vale "" ', why: 'Solo si existiera local X previo sin asignar.' },
        ],
        answer: 0,
        solutionLines: ['f() { X=5; }', 'X=viejo', 'f', 'echo "$X"   # → 5', 'g() { local Y=7; }', 'g', 'echo "[${Y:-indefinida}"'],
        explanation: 'Regla de higiene: TODO temporal de función lleva local. Tu yo futuro te lo agradecerá.',
      },
    ],
    challenge: {
      text: 'Crea uso() que imprima «Uso: $0 <archivo>» por stderr y devuelva 2; y procesa() que verifique su $1 con existe() (reutilización) imprimiendo OK o llamando uso().',
      hints: ['>&2 redirige el echo a stderr', 'puedes llamar otras funciones dentro', 'devuelve 2 desde uso con return 2'],
      solutionLines: ['uso() { echo "Uso: $0 <archivo>" >&2; return 2; }', 'procesa() {', '  if [ -z "${1:-}" ] || ! existe "$1"; then uso; return $?; fi', '  echo "OK: procesando $1"', '}', 'existe() { [ -e "$1" ]; }', 'procesa', 'procesa /etc/passwd'],
    },
    summary: [
      'nombre() { … } define; se llama por nombre+args.',
      'return=código; echo+$( )=datos; local=scope higiénico.',
      'Las funciones hacen tus scripts legibles y testeables: úsalas desde 20 líneas.',
    ],
  },

  /* ===================================== 13 ARRAYS ===================================== */
  {
    id: 'arrays',
    num: '13',
    title: 'Arrays',
    level: 'intermediate',
    minutes: 18,
    goals: [
      'Manejar arrays indexados y asociativos',
      'Recorrer, medir y trocear arrays de forma segura',
      'Saber cuándo un array es LA respuesta (¡listas!)',
    ],
    simple: [
      'Un array guarda VARIOS valores ordenados: SOFT=(vim git curl). Accedes con índices desde 0: "${SOFT[0]}". Recorres todo con for x in "${SOFT[@]}" — comillas incluidas para respetar espacios.',
      'Los asociativos usan NOMBRES en vez de números: declare -A EDAD=([ana]=30 [bob]=25). Perfectos para mapeos clave→valor.',
    ],
    technical: [
      'Índices son aritmética: arr[-1]=último; ${#arr[@]} longitud; ${arr[@]:1:2}=slice. "${arr[@]}" expande elementos CITADOS individualmente (la versión array de "$@"); "${!arr[@]}" lista claves. Asociativos requieren declare -A ANTES de usar; claves con espacios funcionan citando en la expansión.',
    ],
    examples: [
      { caption: 'indexados de punta a punta', lines: ['SOFT=(vim "visual studio code" git)', 'echo "total: ${#SOFT[@]}"', 'echo "primero: ${SOFT[0]}"', 'echo "ultimo: ${SOFT[-1]}"', 'SOFT+=(htop docker)', 'for s in "${SOFT[@]}"; do echo "- $s"; done'] },
      { caption: 'trocear y borrar', lines: ['COPIA=("${SOFT[@]:1:2}")', 'echo "${COPIA[@]}"', 'unset "SOFT[0]"', 'echo "${SOFT[@]}"'] },
      { caption: 'asociativos', lines: ['declare -A PUERTO=( [ssh]=22 [http]=80 [https]=443 )', 'echo "https usa ${PUERTO[https]}"', 'for servicio in "${!PUERTO[@]}"; do echo "$servicio → ${PUERTO[$servicio]}"; done'] },
    ],
    breakdowns: [
      { caption: 'for s in "${SOFT[@]}"; do … done', tokens: [
        { token: '"..."', meaning: 'cita global: imprescindible' },
        { token: '@', meaning: 'todos los ELEMENTOS, cada uno separado' },
        { token: 'vs [*]', meaning: '"${SOFT[*]}" los uniría en UNA cadena' },
      ] },
    ],
    exercises: [
      {
        id: 'b13e1', kind: 'write',
        question: 'Declara FRUTAS=(manzana pera) y AÑADE cereza en una segunda línea:',
        accept: ['frutas=(manzana pera)\nfrutas+=(cereza)'],
        placeholder: '$ FRUTAS=(manzana pera) ↵ $ FRUTAS+=(…) ',
        solutionLines: ['FRUTAS=(manzana pera)', 'FRUTAS+=(cereza)'],
        explanation: '+= añade al final sin pisar. Alternativa indexada: FRUTAS[${#FRUTAS[@]}]=cereza.',
      },
      {
        id: 'b13e2', kind: 'choice',
        question: 'ARCHIVOS=("mi informe.txt" notas.md). ¿Qué rompe: cp "${ARCHIVOS[*]}" /backup?',
        options: [
          { text: 'Nada, copia ambos', why: '"$*" los convierte en UNA sola cadena: cp buscaría un archivo llamado «mi informe.txt notas.md».' },
          { text: '"$*" los une en una sola palabra: cp falla buscando ese archivo imposible', why: 'Correcto: para LISTAS hacia comandos usa "${ARR[@]}", nunca [*].' },
          { text: 'Faltan permisos', why: 'El fallo sería de resolución de nombre, no de permisos.' },
          { text: 'Los arrays no pueden contener espacios', why: 'Pueden: para eso existen las comillas en la definición.' },
        ],
        answer: 1,
        solutionLines: ['mkdir -p /tmp/b13demo && cd /tmp/b13demo', 'touch "mi informe.txt" notas.md', 'ARCHIVOS=("mi informe.txt" notas.md)', 'mkdir -p destino', 'cp "${ARCHIVOS[@]}" destino/ && ls destino'],
        explanation: 'Regla de oro de listas: [@] para ITERAR/PASAR; [*] solo para IMPRIMIR unido.',
      },
    ],
    challenge: {
      text: 'Con PAQUETES=(curl git htop): imprime cuántos hay, instala-mentalmente cada uno (echo «instalando X»), y muestra solo los pares índice:valor con ${!PAQUETES[@]}.',
      hints: ['${#ARR[@]} longitud', 'dos bucles distintos: uno con "${ARR[@]}", otro con "${!ARR[@]}"'],
      solutionLines: ['PAQUETES=(curl git htop)', 'echo "total: ${#PAQUETES[@]}"', 'for p in "${PAQUETES[@]}"; do echo "instalando $p"; done', 'for i in "${!PAQUETES[@]}"; do echo "$i:${PAQUETES[$i]}"; done'],
    },
    summary: [
      'ARR=(a b c) · "${ARR[@]}" itera seguro · ${#ARR[@]} tamaño.',
      '+= añade; unset "ARR[i]" borra hueco (¡los índices no se compactan!).',
      'declare -A para mapas clave→valor; "${!ARR[@]}" da las claves.',
    ],
  },
]
