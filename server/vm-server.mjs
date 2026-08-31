/* Backend del laboratorio Linux REAL de ArchForge.
   - Sirve WebSocket (ws) → puente hacia SSH de la VM Alpine.
   - Gestiona el ciclo de vida de QEMU: arrancar / detener / RESTABLECER
     (descarta overlay qcow2 y vuelve al estado base).
   - AISLAMIENTO: el input del usuario SOLO viaja por SSH dentro de la VM;
     jamás se ejecuta en el anfitrión.

   Variables de entorno:
     PORT          Puerto HTTP+WS (default: 7860)
     HOST          Bind address (default: 127.0.0.1; usa 0.0.0.0 para LAN)
     QEMU_BIN      Ruta a qemu-system-x86_64 (auto-detecta si no se pone)
     QEMU_IMG_BIN  Ruta a qemu-img (auto-detecta si no se pone)
     AUTO_START    "1" para arrancar la VM automáticamente (default: 1)

   Uso: node server/vm-server.mjs
*/
import http from 'node:http'
import net from 'node:net'
import { spawn, execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { WebSocketServer } from 'ws'
import { Client } from 'ssh2'

const ROOT = path.resolve(import.meta.dirname ?? '.', '..')

/* ---------- detección automática de QEMU ---------- */
function findInPath(name) {
  try {
    const cmd = process.platform === 'win32' ? `where ${name}` : `which ${name}`
    return execSync(cmd, { stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim().split('\n')[0]
  } catch { return null }
}

function findQemu() {
  if (process.env.QEMU_BIN) return process.env.QEMU_BIN
  if (process.platform === 'win32') {
    const win = 'C:/Program Files/qemu/qemu-system-x86_64.exe'
    if (fs.existsSync(win)) return win
  }
  const fromPath = findInPath('qemu-system-x86_64')
  if (fromPath) return fromPath
  for (const p of ['/usr/bin/qemu-system-x86_64', '/usr/local/bin/qemu-system-x86_64']) {
    if (fs.existsSync(p)) return p
  }
  return null
}

function findQemuImg() {
  if (process.env.QEMU_IMG_BIN) return process.env.QEMU_IMG_BIN
  if (process.platform === 'win32') {
    const win = 'C:/Program Files/qemu/qemu-img.exe'
    if (fs.existsSync(win)) return win
  }
  const fromPath = findInPath('qemu-img')
  if (fromPath) return fromPath
  for (const p of ['/usr/bin/qemu-img', '/usr/local/bin/qemu-img']) {
    if (fs.existsSync(p)) return p
  }
  return null
}

const QEMU = findQemu()
const QEMU_IMG = findQemuImg()

const QEMU_AVAILABLE = !!(QEMU && QEMU_IMG)

if (!QEMU_AVAILABLE) {
  log('AVISO: QEMU no encontrado — el servidor HTTP arrancará pero la VM no podrá iniciarse.')
  log('  Instala QEMU o define QEMU_BIN / QEMU_IMG_BIN')
} else {
  log(`QEMU: ${QEMU}`)
  log(`qemu-img: ${QEMU_IMG}`)
}

const ISO = path.join(ROOT, 'vm/alpine-virt-3.24.1-x86_64.iso')
const BASE = path.join(ROOT, 'vm/base.qcow2')
const OVERLAY = path.join(ROOT, 'vm/runtime/overlay.qcow2')
const PID_FILE = path.join(ROOT, 'vm/runtime/qemu.pid')

// Asegurar que vm/runtime existe
const runtimeDir = path.join(ROOT, 'vm/runtime')
if (!fs.existsSync(runtimeDir)) fs.mkdirSync(runtimeDir, { recursive: true })

const VM = {
  host: '127.0.0.1',
  port: 2222,
  username: 'archforge',
  password: 'archforge',
}

const PORT = Number(process.env.PORT ?? 7860)
const HOST = process.env.HOST ?? '127.0.0.1'
const AUTO_START = process.env.AUTO_START !== '0' // default: sí

let state = 'stopped' // stopped | starting | running | resetting
let ssh = null
let shellStream = null
let booting = false

const clients = new Set()

function broadcast(msg) {
  const data = JSON.stringify(msg)
  for (const ws of clients) {
    try { ws.readyState === 1 && ws.send(data) } catch {}
  }
}
function setStatus(s) {
  state = s
  broadcast({ type: 'status', state })
}

function qemuRunning() {
  try {
    const pid = Number(fs.readFileSync(PID_FILE, 'utf8').trim())
    process.kill(pid, 0)
    return pid
  } catch { return null }
}

function startQemu() {
  if (!QEMU) throw new Error('QEMU no disponible')
  const args = [
    '-machine', 'q35', '-m', '768', '-smp', '1',
    '-drive', `file=${OVERLAY},if=virtio,format=qcow2`,
    '-netdev', 'user,id=n0,hostfwd=tcp:127.0.0.1:2222-:22',
    '-device', 'virtio-net-pci,netdev=n0',
    '-display', 'none',
    '-serial', 'tcp:127.0.0.1:45456,server=on,wait=off',
    '-monitor', 'tcp:127.0.0.1:44444,server=on,wait=off',
  ]
  const child = spawn(QEMU, args, { stdio: 'ignore', detached: true, windowsHide: true })
  fs.writeFileSync(PID_FILE, String(child.pid))
  child.unref()
  log(`qemu arrancado (pid ${child.pid})`)
}

function pidAlive(pid) {
  try { process.kill(pid, 0); return true } catch { return false }
}

/** apagado ELEGANTE: 1) SSH poweroff  2) ACPI via monitor HMP  3) kill */
async function stopQemuGraceful() {
  const pid = qemuRunning()
  if (!pid) return
  try {
    if (shellStream) {
      shellStream.write("echo 'archforge' | sudo -S poweroff >/dev/null 2>&1\n")
      const t0 = Date.now()
      while (pidAlive(pid) && Date.now() - t0 < 25000) await sleep(1000)
    }
  } catch {}
  if (pidAlive(pid)) {
    try {
      const mon = net.connect(44444, '127.0.0.1')
      mon.on('connect', () => { mon.write('system_powerdown\n'); setTimeout(() => mon.end(), 500) })
      mon.on('error', () => {})
    } catch {}
    const t0 = Date.now()
    while (pidAlive(pid) && Date.now() - t0 < 20000) await sleep(1000)
  }
  if (pidAlive(pid)) {
    try { execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' }) } catch {}
  }
  const t0 = Date.now()
  while (pidAlive(pid) && Date.now() - t0 < 15000) await sleep(500)
  log('qemu detenido')
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }
function log(m) {
  const line = `[vm-server] ${new Date().toISOString().slice(11, 19)} ${m}`
  console.log(line)
  try { fs.appendFileSync(path.join(ROOT, 'vm/build/server.log'), line + '\n') } catch {}
}

/* ------------------------- SSH ------------------------- */

function sshConnect(timeoutMs = 40000) {
  return new Promise((resolve, reject) => {
    const conn = new Client()
    const t = setTimeout(() => { conn.end(); reject(new Error('ssh timeout')) }, timeoutMs)
    conn.on('error', () => {})
    conn.on('ready', () => { clearTimeout(t); resolve(conn) })
    conn.connect({ ...VM, readyTimeout: timeoutMs, keepaliveIntervalMs: 15000 })
  })
}

async function sshReady(maxMs = 240000) {
  const t0 = Date.now()
  let lastErr = ''
  while (Date.now() - t0 < maxMs) {
    try { return await sshConnect(Math.min(40000, maxMs)) } catch (e) { lastErr = e.message }
    await sleep(3000)
  }
  throw new Error(`ssh no disponible en ${maxMs} ms (${lastErr})`)
}

async function ensureShell(conn) {
  ssh = conn
  setStatus('running')
  log('ssh conectado a la VM')
  await new Promise((resolve) => {
    conn.shell({ term: 'xterm-256color' }, (err, stream) => {
      if (err) { log('error shell: ' + err.message); resolve(); return }
      shellStream = stream
      let chunks = 0
      stream.on('data', (d) => { chunks++; if (chunks % 25 === 0) log(`shell data chunks=${chunks}`); broadcast({ type: 'data', data: d.toString() }) })
      stream.stderr.on('data', (d) => broadcast({ type: 'data', data: d.toString() }))
      stream.on('close', () => { log('shell CERRADO'); shellStream = null })
      stream.on('error', (e) => log('shell error: ' + e.message))
      log('shell ABIERTO')
      stream.write("export TERM=xterm-256color; bind 'set enable-bracketed-paste off' 2>/dev/null; PS1='\\[\\033[1;36m\\]\\u@archforge-vm\\[\\033[0m\\]:\\[\\033[1;34m\\]\\w\\[\\033[0m\\]\\$ '; clear\n")
      broadcast({ type: 'data', data: '\r\n\x1b[1;36marchforge@archforge-vm\x1b[0m:\x1b[1;34m~\x1b[0m$ \r\n' })
      resolve()
    })
  })
}

/* ------------------------- ciclo de vida ------------------------- */

async function startAndConnect() {
  if (!QEMU_AVAILABLE) throw new Error('QEMU no instalado — la VM no puede iniciarse')
  if (!fs.existsSync(BASE)) throw new Error('falta vm/base.qcow2 — ejecuta antes la instalacion automatizada')
  if (!fs.existsSync(OVERLAY)) {
    execSync(`"${QEMU_IMG}" create -f qcow2 -b "${BASE}" -F qcow2 "${OVERLAY}"`, { stdio: 'ignore' })
  }
  if (!qemuRunning()) startQemu()
  const conn = await sshReady(240000)
  await sleep(1200)
  await ensureShell(conn)
}

async function bringUp() {
  if (booting) return
  booting = true
  try {
    setStatus('starting')
    if (!QEMU_AVAILABLE) throw new Error('QEMU no instalado — la VM no puede iniciarse')
    if (!fs.existsSync(BASE)) throw new Error('falta vm/base.qcow2 — ejecuta antes la instalacion automatizada')
    if (!fs.existsSync(OVERLAY)) {
      execSync(`"${QEMU_IMG}" create -f qcow2 -b "${BASE}" -F qcow2 "${OVERLAY}"`, { stdio: 'ignore' })
    }
    if (!qemuRunning()) startQemu()
    const conn = await sshReady(240000)
    await sleep(1200)
    await ensureShell(conn)
    log('laboratorio listo')
  } catch (e) {
    log('ERROR en arranque: ' + e.message)
    setStatus('stopped')
  } finally {
    booting = false
  }
}

async function resetLab() {
  log('RESET solicitado')
  setStatus('resetting')

  await stopQemuGraceful()

  if (QEMU_AVAILABLE && QEMU_IMG) {
    execSync(`"${QEMU_IMG}" create -f qcow2 -b "${BASE}" -F qcow2 "${OVERLAY}"`, { stdio: 'ignore' })
  }
  log('overlay recreado — cambios descartados')

  shellStream = null
  try { ssh?.end() } catch {}
  ssh = null

  try {
    await startAndConnect()
    log('laboratorio restablecido y conectado')
  } catch (e) {
    log('ERROR tras reset: ' + e.message)
    setStatus('stopped')
  }
}

async function stopLab() {
  log('STOP solicitado')
  if (ssh && shellStream) {
    try {
      shellStream.write("echo 'archforge' | sudo -S poweroff >/dev/null 2>&1\n")
      const t0 = Date.now()
      while (qemuRunning() && Date.now() - t0 < 45000) await sleep(1000)
    } catch {}
  }
  const pid = qemuRunning()
  if (pid) {
    try { execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' }) } catch {}
    const t0 = Date.now()
    while (pidAlive(pid) && Date.now() - t0 < 15000) await sleep(500)
  }
  shellStream = null
  try { ssh?.end(); } catch {}
  ssh = null
  setStatus('stopped')
}

/* ------------------------- servidor HTTP+WS ------------------------- */

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.url === '/api/vm/status') {
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({
      state,
      qemu: !!qemuRunning(),
      qemuAvailable: QEMU_AVAILABLE,
      distro: 'Alpine Linux',
      user: 'archforge',
      hostLabel: 'archforge@archforge-vm',
      autoStart: AUTO_START,
    }))
    return
  }
  res.writeHead(404); res.end()
})

const wss = new WebSocketServer({ server, path: '/vm-terminal' })

wss.on('connection', (ws) => {
  clients.add(ws)
  ws.send(JSON.stringify({ type: 'status', state }))
  ws.on('message', async (raw) => {
    let msg
    try { msg = JSON.parse(raw.toString()) } catch { return }
    switch (msg.type) {
      case 'input':
        if (shellStream && state === 'running') shellStream.write(msg.data ?? '')
        else broadcast({ type: 'data', data: `\r\n[shell no listo — estado: ${state}]\r\n` })
        break
      case 'resize':
        if (shellStream && state === 'running') {
          try { shellStream.setWindow(msg.rows ?? 24, msg.cols ?? 80, 0, 0) } catch {}
        }
        break
      case 'open':
        await bringUp()
        break
      case 'reset':
        await resetLab()
        break
      case 'stop':
        await stopLab()
        break
    }
  })
  ws.on('close', () => clients.delete(ws))
})

server.listen(PORT, HOST, async () => {
  log(`backend escuchando en ws://${HOST}:${PORT}/vm-terminal`)
  if (!QEMU_AVAILABLE) {
    log('QEMU no disponible — el servidor HTTP funciona pero la VM esta deshabilitada')
  } else if (AUTO_START && fs.existsSync(BASE)) {
    log('AUTO_START activo — arrancando VM en background...')
    bringUp()
  } else if (!fs.existsSync(BASE)) {
    log('AVISO: vm/base.qcow2 no encontrado — la VM no puede arrancar')
  } else {
    log('AUTO_START desactivado — usa {"type":"open"} para arrancar')
  }
})
