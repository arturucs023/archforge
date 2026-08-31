import { useMemo, useState } from 'react'
import { CheckCircle2, Lightbulb, Stethoscope } from 'lucide-react'
import VirtualTerminal from './VirtualTerminal'
import { ShellSession } from '../cli/engine'
import { useApp } from '../context/AppContext'
import { cn } from '../lib/utils'

export interface DiagStep {
  prompt: string
  hint: string
  /** valida el paso inspeccionando la sesión (historial + FS virtual) */
  validate(s: ShellSession): { ok: boolean; detail: string }
}

export interface DiagScenario {
  id: string
  title: string
  level: 'facil' | 'intermedio' | 'avanzado'
  brief: string
  rootSeed?(vfs: import('../cli/fs').VFS): void
  steps: DiagStep[]
}

const LEVEL_DOT: Record<string, string> = {
  facil: 'bg-emerald-400',
  intermedio: 'bg-amber-400',
  avanzado: 'bg-rose-400',
}

export const DIAG_SCENARIOS: DiagScenario[] = [
  {
    id: 'dns-roto',
    title: 'No puedo acceder a example.com',
    level: 'intermedio',
    brief: 'Navegas por IP pero los dominios no abren. Sigue las capas: conectividad → resolución → configuración DNS.',
    rootSeed(vfs) {
      vfs.writeFile('/etc/resolv.conf', 'nameserver 10.9.9.9\noptions timeout:1\n')
    },
    steps: [
      {
        prompt: 'PASO 1 — Comprueba conectividad IP: ping a la IP 8.8.8.8.',
        hint: 'ping -c2 8.8.8.8',
        validate(s) {
          const ran = s.state.history.some((h) => h.includes('ping') && h.includes('8.8.8.8'))
          return { ok: ran, detail: ran ? 'La capa IP funciona: el fallo está más arriba.' : 'ejecuta ping -c2 8.8.8.8 y observa' }
        },
      },
      {
        prompt: 'PASO 2 — Prueba resolución de nombres: ping example.com.',
        hint: 'ping example.com',
        validate(s) {
          const ran = s.state.history.some((h) => h.includes('ping') && h.includes('example.com'))
          return { ok: ran, detail: ran ? 'El dominio no responde mientras la IP sí: sospecha del DNS.' : 'ejecuta ping example.com y compara' }
        },
      },
      {
        prompt: 'PASO 3 — Inspecciona tu servidor DNS configurado: cat /etc/resolv.conf',
        hint: 'cat /etc/resolv.conf',
        validate(s) {
          const ran = s.state.history.some((h) => h.startsWith('cat /etc/resolv.conf'))
          return { ok: ran, detail: ran ? 'nameserver 10.9.9.9 no es un DNS válido: causa encontrada.' : 'muestra el fichero con cat' }
        },
      },
      {
        prompt: 'PASO 4 — Corrige el fichero para usar 1.1.1.1 como nameserver.',
        hint: 'echo "nameserver 1.1.1.1" > /etc/resolv.conf',
        validate(s) {
          let content = ''
          try { content = s.vfs.readFile('/etc/resolv.conf') } catch { /* noop */ }
          const ok = content.includes('nameserver 1.1.1.1')
          return { ok, detail: ok ? 'resolv.conf corregido: los dominios volverán a resolver.' : 'el fichero aún no apunta a 1.1.1.1' }
        },
      },
    ],
  },
  {
    id: 'permiso-srv',
    title: 'Permission denied al escribir en /srv/datos',
    level: 'facil',
    brief: 'Intentas crear archivos en /srv/datos y recibes Permission denied. Diagnosticar dueño/permisos y corregir con chown.',
    rootSeed(vfs) {
      vfs.createDir('/srv', true)
      vfs.createDir('/srv/datos')
      const node = vfs.get('/srv/datos')!
      node.owner = 'root'
      node.group = 'root'
      node.mode = 0o755
    },
    steps: [
      {
        prompt: 'PASO 1 — Reproduce el error: touch /srv/datos/prueba.txt',
        hint: 'touch /srv/datos/prueba.txt',
        validate(s) {
          const ran = s.state.history.some((h) => h.includes('touch') && h.includes('/srv/datos'))
          return { ok: ran, detail: ran ? 'Error confirmado: ahora diagnostica el porqué.' : 'reproduce el error primero' }
        },
      },
      {
        prompt: 'PASO 2 — Inspecciona dueño y permisos: ls -ld /srv/datos',
        hint: 'ls -ld /srv/datos',
        validate(s) {
          const ran = s.state.history.some((h) => h.includes('ls -ld') && h.includes('/srv/datos'))
          return { ok: ran, detail: ran ? 'Dueño root sin w para otros: causa identificada.' : 'lista dueño y permisos con ls -ld' }
        },
      },
      {
        prompt: 'PASO 3 — Corrige la propiedad con sudo chown user /srv/datos y verifica creando el archivo.',
        hint: 'sudo chown user /srv/datos && touch /srv/datos/prueba.txt',
        validate(s) {
          const node = s.vfs.get('/srv/datos')
          if (!node) return { ok: false, detail: '/srv/datos ya no existe' }
          if (node.owner !== 'user') return { ok: false, detail: 'el dueño sigue siendo root' }
          const prueba = s.vfs.get('/srv/datos/prueba.txt')
          return { ok: !!prueba, detail: prueba ? 'Dueño corregido y escritura verificada.' : 'dueño correcto: falta crear el archivo de prueba' }
        },
      },
    ],
  },
  {
    id: 'sshd-config-rota',
    title: 'sshd no arranca tras editar su config',
    level: 'avanzado',
    brief: 'Alguien editó /etc/ssh/sshd_config y el servicio dejó de arrancar. Localiza la línea rota con cat y corrígela con sed -i.',
    rootSeed(vfs) {
      vfs.writeFile('/etc/ssh/sshd_config', '# configuración del servidor SSH\nPort banana\nPermitRootLogin no\n')
    },
    steps: [
      {
        prompt: 'PASO 1 — Lee la configuración actual: cat /etc/ssh/sshd_config. Busca valores inválidos.',
        hint: 'cat /etc/ssh/sshd_config',
        validate(s) {
          const ran = s.state.history.some((h) => h.includes('cat') && h.includes('sshd_config'))
          return { ok: ran, detail: ran ? '¿Ves «Port banana»? No es un puerto válido.' : 'lee el fichero con cat' }
        },
      },
      {
        prompt: 'PASO 2 — Corrige la línea con sed -i para dejar Port 22.',
        hint: "sed -i 's/^Port .*/Port 22/' /etc/ssh/sshd_config",
        validate(s) {
          let content = ''
          try { content = s.vfs.readFile('/etc/ssh/sshd_config') } catch { /* noop */ }
          const ok = /^Port 22$/m.test(content)
          return { ok, detail: ok ? 'Configuración corregida: Port 22 es válido.' : 'la línea Port sigue inválida' }
        },
      },
      {
        prompt: 'PASO 3 — Verifica mostrando de nuevo el fichero corregido.',
        hint: 'cat /etc/ssh/sshd_config',
        validate(s) {
          const cats = s.state.history.filter((h) => h.includes('cat') && h.includes('sshd_config')).length
          return { ok: cats >= 2, detail: cats >= 2 ? 'Diagnóstico completo: leído, corregido y verificado.' : 'vuelve a mostrarlo para confirmar' }
        },
      },
    ],
  },
]

