import { useEffect, useMemo, useState } from 'react'
import { Search, Shapes, ArrowRight, GitCompareArrows } from 'lucide-react'
import { CATS, EQUIVALENCES as PKG_EQUIVALENCIAS, SYMBOLS } from '../data/cmdcenter/meta'
import type { CatId } from '../data/cmdcenter/meta'
import { COMMANDS } from '../data/cmdcenter/entries'
import CommandCard from '../components/CommandCard'
import DistributionSelector from '../components/DistributionSelector'
import Breadcrumbs, { PageHeader } from '../components/Breadcrumbs'
import Quiz from '../components/Quiz'
import { useApp } from '../context/AppContext'
import { cn } from '../lib/utils'

const PKG_CONCEPTS = [
  { q: '¿Qué es un gestor de paquetes?', a: 'El programa que instala, actualiza, consulta y elimina el software del sistema de forma controlada: pacman en Arch, APT en Debian/Ubuntu. Lleva cuenta de qué hay instalado, qué versión y de qué depende cada pieza.', ejemplo: 'sudo pacman -Syu   ·   sudo apt update && sudo apt upgrade' },
  { q: '¿Qué es un repositorio?', a: 'Un servidor (o espejo) con paquetes preparados para tu distribución, firmados criptográficamente. Tu sistema descarga de ahí los índices (listas de qué existe y qué versión) y los propios paquetes.', ejemplo: 'sudo apt update   ·   sudo pacman -Sy' },
  { q: '¿Qué significa instalar un paquete?', a: 'Descargarlo del repositorio, verificar su firma, desplegar sus archivos en las rutas correctas (/usr/bin, /etc…) y registrar todo en la base de datos local para poder consultarlo o eliminarlo limpiamente.', ejemplo: 'sudo pacman -S htop   ·   sudo apt install htop' },
  { q: '¿Qué son las dependencias?', a: 'Otros paquetes que el tuyo necesita para funcionar. El gestor los resuelve e instala automáticamente: si instalas python3-pip, trae python3 sin que se lo pidas.', ejemplo: 'sudo apt install python3-pip' },
  { q: 'Actualizar índices ≠ actualizar paquetes', a: 'Refrescar índices («¿qué versiones hay?») es apt update / pacman -Sy; aplicar esas versiones es apt upgrade / pacman -Su. En Arch la combinación -Syu es OBLIGATORIA para evitar mezclas incompatibles.', ejemplo: 'sudo pacman -Syu' },
  { q: 'Eliminar un paquete', a: 'remove/purge (apt) o -R/-Rs (pacman). La diferencia educativa: purge y Rs también borran configuraciones y dependencias que quedaron huérfanas.', ejemplo: 'sudo pacman -Rs nombre   ·   sudo apt purge nombre' },
  { q: 'Arch vs Ubuntu: la filosofía', a: 'Arch = rolling release con repos únicos + AUR comunitario; actualiza TODO junto (-Syu) y pronto. Ubuntu = releases estables con repos por versión; separa update/upgrade y congela versiones salvo parches de seguridad.', ejemplo: null },
]

type Tab = 'explorar' | 'quiero' | 'simbolos' | 'equiv'

const INTENT_EXAMPLES = [
  'Quiero buscar un archivo',
  'Quiero buscar texto dentro de archivos',
  'Quiero saber qué está ocupando espacio',
  'Quiero ver qué procesos están ejecutándose',
  'Quiero saber qué proceso está usando un puerto',
  'Quiero cambiar los permisos de un archivo',
  'Quiero conectarme por SSH',
  'Quiero instalar un programa',
  'Quiero actualizar el sistema',
  'Quiero ver información de mi GPU',
  'Quiero ver mi dirección IP',
  'Quiero ver los servicios activos',
  'Quiero comprimir una carpeta',
  'Quiero descargar un archivo',
]

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^quiero\s+(hacer\s+)?/, '')
    .replace(/[¿?¡!.]/g, '')
    .trim()
}

function scoreIntent(entry: (typeof COMMANDS)[0], q: string): number {
  const name = entry.name.toLowerCase()
  if (name === q || name.split(' ')[0] === q) return 200
  let s = 0
  for (const intent of entry.intents) {
    const ni = normalize(intent)
    if (ni === q) s += 120
    else {
      // coincidencia por palabras clave compartidas
      const qw = q.split(/\s+/).filter((w) => w.length > 2)
      const hits = qw.filter((w) => ni.includes(w)).length
      if (hits > 0) s += 25 * hits
      if (ni.includes(q) || q.includes(ni)) s += 40
    }
  }
  const nsum = normalize(entry.summary)
  const qw = q.split(/\s+/).filter((w) => w.length > 2)
  s += qw.filter((w) => nsum.includes(w)).length * 8
  if (entry.important) s += 5
  return s
}

