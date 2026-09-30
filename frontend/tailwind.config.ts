import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg:       'var(--bg)',
        surface:  'var(--surface)',
        elevated: 'var(--elevated)',
        border:   'var(--border)',
        text:     'var(--text)',
        muted:    'var(--muted)',
        primary:  'var(--primary)',
        accent:   'var(--accent)',
        success:  'var(--success)',
        warning:  'var(--warning)',
        danger:   'var(--danger)',
        ambitious:'var(--ambitious)',
        tired:    'var(--tired)',
        deadline: 'var(--deadline)',
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      borderRadius: {
        card: '12px',
      },
    },
  },
  plugins: [],
}

export default config
