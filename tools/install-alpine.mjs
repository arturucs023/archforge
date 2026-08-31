/* Instalación AUTOMATIZADA de Alpine en vm/build/disk-install.qcow2
   Fase A: setup-disk offline desde la ISO (particiona e instala base+kernel+syslinux)
   Fase B: provisión vía chroot (usuario archforge, sudo, bash, sshd, hostname, ttyS0)
   Uso: node tools/install-alpine.mjs   (requiere QEMU arrancado con serial :45454)
*/
import net from 'node:net'
import fs from 'node:fs'

const LOG = 'vm/build/console.log'
let buf = ''
let transcript = ''

const sock = net.connect(Number(process.env.VM_SERIAL_PORT ?? 45454), '127.0.0.1')
sock.setEncoding('latin1')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const log = (m) => console.log(`[install] ${m}`)

async function expect(text, timeoutMs = 120000, tag = text) {
  const t0 = Date.now()
  while (!buf.includes(text)) {
    if (Date.now() - t0 > timeoutMs) {
      throw new Error(`TIMEOUT [${tag}] esperando ${JSON.stringify(text)}\nÚltimo buffer:\n${buf.slice(-600)}`)
    }
    await sleep(200)
  }
  buf = ''
}

function send(line) { sock.write(line + '\n'); log(`> ${line.slice(0, 90)}`) }

async function run(line, timeout = 180000) {
  const marker = `RC${Math.random().toString(36).slice(2, 8)}=`
  send(`${line}; echo ${marker}$?`)
  await expect(`${marker}0\n`, timeout, line.slice(0, 60))
}

sock.on('data', (d) => { buf += d.replace(/\r/g, ''); transcript += d })
process.on('exit', () => { try { fs.appendFileSync(LOG, transcript) } catch {} })

await sleep(1200)

log('esperando prompt de login…')
await expect('login:', 150000)
send('root')
await expect('#', 30000)

log('red del instalador (NAT)')
await run('ifconfig eth0 up && udhcpc -i eth0 -t 8 -T 2', 90000)
await run('grep -q nameserver /etc/resolv.conf || echo nameserver 10.0.2.3 > /etc/resolv.conf')
// repos de red con la versión EXACTA derivada del propio entorno (sin hardcodear)
await run('V=$(cut -d. -f1,2 /etc/alpine-release); printf "%s\\n" "http://dl-cdn.alpinelinux.org/alpine/v$V/main" "http://dl-cdn.alpinelinux.org/alpine/v$V/community" > /etc/apk/repositories && cat /etc/apk/repositories')
await run('apk update', 180000)

log('instalación del sistema base en /dev/vda (setup-disk particiona solo)')
send('ERASE_DISKS=/dev/vda SWAP_SIZE=0 setup-disk -m sys /dev/vda')
await expect('Installation is complete', 600000, 'setup-disk')
log('setup-disk completado (SWAP_SIZE=0 → vda1=/boot · vda2=/)')

log('montando sistema instalado para provisión')
await run('mount /dev/vda2 /mnt', 60000)
await run('mount /dev/vda1 /mnt/boot', 60000)
await run('mount -t proc proc /mnt/proc', 30000)
await run('mount -o bind /dev /mnt/dev', 30000)
await run('mount -t sysfs sys /mnt/sys', 30000)
await run('cp -L /etc/resolv.conf /mnt/etc/resolv.conf')
await run('cp /etc/apk/repositories /mnt/etc/apk/repositories')
const chroot = (inner) => run(`chroot /mnt /bin/sh -c "${inner.replace(/"/g, '\\"')}"`, 420000)

await chroot('apk update')
await chroot('apk add --no-cache sudo bash openssh openrc chrony util-linux acpid')

log('usuario archforge + sudo + sshd + hostname + consola serie')
const provision = [
  'adduser -D -s /bin/bash -g archforge archforge',
  'addgroup archforge wheel 2>/dev/null || true',
  'echo archforge:archforge | chpasswd',
  "echo '%wheel ALL=(ALL:ALL) ALL' >> /etc/sudoers",
  "echo 'archforge ALL=(ALL:ALL) NOPASSWD: ALL' >> /etc/sudoers",
  "sed -i 's/^#\\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config",
  "grep -q '^PasswordAuthentication yes' /etc/ssh/sshd_config || echo 'PasswordAuthentication yes' >> /etc/ssh/sshd_config",
  'echo archforge-vm > /etc/hostname',
  "grep -q archforge-vm /etc/hosts || echo '127.0.1.1 archforge-vm localhost local' >> /etc/hosts",
  "grep -q '^ttyS0' /etc/inittab || echo 'ttyS0::respawn:/sbin/getty -L ttyS0 115200 vt100' >> /etc/inittab",
  'rc-update add sshd default',
  'rc-update add chronyd default',
  'rc-update add acpid default',
  // red persistente en el sistema instalado (NAT/dhcp)
  "printf 'auto lo\\niface lo inet loopback\\n\\nauto eth0\\niface eth0 inet dhcp\\n' > /etc/network/interfaces",
  'rc-update add networking boot 2>/dev/null || true',
  // TCG-on-Windows: el warm reboot entra en kernel panic IO-APIC+timer sin esta opción
  "sed -i 's/^default_kernel_opts=\"\\(.*\\)\"/default_kernel_opts=\"\\1 noapic fastboot\"/' /etc/update-extlinux.conf",
  'update-extlinux 2>/dev/null || true',
]
for (const c of provision) await chroot(c)

log('desmontando y apagando')
await run('umount /mnt/boot', 60000)
await run('umount /mnt/proc /mnt/sys /mnt/dev', 60000)
await run('umount /mnt', 60000)
send('poweroff')
log('esperando apagado…')
await sleep(20000)

fs.writeFileSync('vm/build/install-result.txt', 'OK')
console.log('[install] ✅ INSTALACIÓN COMPLETA — base lista')
process.exit(0)
