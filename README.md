# ArchForge

**Entorno de aprendizaje interactivo para aprender Arch Linux desde cero mediante guias, laboratorios, ejercicios y una terminal Linux real.**

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Demo

**[https://arturucs023.github.io/archforge/](https://arturucs023.github.io/archforge/)**

Publicado automaticamente con GitHub Actions en cada `push` a `main` (ver [Despliegue](#despliegue)).

---

## Caracteristicas

- **Guias de instalacion completas** -- 31 pasos desde la ISO hasta el primer arranque, explicando que se hace, por que y que cambia en el sistema
- **Arch Builder** -- Configurador que genera una ruta personalizada segun tu hardware, filesystem, bootloader y entorno grafico
- **Comparadores de decisiones** -- ext4 vs Btrfs, GRUB vs systemd-boot, KDE vs GNOME, Wayland vs X11, Bash vs Zsh vs Fish
- **Solucion de problemas** -- 50+ problemas comunes con sintomas, causas, diagnostico y soluciones paso a paso
- **Comprobador de estado** -- Guia para interpretar la salida de comandos como `lsblk`, `ip addr`, `systemctl status` o `lspci -k`
- **Curso de Bash** -- 6 modulos progresivos con proyectos praticos
- **Terminal simulada (sandbox)** -- Linux aislado en el navegador para practicar sin riesgo
- **Laboratorio VM real** -- Terminal xterm.js conectada via SSH a una VM Alpine Linux via QEMU
- **Laboratorio VM en el navegador** -- Alpine Linux real emulado con v86 (WebAssembly), sin servidor: funciona tambien en GitHub Pages
- **Aprendizaje por niveles** -- Explicaciones adaptadas a principiante, intermedio o experto
- **Dashboard y progreso** -- Ruta visual, pasos completados, tiempo estimado y racha de aprendizaje
- **Buscador global** -- Encuentra comandos, paquetes, tutoriales y conceptos

---

## Stack tecnologico

| Capa | Tecnologia |
|------|------------|
| Frontend | React 18, TypeScript, Vite 5 |
| Estilos | TailwindCSS 3 |
| Terminal | xterm.js (sandbox y VM real) |
| Backend VM | Node.js, WebSocket (ws), SSH2 |
| VM | QEMU + Alpine Linux |
| Almacenamiento | localStorage |

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

1. El usuario escribe comandos en xterm.js (browser)
2. Los datos viajan por WebSocket al servidor Node.js
3. El servidor los reenvia por SSH a la VM QEMU
4. La salida viaja en sentido contrario hasta renderizarse en el terminal

El frontend funciona de forma independiente (sin VM) para la mayoria de funcionalidades. La VM solo es necesaria para el laboratorio de comandos reales.

---

## Requisitos

- [Node.js](https://nodejs.org/) 18+
- npm 9+
- **Opcional (para VM real):** [QEMU](https://www.qemu.org/download/) instalado y en PATH

---

## Inicio rapido

### Solo frontend

```bash
git clone https://github.com/arturucs023/archforge.git
cd archforge
npm install
npm run dev
```

Abre `http://localhost:5173`.

### Con laboratorio VM

Requiere QEMU y los recursos de la VM proporcionados en la seccion de Releases.

```bash
npm install
npm start
```

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

### Recursos de la VM

Las imagenes de la maquina virtual no se almacenan en el repositorio por su tamano. Se distribuyen mediante **GitHub Releases**.

Para utilizar el laboratorio VM real:

1. Descarga los archivos de la ultima [Release](https://github.com/arturucs023/archforge/releases)
2. Colocalos en la carpeta `vm/`

```text
vm/
├── base.qcow2              # Disco base (descargar de Releases)
├── build/                  # Logs generados (NO subir a Git)
└── runtime/                # Archivos temporales de ejecucion (NO subir a Git)
```

| Archivo | Origen | En Git |
|---------|--------|--------|
| `base.qcow2` | Releases | No |
| `build/` | Generado localmente | No |
| `runtime/` | Generado localmente | No |
| `*.qcow2` (overlay) | Generado localmente | No |

**Nota:** Si solo quieres usar la terminal simulada (sandbox) o el contenido de las guias, no necesitas descargar nada de Releases. La VM es opcional.

---

## Scripts

| Comando | Descripcion |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo con hot reload |
| `npm run build` | Compila TypeScript y genera la version de produccion en `dist/` |
| `npm run serve` | Sirve la version de produccion en `http://127.0.0.1:4173` |
| `npm start` | Build + lanza backend VM + frontend en produccion |
| `npm run vm` | Lanza solo el servidor VM (requiere QEMU) |
| `npm run dev:vm` | Desarrollo con servidor VM en paralelo |
| `npm run serve:pages` | Compila y sirve `dist/` en un subdirectorio, simulando GitHub Pages (soporta Range) |
| `npm run setup:vm-web` | Descarga la ISO de Alpine, los BIOS y el `.wasm` de v86 a `public/vm/` |

---

## Despliegue

El sitio se publica en GitHub Pages mediante `.github/workflows/deploy.yml`.

1. En el repo, ve a **Settings → Pages → Build and deployment**
2. En **Source**, selecciona **GitHub Actions**
3. Haz `push` a `main`: el workflow compila y publica automaticamente

La app usa **enrutado por hash** (`#/ruta`), asi que no necesita reglas de
reescritura en el servidor: cada ruta resuelve siempre al `index.html`.
Los assets se emiten con ruta relativa (`base: './'` en `vite.config.ts`), lo
que permite servir la build tanto en la raiz de un dominio como en el
subdirectorio `/archforge/`.

### Lo que NO funciona en el sitio publicado

El **laboratorio VM** tiene dos modos, según dónde se abra ArchForge:

| | Local (`localhost`) | Web (GitHub Pages) |
|---|---|---|
| Emulador | QEMU + SSH en `server/vm-server.mjs` | v86 (WebAssembly) en el navegador |
| Imagen | `vm/base.qcow2` (release v1.0.0) | ISO de Alpine 3.24 (i386) |
| Persistencia | Sí — capa overlay | No — efímero, se reinicia al recargar |
| Requisito | Node + QEMU + imagen | Solo el navegador |

En la web la VM **sí funciona**: el emulador v86 corre un x86 completo en
WebAssembly y arranca Alpine de verdad. Los comandos son reales; lo que no
hay es servidor Node detrás ni persistencia entre recargas.

Detalle técnico: la ISO debe ser de **32 bits (x86)**. v86 no emula las
extensiones de 64 bits, así que una imagen `x86_64` se detiene con
`This kernel requires an x86-64 CPU, but only detected an i686 CPU`.

Los recursos del laboratorio en web (~51 MB) no están en el repo: los baja el
build con `npm run setup:vm-web`, que descarga la ISO, los BIOS y copia el
`.wasm` del emulador a `public/vm/`.

### Internet en la VM (versión web)

v86 no sale a internet por sí solo: necesita un proxy que traduzca las tramas de la NIC
emulada a WebSocket. Hay un interruptor en la página `#/vm` que lo activa antes de arrancar.

Por defecto usa el relay público `wss://relay.widgetry.org/` (el que aparece en la
documentación de v86), así que no hay nada que desplegar. **El tráfico sale por un servidor
de terceros y tiene ancho de banda limitado**: sirve para practicar `apk`, no para datos
personales.

Para un despliegue propio, monta un relay y cambia `RELAY_URL` en
`src/components/VmBrowserLab.tsx`:

```bash
# en el VPS
docker run -d --name relay --privileged --net=host \
  ghcr.io/gdm85/websockproxy:latest --net=tap --mac 52:54:00:12:34:56
```

```ts
const RELAY_URL = 'wss://tu-servidor.example/relay'
```

Alternativas de red documentadas en
[`docs/networking.md` de v86](https://github.com/copy/v86/blob/master/docs/networking.md):
`wisp` (TCP completo vía WISP) o `fetch` (solo HTTP, necesita CORS proxy).

### Probar el laboratorio VM sin publicarlo

```bash
npm run setup:vm-web   # descarga ISO + BIOS + wasm en public/vm/
npm run serve:pages    # simula GitHub Pages en http://127.0.0.1:8080/archforge/
node tools/test-vm-boot.mjs   # arranca Alpine en Node y comprueba el login
```

### Probar la build como Pages

```bash
npm run serve:pages
```

Levanta `dist/` en `http://127.0.0.1:8080/archforge/`, reproduciendo el
subdirectorio y las rutas relativas del despliegue real.

---

## Estructura del proyecto

```
archforge/
├── src/          # Frontend React
├── server/       # Backend y servidor de la VM
├── vm/           # Recursos de la VM (no incluidos en Git)
│   ├── base.qcow2           # Descargar de Releases
│   ├── build/               # Logs (generado localmente)
│   └── runtime/             # Temporales (generado localmente)
├── tools/        # Herramientas auxiliares
├── qa/           # Tests
└── script/       # Scripts de ejecucion
```

---

## Seguridad

El laboratorio VM esta disenado como un entorno aislado y efimero para practicas educativas.

- La VM utiliza red aislada con SSH forwarding
- Las sesiones pueden restablecerse completamente
- Los cambios realizados durante una sesion no afectan el sistema anfitrion
- No se recomienda almacenar informacion personal o sensible en la VM

---

## Guardado de progreso

- Todo se guarda en `localStorage` del navegador
- No hay backend ni cuenta de usuario
- Opciones de export/import para migrar entre navegadores
- Borrar datos del navegador = borrar progreso

---

## Estado del proyecto

**ArchForge v1.0 -- Development**

El proyecto se encuentra actualmente en desarrollo activo.

### Implementado

- Guias de instalacion (31 pasos)
- Arch Builder con ruta personalizada
- Comparadores de decisiones
- Solucion de problemas (50+ problemas)
- Comprobador de estado
- Terminal simulada (sandbox)
- Laboratorio Linux real con QEMU + SSH
- Curso de Bash (6 modulos)
- Cursos de servidores
- Sistema de progreso con localStorage
- Buscador global

### Proximamente

- Mas contenido de secciones
- Mas laboratorios CLI
- Mas cursos de servidores
- Mejoras del laboratorio VM

---

## License

This project is licensed under the MIT License.
See the [LICENSE](LICENSE) file for details.
