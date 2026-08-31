/* script/start.mjs — lanza backend (VM) + frontend (vite preview) juntos.
   Uso: node script/start.mjs */
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

function log(m) { console.log(`\x1b[36m[start]\x1b[0m ${m}`) }

/* 1. Lanzar backend (vm-server) en background */
let backend = null
try {
  backend = spawn(process.execPath, ['server/vm-server.mjs'], {
    cwd: ROOT,
    stdio: 'inherit',
    detached: process.platform !== 'win32',
    windowsHide: false,
  })
  backend.unref()
  backend.on('error', (e) => log(`backend error: ${e.message}`))
  backend.on('close', (code) => log(`backend terminado (code ${code})`))
  log(`backend arrancado (pid ${backend.pid})`)
} catch (e) {
  log(`AVISO: no se pudo arrancar el backend: ${e.message}`)
}

/* 2. Esperar a que el backend esté listo (poll al API) */
async function waitBackend(maxMs = 15000) {
  const t0 = Date.now()
  while (Date.now() - t0 < maxMs) {
    try {
      const r = await fetch('http://127.0.0.1:7860/api/vm/status')
      if (r.ok) { log('backend listo (VM puede no estar disponible — revisa /vm)'); return true }
    } catch {}
    await new Promise(r => setTimeout(r, 500))
  }
  log('backend no respondió — continuando solo con el frontend')
  return false
}

await waitBackend()

/* 3. Lanzar vite preview (frontend) */
const frontend = spawn(process.execPath, [
  'node_modules/vite/bin/vite.js', 'preview',
  '--host', '127.0.0.1',
  '--port', '4173',
  '--strictPort',
  '--open',
], {
  cwd: ROOT,
  stdio: 'inherit',
})

frontend.on('close', (code) => {
  log(`frontend terminado (code ${code})`)
  if (backend && process.platform !== 'win32') {
    try { process.kill(-backend.pid) } catch {}
  }
  process.exit(code ?? 0)
})

log('frontend arrancado — abriendo navegador en http://127.0.0.1:4173')
