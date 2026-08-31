export type Level = 'beginner' | 'intermediate' | 'expert'
export type ShellMode = 'user' | 'root'

export const LEVEL_RANK: Record<Level, number> = {
  beginner: 0,
  intermediate: 1,
  expert: 2,
}

export const LEVEL_LABEL: Record<Level, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  expert: 'Experto',
}

/* ---------------------------------- Comandos --------------------------------- */

/** LÃ­nea de comentario dentro de un bloque de comandos. Nunca se copia. */
export interface CmdCommentLine {
  kind: 'comment'
  text: string
}

/**
 * LÃ­nea de comando ejecutable.
 * `user`  â†’ tal como la teclearÃ­a un usuario normal (puede incluir sudo).
 * `root`  â†’ variante si ya estÃ¡s en una sesiÃ³n root; si se omite, se deriva
 *           quitando "sudo " inicial de `user`.
 */
export interface CmdRunLine {
  kind: 'run'
  user: string
  root?: string
  requiresRoot?: boolean
}

export type CmdLine = CmdCommentLine | CmdRunLine

export function isRootRequired(line: CmdLine): boolean {
  if (line.kind !== 'run') return false
  return line.requiresRoot ?? line.user.startsWith('sudo ')
}

function stripSudo(cmd: string): string {
  return cmd.startsWith('sudo ') ? cmd.slice(5) : cmd
}

/** Lo que se muestra para una lÃ­nea segÃºn el modo de shell. Los comentarios llevan "#". */
export function displayLine(line: CmdLine, mode: ShellMode): { prefix: '$' | '#' | ''; text: string; comment: boolean } | null {
  if (line.kind === 'comment') return { prefix: '#', text: line.text, comment: true }
  const needsRoot = isRootRequired(line)
  let text = line.user
  if (mode === 'root' && needsRoot) {
    text = line.root ?? stripSudo(line.user)
  }
  return { prefix: mode === 'root' ? '#' : '$', text, comment: false }
}

/**
 * Texto EXACTO que se copia al portapapeles.
 * - Nunca incluye "$" ni "#".
 * - Nunca incluye comentarios.
 * - En modo root, los comandos con sudo se copian sin sudo (variante root).
 */
export function copyText(lines: CmdLine[], mode: ShellMode): string {
  const out: string[] = []
  for (const line of lines) {
    if (line.kind !== 'run') continue
    if (mode === 'root' && isRootRequired(line)) {
      out.push(line.root ?? stripSudo(line.user))
    } else {
      out.push(line.user)
    }
  }
  return out.join('\n')
}

/* ------------------------------- Bloques de contenido ------------------------------ */

export type Importance =
  | 'required'
  | 'recommended'
  | 'optional'
  | 'alternative'
  | 'experimental'
  | 'danger'

export const IMPORTANCE_LABEL: Record<Importance, string> = {
  required: 'Obligatorio',
  recommended: 'Recomendado',
  optional: 'Opcional',
  alternative: 'Alternativo',
  experimental: 'Experimental',
  danger: 'Peligroso',
}

export interface ExplainToken {
  token: string
  meaning: string
}

interface BlockBase {
  minLevel?: Level
}

export interface ParagraphBlock extends BlockBase {
  type: 'paragraph'
  text: string
}
export interface HeadingBlock extends BlockBase {
  type: 'heading'
  text: string
}
export interface ListBlock extends BlockBase {
  type: 'list'
  items: string[]
  ordered?: boolean
}
export interface CommandBlockT extends BlockBase {
  type: 'command'
  lines: CmdLine[]
  caption?: string
  explain?: ExplainToken[]
  /** Requiere revelar antes de mostrar/copiar (comandos destructivos). */
  dangerous?: boolean
}
export interface OutputBlockT extends BlockBase {
  type: 'output'
  caption?: string
  lines: string[]
}
export type CalloutVariant = 'info' | 'tip' | 'warning' | 'danger'
export interface CalloutBlock extends BlockBase {
  type: 'callout'
  variant: CalloutVariant
  title?: string
  text: string
}
export interface TableBlock extends BlockBase {
  type: 'table'
  headers: string[]
  rows: string[][]
}
/** ProfundizaciÃ³n tÃ©cnica visible en nivel Intermedio/Experto. */
export interface InternalsBlock extends BlockBase {
  type: 'internals'
  title: string
  text: string
  points?: string[]
}
/** Contenido de un fichero de configuraciÃ³n (copiable). */
export interface FileBlock extends BlockBase {
  type: 'file'
  filename: string
  content: string
  note?: string
}
export interface LinkListBlock extends BlockBase {
  type: 'links'
  links: { label: string; to: string }[]
}

