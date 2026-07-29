/**
 * Kuza ERP — Design Tokens (TypeScript source of truth)
 * ---------------------------------------------------------------------------
 * Kuza = "grow" (Swahili). The system is money- and trust-coded: a deep
 * EMERALD primary (growth / value), a refined green-tinted NEUTRAL scale, a
 * warm GOLD accent (harvest / currency), and four unambiguous semantic status
 * hues. This deliberately departs from the generic indigo-SaaS look.
 *
 * This file is the typed source for programmatic consumers (components reading
 * tokens in TS, Storybook, tests, canvas/PDF rendering). The exact same values
 * are mirrored as CSS custom properties in `tokens.css` (channel triplets, so
 * Tailwind gets `<alpha-value>` support) and mapped into Tailwind in
 * `tailwind.tokens.js`.
 *
 * ONE-FILE SWAP: to rebrand, edit the `primary` (and, if desired, `accent`)
 * scales below, then mirror the same hexes in `tokens.css`. See README.md.
 *
 * ACCESSIBILITY: status is NEVER communicated by color alone. Every status
 * token ships a paired icon name (see `statusMeta`). Consumers must render
 * color + icon + text together.
 */

/* ------------------------------------------------------------------ */
/* Color scales                                                        */
/* ------------------------------------------------------------------ */

/** A full 50→950 tonal scale. */
export interface ColorScale {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
  950: string;
}

/**
 * PRIMARY — Kuza Emerald. Deep, slightly desaturated emerald that reads as
 * "grown, established money" rather than a neon fintech green. `600` is the
 * canonical brand stop (primary buttons, active nav, focus ring, links);
 * white text sits on `600`/`700` at AA. `50`/`100` are soft tint fills.
 */
export const primary: ColorScale = {
  50: '#edfaf3',
  100: '#d3f2e0',
  200: '#a8e6c4',
  300: '#72d3a2',
  400: '#3fb97e',
  500: '#1f9d62',
  600: '#0f7a4b', // ← brand stop
  700: '#0c6140',
  800: '#0b4d34',
  900: '#0a3f2c',
  950: '#04241a',
};

/**
 * NEUTRAL — Kuza Slate. A cool green-gray (a hint of the primary's undertone)
 * so surfaces feel of a piece with the brand instead of clinically blue-gray.
 * Text: `900` primary / `600` secondary / `500` muted on light; flips on dark.
 */
export const neutral: ColorScale = {
  50: '#f7f9f8',
  100: '#eef1f0',
  200: '#e0e5e3',
  300: '#c9d1ce',
  400: '#9aa5a2',
  500: '#6d7875',
  600: '#545f5c',
  700: '#414b48',
  800: '#2a3230',
  900: '#1a201e',
  950: '#0e1211',
};

/**
 * ACCENT — Harvest Gold. Warm counterweight to the cool emerald; reserved for
 * value/currency emphasis, highlights, premium/upsell, and the occasional
 * decorative flourish. NOT a status color — never use it to mean success.
 */
export const accent: ColorScale = {
  50: '#fdf8ed',
  100: '#f9ecc9',
  200: '#f3d98f',
  300: '#edc255',
  400: '#e5a92b',
  500: '#d18f18',
  600: '#b47214',
  700: '#8f5514',
  800: '#764317',
  900: '#643917',
  950: '#391d08',
};

/* ------------------------------------------------------------------ */
/* Semantic status scales                                              */
/* Distinct HUES so meaning survives even before the paired icon.      */
/* success = vivid grass green (brighter than the deep brand emerald),  */
/* warning = amber, danger = red, info = blue.                          */
/* ------------------------------------------------------------------ */

export const success: ColorScale = {
  50: '#ecfdf1',
  100: '#d1fadf',
  200: '#a6f2c1',
  300: '#6ce49b',
  400: '#34cf74',
  500: '#16b45a',
  600: '#0f9048',
  700: '#0c7239',
  800: '#0d5b30',
  900: '#0c4a29',
  950: '#032913',
};

export const warning: ColorScale = {
  50: '#fff8eb',
  100: '#fdecc8',
  200: '#fbd88d',
  300: '#f9c052',
  400: '#f5a623',
  500: '#e88c0a',
  600: '#c96d05',
  700: '#a35208',
  800: '#84410e',
  900: '#6e370f',
  950: '#3f1c04',
};

