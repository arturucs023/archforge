import type { Problem } from '../types'
import { cmd, danger, file, h, info, ol, p, tip, ul, warn } from './helpers'
import { NET_PROBLEMS } from './troubleshooting-net'
import { DISK_PROBLEMS } from './troubleshooting-disk'
import { SVC_PROBLEMS, USER_PROBLEMS, BASH_TROUBLE_PROBLEMS, PERF_PROBLEMS, PKG_PROBLEMS } from './troubleshooting-groups'
import { SERVER_PROBLEMS } from './troubleshooting-servers'

/** Nivel educativo de los problemas base (los nuevos lo llevan inline). */
const LEVELS_BY_ID: Record<string, 'facil' | 'intermedio' | 'avanzado'> = {
  'no-internet': 'intermedio', 'no-wifi': 'facil', 'no-audio': 'facil', 'black-screen': 'avanzado',
  'nvidia-not-working': 'avanzado', 'hyprland-no-start': 'avanzado', 'steam-no-open': 'intermedio',
  'proton-fail': 'intermedio', 'bluetooth-fail': 'facil', 'grub-missing': 'avanzado',
  'systemd-boot-missing': 'avanzado', 'arch-no-boot': 'avanzado', 'pacman-error': 'intermedio',
  'servicio-no-inicia': 'intermedio', 'puerto-ocupado': 'facil', 'aur-fail': 'intermedio',
}

