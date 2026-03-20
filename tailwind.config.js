/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        navy: { 900: '#05091A', 800: '#0a1128', 700: '#0f1a3d' },
        brand: { DEFAULT: '#38BDF8', dark: '#0ea5e9' },
      },
      fontFamily: {
        mono: ['DM Mono', 'monospace'],
        sans: ['Plus Jakarta Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
