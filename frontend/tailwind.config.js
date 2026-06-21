/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        win: {
          gray: '#C0C0C0',
          navy: '#000080',
          blue: '#1084D0',
          'border-light': '#FFFFFF',
          'border-dark': '#808080',
          'border-deep-dark': '#404040',
          'border-highlight': '#dfdfdf',
        }
      },
      fontFamily: {
        win: ['"MS Sans Serif"', '"Segoe UI"', 'Tahoma', 'Geneva', 'Verdana', 'sans-serif'],
        'win-heavy': ['"Arial Black"', 'Impact', 'Haettenschweiler', 'sans-serif'],
        'win-mono': ['"Courier New"', 'Courier', 'monospace'],
      }
    },
  },
  plugins: [],
}
