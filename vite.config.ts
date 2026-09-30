import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Rutas relativas: el mismo build sirve en la raiz de un dominio y en el
  // subdirectorio /archforge/ de GitHub Pages.
  base: './',
  // v86 trae su .wasm dentro de node_modules y lo carga por URL en tiempo de
  // ejecucion. Hay que excribirlo como recurso para que el fetch no lo procese
  // Vite como si fuera un modulo mas.
  assetsInclude: ['**/*.wasm'],
  // El emulador es un fichero grande que solo se usa bajo demanda: subir el
  // limite de warning evita ruido, pero mantenemos el aviso por si crece.
  build: {
    chunkSizeWarningLimit: 1200,
  },
})