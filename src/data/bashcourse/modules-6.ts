import type { BashLesson } from './types'

export const MODULES_6: BashLesson[] = [
  /* ================================= 23 BASH AVANZADO ================================= */
  {
    id: 'bash-avanzado',
    num: '23',
    title: 'Bash avanzado',
    level: 'expert',
    minutes: 28,
    goals: [
      'Process substitution y subshells sin confundirlos',
      'Here-documents/strings para bloques de texto',
      'getopts para opciones reales de CLI',
    ],
    simple: [
      '<(comando) entrega la SALIDA de un comando como si fuera un ARCHIVO (process substitution): diff <(ls a) <(ls b) compara dos listas sin crear temporales.',
      'Un subshell ( … ) es una COPIA del shell: cd o variables ahí dentro no afectan al exterior. Here-document <<EOF inyecta texto multilínea; <<< «cadena» lo mismo en una línea.',
    ],
    technical: [
      '( ) = fork+exec del bloque; { } agrupa SIN subshell. Coproc/bgos raros aparte, getopts itera flags cortos con OPTARG/OPTIND — portabilidad total. Expansión avanzada: ${V//a/b} global-replace, ${V^^} uppercase, ${#V} longitud, ${V:0:3} slice. Redirecciones exóticas: n<>file RW, &>file todo, exec 3<file abre fd manual con cierre exec 3<&-.',
    ],
    examples: [
      { caption: 'process substitution', lines: ['diff <(sort lista1.txt) <(sort lista2.txt)', 'while read -r usuario; do echo "→ $usuario"; done < <(cut -d: -f1 /etc/passwd)'] },
      { caption: 'subshell aislado', lines: ['cd /tmp && pwd', '(cd / && pwd)', 'pwd   # sigues donde estabas'] },
      { caption: 'heredoc + here-string', lines: ['cat <<FIN', 'texto multilínea', 'con $VARS expandibles', 'FIN', "grep --color \"bash\" <<< \"amo el bash\""] },
      { caption: 'getopts real', lines: ['# dentro de un script:', 'while getopts ":vo:h" opt; do', '  case "$opt" in', '    v) VERBOSE=1 ;;', '    o) OUT="$OPTARG" ;;', '    h) echo "uso: $0 [-v] [-o salida]"; exit 0 ;;', '    \\?) echo "opción inválida" >&2; exit 2 ;;', '  esac', 'done', 'shift $((OPTIND-1))'] },
    ],
    breakdowns: [
      { caption: 'diff <(cmd1) <(cmd2)', tokens: [
        { token: '<( )', meaning: 'ejecuta y expone su stdout como /dev/fd/N' },
        { token: 'ventaja', meaning: 'sin temporales, paralelo, se limpia solo' },
        { token: 'vs pipe', meaning: '| conecta UNA corriente; <( ) alimenta cualquier ARGUMENTO-fichero' },
      ] },
    ],
    exercises: [
      {
        id: 'b23e1', kind: 'predict',
        question: '( X=5 ); echo "${X:-vacía}" — ¿qué imprime?',
        options: [
          { text: '5', why: 'X=5 vivió SOLO dentro del subshell.' },
          { text: 'vacía', why: 'Los paréntesis aíslan TODO: asignaciones, cd, opciones.' },
          { text: 'Error de sintaxis', why: '( ) con asignaciones es perfectamente válido.' },
          { text: 'Depende de export previo', why: 'Export no salva mutaciones INTERNAS del subshell.' },
        ],
        answer: 1,
        solutionLines: ['( X=5 )', 'echo "[${X:-vacía}"'],
        explanation: 'Usa subshells para EXPERIMENTOS seguros (cd temporal, set temporal) sin ensuciar.',
      },
      {
        id: 'b23e2', kind: 'write',
        question: 'Compara los directorios dirA y dirB tras ordenar sus listados, usando process substitution:',
        accept: ['diff <(ls dira) <(ls dirb)'.toLowerCase(), 'diff <(ls dirA) <(ls dirB)'],
        placeholder: '$ diff <(…) <(…)',
        solutionLines: ['mkdir -p dirA dirB && touch dirA/comun dirB/comun dirB/extra', 'diff <(ls dirA) <(ls dirB)'],
        explanation: 'El patrón canónico de comparación de estructuras sin archivos temporales.',
      },
    ],
    challenge: {
      text: 'Script con getopts que acepte -v (verbose), -n NOMBRE y muestre uso con -h; después imprima las rutas restantes ($@ ya recortado).',
      hints: [': inicial silencia errores propios', 'OPTARG contiene el valor de -n', 'shift $((OPTIND-1)) limpia los flags consumidos'],
      solutionLines: ['#!/usr/bin/env bash', 'VERBOSE=0', 'while getopts ":vn:h" o; do', '  case "$o" in', '    v) VERBOSE=1 ;;', '    n) NOMBRE="$OPTARG" ;;', '    h) echo "uso: $0 [-v] [-n nombre] rutas…" ; exit 0 ;;', '    \\?) echo inválido >&2; exit 2 ;;', '  esac', 'done', 'shift $((OPTIND-1))', '[ "$VERBOSE" = 1 ] && echo "modo verboso para $NOMBRE"', 'for ruta in "$@"; do echo "ruta: $ruta"; done'],
    },
    summary: [
      '<( ) archivos-on-the-fly; ( ) subshell aislado vs { } grupo.',
      '<<EOF multilínea · <<< cadena · getopts = CLI seria portable.',
      'Expansiones ${V//} ${V^^} ${#V} ${V::} evitan sed/cut innecesarios.',
    ],
  },

  /* ==================================== 24 SEGURIDAD ==================================== */
  {
    id: 'seguridad-bash',
    num: '24',
    title: 'Seguridad en Bash',
    level: 'expert',
    minutes: 22,
    goals: [
      'Identificar los vectores clásicos de scripts vulnerables',
      'Escribir versiones seguras con quoting e IFS correctos',
      'Manejar temporales y elevación con criterio',
    ],
    simple: [
      'Regla madre: TODO dato variable va ENTRE COMILLAS DOBLES. Un espacio no citado divide palabras; un * no citado expande archivos; un input hostil puede ejecutar comandos.',
      'Otros pilares: nombres de archivo con espacios rompen bucles mal hechos; mktemp para temporales (no /tmp/fijo); sudo mínimo y nunca sobre entradas del usuario sin validar.',
    ],
    technical: [
      'Inyección típica: eval "cmd $INPUT" o sh -c "…$INPUT…" → el atacante cierra comillas y añade ; rm -rf ~. Alternativa segura: usar arrays + "${ARR[@]}" para construir comandos. IFS=$\'\\n\\t\' reduce splitting accidental. PATH del script debe fijarse explícitamente si corre con privilegios (PATH hijacking). set -u detecta usos de variables vaciadas por entorno hostil.',
    ],
    examples: [
      { caption: '❌ inseguro → ✅ seguro: iterar archivos', lines: ['# ❌ rompe con espacios y ejecuta globs hostiles:', 'for f in $(ls); do rm "$f"; done', '', '# ✅ glob directo + comillas:', 'for f in *; do [ -f "$f" ] || continue; echo "proceso $f"; done'] },
      { caption: '❌ → ✅: entrada hacia comando', lines: ['# ❌ inyección trivial:', 'eval "grep $USUARIO_PATRON logs.txt"', '', '# ✅ patrón como argumento citado:', 'grep -- "$USUARIO_PATRON" logs.txt'] },
      { caption: 'temporales seguros', lines: ['# ❌ predecible y pisable por otros usuarios:', 'echo x > /tmp/mi-temp', '', '# ✅ único con permisos 600:', 'TMP=$(mktemp) || exit 1', "trap 'rm -f \"$TMP\"' EXIT", 'echo x > "$TMP"'] },
      { caption: 'PATH blindado en scripts privilegiados', lines: ["#!/usr/bin/env bash", 'PATH=/usr/local/sbin:/usr/local/bin:/usr/bin:/bin', "# evita que un PATH hostil cargue «ls» falso desde /tmp", 'export PATH'] },
    ],
    breakdowns: [
      { caption: 'rm -- "$ARCHIVO"', tokens: [
        { token: '--', meaning: 'fin de opciones: lo siguiente NO se interpreta como flag' },
        { token: '"$ARCHIVO"', meaning: 'citado: espacios/guiones iniciales no rompen nada' },
        { token: 'amenaza real', meaning: 'un archivo llamado -rf o *.txt procesado desnudo = desastre' },
      ] },
    ],
    exercises: [
      {
        id: 'b24e1', kind: 'choice',
        question: 'USUARIO="ana; rm -rf ~". ¿Qué hace eval "saludar $USUARIO"?',
        options: [
          { text: 'Saluda a ana', why: 'Eval reinterpreta el ; como separador: ejecuta SALUDOS y luego el rm.' },
          { text: 'Ejecuta saludar ana Y DESPUÉS rm -rf ~: inyección completa', why: 'Por eso jamás construyas comandos con eval+variables no controladas. Usa argumentos citados o arrays.' },
          { text: 'Falla porque ; no vale', why: '; es sintaxis válida del shell evaluado.' },
          { text: 'Solo si eres root', why: 'La inyección funciona con cualquier usuario (con SUS permisos).' },
        ],
        answer: 1,
        solutionLines: ['saludar() { echo "hola $1"; }', 'USUARIO=\'ana; echo INYECTADO\'', 'eval "saludar $USUARIO"', 'saludar "$USUARIO"', '# la segunda forma imprime el texto literal: segura'],
        explanation: 'Ejecuta ambas líneas en una VM/práctica y verás el INYECTADO aparecer: lección que no se olvida.',
      },
      {
        id: 'b24e2', kind: 'write',
        question: 'Forma SEGURA de lanzar rsync pasando un array DESTINOS completo como fuentes:',
        accept: ['rsync -av "${destinos[@]}" backup/'.toLowerCase(), 'rsync -av "${DESTINOS[@]}" backup/'],
        placeholder: '$ rsync -av "…" destino/',
        solutionLines: ['rsync -av "${DESTINOS[@]}" backup/'],
        explanation: '"${ARR[@]}" preserva cada elemento citado individualmente: LA construcción segura para pasar listas.',
      },
    ],
    challenge: {
      text: 'Repara este fragmento vulnerable: for f in $(find . -type f); do grep PATRON "$f"; done → hazlo seguro ante espacios y ante PATRON que empiece por guion.',
      hints: ['find -print0 | while read -d ""', 'o directamente: grep -r -- PATRON .', '-- termina opciones'],
      solutionLines: ["while IFS= read -r -d '' f; do grep -q -- PATRON \"$f\" && echo \"$f\"; done < <(find . -type f -print0)", '# alternativa directa equivalente:', 'grep -r -- PATRON .'],
    },
    summary: [
      '"$VAR" siempre; arrays para listas; -- antes de datos dudosos.',
      'mktemp+trap para temporales; jamás /tmp/nombre-fijo compartible.',
      'eval/sh -c con inputs = inyección: busca la alternativa por argumentos.',
    ],
  },

  /* ============================ 25 SHELLCHECK Y BUENAS PRÁCTICAS ============================ */
  {
    id: 'shellcheck',
    num: '25',
    title: 'ShellCheck y buenas prácticas',
    level: 'intermediate',
    minutes: 15,
    goals: [
      'Instalar y leer ShellCheck como revisor automático',
      'Corregir los avisos más frecuentes (SC2086, SC2046…)',
      'Adoptar la checklist de calidad mínima',
    ],
    simple: [
      'ShellCheck es un linter de Bash: analiza tu script y señala bugs reales ANTES de ejecutarlo. pacman -S shellcheck y luego shellcheck mi-script.sh.',
      'Sus avisos tienen códigos (SCxxxx) documentados en wiki.shellcheck.net con explicación y fix.',
    ],
    technical: [
      'SC2086 (word splitting por variable sin citar) es el más común. SC2046: $( ) sin comillas mismo problema. SC2116/2005 cat inútil. SC2164 cd sin || exit. Directivas por línea: # shellcheck disable=SC2086 cuando SABES lo que haces. Integra en editor (ALE/lsp) o CI para feedback continuo.',
    ],
    examples: [
      { caption: 'instalar y correr', lines: ['sudo pacman -S shellcheck', 'shellcheck mi-script.sh', 'shellcheck --severity=error mi-script.sh   # solo errores graves'] },
      { caption: 'antes → aviso → después', lines: ['# ANTES:', 'cp $ARCHIVO $DESTINO/', '# shellcheck dice: SC2086 Double quote to prevent globbing and word splitting.', '# DESPUÉS:', 'cp "$ARCHIVO" "$DESTINO/"'] },
      { caption: 'otro clásico', lines: ['# ANTES (cd puede fallar y seguir en sitio equivocado):', 'cd /var/www && rm -rf cache/*', '# DESPUÉS:', 'cd /var/www || exit 1', 'rm -rf ./cache/*'] },
      { caption: 'integración continua mínima', lines: ['# .github/workflows/lint.yml (resumen):', '#   - run: sudo pacman -S shellcheck || pipx install shellcheck', "#   - run: shellcheck $(git ls-files '*.sh')", '# así NINGÚN script entra al repo con avisos'] },
    ],
    breakdowns: [
      { caption: 'flujo de trabajo con ShellCheck', tokens: [
        { token: 'escribes', meaning: 'tu script normal' },
        { token: 'shellcheck fichero', meaning: 'lista avisos numerados CON línea y columna' },
        { token: 'SC####', meaning: 'busca el código en la wiki: causa exacta + fixes alternativos' },
        { token: 'corriges', meaning: 'aplicas quoting/set -e/etc según aviso' },
        { token: 'repites', meaning: 'hasta salida limpia: tu script ahora es defendible' },
      ] },
    ],
    sim: {
      intro: 'ShellCheck no está simulado. Flujo recomendado en tu equipo:',
      tasks: ['pacman -S shellcheck (una vez)', 'Crea test.sh con: cp $A $B', 'shellcheck test.sh → lee el SC2086', 'Corrige a cp "$A" "$B" y repite hasta silencio'],
    },
    exercises: [
      {
        id: 'b25e1', kind: 'choice',
        question: 'ShellCheck marca SC2046 en FILES=$(ls). ¿Cuál es la corrección CANÓNICA?',
        options: [
          { text: 'FILES="$(ls)"', why: 'Citando la asignación no basta: el problema llega AL USAR $FILES sin comillas.' },
          { text: 'Usar un glob o find -print0 en lugar de parsear ls', why: 'Parsear ls es intrínsecamente frágil: la solución real elimina el ls, no cita alrededor.' },
          { text: '# shellcheck disable=SC2046', why: 'Silencia, no corrige: último recurso justificado.' },
          { text: 'set -e', why: 'Nada que ver: -e trata exit codes.' },
        ],
        answer: 1,
        solutionLines: ['for f in *; do echo "$f"; done', '# o bien:', "find . -maxdepth 1 -type f -print0 | while IFS= read -r -d '' f; do echo \"$f\"; done"],
        explanation: 'ShellCheck no solo cita: enseña patrones. La wiki de cada código es oro puro.',
      },
      {
        id: 'b25e2', kind: 'write',
        question: 'Directiva para silenciar SOLO el aviso SC2086 en la línea siguiente:',
        accept: ['# shellcheck disable=sc2086'.toLowerCase()],
        placeholder: '$ # shellcheck disable=…',
        solutionLines: ['# shellcheck disable=SC2086'],
        explanation: 'Va en comentario EN la línea anterior (o misma línea). Documenta siempre POR QUÉ lo desactivas junto al comentario.',
      },
    ],
    summary: [
      'shellcheck fichero.sh: revisor experto gratuito en cada guardado.',
      'SC2086/2046 (quoting) dominan las estadísticas: empieza por ahí.',
      'Checklist mínima: shebang · set -euo pipefail · quoting total · trap limpieza · shellcheck limpio.',
    ],
  },


  /* ================================= 26 AUTOMATIZACIÓN ================================= */
  {
    id: 'automatizacion',
    num: '26',
    title: 'Automatización',
    level: 'expert',
    minutes: 25,
    goals: [
      'Convertir tareas manuales en scripts programables',
      'Programarlos con systemd timers (y cron)',
      'Registrar resultados y fallar ruidosamente',
    ],
    simple: [
      'Automatizar = tomar esa secuencia que tecleas cada semana, envolverla en un script robusto (módulos anteriores) y programarla. En Arch moderno: systemd timers (journalctl los registra gratis).',
      'Tres ingredientes: script idempotente + logging claro + programación. Sin logging no sabrás si funcionó; sin idempotencia, repetirla daña.',
    ],
    technical: [
      'systemd: unidad .service Type=oneshot ExecStart=tuscript + .timer OnCalendar=… (daily, weekly, *-*-* 03:00). enable --now el TIMER (no el service). persistent=true recupera ejecuciones perdidas por apagado. RandomizedDelaySec evita tormentas a medianoche. Logs automáticos en journalctl -u nombre.service. Cron sigue válido pero sin journal integrado ni dependencias.',
    ],
    examples: [
      { caption: 'script de mantenimiento Arch (base)', lines: ['#!/usr/bin/env bash', 'set -euo pipefail', '', 'LOG="${1:-/var/log/mant.log}"', '{', '  echo "== inicio $(date -Is) =="', '  sudo pacman -Sy --noconfirm archlinux-keyring', '  sudo pacman -Syu --noconfirm', '  paccache -rk2', '  journalctl --vacuum-time=30d', '  echo "== fin ok =="', '} >> "$LOG" 2>&1'] },
      { caption: 'timer systemd', lines: [
        "printf '%s\\n' '[Unit]' 'Description=Mantenimiento semanal' '[Service]' 'Type=oneshot' 'ExecStart=/usr/local/bin/mantenimiento.sh' | sudo tee /etc/systemd/system/mantenimiento.service",
        '',
        "printf '%s\\n' '[Unit]' 'Description=Cada domingo 03:00' '[Timer]' 'OnCalendar=Sun *-*-* 03:00:00' 'Persistent=true' '[Install]' 'WantedBy=timers.target' | sudo tee /etc/systemd/system/mantenimiento.timer",
        '',
        'sudo systemctl daemon-reload',
        'sudo systemctl enable --now mantenimiento.timer',
        'systemctl list-timers --no-pager | head',
      ] },
    ],
    breakdowns: [
      { caption: 'OnCalendar=Sun *-*-* 03:00:00', tokens: [
        { token: 'Sun', meaning: 'domingo (o * para todos)' },
        { token: '*-*-*,', meaning: 'cualquier año-mes-día' },
        { token: '03:00:00', meaning: 'hora exacta' },
        { token: 'Persistent=true', meaning: 'si la máquina estaba apagada, ejecuta al arrancar' },
      ] },
    ],
    exercises: [
      {
        id: 'b26e1', kind: 'choice',
        question: '¿Qué habilitas para programar con systemd?',
        options: [
          { text: 'El service', why: 'El service se dispara SOLO cuando el timer lo llama (o manualmente).' },
          { text: 'El timer (con enable --now)', why: 'Correcto: el timer agenda; el service ejecuta. list-timers confirma próxima corrida.' },
          { text: 'Ambos siempre', why: 'Habilitar ambos provocaría ejecución extra en cada boot además del horario.' },
          { text: 'cron igualmente', why: 'Serían dos schedulers duplicados.' },
        ],
        answer: 1,
        solutionLines: ['systemctl list-timers --no-pager | head -8'],
        explanation: 'NEXT muestra cuándo tocará; LAST si ya corrió. Tu primera comprobación de salud.',
      },
      {
        id: 'b26e2', kind: 'write',
        question: 'Línea de script que registra fecha + estado de sshd (active/inactive) en un log, añadiendo:',
        accept: ['systemctl is-active sshd >> log.txt'],
        solutionLines: ['echo "$(date -Is) sshd=$(systemctl is-active sshd)" >> "$LOG"'],
        explanation: 'is-active devuelve active/inactive/failed Y código acorde: sirve para log y para if a la vez.',
      },
    ],
    challenge: {
      text: 'Diseña (en papel/esqueleto) monitor_espacio.sh: alerta si / supera el 85% (df + awk), escribe alerta en stderr y exit 1; si está bien, exit 0 silencioso. Piensa cómo lo conectarías a un timer diario.',
      hints: ["df -P / | awk 'NR==2 {gsub(\"%\",\"\"); print $5}'", 'if [ \"$USO\" -ge 85 ]; then … >&2; exit 1; fi', 'exit 0 final explícito'],
      solutionLines: ['#!/usr/bin/env bash', 'set -euo pipefail', 'USO=$(df -P / | awk \'NR==2 {gsub("%",""); print $5}\')', 'LIMITE=${1:-85}', 'if [ "$USO" -ge "$LIMITE" ]; then', '  echo "ALERTA: / al ${USO}% (límite ${LIMITE}%)" >&2', '  exit 1', 'fi', 'exit 0'],
    },
    summary: [
      'Script robusto + log + scheduler = automatización adulta.',
      'systemd timer > cron en Arch: journal, dependencias, Persistent.',
      'Idempotencia: diseñar para que repetir no rompa.',
    ],
  },
  /* ================================ 27 PROYECTOS FINALES ================================ */
  {
    id: 'proyectos-finales',
    num: '27',
    title: 'Proyectos finales',
    level: 'expert',
    minutes: 10,
    goals: [
      'Saber cómo abordar los proyectos progresivos del curso',
      'Adoptar un flujo de trabajo profesional para scripts',
    ],
    simple: [
      'Llegó la hora de construir. Los proyectos del curso van de «mi primer script» hasta un gestor completo del sistema: cada uno lista requisitos, trae esqueleto de partida y solución completa para comparar.',
      'El método importa más que la velocidad: lee requisitos, escribe TU versión, ejecuta shellcheck, prueba los casos de verificación… y SOLO entonces mira la solución para comparar decisiones.',
    ],
    technical: [
      'Flujo recomendado por proyecto: 1) esqueleto con set -euo pipefail y usage(); 2) funciones puras una por requisito; 3) validación de entrada ANTES de efectos; 4) logging con date -Is; 5) exit codes documentados; 6) shellcheck limpio como definición de terminado. Versiona con git desde el primer commit.',
    ],
    examples: [
      { caption: 'plantilla mental de arranque', lines: ['#!/usr/bin/env bash', 'set -euo pipefail', '', 'usage() { echo "uso: $0 <args>"; exit 2; }', '', '# 1) parsear entrada  # 2) validar  # 3) ejecutar  # 4) informar'] },
    ],
    exercises: [
      {
        id: 'b27e1', kind: 'choice',
        question: '¿Cuál es el PRIMER paso al abordar cualquier proyecto del curso?',
        options: [
          { text: 'Copiar la solución y adaptarla', why: 'Anula el aprendizaje: tu cerebro necesita el intento previo.' },
          { text: 'Leer requisitos completos y escribir el esqueleto con validaciones', why: 'Diseñar antes de teclear evita reescrituras; las validaciones definen el contrato.' },
          { text: 'Optimizar rendimiento desde ya', why: 'Prematura: primero correcto, luego rápido si hace falta.' },
          { text: 'Elegir tema de colores del menú', why: 'Cosmética al final.' },
        ],
        answer: 1,
        solutionLines: ['# orden profesional:', '# requisitos → esqueleto+validación → funciones → shellcheck → pruebas'],
        explanation: 'Los proyectos evalúan JUICIO tanto como sintaxis.',
      },
    ],
    challenge: {
      text: 'Antes de abrir P1: crea en tu equipo ~/bin, añádelo al PATH (idempotente) y guarda ahí cada proyecto conforme lo completes. Al final tendrás una caja de herramientas personal instalada.',
      hints: ['mkdir -p ~/bin', 'case ":$PATH:" para añadir sin duplicar', 'chmod +x tras cada script'],
      solutionLines: ['mkdir -p ~/bin', 'case ":$PATH:" in *":$HOME/bin:"*) ;; *) export PATH="$HOME/bin:$PATH";; esac', '# añade esa línea a ~/.bashrc para que sea permanente'],
    },
    summary: [
      'Proyectos = integración real: requisitos→diseño→código→lint→pruebas.',
      'Método: TU intento primero; solución después para comparar.',
      '~/bin en PATH convierte tus prácticas en herramientas permanentes.',
    ],
  },
]
