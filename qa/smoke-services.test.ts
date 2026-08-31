/* Smoke test de servicios simulados (se ejecuta con esbuild + node) */
import { ShellSession } from '../src/cli/engine'

function run(sess: ShellSession, line: string): string {
  return sess.execute(line).map((l) => `${l.kind === 'err' ? '[E] ' : ''}${l.text}`).join('\n')
}

const s = new ShellSession()
let fails = 0
const ok = (cond: boolean, label: string) => {
  if (!cond) fails++
  console.log(`${cond ? 'ok  ' : 'FALLO'} ${label}`)
}

console.log('--- systemctl: unidad no instalada ---')
console.log(run(s, 'systemctl status nginx'))
ok(s.execute('systemctl status nginx').some((l) => l.kind === 'err' && l.text.includes('could not be found')), 'status sin paquete → could not be found')

console.log('--- instalar y arrancar nginx ---')
run(s, 'sudo pacman -S --noconfirm nginx')
console.log(run(s, 'systemctl start nginx'))
ok(!s.state.services?.nginx?.active, 'start sin sudo NO arranca')
run(s, 'sudo systemctl start nginx')
ok(s.state.services?.nginx?.active === true, 'sudo systemctl start arranca')
run(s, 'sudo systemctl enable nginx')
ok(s.state.services?.nginx?.enabled === true, 'enable marca enabled')
console.log(run(s, 'systemctl is-active nginx'))
console.log(run(s, 'systemctl status nginx'))

console.log('--- ss / journalctl ---')
run(s, 'sudo pacman -S --noconfirm iproute2')
console.log(run(s, 'ss -tulpn'))
ok(s.execute('ss -tulpn').some((l) => l.text.includes(':80')), 'ss muestra puerto 80')
console.log(run(s, 'journalctl -u nginx'))

console.log('--- DNS completo ---')
console.log(run(s, 'dig server.archforge.local'), '(sin bind → command not found)')
run(s, 'sudo pacman -S --noconfirm bind')
run(s, 'su')
run(s, 'mkdir -p /etc/named/zones')
run(s, `printf '$ORIGIN archforge.local\\nserver IN A 192.168.1.10\\nwww IN CNAME server\\n@ IN MX 10 mail.archforge.local.\\n@ IN NS ns\\nns IN A 192.168.1.10\\ntxt IN TXT hola\\n' > /etc/named/zones/db.archforge.local`)
const zone = s.vfs.readFile('/etc/named/zones/db.archforge.local')
ok(zone.includes('192.168.1.10'), 'zona escrita en VFS')
console.log('dig con named parado:')
console.log(run(s, 'dig @127.0.0.1 server.archforge.local'))
run(s, 'systemctl start named')
console.log('dig con named activo:')
console.log(run(s, 'dig @127.0.0.1 server.archforge.local'))
ok(s.execute('dig @127.0.0.1 server.archforge.local').some((l) => l.text.includes('192.168.1.10')), 'dig A resuelve')
run(s, `echo nameserver 127.0.0.1 > /etc/resolv.conf`)
run(s, 'su user')
console.log('resolv.conf apunta a named; consultas SIN @:')
console.log(run(s, 'dig www.archforge.local +short'))
ok(s.execute('dig www.archforge.local +short').some((l) => l.text.trim() === '192.168.1.10'), 'CNAME encadenado +short')
console.log(run(s, 'dig archforge.local MX +short'))
ok(s.execute('dig archforge.local MX +short').some((l) => l.text.includes('mail')), 'MX resuelve')
console.log(run(s, 'nslookup server.archforge.local'))
ok(s.execute('nslookup server.archforge.local').some((l) => l.text.includes('192.168.1.10')), 'nslookup resuelve')
console.log(run(s, 'dig txt.archforge.local TXT +short'))

console.log('--- SSH completo ---')
run(s, 'sudo pacman -S --noconfirm openssh')
console.log(run(s, 'ssh user@localhost'))
run(s, 'sudo systemctl start sshd')
console.log(run(s, 'ssh-keygen -t ed25519'))
console.log(run(s, 'ssh-copy-id user@localhost'))
console.log(run(s, 'ssh user@localhost'))
ok(s.vfs.get('/home/user/.ssh/authorized_keys') !== undefined, 'authorized_keys creado')
ok((s.vfs.get('/home/user/.ssh')?.mode ?? 0) === 0o700, '.ssh 700')
ok((s.vfs.get('/home/user/.ssh/authorized_keys')?.mode ?? 0) === 0o600, 'authorized_keys 600')

console.log('--- nombres de unidad por distro ---')
const d = new ShellSession()
d.setDistro('debian')
d.execute('sudo apt update')
while (d.hasPendingAsk()) d.execute('')
d.execute('sudo apt install openssh-server bind9 apache2 nfs-kernel-server vsftpd samba isc-dhcp-server -y')
while (d.hasPendingAsk()) d.execute('')
ok(d.state.pkgs.debian.installed['openssh-server'] !== undefined, 'openssh-server instalado en debian')
const st = d.execute('systemctl status ssh').map((l) => l.text).join('\n')
console.log(st)
ok(st.includes('ssh.service'), 'debian usa ssh.service')
const st2 = d.execute('systemctl status sshd').map((l) => l.text).join('\n')
ok(st2.includes('ssh.service'), 'alias sshd resuelve a ssh.service en debian')

console.log(fails === 0 ? '\nSMOKE SERVICIOS: TODO OK' : `\nSMOKE SERVICIOS: ${fails} FALLOS`)
process.exit(fails === 0 ? 0 : 1)
