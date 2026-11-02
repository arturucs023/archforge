import type { BashProject } from './types'

export const BASH_PROJECTS: BashProject[] = [
  {
    id: 'p1-informe-sistema',
    num: 'P1',
    title: 'Informe del sistema',
    level: 'beginner',
    minutes: 25,
    goal: 'Crear sysinfo-archforge.sh: saludo, fecha, red, disco y usuarios, con validación y logs.',
    requirements: [
      'Shebang #!/usr/bin/env bash y set -euo pipefail',
      'Saludar a $USER, mostrar fecha/semana con date y kernel con uname',
      'Listar usuarios conectados (w + cut + grep -v + sort -u) y espacio con df -h',
      'Aceptar --salida ARCHIVO opcional para guardar el informe con tee',
      'Exit 0 si todo va bien, exit 2 si el argumento es inválido',
    ],
    concepts: ['primer-script', 'variables-entorno-local', 'registros-automatizacion'],
    starter: {
      filename: 'sysinfo-archforge.sh',
      content: '#!/usr/bin/env bash\nset -euo pipefail\n# TODO: saludo, fecha, usuarios, disco\n# TODO: --salida ARCHIVO con tee\n\necho "Hola, $USER"\n',
    },
    solution: {
      filename: 'sysinfo-archforge.sh',
      content: '#!/usr/bin/env bash\nset -euo pipefail\n\nSALIDA=""\nif [ "${1:-}" = "--salida" ]; then\n  [ -n "${2:-}" ] || { echo "Uso: $0 [--salida ARCHIVO]" >&2; exit 2; }\n  SALIDA="$2"\nfi\n\ninforme() {\n  echo "== Informe ArchForge =="\n  echo "Hola, $USER"\n  echo "Hoy es $(date), semana $(date +"%V")"\n  echo "Sistema: $(uname -s) en $(uname -m)"\n  echo "--- conectados ---"\n  w | cut -d " " -f 1 - | grep -v USER | sort -u\n  echo "--- disco ---"\n  df -h / | tail -1\n  echo "--- uptime ---"\n  uptime\n}\n\nif [ -n "$SALIDA" ]; then\n  informe | tee "$SALIDA"\nelse\n  informe\nfi\nexit 0\n',
    },
    verify: ['chmod +x sysinfo-archforge.sh', './sysinfo-archforge.sh', './sysinfo-archforge.sh --salida informe.txt && cat informe.txt', 'echo $?   # debe ser 0'],
  },
  {
    id: 'p2-analiza-logs',
    num: 'P2',
    title: 'Analizador de logs con grep, sed y awk',
    level: 'intermediate',
    minutes: 40,
    goal: 'Analizar servicios.log: contar niveles con grep, limpiar con sed y resumir con awk.',
    requirements: [
      'Validar que el log existe (-f) y avisar con uso si no',
      'Contar ERROR/WARN/INFO con grep -c (insensible donde toque)',
      'Top 3 programas con cut/sort/uniq/sort -rn/head',
      'Generar limpio.log con sed (quitar comentarios # y líneas vacías)',
      'Resumen por nivel con awk y acumuladores',
    ],
    concepts: ['regex-grep-clases', 'editor-sed', 'lenguaje-awk'],
    starter: {
      filename: 'analiza.sh',
      content: '#!/usr/bin/env bash\nset -euo pipefail\n\nLOG="${1:?uso: $0 <servicios.log>}"\n[ -f "$LOG" ] || { echo "no existe $LOG" >&2; exit 1; }\n\n# TODO: grep -c por nivel\n# TODO: top programas\n# TODO: sed a limpio.log\n# TODO: awk resumen\n',
    },
    solution: {
      filename: 'analiza.sh',
      content: '#!/usr/bin/env bash\nset -euo pipefail\n\nLOG="${1:?uso: $0 <servicios.log>}"\n[ -f "$LOG" ] || { echo "no existe $LOG" >&2; exit 1; }\n\necho "== conteos =="\nfor n in ERROR WARN INFO; do\n  printf "%-6s %s\\n" "$n:" "$(grep -cw "$n" "$LOG")"\ndone\n\necho "== top programas (campo 3) =="\ncut -d" " -f3 "$LOG" | sort | uniq -c | sort -rn | head -3\n\necho "== limpio =="\nsed \'/^#/d\' "$LOG" | sed \'/^$/d\' > limpio.log\nwc -l "$LOG" limpio.log\n\necho "== resumen awk =="\nawk \'{n[$2]++} END {for (k in n) printf "%s: %d\\n", k, n[k]}\' limpio.log\n',
    },
    verify: ['printf "2026-01-01 web ERROR fallo\\n2026-01-01 db WARN lento\\n# comentario\\n2026-01-01 web INFO ok\\n" > servicios.log', './analiza.sh servicios.log', 'cat limpio.log'],
  },
  {
    id: 'pf-papelera-archforge',
    num: 'PF',
    title: 'PROYECTO FINAL — Papelera ArchForge',
    level: 'expert',
    minutes: 180,
    final: true,
    goal: 'Sistema de papelera con archborra.sh, archtrash.sh (+ librería) y archlimpia.sh con cron, logs y manual.',
    requirements: [
      'Estructura ~/papelera-archforge/{scripts,logs/olds} con permisos a+rwX y logs trashlog.log + restauracion.log',
      'archborra.sh: mueve a papelera o elimina definitivo, valida args, registra tipo:fecha:hora:ruta:usuario',
      'archtrash.sh: menú (listar, info con file, restaurar, restaurar por extensión, vaciar, vaciar antiguos, salir) usando funciones en trashfunctions',
      'archlimpia.sh: vacía papelera el día 28 vía cron y archiva trashlog.log a olds/trashlog.old.MMAAAA',
      'Manual con códigos comentados, gestión de errores y capturas de prueba',
    ],
    concepts: ['registros-automatizacion'],
    starter: {
      filename: 'archborra.sh',
      content: '#!/usr/bin/env bash\nset -euo pipefail\n\nPAPELERA="$HOME/papelera-archforge/papelera"\nLOG="$HOME/papelera-archforge/logs/trashlog.log"\nREST="$HOME/papelera-archforge/logs/restauracion.log"\n\nuso() { echo "Uso: $0 [-d] <archivo>..." >&2; echo "  sin -d: recicla a papelera · con -d: elimina definitivo" >&2; exit 2; }\n\n# TODO: parsear -d, validar $#, mover o rm, registrar logs\n',
    },
    solution: {
      filename: 'archborra.sh',
      content: '#!/usr/bin/env bash\nset -euo pipefail\n\nPAPELERA="$HOME/papelera-archforge/papelera"\nLOG="$HOME/papelera-archforge/logs/trashlog.log"\nREST="$HOME/papelera-archforge/logs/restauracion.log"\nmkdir -p "$PAPELERA" "$(dirname "$LOG")"\n\nDEFINITIVO=0\nif [ "${1:-}" = "-d" ]; then DEFINITIVO=1; shift; fi\n[ $# -ge 1 ] || { echo "Uso: $0 [-d] <archivo>..." >&2; exit 2; }\n\nlogea() { echo "$1:$(date +%d/%m/%Y):$(date +%H.%M):$2:$USER" >> "$LOG"; }\n\nfor f in "$@"; do\n  [ -e "$f" ] || { echo "No existe: $f" >&2; continue; }\n  ABS="$(realpath "$f")"\n  if [ "$DEFINITIVO" -eq 1 ]; then\n    rm -rf -- "$f"\n    logea "eliminacion" "$ABS"\n    echo "Eliminado: $f"\n  else\n    mv -- "$f" "$PAPELERA/"\n    echo "$(basename "$f") <-- $ABS" >> "$REST"\n    logea "reciclaje" "$ABS"\n    echo "Reciclado: $f -> papelera"\n  fi\ndone\n',
    },
    verify: [
      'mkdir -p ~/papelera-archforge/scripts ~/papelera-archforge/logs/olds ~/papelera-archforge/papelera',
      'chmod u+x ~/papelera-archforge/scripts/*.sh',
      'echo hola > /tmp/prueba-archforge.txt && archborra.sh /tmp/prueba-archforge.txt && ls ~/papelera-archforge/papelera',
      'cat ~/papelera-archforge/logs/trashlog.log',
      'crontab -l | grep archlimpia',
    ],
  },
]
