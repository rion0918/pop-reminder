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
          sky: '#DCEBFF',
          'sky-deep': '#2F6FE4',
          lavender: '#EDE5FF',
          'lavender-deep': '#7957D5',
          mint: '#DDF7EC',
          'mint-deep': '#12866A',
          peach: '#FFF1D8',
          'peach-deep': '#F0A84D',
          shadow: '#7DB5E8',
          'screen-sky': '#F1F7FF',
          'screen-lavender': '#F8F4FF',
          'screen-mint': '#F1FBF7',
        },
      },
    },
  },
  plugins: [],
};