export type Block =
  | ParagraphBlock
  | HeadingBlock
  | ListBlock
  | CommandBlockT
  | OutputBlockT
  | CalloutBlock
  | TableBlock
  | InternalsBlock
  | FileBlock
  | LinkListBlock

/* ---------------------------------- Secciones -------------------------------- */

export interface StepError {
  symptom: string
  cause?: string
  fix: string
  fixBlocks?: Block[]
}

export interface Step {
  id: string
  title: string
  goal: string
  importance: Importance
  minutes?: number
  blocks: Block[]
  expect?: string
  verify?: Block[]
  errors?: StepError[]
  alternatives?: Block[]
}

export interface SectionMeta {
  id: string
  title: string
  icon: string
  group: string
  minutes: number
  level: Level
  lead: string
  keywords?: string[]
}

export interface SectionContent {
  steps?: Step[]
  blocks?: Block[]
  related?: string[]
}

export interface Section extends SectionMeta, SectionContent {}

/* ------------------------------- Comparadores ------------------------------- */

export interface CompareOption {
  id: string
  name: string
  difficulty: number // 1..5
  pros: string[]
  cons: string[]
  performance: string
  compatibility: string
  maintenance: string
  recommendedFor: string
}

export interface Comparison {
  id: string
  title: string
  question: string
  options: CompareOption[]
  verdict: string
}

/* ------------------------------ Troubleshooting ----------------------------- */

export interface Solution {
  title: string
  blocks: Block[]
}

export interface Problem {
  id: string
  title: string
  category: string
  level: 'facil' | 'intermedio' | 'avanzado'
  severity: 'low' | 'medium' | 'high'
  symptoms: string[]
  causes: string[]
  diagnose: Block[]
  solutions: Solution[]
  alternatives?: string[]
  finalCheck: string
}

/* --------------------------- Comprobador de estado -------------------------- */

export interface DiagCommand {
  id: string
  cmd: string
  category: string
  what: string
  sample: string[]
  reading: string[]
  healthy: string[]
  warning: string[]
}

/* --------------------------------- Builder ---------------------------------- */

export type CpuVendor = 'nvidia' | 'amd' | 'intel'
export type FsChoice = 'ext4' | 'btrfs'
export type BootloaderChoice = 'systemd-boot' | 'grub'
export type DeChoice = 'kde' | 'gnome' | 'hyprland' | 'sway' | 'i3' | 'xfce' | 'none'
export type DmChoice = 'sddm' | 'gdm' | 'greetd' | 'none'
export type ShellChoice = 'bash' | 'zsh' | 'fish'
export type UseCase = 'gaming' | 'dev' | 'server' | 'general' | 'minimal' | 'workstation'

export interface BuilderConfig {
  cpu: CpuVendor
  fs: FsChoice
  bootloader: BootloaderChoice
  de: DeChoice
  dm: DmChoice
  shell: ShellChoice
  use: UseCase
}

export interface GenItem {
  title: string
  detail?: string
  lines?: CmdLine[]
  linkSection?: string
  importance?: Importance
}

export interface GenPhase {
  title: string
  description: string
  items: GenItem[]
}

export interface BuilderResult {
  phases: GenPhase[]
  warnings: string[]
}

/* ===================== Iteración 2: multi-área ===================== */

export type Distro = 'arch' | 'debian'
export type DistroView = 'all' | 'arch' | 'debian'

export interface QuizOption {
  text: string
  why: string
}

export interface QuizData {
  id: string
  difficulty: 'beginner' | 'intermediate' | 'expert'
  question: string
  context?: string
  options: QuizOption[]
  answer: number
}

export type AreaId = 'arch' | 'commands' | 'learn' | 'troubleshooting' | 'bash' | 'labs' | 'servers'