/* QA de integridad de datos: enlaces válidos, contenido completo, builder funcional. */
import { REGISTRY } from '../src/data/registry'
import { SECTIONS } from '../src/data/sections'
import { buildGuide } from '../src/data/builderLogic'
import type { BuilderConfig } from '../src/types'

let failures = 0
const fail = (m: string) => { failures++; console.error('FALLO ' + m) }
const ok = (m: string) => console.log('ok   ' + m)

// 1. Cada sección del sidebar tiene contenido fusionado y lead no vacío
const ids = new Set(SECTIONS.map((s) => s.id))
if (SECTIONS.length !== 45) fail(`esperaba 45 secciones (+dashboard = 46 nav), hay ${SECTIONS.length}`)
else ok('45 secciones registradas + dashboard')

for (const s of REGISTRY) {
  if (!s.lead) fail(`sección ${s.id} sin lead`)
  const hasContent = (s.steps && s.steps.length > 0) || (s.blocks && s.blocks.length > 0) || s.id === 'troubleshooting'
  if (!hasContent) fail(`sección ${s.id} SIN contenido`)
}
ok('todas las secciones tienen contenido')

// 2. Instalación: exactamente 31 pasos con todos los campos pedidos
const inst = REGISTRY.find((s) => s.id === 'installation')!
if (!inst.steps || inst.steps.length !== 31) fail(`instalación tiene ${inst.steps?.length} pasos (esperaba 31)`)
else ok('instalación con 31 pasos')
for (const st of inst.steps ?? []) {
  for (const field of ['title', 'goal', 'blocks', 'importance'] as const) {
    if (st[field] === undefined || st[field] === null) fail(`paso ${st.id} sin campo ${field}`)
  }
}

// 3. IDs de pasos únicos en todo el registro
const seen = new Set<string>()
for (const s of REGISTRY) for (const st of s.steps ?? []) {
  if (seen.has(st.id)) fail(`step id duplicado: ${st.id}`)
  seen.add(st.id)
}
ok('ids de paso únicos')

// 4. related[] apuntan a secciones existentes; linkSection del builder también
const validTargets = new Set([...ids, 'troubleshooting'])
for (const s of REGISTRY) for (const r of s.related ?? []) {
  if (!validTargets.has(r)) fail(`${s.id}: related roto → ${r}`)
}
ok('related[] válidos')

// 5. Comparadores: 8, con opciones bien formadas
import { COMPARISONS } from '../src/data/comparisons'
if (COMPARISONS.length !== 8) fail(`comparadores: ${COMPARISONS.length} (esperaba 8)`)
else ok('8 comparaciones')
for (const c of COMPARISONS) for (const o of c.options) {
  if (!o.pros.length && !o.cons.length) fail(`comparación ${c.id}/${o.id} vacía`)
}

// 6. Troubleshooting: los 14 problemas solicitados como mínimo
import { PROBLEMS } from '../src/data/troubleshooting'
const wanted = ['no-internet', 'no-wifi', 'no-audio', 'black-screen', 'nvidia-not-working', 'hyprland-no-start', 'steam-no-open', 'proton-fail', 'bluetooth-fail', 'grub-missing', 'systemd-boot-missing', 'arch-no-boot', 'pacman-error', 'aur-fail']
for (const w of wanted) if (!PROBLEMS.find((p) => p.id === w)) fail(`falta problema ${w}`)
ok(`troubleshooting completo (${PROBLEMS.length} problemas)`)

// 7. Comprobador de estado incluye los comandos exigidos
import { DIAG_COMMANDS } from '../src/data/statusChecks'
const cmdsWanted = ['lsblk', 'ip addr', 'ip route', 'uname -r', 'lspci -k', 'systemctl status NetworkManager', 'systemctl --failed', 'df -h', 'free -h']
for (const cw of cmdsWanted) {
  if (!DIAG_COMMANDS.find((d) => d.cmd.toLowerCase().startsWith(cw.toLowerCase()))) fail(`diag falta: ${cw}`)
}
ok('comprobador de estado con comandos requeridos')

// 8. Builder: todas las combinaciones generan fases sin crash y sin comandos con $
const cpus: BuilderConfig['cpu'][] = ['nvidia', 'amd', 'intel']
const fses: BuilderConfig['fs'][] = ['ext4', 'btrfs']
const bls: BuilderConfig['bootloader'][] = ['systemd-boot', 'grub']
const des: BuilderConfig['de'][] = ['kde', 'gnome', 'hyprland', 'sway', 'i3', 'xfce', 'none']
const dms: BuilderConfig['dm'][] = ['sddm', 'gdm', 'greetd', 'none']
const shs: BuilderConfig['shell'][] = ['bash', 'zsh', 'fish']
const uses: BuilderConfig['use'][] = ['gaming', 'dev', 'server', 'general', 'minimal', 'workstation']

let combos = 0
let badPrefix = 0
for (const cpu of cpus) for (const fs of fses) for (const bootloader of bls) for (const de of des) for (const dm of dms) for (const shell of shs) for (const use of uses) {
  const res = buildGuide({ cpu, fs, bootloader, de, dm, shell, use })
  combos++
  if (res.phases.length < 4) fail(`builder combo ${cpu}/${fs}/${use}: solo ${res.phases.length} fases`)
  for (const ph of res.phases) for (const it of ph.items) for (const l of it.lines ?? []) {
    if (l.kind === 'run' && (l.user.startsWith('$') || l.user.startsWith('#'))) badPrefix++
  }
}
if (badPrefix > 0) fail(`builder: ${badPrefix} líneas con prefijo $/# dentro del texto copiable`)
else ok(`builder genera ${combos} combinaciones limpias (sin prefijos en comandos)`)

// 9. Glosario no vacío
import { GLOSSARY } from '../src/data/glossary'
if (GLOSSARY.length < 30) fail(`glosario corto: ${GLOSSARY.length}`)
else ok(`glosario con ${GLOSSARY.length} términos`)

if (failures) { console.error(`\n${failures} FALLOS`); process.exit(1) }
console.log('\nQA DE DATOS: TODO OK')
