# ArchForge

**Guia interactiva completa para instalar, configurar, personalizar y mantener Arch Linux desde cero.**

No es una wiki tradicional. Es un entorno de aprendizaje interactivo disenado para ensenar Arch Linux mediante explicaciones, decisiones, ejercicios y laboratorios praticos.

---

## Caracteristicas principales

### Guias de instalacion completas
- 31 pasos documentados desde descargar la ISO hasta el primer arranque
- Cada paso incluye: que se hace, por que, que significa el comando, que cambia en el sistema, como verificarlo, errores frecuentes y alternativas
- Crear USB, UEFI, particionado, pacstrap, fstab, chroot, bootloader, locale, usuarios, red

### Arch Builder
- Configurador personalizado que genera una ruta de instalacion segun tus elecciones
- Hardware (NVIDIA/AMD/Intel), filesystem (ext4/Btrfs), bootloader, entorno grafico, shell, uso principal
- Genera una guia paso a paso adaptada a tu configuracion, sin pasos irrelevantes

### Comparadores de decisiones
- ext4 vs Btrfs, GRUB vs systemd-boot, KDE vs GNOME, Wayland vs X11, Bash vs Zsh vs Fish, y mas
- Dificultad, ventajas, desventajas, rendimiento, compatibilidad, mantenimiento, recomendacion

### Comandos interactivos
- Bloques de comandos con boton **Copiar** que nunca copia los prefijos `$` o `#`
- Modo Usuario normal / Root conmutable
- Explicacion visual de cada flag de comandos importantes (pacman -Syu, etc.)
- Comandos multilínea y comentarios gestionados correctamente
- Bloques de output, warning, info, tip y danger

### Comprobador de estado
- Guia educativa para interpretar la salida de comandos de diagnostico
- `lsblk`, `ip addr`, `uname -r`, `lspci -k`, `systemctl status`, `df -h`, `free -h` y mas
- Explica que hace el comando, que informacion devuelve, que deberia aparecer y como interpretarla

### Solucion de problemas
- Buscador de problemas: "No tengo Internet", "NVIDIA no funciona", "Hyprland no inicia", "GRUB no aparece", etc.
- Cada problema: sintomas, causas, diagnostico, comandos, solucion, alternativas y comprobacion final

### Curso de Bash
- 6 modulos progresivos con proyectos praticos
- Desde fundamentos hasta scripting avanzado

### Laboratorios CLI
- Terminal Linux simulada en el navegador (sandbox aislado)
- Laboratorios validados paso a paso con comandos reales
- Filesystem virtual, permisos, pipes, redirecciones, grep/sed/awk

### Linux real (VM)
- Terminal xterm.js conectada via SSH a una VM Alpine Linux real mediante QEMU
- Comandos reales en un entorno aislado y efimero
- Opcion de restablecer (borra todos los cambios de la sesion)

### Aprendizaje por niveles
- Principiante: explicaciones claras y directas
- Intermedio: detalles tecnicos adicionales
- Experto: que ocurre internamente en Linux (systemd, kernel, VFS, syscalls)

### Dashboard y progreso
- Ruta visual de progreso: ISO -> Sistema base -> Red -> Drivers -> Entorno grafico -> Personalizacion
- Pasos completados, porcentaje, nivel, tiempo estimado, racha de aprendizaje
- Guardado automatico en localStorage con export/import

---

## Stack tecnologico

| Capa | Tecnologia |
|------|------------|
| Frontend | React 18, TypeScript, Vite 5 |
| Estilos | TailwindCSS 3 |
| Iconos | lucide-react |
| Terminal virtual | xterm.js (sandbox) |
| Terminal real | xterm.js + WebSocket + SSH2 + QEMU |
| Backend VM | Node.js, ws, ssh2 |
| Almacenamiento | localStorage |
| Enrutamiento | Hash router personalizado |

---

## Arquitectura

ArchForge esta compuesto por un frontend React y un servidor Node.js que proporciona acceso a una maquina virtual Linux mediante WebSocket y SSH.

```text
┌─────────────────────────────┐
│          Browser            │
│                             │
│  React + TypeScript         │
│  TailwindCSS                │
│  xterm.js (sandbox + VM)    │
└──────────────┬──────────────┘
               │ WebSocket
               ▼
┌─────────────────────────────┐
│       Node.js VM Server     │
│                             │
│  HTTP (API status)          │
│  WebSocket (terminal)       │
│  SSH2 (conexion a VM)       │
└──────────────┬──────────────┘
               │ SSH (puerto 2222)
               ▼
┌─────────────────────────────┐
│          QEMU VM            │
│                             │
│       Alpine Linux          │
│  (entorno aislado y real)   │
└─────────────────────────────┘
```

**Flujo de datos:**

