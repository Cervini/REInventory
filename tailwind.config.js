/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
    safelist: [
    'bg-red-500',
    'bg-blue-500',
    'bg-gray-400',
    'bg-yellow-400',
    'bg-green-600',
    'bg-purple-600',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}