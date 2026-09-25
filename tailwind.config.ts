import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        /* CSS-variable driven — auto-switch with .dark / .light class */
        'maze-black':  'rgb(var(--bg) / <alpha-value>)',
        'maze-dark':   'rgb(var(--surface) / <alpha-value>)',
        'maze-gray':   'rgb(var(--gray) / <alpha-value>)',
        'maze-border': 'rgb(var(--border) / <alpha-value>)',
        'maze-cream':  'rgb(var(--text) / <alpha-value>)',
        'maze-muted':  'rgb(var(--muted) / <alpha-value>)',
        'maze-lime':   'rgb(var(--lime) / <alpha-value>)',
        /* Fixed colors — never change with theme */
        'maze-ink':    '#0A0A0A',   /* always dark — for text on lime buttons */
        'maze-paper':  '#F0EEE6',   /* always light — for hover on lime buttons */
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      screens: {
        '2xl': '1440px',
        '3xl': '1920px',
      },
    },
  },
  plugins: [],
}

export default config
