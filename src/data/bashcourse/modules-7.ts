import type { BashLesson } from './types'

/* Módulos nuevos del curso Bash: menús select y carga fichero→array.
   Se importan desde modules-2 (tras bucles) y modules-3 (tras arrays). */

export const LESSON_MENUS_SELECT: BashLesson = {
  id: 'menus-select',
  num: '10',
  title: 'Menús con select',
  level: 'beginner',
  minutes: 20,
  goals: [
    'Crear menús numerados con select en 5 líneas',
    'Distinguir $REPLY (número) de tu variable (texto)',
    'Validar opciones inválidas y salir con break',
  ],
  simple: [
    'select VAR in lista; do … done muestra la lista numerada, lee un número y REPITE hasta un break: es un bucle, no un simple print.',
    '$REPLY guarda el NÚMERO tecleado tal cual; tu variable guarda el TEXTO elegido (o vacío si el número no existe). PS3 es el prompt.',
  ],
  technical: [
    'Inválido (número inexistente, texto, Enter vacío) → variable vacía + rama *) de case + el bucle VUELVE. Valida con [[ -n $var ]].',
    'PS3 admite ámbito local dentro de funciones: local PS3="…". select en función + case = CLIs por menús reutilizables.',
    'La lista puede venir de una expansión: select f in *.sh genera un menú de scripts existentes.',
  ],
  keyCommands: [
    { name: 'select', syntax: 'select VAR in A B; do …; done', what: 'bucle de menú: numera, lee y repite' },
    { name: 'PS3', syntax: 'PS3="Elige: "', what: 'prompt del menú (por defecto «#? »)' },
    { name: 'REPLY', syntax: '$REPLY', what: 'número tecleado, sin validar' },
    { name: 'break', syntax: 'break', what: 'sale del select (obligatorio en «Salir»)' },
  ],
  examples: [
    { caption: 'menú canónico select + case', lines: ['PS3="Selecciona una opción: "', '', 'select opcion in "Ver archivos" "Procesos" "Salir"; do', '  case "$opcion" in', '    "Ver archivos") ls ;;', '    "Procesos") ps --no-headers | head -5 ;;', '    "Salir") echo "Adiós"; break ;;', '    *) echo "Opción no válida: $REPLY" ;;', '  esac', 'done'] },
    { caption: 'select reutilizable en función', lines: ['elegir_fruta() {', '  local fruta', '  local PS3="Fruta (1-3): "', '  select fruta in Manzana Pera Uva; do', '    if [[ -n $fruta ]]; then', '      echo "Elegiste: $fruta (n.º $REPLY)"; break', '    fi', '    echo "«$REPLY» no está en la lista."', '  done', '}'] },
  ],
  breakdowns: [
    {
      caption: 'select opcion in "A" "B"; do …',
      tokens: [
        { token: 'select opcion in …', meaning: 'muestra 1) 2) y guarda el TEXTO en $opcion' },
        { token: '$REPLY', meaning: 'el NÚMERO crudo que tecleó el usuario' },
        { token: 'case … *)', meaning: '*) atrapa números inexistentes y texto' },
        { token: 'break', meaning: 'abandona el bucle (sin él, el menú vuelve)' },
      ],
    },
  ],
  exercises: [
    {
      id: 'b28e1', kind: 'predict',
      question: 'select x in "A" "B"; do echo "$REPLY-$x"; break; done — el usuario teclea 2. ¿Qué se imprime?',
      options: [
        { text: '2-B', why: '$REPLY = número tecleado (2); $x = texto de la posición 2 (B).' },
        { text: 'B-2', why: 'El echo imprime $REPLY primero: número, guion, texto.' },
        { text: '1-A', why: 'REPLY refleja lo TECLEADO (2), no la primera opción.' },
        { text: '2- (vacío)', why: '2 existe en la lista: $x contendría B.' },
      ],
      answer: 0,
      solutionLines: ['select x in "A" "B"; do echo "$REPLY-$x"; break; done', '# teclea 2 → 2-B'],
      explanation: '$REPLY = número crudo. Tu variable = texto (o vacío si el número no existe).',
    },
    {
      id: 'b28e2', kind: 'choice',
      question: 'Menú de 3 opciones y el usuario teclea 9. ¿Qué contienen $REPLY y $opcion?',
      options: [
        { text: '$REPLY=9 y $opcion vacío: cae en *)', why: 'REPLY guarda lo tecleado siempre; la variable solo se asigna si el número existe.' },
        { text: 'Ambos vacíos y el menú termina', why: 'REPLY conserva el 9 y el bucle CONTINÚA: es un bucle.' },
        { text: '$REPLY=3 y $opcion con la 3.ª', why: 'select no ajusta nada: lo inválido es vacío.' },
        { text: 'Error de sintaxis', why: 'Es flujo normal, no error: por eso existe la rama *).' },
      ],
      answer: 0,
      solutionLines: ['select op in A B C; do', '  case "$op" in', '    *) echo "«$REPLY» no válido" ;;', '  esac', 'done'],
      explanation: 'Inválido = variable vacía + *) + el menú vuelve. Valida con [[ -n $op ]].',
    },
    {
      id: 'b28e3', kind: 'write',
      question: '¿Qué variable especial guarda el NÚMERO tecleado en un select? (incluye el $)',
      accept: ['$reply'],
      placeholder: '$…',
      solutionLines: ['echo "$REPLY"   # número crudo, sin validar'],
      explanation: 'REPLY = número. Tu variable = texto. PS3 = prompt. case = acción. break = salir.',
    },
  ],
  challenge: {
    text: 'Escribe admin.sh: menú con Disco (df -h /), Memoria (free -h), Uptime (uptime -p) y Salir (break). Cada opción llama a una función.',
    hints: ['select op in …; do case "$op" en …; *) para inválidas', 'PS3 personalizado antes del select', 'La opción Salir lleva break, las demás vuelven al menú'],
    solutionLines: ['#!/usr/bin/env bash', 'ver_disco() { df -h / | tail -1; }', 'ver_mem() { free -h | head -2; }', 'PS3="Elige informe (1-4): "', 'select op in Disco Memoria Uptime Salir; do', '  case "$op" in', '    Disco) ver_disco ;;', '    Memoria) ver_mem ;;', '    Uptime) uptime -p ;;', '    Salir) echo Adiós; break ;;', '    *) echo "«$REPLY» no es válido" ;;', '  esac', 'done'],
  },
  summary: [
    'select = bucle de menú: PS3 pregunta, $REPLY número, tu variable texto.',
    'Inválido → variable vacía + *) + el menú vuelve: valida siempre.',
    'Sin break no se sale: la opción de salida lo lleva obligatoriamente.',
  ],
}

