/* Driver de consola serie QEMU por TCP: conecta, graba transcripcrión y
   permite expect/send para automatizar la instalación de Alpine.
   Uso: node tools/vm-driver.mjs <modo>
     boot-test  → conecta y vuelca 45 s de salida (fase de comprobación)
*/
import net from 'node:net'
import fs from 'node:fs'

const PORT = Number(process.env.VM_SERIAL_PORT ?? 45454)
const LOG = 'vm/build/console.log'
const mode = process.argv[2] ?? 'boot-test'

fs.writeFileSync(LOG, '')
let buf = ''
let transcript = ''

const sock = net.connect(PORT, '127.0.0.1')
sock.setEncoding('latin1')

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function expect(text, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`TIMEOUT esperando ${JSON.stringify(text)} — último buffer:\n${buf.slice(-400)}`))
    }, timeoutMs)
    const check = () => {
      if (buf.includes(text)) {
        clearTimeout(timer)
        resolve()
      } else setTimeout(check, 150)
    }
    check()
  })
}

function send(line) {
  sock.write(line + '\n')
}

sock.on('data', (d) => {
  buf += d
  transcript += d
})

sock.on('error', (e) => {
  console.error('SERIAL ERROR:', e.message)
  process.exit(2)
})

process.on('exit', () => {
  try { fs.appendFileSync(LOG, transcript) } catch {}
})

await sleep(1200) // esperar a que qemu abra el socket

if (mode === 'boot-test') {
  const deadline = Date.now() + 45000
  while (Date.now() < deadline) await sleep(500)
  console.log('--- TRANSCRIPCIÓN (últimos 1200 chars) ---')
  console.log(transcript.slice(-1200).replace(/[^\x20-\x7E\n\r]/g, '.'))
  console.log('--- contiene "login:"?', transcript.includes('login:'))
  process.exit(transcript.includes('login:') ? 0 : 1)
}
