import type { BuilderConfig, BuilderResult, GenItem, GenPhase } from '../types'

/**
 * Genera la ruta personalizada según las elecciones del usuario.
 * Solo se incluyen los pasos relevantes para SU configuración.
 */
export function buildGuide(cfg: BuilderConfig): BuilderResult {
  const warnings: string[] = []
  const phases: GenPhase[] = []

  // Validaciones / advertencias de combinaciones
  if (cfg.use === 'server' && cfg.de !== 'none') {
    warnings.push(
      `Has elegido uso «Servidor» con entorno gráfico (${cfg.de}). Un servidor suele ser headless: considera «Ninguno». Si tu servidor necesita GUI por una razón concreta, ignora este aviso.`,
    )
  }
  if (cfg.use === 'minimal' && cfg.de !== 'none' && cfg.de !== 'sway') {
    warnings.push('Uso minimalista con un escritorio completo añade peso y servicios. Sway o ninguno encajan mejor con esa filosofía.')
  }
  if (cfg.dm === 'gdm' && cfg.de !== 'gnome') {
    warnings.push('GDM fuera de GNOME funciona pero arrastra dependencias GNOME innecesarias. Para ' + cfg.de + ', SDDM o greetd suelen encajar mejor.')
  }
  if (cfg.dm === 'sddm' && cfg.de === 'gnome') {
    warnings.push('SDDM con GNOME es válido pero GDM es el display manager integrado de GNOME (mejor gestión de sesión Wayland).')
  }
  if (cfg.cpu === 'nvidia' && (cfg.de === 'hyprland')) {
    warnings.push('NVIDIA + Hyprland funciona pero requiere variables de entorno y paciencia con versiones de driver. Lee la sección Hyprland → ajuste NVIDIA antes de decidir.')
  }
  if (cfg.fs === 'btrfs') {
    warnings.push('Con Btrfs, instala btrfs-progs durante pacstrap y usa subvolúmenes (@,@home,@log) como muestra la guía — sin ellos no habrá snapshots limpios.')
  }

  /* ------------------------------ Fase 1: Preparación ------------------------------ */
  phases.push({
    title: 'Preparación',
    description: 'ISO verificada, USB listo y firmware en modo correcto.',
    items: [
      {
        title: 'Descarga y verifica la ISO oficial',
        detail: 'archlinux.org/download → sha256 contra sha256sums.txt',
        linkSection: 'installation',
        importance: 'required',
      },
      {
        title: 'Graba el USB (modo DD)',
        detail: cfg.cpu === 'nvidia' ? 'Rufus DD / dd / Ventoy · ≥2 GB' : 'Rufus DD / dd / Etcher · ≥2 GB',
        linkSection: 'preparation',
        importance: 'required',
      },
      {
        title: 'Firmware: UEFI + AHCI, Secure Boot y Fast Boot off',
        detail: cfg.cpu === 'nvidia' ? 'Anota tu modelo exacto de GPU para elegir paquete nvidia adecuado después.' : 'Si hay BitLocker/RAID-RST activo, revisa Preparación primero.',
        linkSection: 'preparation',
        importance: 'required',
      },
      {
        title: 'Backup de datos importantes',
        detail: 'El particionado destruye lo que haya en el disco destino.',
        importance: 'required',
      },
    ],
  })

  /* -------------------------------- Fase 2: Sistema base ------------------------------- */
  const basePkgs = ['base', 'linux', 'linux-firmware', 'base-devel']
  basePkgs.push(cfg.cpu === 'intel' ? 'intel-ucode' : 'amd-ucode')
  basePkgs.push('networkmanager')
  basePkgs.push('vim')
  basePkgs.push('dosfstools')
  basePkgs.push('man-db man-pages')
  const fsMkCmds: import('../types').CmdLine[] =
    cfg.fs === 'ext4'
      ? [{ kind: 'run', user: 'sudo mkfs.ext4 -L arch /dev/nvme0n1p3' }]
      : [
          { kind: 'run', user: 'sudo mkfs.btrfs -L arch /dev/nvme0n1p3' },
          { kind: 'comment', text: 'Subvolúmenes @ @home @log (ver Instalación paso 14):' },
          { kind: 'run', user: 'sudo mount /dev/nvme0n1p3 /mnt' },
          { kind: 'run', user: 'sudo btrfs subvolume create /mnt/@' },
          { kind: 'run', user: 'sudo btrfs subvolume create /mnt/@home' },
          { kind: 'run', user: 'sudo btrfs subvolume create /mnt/@log' },
          { kind: 'run', user: 'sudo umount /mnt' },
        ]

  phases.push({
    title: 'Sistema base',
    description: `Particionado GPT, ${cfg.fs.toUpperCase()}${cfg.bootloader === 'grub' ? ' y GRUB' : ' y systemd-boot'}, chroot y configuración esencial.`,
    items: [
      {
        title: 'Particionar (GPT): ESP 1 GiB + swap opcional + resto raíz',
        detail: 'fdisk/cfdisk sobre EL disco identificado con lsblk.',
        linkSection: 'installation',
        lines: [
          { kind: 'run', user: 'sudo fdisk /dev/nvme0n1' },
          { kind: 'comment', text: 'dentro de fdisk: g (GPT) → n +1G tipo EFI → n swap (opcional) → n resto → w' },
        ],
        importance: 'required',
      },
      {
        title: 'Formatear particiones',
        detail: cfg.fs === 'btrfs' ? 'Btrfs: crea subvolúmenes @ @home @log tras formatear.' : 'ext4 directo sobre la raíz.',
        lines: [
          { kind: 'run', user: 'sudo mkfs.fat -F 32 /dev/nvme0n1p1' },
          { kind: 'comment', text: 'swap si la creaste:' },
          { kind: 'run', user: 'sudo mkswap /dev/nvme0n1p2 && sudo swapon /dev/nvme0n1p2' },
          ...fsMkCmds,
        ],
        importance: 'danger' as never,
      },
      {
        title: 'Montar en /mnt (root + ESP en /mnt/boot)',
        detail: cfg.fs === 'btrfs' ? 'Remonta cada subvolumen con compress=zstd:3,noatime,subvol=@home' : 'mount root y mount --mkdir ESP en boot.',
        linkSection: 'installation',
        importance: 'required',
      },
      {
        title: 'pacstrap: sistema base adaptado a tus elecciones',
        detail: `Incluye microcode ${cfg.cpu}, NetworkManager y ${cfg.fs === 'btrfs' ? 'btrfs-progs' : 'herramientas básicas'}.`,
        lines: [
          {
            kind: 'run',
            user:
              'sudo pacstrap -K /mnt ' +
              [...basePkgs, ...(cfg.fs === 'btrfs' ? ['btrfs-progs'] : [])].join(' '),
          },
        ],
        importance: 'required',
      },
      {
        title: 'genfstab + arch-chroot',
        lines: [
          { kind: 'run', user: 'sudo genfstab -U /mnt >> /mnt/etc/fstab' },
          { kind: 'run', user: 'sudo arch-chroot /mnt' },
        ],
        importance: 'required',
      },
      {
        title: 'Zona horaria, locale, keymap, hostname, hosts',
        detail: 'ln -sf zoneinfo → hwclock --systohc → locale.gen/locale.conf → vconsole.conf → /etc/hostname → /etc/hosts.',
        linkSection: 'installation',
        importance: 'required',
      },
      {
        title: 'Contraseñas: root + usuario normal con wheel',
        lines: [
          { kind: 'run', user: 'passwd' },
          { kind: 'run', user: `useradd -m -G wheel -s /bin/${shellPath(cfg.shell)} tu-usuario` },
          { kind: 'run', user: 'passwd tu-usuario' },
        ],
        importance: 'required',
      },
      {
        title: 'sudo: descomentar %wheel con visudo',
        lines: [{ kind: 'run', user: 'EDITOR=vim visudo' }],
        importance: 'required',
      },
      {
        title: 'Habilitar red al arrancar',
        lines: [{ kind: 'run', user: 'systemctl enable NetworkManager.service' }],
        importance: 'required',
      },
      cfg.bootloader === 'systemd-boot'
        ? {
            title: 'Bootloader: systemd-boot + entrada arch.conf',
            detail: 'bootctl install · PARTUUID real con blkid · initrd ucode ANTES que initramfs · hook de actualización.',
            lines: [
              { kind: 'run', user: 'bootctl install' },
              { kind: 'run', user: 'blkid -s PARTUUID -o value /dev/nvme0n1p3' },
              { kind: 'comment', text: 'crea /boot/loader/loader.conf y entries/arch.conf (guía paso 28)' },
              { kind: 'run', user: 'pacman -S systemd-boot-pacman-hook' },
            ],
            importance: 'required',
            linkSection: 'installation',
          }
        : {
            title: 'Bootloader: GRUB',
            detail: 'grub-install UEFI + grub-mkconfig (microcode automático).',
            lines: [
              { kind: 'run', user: 'pacman -S grub efibootmgr os-prober' },
              { kind: 'run', user: 'grub-install --target=x86_64-efi --efi-directory=/boot --bootloader-id=GRUB' },
              { kind: 'run', user: 'grub-mkconfig -o /boot/grub/grub.cfg' },
            ],
            importance: 'required',
            linkSection: 'installation',
          },
      {
        title: 'initramfs cuando corresponda',
        detail:
          cfg.cpu === 'nvidia'
            ? 'Con NVIDIA propietario: quita kms de HOOKS en /etc/mkinitcpio.conf antes de regenerar.'
            : 'Por defecto ya está bien; regenera solo si tocas módulos/hooks.',
        lines: cfg.cpu === 'nvidia' ? [{ kind: 'run', user: 'mkinitcpio -P' }] : undefined,
        importance: cfg.cpu === 'nvidia' ? 'recommended' : 'optional',
        linkSection: 'installation',
      },
      {
        title: 'exit · umount -R /mnt · reboot (sin USB)',
        importance: 'required',
      },
    ],
  })

  /* --------------------------------- Fase 3: Post-instalación ------------------------------- */
  const postItems: GenItem[] = [
    {
      title: 'Primer arranque: pacman -Syu + validaciones',
      detail: 'systemctl --failed · journalctl -p 3 -xb · ping archlinux.org.',
      lines: [{ kind: 'run' as const, user: 'sudo pacman -Syu' }],
      importance: 'required' as const,
      linkSection: 'first-boot',
    },
    {
      title: 'Ajustes base recomendados',
      detail: 'reflector (mirrors), zram-generator, fstrim.timer (SSD), journald acotado.',
      importance: 'recommended' as const,
      linkSection: 'basic-config',
    },
  ]

  // GPU post-install
  if (cfg.cpu === 'nvidia') {
    postItems.push({
      title: 'Drivers NVIDIA',
      detail: 'nvidia(-open)/dkms según kernel + lib32-utils. modeset=1 para Wayland.',
      lines: [
        { kind: 'run' as const, user: 'sudo pacman -S nvidia-open nvidia-utils lib32-nvidia-utils' },
        { kind: 'run' as const, user: 'sudo tee /etc/modprobe.d/nvidia.conf <<< "options nvidia-drm modeset=1 fbdev=1"' },
        { kind: 'run' as const, user: 'sudo mkinitcpio -P' },
      ],
      importance: 'required' as const,
      linkSection: 'gpu',
    })
  } else {
    postItems.push({
      title: 'Stack gráfico Mesa + Vulkan',
      lines: [
        {
          kind: 'run' as const,
          user:
            cfg.cpu === 'amd'
              ? 'sudo pacman -S mesa vulkan-radeon libva-mesa-driver vulkan-tools'
              : 'sudo pacman -S mesa vulkan-intel intel-media-driver vulkan-tools',
        },
      ],
      importance: 'required' as const,
      linkSection: 'gpu',
    })
  }

  // Entorno gráfico
  if (cfg.de !== 'none') {
    postItems.push({
      title: `Instalar ${deLabel(cfg.de)}`,
      detail: deDetail(cfg),
      lines: deCommands(cfg),
      importance: 'required',
      linkSection: cfg.de,
    })
  }

  // Display Manager
  if (cfg.dm !== 'none' && cfg.de !== 'none') {
    postItems.push({
      title: `Display manager: ${cfg.dm}`,
      detail: dmDetail(cfg),
      lines: dmCommands(cfg),
      importance: 'required',
      linkSection: 'display-managers',
    })
  } else if (cfg.de !== 'none') {
    postItems.push({
      title: 'Sin DM: arranque desde TTY',
      detail: 'Añade exec del entorno en .bash_profile (condicional tty1) o usa greetd más adelante.',
      importance: 'alternative',
      linkSection: 'display-managers',
    })
  }

  // Shell
  if (cfg.shell !== 'bash') {
    postItems.push({
      title: `Shell ${cfg.shell} como login`,
      lines: [
        { kind: 'run', user: `sudo pacman -S ${cfg.shell}` + (cfg.shell === 'zsh' ? ' zsh-autosuggestions zsh-syntax-highlighting' : '') },
        { kind: 'run', user: `chsh -l   # verifica ruta legal` },
        { kind: 'run', user: `chsh -s $(${cfg.shell === 'fish' ? 'which fish' : `which ${cfg.shell}`})` },
      ],
      importance: 'optional',
      linkSection: cfg.shell,
    })
  }
  postItems.push({
    title: 'Starship prompt + fuentes Nerd (opcional pero delicioso)',
    lines: [{ kind: 'run', user: 'sudo pacman -S starship ttf-jetbrainsmono-nerd' }],
    importance: 'optional',
    linkSection: 'starship',
  })

  /* --------------------------------- Fase 4: Según USO --------------------------------- */
  const usePhase: GenPhase = {
    title: `Extras para tu uso: ${useLabel(cfg.use)}`,
    description: useDescription(cfg.use),
    items: [],
  }

  switch (cfg.use) {
    case 'gaming':
      usePhase.items.push(
        { title: 'Multilib habilitado (requisito Steam)', detail: '/etc/pacman.conf → [multilib]', importance: 'required', linkSection: 'steam' },
        { title: 'Steam', lines: [{ kind: 'run', user: 'sudo pacman -S steam ttf-liberation' }], importance: 'required', linkSection: 'steam' },
        { title: 'Capa gaming: gamemode + mangohud + gamescope', lines: [{ kind: 'run', user: 'sudo pacman -S gamemode mangohud gamescope' }], importance: 'recommended', linkSection: 'gaming' },
        { title: 'lib32 Vulkan según GPU', detail: 'lib32-vulkan-radeon/intel o lib32-nvidia-utils', importance: 'required', linkSection: 'gaming' },
        { title: 'Proton-GE con protonup-qt (opcional)', importance: 'optional', linkSection: 'proton' },
        { title: 'Verifica anti-cheat de tus juegos (protondb/AACY)', importance: 'recommended', linkSection: 'gaming' },
      )
      break
    case 'dev':
      usePhase.items.push(
        { title: 'Git + editor', lines: [{ kind: 'run', user: 'sudo pacman -S git neovim' }], importance: 'required', linkSection: 'git' },
        { title: 'Docker + Compose', lines: [{ kind: 'run', user: 'sudo pacman -S docker docker-compose' }, { kind: 'run', user: 'sudo systemctl enable --now docker.service' }], importance: 'recommended', linkSection: 'docker' },
        { title: 'Clave SSH ed25519 + GitHub', importance: 'recommended', linkSection: 'ssh' },
        { title: 'Lenguajes según stack (node/python/rust…)', importance: 'optional', linkSection: 'pacman' },
      )
      break
    case 'server':
      usePhase.items.push(
        { title: 'sshd habilitado y endurecido', detail: 'PasswordAuthentication no tras copiar claves.', lines: [{ kind: 'run', user: 'sudo pacman -S openssh' }, { kind: 'run', user: 'sudo systemctl enable --now sshd.service' }], importance: 'required', linkSection: 'ssh' },
        { title: 'Firewall UFW: deny incoming / allow outgoing', lines: [{ kind: 'run', user: 'sudo pacman -S ufw' }, { kind: 'run', user: 'sudo ufw default deny incoming' }, { kind: 'run', user: 'sudo ufw allow OpenSSH' }, { kind: 'run', user: 'sudo ufw enable' }, { kind: 'run', user: 'sudo systemctl enable ufw.service' }], importance: 'required', linkSection: 'firewall' },
        { title: 'Backups automáticos (Borg/rsync timer)', importance: 'required', linkSection: 'backups' },
        { title: 'fail2ban si está expuesto a Internet', importance: 'recommended', linkSection: 'security' },
        { title: 'Sin DE: tmux como compañero permanente', lines: [{ kind: 'run', user: 'sudo pacman -S tmux' }], importance: 'recommended', linkSection: 'terminal' },
      )
      break
    case 'workstation':
      usePhase.items.push(
        { title: 'Suite ofimática y correo', lines: [{ kind: 'run', user: 'sudo pacman -S libreoffice-fresh thunderbird' }], importance: 'recommended', linkSection: 'pacman' },
        { title: 'Impresión CUPS + escáner', lines: [{ kind: 'run', user: 'sudo pacman -S cups system-config-printer sane simple-scan' }], importance: 'optional', linkSection: 'printers' },
        { title: 'Backups locales + externos', importance: 'recommended', linkSection: 'backups' },
        { title: 'Personalización coherente (GTK/Qt/iconos)', importance: 'optional', linkSection: 'customization' },
      )
      break
    case 'minimal':
      usePhase.items.push(
        { title: 'zram-generator en lugar de swap disco', lines: [{ kind: 'run', user: 'sudo pacman -S zram-generator' }], importance: 'recommended', linkSection: 'basic-config' },
        { title: 'tmux + herramientas CLI esenciales', lines: [{ kind: 'run', user: 'sudo pacman -S tmux git htop' }], importance: 'recommended', linkSection: 'terminal' },
        { title: 'Snapshots snapper si usas Btrfs', importance: 'optional', linkSection: 'snapshots' },
      )
      break
    default: // general
      usePhase.items.push(
        { title: 'Navegador + utilidades diarias', lines: [{ kind: 'run', user: 'sudo pacman -S firefox thunar p7zip unzip htop' }], importance: 'recommended', linkSection: 'pacman' },
        { title: 'Audio PipeWire completo', lines: [{ kind: 'run', user: 'sudo pacman -S pipewire wireplumber pipewire-audio pavucontrol' }], importance: 'required', linkSection: 'audio' },
        { title: 'Bluetooth (si tu equipo tiene)', lines: [{ kind: 'run', user: 'sudo pacman -S bluez bluez-utils' }, { kind: 'run', user: 'sudo systemctl enable --now bluetooth.service' }], importance: 'optional', linkSection: 'bluetooth' },
        { title: 'Backups: regla 3-2-1', importance: 'recommended', linkSection: 'backups' },
      )
  }

  phases.push({ ...postPhase(postItems) })

  // Mantenimiento final común
  phases.push({
    title: 'Cierre: seguridad y mantenimiento',
    description: 'Lo que separa un sistema juguete de uno serio.',
    items: [
      { title: 'Firewall configurado', importance: 'recommended', linkSection: 'firewall' },
      { title: 'Snapshots (Btrfs) o Timeshift-rsync', importance: 'recommended', linkSection: 'snapshots' },
      { title: 'Rutina de backups probada', importance: 'recommended', linkSection: 'backups' },
      { title: 'Optimización medida (arranque, zram, limpieza)', importance: 'optional', linkSection: 'optimization' },
      { title: 'Modo experto cuando quieras saber el POR QUÉ interno', importance: 'optional', linkSection: 'expert' },
    ],
  })

  // insertar fase de uso antes de la fase final (ya construida arriba)
  phases.splice(phases.length - 1, 0, usePhase)

  return { phases, warnings }
}

