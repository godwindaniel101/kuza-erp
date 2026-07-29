/** @type {import('tailwindcss').Config} */
const colors = require('tailwindcss/colors');

module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        // Body: Hanken Grotesk (loaded via next/font in _app.tsx → --font-body).
        sans: [
          'var(--font-body)',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        // Display: Bricolage Grotesque — headings + big numbers.
        display: [
          'var(--font-display)',
          'var(--font-body)',
          'Georgia',
          'serif',
        ],
      },
      colors: {
        // Per-vertical ACCENT — CSS-variable driven so the whole product
        // re-themes to the service being rendered (see globals.css
        // [data-app="…"]). `bg-brand-gradient` also resolves to the accent.
        accent: {
          DEFAULT: 'var(--accent)',
          fg: 'var(--accent-fg)',
          hover: 'var(--accent-hover)',
          soft: 'var(--accent-soft)',
          ring: 'var(--accent-ring)',
        },
        // Single brand accent for the whole product (primary actions,
        // active nav, focus rings, links). Refined deep navy-blue —
        // pairs with `bg-brand-gradient` on active/primary elements.
        // Kuza brand — blue primary (pairs with indigo in bg-brand-gradient).
        // Emerald is reserved for `success` only, so the product reads blue.
        brand: {
          50: '#eef4ff',
          100: '#dfe9fd',
          200: '#c6d8fb',
          300: '#9ebdf7',
          400: '#6f99f0',
          500: '#4a77e8',
          600: '#2e56d3',
          700: '#2645ab',
          800: '#223a8a',
          900: '#1f326d',
          950: '#16214a',
        },
        // Warm-paper canvas — a whisper of warmth, not cool grey (calm-operator
        // direction). Kept in sync with the marketing site + globals.css.
        canvas: '#faf9f7',
        // Semantic aliases — always use these for status, never raw hues.
        success: colors.emerald,
        warning: colors.amber,
        danger: colors.red,
        info: colors.sky,
      },
      backgroundImage: {
        // Resolves to the CURRENT vertical's accent gradient (globals.css). Used
        // by primary buttons, the sidebar app tile, avatars, active pills — so
        // they all dress for the service being rendered.
        'brand-gradient': 'var(--accent-grad)',
        'brand-gradient-hover': 'var(--accent-grad-hover)',
        // Explicit accent aliases for new work.
        'accent-gradient': 'var(--accent-grad)',
        'accent-gradient-hover': 'var(--accent-grad-hover)',
      },
      boxShadow: {
        // ONE soft diffuse card shadow — large blur, very low alpha.
        // Nearly invisible in dark mode; cards keep a ring fallback there.
        card: '0 1px 2px 0 rgb(23 32 68 / 0.03), 0 12px 32px -12px rgb(23 32 68 / 0.10)',
        'card-hover': '0 2px 4px 0 rgb(23 32 68 / 0.04), 0 16px 40px -12px rgb(23 32 68 / 0.14)',
        popover: '0 4px 12px -4px rgb(23 32 68 / 0.10), 0 20px 48px -12px rgb(23 32 68 / 0.22)',
      },
      fontSize: {
        // 11px uppercase section/table-header labels.
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      transitionDuration: {
        DEFAULT: '150ms',
      },
    },
  },
  plugins: [],
};
