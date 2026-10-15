import type { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';

// Every colour reads a CSS variable defined in src/index.css, so opacity
// modifiers (bg-primary/10) keep working and the palette lives in one place.
// The system takes its cues from the dashboard map panel: white surfaces with
// hairline borders on a soft canvas, NACCIMA blue reserved for actions and
// data, the map's gold as the one accent. Contrast is checked against white
// and the canvas (all text pairs >= 4.5:1; input borders 3.1:1).
const v = (name: string) => `rgb(var(--c-${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: v('primary'),
          hover: v('primary-hover'),
          soft: v('primary-soft'),
          200: v('primary-200'),
        },
        gold: {
          DEFAULT: v('gold'),
          hover: v('gold-hover'),
          soft: v('gold-soft'),
          light: v('gold-light'),
        },
        // Text — ink for headings/body, ink-muted for secondary copy,
        // ink-subtle for labels/timestamps. All >= 4.5:1 on surface and canvas.
        ink: {
          DEFAULT: v('ink'),
          muted: v('ink-muted'),
          subtle: v('ink-subtle'),
        },
        canvas: v('canvas'),
        surface: {
          DEFAULT: v('surface'),
          alt: v('surface-alt'),
          warm: v('surface-alt'),
        },
        border: {
          DEFAULT: v('border'),
          subtle: v('border-subtle'),
          strong: v('border-strong'),
          input: v('border-input'),
        },
        success: { DEFAULT: v('success'), bg: v('success-bg'), text: v('success'), border: v('success-border') },
        warning: { DEFAULT: v('warning'), bg: v('warning-bg'), text: v('warning'), border: v('warning-border') },
        danger: { DEFAULT: v('danger'), bg: v('danger-bg'), text: v('danger'), border: v('danger-border') },
        info: { DEFAULT: v('primary'), bg: v('primary-soft'), text: v('primary'), border: v('primary-200') },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', ...defaultTheme.fontFamily.sans],
        mono: ['"IBM Plex Mono"', ...defaultTheme.fontFamily.mono],
        // Kept as aliases so the auth screens move to the new type with no
        // per-file edits: manrope -> Plex Sans, display -> Plex Serif.
        manrope: ['"IBM Plex Sans"', ...defaultTheme.fontFamily.sans],
        display: ['"IBM Plex Serif"', ...defaultTheme.fontFamily.serif],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.04em' }],
      },
      borderRadius: {
        card: '12px',
        control: '8px',
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(16 24 40 / 0.04)',
        'card-hover': '0 4px 12px -2px rgb(16 24 40 / 0.08), 0 2px 4px -2px rgb(16 24 40 / 0.04)',
        pop: '0 12px 32px -8px rgb(16 24 40 / 0.18), 0 4px 8px -4px rgb(16 24 40 / 0.06)',
        focus: '0 0 0 3px rgb(var(--c-primary) / 0.18)',
      },
      // Trade-route draw-in on the dashboard world map. Only ever applied via
      // motion-safe:, and the route is complete without it.
      keyframes: {
        'route-draw': {
          from: { strokeDashoffset: '2000' },
          to: { strokeDashoffset: '0' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'route-draw': 'route-draw 900ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-up': 'fade-up 220ms cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [],
} satisfies Config;
