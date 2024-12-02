/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        blue: {
          600: '#3b82f6',
          700: '#2563eb',
          900: '#1e3a8a',
        },
        purple: {
          600: '#9333ea',
          700: '#7e22ce',
        },
        green: {
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },
        yellow: {
          600: '#ca8a04',
          700: '#a16207',
        },
        red: {
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
        },
        gray: {
          300: '#d1d5db',
        },
        orange: {
          700: '#f3581d',
        },
        pink: {
          700: '#f860b1',
          400: '#953A6A',
        },
        teal: {
          500: '#53c4af',
        }
      },
      fontFamily: {
        sans: ['Figtree', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

