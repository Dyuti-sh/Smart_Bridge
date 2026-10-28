/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f0f4f8',
          100: '#d9e2ec',
          200: '#bcccdc',
          300: '#9fb3c8',
          400: '#829ab1',
          500: '#627d98',
          600: '#486581',
          700: '#334e68',
          800: '#1e3a5f',
          900: '#0a192f',
          950: '#060d1a',
        },
        brand: {
          blue: '#0284c7',
          sky: '#0ea5e9',
          teal: '#0d9488',
          tealLight: '#14b8a6',
          dark: '#0a192f',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(10, 25, 47, 0.05), 0 1px 2px 0 rgba(10, 25, 47, 0.03)',
        'card': '0 4px 12px 0 rgba(10, 25, 47, 0.06), 0 1px 3px 0 rgba(10, 25, 47, 0.04)',
        'elevated': '0 10px 25px -3px rgba(10, 25, 47, 0.08), 0 4px 6px -2px rgba(10, 25, 47, 0.04)',
      }
    },
  },
  plugins: [],
}
