/* Curso 🖥️ «Linux en máquina virtual»: del sandbox de ArchForge a Linux REAL.
   Laboratorios EXTERNOS: se realizan en la VM del usuario (course.virtual=true). */
import type { ServerCourse } from './types'
import { srvModule } from './types'
import { vmModsA } from './vm-mods-a'
import { vmModsB } from './vm-mods-b'
import { alpineModules, alpineLabs } from './vm-alpine'
// Los LAB 01-12 de vm-labs.ts son para VM genérica; el curso usa labs Alpine (vm-alpine.ts)
import { cmd, h, info, ol, p, ul } from '../helpers'

const proyectoFinal = srvModule('proyecto-final', 'PROY', '🏗️ Proyecto final — Tu laboratorio Linux', 60,
  ['Consolidar una VM completa: usuario, sudo, red, SSH, firewall, servicios, web, snapshot y documentación'],
  [
    p('El examen real no lo corrige ArchForge — lo corrobora TU sistema. Al terminar este proyecto tendrás un laboratorio Linux completo sobre el que practicar todos los cursos de ArchForge.'),
    h('Checklist de entrega (verifícalo tú, comando a comando)'),
    ol('Usuario dedicado creado con home y shell correctos (LAB 01).',
       'sudo operativo vía grupo adecuado + visudo revisado (LAB 02).',
       'Red en el modo elegido con IP estable o reservada (módulo 09).',
       'SSH por CLAVES desde tu anfitrión; contraseña desactivada si te atreves (LAB 03 + curso SSH).',
       'ufw activo con deny incoming + limit ssh (LAB 11).',
       'Un servicio systemd TUYO persistente y con journal limpio (LAB 04).',
       'Nginx publicando tu sitio propio (LABS 05-06).',
       'Snapshot actual nombrado («estado-proyecto») tras verificar todo.',
       'Documentación mínima: fichero notas.md en la VM con IP, hostname, servicios activos y dónde están sus configs.'),
    cmd({ caption: 'autoevaluación exprés' }, 'hostname && whoami && id', 'systemctl is-active nginx sshd ufw 2>/dev/null || systemctl is-active nginx ssh', 'sudo ufw status verbose', 'ls -l ~/*.md'),
    info('¿Y ahora qué?', 'Con este laboratorio vivo, los cursos de Servicios dejan de ser ejercicios: son tu infraestructura. Rompe cosas, restaura snapshots, documenta — así aprenden los administradores reales.'),
    ul('Siguiente nivel sugerido: migrar tu laboratorio a QEMU/KVM dentro de un anfitrión Linux cuando quieras dar el salto profesional.'),
  ],
  { level: 'intermediate' })

export const vmCourse: ServerCourse = {
  id: 'vm',
  icon: '🖥️',
  title: 'Linux en máquina virtual',
  tagline: 'Aprende a crear una máquina virtual Linux y conviértela en tu entorno de prácticas real para ArchForge.',
  level: 'beginner',
  recommended: ['arch', 'debian'],
  minutes: 480,
  keywords: ['maquina virtual', 'virtualbox', 'vmware', 'hyper-v', 'iso', 'snapshot', 'hypervisor', 'vt-x', 'amd-v', 'laboratorio', 'vm'],
  prereqs: [
    { label: '🧪 Terminal interactiva', icon: 'terminal', to: '/terminal' },
    { label: 'Usuarios y permisos', icon: 'users', to: '/section/users' },
  ],
  cheatsheetIds: ['systemctl', 'journalctl', 'ssh', 'ssh-keygen', 'pacman', 'apt', 'ss', 'ping', 'hostname'],
  problemIds: ['no-internet', 'srv-ssh-refused', 'srv-ssh-permission-denied', 'srv-nginx-no-inicia', 'disco-lleno'],
  modules: [...vmModsA, ...vmModsB, ...alpineModules, ...alpineLabs, proyectoFinal],
  virtual: true,
  related: [
    { label: '🐚 Curso Bash', kind: 'section', to: 'bash' },
    { label: '🔐 Servidor SSH', kind: 'course', to: 'ssh' },
    { label: '🌐 Nginx', kind: 'course', to: 'nginx' },
    { label: '🌐 DNS', kind: 'course', to: 'dns' },
    { label: '📡 DHCP', kind: 'course', to: 'dhcp' },
    { label: '🌐 Apache', kind: 'course', to: 'apache' },
    { label: '📂 Samba', kind: 'course', to: 'samba' },
    { label: '🗂️ NFS', kind: 'course', to: 'nfs' },
    { label: '⚙️ systemd', kind: 'section', to: 'expert' },
    { label: '🌐 Redes', kind: 'section', to: 'network' },
    { label: '🔥 Firewall', kind: 'section', to: 'firewall' },
  ],
  lab: {
    objective: 'Proyecto final: deja tu VM con usuario+sudo+red+SSH+firewall+servicio propio+web+snapshot+notas.md documentado.',
    intro: '🖥️ Este curso es EXTERNO: los comandos se ejecutan EN TU MÁQUINA VIRTUAL. ArchForge no ejecuta ni valida nada aquí — tú verificas cada punto con las comprobaciones incluidas.',
    tasks: [
      'Completa los LAB 01–12 en orden, con snapshot antes de cada uno delicado',
      'Verifica el checklist del proyecto final con tus propios comandos',
      'Marca los módulos como completados según los vayas logrando',
    ],
    hints: [
      'Cada LAB trae su troubleshooting: léelo ANTES de empezar, no después de romper',
      'Snapshot «antes-labXX» = botón de rebobinar sin vergüenza',
      'Si algo se tuerce: journalctl primero, Google después',
    ],
    validate(session) {
      void session
      return {
        pass: false,
        detail: 'Este laboratorio se realiza en TU máquina virtual: ArchForge no puede validarlo. Completa el checklist del PROY y márcalo como completado.',
      }
    },
  },
}
