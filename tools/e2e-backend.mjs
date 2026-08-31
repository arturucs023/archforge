/* Prueba END-TO-END del backend: WS → open → comandos reales → RESET → verificación. */
import WebSocket from 'ws'

const ws = new WebSocket('ws://127.0.0.1:7860/vm-terminal')
let fails = 0
let out = ''
let state = 'unknown'
const statuses = []
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const send = (msg) => ws.send(JSON.stringify(msg))

/** espera hasta que la salida contenga texto (30 s máx) */
async function run(cmd, want) {
  out = ''
  send({ type: 'input', data: cmd + '\n' })
  const t0 = Date.now()
  while (!out.includes(want)) {
    if (Date.now() - t0 > 30000) {
      fails++
      console.log(`❌ ${cmd} — sin ${JSON.stringify(want)}\n   último: ${JSON.stringify(out.slice(-200))}`)
      return
    }
    await sleep(150)
  }
  console.log(`✔ ${cmd} → contiene ${JSON.stringify(want)}`)
}

/** espera un estado NUEVO (ignora el valor en caché) */
async function waitState(s, maxMs) {
  state = '__esperando__'
  const t0 = Date.now()
  while (state !== s) {
    if (Date.now() - t0 > maxMs) {
      fails++
      console.log(`❌ timeout esperando estado ${s} (actual: ${state})`)
      return false
    }
    await sleep(250)
  }
  console.log(`🟢 estado ${s} alcanzado`)
  return true
}

ws.on('message', (raw) => {
  const msg = JSON.parse(raw.toString())
  if (msg.type === 'data') out += msg.data
  else if (msg.type === 'status') { state = msg.state; statuses.push(msg.state) }
})

await new Promise((r) => ws.on('open', r))
console.log('[e2e] ws conectado; solicitando open…')
send({ type: 'open' })

if (!(await waitState('running', 300000))) process.exit(1)
await sleep(1000)

for (const [cmd, want] of [
  ['whoami', 'archforge'],
  ['pwd', '/home/archforge'],
  ['touch e2e.txt && ls e2e.txt', 'e2e.txt'],
  ["printf '#!/bin/bash\\necho E2E-OK\\n' > s.sh && chmod +x s.sh && ./s.sh", 'E2E-OK'],
]) await run(cmd, want)

console.log('[e2e] solicitando RESET…')
send({ type: 'reset' })
if (!(await waitState('running', 360000))) process.exit(1)
await sleep(1200)

for (const [cmd, want] of [
  ['ls e2e.txt 2>&1', 'No such file'],
  ['./s.sh 2>&1', 'No such file or directory'],
]) await run(cmd, want)

console.log(fails === 0 ? '\n[E2E] BACKEND + VM REAL: TODO ✔' : `\n[E2E] ${fails} fallos`)
console.log('estados observados:', statuses.join(' → '))
ws.close()
process.exit(fails === 0 ? 0 : 1)
