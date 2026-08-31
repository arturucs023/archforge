/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'Cascadia Code',
          'Fira Code',
          'ui-monospace',
          'SF Mono',
          'Consolas',
          'monospace',
        ],
      },
      colors: {
        /* Neutras estructurales vía variables: el tema claro las invierte
           desde index.css ([data-theme='light']) sin tocar componentes. */
        ink: {
          950: 'rgb(var(--af-ink-950) / <alpha-value>)',
          900: 'rgb(var(--af-ink-900) / <alpha-value>)',
          850: 'rgb(var(--af-ink-850) / <alpha-value>)',
          800: 'rgb(var(--af-ink-800) / <alpha-value>)',
          700: 'rgb(var(--af-ink-700) / <alpha-value>)',
          600: 'rgb(var(--af-ink-600) / <alpha-value>)',
        },
        zinc: {
          50: 'rgb(var(--af-zinc-50) / <alpha-value>)',
          100: 'rgb(var(--af-zinc-100) / <alpha-value>)',
          200: 'rgb(var(--af-zinc-200) / <alpha-value>)',
          300: 'rgb(var(--af-zinc-300) / <alpha-value>)',
          400: 'rgb(var(--af-zinc-400) / <alpha-value>)',
          500: 'rgb(var(--af-zinc-500) / <alpha-value>)',
          600: 'rgb(var(--af-zinc-600) / <alpha-value>)',
          700: 'rgb(var(--af-zinc-700) / <alpha-value>)',
          800: 'rgb(var(--af-zinc-800) / <alpha-value>)',
          900: 'rgb(var(--af-zinc-900) / <alpha-value>)',
        },
        /* Paletas cromáticas SEMÁNTICAS: también vía variables para poder
           oscurecer sus tonos claros (texto -200/-300/-400) en tema claro
           y mantener contraste sobre blanco. */
        emerald: {
          100: 'rgb(var(--af-emerald-100) / <alpha-value>)',
          200: 'rgb(var(--af-emerald-200) / <alpha-value>)',
          300: 'rgb(var(--af-emerald-300) / <alpha-value>)',
          400: 'rgb(var(--af-emerald-400) / <alpha-value>)',
          500: 'rgb(var(--af-emerald-500) / <alpha-value>)',
          600: 'rgb(var(--af-emerald-600) / <alpha-value>)',
          700: 'rgb(var(--af-emerald-700) / <alpha-value>)',
        },
        violet: {
          200: 'rgb(var(--af-violet-200) / <alpha-value>)',
          300: 'rgb(var(--af-violet-300) / <alpha-value>)',
          400: 'rgb(var(--af-violet-400) / <alpha-value>)',
          500: 'rgb(var(--af-violet-500) / <alpha-value>)',
          950: 'rgb(var(--af-violet-950) / <alpha-value>)',
        },
        teal: {
          100: 'rgb(var(--af-teal-100) / <alpha-value>)',
          200: 'rgb(var(--af-teal-200) / <alpha-value>)',
          300: 'rgb(var(--af-teal-300) / <alpha-value>)',
          400: 'rgb(var(--af-teal-400) / <alpha-value>)',
          500: 'rgb(var(--af-teal-500) / <alpha-value>)',
          600: 'rgb(var(--af-teal-600) / <alpha-value>)',
        },
        amber: {
          100: 'rgb(var(--af-amber-100) / <alpha-value>)',
          200: 'rgb(var(--af-amber-200) / <alpha-value>)',
          300: 'rgb(var(--af-amber-300) / <alpha-value>)',
          400: 'rgb(var(--af-amber-400) / <alpha-value>)',
          500: 'rgb(var(--af-amber-500) / <alpha-value>)',
        },
        rose: {
          200: 'rgb(var(--af-rose-200) / <alpha-value>)',
          300: 'rgb(var(--af-rose-300) / <alpha-value>)',
          400: 'rgb(var(--af-rose-400) / <alpha-value>)',
          500: 'rgb(var(--af-rose-500) / <alpha-value>)',
          600: 'rgb(var(--af-rose-600) / <alpha-value>)',
        },
        cyan: {
          300: 'rgb(var(--af-cyan-300) / <alpha-value>)',
          400: 'rgb(var(--af-cyan-400) / <alpha-value>)',
          500: 'rgb(var(--af-cyan-500) / <alpha-value>)',
        },
        orange: {
          400: 'rgb(var(--af-orange-400) / <alpha-value>)',
        },
        /* Acento conmutable: la escala sky se alimenta de variables CSS
           (valores por defecto = sky oficial). El resto de paletas
           (emerald, amber, rose, violet, cyan…) conservan su uso semántico
           y NO siguen el acento. */
        sky: {
          50: 'rgb(var(--af-sky-50, 240 249 255) / <alpha-value>)',
          100: 'rgb(var(--af-sky-100, 224 242 254) / <alpha-value>)',
          200: 'rgb(var(--af-sky-200) / <alpha-value>)',
          300: 'rgb(var(--af-sky-300) / <alpha-value>)',
          400: 'rgb(var(--af-sky-400) / <alpha-value>)',
          500: 'rgb(var(--af-sky-500) / <alpha-value>)',
          600: 'rgb(var(--af-sky-600, 2 132 199) / <alpha-value>)',
          700: 'rgb(var(--af-sky-700, 3 105 161) / <alpha-value>)',
          800: 'rgb(var(--af-sky-800, 7 89 133) / <alpha-value>)',
          900: 'rgb(var(--af-sky-900, 12 74 110) / <alpha-value>)',
          950: 'rgb(var(--af-sky-950, 8 47 73) / <alpha-value>)',
        },
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(.97)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fadeIn .25s ease-out both',
        'scale-in': 'scaleIn .18s ease-out both',
      },
    },
  },
  plugins: [],
}
