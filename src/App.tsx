import { useEffect } from 'react'
import Layout from './components/Layout'
import { useRoute, navigate } from './lib/router'
import HomePage from './pages/HomePage'
import Dashboard from './pages/Dashboard'
import SectionPage from './pages/SectionPage'
import BuilderPage from './pages/BuilderPage'
import ComparePage from './pages/ComparePage'
import StatusCheckerPage from './pages/StatusCheckerPage'
import TroubleshootingPage from './pages/TroubleshootingPage'
import SettingsPage from './pages/SettingsPage'
import CommandCenterPage from './pages/CommandCenterPage'
import BashCoursePage from './pages/BashCoursePage'
import TerminalPage from './pages/TerminalPage'
import LearnPage from './pages/LearnPage'
import ServersPage from './pages/ServersPage'
import VMLabPage from './pages/VMLabPage'

export default function App() {
  const route = useRoute()
  const [head, a, b] = route.segments

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [route.path])

  let page: React.ReactNode
  switch (head) {
    case undefined:
      page = <HomePage />
      break
    case 'arch':
      page = <Dashboard />
      break
    case 'section':
      page = a === 'troubleshooting' ? <TroubleshootingPage /> : <SectionPage sectionId={a ?? ''} focusStep={route.query.s} />
      break
    case 'bash':
      page = <BashCoursePage lessonId={a} />
      break
    case 'terminal':
      page = <TerminalPage />
      break
    case 'commands':
      page = <CommandCenterPage focus={route.query.focus} />
      break
    case 'learn':
      page = <LearnPage conceptId={a} />
      break
    case 'servers':
      page = <ServersPage courseId={a} moduleId={b} />
      break
    case 'vm':
      page = <VMLabPage />
      break
    case 'builder':
      page = <BuilderPage />
      break
    case 'compare':
      page = <ComparePage cmpId={a} />
      break
    case 'status-checker':
      page = <StatusCheckerPage />
      break
    case 'troubleshooting':
      page = <TroubleshootingPage problemId={a} />
      break
    case 'settings':
      page = <SettingsPage />
      break
    default:
      page = (
        <div className="flex flex-col items-center gap-4 py-24 text-center">
          <p className="font-mono text-5xl font-bold text-zinc-700">404</p>
          <p className="text-zinc-400">Esta ruta no existe.</p>
          <button onClick={() => navigate('/')} className="rounded-lg border border-sky-500/40 bg-sky-500/10 px-4 py-2 text-sm text-sky-300 hover:bg-sky-500/20">
            Volver al inicio
          </button>
        </div>
      )
  }

  return <Layout>{page}</Layout>
}