export default function CommandCenterPage({ focus }: { focus?: string }) {
  const [tab, setTab] = useState<Tab>('explorar')
  const [cat, setCat] = useState<CatId | null>(null)
  const [intent, setIntent] = useState('')
  const { distroView, isDone } = useApp()

  useEffect(() => {
    document.title = 'Linux Command Center — ArchForge'
    if (focus) setTab('explorar')
  }, [focus])

  const filtered = useMemo(
    () =>
      COMMANDS.filter((c) => {
        if (!cat && !focus) return true
        return cat ? c.cat === cat : c.id === focus
      }).filter((c) => distroView === 'all' || c.distro.includes(distroView)),
    [cat, distroView, focus],
  )

  const results = useMemo(() => {
    const q = normalize(intent)
    if (q.length < 3) return []
    return COMMANDS.map((c) => ({ c, sc: scoreIntent(c, q) }))
      .filter((r) => r.sc > 20)
      .sort((a, b) => b.sc - a.sc)
      .slice(0, 8)
      .map((r) => r.c)
      .filter((c) => distroView === 'all' || c.distro.includes(distroView))
  }, [intent, distroView])

  const learnedCount = useMemo(() => COMMANDS.filter((c) => isDone(`cmd:${c.id}`)).length, [isDone])

  return (
    <div className="animate-fade-in">
      <Breadcrumbs items={[{ label: 'Linux Command Center' }]} />
      <PageHeader
        icon={<Shapes className="h-6 w-6" />}
        title="Linux Command Center"
        subtitle="Cheatsheet interactiva orientada a Arch, Debian y Ubuntu: busca por intención («¿qué quieres hacer?»), descompón cada comando parte a parte y aprende las diferencias entre distribuciones."
        actions={<DistributionSelector />}
      />

      {/* Tabs */}
      <div className="mb-5 flex flex-wrap gap-2">
        {(
          [
            ['explorar', 'Explorar comandos'],
            ['quiero', '¿Qué quieres hacer?'],
            ['simbolos', 'Símbolos del shell'],
            ['equiv', 'Arch ↔ Debian'],
          ] as [Tab, string][]
        ).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'rounded-lg border px-3.5 py-1.5 text-xs font-medium transition-colors',
              tab === t
                ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                : 'border-zinc-800 bg-ink-900/60 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200',
            )}
          >
            {label}
          </button>
        ))}
        <span className="ml-auto self-center font-mono text-[10px] uppercase tracking-wider text-zinc-600">
          {learnedCount}/{COMMANDS.length} aprendidos
        </span>
      </div>

      {/* EXPLORAR */}
      {tab === 'explorar' && (
        <>
          <div className="mb-4 flex flex-wrap gap-1.5">
            <button
              onClick={() => { setCat(null); }}
              className={cn('rounded-lg border px-3 py-1 text-xs transition-colors', !cat ? 'border-sky-500/50 bg-sky-500/10 text-sky-300' : 'border-zinc-800 text-zinc-400 hover:border-zinc-600')}
            >
              Todas
            </button>
            {CATS.map((c) => (
              <button
                key={c.id}
                onClick={() => setCat(c.id === cat ? null : c.id)}
                className={cn('rounded-lg border px-3 py-1 text-xs transition-colors', cat === c.id ? 'border-sky-500/50 bg-sky-500/10 text-sky-300' : 'border-zinc-800 text-zinc-400 hover:border-zinc-600')}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="space-y-3">
            {filtered.map((c) => (
              <CommandCard key={c.id} entry={c} defaultOpen={focus === c.id} />
            ))}
            {filtered.length === 0 && (
              <p className="rounded-xl border border-zinc-800 p-6 text-center text-sm text-zinc-500">
                Nada en esta categoría para {distroView}. Cambia el filtro de distribución arriba.
              </p>
            )}
          </div>
        </>
      )}

      {/* QUIERO HACER */}
      {tab === 'quiero' && (
        <div className="space-y-5">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              placeholder="¿Qué quieres hacer? Describe tu objetivo en lenguaje natural…"
              aria-label="Buscador de intenciones"
              className="w-full rounded-2xl border border-zinc-700 bg-ink-900 py-3.5 pl-11 pr-4 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-emerald-500/60"
            />
          </div>

          {!intent && (
            <div className="flex flex-wrap gap-2">
              {INTENT_EXAMPLES.map((ex) => (
                <button key={ex} onClick={() => setIntent(ex)} className="rounded-full border border-zinc-800 bg-ink-900/70 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-emerald-500/40 hover:text-emerald-300">
                  {ex}
                </button>
              ))}
            </div>
          )}

          {intent && results.length > 0 && (
            <div className="space-y-4">
              <p className="font-mono text-xs uppercase tracking-widest text-emerald-400">Recomendado</p>
              <CommandCard entry={results[0]} defaultOpen />

              {results.slice(1).some((c) => c.distro.includes(distroView === 'debian' ? 'debian' : 'arch') || distroView === 'all') && (
                <>
                  <p className="pt-2 font-mono text-xs uppercase tracking-widest text-violet-400">Alternativas y relacionados</p>
                  {results.slice(1, 5).map((c) => (
                    <div key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-zinc-800 bg-ink-900/60 p-4">
                      <code className="font-mono text-sm font-bold text-emerald-300">{c.name}</code>
                      <span className="min-w-0 flex-1 truncate text-xs text-zinc-400">{c.summary}</span>
                      <button onClick={() => setTab('explorar')} className="shrink-0 rounded-md border border-zinc-700 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-zinc-400 hover:text-sky-300">
                        detalles <ArrowRight className="inline h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))}
                </>
              )}

              {(results[0].distro.includes('arch') || results[0].distro.includes('debian')) && results[0].distro.length > 0 && (
                <DistroNote cat={results[0].cat} />
              )}
            </div>
          )}

          {intent && results.length === 0 && (
            <p className="rounded-xl border border-zinc-800 bg-ink-900/60 p-6 text-center text-sm leading-relaxed text-zinc-500">
              Sin coincidencias claras. Prueba con verbos concretos: «buscar», «comprimir», «ver procesos»… o usa la búsqueda global con Ctrl+K.
            </p>
          )}
        </div>
      )}

      {/* SÍMBOLOS */}
      {tab === 'simbolos' && (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2">
            {SYMBOLS.map((s) => (
              <article key={s.symbol + s.name} className="rounded-2xl border border-zinc-800 bg-ink-900/70 p-4">
                <div className="flex items-baseline gap-3">
                  <code className="min-w-[3rem] rounded-lg border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-center font-mono text-lg font-bold text-sky-300">{s.symbol}</code>
                  <h3 className="text-sm font-semibold text-zinc-100">{s.name}</h3>
                </div>
                <p className="mt-2.5 text-sm leading-relaxed text-zinc-400">{s.meaning}</p>
                <div className="mt-3 overflow-hidden rounded-lg border border-zinc-800 bg-black/40">
                  <pre className="overflow-x-auto px-3 py-2 font-mono text-xs leading-6 text-zinc-300">{s.example}</pre>
                </div>
                <p className="mt-1.5 text-xs italic leading-relaxed text-zinc-500">{s.exampleExplain}</p>
              </article>
            ))}
          </div>

          <section className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 to-transparent p-5">
            <h3 className="mb-3 font-semibold text-zinc-100">Ejercicios: símbolos y flujos del shell</h3>
            <div className="space-y-4">
              <Quiz quiz={{
                id: 'sym-q1', difficulty: 'beginner',
                question: 'ls *.conf — ¿qué hace *.conf?',
                options: [
                  { text: 'Lista solo archivos llamados literalmente "*.conf"', why: 'Sin comillas, el shell EXPANDE el glob antes de ejecutar ls.' },
                  { text: 'El shell expande todos los nombres que acaban en .conf y se los pasa a ls', why: 'Los globs los resuelve el SHELL, no el comando: ls recibe ya la lista final.' },
                  { text: 'Busca en subdirectorios recursivamente', why: 'Recursivo sería ls -R o ** con globstar activado.' },
                  { text: 'Filtra la salida de ls', why: 'Filtrar salida es trabajo de pipes+grep.' },
                ],
                answer: 1,
              }} />
              <Quiz quiz={{
                id: 'sym-q2', difficulty: 'intermediate',
                question: 'mkdir proyecto && cd proyecto || echo "fallo" — ¿cuándo se imprime «fallo»?',
                context: '$ mkdir proyecto && cd proyecto || echo "fallo"',
                options: [
                  { text: 'Siempre, tras crear la carpeta', why: '&& exige éxito previo; echo final solo corre si algo falló.' },
                  { text: 'Si mkdir falla O si cd falla después de crearla', why: 'La cadena es A&&B||C: si A o B devuelve error, C se ejecuta. Es un patrón útil pero NO equivalente a try/catch.' },
                  { text: 'Nunca: || no existe en bash', why: '|| y && son operadores estándar de cualquier POSIX shell.' },
                  { text: 'Solo si falta permiso de escritura', why: 'Cualquier fallo en mkdir o cd dispara el echo, no solo permisos.' },
                ],
                answer: 1,
              }} />
              <Quiz quiz={{
                id: 'sym-q3', difficulty: 'expert',
                question: '¿Diferencia clave entre > y >>?',
                options: [
                  { text: '> es para texto, >> para binarios', why: 'Ambos trabajan bytes; la diferencia es truncar vs añadir.' },
                  { text: '> trunca/sobrescribe el destino; >> abre en modo append y añade al final', why: 'O_TRUNC vs O_APPEND en la apertura del fichero destino.' },
                  { text: '> redirige stdout, >> redirige stderr', why: 'stderr es 2> en ambos casos; > y >> afectan stdout.' },
                  { text: 'Son alias exactos', why: 'Confundirlos puede DESTRUIR datos: > borra sin preguntar.' },
                ],
                answer: 1,
              }} />
            </div>
          </section>
        </div>
      )}

      {/* EQUIVALENCIAS */}
      {tab === 'equiv' && (
        <div className="space-y-4">
          <p className="flex items-start gap-2 rounded-xl border border-sky-500/25 bg-sky-500/[0.06] p-3.5 text-sm leading-relaxed text-zinc-300">
            <GitCompareArrows className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
            Las mismas tareas resueltas en cada familia. La diferencia real va más allá del comando: filosofía de repositorios, versionado y herramientas auxiliares.
          </p>

          <section className="rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 to-transparent p-5">
            <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-emerald-300">Gestores de paquetes: los conceptos</h3>
            <dl className="mt-4 space-y-3.5">
              {PKG_CONCEPTS.map((c) => (
                <div key={c.q} className="rounded-xl border border-zinc-800 bg-black/20 p-3.5">
                  <dt className="text-sm font-semibold text-zinc-100">{c.q}</dt>
                  <dd className="mt-1 text-sm leading-relaxed text-zinc-400">{c.a}</dd>
                  {c.ejemplo && (
                    <pre className="mt-2 overflow-x-auto rounded-lg border border-zinc-800 bg-black/40 px-3 py-1.5 font-mono text-[11px] text-zinc-300">$ {c.ejemplo}</pre>
                  )}
                </div>
              ))}
            </dl>
            <p className="mt-4 rounded-lg border border-zinc-800 bg-ink-900/70 px-3.5 py-2.5 font-mono text-[11px] leading-relaxed text-zinc-500">
              Arch Linux utiliza PACMAN (+ AUR con yay/paru) · Ubuntu/Debian utilizan APT (+ dpkg por debajo).
              No se mezclan: cada distribución solo conoce su gestor.
            </p>
          </section>

          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-4">
              {PKG_EQUIVALENCIAS.map((row, i) => (
                <article key={i} className="overflow-hidden rounded-2xl border border-zinc-800 bg-ink-900/70">
                  <header className="border-b border-zinc-800 bg-zinc-900/50 px-4 py-2.5 font-medium text-zinc-100">{row.task}</header>
                  <div className="grid divide-y divide-zinc-800 md:grid-cols-2 md:divide-x md:divide-y-0">
                    <div className="p-4">
                      <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-widest text-sky-400">Arch</p>
                      <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-zinc-800 bg-black/40 p-3 font-mono text-xs leading-6 text-zinc-200">$ {row.archLines.join('\n$ ')}</pre>
                    </div>
                    <div className="p-4">
                      <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-widest text-rose-400">Debian / Ubuntu</p>
                      <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-zinc-800 bg-black/40 p-3 font-mono text-xs leading-6 text-zinc-200">$ {row.debianLines.join('\n$ ')}</pre>
                    </div>
                  </div>
                  <p className="border-t border-zinc-800 px-4 py-3 text-sm leading-relaxed text-zinc-400">{row.explain}</p>
                </article>
              ))}
            </div>

            <aside className="space-y-4 lg:sticky lg:top-20">
              <p className="rounded-xl border border-teal-500/30 bg-teal-500/[0.06] px-4 py-3 text-xs leading-relaxed text-zinc-300">
                💡 Estos gestores existen DENTRO de la Terminal interactiva: abre ArchForge CLI, elige tu distribución y practica
                install/remove/search con paquetes virtuales.
              </p>
              <a href="#/terminal" className="block rounded-xl border border-teal-500/40 bg-teal-500/10 p-4 text-center text-sm font-medium text-teal-200 transition-colors hover:bg-teal-500/20">
                Abrir la terminal →
              </a>
            </aside>
          </div>
        </div>
      )}
    </div>
  )
}

function DistroNote({ cat }: { cat: CatId }) {
  void cat
  return null
}