export const danger: ColorScale = {
  50: '#fef2f2',
  100: '#fde3e3',
  200: '#fbcccc',
  300: '#f7a3a3',
  400: '#f16f6f',
  500: '#e54545',
  600: '#d12b2b',
  700: '#af2020',
  800: '#911e1e',
  900: '#781f1f',
  950: '#410b0b',
};

export const info: ColorScale = {
  50: '#eef5ff',
  100: '#d9e8ff',
  200: '#bcd6ff',
  300: '#8ebbff',
  400: '#5c98fb',
  500: '#3576f0',
  600: '#205ad9',
  700: '#1c47af',
  800: '#1c3d8c',
  900: '#1c366f',
  950: '#142145',
};

export const colors = {
  primary,
  neutral,
  accent,
  success,
  warning,
  danger,
  info,
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
  current: 'currentColor',
} as const;

/* ------------------------------------------------------------------ */
/* Semantic surface / text tokens (theme-aware pairs)                  */
/* These are the values that flip between light and dark. Everything   */
/* else (the scales above) is theme-agnostic.                          */
/* ------------------------------------------------------------------ */

export interface ThemeSurface {
  /** Page background (warm neutral canvas). */
  canvas: string;
  /** Card / panel background. */
  card: string;
  /** Raised surface (popovers, menus, tooltips). */
  raised: string;
  /** Sunken / inset wells (code, empty states). */
  sunken: string;
  /** Hairline border for edge definition. */
  border: string;
  /** Stronger border (inputs, dividers under emphasis). */
  borderStrong: string;
  /** Primary text. */
  textPrimary: string;
  /** Secondary text (labels, captions). */
  textSecondary: string;
  /** Muted / placeholder text. */
  textMuted: string;
  /** Text/icon on top of a primary-600 fill. */
  onPrimary: string;
}

export const light: ThemeSurface = {
  canvas: '#f4f6f5', // faint green-tinted off-white, cousin of neutral.50
  card: '#ffffff',
  raised: '#ffffff',
  sunken: neutral[50],
  border: 'rgba(14, 18, 17, 0.06)',
  borderStrong: neutral[200],
  textPrimary: neutral[900],
  textSecondary: neutral[600],
  textMuted: neutral[500],
  onPrimary: '#ffffff',
};

export const dark: ThemeSurface = {
  canvas: neutral[950],
  card: neutral[900],
  raised: neutral[800],
  sunken: '#0a0e0d',
  border: 'rgba(255, 255, 255, 0.08)',
  borderStrong: neutral[700],
  textPrimary: neutral[50],
  textSecondary: neutral[300],
  textMuted: neutral[400],
  onPrimary: '#ffffff',
};

/* ------------------------------------------------------------------ */
/* Status metadata — color + REQUIRED paired icon (a11y)              */
/* Icon names are Boxicons (the repo's current icon font).            */
/* ------------------------------------------------------------------ */

export type StatusVariant =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'pending'
  | 'neutral';

export interface StatusMeta {
  /** The scale this status draws from. */
  scale: ColorScale;
  /** Boxicons class, e.g. `bx-check-circle`. Always render alongside color. */
  icon: string;
  /** Human label for screen readers / fallback. */
  label: string;
}

export const statusMeta: Record<StatusVariant, StatusMeta> = {
  success: { scale: success, icon: 'bx-check-circle', label: 'Success' },
  warning: { scale: warning, icon: 'bx-error', label: 'Warning' },
  danger: { scale: danger, icon: 'bx-x-circle', label: 'Error' },
  info: { scale: info, icon: 'bx-info-circle', label: 'Info' },
  pending: { scale: warning, icon: 'bx-time-five', label: 'Pending' },
  neutral: { scale: neutral, icon: 'bx-minus-circle', label: 'Neutral' },
};

/* ------------------------------------------------------------------ */
/* Spacing — 4px base rhythm                                           */
/* ------------------------------------------------------------------ */

export const spacing = {
  0: '0px',
  px: '1px',
  0.5: '0.125rem', // 2
  1: '0.25rem', // 4
  1.5: '0.375rem', // 6
  2: '0.5rem', // 8
  3: '0.75rem', // 12
  4: '1rem', // 16
  5: '1.25rem', // 20
  6: '1.5rem', // 24  ← default card / section padding
  8: '2rem', // 32
  10: '2.5rem', // 40
  12: '3rem', // 48
  16: '4rem', // 64
  20: '5rem', // 80
  24: '6rem', // 96
} as const;

