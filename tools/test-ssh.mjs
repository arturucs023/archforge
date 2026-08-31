/* PRUEBA REAL: SSH desde el host anfitrión → VM Alpine (127.0.0.1:2222).
   Ejecuta comandos como archforge y valida salida. */
import { Client } from 'ssh2'

const cfg = {
  host: '127.0.0.1',
  port: 2222,
  username: 'archforge',
  password: 'archforge',
  readyTimeout: 60000,
}

const conn = new Client()
let fails = 0

conn.on('error', (e) => { console.error('SSH ERROR:', e.message); process.exit(2) })

conn.on('ready', () => {
  console.log('[ssh] conectado ✔')
  const tests = [
    ['whoami', 'archforge\n'],
    ['pwd', '/home/archforge\n'],
    ['echo HOLA-SSH', 'HOLA-SSH\n'],
    ['uname -a', 'Linux archforge-vm'],
  ]
  let i = 0
  const next = () => {
    if (i >= tests.length) {
      console.log(fails === 0 ? '[ssh] TODAS LAS PRUEBAS SSH ✔' : `[ssh] ${fails} fallos`)
      conn.end()
      process.exit(fails === 0 ? 0 : 1)
    }
    const [cmd, want] = tests[i++]
    conn.exec(cmd, (err, stream) => {
      if (err) { fails++; console.log(`❌ ${cmd}: ${err.message}`); return next() }
      let out = ''
      stream.on('data', (d) => { out += d.toString() })
      stream.stderr.on('data', (d) => { out += d.toString() })
      stream.on('close', () => {
        if (out.includes(want)) console.log(`✔ ${cmd} → ${JSON.stringify(want.trim())}`)
        else { fails++; console.log(`❌ ${cmd}\n   esperaba ${JSON.stringify(want)}\n   salida: ${JSON.stringify(out.slice(-200))}`) }
        next()
      })
    })
  }
  next()
})

conn.connect(cfg)