const BASE_PROBLEMS: Problem[] = [
  {
    id: 'no-internet',
    title: 'No tengo Internet',
    level: 'intermedio',
    category: 'Red',
    severity: 'high',
    symptoms: ['ping archlinux.org falla', 'Navegador «sin conexión»', 'pacman no descarga'],
    causes: [
      'Interfaz DOWN o sin IP (DHCP falló)',
      'WiFi desconectado/radio bloqueada',
      'DNS resuelve mal aunque hay IP',
      'Cable/router/apagado físico',
    ],
    diagnose: [
      p('Diagnóstico en cascada — cada paso acota la capa del problema:'),
      cmd({},
        'ip link                    # 1) ¿interfaz existe y está UP?',
        'ip addr                    # 2) ¿tiene IP asignada?',
        'ip route                   # 3) ¿hay ruta default via gateway?',
        'ping -c2 192.168.1.1       # 4) ¿llega al router? (ajusta a tu gw)',
        'ping -c2 1.1.1.1           # 5) ¿sale a Internet por IP?',
        'ping -c2 archlinux.org     # 6) ¿DNS funciona?'),
    ],
    solutions: [
      {
        title: 'Sin IP → pedir una con NetworkManager',
        blocks: [
          cmd({},
            'nmcli device status',
            'nmcli connection show',
            'nmcli device connect enp3s0          # cable',
            'nmcli device wifi connect SSID password "clave"   # wifi'),
        ],
      },
      {
        title: 'Hay IP pero DNS roto',
        blocks: [
          cmd({},
            'resolvectl status | head -15',
            '# Forzar DNS conocido en el enlace:',
            'sudo resolvectl dns enp3s0 1.1.1.1 9.9.9.9',
            'sudo resolvectl flush-caches'),
        ],
      },
      {
        title: 'Radio WiFi bloqueada (rfkill)',
        blocks: [
          cmd({},
            'rfkill list',
            'sudo rfkill unblock all',
            'nmcli radio all on'),
        ],
      },
    ],
    alternatives: [
      'Compartir datos móviles por USB tethering como red temporal.',
      'Arrancar live USB para diagnosticar si el sistema instalado no llega a red.',
      'Probar otro cable/puerto del router antes de culpar al software.',
    ],
    finalCheck: 'ping -c3 archlinux.org devuelve respuestas Y pacman -Syu completa sin errores de descarga.',
  },

  {
    id: 'no-wifi',
    title: 'No funciona el WiFi',
    level: 'facil',
    category: 'Red',
    severity: 'high',
    symptoms: ['nmcli no muestra wlan', 'Redes no aparecen al escanear', 'Conecta y se cae'],
    causes: [
      'Firmware del chip no cargado (dmesg lo dice explícitamente)',
      'Driver presente pero rfkill bloqueado',
      'NetworkManager/iwd peleándose',
      'Regulatory domain impide canales',
    ],
    diagnose: [
      cmd({},
        'lspci -k | grep -iA3 network; lsusb | grep -i wireless',
        'sudo dmesg | grep -iE "firmware|wlan|wireless" | tail -20',
        'rfkill list',
        'nmcli radio'),
    ],
    solutions: [
      {
        title: 'Firmware faltante (el caso nº1)',
        blocks: [
          info('El kernel te lo dice', 'dmesg mostrará «failed to load firmware» con el nombre exacto del fichero. Casi siempre pertenece a linux-firmware:'),
          cmd({},
            'sudo pacman -S linux-firmware',
            'sudo reboot'),
          warn('Chips raros', 'Algunos Broadcom viejos requieren broadcom-wl-dkms (AUR). Identifica el chip exacto con lspci -nn antes de buscar.'),
        ],
      },
      {
        title: 'Servicio correcto activo',
        blocks: [
          cmd({},
            'systemctl status iwd NetworkManager --no-pager',
            '# NM puede usar iwd como backend (config recomendada):'),
          file('/etc/NetworkManager/conf.d/wifi-backend.conf', '[device]\nwifi.backend=iwd'),
        ],
      },
    ],
    alternatives: ['Adaptador USB WiFi con chip Atheros/Realtek soportado como plan B.', 'Ethernet o tethering mientras se arregla.'],
    finalCheck: 'nmcli device wifi list muestra redes y connect establece sesión que sobrevive un reboot.',
  },

  {
    id: 'no-audio',
    title: 'No tengo audio',
    level: 'facil',
    category: 'Audio',
    severity: 'medium',
    symptoms: ['Silencio total en apps', 'Dispositivo no aparece en pavucontrol', 'Audio BT no conecta perfil'],
    causes: [
      'Mute a nivel ALSA (MM en alsamixer)',
      'PipeWire/wireplumber no corriendo',
      'PulseAudio residual compitiendo',
      'Perfil de tarjeta equivocado (HDMI vs analógico)',
    ],
    diagnose: [
      cmd({},
        'wpctl status',
        'systemctl --user status pipewire wireplumber pipewire-pulse',
        'alsamixer                      # F6 elegir tarjeta; MM=muted'),
    ],
    solutions: [
      {
        title: 'Unmute ALSA y subir Master',
        blocks: [cmd({}, 'alsamixer   # M desmuta sobre Master y PCM; flechas suben')],
      },
      {
        title: 'Reiniciar stack PipeWire',
        blocks: [
          cmd({},
            'systemctl --user restart pipewire pipewire-pulse wireplumber',
            'wpctl status'),
        ],
      },
      {
        title: 'PulseAudio fantasma fuera',
        blocks: [
          cmd({},
            'systemctl --user status pulseaudio.service pulseaudio.socket',
            'sudo pacman -Rns pulseaudio pulseaudio-bluetooth 2>/dev/null || true',
            'systemctl --user mask pulseaudio.service'),
        ],
      },
    ],
    alternatives: ['pavucontrol para enrutar app→dispositivo concreto.', 'EasyEffects si buscas EQ/procesado.'],
    finalCheck: 'speaker-test -c2 produce ruido rosa por ambos canales y wpctl muestra volumen >0 sin [MUTED].',
  },

  {
    id: 'black-screen',
    title: 'Pantalla negra tras el bootloader',
    level: 'avanzado',
    category: 'Gráficos',
    severity: 'high',
    symptoms: ['Menú del boot aparece, luego negro', 'Monitor dice «no signal»', 'Sistema parece vivo (LEDs, ssh responde)'],
    causes: [
      'KMS temprano falla con tu GPU (típico NVIDIA)',
      'Salida de video equivocada (iGPU vs dGPU)',
      'Compositor/sesión crashea al iniciar',
    ],
    diagnose: [
      p('Prueba inmediata: en el menú del bootloader pulsa e y añade nomodeset a la línea linux/options. Arranca (F10/Ctrl+X). Si así entra: es driver gráfico confirmado.'),
      cmd({ caption: 'una vez dentro (TTY Ctrl+Alt+F3 si hay login gráfico colgado)' },
        'journalctl -b -p err --no-pager | tail -30',
        'lspci -k | grep -A3 VGA'),
    ],
    solutions: [
      {
        title: 'NVIDIA: instalar driver correcto + modeset',
        blocks: [
          cmd({},
            'sudo pacman -S nvidia nvidia-utils lib32-nvidia-utils',
            'sudo tee /etc/modprobe.d/nvidia.conf <<< "options nvidia-drm modeset=1 fbdev=1"',
            'sudo mkinitcpio -P && sudo reboot'),
        ],
      },
      {
        title: 'nomodeset permanente temporal hasta arreglar',
        blocks: [
          tip('Ediciones temporales', 'En systemd-boot edita arch.conf options añadiendo nomodeset; en GRUB edita desde su menú. Es diagnóstico, no solución definitiva: quítalo cuando los drivers funcionen.'),
        ],
      },
    ],
    alternatives: ['Conectar monitor a la otra salida GPU (portátiles híbridos).', 'Arrancar TTY multi-user.target: systemctl isolate multi-user.target.'],
    finalCheck: 'glxinfo -B reporta TU GPU como renderer y el escritorio arranca sin nomodeset.',
  },

  {
    id: 'nvidia-not-working',
    title: 'NVIDIA no funciona / rendimiento malo',
    level: 'avanzado',
    category: 'Gráficos',
    severity: 'medium',
    symptoms: ['nvidia-smi no existe', 'glxinfo usa llvmpipe (software)', 'Tearing/artefactos', 'Wayland no inicia'],
    causes: [
      'Paquete driver ≠ kernel instalado (linux vs lts)',
      'modeset no activo',
      'lib32-utils ausente (juegos)',
      'nouveau cargando antes que nvidia',
    ],
    diagnose: [
      cmd({},
        'nvidia-smi                       # ¿existe y lista GPU?',
        'lspci -k | grep -A3 VGA          # Kernel driver in use: ¿nvidia o nouveau?',
        'uname -r && pacman -Q linux nvidia | cat   # versiones coherentes?'),
    ],
    solutions: [
      {
        title: 'Alinear kernel y driver + modeset',
        blocks: [
          cmd({},
            '# Kernel linux oficial:',
            'sudo pacman -S linux-headers nvidia-dkms nvidia-utils lib32-nvidia-utils',
            '# (o nvidia en vez de dkms si usas kernel linux estándar)',
            '',
            'sudo tee /etc/modprobe.d/nvidia.conf <<< "options nvidia-drm modeset=1"',
            'lsmod | grep nouveau              # si carga nouveau:',
            'echo "blacklist nouveau" | sudo tee /etc/modprobe.d/nouveau-blacklist.conf',
            'sudo mkinitcpio -P && sudo reboot'),
        ],
      },
    ],
    alternatives: ['nvidia-open para Turing+: módulos abiertos oficiales (recomendado hoy).', 'PRIME en laptops: envycontrol (AUR) para modos integrado/híbrido/dgpu.'],
    finalCheck: 'nvidia-smi lista procesos cuando ejecutas algo pesado y glxinfo -B muestra NVIDIA (o PRIME offload correcto).',
  },

  {
    id: 'hyprland-no-start',
    title: 'Hyprland no inicia / cierra al instante',
    level: 'avanzado',
    category: 'Escritorio',
    severity: 'medium',
    symptoms: ['Vuelve al TTY/greeter', 'Pantalla negra con cursor', 'Log menciona EGL/GLX'],
    causes: [
      'Variables de entorno NVIDIA ausentes/incorrectas',
      'xdg-desktop-portal-hyprland u otra dependencia ausente',
      'HW cursor problemático',
      'Lanzándolo como root (prohibido)',
    ],
    diagnose: [
      cmd({},
        '# Lanzar desde TTY capturando log:',
        'Hyprland > ~/hypr.log 2>&1; tail -50 ~/hypr.log',
        'hyprctl monitors                 # solo si llegó a arrancar'),
    ],
    solutions: [
      {
        title: 'Stack completo + env NVIDIA',
        blocks: [
          cmd({},
            'sudo pacman -S hyprland xdg-desktop-portal-hyprland qt5-wayland qt6-wayland polkit-kde-agent'),
          file('~/.config/hypr/hyprland.conf — envs NVIDIA base', 'env = GBM_BACKEND,nvidia\nenv = __GLX_VENDOR_LIBRARY_NAME,nvidia\nenv = NVD_BACKEND,direct\n# Cursor software si hay artefactos:\ncursor {\n    no_hardware_cursors = true\n}'),
          warn('Contrasta con wiki Hyprland-NVIDIA', 'Las variables exactas evolucionan con drivers/aquamarine: la página oficial manda sobre cualquier guía (esta incluida).'),
        ],
      },
    ],
    alternatives: ['Probar Sway (wlroots) para aislar si el problema es hardware/Hyprland.', 'Session Wayland de KDE mientras tanto.'],
    finalCheck: 'Hyprland arranca desde greetd o TTY, hyprctl version responde y waybar aparece.',
  },

  {
    id: 'steam-no-open',
    title: 'Steam no abre',
    level: 'intermedio',
    category: 'Gaming',
    severity: 'medium',
    symptoms: ['Se queda en pantalla gris/blanca', 'Cierra silenciosamente', 'Error de fuentes/textos corruptos'],
    causes: [
      'Multilib no habilitado (paquete parcial)',
      'Fuentes Liberation ausentes',
      'GPU driver/lib32 incompletos',
      'Cache de bootstrap corrupta',
    ],
    diagnose: [
      cmd({},
        'pacman -Q steam lib32-mesa lib32-nvidia-utils ttf-liberation | cat',
        'steam                            # lanzar desde terminal y LEER la salida'),
    ],
    solutions: [
      {
        title: 'Base completa + reset bootstrap',
        blocks: [
          cmd({},
            'sudo pacman -S steam ttf-liberation lib32-vulkan-radeon lib32-vulkan-intel lib32-nvidia-utils',
            '',
            '# Si sigue moribundo, resetea bootstrap:',
            'mv ~/.local/share/Steam/bootstrap_ubuntu12 ~/.local/share/Steam/bootstrap_bak 2>/dev/null || true',
            'steam'),
        ],
      },
    ],
    alternatives: ['flatpak install flathub com.valvesoftware.Steam como entorno alternativo aislado.'],
    finalCheck: 'Steam abre, inicia sesión y descarga un juego pequeño completamente.',
  },

  {
    id: 'proton-fail',
    title: 'Proton no funciona / juego no arranca',
    level: 'intermedio',
    category: 'Gaming',
    severity: 'low',
    symptoms: ['«Running update» eterno', 'Sale al instante sin error visible', 'Pantalla negra con audio'],
    causes: [
      'Prefix corrupto',
      'Versión Proton incompatible con ese título',
      'Anti-cheat sin soporte Linux',
      'Dependencia winetricks faltante',
    ],
    diagnose: [
      cmd({},
        '# Log definitivo (launch options): PROTON_LOG=1 %command%',
        'tail -60 ~/steam-*.log'),
      tip('Antes de sufrir', 'Busca el título en protondb.com y areweanticheatyet.com: si el AC no soporta Linux, NADA que hagas funcionará.'),
    ],
    solutions: [
      {
        title: 'Reset prefix del juego',
        blocks: [
          cmd({ dangerous: true },
            '# APPID = número de la URL Steam del juego',
            'mv ~/.local/share/Steam/steamapps/compatdata/APPID ~/.local/share/Steam/steamapps/compatdata/APPID.bak'),
          info('Qué pierdes', 'Config local del prefix (registro del juego); saves en cloud sobreviven. El juego recreará el prefix limpio.'),
        ],
      },
      {
        title: 'Cambiar versión Proton',
        blocks: [p('Propiedades → Compatibility: prueba Experimental → GE (instalado con protonup) → versión estable anterior. Cambia UNA vez y prueba.')],
      },
    ],
    alternatives: ['protontricks <appid> --gui para inyectar componentes.', 'Native Linux build si existe (forzar en Compatibility global).'],
    finalCheck: 'El juego llega a menú principal estable 5 minutos con PROTON_LOG limpio de errores fatales.',
  },

  {
    id: 'bluetooth-fail',
    title: 'Bluetooth no funciona',
    level: 'facil',
    category: 'Hardware',
    severity: 'low',
    symptoms: ['bluetoothctl: No default controller', 'Dispositivos no aparecen al scan', 'Empareja pero no conecta audio'],
    causes: [
      'Servicio bluetooth parado',
      'Radio bloqueada (rfkill/botón avión)',
      'Firmware del adaptador sin cargar',
      'Perfil de audio faltante',
    ],
    diagnose: [
      cmd({},
        'systemctl status bluetooth',
        'rfkill list',
        'bluetoothctl show',
        'sudo dmesg | grep -i blue | tail'),
    ],
    solutions: [
      {
        title: 'Servicio + radio arriba',
        blocks: [
          cmd({},
            'sudo systemctl enable --now bluetooth.service',
            'sudo rfkill unblock all',
            'bluetoothctl power on'),
        ],
      },
      {
        title: 'Reemparejar con trust (audio BT clásico)',
        blocks: [
          cmd({},
            'bluetoothctl remove XX:XX:XX:XX:XX:XX',
            'scan on   # espera verlo',
            'pair XX:XX... && trust XX:XX... && connect XX:XX...'),
        ],
      },
    ],
    alternatives: ['Dongle USB BT 5.x barato si tu adaptador interno es problemático.'],
    finalCheck: 'bluetoothctl info MAC muestra Connected: yes tras reiniciar el dispositivo y reconecta solo.',
  },

  {
    id: 'grub-missing',
    title: 'GRUB no aparece / Arch no arranca por GRUB',
    level: 'avanzado',
    category: 'Arranque',
    severity: 'high',
    symptoms: ['Va directo a Windows/BIOS', 'grub rescue prompt', 'Error: no such partition'],
    causes: [
      'Entrada NVRAM borrada (firmware updates la limpian)',
      'Orden de boot cambiado',
      'grub.cfg corrupto tras update manual',
    ],
    diagnose: [
      p('Arranca el live USB y examina desde fuera:'),
      cmd({},
        'efibootmgr                        # ¿existe entrada GRUB?',
        'ls /sys/firmware/efi              # modo UEFI confirmado?'),
    ],
    solutions: [
      {
        title: 'Chroot + reinstalar/recrear GRUB',
        blocks: [
          cmd({},
            '# Montar como en instalación (root + ESP en /mnt/boot) y luego:',
            'sudo arch-chroot /mnt',
            'grub-install --target=x86_64-efi --efi-directory=/boot --bootloader-id=GRUB',
            'grub-mkconfig -o /boot/grub/grub.cfg',
            'exit && reboot'),
        ],
      },
      {
        title: 'Solo reordenar NVRAM (si entrada existe)',
        blocks: [
          cmd({},
            'efibootmgr                        # nota BootOrder',
            'sudo efibootmgr -o XXXX,YYYY      # poner GRUB primero'),
        ],
      },
    ],
    alternatives: ['systemd-boot como reemplazo más simple (bootctl install desde chroot).'],
    finalCheck: 'Reiniciar SIN usb: menú GRUB aparece y Arch arranca; efibootmgr muestra GRUB primero.',
  },

  {
    id: 'systemd-boot-missing',
    title: 'systemd-boot no aparece',
    level: 'avanzado',
    category: 'Arranque',
    severity: 'high',
    symptoms: ['Bootea directo Windows/BIOS setup', 'Menú no muestra aunque bootctl decía instalado', 'Entry nueva no sale en lista'],
    causes: [
      'ESP no montada al actualizar kernels (entries viejas)',
      'timeout=0 oculta menú instantáneamente',
      'Entrada NVRAM eliminada',
    ],
    diagnose: [
      cmd({ caption: 'desde live/chroot' },
        'bootctl status',
        'cat /boot/loader/loader.conf',
        'ls /boot/loader/entries/'),
    ],
    solutions: [
      {
        title: 'Reinstalar + entry correcta',
        blocks: [
          cmd({},
            'mount /dev/nvme0n1p1 /mnt/boot   # ESP SIEMPRE en /boot',
            'arch-chroot /mnt',
            'bootctl install                  # idempotente',
            '# Verifica arch.conf apunta a PARTUUID real (blkid):',
            'vim /boot/loader/entries/arch.conf',
            'exit && reboot'),
        ],
      },
      {
        title: 'Mostrar el menú',
        blocks: [file('/boot/loader/loader.conf', 'default arch.conf\ntimeout 4\nconsole-mode keep')],
      },
    ],
    alternatives: ['GRUB si necesitas dual boot autodetectado.'],
    finalCheck: 'Menú visible 4 s, Arch arranca, bootctl status sin warnings y kernel actual en entries.',
  },

  {
    id: 'arch-no-boot',
    title: 'Arch no arranca (emergencia general)',
    level: 'avanzado',
    category: 'Arranque',
    severity: 'high',
    symptoms: ['Kernel panic VFS root', 'emergency mode', 'Drop a maintenance shell', 'Boot cuelga en servicio'],
    causes: [
      'fstab erróneo (typo UUID)',
      'PARTUUID/root= incorrecto en bootloader',
      'initramfs roto/incompleto',
      'Actualización interrumpida',
    ],
    diagnose: [
      p('Protocolo de rescate universal: live USB → montar → chroot → mirar logs del boot fallido:'),
      cmd({},
        '# En el LIVE:',
        'mount /dev/nvme0n1p3 /mnt   # (+subvols btrfs según tu setup + ESP en /mnt/boot)',
        'arch-chroot /mnt',
        'journalctl -b -1 -p err     # errores del boot que FALLÓ',
        'findmnt --verify            # valida fstab actual'),
    ],
    solutions: [
      {
        title: 'fstab roto → corregir',
        blocks: [cmd({}, 'vim /etc/fstab   # corrige UUID con blkid; añade nofail a datos externos', 'systemctl daemon-reload')],
      },
      {
        title: 'initramfs/kernel sospechoso → regenerar/reinstalar',
        blocks: [
          cmd({},
            'mkinitcpio -P',
            '# Si el kernel mismo quedó mal:',
            'pacman -S linux   # reinstala vmlinuz/initramfs'),
        ],
      },
      {
        title: 'Downgrade de emergencia desde caché',
        blocks: [
          cmd({},
            'ls /var/cache/pacman/pkg/ | less',
            'pacman -U /var/cache/pacman/pkg/paquete-version-anterior.pkg.tar.zst'),
        ],
      },
    ],
    alternatives: ['Copiar datos y reinstalar SOLO si el disco presenta errores SMART: casi nunca necesario.'],
    finalCheck: 'Tres boots consecutivos exitosos sin emergency mode ni unidades failed.',
  },

  {
    id: 'pacman-error',
    title: 'Pacman da error',
    level: 'intermedio',
    category: 'Paquetes',
    severity: 'medium',
    symptoms: ['invalid signature/keyring errors', 'conflicting files', 'failed to commit transaction', 'disk full'],
    causes: [
      'Keyring caducado/desincronizado',
      'Archivo huérfano en el path de un paquete nuevo',
      'Disco lleno real',
      '-Sy parcial previo dejó estado inconsistente',
    ],
    diagnose: [
      cmd({},
        'df -h /                          # espacio REAL disponible',
        'sudo pacman -Syu --verbose 2>&1 | tail -20   # mensaje EXACTO'),
    ],
    solutions: [
      {
        title: 'Signature/keyring',
        blocks: [
          cmd({},
            'sudo pacman -Sy archlinux-keyring',
            'sudo pacman-key --refresh-keys   # lento pero exhaustivo',
            'sudo pacman -Su'),
        ],
      },
      {
        title: 'Conflicting files',
        blocks: [
          cmd({},
            '# ¿De quién ES ese archivo?',
            'pacman -Qo /ruta/conflictiva || echo "huérfano: muévelo tú"',
            'sudo mv /ruta/conflictiva{,.bak}',
            'sudo pacman -Syu'),
        ],
      },
      {
        title: 'Disco lleno',
        blocks: [
          cmd({},
            'paccache -r',
            'sudo journalctl --vacuum-size=100M',
            'paru -c 2>/dev/null || true'),
        ],
      },
    ],
    alternatives: ['Downgrade puntual con caché si una UPDATE concreta rompió (ver Pacman sección).'],
    finalCheck: 'pacman -Syu termina en «there is nothing to do» o completa transacción limpia.',
  },

  {
    id: 'servicio-no-inicia',
    title: 'Un servicio no inicia',
    level: 'intermedio',
    category: 'Servicios',
    severity: 'medium',
    symptoms: ['systemctl status muestra failed', 'El servicio arranca y muere', 'Permanece en «inactive (dead)»'],
    causes: [
      'Unidad inexistente o mal escrita (mayúsculas importan)',
      'Config inválida hace morir el proceso al arrancar',
      'Nunca se habilitó tras instalar',
      'Dependencia no satisfecha (red, DB, otra unidad)',
    ],
    diagnose: [
      p('La respuesta está SIEMPRE en su journal:'),
      cmd({},
        'systemctl status NOMBRE --no-pager     # estado exacto + PID/exit code',
        'journalctl -u NOMBRE -b -e --no-pager | tail -40   # motivo del fallo',
        'systemctl cat NOMBRE                   # fichero de unidad efectivo (+drop-ins)'),
    ],
    solutions: [
      {
        title: 'failed → corrige según el log',
        blocks: [info('Patrones típicos', 'permission denied = User= sin acceso a rutas · address already in use = puerto ocupado · config parse error = línea exacta en el log. Tras corregir: sudo systemctl restart NOMBRE.')],
      },
      {
        title: 'inactive+disabled → habilitar',
        blocks: [cmd({}, 'sudo systemctl enable --now NOMBRE')],
      },
      {
        title: 'dependencias → inspeccionar grafo',
        blocks: [cmd({}, 'systemctl list-dependencies NOMBRE', 'sudo systemctl daemon-reload')],
      },
    ],
    alternatives: ['Ejecuta el binario del ExecStart a mano para ver el error sin capa systemd.', 'systemd-analyze verify /ruta/unidad.service valida sintaxis.'],
    finalCheck: 'systemctl is-active NOMBRE devuelve active y sobrevive un reinicio completo.',
  },

  {
    id: 'puerto-ocupado',
    title: 'Un puerto está ocupado',
    level: 'facil',
    category: 'Red',
    severity: 'low',
    symptoms: ['address already in use', 'EADDRINUSE en tu app', 'El servidor no levanta'],
    causes: [
      'Otra instancia/app escucha ahí ya',
      'Sockets TIME_WAIT de conexiones recientes',
      'Un contenedor Docker publicó ese puerto (-p)',
    ],
    diagnose: [
      cmd({ caption: '¿quién escucha en el puerto?', explain: [{ token: '-tulpn', meaning: 'TCP+UDP, listeners, procesos, numérico' }] },
        'ss -tulpn | grep :PUERTO',
        '# o para sockets recientes no-listening:',
        'ss -tan | grep :PUERTO'),
    ],
    solutions: [
      {
        title: 'Hay proceso dueño → decidir',
        blocks: [cmd({},
          '# Matar al intruso (identifícalo bien antes):',
          'kill PID',
          '# O cambia el puerto de TU app/config')],
      },
      {
        title: 'Docker es el dueño',
        blocks: [cmd({}, 'docker ps --format "table {{.Names}}\\t{{.Ports}}"', '# Reasigna: docker run -p OTRO:contenedor … o para el contenedor')],
      },
      {
        title: 'Solo TIME_WAIT → esperar o reutilizar',
        blocks: [tip('60 s y se libera solo', 'Es estado normal del cierre TCP. Para desarrollo intensivo activa SO_REUSEADDR en tu aplicación; NO toques tcp_tw_reuse por sistema sin entenderlo.')],
      },
    ],
    alternatives: ['lsof -i :PUERTO como alternativa a ss.', 'netstat legado (iproute2 ss es el reemplazo).'],
    finalCheck: 'ss -tulpn | grep :PUERTO muestra TU proceso (o nada si cambiaste de puerto) y la app arranca limpia.',
  },

  {
    id: 'aur-fail',
    title: 'AUR falla (makepkg/yay/paru)',
    level: 'intermedio',
    category: 'Paquetes',
    severity: 'low',
    symptoms: ['PGP signature check fail al construir', 'ERROR: missing dependencies', 'Checksum mismatch', 'Compilación muere'],
    causes: [
      'Fuente upstream cambió sin actualizar sums (paquete desactualizado)',
      'Falta base-devel completo',
      'Clave GPG del desarrollador no importada',
      'RAM insuficiente compilando algo enorme',
    ],
    diagnose: [
      cmd({},
        'pacman -Qi base-devel | grep -E "Name|Version" >/dev/null && echo OK',
        'less PKGBUILD                    # mira source=() y sha256sums=()'),
    ],
    solutions: [
      {
        title: 'Clave GPG del proyecto (caso típico)',
        blocks: [
          p('Lee los COMENTARIOS del paquete en aur.archlinux.org: casi siempre alguien publica la key exacta:'),
          cmd({}, 'gpg --recv-keys LA-CLAVE-QUE-DICE-EL-ERROR', 'makepkg -si'),
        ],
      },
      {
        title: 'Checksum mismatch',
        blocks: [
          warn('No uses --skipinteg por reflejo', 'Mismatch puede ser fuente legítimamente actualizada O archivo manipulado. Verifica la fuente oficial ANTES; solo entonces regenera sums tú mismo:'),
          cmd({}, 'updpkgsums   # recalcula hashes del PKGBUILD actual'),
        ],
      },
      {
        title: 'OOM compilando',
        blocks: [cmd({}, 'free -h', '# Reduce jobs: MAKEFLAGS="-j2" makepkg -si')],
      },
    ],
    alternatives: ['Esperar actualización del maintainer (comenta en AUR).', 'Buscar fork activo o paquete equivalente en repos oficiales.'],
    finalCheck: 'El paquete instala (pacman -Qi nombre) y su binario corre.',
  },
]

export const PROBLEMS: Problem[] = [
  ...BASE_PROBLEMS,
  ...NET_PROBLEMS,
  ...DISK_PROBLEMS,
  ...SVC_PROBLEMS,
  ...USER_PROBLEMS,
  ...BASH_TROUBLE_PROBLEMS,
  ...PERF_PROBLEMS,
  ...PKG_PROBLEMS,
  ...SERVER_PROBLEMS,
]
