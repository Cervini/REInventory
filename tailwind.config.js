/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  safelist: [
    "bg-red-500",
    "bg-blue-500",
    "bg-gray-400",
    "bg-yellow-400",
    "bg-confirm",
    "bg-purple-600",
    "bg-green-500",
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
