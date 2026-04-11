/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#FFFAF0',
          100: '#FDF5E6',
          200: '#FEEBC8',
          300: '#FBD38D',
          400: '#F6AD55',
          500: '#D4AF37',
          600: '#B7950B',
          700: '#975A16',
          800: '#744210',
          900: '#742A2A',
        },
      },
    },
  },
  plugins: [],
}
