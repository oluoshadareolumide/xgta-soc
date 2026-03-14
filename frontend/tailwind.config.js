/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ["'Space Mono'", 'Courier New', 'monospace'],
        display: ["'Syne'", 'sans-serif'],
      },
      colors: {
        soc: {
          bg: '#070d1a',
          surface: '#0d1525',
          border: '#1e2535',
          muted: '#0f172a',
          critical: '#ff3b3b',
          high: '#ff8c00',
          medium: '#f5c842',
          low: '#50fa7b',
          purple: '#c084fc',
          blue: '#38bdf8',
        },
      },
    },
  },
  plugins: [],
}
