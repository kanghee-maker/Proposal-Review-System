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
        xs: ['0.8125rem', { lineHeight: '1.15rem' }],     // 12px -> 13px (+1px)
        sm: ['0.9375rem', { lineHeight: '1.35rem' }],     // 14px -> 15px (+1px)
        base: ['1.0625rem', { lineHeight: '1.6rem' }],    // 16px -> 17px (+1px)
        lg: ['1.1875rem', { lineHeight: '1.8rem' }],      // 18px -> 19px (+1px)
        xl: ['1.3125rem', { lineHeight: '1.85rem' }],     // 20px -> 21px (+1px)
        '2xl': ['1.5625rem', { lineHeight: '2.1rem' }],   // 24px -> 25px (+1px)
        '3xl': ['1.9375rem', { lineHeight: '2.35rem' }],  // 30px -> 31px (+1px)
        '4xl': ['2.3125rem', { lineHeight: '2.6rem' }],   // 36px -> 37px (+1px)
      }
    },
  },
  plugins: [],
}
