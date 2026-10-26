/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        gcuc: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc7fb',
          400: '#38a9f7',
          500: '#0e8ce9',
          600: '#026fc7',
          700: '#0358a1',
          800: '#074b85',
          900: '#0c3f6e',
        }
      },
      fontSize: {
        xs: ['1rem', { lineHeight: '1.45rem' }],          // 13px -> 16px (+3px)
        sm: ['1.125rem', { lineHeight: '1.65rem' }],      // 15px -> 18px (+3px)
        base: ['1.25rem', { lineHeight: '1.85rem' }],     // 17px -> 20px (+3px)
        lg: ['1.375rem', { lineHeight: '2rem' }],         // 19px -> 22px (+3px)
        xl: ['1.5rem', { lineHeight: '2.1rem' }],         // 21px -> 24px (+3px)
        '2xl': ['1.75rem', { lineHeight: '2.3rem' }],     // 25px -> 28px (+3px)
        '3xl': ['2.125rem', { lineHeight: '2.6rem' }],    // 31px -> 34px (+3px)
        '4xl': ['2.5rem', { lineHeight: '2.9rem' }],      // 37px -> 40px (+3px)
      }
    },
  },
  plugins: [],
}
