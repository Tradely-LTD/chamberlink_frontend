import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#00502e',
          hover: '#006b3f',
        },
        gold: {
          DEFAULT: '#795900',
          hover: '#5c4300',
        },
        border: '#bec9bf',
        cream: '#fdf8f3',
      },
    },
  },
  plugins: [],
} satisfies Config;
