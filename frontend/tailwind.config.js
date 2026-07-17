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
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      colors: {
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
        // Cool, blue-toned off-white canvas — same as the marketing site.
        canvas: '#f7f9fb',
        // Semantic aliases — always use these for status, never raw hues.
        success: colors.emerald,
        warning: colors.amber,
        danger: colors.red,
        info: colors.sky,
      },
      backgroundImage: {
        // Blue→indigo brand gradient (shared with the website) for active nav
        // pills and primary buttons.
        'brand-gradient': 'linear-gradient(120deg, #2e56d3 0%, #4f46e5 100%)',
        'brand-gradient-hover': 'linear-gradient(120deg, #2645ab 0%, #3f37c9 100%)',
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
