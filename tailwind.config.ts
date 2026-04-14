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
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      animation: {
        marquee:    'marquee 25s linear infinite',
        marquee2:   'marquee2 25s linear infinite',
        'fade-up':  'fadeUp 0.6s ease forwards',
        'blink':    'blink 1s step-end infinite',
      },
      keyframes: {
        marquee: {
          '0%':   { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        marquee2: {
          '0%':   { transform: 'translateX(50%)' },
          '100%': { transform: 'translateX(0%)' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(30px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0' },
        },
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