1. El usuario escribe comandos en xterm.js (browser)
2. Los datos viajan por WebSocket al servidor Node.js
3. El servidor los reenvia por SSH a la VM QEMU
4. La salida viaja en sentido contrario hasta renderizarse en el terminal

El frontend funciona de forma independiente (sin VM) para la mayoria de funcionalidades. La VM solo es necesaria para el laboratorio de comandos reales.

---

## Requisitos previos

- [Node.js](https://nodejs.org/) 18+ (recomendado 20+)
- npm 9+
- **Opcional (para VM real):** [QEMU](https://www.qemu.org/download/) instalado y en PATH

---

## Instalacion

```bash
# 1. Clonar el repositorio
git clone https://github.com/arturucs023/archforge.git
cd archforge

# 2. Instalar dependencias
npm install

# 3. Arrancar en modo desarrollo
npm run dev
```

El servidor de desarrollo arranca en `http://localhost:5173/`.

---

## Scripts disponibles

| Comando | Descripcion |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo con hot reload |
| `npm run build` | Compila TypeScript y genera la version de produccion en `dist/` |
| `npm run serve` | Sirve la version de produccion en `http://127.0.0.1:4173` |
| `npm start` | Build + lanza backend VM + frontend en produccion |
| `npm run vm` | Lanza solo el servidor VM (requiere QEMU) |
| `npm run dev:vm` | Desarrollo con servidor VM en paralelo |

---

## Estructura del proyecto

```
archforge/
├── index.html                  # Entry point HTML
├── vite.config.ts              # Configuracion de Vite
├── tailwind.config.js          # Configuracion de TailwindCSS
├── tsconfig.json               # Configuracion de TypeScript
├── package.json                # Dependencias y scripts
│
├── server/
│   └── vm-server.mjs           # Backend VM: HTTP + WebSocket + SSH -> QEMU
│
├── script/
│   └── start.mjs               # Script de inicio (build + VM + preview)
│
├── vm/
│   ├── alpine-virt-*.iso       # ISO de Alpine Linux para la VM
│   ├── base.qcow2              # Disco base de la VM
│   ├── build/                  # Logs del servidor
│   └── runtime/                # Overlay y PID de la sesion actual
│
├── src/
│   ├── main.tsx                # Entry point de React
│   ├── App.tsx                 # Router principal
│   ├── index.css               # Estilos globales y variables CSS
│   ├── types.ts                # Tipos TypeScript del dominio
│   │
│   ├── context/
│   │   └── AppContext.tsx       # Estado global + localStorage
│   │
│   ├── lib/
│   │   ├── router.ts           # Hash router
│   │   ├── utils.ts            # Utilidades (cn, copyToClipboard, etc.)
│   │   ├── accent.ts           # Sistema de acentos colormaticos
│   │   ├── theme.ts            # Tema oscuro/claro
│   │   ├── cursor.ts           # Cursor personalizado
│   │   ├── streak.ts           # Racha de aprendizaje
│   │   └── progress.ts         # Logica de progreso
│   │
│   ├── data/
│   │   ├── sections.ts         # Metadata de todas las secciones
│   │   ├── registry.ts         # Registro y contadores
│   │   ├── content/            # Contenido de cada seccion (10 archivos)
│   │   │   ├── fundamentals.ts
│   │   │   ├── installation.ts
│   │   │   ├── packages.ts
│   │   │   ├── systemCore.ts
│   │   │   ├── desktops.ts
│   │   │   ├── shells.ts
│   │   │   ├── tools.ts
│   │   │   ├── devopsGaming.ts
│   │   │   ├── maintenance.ts
│   │   │   └── expert.ts
│   │   ├── comparisons.ts      # Comparadores (ext4 vs Btrfs, etc.)
│   │   ├── troubleshooting.ts  # Solucion de problemas (50+ problemas)
│   │   ├── troubleshooting-*.ts
│   │   ├── statusChecks.ts     # Comprobador de estado
│   │   ├── builderLogic.ts     # Logica del Arch Builder
│   │   ├── wizardTrees.ts      # Arboles de decision del wizard
│   │   ├── learnData.ts        # Conceptos de aprendizaje
│   │   ├── glossary.ts         # Glosario
│   │   ├── helpers.ts          # Helpers de construccion de bloques
│   │   ├── bashcourse/         # Curso de Bash (6 modulos)
│   │   ├── cmdcenter/          # Centro de comandos
│   │   └── servers/            # Cursos de servidores
│   │
│   ├── components/             # Componentes reutilizables (23)
│   │   ├── Layout.tsx          # Layout principal con sidebar
│   │   ├── Sidebar.tsx         # Navegacion lateral
│   │   ├── Topbar.tsx          # Barra superior
│   │   ├── Breadcrumbs.tsx     # Migas de pan + page headers
│   │   ├── CommandBlock.tsx    # Bloques de comandos con Copiar
│   │   ├── CommandBreakdown.tsx # Explicacion visual de flags
│   │   ├── CommandCard.tsx     # Tarjeta de comandos
│   │   ├── StepCard.tsx        # Tarjeta de pasos
│   │   ├── Callout.tsx         # Bloques info/warning/danger
│   │   ├── FileBlock.tsx       # Bloques de archivos de config
│   │   ├── Quiz.tsx            # Quizzes interactivos
│   │   ├── Exercise.tsx        # Ejercicios praticos
│   │   ├── SearchModal.tsx     # Buscador global
│   │   ├── VirtualTerminal.tsx # Terminal simulada (sandbox)
│   │   ├── ProgressBar.tsx     # Barras de progreso
│   │   ├── Wizard.tsx          # Wizard de decisiones
│   │   ├── Tooltip.tsx         # Tooltips
│   │   ├── Badge.tsx           # Badges/etiquetas
│   │   └── ...
│   │
│   └── pages/                  # Paginas (14)
│       ├── HomePage.tsx        # Landing page principal
│       ├── Dashboard.tsx       # Dashboard de progreso
│       ├── SectionPage.tsx     # Pagina de secciones de contenido
│       ├── BuilderPage.tsx     # Arch Builder
│       ├── ComparePage.tsx     # Comparadores
│       ├── StatusCheckerPage.tsx # Comprobador de estado
│       ├── TroubleshootingPage.tsx # Solucion de problemas
│       ├── CommandCenterPage.tsx # Centro de comandos
│       ├── BashCoursePage.tsx  # Curso de Bash
│       ├── TerminalPage.tsx    # Terminal simulada
│       ├── LearnPage.tsx       # Aprendizaje de conceptos
│       ├── ServersPage.tsx     # Cursos de servidores
│       ├── VMLabPage.tsx       # Laboratorio VM real
│       └── SettingsPage.tsx    # Configuracion
│
└── dist/                       # Build de produccion (generado)
```

---

## Modo de desarrollo vs produccion

### Desarrollo (`npm run dev`)
- Hot reload instantaneo
- Sin build
- Mas rapido para iterar

### Produccion (`npm start`)
- Compila TypeScript
- Genera bundle optimizado en `dist/`
- Lanza el servidor VM en background (si QEMU esta disponible)
- Abre `http://127.0.0.1:4173` en el navegador

---

## Laboratorio VM real

La VM usa QEMU para ejecutar Alpine Linux de forma aislada:

1. `vm-server.mjs` levanta un servidor HTTP + WebSocket en puerto 7860
2. Arranca una VM QEMU con SSH forwarding (puerto 2222)
3. La pagina `/vm` conecta xterm.js via WebSocket al servidor
4. El usuario escribe comandos que viajan: xterm.js -> WebSocket -> SSH -> VM

**Si QEMU no esta instalado**, el servidor HTTP funciona normalmente pero la VM mostrara un aviso con instrucciones de instalacion. La CLI educativa (sandbox) sigue disponible.

### Instalar QEMU

```bash
# Windows
winget install SoftwareFreedomConservancy.QEMU

# Debian/Ubuntu
sudo apt install qemu-system-x86

# Arch Linux
sudo pacman -S qemu-full
```

---

## Guardado de progreso

- Todo se guarda en `localStorage` del navegador
- No hay backend ni cuenta de usuario
- Opciones de export/import para migrar entre navegadores
- Borrar datos del navegador = borrar progreso

---

## Responsive

La aplicacion funciona en:
- Escritorio (1280px+)
- Tablet (768px+)
- Movil (320px+)

---

## Tema

- Modo oscuro como tema principal
- Variables CSS para colores semanticos (ink, zinc, sky, emerald, etc.)
- Paleta de acentos conmutable
- Tipografia monoespaciada para comandos (JetBrains Mono)
- Animaciones sutiles (fade-in, scale-in)

---

## Estado del proyecto

ArchForge se encuentra actualmente en desarrollo activo.

### Completado

- [x] Guias de instalacion (31 pasos)
- [x] Arch Builder con ruta personalizada
- [x] Comparadores de decisiones
- [x] Solucion de problemas (50+ problemas)
- [x] Comprobador de estado
- [x] Curso de Bash (6 modulos)
- [x] Terminal simulada (sandbox)
- [x] Laboratorio VM real (QEMU + SSH)
- [x] Sistema de progreso con localStorage
- [x] Buscador global
- [x] Modo de aprendizaje por niveles (principiante/intermedio/experto)
- [x] Tema oscuro/claro
- [x] Responsive

### En desarrollo

- [ ] Contenido de secciones restantes
- [ ] Mas laboratorios CLI
- [ ] Mas cursos de servidores

---

## License

This project is licensed under the MIT License.
See the [LICENSE](LICENSE) file for details.
