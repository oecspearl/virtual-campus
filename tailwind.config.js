/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'oecs-navy-blue': '#1e3a8a',
        'oecs-lime-green': '#84cc16',
        'oecs-light-green': '#dcfce7',
        'oecs-lime-green-dark': '#65a30d',
        'oecs-orange-yellow': '#f59e0b',
        'oecs-red': '#ef4444',
        'oecs-blue': '#3b82f6',
        'oecs-green': '#10b981',
        'oecs-yellow': '#fbbf24',
        // Dynamic theme colors from CSS variables
        'theme-primary': 'var(--theme-primary)',
        'theme-secondary': 'var(--theme-secondary)',
        'theme-accent': 'var(--theme-accent)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
