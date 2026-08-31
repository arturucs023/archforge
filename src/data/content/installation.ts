import type { SectionContent } from '../../types'
import { cmd, danger, deep, file, h, info, ol, out, p, tip, tbl, ul, warn } from '../helpers'

/**
 * Guía de instalación completa en 31 pasos, siguiendo las prácticas de la wiki de Arch Linux.
 * Cada paso incluye explicación, objetivo, comandos con desglose, resultado esperado,
 * comprobación y errores frecuentes.
 */
export const installation: SectionContent = {
  related: ['preparation', 'first-boot', 'pacman', 'storage'],
  steps: [
    /* ------------------------------ 01 Descargar ISO ----------------------------- */
    {
      id: 'inst-01-descargar',
      title: 'Descargar Arch Linux',
      goal: 'Obtener la imagen ISO oficial más reciente desde un mirror confiable.',
      importance: 'required',
      minutes: 10,
      blocks: [
        p('Arch Linux es una distribución rolling release: no hay «versiones», sino una única imagen mensual que contiene el sistema al día en el momento de su construcción. Siempre descarga la ISO más reciente; instalar desde una ISO vieja significa más paquetes que actualizar después.'),
        ul(
          'Página oficial de descargas: archlinux.org/download — lista mirrors geográficos.',
          'Mirror directo global: geo.mirror.pkgbuild.com (elige el servidor más cercano automáticamente).',
          'Alternativa por torrent: la ISO oficial tiene semillas activas y es igual de válida.',
        ),
        cmd({ caption: 'descargar desde terminal (opcional)' },
          '# Descarga la ISO y su firma GPG desde el mirror global',
          'wget https://geo.mirror.pkgbuild.com/iso/latest/archlinux-x86_64.iso',
          'wget https://geo.mirror.pkgbuild.com/iso/latest/archlinux-x86_64.iso.sig',
        ),
        info('¿Qué archivos necesito?', 'archlinux-x86_64.iso (la imagen, ~1,2 GB) y opcionalmente archlinux-x86_64.iso.sig para verificación criptográfica. El archivo .torrent también sirve.'),
      ],
      expect: 'El archivo archlinux-x86_64.iso presente en tu disco, descargado sin interrupciones.',
      verify: [
        cmd({}, 'ls -lh archlinux-x86_64.iso'),
        out('tamaño esperado', '1,2G  archlinux-x86_64.iso'),
      ],
      errors: [
        { symptom: 'La descarga se corta a mitad.', cause: 'Conexión inestable o mirror saturado.', fix: 'Usa wget -c para reanudar, o cambia a otro mirror de la lista oficial.' },
        { symptom: 'Error 404 al descargar.', cause: 'Estás usando un enlace antiguo o un mirror desincronizado.', fix: 'Vuelve a archlinux.org/download y copia el enlace actual.' },
      ],
    },

    /* ------------------------------ 02 Verificar ISO ----------------------------- */
    {
      id: 'inst-02-verificar',
      title: 'Verificar la ISO',
      goal: 'Comprobar que la imagen no está corrupta ni ha sido manipulada antes de grabarla.',
      importance: 'recommended',
      minutes: 10,
      blocks: [
        p('Verificar cumple dos objetivos: integridad (que la descarga no se corrompió) y autenticidad (que fue construida por el equipo de Arch). La forma práctica en cualquier sistema es comparar el hash SHA-256 con el publicado en los servidores oficiales vía HTTPS.'),
        cmd({ caption: 'calcular el hash local', explain: [
          { token: 'sha256sum', meaning: 'calcula el resumen criptográfico SHA-256 del archivo' },
          { token: 'archlinux-x86_64.iso', meaning: 'la imagen que acabas de descargar' },
        ] }, 'sha256sum archlinux-x86_64.iso'),
        out('salida típica', 'e6188bf7d06fbc5d7262f6e02fd2bcb7d43459dcea9fc7f6c3a6ea42e4a0e4d9  archlinux-x86_64.iso'),
        cmd({ caption: 'comparar contra los hashes oficiales (vía HTTPS)', explain: [
          { token: 'curl -s', meaning: 'descarga silenciosa del archivo de sumas oficial' },
          { token: 'sha256sums.txt', meaning: 'archivo publicado en el mirror con los hashes válidos' },
          { token: '| grep iso', meaning: 'filtra la línea de la ISO x86_64' },
        ] },
          '# Compara manualmente la salida anterior con esta línea',
          'curl -s https://geo.mirror.pkgbuild.com/iso/latest/sha256sums.txt | grep "x86_64.iso"',
        ),
        info('Verificación GPG (más fuerte)', 'En un sistema con GnuPG puedes verificar la firma: gpg --keyserver-options auto-key-retrieve --verify archlinux-x86_64.iso.sig. Esto prueba autoría, no solo integridad. Requiere confianza en el keyserver.'),
        warn('HTTPS no es garantía absoluta', 'Si tu red está comprometida, alguien podría suplantar incluso sha256sums.txt. Para máxima seguridad verifica la firma GPG con la clave del equipo de release de Arch.'),
      ],
      expect: 'El hash local coincide exactamente con el publicado en sha256sums.txt.',
      verify: [p('Ambas cadenas hexadecimales (64 caracteres) deben ser idénticas, carácter por carácter.')],
      errors: [
        { symptom: 'Los hashes NO coinciden.', cause: 'Descarga corrupta (lo más habitual) o archivo alterado.', fix: 'Borra la ISO y vuelve a descargarla. Si vuelve a fallar, prueba otro mirror o el torrent.' },
        { symptom: 'No puedo ejecutar sha256sum en Windows.', fix: 'PowerShell moderno incluye Get-FileHash archlinux-x86_64.iso -Algorithm SHA256. Rufus también verifica la ISO al grabarla en modo DD.' },
      ],
      alternatives: [
        h('Verificación automática en Rufus'),
        p('Rufus calcula el SHA-256 tras grabar en modo DD y te avisa si difiere del oficial. Sigue verificando contra la web para confirmar.'),
      ],
    },

    /* -------------------------------- 03 Crear USB ------------------------------- */
    {
      id: 'inst-03-usb',
      title: 'Crear el USB de arranque',
      goal: 'Escribir la ISO bit a bit en una memoria USB para que el firmware pueda arrancarla.',
      importance: 'required',
      minutes: 15,
      blocks: [
        p('La ISO de Arch es híbrida: se graba tal cual al USB (modo DD/raw), sin herramientas de «USB booteable» que reempaqueten nada. Necesitarás un pendrive de al menos 2 GB cuyo contenido se DESTRUIRÁ.'),
        tbl(
          ['Sistema', 'Herramienta recomendada', 'Notas'],
          [
            ['Windows', 'Rufus (modo DD) o Ventoy', 'Ventoy permite además conservar la ISO como archivo'],
            ['Linux/macOS', 'dd o cp', 'Cuidado extremo con el dispositivo destino'],
            ['Multiplataforma', 'balenaEtcher', 'Interfaz gráfica simple'],
          ],
        ),
        danger('Identifica tu USB ANTES de escribir', 'Escribir sobre /dev/sda o /dev/nvme0n1 por error destruiría tu disco duro. En Linux, lsblk muestra discos y tamaños; confirma dos veces cuál es el pendrive.'),
        cmd({ caption: 'grabar en Linux/macOS — AJUSTA of= A TU USB', dangerous: true, explain: [
          { token: 'sudo dd', meaning: 'copia cruda a nivel de bloque (necesita root porque toca hardware)' },
          { token: 'if=', meaning: 'archivo de entrada: la ISO' },
          { token: 'of=/dev/sdX', meaning: 'DISPOSITIVO COMPLETO, no una partición (/dev/sdb, nunca /dev/sdb1)' },
          { token: 'bs=4M status=progress oflag=sync conv=fsync', meaning: 'bloques de 4 MB, progreso visible y sincronización real al final' },
        ] },
          'sudo dd bs=4M status=progress oflag=sync if=archlinux-x86_64.iso of=/dev/sdX conv=fsync',
        ),
        tip('Truco de los expertos: cat', 'En Linux también basta: sudo cat archlinux-x86_64.iso > /dev/sdX && sync. Es literalmente lo mismo que hace dd.'),
      ],
      expect: 'Un USB que el firmware reconoce como dispositivo UEFI arrancable con la etiqueta ARCH_YYYYMM.',
      verify: [
        p('En Windows, Rufus muestra «Listo» tras verificar. En Linux, sync devuelve sin errores y dmesg | tail puede mostrar el nuevo dispositivo re-enumerado.'),
      ],
      errors: [
        { symptom: 'El USB no aparece como arrancable.', cause: 'La herramienta creó un USB «instalador» en vez de clonar la ISO (modo ISO de Rufus).', fix: 'Regraba seleccionando explícitamente el modo DD en Rufus, o usa Etcher/Ventoy.' },
        { symptom: 'dd tarda muchísimo o se queda «colgado» al terminar.', cause: 'Caché de escritura: dd terminó pero los datos aún van camino al USB.', fix: 'Espera: el prompt vuelve cuando conv=fsync termina de vaciar el búfer. Nunca extraigas antes.' },
        { symptom: 'Windows no lee el USB después de grabar.', fix: 'Es normal: la ISO usa particiones que Windows no entiende. El USB sigue siendo válido; recupéralo después reformateándolo.' },
      ],
    },

    /* ------------------------------ 04 Arrancar USB ------------------------------ */
    {
      id: 'inst-04-arrancar',
      title: 'Arrancar desde el USB',
      goal: 'Hacer que el firmware cargue el instalador de Arch en modo UEFI.',
      importance: 'required',
      minutes: 10,
      blocks: [
        p('Al encender el equipo, el firmware (UEFI) busca dispositivos arrancables. Debes decirle explícitamente que use el USB y, preferiblemente, en modo UEFI (no Legacy/CSM), que es lo recomendado hoy.'),
        ol(
          'Enciende el equipo y pulsa repetidamente la tecla de menú de arranque: F12 (Dell/Lenovo), F9 (HP), F8/Escape (ASUS), F11 (MSI/Gigabyte)… varía según fabricante.',
          'Elige la entrada que diga UEFI: NombreDelUSB (evita la que dice solo USB o Legacy).',
          'En el menú de GRUB del USB, selecciona «Arch Linux install medium (x86_64, BIOS o UEFI)».',
        ),
        warn('Desactiva temporalmente Fast Boot', 'El «arranque rápido» de algunos firmwares inicializa USB demasiado tarde y el instalador no aparece. Desactívalo en la configuración de firmware si el USB no arranca.'),
        info('Secure Boot', 'La ISO oficial no está firmada para Secure Boot. Desactívalo en el firmware durante la instalación. Podrás volver a activarlo después configurando tus propias claves con sbctl (ver Modo experto).'),
      ],
      expect: 'Un prompt de shell root: [root@archiso ~]#. Estás dentro del entorno live.',
      verify: [cmd({}, 'cat /proc/version')],
      errors: [
        { symptom: 'El menú de arranque no muestra el USB.', cause: 'Fast Boot activo, puerto USB defectuoso o USB mal grabado.', fix: 'Prueba otro puerto (usa USB 2.0 si hay dudas), revisa el orden de arranque en la configuración del firmware, o regraba el USB.' },
        { symptom: 'Arranca pero en modo Legacy sin querer.', fix: 'Entra en la configuración de firmware y desmarca CSM/Legacy Boot; vuelve a elegir la entrada UEFI: del menú.' },
      ],
    },

    /* ------------------------------ 05 Comprobar UEFI ---------------------------- */
    {
      id: 'inst-05-uefi',
      title: 'Comprobar si has arrancado en modo UEFI',
      goal: 'Confirmar el modo de arranque real, porque determina cómo instalarás el bootloader.',
      importance: 'required',
      minutes: 2,
      blocks: [
        p('Instalar GRUB o systemd-boot en modo UEFI exige haber ARRANCADO en modo UEFI. Si arrancaste en modo BIOS/legacy aunque tu placa sea moderna, la instalación del bootloader fallará o quedará mal configurada. Compruébalo siempre.'),
        cmd({ caption: 'método actual', explain: [
          { token: '/sys/firmware/efi/fw_platform_size', meaning: 'existe SOLO si arrancaste en UEFI; su valor es el ancho del firmware (64 normal)' },
        ] }, 'cat /sys/firmware/efi/fw_platform_size'),
        out('interpretación', '64   → UEFI de 64 bits (lo habitual)\n32   → UEFI de 32 bits (raro)\ncat: ... No such file → has arrancado en modo BIOS/legacy'),
        cmd({ caption: 'método clásico alternativo' }, 'ls /sys/firmware/efi/efivars'),
      ],
      expect: 'El número 64 (o al menos una lista de archivos en efivars). Si no existe, reinicia y arranca en modo UEFI.',
      verify: [p('Antes de continuar debes tener claro el modo: toda la guía asume UEFI de 64 bits y lo indica donde cambia para BIOS.')],
      errors: [
        { symptom: 'fw_platform_size no existe.', cause: 'Arrancaste en legacy/CSM.', fix: 'Reinicia, entra en el firmware, desactiva CSM y arranca desde la entrada UEFI: del USB.' },
      ],
    },

    /* ------------------------------- 06 Internet -------------------------------- */
    {
      id: 'inst-06-internet',
      title: 'Conectar a Internet',
      goal: 'Tener conectividad IP funcional: es imprescindible porque pacstrap descarga todo desde los repositorios.',
      importance: 'required',
      minutes: 10,
      blocks: [
        p('El entorno live intenta obtener IP por DHCP en todas las interfaces cableadas automáticamente. Con cable Ethernet normalmente ya estás conectado; con WiFi usarás iwd (daemon inalámbrico incluido en la ISO).'),
        cmd({ caption: 'ver interfaces de red', explain: [{ token: 'ip link', meaning: 'lista interfaces (eth/enp… cableadas, wlan… wifi) y su estado UP/DOWN' }] }, 'ip link'),
        cmd({ caption: 'conectar por WiFi con iwctl', explain: [
          { token: 'iwctl', meaning: 'cliente interactivo de iwd, el gestor WiFi de la ISO' },
          { token: 'station device scan', meaning: 'escanea redes con tu interfaz (ej. wlan0)' },
          { token: 'station device get-networks', meaning: 'muestra redes encontradas' },
          { token: 'station device connect SSID', meaning: 'conecta y pedirá la contraseña' },
        ] },
          'iwctl',
          '[iwd]# station wlan0 scan',
          '[iwd]# station wlan0 get-networks',
          '[iwd]# station wlan0 connect MiRed',
          '[iwd]# exit',
        ),
        cmd({ caption: 'probar conectividad', explain: [{ token: 'ping -c 3', meaning: 'envía 3 paquetes ICMP echo y termina' }] }, 'ping -c 3 archlinux.org'),
        cmd({ caption: 'sincronizar el reloj del sistema', explain: [{ token: 'timedatectl set-ntp true', meaning: 'activa NTP en el entorno live; evita errores TLS por hora incorrecta' }] }, 'timedatectl set-ntp true'),
      ],
      expect: 'Respuestas de ping (time=XX ms). El reloj mostrado por timedatectl coincide con la hora real («synchronized: yes»).',
      verify: [
        cmd({}, 'timedatectl status'),
        out('señal buena', 'System clock synchronized: yes\n              NTP service: active'),
      ],
      errors: [
        { symptom: 'ping falla pero iwctl dijo connected.', cause: 'Portal cautivo (red de hotel/universidad), DNS roto o firewall de la red.', fix: 'Abre el portal desde un navegador… pero la ISO live no trae uno: usa una red sin portal o comparte datos móviles por USB tethering desde el móvil (aparece como interfaz usb0 y funciona con DHCP).' },
        { symptom: 'iwctl no ve mi interfaz WiFi.', cause: 'Driver cargado tarde o radio bloqueada.', fix: 'rfkill list para ver bloqueos; rfkill unblock all. Si persiste, tu chip necesita un driver no incluido: usa Ethernet o un adaptador USB compatible.' },
        { symptom: 'Errores de clave GPG al usar pacman más adelante.', cause: 'Reloj del sistema desfasado.', fix: 'Repite timedatectl set-ntp true y espera unos segundos a que sincronice.' },
      ],
      alternatives: [
        p('Sin WiFi funcional: comparte Internet desde tu móvil por USB tethering (ajustes del teléfono) o usa un adaptador Ethernet USB. Ambos aparecen como interfaz cableada y obtienen DHCP sin configuración.'),
      ],
    },

    /* ---------------------------- 07 Identificar discos -------------------------- */
    {
      id: 'inst-07-discos',
      title: 'Identificar los discos',
      goal: 'Saber exactamente qué dispositivo vas a particionar antes de tocar nada.',
      importance: 'required',
      minutes: 5,
      blocks: [
        p('En Linux los discos son dispositivos de bloque: sdX para SATA/USB (sda, sdb…) y nvmeXnY para NVMe (nvme0n1, nvme1n1…). Las particiones añaden un sufijo numérico: sda1, nvme0n1p2. Confundirlos es la vía rápida a perder datos.'),
        cmd({ caption: 'listar discos con modelo y tipo', explain: [
          { token: 'lsblk -d', meaning: 'lista SOLO discos (sin particiones hijas)' },
          { token: '-o NAME,SIZE,MODEL,ROTA', meaning: 'columnas: nombre, tamaño, modelo físico y si es giratorio (1=HDD, 0=SSD/NVMe)' },
        ] }, 'lsblk -d -o NAME,SIZE,MODEL,ROTA'),
        out('ejemplo', 'NAME       SIZE MODEL              ROTA\nsda      232,9G Samsung SSD 860     0\nnvme0n1  476,9G WD Blue SN570       0'),
        cmd({ caption: 'detalle completo con UUIDs y filesystems' }, 'lsblk -f'),
      ],
      expect: 'Has identificado el disco destino (p. ej. /dev/nvme0n1) por su tamaño Y modelo. Esa ruta la usaremos en los pasos siguientes.',
      verify: [danger('Regla de oro', 'Si tu disco aparece dos veces (una por cada forma de conexión), desconecta el resto de discos USB y repite. Menos discos conectados = menos posibilidad de error.')],
      errors: [
        { symptom: 'Mi disco no aparece.', cause: 'RAID por hardware/firmware activo (Intel RST/VMD) oculta los discos SATA al sistema.', fix: 'Entra en el firmware y cambia el controlador SATA de RAID/RST a AHCI. ATENCIÓN: en Windows con BitLocker, suspende el cifrado antes de cambiar a AHCI o no arrancará.' },
      ],
    },

    /* ------------------------------ 08 Plan de particiones ----------------------- */
    {
      id: 'inst-08-particionar-plan',
      title: 'Particionar: esquema y tabla GPT',
      goal: 'Decidir el esquema de particiones y crear una tabla GPT nueva en el disco destino.',
      importance: 'required',
      minutes: 10,
      blocks: [
        p('Esquema recomendado y suficiente para la mayoría: una partición EFI (ESP) para los bootloaders/kernel, una swap opcional y el resto para root (/). Particiones separadas para /home son opcionales: con Btrfs los subvolúmenes cumplen ese papel mejor.'),
        tbl(
          ['Partición', 'Tamaño sugerido', 'Tipo GPT', 'Montaje'],
          [
            ['EFI (ESP)', '512 MiB – 1 GiB', 'EFI System', '/boot'],
            ['swap', '4–8 GB (o ~RAM si quieres hibernar)', 'Linux swap', '—'],
            ['root /', 'resto del disco', 'Linux filesystem', '/'],
          ],
        ),
        info('¿Cuánta swap?', 'Sin hibernación: 4–8 GB cubren cualquier caso; muchos equipos modernos usan zram en su lugar. Con hibernación: algo ≥ RAM total. También puedes combinar: swap pequeña + zram.'),
        cmd({ caption: 'abrir fdisk sobre TU disco (ejemplo NVMe)', explain: [
          { token: 'fdisk /dev/nvme0n1', meaning: 'editor interactivo de particiones; SIN número: opera sobre el disco completo' },
        ] }, 'sudo fdisk /dev/nvme0n1'),
        cmd({ caption: 'dentro de fdisk: crear tabla GPT', explain: [
          { token: 'g', meaning: 'crea una tabla GPT vacía (nueva, borra TODO lo anterior)' },
          { token: 'w', meaning: 'escribe los cambios al disco (hasta entonces nada está modificado)' },
        ], dangerous: true },
          'g   ← comando dentro de fdisk: crea tabla GPT',
          'w   ← escribe cambios y sale',
        ),
        tip('Alternativa visual', 'cfdisk /dev/nvme0n1 ofrece la misma operación con interfaz de flechas. parted es otra opción común en scripts. Usa la que te resulte clara; el resultado debe ser idéntico.'),
      ],
      expect: 'Tabla de particiones GPT limpia creada en el disco destino.',
      verify: [cmd({}, 'sudo fdisk -l /dev/nvme0n1'), out('esperado', 'Disklabel type: gpt  (y aún sin particiones)')],
      errors: [
        { symptom: 'fdisk dice «Partition table entries are not in disk order» o similares.', fix: 'Es informativo; con g ya has creado una GPT nueva, así que queda limpio.' },
        { symptom: 'Miedo a borrar el disco equivocado.', fix: 'Bien. Vuelve al paso 07, confirma el nombre, y si tienes dudas desconecta físicamente otros discos. fdisk no escribe nada hasta pulsar w.' },
      ],
    },

    /* --------------------------------- 09 EFI ----------------------------------- */
    {
      id: 'inst-09-efi',
      title: 'Crear la partición EFI (ESP)',
      goal: 'Reservar espacio FAT32 donde vivirán bootloader, kernel e initramfs.',
      importance: 'required',
      minutes: 5,
      blocks: [
        p('La ESP (EFI System Partition) es un estándar UEFI: una partición FAT32 con un tipo concreto que el firmware sabe leer para encontrar bootloaders. systemd-boot y GRUB se instalan ahí; también montaremos aquí /boot con nuestros kernels.'),
        cmd({ caption: 'dentro de fdisk (sigues en la sesión o vuelves a entrar)', explain: [
          { token: 'n', meaning: 'nueva partición' },
          { token: '+1G', meaning: 'tamaño: 1 GiB (512M también válido; 1 GiB da margen para varios kernels y firmware)' },
          { token: 't', meaning: 'cambiar el tipo de partición' },
          { token: '1', meaning: 'tipo «EFI System»' },
        ] },
          'n   ← nueva partición (Enter: número por defecto 1, primer sector por defecto)',
          '+1G ← tamaño',
          't   ← cambiar tipo',
          '1   ← EFI System',
        ),
        info('¿Por qué 1 GiB?', 'La wiki recomienda hoy 1 GiB para ESP cómodas: caben varios kernels, initramfs grandes y hasta imágenes UKI. 512 MiB funcionan perfectamente si prefieres aprovechar más disco.'),
      ],
      expect: 'fdisk lista la partición 1 con tipo «EFI System» y ~1 GiB.',
      verify: [cmd({}, 'p   ← comando dentro de fdisk para imprimir la tabla')],
      errors: [
        { symptom: 'Elegí el tipo incorrecto.', fix: 'Repite t sobre la partición correcta antes de w. Nada es definitivo hasta escribir.' },
      ],
    },

    /* --------------------------------- 10 Swap ----------------------------------- */
    {
      id: 'inst-10-swap',
      title: 'Crear la partición de swap',
      goal: 'Añadir espacio de intercambio en disco (opcional pero recomendable según uso).',
      importance: 'optional',
      minutes: 5,
      blocks: [
        p('Swap permite al kernel expulsar páginas poco usadas a disco. Con zram (memoria comprimida en RAM) muchos escritorios prescinden de ella; la necesitas sí o sí si quieres hibernar o si tu RAM es ajustada.'),
        cmd({ caption: 'dentro de fdisk', explain: [
          { token: '19', meaning: 'tipo «Linux swap»' },
        ] },
          'n   ← nueva partición (número 2, primer sector por defecto)',
          '+8G ← tamaño (o ~tu RAM si piensas hibernar)',
          't   ← cambiar tipo (partición 2)',
          '19  ← Linux swap',
        ),
        info('¿Swap o zram?', 'Escritorio con ≥16 GB de RAM y sin hibernación: puedes saltarte este paso y usar zram (Configuración básica). Portátil o ≤8 GB: crea la partición. Hibernación: imprescindible y del tamaño de la RAM (o más).'),
      ],
      expect: 'Partición 2 de tipo «Linux swap» creada (o decisión consciente de omitirla).',
      verify: [cmd({}, 'p   ← imprimir y confirmar tipos: EFI System, Linux swap') ],
      errors: [
        { symptom: 'Quiero quitar la swap más adelante.', fix: 'Se puede: apaga su uso con swapoff, comenta la línea en /etc/fstab y elimina/redimensiona la partición. Por eso tampoco pasa nada por crearla.' },
      ],
    },

    /* --------------------------------- 11 Root ---------------------------------- */
    {
      id: 'inst-11-root',
      title: 'Crear la partición raíz (root /)',
      goal: 'Ocupar el resto del disco con la partición que contendrá el sistema.',
      importance: 'required',
      minutes: 3,
      blocks: [
        p('La partición raíz aloja todo: /usr, /etc, /home (como subvolumen Btrfs o directorio normal). Usamos el espacio restante completo.'),
        cmd({ caption: 'dentro de fdisk' },
          'n   ← nueva partición (número 3; acepta primer y último sector por defecto → resto del disco)',
          'w   ← escribir TODOS los cambios al disco y salir',
        ),
      ],
      expect: 'fdisk escribe la tabla y sale. Ya no hay vuelta atrás: las tres particiones existen.',
      verify: [
        cmd({}, 'lsblk /dev/nvme0n1'),
        out('esperado (nombres según disco)', 'NAME        SIZE TYPE\nnvme0n1p1     1G part\nnvme0n1p2     8G part\nnvme0n1p3   468G part'),
      ],
      errors: [
        { symptom: 'Me equivoqué en algo antes de w.', fix: 'Sal con q (quit sin guardar) y empieza de nuevo el paso 08. Sin w, nada cambió.' },
      ],
    },

    /* ------------------------------ 12 Filesystem -------------------------------- */
    {
      id: 'inst-12-filesystem',
      title: 'Elegir el sistema de ficheros',
      goal: 'Decidir entre ext4 y Btrfs antes de formatear: condiciona snapshots, compresión y recuperación.',
      importance: 'required',
      minutes: 5,
      blocks: [
        p('ext4: el filesystem clásico de Linux. Maduro, rápido, casi imposible de configurar mal. Sin snapshots ni compresión nativa.'),
        p('Btrfs: copy-on-write con subvolúmenes, snapshots instantáneos, compresión transparente zstd y checksums de datos. Ligeramente más complejo de administrar; requiere btrfs-progs.'),
        tbl(
          ['', 'ext4', 'Btrfs'],
          [
            ['Snapshots', 'No (usaría rsync/Timeshift-rsync)', 'Sí, instantáneos y atómicos'],
            ['Compresión', 'No', 'zstd transparente (~ahorra 20–40%)'],
            ['Integridad', 'Journal de metadatos', 'Checksums de datos+metadatos'],
            ['Complejidad', 'Mínima', 'Media (subvolúmenes, balance)'],
            ['Para quién', 'Quien quiere cero sorpresas', 'Quien quiere rollbacks y compresión'],
          ],
        ),
        info('Decide ahora', 'El siguiente paso formatea con UNO de los dos. Puedes compararlos en detalle en Comparador → ext4 vs Btrfs. Cambiar después implica reformatear.'),
      ],
      expect: 'Decisión tomada. Los pasos siguientes muestran ambas variantes: sigue solo la rama elegida.',
      verify: [],
      errors: [],
    },

    /* -------------------------------- 13 Formatear ------------------------------- */
    {
      id: 'inst-13-formatear',
      title: 'Formatear las particiones',
      goal: 'Crear los filesystems: FAT32 en la ESP, swap en su partición, ext4 o Btrfs en root.',
      importance: 'required',
      minutes: 5,
      blocks: [
        danger('Esto destruye los datos de las particiones indicadas', 'mkfs no pregunta dos veces. Comprueba cada ruta contra la salida de lsblk del paso 11 antes de pulsar Enter.'),
        h('Rama A — ext4'),
        cmd({ caption: 'formatear con ext4', dangerous: true, explain: [
          { token: 'mkfs.fat -F 32', meaning: 'FAT32 obligatorio para la ESP (exigencia UEFI)' },
          { token: 'mkswap', meaning: 'inicializa la partición de intercambio' },
          { token: 'mkfs.ext4 -L arch', meaning: 'filesystem ext4 con etiqueta «arch»' },
        ] },
          'sudo mkfs.fat -F 32 /dev/nvme0n1p1',
          'sudo mkswap /dev/nvme0n1p2',
          'sudo mkfs.ext4 -L arch /dev/nvme0n1p3',
        ),
        h('Rama B — Btrfs'),
        cmd({ caption: 'formatear con Btrfs', dangerous: true, explain: [
          { token: '-L arch', meaning: 'etiqueta de volumen, útil en fstab' },
        ] },
          'sudo mkfs.fat -F 32 /dev/nvme0n1p1',
          'sudo mkswap /dev/nvme0n1p2',
          'sudo mkfs.btrfs -L arch /dev/nvme0n1p3',
        ),
        cmd({ caption: 'activar la swap ya (para este proceso de instalación)' }, 'sudo swapon /dev/nvme0n1p2'),
      ],
      expect: 'Cada mkfs termina reportando UUID y bloques escritos. swapon no emite salida: sin noticias son buenas noticias.',
      verify: [cmd({}, 'lsblk -f /dev/nvme0n1'), out('esperado', 'FSTYPE correcto en cada partición: vfat / swap / ext4 o btrfs')],
      errors: [
        { symptom: 'mkfs.fat: ERROR: ... size is too small/large', cause: 'Formateaste una partición que no es la ESP (¿invertiste el orden?).', fix: 'Cancela, revisa con lsblk -f y repite apuntando a la partición de 1 GiB.' },
      ],
      alternatives: [
        p('¿Discos grandes avanzados? Btrfs soporta múltiples dispositivos y RAID1 por software (mkfs.btrfs -d raid1 -m raid1 /dev/X /dev/Y); documéntalo en la sección Btrfs antes de intentarlo en una instalación inicial.'),
      ],
    },

    /* --------------------------------- 14 Montar --------------------------------- */
    {
      id: 'inst-14-montar',
      title: 'Montar los filesystems',
      goal: 'Preparar /mnt como la futura raíz: montar root, la ESP en /mnt/boot y (en Btrfs) crear subvolúmenes.',
      importance: 'required',
      minutes: 10,
      blocks: [
        p('pacstrap instala el sistema DENTRO de lo que esté montado en /mnt. La ESP se monta en /mnt/boot para que kernels y bootloader acaben donde el firmware los encuentra.'),
        h('Rama A — ext4 (montaje directo)'),
        cmd({ caption: 'montaje ext4', explain: [
          { token: '--mkdir', meaning: 'mount crea el punto de montaje si no existe' },
        ] },
          'sudo mount --mkdir /dev/nvme0n1p3 /mnt',
          'sudo mount --mkdir /dev/nvme0n1p1 /mnt/boot',
        ),
        h('Rama B — Btrfs (con subvolúmenes)'),
        p('Crearemos @ (raíz), @home y @log, y montaremos con compresión zstd y noatime. Así los snapshots de @ no arrastran ni /home ni logs crecientes.'),
        cmd({ caption: 'crear subvolúmenes sobre el top-level', dangerous: true },
          'sudo mount /dev/nvme0n1p3 /mnt',
          'sudo btrfs subvolume create /mnt/@',
          'sudo btrfs subvolume create /mnt/@home',
          'sudo btrfs subvolume create /mnt/@log',
          'sudo umount /mnt',
        ),
        cmd({ caption: 'remontar con opciones correctas', explain: [
          { token: 'compress=zstd:3', meaning: 'compresión zstd nivel 3 transparente (equilibrio CPU/espacio)' },
          { token: 'noatime', meaning: 'no registrar accesos de lectura: menos escrituras, mejor en SSD' },
          { token: 'subvol=@', meaning: 'montar el subvolumen indicado como contenido del punto de montaje' },
        ] },
          'sudo mount -o compress=zstd:3,noatime,subvol=@ /dev/nvme0n1p3 /mnt',
          'sudo mkdir -p /mnt/{boot,home,var/log}',
          'sudo mount -o compress=zstd:3,noatime,subvol=@home /dev/nvme0n1p3 /mnt/home',
          'sudo mount -o compress=zstd:3,noatime,subvol=@log /dev/nvme0n1p3 /mnt/var/log',
          'sudo mount --mkdir /dev/nvme0n1p1 /mnt/boot',
        ),
        deep('Qué es un subvolumen', 'No es una partición ni un directorio: es una unidad lógica con su propio árbol dentro del mismo filesystem. Puede snapshotearse independientemente y montarse donde quieras. El «top-level» (id 5) es la raíz de todos; al montarlo vimos @, @home y @log colgando de él, y luego los remontamos en sus sitios definitivos.'),
      ],
      expect: 'mount -l / findmnt muestra root en /mnt, ESP en /mnt/boot (y en Btrfs, home y var/log con sus subvolúmenes).',
      verify: [cmd({}, 'findmnt -R /mnt'), out('ramas esperadas', '/mnt            → nvme0n1p3 (ext4|btrfs)\n├─ /mnt/boot     → nvme0n1p1 (vfat)\n├─ /mnt/home     → nvme0n1p3[btrfs:@home]  (solo Btrfs)\n└─ /mnt/var/log  → nvme0n1p3[btrfs:@log]    (solo Btrfs)')],
      errors: [
        { symptom: 'mount: unknown filesystem type «btrfs».', fix: 'No debería ocurrir en la ISO live (incluye btrfs-progs). Verifica que escribiste bien el comando.' },
        { symptom: 'Olvidé crear algún subvolumen antes de umount.', fix: 'Remonta el top-level (sudo mount /dev/nvme0n1p3 /mnt), crea lo que falte y vuelve a desmontar.' },
      ],
    },

    /* -------------------------------- 15 Pacstrap -------------------------------- */
    {
      id: 'inst-15-pacstrap',
      title: 'Instalar el sistema base (pacstrap)',
      goal: 'Descargar e instalar kernel, firmware y herramientas mínimas directamente a /mnt.',
      importance: 'required',
      minutes: 15,
      blocks: [
        p('pacstrap usa pacman internamente para instalar paquetes con /mnt como raíz alternativa. base contiene lo mínimo para arrancar; tú decides el resto AHORA para evitar chroots posteriores.'),
        cmd({ caption: 'paquetes base + extras prácticamente universales', explain: [
          { token: '-K', meaning: 'inicializa el keyring de pacman dentro de /mnt (recomendado por la wiki)' },
          { token: 'base linux linux-firmware', meaning: 'infraestructura mínima + kernel estándar + firmware de hardware variado' },
          { token: 'base-devel', meaning: 'grupo: gcc, make, sudo, pkg-config… necesario para compilar (AUR) y administrar' },
          { token: 'intel-ucode | amd-ucode', meaning: 'microcode de CPU: parches del procesador aplicados al arrancar. ELIGE SEGÚN TU CPU' },
          { token: 'networkmanager', meaning: 'gestión de red (la usarás tras reiniciar)' },
          { token: 'vim nano', meaning: 'editores: deja uno o ambos, como prefieras' },
          { token: 'dosfstools', meaning: 'herramientas FAT: imprescindibles para mantener la ESP' },
          { token: 'man-db man-pages texinfo', meaning: 'documentación offline (man)' },
        ] },
          '# Ejemplo para CPU Intel:',
          'sudo pacstrap -K /mnt base linux linux-firmware base-devel intel-ucode networkmanager vim nano dosfstools man-db man-pages texinfo',
          '',
          '# Ejemplo para CPU AMD:',
          'sudo pacstrap -K /mnt base linux linux-firmware base-devel amd-ucode networkmanager vim nano dosfstools man-db man-pages texinfo',
        ),
        info('Elecciones del kernel', 'linux es el kernel con todas las funciones. linux-lts (kernel de soporte largo, mismo conjunto de características pero versiones más conservadoras) es una excelente alternativa de estabilidad, muy popular en servidores. Algunos instalan ambos y eligen en el bootloader.'),
        info('Si elegiste Btrfs', 'Añade btrfs-progs a la línea de pacstrap: sin él, ni fstab ni initramfs sabrán manejar el filesystem.'),
        info('Si tu GPU es NVIDIA', 'Puedes instalar nvidia o nvidia-dkms ahora o después de reiniciar (la sección GPU lo detalla). Si lo haces ahora, considera quitar el hook kms del initramfs (paso 29).'),
      ],
      expect: 'Descargas e instalación masivas terminan con un mensaje de pacman sobre «transacción completada». Tarda según tu conexión.',
      verify: [cmd({}, 'ls /mnt'), out('esperado', 'bin  boot  dev  etc  home  lib  mnt? no: /mnt YA ES la raíz nueva → ves bin boot dev etc home lib opt root srv tmp usr var')],
      errors: [
        { symptom: 'error: failed retrieving file … 404', cause: 'La base de datos local del live está algo desfasada respecto al mirror.', fix: 'Ejecuta sudo pacman -Sy en el live y relanza pacstrap. Si insiste, actualiza espejo con reflector.' },
        { symptom: 'error: required key missing from keyring.', cause: 'Keyring del entorno live caducado.', fix: 'sudo pacman-key --init && sudo pacman-key --populate archlinux && sudo pacman -Sy archlinux-keyring, y reintenta.' },
      ],
    },

    /* --------------------------------- 16 fstab ---------------------------------- */
    {
      id: 'inst-16-fstab',
      title: 'Generar fstab',
      goal: 'Registrar qué montar al arrancar, para que el sistema reconstruya tu árbol de discos en cada inicio.',
      importance: 'required',
      minutes: 5,
      blocks: [
        p('/etc/fstab declara dispositivos, puntos de montaje y opciones. genfstab genera las entradas de LO QUE ESTÉ MONTADO bajo /mnt, usando UUID (estables aunque cambies puertos SATA u orden de discos).'),
        cmd({ caption: 'generar y mostrar', explain: [
          { token: '-U', meaning: 'usar UUID en lugar de rutas de dispositivo' },
          { token: '>>', meaning: 'añade al final de /etc/fstab del nuevo sistema' },
        ] }, 'sudo genfstab -U /mnt >> /mnt/etc/fstab', 'cat /mnt/etc/fstab'),
        out('aspecto esperado (UUIDs distintos en tu máquina)', '# /dev/nvme0n1p3\nUUID=a1b2...  /       ext4  rw,relatime  0 1\n\n# /dev/nvme0n1p1\nUUID=c3d4...  /boot   vfat  rw,relatime,fmask=0072,dmask=0072  0 2\n\n# /dev/nvme0n1p2\nUUID=e5f6...  none    swap  defaults  0 0'),
        info('Las columnas de fstab', 'dispositivo · punto de montaje · tipo · opciones · dump (0) · pass (orden de fsck: 1 solo para /, 2 para otros, 0 = no comprobar).'),
      ],
      expect: 'fstab contiene entradas para root, /boot y swap (más subvolúmenes con sus opciones compress/subvol si usas Btrfs).',
      verify: [p('Confirma que NO faltan particiones que quieras automáticas (discos de datos, etc.) y que la swap aparece.')],
      errors: [
        { symptom: 'Ejecuté genfstab dos veces y hay líneas duplicadas.', fix: 'Edita /mnt/etc/fstab y borra las duplicadas. Duplicados causan avisos al arrancar.' },
        { symptom: 'fstab no menciona mi segundo disco de datos.', fix: 'genfstab solo registra lo montado bajo /mnt. Añádelo después manualmente (sección Almacenamiento).' },
      ],
    },

    /* --------------------------------- 17 Chroot --------------------------------- */
    {
      id: 'inst-17-chroot',
      title: 'Entrar en el nuevo sistema (chroot)',
      goal: 'Operar DENTRO del sistema recién instalado como si ya hubieras arrancado en él.',
      importance: 'required',
      minutes: 3,
      blocks: [
        p('arch-chroot monta los pseudo-filesystems necesarios (/dev, /proc, /sys) en /mnt y cambia la raíz del proceso actual a /mnt. Todo lo que ejecutes a partir de ahora afecta al sistema nuevo, no al live.'),
        cmd({ caption: 'entrar', explain: [{ token: 'arch-chroot', meaning: 'variante de chroot de Arch que prepara monturas, DNS y consola automáticamente' }] }, 'sudo arch-chroot /mnt'),
        out('prompt esperado', '[root@archiso /]#   ← sigues siendo root, pero ahora DENTRO de tu instalación'),
        deep('¿Qué hace realmente arch-chroot?', 'Equivalente aproximado: mount --rbind /dev /mnt/dev; mount --rbind /proc /mnt/proc; mount --rbind /sys /mnt/sys; cp DNS; chroot /mnt. El kernel sigue siendo el del live: no «arranca» tu sistema, solo ejecuta programas contra su árbol de ficheros.'),
      ],
      expect: 'El prompt cambia y comandos como cat /etc/os-release muestran Arch Linux del SISTEMA INSTALADO.',
      verify: [cmd({}, 'cat /etc/os-release'), out('esperado', 'PRETTY_NAME="Arch Linux"')],
      errors: [
        { symptom: 'arch-chroot: cannot change root directory.', cause: 'Ruta mal escrita o root no montada.', fix: 'findmnt /mnt para confirmar el montaje antes de entrar.' },
      ],
    },

    /* ------------------------------- 18 Zona horaria ----------------------------- */
    {
      id: 'inst-18-timezone',
      title: 'Configurar la zona horaria',
      goal: 'Que la hora local sea correcta y los logs tengan sentido.',
      importance: 'required',
      minutes: 3,
      blocks: [
        p('/usr/share/zoneinfo contiene todas las zonas como ficheros. Un symlink de /etc/localtime a la tuya define tu hora local. Completa Region/City con Tab para autocompletar.'),
        cmd({ caption: 'ejemplo para España (ajusta a tu zona)', explain: [
          { token: 'ln -sf', meaning: 'crea/reemplaza (-f) el symlink' },
        ] },
          'ln -sf /usr/share/zoneinfo/Europe/Madrid /etc/localtime',
        ),
        info('RTC en UTC', 'Linux interpreta el reloj de hardware como UTC. Windows lo interpreta como hora local: si mantienes dual boot con Windows, o configuras Windows para UTC (registro RealTimeIsUniversal) o aceptarás desfases al alternar sistemas. El siguiente paso sincroniza el RTC.'),
      ],
      expect: 'date muestra tu hora local correcta.',
      verify: [cmd({}, 'date'), out('ejemplo', 'Mon Aug 24 12:30:00 CEST 2026')],
      errors: [
        { symptom: 'Hora adelantada/retrasada tras reiniciar en dual boot.', fix: 'Aplica la corrección de Windows a UTC (DWORD RealTimeIsUniversal=1 en HKLM\\SYSTEM\\CurrentControlSet\\Control\\TimeZoneInformation).' },
      ],
    },

    /* ------------------------------ 19 Hardware clock ---------------------------- */
    {
      id: 'inst-19-hwclock',
      title: 'Sincronizar el reloj de hardware',
      goal: 'Escribir en el RTC de la placa la hora correcta para que cada arranque parta de ella.',
      importance: 'required',
      minutes: 2,
      blocks: [
        p('La placa base mantiene un reloj (RTC) con batería propia. Linux lo lee al arrancar y lo interpreta como UTC; con este paso lo dejamos ajustado desde el sistema ya configurado con tu zona.'),
        cmd({ caption: 'volcar hora del sistema al RTC', explain: [
          { token: 'hwclock --systohc', meaning: 'system-to-hardware-clock: escribe la hora del sistema (en UTC interno) en el RTC' },
        ] }, 'hwclock --systohc'),
        deep('Por qué UTC y no hora local', 'Con RTC en UTC, cambios de horario de verano y viajes de zona no requieren tocar la placa: solo cambia la conversión local del sistema. Es también lo que espera systemd-timedated por defecto.'),
      ],
      expect: 'Sin salida = éxito.',
      verify: [cmd({}, 'hwclock --show'), out('esperado', 'fecha/hora actual en formato RTC')],
      errors: [],
    },

    /* --------------------------------- 20 Locale --------------------------------- */
    {
      id: 'inst-20-locale',
      title: 'Configurar locale e idioma del sistema',
      goal: 'Definir idioma, formato numérico y orden alfabético de los programas.',
      importance: 'required',
      minutes: 5,
      blocks: [
        p('Los locales se compilan desde /etc/locale.gen. Recomendación práctica: activa tu locale regional (fechas, moneda) y deja en_US.UTF-8 como LANG principal: los mensajes del sistema y resultados de búsqueda serán uniformes y fáciles de googlear.'),
        cmd({ caption: 'descomentar locales en /etc/locale.gen' },
          '# Edita con vim (busca y quita # delante):',
          'vim /etc/locale.gen',
          '# Descomenta estas dos líneas como mínimo:',
          '# en_US.UTF-8 UTF-8      →  en_US.UTF-8 UTF-8',
          '# es_ES.UTF-8 UTF-8      →  es_ES.UTF-8 UTF-8   (o es_MX/es_AR… tu variante)',
        ),
        cmd({ caption: 'generar y fijar el locale por defecto', explain: [
          { token: 'locale-gen', meaning: 'compila los locales marcados' },
          { token: '/etc/locale.conf', meaning: 'locale global del sistema (lo leen todos los servicios)' },
        ] },
          'locale-gen',
          'echo "LANG=en_US.UTF-8" > /etc/locale.conf',
        ),
        tip('¿Prefieres todo en español?', 'echo "LANG=es_ES.UTF-8" > /etc/locale.conf es totalmente válido. Solo ten en cuenta que mensajes de error estarán traducidos y será algo más difícil buscar soluciones literales.'),
      ],
      expect: 'locale-gen lista los locales generados; LANG definido en /etc/locale.conf.',
      verify: [cmd({}, 'locale -a | grep -E "en_US|es_"'), out('esperado', 'en_US.utf8\nes_ES.utf8')],
      errors: [
        { symptom: 'setlocale: LC_ALL: cannot change locale.', cause: 'Definiste un LANG cuyo locale nunca se generó.', fix: 'Añádelo a /etc/locale.gen, ejecuta locale-gen otra vez.' },
      ],
    },

    /* ------------------------------- 21 Keyboard --------------------------------- */
    {
      id: 'inst-21-keymap',
      title: 'Configurar el teclado de consola',
      goal: 'Que el teclado físico produzca los caracteres correctos en las TTY (fuera del entorno gráfico).',
      importance: 'required',
      minutes: 3,
      blocks: [
        p('El layout de consola vive en /etc/vconsole.conf y lo aplica systemd en cada arranque. El layout del escritorio se configura aparte, por sesión gráfica (Wayland/X11), así que esto es la base permanente.'),
        cmd({ caption: 'layout español (ajusta: latam, fr, de…)', explain: [{ token: 'KEYMAP', meaning: 'nombre de mapa según loadkeys: es, es alt-gr dead? usa «es» o «latam» según tu teclado físico' }] },
          'echo "KEYMAP=es" > /etc/vconsole.conf',
        ),
        info('Distribuciones habituales', 'España: KEYMAP=es · Latinoamérica: KEYMAP=latam · Si no tocas nada, US QWERTY funciona siempre (la ñ no existirá en TTY).'),
      ],
      expect: 'Tras reiniciar, las TTY responden con tu distribución física.',
      verify: [cmd({}, 'cat /etc/vconsole.conf'), out('esperado', 'KEYMAP=es')],
      errors: [
        { symptom: 'En el escritorio el teclado sigue en inglés.', fix: 'Normal: cada entorno gestiona su layout (KDE/GNOME: ajustes de teclado; Hyprland: input kb_layout=es). Este paso solo cubre TTY.' },
      ],
    },

    /* -------------------------------- 22 Hostname -------------------------------- */
    {
      id: 'inst-22-hostname',
      title: 'Definir el nombre del equipo (hostname)',
      goal: 'Darle a tu máquina un nombre identificable en la red.',
      importance: 'required',
      minutes: 2,
      blocks: [
        p('El hostname identifica la máquina ante la red y en los logs. Reglas: letras/dígitos/guiones, máx. 63 por etiqueta, minúsculas recomendadas.'),
        cmd({}, 'echo "mi-arch" > /etc/hostname'),
        info('Elige bien', 'Evita espacios y caracteres raros. Algo descriptivo y único en tu red: workstation-lab, portatil-casa…'),
      ],
      expect: 'hostname devuelve mi-arch en el próximo arranque.',
      verify: [cmd({}, 'cat /etc/hostname')],
      errors: [],
    },

    /* --------------------------------- 23 hosts ---------------------------------- */
    {
      id: 'inst-23-hosts',
      title: 'Configurar /etc/hosts',
      goal: 'Resolver tu propio hostname localmente aunque falle el DNS.',
      importance: 'required',
      minutes: 3,
      blocks: [
        p('/etc/hosts es la resolución estática previa a DNS. La entrada 127.0.1.1 para tu hostname evita retrasos y errores de permisos en sudo cuando no hay red (convención heredada de Debian, útil en equipos portátiles).'),
        file('/etc/hosts — contenido final (sustituye mi-arch)', '127.0.0.1   localhost\n::1         localhost\n127.0.1.1   mi-arch.localdomain   mi-arch'),
        cmd({ caption: 'editar' }, 'vim /etc/hosts'),
      ],
      expect: 'Tres líneas presentes, hostname consistente con /etc/hostname.',
      verify: [cmd({}, 'cat /etc/hosts')],
      errors: [
        { symptom: 'sudo: unable to resolve host mi-arch', cause: 'Falta la línea 127.0.1.1.', fix: 'Añádela exactamente como arriba.' },
      ],
    },

    /* --------------------------------- 24 Root ----------------------------------- */
    {
      id: 'inst-24-root-passwd',
      title: 'Asignar contraseña de root',
      goal: 'Proteger la cuenta de superusuario.',
      importance: 'required',
      minutes: 2,
      blocks: [
        p('root es la cuenta con poder absoluto: puede hacer cualquier cosa sin preguntar. Su contraseña debe ser fuerte y distinta de la de tu usuario. Nota mental: trabajarás a diario como usuario normal con sudo; root es para emergencias/rescate.'),
        cmd({ caption: 'pedirá teclear la contraseña dos veces (invisible mientras escribes)', explain: [{ token: 'passwd root', meaning: 'cambia/establece la contraseña de la cuenta indicada' }] }, 'passwd root'),
        tip('Contraseñas fuertes', 'Larguísimas > complejísimas: cuatro palabras aleatorias superan a una corta con símbolos. Un gestor (KeePassXC) ayuda.'),
      ],
      expect: 'passwd: password updated successfully.',
      verify: [p('No hay comprobación directa (ni debería haberla). La usarás al entrar como root en TTY si algún día hace falta.')],
      errors: [
        { symptom: 'Dejé root SIN contraseña por accidente.', fix: 'passwd root de nuevo. Una cuenta root sin contraseña es una puerta abierta (aunque por TTY local solamente).' },
      ],
    },

    /* ------------------------------ 25 Crear usuario ----------------------------- */
    {
      id: 'inst-25-usuario',
      title: 'Crear tu usuario normal',
      goal: 'Una cuenta personal sin privilegios directos, en el grupo wheel para poder usar sudo.',
      importance: 'required',
      minutes: 5,
      blocks: [
        p('Trabajar día a día como root es peligroso e innecesario. Crearás un usuario normal; los privilegios se conceden puntualmente vía sudo.'),
        cmd({ caption: 'crear usuario y contraseña', explain: [
          { token: '-m', meaning: 'crea /home/tu-usuario copiando el esqueleto /etc/skel' },
          { token: '-G wheel', meaning: 'añade al grupo SUPLEMENTARIO wheel (quienes pueden sudo, lo activaremos en el paso 26)' },
          { token: '-s /bin/bash', meaning: 'shell de login; cámbiala si instalarás Zsh/Fish (puedes cambiarla luego con chsh)' },
        ] },
          'useradd -m -G wheel -s /bin/bash tu-usuario',
          'passwd tu-usuario',
        ),
        deep('¿Qué acaba de pasar?', 'useradd escribió tu usuario en /etc/passwd (campos: nombre:x:UID:GID:gecos:home:shell), creó grupo propio en /etc/group, home con plantilla de /etc/skel (.bashrc…) y passwd guardó un HASH en /etc/shadow (solo legible por root). El UID probablemente sea 1000: el primero humano del sistema.'),
      ],
      expect: 'id tu-usuario muestra uid=1000, grupos=tu-usuario,wheel.',
      verify: [cmd({}, 'id tu-usuario'), out('esperado', 'uid=1000(tu-usuario) gid=1000(tu-usuario) grupos=tu-usuario,wheel(998?) — wheel presente')],
      errors: [
        { symptom: 'useradd: existing group… o UID duplicado.', fix: 'Raro en instalación limpia; verifica con id y elige otro nombre si chocó.' },
        { symptom: 'Olvidé -G wheel.', fix: 'usermod -aG wheel tu-usuario (-a = añade SIN sobreescribir grupos).' },
      ],
    },

    /* --------------------------------- 26 sudo ------------------------------------ */
    {
      id: 'inst-26-sudo',
      title: 'Configurar sudo',
      goal: 'Permitir al grupo wheel ejecutar comandos como root con su propia contraseña.',
      importance: 'required',
      minutes: 5,
      blocks: [
        p('sudo ya viene en base-devel. Su política vive en /etc/sudoers, que SIEMPRE se edita con visudo: valida sintaxis antes de guardar y te salva de dejarte sin acceso root por un typo.'),
        cmd({ caption: 'editar sudoers de forma segura', explain: [
          { token: 'EDITOR=vim visudo', meaning: 'abre una COPIA de sudoers; al guardar valida y solo entonces instala' },
        ] }, 'EDITOR=vim visudo'),
        file('Busca y DESCOMENTA esta línea', '## Uncomment to allow members of group wheel to execute any command\n%wheel ALL=(ALL:ALL) ALL'),
        cmd({ caption: 'comprobar que funciona' }, 'su - tu-usuario', 'sudo whoami', '# teclea TU contraseña de usuario, no la de root'),
        out('esperado', 'root'),
      ],
      expect: 'sudo whoami imprime root usando tu contraseña personal.',
      verify: [cmd({}, 'sudo -l'), out('indica', '(ALL : ALL) ALL → puedes ejecutar cualquier cosa con sudo')],
      errors: [
        { symptom: 'tu-usuario is not in the sudoers file.', cause: '%wheel sigue comentado o el usuario no está en wheel.', fix: 'Revisa ambos: groups tu-usuario y la línea de sudoers.' },
        { symptom: 'visudo me avisó de error de sintaxis.', fix: 'Pulsa e para editar de nuevo y corrige. NUNCA fuerces la escritura de un sudoers inválido.' },
      ],
      alternatives: [
        p('doas (del proyecto OpenBSD) es la alternativa minimalista: menos opciones, sintaxis sencilla en /etc/doas.conf (permit :wheel). Perfectamente válida en Arch; sudo es simplemente la convención dominante.'),
      ],
    },

    /* ------------------------------ 27 Red (servicio) ---------------------------- */
    {
      id: 'inst-27-red',
      title: 'Activar NetworkManager',
      goal: 'Que el sistema tenga red automáticamente en cada arranque.',
      importance: 'required',
      minutes: 5,
      blocks: [
        p('Ya instalaste el paquete en pacstrap; falta habilitar su servicio para que systemd lo levante en el boot. El nombre de la unidad distingue mayúsculas: NetworkManager.service.'),
        cmd({ caption: 'habilitar arranque automático', explain: [
          { token: 'systemctl enable', meaning: 'crea el enlace para que la unidad arranque con el target multi-user' },
          { token: 'NetworkManager.service', meaning: 'gestor de red dinámico: DHCP, WiFi, VPN, hotspots' },
        ] }, 'systemctl enable NetworkManager.service'),
        deep('¿Qué significa enable?', 'systemd no «registra» nada en una base de datos: crea un symlink /etc/systemd/system/multi-user.target.wants/NetworkManager.service → /usr/lib/systemd/system/NetworkManager.service. Al alcanzar multi-user.target durante el boot, systemd resuelve esas dependencias y arranca la unidad. disable borra el symlink. enable --now además lo arranca ya, sin esperar al reinicio.'),
        info('Alternativas', 'iwd solo (WiFi ligero sin DHCP propio completo) o systemd-networkd (config declarativa, ideal servidores/VM). Para escritorio, NetworkManager es la opción cómoda y la integrada en applets de KDE/GNOME.'),
      ],
      expect: 'Created symlink /etc/systemd/system/multi-user.target.wants/NetworkManager.service → …',
      verify: [cmd({}, 'systemctl is-enabled NetworkManager'), out('esperado', 'enabled')],
      errors: [
        { symptom: 'Failed to enable unit: Unit NetworkManager.service does not exist', cause: 'No instalaste networkmanager en pacstrap.', fix: 'pacman -S networkmanager y repite enable.' },
        { symptom: 'Unit networkmanager.service not found.', cause: 'Minúsculas: las unidades son sensibles a mayúsculas.', fix: 'Escríbelo NetworkManager.service.' },
      ],
    },

    /* ------------------------------- 28 Bootloader -------------------------------- */
    {
      id: 'inst-28-bootloader',
      title: 'Instalar el gestor de arranque',
      goal: 'Que el firmware UEFI pueda cargar Linux: elige systemd-boot o GRUB y sigue SU rama.',
      importance: 'required',
      minutes: 15,
      blocks: [
        p('Sin bootloader, el firmware no sabe ejecutar tu kernel. Ambos candidatos son excelentes: systemd-boot es mínimo y nativo de UEFI (configuración de texto plano); GRUB es más potente (dual boot automático, temas, rescate) a cambio de más complejidad.'),
        h('Rama A — systemd-boot'),
        p('Requisitos: arranque UEFI (paso 05 ✓) y ESP montada en /boot (paso 14 ✓).'),
        cmd({ caption: 'instalar systemd-boot en la ESP', explain: [
          { token: 'bootctl install', meaning: 'copia systemd-boot en la ESP y crea la entrada NVRAM del firmware' },
        ] }, 'bootctl install'),
        file('/boot/loader/loader.conf', 'default  arch.conf\ntimeout  3\nconsole-mode keep'),
        cmd({ caption: 'obtener el PARTUUID de la raíz', explain: [{ token: 'PARTUUID', meaning: 'UUID de PARTICIÓN (GPT), estable aunque reformatees; lo usará el kernel para hallar root' }] },
          'blkid -s PARTUUID -o value /dev/nvme0n1p3',
        ),
        file('/boot/loader/entries/arch.conf — AJUSTA el PARTUUID y rootfstype', 'title   Arch Linux\nlinux   /vmlinuz-linux\ninitrd  /intel-ucode.img\ninitrd  /initramfs-linux.img\noptions root=PARTUUID=TU-PARTUUID-AQUI rw'),
        info('Variantes de esa options', 'Btrfs: añade rootflags=subvol=@ y rootfstype=btrfs. AMD: la primera línea initrd debe ser /amd-ucode.img. ¿Segundo kernel LTS? Duplica el entry con vmlinuz-linux-lts/initramfs-linux-lts.'),
        cmd({ caption: 'mantener systemd-boot actualizado automáticamente' }, 'pacman -S systemd-boot-pacman-hook'),
        h('Rama B — GRUB'),
        cmd({ caption: 'instalar GRUB para UEFI', explain: [
          { token: 'efibootmgr', meaning: 'dependencia que GRUB usa para registrarse en la NVRAM del firmware' },
          { token: '--target=x86_64-efi', meaning: 'instalación UEFI de 64 bits' },
          { token: '--efi-directory=/boot', meaning: 'dónde está la ESP montada' },
          { token: '--bootloader-id=GRUB', meaning: 'nombre de la carpeta/entrada que verá el firmware' },
        ] },
          'pacman -S grub efibootmgr os-prober',
          'grub-install --target=x86_64-efi --efi-directory=/boot --bootloader-id=GRUB',
        ),
        cmd({ caption: 'generar grub.cfg', explain: [
          { token: 'grub-mkconfig', meaning: 'escanea kernels (incluye microcode automáticamente) y escribe la configuración' },
        ] }, 'grub-mkconfig -o /boot/grub/grub.cfg'),
        info('Dual boot con GRUB', 'os-prober detecta Windows/otras distros. Si no aparecen: edita /etc/default/grub, añade GRUB_DISABLE_OS_PROBER=false, y regenera con grub-mkconfig. Tras CUALQUIER cambio en /etc/default/grub debes regenerar grub.cfg.'),
        warn('Solo una rama', 'Instala UNO de los dos. Instalar ambos es posible pero innecesario: tendrías menús encadenados y confusión.'),
      ],
      expect: 'systemd-boot: bootctl status muestra «Product: systemd-boot» con tu entry default. GRUB: Installation finished sin errores y grub.cfg generado.',
      verify: [
        cmd({ caption: 'systemd-boot' }, 'bootctl list'),
        cmd({ caption: 'GRUB' }, 'ls /boot/grub/grub.cfg && efibootmgr | grep -i grub'),
      ],
      errors: [
        { symptom: 'EFI variables are not supported on this system.', cause: 'Arrancaste en modo BIOS (paso 05 ignorado) o efivarfs no montado.', fix: 'Si insistes en BIOS: grub-install --target=i386-pc /dev/nvme0n1 (¡disco, no partición!). Lo correcto: reiniciar en modo UEFI y seguir la rama UEFI.' },
        { symptom: 'systemd-boot no aparece en el menú del firmware.', fix: 'Comprueba efibootmgr (debe listar Linux Boot Manager); si el firmware oculta entradas, elige la entrada desde el menú de arranque F8-F12. Verifica que la ESP está en /boot, no en /boot/efi.' },
        { symptom: 'Kernel panic: not syncing: VFS: Unable to mount root fs', cause: 'PARTUUID erróneo en options (systemd-boot) o root mal pasada (GRUB).', fix: 'Arranca de nuevo el live, chroot, verifica blkid y corrige la línea options / regenera config.' },
      ],
    },

    /* ------------------------------- 29 initramfs --------------------------------- */
    {
      id: 'inst-29-initramfs',
      title: 'Initramfs: cuándo regenerarlo',
      goal: 'Entender para qué sirve y saber regenerarlo cuando cambien módulos, hooks o drivers.',
      importance: 'recommended',
      minutes: 10,
      blocks: [
        p('El initramfs es un mini sistema en RAM que carga el kernel al arrancar: contiene los módulos y scripts necesarios para ENCONTRAR tu raíz real (drivers de disco, soporte de filesystem, desencriptado LUKS…) y luego entregarle el control al sistema verdadero (switch_root).'),
        p('pacstrap ya generó el initramfs por defecto (hooks base udev autodetect microcode kms filesystems). Solo REGENERARÁS cuando cambies algo relevante:'),
        ul(
          'Instalaste el driver propietario NVIDIA → valora quitar kms de HOOKS (evita cargar nouveau en el initramfs).',
          'Añadiste cifrado LUKS → hooks encrypt (tema avanzado, wiki dm-crypt).',
          'Cambios en MODULES= o en BINARIES= de /etc/mkinitcpio.conf.',
          'Cambiaste de kernel o de preset.',
        ),
        file('/etc/mkinitcpio.conf — las líneas que importan', 'MODULES=()          # módulos forzados SIEMPRE (vacío = autodetect decide)\nHOOKS=(base udev autodetect microcode modconf kms keyboard keymap consolefont block filesystems fsck)\nCOMPRESSION="zstd"  # compresión de la imagen'),
        cmd({ caption: 'regenerar para todos los presets', explain: [
          { token: '-P', meaning: 'todos los presets (linux, linux-lts…) definidos en /etc/mkinitcpio.d/' },
        ] }, 'mkinitcpio -P'),
        deep('Orden de HOOKS = orden de ejecución', 'block debe ir antes de filesystems (primero aparecen los discos, luego se reconocen filesystems). microcode antecede al resto para aplicar el parche de CPU cuanto antes. kms mete drivers de GPU en el initramfs para un KMS temprano (logo/brightness correctos) — con NVIDIA propietario suele retirarse porque nouveau entraría en conflicto.'),
        tip('¿Rompo algo si regenero mal?', 'Guarda siempre una vía de rescate: el USB de instalación te permite chroot (paso 17) y regenerar de nuevo. Es el botón de deshacer definitivo.'),
      ],
      expect: 'mkinitcpio termina listando la imagen generada (p. ej. /boot/initramfs-linux.img) sin errores.',
      verify: [cmd({}, 'ls -lh /boot/*.img'), out('esperado', 'initramfs-linux.img (y fallback) presentes y recientes')],
      errors: [
        { symptom: 'WARNING: Possibly missing firmware for module … (ast, xhci_pci…)', fix: 'Aviso benigno para hardware que no tienes. Se silencia instalando los paquetes de firmware correspondientes si te molesta.' },
        { symptom: 'ERROR: Hook not found.', fix: 'Typo en HOOKS. Corrige y regenera.' },
      ],
    },

    /* -------------------------------- 30 Reiniciar -------------------------------- */
    {
      id: 'inst-30-reiniciar',
      title: 'Salir y reiniciar',
      goal: 'Abandonar el entorno live limpiamente y arrancar tu sistema por primera vez.',
      importance: 'required',
      minutes: 5,
      blocks: [
        p('Desmontar ordenadamente evita escrituras pendientes perdidas. Luego retira el USB cuando el firmware empiece a reiniciar (o antes de que vuelva a arrancar desde él).'),
        cmd({ caption: 'secuencia completa', explain: [
          { token: 'exit', meaning: 'sales del chroot de vuelta al live' },
          { token: 'umount -R /mnt', meaning: 'desmonta recursivamente todo el árbol de /mnt' },
          { token: 'reboot now', meaning: 'reinicia inmediatamente' },
        ] },
          'exit',
          'umount -R /mnt',
          'reboot now',
        ),
        tip('Si umount dice target is busy', 'Algo (un shell en /mnt, un editor) usa el árbol: cd fuera y cierra sesiones, reintenta. reboot funciona igualmente: systemd sincroniza y desmonta al reiniciar.'),
      ],
      expect: 'El equipo reinicia, aparece systemd-boot/GRUB, arranca Arch y llega a un login de texto: mi-arch login:',
      verify: [p('Inicia sesión como tu-usuario con su contraseña. Si llega al prompt $, ¡el sistema base está vivo!')],
      errors: [
        { symptom: 'Vuelve a arrancar el instalador.', fix: 'Retira el USB en cuanto desaparezca el logo del firmware; ajusta el orden de arranque si el firmware prioriza USB.' },
        { symptom: 'Pantalla negra tras el menú del bootloader.', cause: 'GPU sin KMS temprano (frecuente en NVIDIA).', fix: 'Añade parámetro nomodeset TEMPORAL (edición en el bootloader) para llegar a TTY, y soluciona drivers con la sección GPU / Solución de problemas → Pantalla negra.' },
        { symptom: 'No arranca nada / GRUB rescue.', fix: 'Arranca el live de nuevo, monta (pasos 14→17) y repara: reinstala bootloader o corrige config. Sección Solución de problemas → Arch no arranca.' },
      ],
    },

    /* ------------------------------- 31 Primer inicio ----------------------------- */
    {
      id: 'inst-31-primer-inicio',
      title: 'Primer inicio: validación',
      goal: 'Confirmar que el sistema está sano: red, reloj, servicios y sin unidades caídas.',
      importance: 'required',
      minutes: 10,
      blocks: [
        p('Antes de instalar nada bonito, cinco comprobaciones rápidas que validan la instalación entera. Todas están detalladas en el Comprobador de estado.'),
        cmd({ caption: 'actualizar índices y sistema completo', explain: [
          { token: '-Syu', meaning: 'SIEMPRE full upgrade: -Sy a secas provocaría partial upgrade (roto en Arch)' },
        ] }, 'sudo pacman -Syu'),
        cmd({ caption: 'validaciones básicas' },
          'ip addr                      # interfaz con IP asignada',
          'ping -c 3 archlinux.org      # DNS + salida a Internet',
          'systemctl --failed           # debe listar 0 loaded units listed',
          'journalctl -p 3 -xb          # solo errores del arranque actual (vacío o casi)',
          'free -h && df -h /           # memoria y espacio en raíz con sentido',
        ),
        out('systemctl --failed ideal', '0 loaded units listed. Pass to show all installed units on system.'),
        tip('Siguiente parada natural', 'Configuración básica (espejos, zram, TRIM) → Usuarios y permisos si quieres repasar sudo/grupos → Pacman para dominar el gestor. El Builder te genera la ruta completa según tu equipo.'),
      ],
      expect: 'Sistema actualizado, red operativa, cero unidades fallidas y journal sin errores graves.',
      verify: [
        cmd({}, 'systemctl status NetworkManager --no-pager'),
        out('esperado', 'Active: active (running) — verde, desde el último arranque'),
      ],
      errors: [
        { symptom: 'Sin red tras reiniciar.', fix: 'nmcli device status; si no hay conexión: nmcli device wifi connect SSID password "pass". Detalles en sección Red.' },
        { symptom: 'systemctl --failed muestra unidades caídas.', fix: 'systemctl status unidad-caída para el motivo; muchas veces son servicios opcionales sin hardware (bluetooth sin adaptador). Deshabilita lo que no uses.' },
      ],
    },
  ],
}