function shellPath(s: BuilderConfig['shell']): string {
  return s === 'bash' ? 'bash' : s
}

function deLabel(de: BuilderConfig['de']): string {
  return { kde: 'KDE Plasma', gnome: 'GNOME', hyprland: 'Hyprland', sway: 'Sway', i3: 'i3', xfce: 'XFCE', none: '—' }[de]
}

function deDetail(cfg: BuilderConfig): string {
  switch (cfg.de) {
    case 'kde':
      return 'plasma-meta + sddm. Sesión Wayland por defecto.'
    case 'gnome':
      return 'grupo gnome + gdm. Extensiones vía extension-manager.'
    case 'hyprland':
      return 'Compositor + ecosistema (waybar, wofi, dunst, foot) + portal hyprland.'
    case 'sway':
      return 'Sway + swaylock/swayidle/foot/wofi + portal wlr.'
    case 'i3':
      return 'X11: i3-wm + i3status + picom; startx o DM.'
    case 'xfce':
      return 'xfce4 + goodies + lightdm.'
    default:
      return ''
  }
}

function deCommands(cfg: BuilderConfig): import('../types').CmdLine[] | undefined {
  switch (cfg.de) {
    case 'kde':
      return [{ kind: 'run', user: 'sudo pacman -S plasma-meta konsole dolphin sddm' }]
    case 'gnome':
      return [{ kind: 'run', user: 'sudo pacman -S gnome gnome-tweaks extension-manager' }]
    case 'hyprland':
      return [
        {
          kind: 'run',
          user:
            'sudo pacman -S hyprland xdg-desktop-portal-hyprland qt5-wayland qt6-wayland polkit-kde-agent waybar wofi dunst foot grim slurp wl-clipboard',
        },
      ]
    case 'sway':
      return [{ kind: 'run', user: 'sudo pacman -S sway swaylock swayidle foot wofi waybar grim slurp wl-clipboard xdg-desktop-portal-wlr mako' }]
    case 'i3':
      return [{ kind: 'run', user: 'sudo pacman -S i3-wm i3status i3lock dmenu picom alacritty feh' }]
    case 'xfce':
      return [{ kind: 'run', user: 'sudo pacman -S xfce4 xfce4-goodies lightdm lightdm-gtk-greeter' }]
    default:
      return undefined
  }
}

