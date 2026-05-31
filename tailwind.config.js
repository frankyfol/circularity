/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        pixel: {
          bg: '#1a1c2c',
          panel: '#262b44',
          border: '#5d275d',
          accent: '#41a6f6',
          green: '#38b764',
          yellow: '#ffcd75',
          red: '#b13e53',
          purple: '#68386c',
        },
      },
      fontFamily: {
        pixel: ['"Press Start 2P"', 'monospace'],
        body: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
