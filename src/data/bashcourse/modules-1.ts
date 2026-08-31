import type { BashLesson } from './types'

export const MODULES_1: BashLesson[] = [
  /* ================================ 01 ¿QUÉ ES BASH? ================================ */
  {
    id: 'que-es-bash',
    num: '01',
    title: '¿Qué es Bash?',
    level: 'beginner',
    minutes: 12,
    goals: [
      'Entender qué son terminal, shell y Bash y cómo se relacionan',
      'Conocer los tres flujos estándar de todo proceso',
      'Saber qué significa el exit status de un comando',
    ],
    simple: [
      'Cuando abres una «terminal» lo que ves es una ventana. Dentro corre un programa llamado shell que lee lo que tecleas, lo interpreta y ejecuta comandos.',
      'Bash (Bourne Again Shell) es la shell por defecto en la mayoría de distribuciones Linux. Es a la vez intérprete interactivo y lenguaje de scripting: lo mismo que haces a mano puedes guardarlo en un archivo y automatizarlo.',
      'Todo comando que Bash lanza tiene tres «tuberías» conectadas: stdin (entrada), stdout (salida normal) y stderr (errores). Y al terminar devuelve un número: el exit status (0 = bien, distinto de 0 = algo falló).',
    ],
    technical: [
      'Bash implementa POSIX sh añadiendo extensiones (arrays, [[ ]], process substitution). Cuando escribes una línea, Bash tokeniza, expande (variables, globs, llaves), resuelve redirecciones y recién entonces hace fork+exec del binario encontrado en PATH — o ejecuta builtin/función sin crear proceso.',
      'Los descriptores 0/1/2 apuntan por defecto al tty. El kernel no sabe de «mensajes de error»: stderr es solo otra corriente que las herramientas usan por convención para diagnósticos, dejando stdout limpio para datos (clave para pipes).',
    ],
    keyCommands: [
      { name: 'echo', syntax: 'echo [opciones] texto...', what: 'Imprime sus argumentos seguidos de un salto de línea.', exit: '0 salvo error de escritura' },
      { name: 'type', syntax: 'type comando', what: 'Revela CÓMO resolverá Bash ese nombre: alias, función, builtin o ruta de binario.' },
    ],
    examples: [
      { caption: 'tu primera conversación con Bash', lines: ['echo "Hola, ArchForge"', 'whoami', 'pwd'] },
      {
        caption: 'los tres flujos existen aunque no los veas',
        lines: ['# stdout va a pantalla:', 'ls /etc/os-release', '# stderr también (pero es otro flujo):', 'ls /no-existe'],
      },
    ],
    breakdowns: [
      {
        caption: 'anatomía de una línea de comando',
        tokens: [
          { token: 'echo', meaning: 'el programa (o builtin) que Bash ejecutará' },
          { token: '"Hola, ArchForge"', meaning: 'UN argumento (las comillas evitan que el espacio lo divida en dos)' },
          { token: '[Enter]', meaning: 'Bash lee, expande, ejecuta y vuelve a mostrar el prompt' },
        ],
      },
    ],
    exercises: [
      {
        id: 'b1e1', kind: 'choice',
        question: '¿Cuál es la diferencia principal entre terminal y shell?',
        options: [
          { text: 'Son sinónimos exactos', why: 'Se confunden en el habla diaria, pero técnicamente son capas distintas.' },
          { text: 'La terminal es la ventana/interfaz; la shell es el programa que interpreta tus comandos dentro', why: 'Correcto: Alacritty/Konsole son terminales; bash/zsh son shells. Puedes cambiar una sin la otra.' },
          { text: 'La shell dibuja las ventanas', why: 'El entorno gráfico/terminal emuladora dibuja; la shell solo procesa texto.' },
          { text: 'La terminal solo existe en servidores', why: 'Existe en cualquier sistema: es la interfaz de texto.' },
        ],
        answer: 1,
        solutionLines: ['type bash', 'echo $SHELL'],
        explanation: 'type te dice cómo Bash resuelve un nombre y $SHELL muestra tu shell de login. Con esto verificas qué estás usando realmente.',
      },
      {
        id: 'b1e2', kind: 'predict',
        question: '¿Qué imprimirá esta secuencia (y en qué flujo va cada cosa)?',
        context: '$ echo "todo bien"\n$ ls /directorio-inexistente\n$ echo $?   # segundo echo',
        options: [
          { text: '«0» porque echo siempre funciona', why: '$? refleja el comando ANTERIOR: ls falló antes del primer echo.' },
          { text: '«2» — el código de error de ls; y «todo bien»/error van por flujos distintos', why: 'ls fallido devuelve ≠0 (2 típico). El mensaje de ls sale por stderr, «todo bien» por stdout.' },
          { text: 'Nada: $? no existe en Bash', why: 'Existe desde Bourne shell: es el parámetro especial del último exit status.' },
          { text: 'Depende del día', why: 'Es determinista: cada comando fija su código al terminar.' },
        ],
        answer: 1,
        solutionLines: ['ls /directorio-inexistente; echo "exit=$?"'],
        explanation: 'El exit status es EL mecanismo con el que scripts toman decisiones (if) y encadenan (&& ||). Memoriza: 0 éxito, 1-255 fallo.',
      },
    ],
    sim: {
      intro: 'Prueba tus primeros comandos. Esta terminal simula Bash: nada toca tu equipo real.',
      tasks: ['Ejecuta whoami y pwd', 'Prueba cat /etc/os-release', 'Provoca un error: cat /no-existe y observa el estilo del error', 'Lanza help para ver el alcance de la simulación'],
    },
    summary: [
      'Terminal = interfaz; shell = intérprete; Bash = la shell dominante en Linux.',
      'stdin(0)/stdout(1)/stderr(2): separar datos de errores permite componer comandos.',
      'Exit status: 0 correcto, ≠0 fallo. $? lo consulta; if/&&/|| dependen de él.',
    ],
  },

  /* ============================== 02 PRIMEROS COMANDOS ============================== */
  {
    id: 'primeros-comandos',
    num: '02',
    title: 'Primeros comandos',
    level: 'beginner',
    minutes: 15,
    goals: [
      'Moverte por el filesystem y ver contenido con soltura',
      'Distinguir opciones, argumentos y sintaxis',
      'Consultar ayuda sin salir de la terminal',
    ],
    simple: [
      'Estos seis comandos cubren el 80% del trabajo diario: pwd (¿dónde estoy?), ls (qué hay), cd (muéveme), echo (imprime), clear (limpia) y man/history/type/which/command para ayuda e introspección.',
      'Una opción modifica el comportamiento (-l, -a); un argumento es sobre QUÉ actúa (/etc). Se combinan: ls -la /etc.',
    ],
    technical: [
      'cd es builtin: cambia el directorio del PROPIO proceso shell (un hijo no podría). printf es preferible a echo en scripts: interpreta formato tipo C y NO añade \\n automático, evitando sorpresas con textos que empiezan por -n.',
      'command -v X resuelve sin ejecutar (ideal para checks); which busca solo en PATH; type además revela funciones/alias/builtins. history vive en memoria y se vuelca a ~/.bash_history al cerrar.',
    ],
    keyCommands: [
      { name: 'pwd', syntax: 'pwd', what: 'Ruta absoluta actual.', exit: '0' },
      { name: 'ls', syntax: 'ls [-lah] [ruta]', what: '-l largo, -a ocultos, -h tamaños legibles, -S por tamaño, -t por fecha.', exit: '0; 2 si ruta inexistente' },
      { name: 'cd', syntax: 'cd [ruta] · cd .. · cd - · cd', what: '.. sube; - vuelve a la anterior; sin args → $HOME.', exit: '0; 1 si no existe/sin permiso' },
      { name: 'printf', syntax: 'printf FORMATO [args]', what: 'Salida con formato (%s %d) sin \\n automático.', exit: '0 salvo formato inválido' },
      { name: 'man', syntax: 'man comando', what: 'Manual completo (q sale, /busca).', exit: '0' },
      { name: 'history', syntax: 'history', what: 'Lista comandos previos; !N re-ejecuta.', exit: '0' },
    ],
    examples: [
      { caption: 'explorar', lines: ['pwd', 'ls -lah', 'cd /var/log && pwd', 'cd -'] },
      { caption: 'printf vs echo', lines: ["printf 'sin salto final '", 'echo "(ahora sí)"', "printf '%s tiene %s años\\n' Ana 30"] },
      { caption: 'ayuda e introspección', lines: ['type ls', 'command -v python3 || echo "python3 no está"', 'history | tail -5'] },
    ],
    breakdowns: [
      { caption: 'ls -la /etc', tokens: [
        { token: 'ls', meaning: 'programa: listar' },
        { token: '-la', meaning: 'OPCIÓN compuesta: -l (formato largo) + -a (incluir ocultos)' },
        { token: '/etc', meaning: 'ARGUMENTO: sobre qué directorio actuar' },
      ] },
    ],
    sim: {
      intro: 'Explora este mini-filesystem. Recuerda: cat fichero muestra el contenido.',
      files: {
        '/home/usuario/notas.txt': 'comprar café\nestudiar bash\ndesmontar la luna',
        '/home/usuario/proyectos/web/index.html': '<h1>hola</h1>',
        '/etc/config.conf': 'modo=estricto',
      },
      tasks: ['Crea carpeta practica con mkdir y entra con cd', 'Lista su contenido con ls -la', 'Vuelve atrás con cd .. y comprueba con pwd', 'Lee notas.txt con cat', 'Usa history y re-ejecuta uno con !N'],
    },
    exercises: [
      {
        id: 'b2e1', kind: 'write',
        question: 'Comando para listar TODOS los archivos (incluidos los ocultos) en formato largo del directorio /etc:',
        accept: ['ls -la /etc', 'ls -al /etc'],
        placeholder: '$ ls …',
        solutionLines: ['ls -la /etc'],
        explanation: '-l formato largo + -a all. Las opciones pueden juntarse tras un único guion. El orden interno de letras da igual: -al == -la.',
      },
      {
        id: 'b2e2', kind: 'choice',
        question: 'Estás en /home/tu/proyecto/sub. ¿Qué hace cd ../..?',
        options: [
          { text: 'Va a /home', why: '../.. sube DOS niveles desde sub: primero proyecto, luego tu → /home/tu… cuidado: queda /home/tu.' },
          { text: 'Sube dos niveles: de sub a proyecto y de proyecto a tu', why: 'Cada .. consume un nivel. Para /home necesitarías tres ../.' },
          { text: 'Va a la raíz /', why: 'Ir a raíz directo sería cd /. Los .. solo suben un nivel cada uno.' },
          { text: 'Error: no se puede repetir ..', why: 'Se repiten libremente: ../../../../ hasta la raíz si quieres.' },
        ],
        answer: 1,
        solutionLines: ['cd /home/tu/proyecto/sub', 'cd ../..', 'pwd'],
        explanation: 'pwd después confirma dónde acabaste. cd - alternaría con la ruta previa.',
      },
    ],
    challenge: {
      text: 'Sin salir de tu home: crea la estructura practica/{docs,fotos}, entra en docs, verifica con pwd que la ruta es la esperada y vuelve a home con un único comando sin argumentos.',
      hints: ['Las llaves {} crean varias carpetas de golpe', 'mkdir -p acepta la expansión completa', 'cd sin parámetros SIEMPRE lleva a $HOME'],
      solutionLines: ['mkdir -p practica/{docs,fotos}', 'cd practica/docs', 'pwd', 'cd'],
    },
    summary: [
      'opción (-x) modifica; argumento indica objetivo; se combinan libremente.',
      'cd es builtin y cd - alterna rutas; printf es el echo serio para scripts.',
      'type/command -v responden «¿qué es X y de dónde sale?» antes de ejecutar nada.',
    ],
  },

  /* ================================== 03 VARIABLES ================================== */
  {
    id: 'variables',
    num: '03',
    title: 'Variables',
    level: 'beginner',
    minutes: 18,
    goals: [
      'Asignar y usar variables sin caer en los errores clásicos',
      'Entender cuándo usar comillas dobles y nunca separar con espacios',
      'Diferenciar variable de shell vs variable exportada',
    ],
    simple: [
      'Una variable guarda un valor para usarlo luego: NOMBRE="Ana" la crea; "$NOMBRE" la usa. Las reglas de oro: SIN espacios alrededor del =, y entre comillas dobles AL EXPANDIRLA.',
      'readonly congela una variable (reasignar da error). unset la borra. export la publica a los programas que lances desde esa shell.',
    ],
    technical: [
      'Asignar es una sentencia del shell (por eso VAR = 1 ejecutaría el comando «VAR» con argumentos = y 1). La expansión $NOMBRE ocurre ANTES de que el comando vea los argumentos: sin comillas, si el valor contiene espacios, se divide en varios (word splitting) y además se aplican globs.',
      'export marca el atributo de exportación en la tabla del shell; los hijos reciben copias vía execve(environ). Modificar la variable en el padre no altera entornos ya lanzados. readonly usa la misma tabla con flag de solo lectura.',
    ],
    examples: [
      { caption: 'crear y usar', lines: ['NOMBRE="Ana"', 'echo "Hola, $NOMBRE"', 'echo "Sin comillas: $NOMBRE (igual aquí, pero cuidado fuera)"'] },
      { caption: 'los tres errores clásicos', lines: ['# MAL: espacios alrededor del =', 'EDAD = 30', '# BIEN:', 'EDAD=30', 'echo "$EDAD"'] },
      { caption: 'export, readonly, unset', lines: ['export EDITOR=vim', 'readonly PI=3.1416', 'PI=3', 'unset PI'] },
    ],
    breakdowns: [
      { caption: 'echo "Hola, $NOMBRE"', tokens: [
        { token: 'echo', meaning: 'builtin que imprime' },
        { token: '"..."', meaning: 'comillas dobles: PERMITEN la expansión y protegen espacios' },
        { token: '$NOMBRE', meaning: 'expansión: Bash sustituye el valor ANTES de pasar el argumento' },
      ] },
    ],
    exercises: [
      {
        id: 'b3e1', kind: 'write',
        question: 'Crea la variable CIUDAD con el valor Madrid y muéstrala en una frase entre comillas dobles (dos líneas).',
        accept: ['CIUDAD="Madrid" echo "Vivo en $CIUDAD"'],
        placeholder: '$ CIUDAD="Madrid" ↵ $ echo …',
        solutionLines: ['CIUDAD=Madrid', 'echo "Vivo en $CIUDAD"'],
        explanation: 'Dos líneas independientes: asignar y luego expandir. Ojo: hacer CIUDAD=X echo ... pondría CIUDAD solo en el ENTORNO de ese echo puntual, no en tu shell.',
      },
      {
        id: 'b3e2', kind: 'predict',
        question: 'FRASE="hola mundo". ¿Qué imprime echo $FRASE y qué imprime echo "$FRASE"?',
        context: '$ FRASE="hola mundo"',
        options: [
          { text: 'Ambos imprimen hola mundo idéntico', why: 'Visualmente igual AQUÍ, pero el mecanismo difiere: sin comillas hubo word splitting en dos argumentos.' },
          { text: 'Sin comillas: dos argumentos (hola y mundo) unidos por el espacio de echo; con comillas: UN argumento', why: 'Exacto: echo une sus args con espacio así que «parece» igual — hasta que cambias IFS o pasas la variable a otro comando.' },
          { text: 'Sin comillas imprime $FRASE literal', why: 'Solo las comillas SIMPLES bloquean la expansión.' },
          { text: 'Da error de sintaxis', why: 'Ambas formas son válidas; el peligro es semántico.' },
        ],
        answer: 1,
        solutionLines: ['FRASE="hola mundo"', 'printf "[%s]\\n" $FRASE', 'printf "[%s]\\n" "$FRASE"'],
        explanation: 'printf %s por argumento evidencia 2 vs 1. Regla profesional: SIEMPRE "$VAR" salvo que sepas exactamente por qué no.',
      },
      {
        id: 'b3e3', kind: 'write',
        question: 'Congela la constante VERSION en 2.0 usando readonly (una línea):',
        accept: ['readonly version="2.0"', 'readonly VERSION="2.0"', 'readonly version=2.0', 'readonly VERSION=2.0'],
        solutionLines: ['readonly VERSION="2.0"'],
        explanation: 'Tras readonly, cualquier reasignación produce «bash: VERSION: readonly variable» y exit status 1.',
      },
    ],
    challenge: {
      text: 'Define NOMBRE y APELLIDO; construye FULL con "$NOMBRE $APELLIDO"; imprímela; exporta FULL; y demuestra con env | grep FULL que viajó al entorno.',
      hints: ['Puedes construir una variable a partir de otras con comillas dobles', 'env lista el entorno exportado', 'grep filtra su salida'],
      solutionLines: ['NOMBRE="Grace"', 'APELLIDO="Hopper"', 'FULL="$NOMBRE $APELLIDO"', 'echo "$FULL"', 'export FULL', 'env | grep FULL'],
    },
    summary: [
      'ASIGNACIÓN sin espacios; USO entre comillas dobles.',
      "'literal' no expande · \"$var\" expande protegido · $var suelto arriesga splitting.",
      'export → entorno de hijos; readonly → anti-reasignación; unset → borrar.',
    ],
  },

  /* =============================== 04 ENTRADA DE DATOS =============================== */
  {
    id: 'entrada-datos',
    num: '04',
    title: 'Entrada de datos',
    level: 'beginner',
    minutes: 12,
    goals: [
      'Leer valores del usuario con read y sus variantes',
      'Leer de forma segura (evitar el bug clásico sin -r)',
      'Pedir datos sensibles sin eco en pantalla',
    ],
    simple: [
      'read detiene el script hasta que escribes algo y pulsas Enter: read NOMBRE guarda tu texto en $NOMBRE. Con -p muestras una pregunta; con -s ocultas lo tecleado (contraseñas).',
      'Usa SIEMPRE read -r. Sin -r, Bash se come las barras invertidas del texto introducido.',
    ],
    technical: [
      'read consume UNA línea de stdin, divide según IFS y asigna campo a campo a los nombres dados; el resto sobra en el último. -r desactiva el escape de backslash (POSIX: sin él, \\→ literal removal). -s pone el tty en modo no-eco (stty). -t N timeout, -n N limita caracteres.',
    ],
    keyCommands: [
      { name: 'read', syntax: 'read [-prs] [-p msg] VAR...', what: 'Lee una línea de stdin.', exit: '0 si leyó; ≠0 al llegar EOF o timeout' },
    ],
    examples: [
      { caption: 'preguntar y saludar', lines: ['read -p "¿Tu nombre? " NOMBRE', 'echo "Encantado, $NOMBRE"'] },
      { caption: 'contraseña oculta + confirmación de lectura', lines: ['read -rs -p "Contraseña: " PASS', 'echo', 'if [ -n "$PASS" ]; then echo "longitud: ${#PASS}"; else echo "vacía"; fi'] },
    ],
    breakdowns: [
      { caption: 'read -rs -p "Contraseña: " PASS', tokens: [
        { token: '-r', meaning: 'raw: respeta backslashes (siempre)' },
        { token: '-s', meaning: 'silent: no eco en pantalla' },
        { token: '-p "msg"', meaning: 'prompt mostrado antes de leer' },
        { token: 'PASS', meaning: 'variable destino (sin $ al ASIGNAR)' },
      ] },
    ],
    sim: {
      intro: 'Esta simulación no soporta read (necesita entrada interactiva de línea). Practica estos comandos en TU terminal real:',
      tasks: ['read -p "Nombre: " N && echo "Hola $N"', 'read -rs -p "PIN: " PIN && echo ok'],
    },
    exercises: [
      {
        id: 'b4e1', kind: 'write',
        question: 'Lectura segura preguntando «Ruta: » y guardando en RUTA:',
        accept: ['read -r -p "Ruta: " ruta', 'read -rp "Ruta: " ruta', 'read -r -p \'Ruta: \' ruta'],
        solutionLines: ['read -r -p "Ruta: " RUTA'],
        explanation: '-rp pueden pegarse. El prompt termina con espacio para que el cursor no quede pegado al texto.',
      },
      {
        id: 'b4e2', kind: 'predict',
        question: 'Entrada del usuario: mi\\archivo.txt (con barra invertida). ¿Guarda read VAR?',
        options: [
          { text: 'mi\\archivo.txt intacto', why: 'Solo con -r. Sin -r el backslash se procesa como escape.' },
          { text: 'miarchivo.txt — sin -r el \\ se elimina', why: 'Comportamiento histórico de read sin -r: \\<char> pasa a <char>. Por eso -r es obligatorio en código serio.' },
          { text: 'Error de sintaxis', why: 'No hay error: silenciosamente corrompe datos, peor aún.' },
          { text: 'Depende de mayúsculas', why: 'El tratamiento de \\ no depende del carácter siguiente más allá de ser imprimible.' },
        ],
        answer: 1,
        solutionLines: ['printf "mi\\\\archivo.txt\\n" | read -r VAR && echo "con -r: $VAR"', 'printf "mi\\\\archivo.txt\\n" | read VAR && echo "sin -r: $VAR"'],
        explanation: 'Pipeando una línea puedes comparar ambos comportamientos localmente. Conclusión: read SIN -r solo tiene sentido en retos arqueológicos.',
      },
    ],
    summary: [
      'read -p pregunta · -s oculta · -t/-n acotan · -r SIEMPRE.',
      'Varias variables reparten campos por IFS; el resto cae en la última.',
      'EOF/timeout devuelven ≠0: úsalo con while/read para recorrer ficheros.',
    ],
  },

  /* ============================ 05 COMILLAS Y EXPANSIÓN ============================= */
  {
    id: 'comillas-expansion',
    num: '05',
    title: 'Comillas y expansión',
    level: 'beginner',
    minutes: 20,
    goals: [
      'Dominar las tres clases de comillas y cuándo usar cada una',
      'Conocer las expansiones principales de Bash',
      'Predecir la salida de líneas con mezclas de comillas',
    ],
    simple: [
      'Comillas simples \'…\': TODO literal, nada se expande. Comillas dobles "…": las variables SÍ se expanden y los espacios quedan protegidos. Sin comillas: expansión + división por espacios + comodines activos.',
      'Expansiones que Bash hace antes de ejecutar: ${VAR} (valor), ${VAR:-defecto} (valor o defecto), $(comando) (su salida), $((2+3)) (aritmética), {a,b} y {1..5} (listas), ~ (tu home), *.txt (archivos que coinciden).',
    ],
    technical: [
      'Orden global: brace → tilde → parameter/arith/command subst → word splitting (IFS) → globbing → quote removal → exec. ${VAR:=def} ADEMÁS asigna; ${VAR:?msg} aborta con error — perfecto para requerir argumentos. $(cmd) anida mejor que las comillas invertidas heredadas. Dentro de comillas simples no existe escape alguno: para incluir una comilla simple cierra la cadena, escribe un backslash escapado y vuelve a abrir.',
    ],
    examples: [
      { caption: 'las tres comillas', lines: ['NOMBRE="mundo"', 'echo \'Hola $NOMBRE\'', 'echo "Hola $NOMBRE"', 'echo Hola $NOMBRE'] },
      { caption: 'parameter expansion útil', lines: ['FICHERO="informe.txt"', 'echo "${FICHERO%.txt}"', '${REQUERIDO:?falta REQUERIDO}', 'BACKUP="${FICHERO%.txt}.bak"', 'echo "$BACKUP"'] },
      { caption: 'command + arithmetic + braces', lines: ['HOY=$(date +%Y-%m-%d)', 'echo "backup-$HOY.tar.gz"', 'echo "2^10 = $((2**10))"', 'echo {a,b}{1..3}', 'touch prueba{1..3}.tmp && ls prueba*.tmp'] },
    ],
    breakdowns: [
      { caption: 'BACKUP="${FICHERO%.txt}.bak"', tokens: [
        { token: '${FICHERO%.txt}', meaning: 'expansión: quita el SUFIJO más corto .txt del valor' },
        { token: '.bak', meaning: 'se concatena literalmente al resultado' },
        { token: '"..."', meaning: 'protege si el resultado contiene espacios' },
      ] },
    ],
    sim: {
      intro: 'Juega con expansiones: echo con llaves y aritmética funcionan aquí.',
      tasks: ['echo {1..5}', 'echo "5*4 = $((5*4))"', 'X=hola; echo "${X^^}"'],
    },
    exercises: [
      {
        id: 'b5e1', kind: 'predict',
        question: 'VAR=uno; echo \'$VAR dos\' — ¿salida?',
        options: [
          { text: 'uno dos', why: 'Eso sería con comillas DOBLES.' },
          { text: '$VAR dos — literales', why: 'Comillas simples = cero expansión: Bash entrega el texto tal cual.' },
          { text: 'Error: variable no definida', why: 'No llega a evaluarse ninguna variable.' },
          { text: 'dos (solo)', why: 'Nada recorta: la cadena completa es literal.' },
        ],
        answer: 1,
        solutionLines: ["VAR=uno", "echo '$VAR dos'", 'echo "$VAR dos"'],
        explanation: 'Regla mnemónica: simples = foto fija; dobles = ventana con vista a las variables.',
      },
      {
        id: 'b5e2', kind: 'write',
        question: 'Copia backup_2026.txt a backup_2026.bak usando expansión de sufijo % (una línea, cp):',
        accept: ['cp backup_2026.txt backup_2026.bak'],
        placeholder: '$ cp …',
        solutionLines: ['F="backup_2026.txt"', 'cp "$F" "${F%.txt}.bak"'],
        explanation: '${F%.txt} recorta .txt; añades .bak. Patrón estándar para backups rotativos sin renombrar a mano.',
      },
      {
        id: 'b5e3', kind: 'choice',
        question: '¿Cuál NO es una expansión que haga Bash antes de ejecutar?',
        options: [
          { text: '{img1,img2}.png → dos nombres', why: 'Brace expansion: sí lo hace.' },
          { text: '$((7/2)) → 3', why: 'Aritmética entera: sí (división entera).' },
          { text: '|grep| → mágicamente filtra', why: 'Correcto: eso no existe. | conecta procesos; el filtrado lo hace el comando receptor.' },
          { text: '~/doc → /home/tu/doc', why: 'Tilde expansion: sí.' },
        ],
        answer: 2,
        solutionLines: ['echo {img1,img2}.png', 'echo $((7/2))', 'echo ~/doc'],
        explanation: 'Conocer la LISTA oficial de expansiones evita creerte magias inexistentes.',
      },
    ],
    challenge: {
      text: 'Genera con UNA línea de mkdir las carpetas 2024 2025 2026 dentro de logs/, y con otra línea imprime cuántos segundos viviste asumiendo 30 años ($(( )) con 30*365*24*3600).',
      hints: ['Brace expansion con rango numérico {2024..2026}', 'Aritmética: $(( expresión ))'],
      solutionLines: ['mkdir -p logs/{2024..2026}', 'echo "segundos: $((30*365*24*3600))"'],
    },
    summary: [
      '\'…\' literal · "…" expande+protege · desnudo = peligro.',
      '${VAR:-def} ${VAR:=def} ${VAR:?err} ${VAR%pat} ${VAR#pat}: caja de herramientas diaria.',
      '$(cmd) sustituye salida; $((expr)) aritmética entera; {..} listas; ~ home; globs nombres.',
    ],
  },
]
