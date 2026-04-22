import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/**/*.{ts,tsx}',
    './src/popup/index.html',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        display: ['Instrument Serif', 'Georgia', 'serif'],
        mono: ['DM Mono', 'monospace'],
      },
      colors: {
        primary: {
          50:  '#fefaf3',
          100: '#fdf3e2',
          200: '#fce3c0',
          300: '#facd91',
          400: '#f5b84a',
          500: '#e8a034',
          600: '#d98622',
          700: '#b46519',
          800: '#904e1b',
          900: '#744118',
        },
        surface: {
          DEFAULT: '#0c0c0c',
          card:    '#141414',
          border:  'rgba(255, 255, 255, 0.07)',
        },
      },
      animation: {
        'fade-in':    'fadeIn 0.3s ease-in-out',
        'slide-up':   'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
