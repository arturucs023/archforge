/* Driver genérico del laboratorio: entra como archforge y ejecuta comandos reales.
   Uso: node tools/lab-run.mjs <archivo-de-órdenes.json>
   Órdenes: { "run": "cmd", "expectOut": "texto" } | { "sleepMs": n } */
import net from 'node:net'
import fs from 'node:fs'

const PORT = Number(process.env.VM_SERIAL_PORT ?? 45455)
const plan = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
let buf = ''
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const log = (m) => console.log(`[lab] ${m}`)
const clean = (s) => s.replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, '')

const sock = net.connect(PORT, '127.0.0.1')
sock.setEncoding('latin1')
sock.on('error', (e) => { console.error('SERIAL ERROR:', e.message); process.exit(2) })
sock.on('data', (d) => { buf += d.replace(/\r/g, '') })

async function waitFor(fn, timeoutMs = 120000, what = '') {
  let acc = ''
  const t0 = Date.now()
  while (true) {
    await sleep(150)
    acc += buf
    buf = ''
    const r = fn(acc)
    if (r !== null) return { rest: acc.slice(acc.length), found: r, acc }
    if (Date.now() - t0 > timeoutMs) throw new Error(`TIMEOUT ${what}\nÚltimo:\n${acc.slice(-500)}`)
  }
}

let fails = 0
async function doLogin() {
  sock.write('\n')
  let acc = ''
  const t0 = Date.now()
  while (!acc.includes('login:')) {
    await sleep(300); acc += clean(buf); buf = ''
    if (Date.now() - t0 > 180000) throw new Error('relogin: sin prompt de login')
  }
  buf = ''
  sock.write('archforge\n')
  acc = ''
  let pwSent = false
  while (!acc.includes(':~$')) {
    await sleep(200); acc += clean(buf); buf = ''
    if (!pwSent && acc.includes('Password:')) { pwSent = true; sock.write('archforge\n'); continue }
    if (acc.includes('Login incorrect')) throw new Error('relogin: credenciales rechazadas')
    if (Date.now() - t0 > 60000) throw new Error('relogin: sin shell')
  }
  log('relogin ✔')
}

async function run(cmdline, expectOut, expectCode = 0) {
  const marker = `RC${Math.random().toString(36).slice(2, 8)}=`
  sock.write(`${cmdline}; echo ${marker}$?\n`)
  let acc = ''
  const t0 = Date.now()
  let done = false
  while (!done) {
    await sleep(150)
    acc += clean(buf)
    buf = ''
    const mi = acc.indexOf(marker)
    if (mi >= 0) {
      done = true
      const li = acc.lastIndexOf(marker)
      const after = acc.slice(li + marker.length).trim()
      // si tras el marcador está el literal $?, solo vimos el eco: seguir esperando
      if (after.startsWith('$?')) { await sleep(150); continue }
      const code = after.split(/\s/)[0] ?? ''
      const firstEchoEnd = acc.indexOf('\n') + 1
      const bodyEnd = acc.lastIndexOf('\n', li)
      const out = acc.slice(firstEchoEnd, Math.max(firstEchoEnd, bodyEnd))
      const okCode = code === String(expectCode)
      const okOut = !expectOut || out.includes(expectOut)
      if (okCode && okOut) log(`✔ ${cmdline.slice(0, 70)}${expectOut ? ` → ${JSON.stringify(expectOut)}` : ''}`)
      else {
        fails++
        log(`❌ ${cmdline.slice(0, 70)}\n   exit=${code} esperaba=${JSON.stringify(expectOut ?? 'exit 0')}\n   salida:\n${out.slice(-400)}`)
      }
    } else if (Date.now() - t0 > 150000) {
      throw new Error(`TIMEOUT en: ${cmdline}\nÚltimo:\n${acc.slice(-400)}`)
    }
    // si el guest se reinició a mitad de comando, re-logueamos y reintentamos una vez
    if (acc.includes('login:') && acc.includes('Login incorrect') === false && !done) {
      await doLogin()
      return run(cmdline, expectOut)
    }
  }
  await sleep(120)
}

await sleep(1200)
log('esperando login…')
{
  let acc = ''
  const t0 = Date.now()
  while (!acc.includes('login:')) {
    await sleep(150); acc += clean(buf); buf = ''
    if (Date.now() - t0 > 180000) throw new Error('sin prompt de login')
  }
}

// login interactivo usando waitFor
sock.write('archforge\n')
{
  let acc = ''
  const t0 = Date.now()
  while (!acc.includes('Password:') && !acc.includes('$')) {
    await sleep(150); acc += clean(buf); buf = ''
    if (Date.now() - t0 > 30000) throw new Error('sin prompt de password')
  }
}
sock.write('archforge\n')
{
  let acc = ''
  const t0 = Date.now()
  while (!acc.includes(':~$')) {
    await sleep(150); acc += clean(buf); buf = ''
    if (Date.now() - t0 > 30000) throw new Error('sin shell prompt')
  }
}
log('conectado como archforge ✔')

for (const step of plan.steps ?? []) {
  if (step.sleepMs !== undefined) await sleep(step.sleepMs)
  else if (step.action === 'relogin') await doLogin()
  else if (step.action === 'waitBoot') { try { await doLogin() } catch { await doLogin() } }
  else await run(step.run, step.expectOut, step.expectCode ?? 0)
}

console.log(fails === 0 ? '\n[lab] PLAN COMPLETO ✔' : `\n[lab] ${fails} comprobaciones fallidas`)
fs.writeFileSync(plan.resultFile ?? 'vm/build/plan-result.txt', String(fails))
process.exit(fails === 0 ? 0 : 1)
