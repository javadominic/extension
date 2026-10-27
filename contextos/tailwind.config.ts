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
        sans: ['Inter', 'DM Sans', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Instrument Serif', 'Georgia', 'serif'],
        mono: ['DM Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        bg: 'var(--bg)',
        surface: {
          DEFAULT: 'var(--surface)',
          raised: 'var(--surface-raised)',
          card: 'var(--surface)',
          border: 'var(--border)',
        },
        border: {
          DEFAULT: 'var(--border)',
          control: 'var(--border-control)',
        },
        text: {
          DEFAULT: 'var(--text)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
          danger: 'var(--danger-text)',
        },
        amber: {
          DEFAULT: 'var(--amber)',
          text: 'var(--amber-text)',
          soft: 'var(--amber-soft)',
          contrast: 'var(--text-on-amber)',
        },
        live: 'var(--live)',
        dead: 'var(--dead)',
        danger: 'var(--danger-text)',
        unchecked: 'var(--unchecked)',
        // Keep primary aliases mapped to amber tokens for backward compatibility
        primary: {
          50:  'var(--amber-soft)',
          300: 'var(--amber-text)',
          400: 'var(--amber)',
          500: 'var(--amber)',
          600: 'var(--amber)',
          700: 'var(--amber)',
        },
      },
      borderRadius: {
        card: '12px',
        btn: '8px',
        input: '8px',
        chip: '6px',
      },
      transitionDuration: {
        DEFAULT: '150ms',
        fast: '120ms',
        normal: '150ms',
        slow: '180ms',
      },
    },
  },
  plugins: [],
}

export default config
