const fs = require('fs')

// 1. types: área labs
{
  let s = fs.readFileSync('src/types.ts', 'utf8')
  s = s.replace("export type AreaId = 'arch' | 'commands' | 'learn' | 'troubleshooting' | 'bash'", "export type AreaId = 'arch' | 'commands' | 'learn' | 'troubleshooting' | 'bash' | 'labs'")
  fs.writeFileSync('src/types.ts', s)
}

// 2. progress.ts: área labs
{
  let s = fs.readFileSync('src/lib/progress.ts', 'utf8')
  if (!s.includes("'labs'")) {
    s = s.replace(
      "import { BASH_MODULES, BASH_PROJECTS } from '../data/bashcourse'",
      "import { BASH_MODULES, BASH_PROJECTS } from '../data/bashcourse'\nimport { LABS } from '../cli/labs'"
    )
    s = s.replace(
      "    case 'bash':\n      return BASH_MODULES.length + BASH_PROJECTS.length\n  }",
      "    case 'bash':\n      return BASH_MODULES.length + BASH_PROJECTS.length\n    case 'labs':\n      return LABS.length\n  }"
    )
    s = s.replace(
      "    case 'bash': {\n      for (const m of BASH_MODULES) if (isDone(`bash:${m.id}`)) n++\n      for (const p of BASH_PROJECTS) if (isDone(`bashproj:${p.id}`)) n++\n      return n\n    }\n  }",
      "    case 'bash': {\n      for (const m of BASH_MODULES) if (isDone(`bash:${m.id}`)) n++\n      for (const p of BASH_PROJECTS) if (isDone(`bashproj:${p.id}`)) n++\n      return n\n    }\n    case 'labs': {\n      for (const l of LABS) if (isDone(`lab:${l.id}`)) n++\n      return n\n    }\n  }"
    )
    s = s.replace(
      "  bash: { label: 'Curso de Bash', to: '/bash', color: 'bg-teal-500' },",
      "  bash: { label: 'Curso de Bash', to: '/bash', color: 'bg-teal-500' },\n  labs: { label: 'Laboratorios CLI', to: '/terminal', color: 'bg-cyan-500' },"
    )
    s = s.replace(
      "const order: AreaId[] = ['arch', 'commands', 'learn', 'bash', 'troubleshooting']",
      "const order: AreaId[] = ['arch', 'commands', 'learn', 'bash', 'labs', 'troubleshooting']"
    )
    fs.writeFileSync('src/lib/progress.ts', s)
  }
  console.log('progress labs:', s.includes('LABS'))
}

// 3. App.tsx: ruta /terminal
{
  let a = fs.readFileSync('src/App.tsx', 'utf8')
  if (!a.includes('TerminalPage')) {
    a = a.replace(
      "import BashCoursePage from './pages/BashCoursePage'",
      "import BashCoursePage from './pages/BashCoursePage'\nimport TerminalPage from './pages/TerminalPage'"
    )
    a = a.replace(
      "    case 'commands':",
      "    case 'terminal':\n      page = <TerminalPage />\n      break\n    case 'commands':"
    )
    fs.writeFileSync('src/App.tsx', a)
  }
  console.log('app terminal route:', a.includes("case 'terminal'"))
}

// 4. Sidebar: herramienta Terminal + Labs
{
  let sb = fs.readFileSync('src/components/Sidebar.tsx', 'utf8')
  if (!sb.includes('/terminal')) {
    sb = sb.replace(
      "import { ChevronDown, Hammer, Scale, Activity, LayoutDashboard, SquareTerminal, GraduationCap } from 'lucide-react'",
      "import { ChevronDown, Hammer, Scale, Activity, LayoutDashboard, SquareTerminal, GraduationCap, FlaskConical } from 'lucide-react'"
    )
    sb = sb.replace(
      "  { id: 'status-checker', label: 'Comprobador de estado', icon: Activity, to: '/status-checker', desc: '¿Está funcionando mi sistema?' },",
      "  { id: 'terminal', label: 'Terminal interactiva', icon: FlaskConical, to: '/terminal', desc: 'CLI simulada + laboratorios' },\n  { id: 'status-checker', label: 'Comprobador de estado', icon: Activity, to: '/status-checker', desc: '¿Está funcionando mi sistema?' },"
    )
    fs.writeFileSync('src/components/Sidebar.tsx', sb)
  }
  console.log('sidebar terminal:', sb.includes('/terminal'))
}

// 5. HomePage: tarjeta 🧪 Laboratorios entre Bash y Troubleshooting
{
  let h = fs.readFileSync('src/pages/HomePage.tsx', 'utf8')
  if (!h.includes("/terminal")) {
    h = h.replace(
      "  {
    to: '/troubleshooting',
    icon: Wrench,
    emoji: '🛠️',",
      "  {
    to: '/terminal',
    icon: SquareTerminal,
    emoji: '🧪',
    title: 'Laboratorios CLI',
    desc: 'Practica en una terminal Linux simulada con laboratorios validados paso a paso.',
    cta: 'Abrir terminal →',
    accent: 'cyan' as const,
  },
  {
    to: '/troubleshooting',
    icon: Wrench,
    emoji: '🛠️',"
    )
    h = h.replace(
      "  teal: { border: 'hover:border-teal-500/50'",
      "  cyan: { border: 'hover:border-cyan-500/50', icon: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30', btn: 'border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/15', bar: 'bg-cyan-500' },\n  teal: { border: 'hover:border-teal-500/50'"
    )
    fs.writeFileSync('src/pages/HomePage.tsx', h)
  }
  console.log('home labs card:', h.includes("/terminal"))
}
