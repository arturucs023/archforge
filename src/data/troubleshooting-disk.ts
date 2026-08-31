import type { Problem } from '../types'
import { cmd, file, info, ol, p, tip, ul, warn } from './helpers'

type Lvl = 'facil' | 'intermedio' | 'avanzado'

interface MkArgs {
  id: string
  title: string
  category: string
  level: Lvl
  severity?: Problem['severity']
  symptoms: string[]
  causes: string[]
  diagnose: Problem['diagnose']
  solutions: Problem['solutions']
  finalCheck: string
  alternatives?: string[]
}

function mk(a: MkArgs): Problem {
  return {
    id: a.id,
    title: a.title,
    category: a.category,
    level: a.level,
    severity: a.severity ?? 'medium',
    symptoms: a.symptoms,
    causes: a.causes,
    diagnose: a.diagnose,
    solutions: a.solutions,
    finalCheck: a.finalCheck,
    ...(a.alternatives ? { alternatives: a.alternatives } : {}),
  }
}

/* ============================ DISCO Y ARCHIVOS ============================ */

export const DISK_PROBLEMS: Problem[] = [
  mk({
    id: 'disco-lleno', title: 'Disco lleno', category: 'Disco', level: 'facil', severity: 'high',
    symptoms: ['df -h Use% 100%', '«No space left on device»', 'Apps no guardan'],
    causes: ['Logs gigantes', 'Cachés acumuladas', 'Copias olvidadas'],
    diagnose: [cmd({},
      'df -h',
      'sudo du -xh / 2>/dev/null | sort -rh | head -25')],
    solutions: [{ title: 'Liberar por capas seguras', blocks: [cmd({},
      'sudo journalctl --vacuum-size=100M',
      'paccache -rk1                       # Arch',
      'sudo apt clean                      # Debian/Ubuntu',
      'rm -rf ~/.cache/thumbnails/*'),
      tip('En Btrfs df engaña', 'Usa sudo btrfs filesystem usage / para el espacio real.')],
    }],
    finalCheck: 'Raíz bajo umbral y apps guardando normal.',
    alternatives: ['ncdu / interactivo.', 'Mover datos grandes + symlink.'],
  }),
  mk({
    id: 'borrado-disco-lleno', title: 'Archivo borrado pero el disco sigue lleno', category: 'Disco', level: 'avanzado', severity: 'high',
    symptoms: ['rm a un log enorme y df no cambia', 'lsof lista entradas deleted'],
    causes: ['Un proceso mantiene ABIERTO el archivo: los bloques no se liberan hasta cerrarlo'],
    diagnose: [cmd({}, 'lsof +L1                    # abiertos y borrados')],
    solutions: [{ title: 'Truncar en vivo sin reiniciar', blocks: [cmd({}, ': > "/proc/PID/fd/N"   # N = descriptor borrado'), tip('Alternativa', 'systemctl restart nombre-servicio también cierra ese fd.')] }],
    finalCheck: 'df -h refleja el espacio liberado sin reiniciar nada.',
  }),
  mk({
    id: 'fs-solo-lectura', title: 'Sistema de archivos en modo solo lectura', category: 'Disco', level: 'avanzado', severity: 'high',
    symptoms: ['Read-only file system en cada escritura', 'El kernel remontó / solo lectura'],
    causes: ['Errores de disco detectados → protección', 'Opción ro en fstab', 'Journal abortado por fallo de hardware'],
    diagnose: [cmd({},
      'findmnt -no OPTIONS /',
      'sudo dmesg | tail -30',
      'sudo smartctl -H /dev/disco')],
    solutions: [
      { title: 'Descartar hardware ANTES de remontar', blocks: [
        warn('Remontar rw sobre un disco fallando = pérdida de datos', 'Solo continúa si SMART y dmesg están limpios.'),
        cmd({}, 'sudo fsck -y /dev/particion-desde-live', 'sudo mount -o remount,rw /'),
      ] },
    ],
    finalCheck: 'Escrituras normales funcionan y dmesg limpio tras uso prolongado.',
    alternatives: ['Backup inmediato y sustitución de disco si SMART falla.'],
  }),
  mk({
    id: 'fstab-no-monta', title: 'Partición no monta automáticamente', category: 'Disco', level: 'intermedio',
    symptoms: ['Tras reiniciar falta la partición', 'Errores systemd-fsck'],
    causes: ['Sin línea en fstab', 'UUID cambió tras reformatear', 'nofail ausente'],
    diagnose: [cmd({}, 'lsblk -f                        # UUID actual', 'grep UUID /etc/fstab            # ¿coincide?')],
    solutions: [{ title: 'Entrada fstab correcta', blocks: [
      file('/etc/fstab — ejemplo', 'UUID=tu-uuid-real  /mnt/datos  ext4  defaults,nofail  0 2'),
      cmd({}, 'sudo findmnt --verify && sudo systemctl daemon-reload && sudo mount -a'),
    ] }],
    finalCheck: 'mount -a sin errores y partición presente tras reboot.',
  }),
  mk({
    id: 'usb-no-monta', title: 'USB/disco externo no monta', category: 'Disco', level: 'facil',
    symptoms: ['Aparece en lsblk sin punto de montaje', 'udisks da error al montar'],
    causes: ['Filesystem sin soporte instalado (ntfs/exfat)', 'Tabla corrupta', 'fstab viejo con ese UUID'],
    diagnose: [cmd({}, 'lsblk -f', 'sudo dmesg | tail -15')],
    solutions: [{ title: 'Soportes comunes + montaje manual', blocks: [cmd({},
      '# Arch:',
      'sudo pacman -S ntfs-3g exfatprogs dosfstools',
      'sudo mkdir -p /mnt/usb && sudo mount /dev/sdX1 /mnt/usb')] }],
    finalCheck: 'Archivos visibles en el punto de montaje.',
    alternatives: ['Probar el USB en otro equipo para descartar hardware.'],
  }),
]
