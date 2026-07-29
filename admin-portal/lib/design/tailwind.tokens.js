/**
 * Kuza ERP — Tailwind token map
 * ===========================================================================
 * Drop-in extension for `tailwind.config.js`'s `theme.extend`. Colors resolve
 * to the CSS custom properties defined in `tokens.css` (channel-triplet form),
 * so Tailwind opacity modifiers work everywhere:
 *     bg-primary-600        -> rgb(var(--color-primary-600))
 *     bg-primary-600/10     -> rgb(var(--color-primary-600) / 0.1)
 *     text-primary          -> theme-aware primary text
 *
 * Because these point at CSS variables, a palette swap in `tokens.css`
 * propagates to every Tailwind class with no rebuild of this file.
 *
 * MERGE — do NOT overwrite `tailwind.config.js`. See README.md → "Wiring in".
 * Import this file and deep-merge it into `theme.extend`, or copy the blocks.
 *
 * Requires `tokens.css` to be imported once (e.g. in `styles/globals.css`).
 * ===========================================================================
 */

/** Build an 11-stop scale that reads channel triplets from a CSS var prefix. */
const scale = (name) => ({
  50: `rgb(var(--color-${name}-50) / <alpha-value>)`,
  100: `rgb(var(--color-${name}-100) / <alpha-value>)`,
  200: `rgb(var(--color-${name}-200) / <alpha-value>)`,
  300: `rgb(var(--color-${name}-300) / <alpha-value>)`,
  400: `rgb(var(--color-${name}-400) / <alpha-value>)`,
  500: `rgb(var(--color-${name}-500) / <alpha-value>)`,
  600: `rgb(var(--color-${name}-600) / <alpha-value>)`,
  700: `rgb(var(--color-${name}-700) / <alpha-value>)`,
  800: `rgb(var(--color-${name}-800) / <alpha-value>)`,
  900: `rgb(var(--color-${name}-900) / <alpha-value>)`,
  950: `rgb(var(--color-${name}-950) / <alpha-value>)`,
});

/** @type {import('tailwindcss').Config['theme']['extend']} */
const kuzaTokens = {
  colors: {
    primary: scale('primary'),
    neutral: scale('neutral'),
    accent: scale('accent'),
    success: scale('success'),
    warning: scale('warning'),
    danger: scale('danger'),
    info: scale('info'),

    // Theme-aware semantic aliases (flip in .dark automatically).
    canvas: 'rgb(var(--surface-canvas) / <alpha-value>)',
    card: 'rgb(var(--surface-card) / <alpha-value>)',
    raised: 'rgb(var(--surface-raised) / <alpha-value>)',
    sunken: 'rgb(var(--surface-sunken) / <alpha-value>)',
    'border-subtle': 'rgb(var(--border-subtle) / <alpha-value>)',
    'border-strong': 'rgb(var(--border-strong) / <alpha-value>)',
    'text-primary': 'rgb(var(--text-primary) / <alpha-value>)',
    'text-secondary': 'rgb(var(--text-secondary) / <alpha-value>)',
    'text-muted': 'rgb(var(--text-muted) / <alpha-value>)',
    'on-primary': 'rgb(var(--on-primary) / <alpha-value>)',
  },

  fontFamily: {
    sans: ['var(--font-sans)'],
    mono: ['var(--font-mono)'],
  },

  fontSize: {
    '2xs': ['0.6875rem', { lineHeight: '1rem' }], // 11px overline / table head
    xs: ['0.75rem', { lineHeight: '1rem' }],
    sm: ['0.8125rem', { lineHeight: '1.25rem' }], // 13px dense label/body
    base: ['0.875rem', { lineHeight: '1.375rem' }], // 14px body
    md: ['1rem', { lineHeight: '1.5rem' }],
    lg: ['1.125rem', { lineHeight: '1.75rem' }],
    xl: ['1.25rem', { lineHeight: '1.75rem' }],
    '2xl': ['1.5rem', { lineHeight: '2rem' }], // page title
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
  },

  spacing: {
    0.5: 'var(--space-0-5)',
    1: 'var(--space-1)',
    1.5: 'var(--space-1-5)',
    2: 'var(--space-2)',
    3: 'var(--space-3)',
    4: 'var(--space-4)',
    5: 'var(--space-5)',
    6: 'var(--space-6)',
    8: 'var(--space-8)',
    10: 'var(--space-10)',
    12: 'var(--space-12)',
    16: 'var(--space-16)',
    20: 'var(--space-20)',
    24: 'var(--space-24)',
  },

  borderRadius: {
    sm: 'var(--radius-sm)',
    md: 'var(--radius-md)',
    lg: 'var(--radius-lg)',
    xl: 'var(--radius-xl)',
    '2xl': 'var(--radius-2xl)',
    full: 'var(--radius-full)',
  },

  boxShadow: {
    xs: 'var(--shadow-xs)',
    sm: 'var(--shadow-sm)',
    card: 'var(--shadow-card)',
    'card-hover': 'var(--shadow-card-hover)',
    popover: 'var(--shadow-popover)',
    focus: 'var(--shadow-focus)',
  },

  zIndex: {
    base: 'var(--z-base)',
    raised: 'var(--z-raised)',
    sticky: 'var(--z-sticky)',
    header: 'var(--z-header)',
    sidebar: 'var(--z-sidebar)',
    overlay: 'var(--z-overlay)',
    drawer: 'var(--z-drawer)',
    modal: 'var(--z-modal)',
    popover: 'var(--z-popover)',
    toast: 'var(--z-toast)',
    tooltip: 'var(--z-tooltip)',
  },

  transitionDuration: {
    instant: 'var(--duration-instant)',
    fast: 'var(--duration-fast)',
    DEFAULT: 'var(--duration-base)',
    base: 'var(--duration-base)',
    slow: 'var(--duration-slow)',
    slower: 'var(--duration-slower)',
  },

  transitionTimingFunction: {
    standard: 'var(--ease-standard)',
    out: 'var(--ease-out)',
    in: 'var(--ease-in)',
    emphasized: 'var(--ease-emphasized)',
  },

  backgroundImage: {
    // Emerald gradient for primary buttons / active nav pills.
    'primary-gradient':
      'linear-gradient(108deg, rgb(var(--color-primary-700)) 0%, rgb(var(--color-primary-600)) 60%, rgb(var(--color-primary-500)) 100%)',
    'primary-gradient-hover':
      'linear-gradient(108deg, rgb(var(--color-primary-800)) 0%, rgb(var(--color-primary-700)) 60%, rgb(var(--color-primary-600)) 100%)',
  },
};

module.exports = kuzaTokens;
module.exports.kuzaTokens = kuzaTokens;
