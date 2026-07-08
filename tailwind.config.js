/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        app: {
          ink: '#263151',
          muted: '#7280A3',
          line: '#DCE9F7',
          white: '#FFFFFF',
          cloud: '#F7FBFF',
          sky: '#DFF3FF',
          'sky-deep': '#74BDF6',
          lavender: '#EDE6FF',
          'lavender-deep': '#A891F5',
          mint: '#DCF8EC',
          'mint-deep': '#65CDA8',
          peach: '#FFF1D8',
          'peach-deep': '#F0A84D',
          shadow: '#7DB5E8',
          'screen-sky': '#EFF8FF',
          'screen-lavender': '#F7F2FF',
          'screen-mint': '#F1FCF7',
        },
      },
    },
  },
  plugins: [],
};
