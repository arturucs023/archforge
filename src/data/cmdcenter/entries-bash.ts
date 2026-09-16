import type { CommandEntry } from './meta'

/* Constructos y builtins de Bash que faltaban en la Cheatsheet.
   No duplica: export/source/read/set/trap/jobs/type/tee/xargs/redirecciones
   básicas ya existen en bash-shell y pipes-redir (ver entries-extra/more).
   Todo es Bash (no POSIX sh): se indica donde importa. */

export const BASH_COMMANDS: CommandEntry[] = [
  {
    id: 'bash-invoke', name: 'bash', cat: 'bash-shell', distro: ['arch', 'debian', 'alpine'], important: true,
    summary: 'Invocar Bash y scripts: shebang, ./ frente a bash frente a source, -n, -x y modo estricto.',
    breakdown: [
      { token: '#!/usr/bin/env bash', meaning: 'shebang portable: busca Bash en el PATH (no asume /bin/bash)' },
      { token: './script.sh', meaning: 'ejecuta vía shebang (exige chmod +x), en proceso hijo' },
      { token: 'bash script.sh', meaning: 'fuerza Bash ignorando el shebang, sin necesitar +x' },
      { token: 'source script.sh', meaning: 'ejecuta EN TU SHELL (carga funciones/vars; ¡exit te cierra!)' },
      { token: 'bash -n script.sh', meaning: 'valida sintaxis SIN ejecutar' },
      { token: 'bash -x script.sh', meaning: 'traza cada orden expandida (+ prefijo)' },
      { token: 'set -euo pipefail', meaning: 'estricto: falla→sale, var indefinida→error, pipe→peor tramo' },
    ],
    examples: [
      { desc: 'validar, revisar y ejecutar', lines: ['bash -n deploy.sh', 'shellcheck deploy.sh', 'chmod +x deploy.sh', './deploy.sh prod'] },
      { desc: 'depurar solo una zona', lines: ['set -x', '# …zona sospechosa…', 'set +x'] },
    ],
    whatHappens: './ pide al kernel que lance el intérprete del shebang en un hijo; bash lo lanza tú a mano; source no crea proceso. -n/-x son modos del propio intérprete.',
    errors: [{ symptom: 'bad interpreter: No such file or directory.', fix: 'Shebang con ruta inexistente o fichero con finales Windows (CRLF): usa /usr/bin/env bash y convierte con sed -i "s/\\r$//".' }],
    related: ['set', 'source', 'command', 'type-cmd'],
    intents: ['ejecutar script bash', 'shebang', 'depurar script bash', 'bash -x', 'modo estricto bash', 'set -euo pipefail', 'source vs ejecutar'],
  },
  {
    id: 'printf', name: 'printf', cat: 'bash-shell', distro: ['arch', 'debian', 'alpine'], important: true,
    summary: 'Impresión con formato (%s %d): predecible donde echo varía. El estándar en scripts.',
    breakdown: [
      { token: 'printf "%s\\n" texto', meaning: '%s = string (printf NO añade salto solo: pon \\n)' },
      { token: 'printf "%d" 42', meaning: '%d = entero; %f = decimal; %x = hexadecimal' },
      { token: 'printf "%-10s %5d\\n"', meaning: 'ancho y alineación (- = izquierda): tablas en terminal' },
      { token: 'printf "%s\\n" "${arr[@]}"', meaning: 'repite el formato por CADA argumento (uno por línea)' },
      { token: 'printf -v var "…"', meaning: 'guarda en $var en vez de imprimir (Bash)' },
    ],
    examples: [
      { desc: 'tabla alineada', lines: ['printf "%-10s %5d\\n" "nombre" "puntos"', 'printf "%-10s %5d\\n" "ana" 128'] },
      { desc: 'un elemento por línea', lines: ['printf "%s\\n" "${hosts[@]}"'] },
    ],
    whatHappens: 'printf aplica el formato al primer argumento y lo REUTILIZA con los siguientes: con N args imprime N veces. Sin \\n no hay salto (a diferencia de echo).',
    errors: [{ symptom: 'Todo sale en una sola línea.', fix: 'Falta \\n en el formato: printf no lo añade solo.' }],
    related: ['read', 'bash-invoke'],
    intents: ['imprimir formato bash', 'printf ejemplos', 'tabla terminal bash', 'echo vs printf'],
  },
  {
    id: 'test-brackets', name: '[[ ]]', cat: 'bash-shell', distro: ['arch', 'debian', 'alpine'], important: true,
    summary: 'Tests modernos de Bash: comparaciones, && ||, globs == y regex =~. Mejor que [ ].',
    breakdown: [
      { token: '[[ $n -ge 18 ]]', meaning: 'numérico: -eq -ne -lt -le -gt -ge (NO uses > <)' },
      { token: '[[ $a == *.txt ]]', meaning: 'glob a la derecha de == (sin comillas el patrón)' },
      { token: '[[ $f =~ ^[a-z]+\\.txt$ ]]', meaning: '=~ regex extendida (el patrón mejor sin comillas)' },
      { token: '[[ -n $x && -f $f ]]', meaning: 'lógica interna && || ! (con [ ] no existe)' },
      { token: '[[ -z ${v:-} ]]', meaning: 'vacía o indefinida (seguro SIN set -u)' },
      { token: '[ … ] / test', meaning: 'clásico POSIX: portable a sh, pero exige quoting y no tiene globs' },
    ],
    examples: [
      { desc: 'guardas típicas', lines: ['[[ $# -ge 1 ]] || { echo "Uso: $0 FICHERO" >&2; exit 2; }', '[[ -f $conf && -r $conf ]] || exit 1'] },
      { desc: 'validar nombre simple', lines: ['[[ $nombre =~ ^[a-z0-9_-]+$ ]] && echo "nombre válido"'] },
    ],
    whatHappens: '[[ ]] es sintaxis del shell (no un comando): no trocea variables vacías ni interpreta > como redirección. [ es el comando test con sus reglas antiguas.',
    errors: [{ symptom: '[: too many arguments con [ $x = y ].', fix: 'Si $x está vacío, [ ve «= y»: cita ("$x") o migra a [[ ]].' }],
    related: ['bash-invoke', 'param-expansion'],
    intents: ['doble corchete bash', 'comparar numeros bash', 'regex bash', 'test archivos bash', 'corchetes simples vs dobles'],
  },
  {
    id: 'param-expansion', name: '${var…}', cat: 'bash-shell', distro: ['arch', 'debian', 'alpine'],
    summary: 'Expansión de parámetros: ${v:-def}, ${v:?err}, ${#v}, ${v^^}, ${v/a/b}, ${v##*/}.',
    breakdown: [
      { token: '${v:-def}', meaning: 'valor o «def» si vacía/indefinida (sin asignar)' },
      { token: '${v:?mensaje}', meaning: 'aborta con «mensaje» si falta (validación de args)' },
      { token: '${#v}', meaning: 'LONGITUD del valor' },
      { token: '${v^^} ${v,,}', meaning: 'a MAYÚSCULAS / minúsculas (Bash 4+)' },
      { token: '${v/a/b}', meaning: 'sustituye 1.ª «a» por «b» (// para todas)' },
      { token: '${v##*/} ${v%.*}', meaning: 'basename (quita hasta /) / sin extensión (quita desde .)' },
      { token: '${v:2:3}', meaning: 'subcadena: desde pos 2, tres caracteres' },
    ],
    examples: [
      { desc: 'args con defecto y exigido', lines: ['ext="${2:-log}"', 'dir="${1:?Uso: $0 DIR}"'] },
      { desc: 'nombre base y sin extensión', lines: ['f=/etc/nginx/nginx.conf', 'echo "${f##*/}"   # nginx.conf', 'echo "${f%.*}"     # /etc/nginx/nginx'] },
    ],
    related: ['bash-invoke', 'declare-arrays'],
    intents: ['valor por defecto bash', 'validar argumento bash', 'longitud string bash', 'basename bash', 'sustituir texto variable bash'],
  },
  {
    id: 'declare-arrays', name: 'declare', cat: 'bash-shell', distro: ['arch', 'debian', 'alpine'],
    summary: 'Tipar variables: -A mapas, -a arrays, -i enteros, -r solo-lectura, -x exportar.',
    breakdown: [
      { token: 'declare -A mapa', meaning: 'array ASOCIATIVO (clave→valor, Bash 4+)' },
      { token: 'declare -a arr', meaning: 'array indexado explícito' },
      { token: 'declare -i n=0', meaning: 'entero: asignaciones se evalúan como aritmética' },
      { token: 'declare -r PI=3', meaning: 'solo lectura (constante práctica)' },
      { token: 'declare -x VAR=1', meaning: 'equivale a export (marca para hijos)' },
      { token: 'mapfile -t arr < f', meaning: 'carga líneas de fichero a array (sinónimo: readarray)' },
    ],
    examples: [
      { desc: 'mapa de puertos', lines: ['declare -A puerto=( [http]=80 [https]=443 )', 'echo "${puerto[https]}"'] },
      { desc: 'cargar servidores', lines: ['mapfile -t hosts < servidores.txt', 'echo "${#hosts[@]} servidores"'] },
    ],
    errors: [{ symptom: 'declare: -A: invalid option (en macOS).', fix: 'Bash 3.2 de fábrica: brew install bash para mapas y ${v^^}.' }],
    related: ['export', 'param-expansion', 'read'],
    intents: ['array asociativo bash', 'declare bash', 'mapfile bash', 'cargar fichero a array', 'constante bash'],
  },
  {
    id: 'args-getopts', name: 'getopts', cat: 'bash-shell', distro: ['arch', 'debian', 'alpine'],
    summary: 'Flags -v y -f valor como los grandes: getopts, OPTARG, OPTIND y shift.',
    breakdown: [
      { token: 'getopts ":vf:h" opt', meaning: ': inicial = errores los gestionas tú; v flag; f: exige valor; h ayuda' },
      { token: '$OPTARG', meaning: 'valor de la opción actual (-f datos → «datos»)' },
      { token: '?) / :)', meaning: 'ramas case: opción inválida / falta valor' },
      { token: 'shift $((OPTIND-1))', meaning: 'descarta los flags: "$@" = solo posicionales' },
      { token: 'shift', meaning: 'rota $1 fuera ($2→$1): separar destino de fuentes' },
    ],
    examples: [
      { desc: 'esqueleto con flags', lines: ['while getopts ":vf:h" opt; do', '  case "$opt" in v) verbose=1;; f) archivo="$OPTARG";;', '  h) echo "Uso: $0 [-v] [-f FICHERO]"; exit 0;;', '  \\?) echo "inválida: -$OPTARG" >&2; exit 2;;', '  :) echo "falta valor: -$OPTARG" >&2; exit 2;; esac', 'done', 'shift $((OPTIND - 1))'] },
    ],
    related: ['bash-invoke', 'param-expansion'],
    intents: ['flags script bash', 'getopts ejemplos', 'opciones con valor bash', 'shift bash', 'OPTARG'],
  },
  {
    id: 'select-loop', name: 'select', cat: 'bash-shell', distro: ['arch', 'debian', 'alpine'], important: true,
    summary: 'Menús numerados en 5 líneas: lista → número → $REPLY + variable → case → break.',
    breakdown: [
      { token: 'select op in A B C; do', meaning: 'muestra 1)A 2)B 3)C y REPITE (es un bucle)' },
      { token: 'PS3="Elige: "', meaning: 'prompt del menú (por defecto «#? »)' },
      { token: '$REPLY', meaning: 'NÚMERO tecleado tal cual (9 aunque no exista)' },
      { token: '$op', meaning: 'TEXTO elegido (vacío si el número es inválido)' },
      { token: 'case "$op" … *)', meaning: '*) atrapa lo inválido; break sale del menú' },
    ],
    examples: [
      { desc: 'menú mínimo', lines: ['PS3="Elige: "', 'select op in "Ver" "Salir"; do', '  case "$op" in "Ver") ls;; "Salir") break;; *) echo "«$REPLY» no válido";; esac', 'done'] },
    ],
    whatHappens: 'select lee un número, asigna texto a tu variable y número a REPLY, ejecuta el cuerpo y VUELVE al menú. Sin break no termina (salvo Ctrl+C).',
    related: ['read', 'bash-invoke'],
    intents: ['menu bash', 'select ejemplos', 'PS3', 'REPLY', 'menu interactivo terminal', 'opcion invalida select'],
  },
  {
    id: 'redir-combos', name: '2>&1 &>', cat: 'pipes-redir', distro: ['arch', 'debian', 'alpine'], important: true,
    summary: 'Combinar stderr con stdout: >f 2>&1, &>, &>>, |& y el orden que lo decide todo.',
    breakdown: [
      { token: '> f 2>&1', meaning: 'TODO al fichero (portable sh): stderr duplica el destino vigente' },
      { token: '&> f · &>> f', meaning: 'atajos Bash: ambos (truncando / añadiendo)' },
      { token: '2>&1 | …', meaning: 'stderr ENTRA al pipe (sin esto escapa)' },
      { token: '|&', meaning: 'atajo Bash de 2>&1 | (pipe con errores)' },
      { token: '2> >(tee e.log)', meaning: 'sustitución de proceso: stderr a un comando, no a fichero' },
      { token: '2>&1 > f (¡MAL!)', meaning: 'stderr queda en la pantalla vieja: el orden importa' },
    ],
    examples: [
      { desc: 'compilar viendo y guardando TODO', lines: ['make 2>&1 | tee build.log | grep -i error'] },
      { desc: 'silenciar TODO (stdout+stderr)', lines: ['./ruidoso.sh &>/dev/null'] },
    ],
    whatHappens: 'Las redirecciones se aplican de izquierda a derecha: 2>&1 copia el destino ACTUAL del fd 1 en ese punto. Después del > es el fichero; antes, la pantalla.',
    errors: [{ symptom: 'El log sale «limpio» pero hubo errores en pantalla.', fix: 'Falta el 2>&1 (o &>): > solo captura stdout.' }],
    related: ['redir-2gt', 'redir-gt', 'pipe-op', 'tee'],
    intents: ['unir stderr stdout', 'todo a un fichero bash', 'errores al pipe', 'orden redirecciones bash', 'silenciar salida bash'],
  },
]