function dmLabel(dm: BuilderConfig['dm']): string {
  return { sddm: 'SDDM', gdm: 'GDM', greetd: 'greetd', none: 'ninguno' }[dm]
}

function dmDetail(cfg: BuilderConfig): string {
  if (cfg.dm === 'greetd') return 'greetd + tuigreet: minimal y agnóstico del entorno.'
  if (cfg.dm === 'sddm') return 'Ideal para KDE/XFCE; funciona con cualquier sesión.'
  if (cfg.dm === 'gdm') return 'Integrado con GNOME; gestiona bien Wayland.'
  return ''
}

function dmCommands(cfg: BuilderConfig): import('../types').CmdLine[] | undefined {
  switch (cfg.dm) {
    case 'sddm':
      return [{ kind: 'run', user: 'sudo systemctl enable sddm.service' }]
    case 'gdm':
      return [{ kind: 'run', user: 'sudo systemctl enable gdm.service' }]
    case 'greetd':
      return [
        { kind: 'run', user: 'sudo pacman -S greetd greetd-tuigreet' },
        { kind: 'comment', text: 'config.toml → command = "tuigreet --remember --cmd <tu-sesion>"' },
        { kind: 'run', user: 'sudo systemctl enable greetd.service' },
      ]
    default:
      return undefined
  }
}

function postPhase(items: GenItem[]): GenPhase {
  return { title: 'Post-instalación inmediata', description: 'Drivers y escritorio funcionando en el primer arranque real.', items }
}

function useLabel(u: BuilderConfig['use']): string {
  return { gaming: 'Gaming', dev: 'Desarrollo', server: 'Servidor', general: 'Uso general', workstation: 'Workstation', minimal: 'Minimalista' }[u]
}

function useDescription(u: BuilderConfig['use']): string {
  switch (u) {
    case 'gaming':
      return 'Steam, Proton, overlays y rendimiento: la ruta completa del PC gamer Linux.'
    case 'dev':
      return 'Herramientas de desarrollo contenedores incluidos.'
    case 'server':
      return 'Headless, endurecido y automatizado.'
    case 'general':
      return 'Lo que cualquier escritorio cotidiano necesita.'
    case 'workstation':
      return 'Ofimática completa, impresión y productividad.'
    case 'minimal':
      return 'Solo lo esencial, rápido y ligero.'
  }
}
