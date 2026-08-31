/* Aviso educativo: CLI de ArchForge vs Linux real.
   Pequeño, discreto, con el sistema de acento actual (clases sky-* que siguen
   las variables --af-sky-*), responsive y accesible. */

import { ArrowRight } from 'lucide-react'

const CLI_POINTS = [
  'No necesitas instalar nada',
  'Ideal para aprender comandos',
  'Práctica rápida y segura',
  'Laboratorios controlados',
  'Perfecta para empezar',
]

const REAL_POINTS = [
  'Sistema de archivos real',
  'systemd real',
  'Servicios reales',
  'Red real',
  'Permisos reales',
  'Errores reales',
  'Ideal para avanzar hacia administración de sistemas',
]

export default function CliVsRealNotice() {
  return (
    <section
      aria-labelledby="cli-vs-real-title"
      className="mt-5 rounded-xl border border-zinc-800 bg-ink-900/60 p-4"
    >
      <h3 id="cli-vs-real-title" className="font-mono text-xs font-bold uppercase tracking-widest text-zinc-400">
        🖥️ ¿Quieres ir un paso más allá?
      </h3>

      <div className="mt-2 max-w-4xl space-y-2 text-sm leading-relaxed text-zinc-300">
        <p>
          La CLI de ArchForge está pensada para aprender y practicar comandos de forma rápida y segura.
          Sin embargo, es una simulación educativa y no puede reproducir todo el comportamiento de un
          sistema Linux real.
        </p>
        <p className="text-zinc-400">
          Si quieres aprender administración Linux de verdad, te recomendamos practicar también en una
          máquina Linux real o en una máquina virtual.
        </p>
      </div>

      {/* Dos opciones lado a lado en escritorio, apiladas en móvil */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <article className="rounded-xl border border-sky-500/25 bg-sky-500/[0.05] p-4">
          <h4 className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-widest text-sky-300">
            🟦 CLI de ArchForge
          </h4>
          <ul className="mt-2 space-y-1">
            {CLI_POINTS.map((pt) => (
              <li key={pt} className="flex items-start gap-2 text-[13px] leading-relaxed text-zinc-300">
                <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-sm bg-sky-400/70" />
                {pt}
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.05] p-4">
          <h4 className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-widest text-emerald-300">
            🟩 Linux real
          </h4>
          <ul className="mt-2 space-y-1">
            {REAL_POINTS.map((pt) => (
              <li key={pt} className="flex items-start gap-2 text-[13px] leading-relaxed text-zinc-300">
                <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-sm bg-emerald-400/70" />
                {pt}
              </li>
            ))}
          </ul>
        </article>
      </div>

      <p className="mt-4 border-l-2 border-sky-500/50 pl-3 text-sm font-medium italic leading-relaxed text-zinc-100">
        «ArchForge te enseña los conceptos. Una máquina Linux real te permite ponerlos en práctica.»
      </p>

      {/* Enlace preparado: la sección de Virtualización (KVM/QEMU) ya existe */}
      <a
        href="#/vm"
        className="mt-3 inline-flex items-center gap-2 rounded-lg border border-sky-500/40 bg-sky-500/10 px-4 py-2 text-sm font-medium text-sky-200 transition-colors hover:bg-sky-500/20"
        aria-label="Preparar un laboratorio Linux: abrir tu máquina virtual Alpine"
      >
        🖥️ Preparar un laboratorio Linux <ArrowRight className="h-3.5 w-3.5" />
      </a>
    </section>
  )
}
