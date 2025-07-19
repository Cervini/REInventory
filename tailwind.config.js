/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  safelist: [
    'bg-stone-700',
    'bg-red-900',
    'bg-sky-800',
    'bg-teal-800',
    'bg-purple-900',
    'bg-amber-700',
  ],
  theme: {
    extend: {
      fontFamily: {
        fantasy: ['Cinzel', 'serif'],
        sans: ['Lato', 'sans-serif'], // Add this line
      },
      colors: {
        'background': 'hsl(var(--color-background) / <alpha-value>)',
        'surface': 'hsl(var(--color-surface) / <alpha-value>)',
        'text-base': 'hsl(var(--color-text-base) / <alpha-value>)',
        'text-muted': 'hsl(var(--color-text-muted) / <alpha-value>)',
        'primary': 'hsl(var(--color-primary) / <alpha-value>)',
        'accent': 'hsl(var(--color-accent) / <alpha-value>)',
        'destructive': 'hsl(var(--color-destructive) / <alpha-value>)',
      },
       backgroundImage: {
        "parchment-texture":
          "url('https://www.toptal.com/designers/subtlepatterns/uploads/binding_dark.png')",
      },
    },
  },
  plugins: [],
};
