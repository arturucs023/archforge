import type { CommandEntry } from './meta'

/* Comandos de Alpine Linux: apk (gestor), OpenRC (servicios) y setup-alpine.
   Flags verificados contra apk-tools y OpenRC actuales. */

export const ALPINE_COMMANDS: CommandEntry[] = [
  {
    id: 'apk', name: 'apk', cat: 'paquetes', distro: ['alpine'], important: true,
    summary: 'Gestor de paquetes de Alpine: rápido y simple; update/upgrade/add/del/search/info.',
    breakdown: [
      { token: 'update', meaning: 'descarga índices frescos de /etc/apk/repositories' },
      { token: 'upgrade', meaning: 'actualiza todo lo instalado (tras update)' },
      { token: 'add nombre', meaning: 'instala (+ dependencias); --no-cache no guarda el índice' },
      { token: 'del nombre', meaning: 'elimina (las deps huérfanas se gestionan con --virtual)' },
      { token: 'search -v término', meaning: 'busca con versión y descripción' },
      { token: 'info -a nombre', meaning: 'detalle: descripción, tamaño, dependencias' },
      { token: 'info -W /ruta', meaning: '¿qué paquete posee este archivo? (who-owns)' },
    ],
    examples: [
      { desc: 'rutina completa', lines: ['sudo apk update', 'sudo apk upgrade', 'sudo apk add htop curl'] },
      { desc: 'buscar e inspeccionar', lines: ['apk search -v nginx', 'apk info -a nginx', 'apk info -W /usr/sbin/nginx'] },
      { desc: 'limpiar caché', lines: ['sudo apk cache clean'] },
    ],
    whatHappens: 'apk resuelve contra repos .tar.gz firmados, despliega y registra en su base local. --no-cache (típico en Docker) instala sin guardar el índice: imágenes mínimas.',
    errors: [
      { symptom: 'ERROR: unable to select packages (conflictos o no encontrado).', fix: 'apk update primero; revisa que el repo (main/community/testing) esté en /etc/apk/repositories.' },
      { symptom: 'fetch … Permission denied en Docker.', fix: 'Construye como root o ajusta USER: apk necesita escribir su base.' },
    ],
    related: ['openrc', 'apt'],
    intents: ['instalar programa alpine', 'apk actualizar', 'gestor paquetes alpine', 'buscar paquete alpine'],
  },
  {
    id: 'openrc', name: 'OpenRC (rc-service/rc-update)', cat: 'servicios', distro: ['alpine'], important: true,
    summary: 'Init de Alpine (sin systemd): arrancar, parar y habilitar servicios por runlevels.',
    breakdown: [
      { token: 'rc-service nginx start/stop/restart/status', meaning: 'actúa AHORA sobre el servicio' },
      { token: 'rc-update add nginx default', meaning: 'arranca en cada boot (runlevel default)' },
      { token: 'rc-update del nginx', meaning: 'deja de arrancar al boot (no lo para ahora)' },
      { token: 'rc-status', meaning: 'qué corre y en qué runlevel' },
    ],
    examples: [
      { desc: 'activar nginx para siempre', lines: ['sudo rc-update add nginx default', 'sudo rc-service nginx start', 'rc-status'] },
      { desc: 'ver logs del servicio', lines: ['sudo rc-service nginx status', 'tail -n 50 /var/log/nginx/error.log'] },
    ],
    whatHappens: 'OpenRC ejecuta scripts de /etc/init.d con dependencias declaradas (need/use/after). Sin journal central: cada servicio loguea a sus ficheros.',
    errors: [{ symptom: 'rc-service: service nginx does not exist.', fix: 'El paquete que provee el servicio no está instalado (apk add nginx) o el script tiene otro nombre: ls /etc/init.d.' }],
    related: ['apk', 'systemctl'],
    intents: ['iniciar servicio alpine', 'habilitar servicio arranque alpine', 'openrc enable', 'ver servicios alpine'],
  },
  {
    id: 'setup-alpine', name: 'setup-alpine', cat: 'sistema', distro: ['alpine'], important: true,
    summary: 'Asistente interactivo de instalación Alpine: teclado, red, repos, disco, SSH.',
    breakdown: [
      { token: 'setup-alpine', meaning: 'guía paso a paso (teclado → hostname → red → repos → disco → sshd/ntp)' },
      { token: 'setup-apkrepos', meaning: 'reconfigura solo los repositorios después' },
      { token: 'setup-lbu / lbu commit', meaning: 'persiste cambios en instalaciones diskless/live (Alpine guarda en RAM por defecto)' },
    ],
    examples: [
      { desc: 'instalación guiada', lines: ['setup-alpine'] },
      { desc: 'cambiar a repos rápidos tras instalar', lines: ['setup-apkrepos'] },
    ],
    whatHappens: 'Escribe /etc/hostname, /etc/network/interfaces, /etc/apk/repositories y (modo sys) particiona e instala. En live/diskless nada persiste sin lbu commit.',
    errors: [{ symptom: 'Mis cambios desaparecen al reiniciar (live/USB).', cause: 'Alpine live corre en RAM.', fix: 'lbu commit -d para persistir, o instala en modo sys con setup-alpine.' }],
    related: ['apk'],
    intents: ['instalar alpine', 'configurar alpine primera vez', 'setup alpine repos'],
  },
]
