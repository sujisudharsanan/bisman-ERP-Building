module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}', './app/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: { brand: { 50: '#f5fbff', 500: '#0ea5e9' } },
      fontFamily: { inter: ['Inter', 'ui-sans-serif', 'system-ui'] }
    }
  },
  plugins: []
}