/* ------------------------------------------------------------------ */
/* Radii — cards rounded-2xl (16), controls rounded-lg (8)            */
/* ------------------------------------------------------------------ */

export const radii = {
  none: '0px',
  sm: '0.375rem', // 6  chips, small controls
  md: '0.5rem', // 8  buttons, inputs
  lg: '0.75rem', // 12 nested panels
  xl: '1rem', // 16 cards / major surfaces
  '2xl': '1.25rem', // 20 modals, feature panels
  full: '9999px',
} as const;

/* ------------------------------------------------------------------ */
/* Elevation — soft, diffuse, green-neutral tinted shadows            */
/* Shadow tint uses neutral.950 (14 18 17) so shadows read warm-cool  */
/* consistent with the brand, not blue. Nearly invisible on dark;     */
/* pair surfaces with a `border` ring there.                          */
/* ------------------------------------------------------------------ */

export const shadows = {
  none: 'none',
  xs: '0 1px 2px 0 rgb(14 18 17 / 0.04)',
  sm: '0 1px 2px 0 rgb(14 18 17 / 0.04), 0 1px 3px 0 rgb(14 18 17 / 0.06)',
  /** Canonical card shadow: large blur, very low alpha. */
  card: '0 1px 2px 0 rgb(14 18 17 / 0.03), 0 12px 32px -12px rgb(14 18 17 / 0.10)',
  cardHover:
    '0 2px 4px 0 rgb(14 18 17 / 0.04), 0 16px 40px -12px rgb(14 18 17 / 0.14)',
  popover:
    '0 4px 12px -4px rgb(14 18 17 / 0.10), 0 20px 48px -12px rgb(14 18 17 / 0.22)',
  /** Emerald focus glow (use sparingly; ring is the primary focus signal). */
  focus: '0 0 0 3px rgb(15 122 75 / 0.35)',
} as const;

/* ------------------------------------------------------------------ */
/* Typography — Inter (self-hostable) + JetBrains Mono for numerics    */
/* ------------------------------------------------------------------ */

export const typography = {
  fontFamily: {
    sans: [
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ],
    mono: [
      '"JetBrains Mono"',
      'ui-monospace',
      'SFMono-Regular',
      'Menlo',
      'Consolas',
      'monospace',
    ],
  },
  /** [size, lineHeight] in rem. */
  fontSize: {
    '2xs': ['0.6875rem', '1rem'], // 11px uppercase table/section headers
    xs: ['0.75rem', '1rem'], // 12
    sm: ['0.8125rem', '1.25rem'], // 13 default label / dense body
    base: ['0.875rem', '1.375rem'], // 14 body
    md: ['1rem', '1.5rem'], // 16
    lg: ['1.125rem', '1.75rem'], // 18 section title
    xl: ['1.25rem', '1.75rem'], // 20
    '2xl': ['1.5rem', '2rem'], // 24 page title
    '3xl': ['1.875rem', '2.25rem'], // 30
    '4xl': ['2.25rem', '2.5rem'], // 36
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeight: {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
  },
  letterSpacing: {
    tight: '-0.02em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em', // overline / uppercase labels
  },
} as const;

/* ------------------------------------------------------------------ */
/* Z-index — one ladder for the whole app                              */
/* ------------------------------------------------------------------ */

export const zIndex = {
  base: 0,
  raised: 10,
  sticky: 20,
  header: 30,
  sidebar: 40,
  overlay: 50,
  drawer: 60,
  modal: 70,
  popover: 80,
  toast: 90,
  tooltip: 100,
} as const;

/* ------------------------------------------------------------------ */
/* Motion — quick, calm, physical                                      */
/* ------------------------------------------------------------------ */

export const motion = {
  duration: {
    instant: '75ms',
    fast: '120ms',
    base: '160ms', // default UI transition
    slow: '240ms',
    slower: '360ms',
  },
  easing: {
    /** Standard ease for most transitions. */
    standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
    /** Decelerate — entrances. */
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    /** Accelerate — exits. */
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    /** Subtle spring for emphasis. */
    emphasized: 'cubic-bezier(0.2, 0, 0, 1)',
  },
} as const;

/* ------------------------------------------------------------------ */
/* Root export — the strongly-typed design system                      */
/* ------------------------------------------------------------------ */

export const tokens = {
  colors,
  theme: { light, dark },
  status: statusMeta,
  spacing,
  radii,
  shadows,
  typography,
  zIndex,
  motion,
} as const;

export type DesignTokens = typeof tokens;

export default tokens;
