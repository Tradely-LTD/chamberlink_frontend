import type { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';

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
        // Text — three-tier hierarchy. Use ink for headings/body, ink-muted for
        // secondary copy, ink-subtle for the faintest labels/timestamps.
        ink: {
          DEFAULT: '#191c1e',
          muted: '#5f6368',
          subtle: '#74777f',
        },
        // Backgrounds — surface-warm is scoped to the auth flow only, everything
        // else (dashboard chrome, cards, pages) uses surface/surface-alt.
        surface: {
          DEFAULT: '#ffffff',
          alt: '#f7f9fb',
          warm: '#fdf8f3',
        },
        border: {
          DEFAULT: '#e2e5e9',
          strong: '#c7cbd1',
        },
        success: {
          DEFAULT: '#0b6c4b',
          bg: '#eafaf3',
          text: '#0b6c4b',
        },
        warning: {
          DEFAULT: '#92600a',
          bg: '#fff4e0',
          text: '#92600a',
        },
        danger: {
          DEFAULT: '#b3261e',
          bg: '#fdecea',
          text: '#b3261e',
        },
      },
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(0 0 0 / 0.06)',
        'card-hover': '0 4px 12px -2px rgb(0 0 0 / 0.08)',
      },
    },
  },
  plugins: [],
} satisfies Config;
