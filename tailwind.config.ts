import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#023293',
          hover: '#0267bf',
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