export const LESSON_MAPFILE: BashLesson = {
  id: 'mapfile',
  num: '15',
  title: 'Mapfile: fichero a array',
  level: 'intermediate',
  minutes: 15,
  goals: [
    'Cargar un fichero en un array con mapfile/readarray',
    'Entender por qué el pipe evaporaría el array (subshell)',
    'Elegir entre mapfile y while read según el caso',
  ],
  simple: [
    'mapfile -t arr < fichero guarda CADA LÍNEA como un elemento del array (-t quita el salto final). readarray es su sinónimo moderno.',
    'OJO: cat f | mapfile arr PIERDE el array: el pipe ejecuta mapfile en un subshell hijo y las variables mueren con él. Usa siempre la redirección <.',
  ],
  technical: [
    'Flags útiles: -n N (lee como mucho N líneas), -s N (salta las N primeras), -d X (delimitador distinto de \\n), -c/-C (callback cada N líneas para progreso).',
    'mapfile = cargar TODO de golpe (simple, memoria proporcional). while IFS= read -r = procesar en streaming (memoria constante). Ficheros enormes → while.',
  ],
  keyCommands: [
    { name: 'mapfile', syntax: 'mapfile -t arr < fichero', what: 'líneas → elementos (sin subshell con <)' },
    { name: 'readarray', syntax: 'readarray -t arr < fichero', what: 'sinónimo moderno de mapfile' },
  ],
  examples: [
    { caption: 'cargar y usar', lines: ['mapfile -t hosts < servidores.txt', 'echo "servidores: ${#hosts[@]}"', 'printf "%s\\n" "${hosts[@]}" | grep -v "^#"'] },
    { caption: 'con límites', lines: ['mapfile -t -n 10 primeras < largo.log   # solo 10', 'mapfile -t -s 5 resto < largo.log      # salta 5'] },
  ],
  breakdowns: [
    {
      caption: 'mapfile -t arr < fichero',
      tokens: [
        { token: '-t', meaning: 'quita el \\n final de cada línea' },
        { token: 'arr', meaning: 'array destino (se crea si no existe)' },
        { token: '< fichero', meaning: 'redirección: mismo proceso, sin subshell' },
      ],
    },
  ],
  exercises: [
    {
      id: 'b29e1', kind: 'write',
      question: 'Carga las líneas de servidores.txt en el array hosts (una línea por elemento):',
      accept: ['mapfile -t hosts < servidores.txt', 'readarray -t hosts < servidores.txt'],
      placeholder: '… hosts < servidores.txt',
      solutionLines: ['mapfile -t hosts < servidores.txt', 'echo "${#hosts[@]} servidores"'],
      explanation: '-t quita saltos; < evita el subshell del pipe. Sin -t cada elemento acabaría en \\n.',
    },
    {
      id: 'b29e2', kind: 'predict',
      question: 'cat hosts.txt | mapfile -t arr; echo ${#arr[@]} — ¿qué imprime y por qué?',
      options: [
        { text: '0: el pipe aísla mapfile en un subshell y el array se evapora', why: 'Cada tramo del pipe es proceso hijo: las asignaciones no sobreviven al padre.' },
        { text: 'El número real de líneas', why: 'El array SÍ se llena… pero en el hijo, que muere al acabar el pipe.' },
        { text: 'Error de sintaxis', why: 'Sintaxis válida: el problema es semántico (subshell).' },
        { text: '1 (todo el fichero como un elemento)', why: 'mapfile trocea por líneas igualmente; el problema es DÓNDE vive el array.' },
      ],
      answer: 0,
      solutionLines: ['mapfile -t arr < hosts.txt   # así sí', 'echo "${#arr[@]}"'],
      explanation: 'El mismo bug que while read con pipe: redirección < en vez de tubería.',
    },
  ],
  challenge: {
    text: 'Carga servidores.txt con mapfile, filtra las líneas que empiecen por # y haz ping -c1 a cada host restante con for + "${hosts[@]}".',
    hints: ['mapfile -t todos < servidores.txt', 'for h in "${todos[@]}"; do [[ $h == \\#* ]] && continue; …', '"${…[@]}" citado respeta espacios'],
    solutionLines: ['mapfile -t todos < servidores.txt', 'for h in "${todos[@]}"; do', '  [[ $h == \\#* || -z $h ]] && continue', '  ping -c1 "$h"', 'done'],
  },
  summary: [
    'mapfile -t arr < f = fichero a array, sin bucles ni subshells.',
    'cat f | mapfile pierde el array: el pipe es un subshell.',
    'Todo de golpe → mapfile; streaming con lógica → while read.',
  ],
}
