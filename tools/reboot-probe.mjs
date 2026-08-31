/* Diagnóstico del ciclo reboot: mantiene la MISMA conexión serie abierta
   durante todo el proceso para observar qué ocurre tras `sudo reboot`. */
import net from 'node:net'

const PORT = Number(process.env.VM_SERIAL_PORT ?? 45455)
let buf = ''
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const clean = (s) => s.replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, '').replace(/\r/g, '')

const sock = net.connect(PORT, '127.0.0.1')
sock.setEncoding('latin1')
sock.on('data', (d) => { buf += clean(d) })
sock.on('error', (e) => { console.error('SERIAL ERROR:', e.message); process.exit(2) })

const waitText = async (text, timeoutMs) => {
  const t0 = Date.now()
  while (!buf.includes(text)) {
    if (Date.now() - t0 > timeoutMs) throw new Error(`TIMEOUT ${text}\n${buf.slice(-500)}`)
    await sleep(200)
  }
}

await sleep(1200)
console.log('[1] esperando login…')
await waitText('login:', 120000)
buf = ''
sock.write('archforge\n'); await sleep(800)
sock.write('archforge\n'); await sleep(1500)
await waitText(':~$', 20000)
console.log('[2] logueado; programando reboot en 2s…')
await sleep(2000)
buf = ''
sock.write("echo 'archforge' | sudo -S reboot\n")
console.log('[3] reboot enviado; observando consola 100 s…')
const t0 = Date.now()
while (Date.now() - t0 < 100000) {
  await sleep(1000)
  const snapshot = buf
  buf = ''
  if (snapshot) process.stdout.write(snapshot.slice(-300))
  if (snapshot.includes('login:')) { console.log('\n[4] ✅ login de vuelta — el ciclo reboot funciona'); process.exit(0) }
}
console.log('\n[!] 100 s sin volver al login')
process.exit(1)
