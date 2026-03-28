/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: {
          DEFAULT: 'var(--surface)',
          hover: 'var(--surface-hover)',
          elevated: 'var(--surface-elevated)',
        },
        border: 'var(--border)',
        'border-hover': 'var(--border-hover)',
        accent: {
          blue: 'var(--blue)',
          'blue-dim': 'var(--blue-dim)',
          green: 'var(--green)',
          'green-dim': 'var(--green-dim)',
          red: 'var(--red)',
          'red-dim': 'var(--red-dim)',
          amber: 'var(--amber)',
          'amber-dim': 'var(--amber-dim)',
          purple: 'var(--purple)',
          'purple-dim': 'var(--purple-dim)',
          orange: 'var(--orange)',
          'orange-dim': 'var(--orange-dim)',
        },
        text: {
          DEFAULT: 'var(--text)',
          sec: 'var(--text-sec)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          dim: 'var(--muted-dim)',
        },
      },
      fontFamily: {
        mono: ['DM Mono', 'monospace'],
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      gridLine: 'var(--grid-line)',
    },
  },
  plugins: [],
}
