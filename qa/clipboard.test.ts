/* Prueba de humo de la lógica crítica: copyText NUNCA copia $ ni # ni comentarios. */
import { copyText, displayLine, isRootRequired } from '../src/types'
import type { CmdLine } from '../src/types'

let failures = 0
function check(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a !== e) {
    failures++
    console.error(`FALLO ${name}:\n  esperado: ${e}\n  obtenido: ${a}`)
  } else {
    console.log(`ok   ${name}`)
  }
}

// 1. Comando simple de usuario
const l1: CmdLine[] = [{ kind: 'run', user: 'sudo pacman -Syu' }]
check('sudo→user mode', copyText(l1, 'user'), 'sudo pacman -Syu')
check('sudo→root mode', copyText(l1, 'root'), 'pacman -Syu')

// 2. Sin sudo: idéntico en ambos modos (no cambiar arbitrariamente)
const l2: CmdLine[] = [{ kind: 'run', user: 'git clone https://example.com' }]
check('nosudo→user', copyText(l2, 'user'), 'git clone https://example.com')
check('nosudo→root', copyText(l2, 'root'), 'git clone https://example.com')

// 3. Multilínea con comentarios intercalados
const multi: CmdLine[] = [
  { kind: 'comment', text: 'Actualizar el sistema' },
  { kind: 'run', user: 'sudo pacman -Syu' },
  { kind: 'comment', text: 'instalar git' },
  { kind: 'run', user: 'sudo pacman -S git' },
  { kind: 'run', user: 'git clone https://example.com' },
]
check('multi→user', copyText(multi, 'user'), 'sudo pacman -Syu\nsudo pacman -S git\ngit clone https://example.com')
check('multi→root', copyText(multi, 'root'), 'pacman -Syu\npacman -S git\ngit clone https://example.com')

// 4. Variante root explícita
const expl: CmdLine[] = [{ kind: 'run', user: 'sudo mkinitcpio -P', root: 'mkinitcpio -P' }]
check('explicit root', copyText(expl, 'root'), 'mkinitcpio -P')

// 5. requiresRoot sin prefijo sudo en user
const flag: CmdLine[] = [{ kind: 'run', user: 'reboot now', root: 'systemctl reboot', requiresRoot: true }]
check('flag root user-mode', copyText(flag, 'user'), 'reboot now')
check('flag root root-mode', copyText(flag, 'root'), 'systemctl reboot')

// 6. displayLine: prefijo separado SIEMPRE fuera del texto
const d1 = displayLine({ kind: 'run', user: 'sudo fdisk /dev/sda' }, 'user')!
check('display prefix $', [d1.prefix, d1.text], ['$', 'sudo fdisk /dev/sda'])
const d2 = displayLine({ kind: 'run', user: 'sudo fdisk /dev/sda' }, 'root')!
check('display prefix #', [d2.prefix, d2.text], ['#', 'fdisk /dev/sda'])
const dc = displayLine({ kind: 'comment', text: 'hola' }, 'user')!
check('display comment', [dc.prefix, dc.text], ['#', 'hola'])

// 7. INVARIANTES DE SEGURIDAD sobre TODAS las combinaciones posibles
const all: CmdLine[] = [
  ...l1, ...l2, ...multi, ...expl, ...flag,
  { kind: 'run', user: 'sudo dd if=a of=b', requiresRoot: true },
  { kind: 'run', user: 'lsblk -f' },
]
for (const mode of ['user', 'root'] as const) {
  const text = copyText(all, mode)
  for (const line of text.split('\n')) {
    if (line.startsWith('$') || line.startsWith('#')) {
      failures++
      console.error(`INVARIANTE VIOLADA en modo ${mode}: "${line}"`)
    }
  }
}
console.log('ok   invariantes $/# en modo user+root')

// 8. isRootRequired coherente
check('isRootRequired sudo', isRootRequired({ kind: 'run', user: 'sudo x' }), true)
check('isRootRequired plain', isRootRequired({ kind: 'run', user: 'x' }), false)
check('isRootRequired flag', isRootRequired({ kind: 'run', user: 'x', requiresRoot: true }), true)

if (failures > 0) {
  console.error(`\n${failures} FALLOS`)
  process.exit(1)
}
console.log('\nTODOS LOS TESTS DEL PORTAPAPELES PASAN')
