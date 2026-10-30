/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: { 900: '#10233F' },
        teal: { 600: '#157E92' },
        green: { 600: '#15805D' },
        amber: { 600: '#AA6C0B' },
        red: { 600: '#C23C45' },
        surface: '#F3F6FA',
        white: '#FFFFFF',
        text: '#17233B',
      },
      spacing: {
        1: '2px', 2: '4px', 3: '6px', 4: '8px', 5: '10px', 6: '12px', 8: '16px', 10: '20px', 12: '24px', 16: '32px', 20: '40px', 24: '48px', 32: '64px',
      },
    },
  },
  plugins: [],
}
