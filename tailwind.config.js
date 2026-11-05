/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        washi: {
          light: '#FFFDF7',
          DEFAULT: '#FAF3E0',
          dark: '#EFE4C8',
          border: '#D9C7A3',
        },
        shuiro: {
          light: '#F27D6D',
          DEFAULT: '#E05A47',
          dark: '#B83C2B',
        },
        matcha: {
          light: '#6A9F79',
          DEFAULT: '#4A7C59',
          dark: '#33593E',
        },
        aiiro: {
          light: '#3E5676',
          DEFAULT: '#2D4059',
          dark: '#1D2A3B',
        },
        kohaku: {
          light: '#F7BC87',
          DEFAULT: '#F4A261',
          dark: '#D67D35',
        },
        sumi: {
          DEFAULT: '#2B2623',
          muted: '#6E635B',
        }
      },
      fontFamily: {
        game: ['"M PLUS Rounded 1c"', '"Hiragino Maru Gothic ProN"', '"Noto Sans JP"', '"Yu Gothic"', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Courier New"', 'monospace'],
      },
      boxShadow: {
        'game-card': '0 6px 0 #D9C7A3, 0 10px 20px rgba(45, 64, 89, 0.12)',
        'game-btn': '0 4px 0 #1D2A3B',
        'game-btn-active': '0 1px 0 #1D2A3B',
        'shuiro-btn': '0 4px 0 #9E2E1F',
        'matcha-btn': '0 4px 0 #2B4B34',
        'kohaku-btn': '0 4px 0 #B86320',
      }
    },
  },
  plugins: [],
};