export default function DiagnosticScenarios() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const scenario = useMemo(() => DIAG_SCENARIOS.find((d) => d.id === selectedId), [selectedId])

  if (scenario) return <ScenarioRun key={scenario.id} scenario={scenario} onBack={() => setSelectedId(null)} />

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {DIAG_SCENARIOS.map((d) => (
        <button
          key={d.id}
          onClick={() => setSelectedId(d.id)}
          className="group rounded-xl border border-zinc-800 bg-ink-900/70 p-4 text-left transition-colors hover:border-teal-500/40"
        >
          <span className="flex items-center gap-2">
            <span className={cn('inline-block h-2 w-2 rounded-full', LEVEL_DOT[d.level])} />
            <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">{d.level}</span>
          </span>
          <span className="mt-1 block text-sm font-semibold text-zinc-100 group-hover:text-teal-200">{d.title}</span>
        </button>
      ))}
    </div>
  )
}

function ScenarioRun({ scenario, onBack }: { scenario: DiagScenario; onBack: () => void }) {
  const { isDone, markDone } = useApp()
  const session = useMemo(() => new ShellSession(), [scenario])
  const [step, setStep] = useState(0)
  const [result, setResult] = useState<{ ok: boolean; detail: string } | null>(null)
  const [showHint, setShowHint] = useState(false)

  const current = scenario.steps[step]
  const finished = step >= scenario.steps.length
  const done = isDone(`diag:${scenario.id}`)

  const check = (): void => {
    const r = current.validate(session)
    setResult(r)
  }

  return (
    <section className="animate-fade-in space-y-5">
      <div>
        <button onClick={onBack} className="mb-3 inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-sky-300">
          <Stethoscope className="h-3.5 w-3.5" /> todos los escenarios
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-bold text-zinc-50">{scenario.title}</h3>
          <span className={cn('inline-block h-2.5 w-2.5 rounded-full', LEVEL_DOT[scenario.level])} aria-hidden />
        </div>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-zinc-400">{scenario.brief}</p>
      </div>

      {!finished && current && (
        <div className="rounded-xl border border-sky-500/30 bg-sky-500/[0.06] p-4">
          <p className="text-sm font-medium leading-relaxed text-zinc-100">
            {current.prompt}
            <span className="ml-2 font-mono text-xs text-zinc-600">({step + 1}/{scenario.steps.length})</span>
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={check} className="rounded-lg border border-teal-500/50 bg-teal-500/15 px-4 py-2 text-sm font-medium text-teal-200 hover:bg-teal-500/25">Comprobar paso</button>
            {!showHint && (
              <button onClick={() => setShowHint(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200">
                <Lightbulb className="h-3.5 w-3.5" /> Pista
              </button>
            )}
            {step > 0 && (
              <button onClick={() => { setStep(step - 1); setResult(null); setShowHint(false) }} className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200">← Atrás</button>
            )}
          </div>
          {showHint && <p className="mt-2.5 font-mono text-[11px] text-zinc-500">pista: {current.hint}</p>}
          {result && (
            <p className={cn('mt-3 text-sm font-medium', result.ok ? 'text-emerald-300' : 'text-amber-300')}>
              {result.ok ? '✓ Correcto — ' : ''}{result.detail}
            </p>
          )}
        </div>
      )}

      {finished && (
        <div className="animate-fade-in rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-emerald-200">
            <CheckCircle2 className="h-4 w-4" /> Diagnóstico completado: has aplicado el método correcto paso a paso.
          </p>
          {!done && (
            <button onClick={() => markDone(`diag:${scenario.id}`, true)} className="mt-3 rounded-lg border border-emerald-500/50 bg-emerald-500/15 px-3.5 py-1.5 text-xs font-medium text-emerald-200 hover:bg-emerald-500/25">
              Registrar en mi progreso
            </button>
          )}
        </div>
      )}

      <VirtualTerminal isolated height="20rem" session={session} intro="Sandbox del diagnóstico: tus comandos solo afectan al entorno simulado." />
    </section>
  )
}
