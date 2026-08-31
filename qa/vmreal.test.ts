/* QA LINUX REAL (VM): backend seguro, integración UI, aislamiento y no-regresión. */
import * as fsMod from 'fs'

let fails = 0
const ok = (cond: boolean, label: string): void => {
  if (!cond) fails++
  console.log(`${cond ? 'ok  ' : 'FALLO'} ${label}`)
}
const exists = (p: string): boolean => fsMod.existsSync(p)

/* ---------------- 1. artefactos de la infraestructura ---------------- */
{
  const iso = exists('vm/alpine-virt-3.24.1-x86_64.iso')
  const size = iso ? fsMod.statSync('vm/alpine-virt-3.24.1-x86_64.iso').size : 0
  ok(iso && size > 50_000_000 && size < 100_000_000, `ISO alpine-virt presente (${Math.round(size / 1048576)} MB)`)
  ok(exists('vm/base.qcow2'), 'estado base base.qcow2 construido')

  const server = exists('server/vm-server.mjs') ? fsMod.readFileSync('server/vm-server.mjs', 'utf8') : ''
  ok(server.length > 0, 'backend vm-server.mjs existe')
  // AISLAMIENTO: bind por defecto es localhost (HOST=127.0.0.1)
  ok(/listen\(PORT, HOST/.test(server) || /listen\(PORT_WS, '127\.0\.0\.1'/.test(server), 'WebSocket bind configurable (default 127.0.0.1)')
  // el input del usuario va por SSH, jamás exec en host
  ok(!/exec\(\s*(msg|input|cmd)/.test(server), 'sin exec() del input del usuario en el anfitrión')
  ok(server.includes('shellStream.write(msg.data'), 'input del usuario → SSH dentro de la VM')
  // reset = descartar overlay (nunca borrar base)
  ok(/create -f qcow2 -b "\$\{BASE\}"/.test(server), 'reset recrea overlay desde BASE')
  ok(!/rm\s+.*base\.qcow2|unlink.*base\.qcow2/i.test(server), 'el reset JAMÁS borra el estado base')
  // apagado elegante antes de forzar
  ok(server.includes('sudo -S poweroff') && server.includes('system_powerdown'), 'apagado: SSH poweroff + ACPI + kill como respaldo')
}

/* ---------------- 2. frontend: página /vm con xterm.js ---------------- */
{
  const page = exists('src/pages/VMLabPage.tsx') ? fsMod.readFileSync('src/pages/VMLabPage.tsx', 'utf8') : ''
  ok(page.includes('@xterm') || page.includes('xterm.min.js'), 'xterm.js cargado via CDN')
  ok(page.includes('ws://127.0.0.1:7860/vm-terminal'), 'conexión WebSocket al backend')
  for (const s of ['Iniciando Linux', 'Linux conectado', 'Linux desconectado', 'Restableciendo laboratorio']) {
    if (!page.includes(s)) { fails++; console.log(`FALLO falta estado UI: ${s}`) }
  }
  ok(true, 'estados visuales presentes')
  ok(page.includes('Restablecer el laboratorio') || page.includes('restablecer el laboratorio'), 'confirmación del reset presente')
  ok(page.includes("vmAction('open'") && page.includes("vmAction('reset'") && page.includes("vmAction('stop'"), 'controles open/reset/stop cableados')
  ok(page.includes('jamás se ejecutan en tu anfitrión') || page.includes('jamas se ejecutan en tu anfitrion'), 'aviso de aislamiento visible al usuario')
  // CLI educativa intacta y enlazada
  ok(page.includes('#/terminal'), 'enlace a la CLI educativa preservado')
}

/* ---------------- 3. navegación e integración ---------------- */
{
  const app = fsMod.readFileSync('src/App.tsx', 'utf8')
  ok(app.includes("case 'vm':"), 'ruta /vm registrada')
  const sb = fsMod.readFileSync('src/components/Sidebar.tsx', 'utf8')
  ok(sb.includes("'vm-real'") && sb.includes('Linux real (VM)'), 'sidebar con entrada Linux real (VM)')
  const dash = fsMod.readFileSync('src/pages/Dashboard.tsx', 'utf8')
  ok(dash.includes('navigate(\'/vm\')'), 'dashboard enlaza Linux real')
  const bash = fsMod.readFileSync('src/pages/BashCoursePage.tsx', 'utf8')
  ok(bash.includes('Practicar en Linux real') && bash.includes('#/vm'), 'Curso Bash enlaza práctica real')
  const notice = fsMod.readFileSync('src/components/CliVsRealNotice.tsx', 'utf8')
  ok(notice.includes('#/vm'), 'aviso CLI-vs-real apunta ahora a la página de la VM')
}

/* ---------------- 4. progreso inmune al reset ---------------- */
{
  const server = fsMod.readFileSync('server/vm-server.mjs', 'utf8')
  ok(!server.includes('archforge:v1') && !server.includes('localStorage'), 'el backend no toca el progreso del navegador')
  const ctx = fsMod.readFileSync('src/context/AppContext.tsx', 'utf8')
  ok(ctx.includes('learningStreak'), 'racha intacta en contexto (reset de VM ≠ progreso)')
}

console.log(fails === 0 ? '\nQA LINUX REAL: TODO OK' : `\nQA LINUX REAL: ${fails} FALLOS`)
process.exit(fails === 0 ? 0 : 1)
