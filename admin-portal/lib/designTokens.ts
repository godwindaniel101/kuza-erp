/**
 * Kuza ERP — Design Tokens
 *
 * Single source of truth for the visual system. See docs/DESIGN.md.
 *
 * Brand: ONE accent — deep navy-blue (`brand` in tailwind.config.js) — used
 * for every primary action, active nav state, focus ring and link across
 * every module. Active/primary elements wear the `bg-brand-gradient` navy
 * gradient. The old per-module red (RMS) / blue (HRMS) split is retired; the
 * `AccentColor` type is kept only for backwards compatibility and both
 * values resolve to the brand palette.
 *
 * Accessibility: status colors are ALWAYS paired with an icon, never
 * communicated by color alone (see StatusBadge).
 */

/** @deprecated Legacy accent selector. Both values now resolve to brand. */
export type AccentColor = 'red' | 'blue';

export const MODULE_ACCENT: Record<'ims' | 'hrms', AccentColor> = {
  ims: 'red',
  hrms: 'blue',
};

const brandAccent = {
  solidButton: 'bg-brand-gradient text-white',
  solidButtonHover: 'hover:bg-brand-gradient-hover',
  focusRing: 'focus-visible:ring-brand-500',
  softBg: 'bg-brand-50 dark:bg-brand-500/10',
  text: 'text-brand-600 dark:text-brand-400',
  border: 'border-brand-600',
};

/**
 * Pre-composed Tailwind class strings. Both legacy accents intentionally
 * resolve to the same brand classes so the product reads as one system.
 */
export const accentClasses: Record<AccentColor, typeof brandAccent> = {
  red: brandAccent,
  blue: brandAccent,
};

/**
 * Semantic status palette — soft tinted pills (bg-*-50 text-*-700 ring-*-600/20
 * with dark variants). Each status carries a boxicons icon name so consumers
 * render color + icon together (a11y).
 */
export type StatusVariant =
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'pending'
  | 'approved'
  | 'rejected';

export const statusTokens: Record<
  StatusVariant,
  { color: string; icon: string; bg: string; text: string; border: string }
> = {
  success: {
    color: 'emerald',
    icon: 'bx-check-circle',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10 ring-1 ring-inset ring-emerald-600/20 dark:ring-emerald-400/20',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
  warning: {
    color: 'amber',
    icon: 'bx-error',
    bg: 'bg-amber-50 dark:bg-amber-500/10 ring-1 ring-inset ring-amber-600/20 dark:ring-amber-400/20',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800',
  },
  error: {
    color: 'red',
    icon: 'bx-x-circle',
    bg: 'bg-red-50 dark:bg-red-500/10 ring-1 ring-inset ring-red-600/20 dark:ring-red-400/20',
    text: 'text-red-700 dark:text-red-400',
    border: 'border-red-200 dark:border-red-800',
  },
  info: {
    color: 'sky',
    icon: 'bx-info-circle',
    bg: 'bg-sky-50 dark:bg-sky-500/10 ring-1 ring-inset ring-sky-600/20 dark:ring-sky-400/20',
    text: 'text-sky-700 dark:text-sky-400',
    border: 'border-sky-200 dark:border-sky-800',
  },
  pending: {
    color: 'amber',
    icon: 'bx-time-five',
    bg: 'bg-amber-50 dark:bg-amber-500/10 ring-1 ring-inset ring-amber-600/20 dark:ring-amber-400/20',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800',
  },
  approved: {
    color: 'emerald',
    icon: 'bx-check-double',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10 ring-1 ring-inset ring-emerald-600/20 dark:ring-emerald-400/20',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
  rejected: {
    color: 'red',
    icon: 'bx-x',
    bg: 'bg-red-50 dark:bg-red-500/10 ring-1 ring-inset ring-red-600/20 dark:ring-red-400/20',
    text: 'text-red-700 dark:text-red-400',
    border: 'border-red-200 dark:border-red-800',
  },
};

/** Spacing rhythm (rem). Pages stack sections with space-y-6. */
export const spacing = {
  xs: '0.5rem', // p-2
  sm: '0.75rem', // p-3
  md: '1rem', // p-4
  lg: '1.5rem', // p-6 (default page/card padding)
  xl: '2rem', // p-8
} as const;

/**
 * Border radius scale. Cards/major surfaces are rounded-2xl; buttons and
 * inputs stay rounded-lg.
 */
export const radius = {
  sm: 'rounded-md',
  md: 'rounded-lg',
  lg: 'rounded-2xl',
  full: 'rounded-full',
} as const;

/**
 * Type scale. One page title per page (text-2xl), section titles text-base,
 * labels 13px medium, section/table headers 11px uppercase tracking-wide.
 */
export const typography = {
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  pageTitle: 'text-2xl font-semibold tracking-tight text-gray-900 dark:text-white',
  sectionTitle: 'text-base font-semibold text-gray-900 dark:text-gray-100',
  overline: 'text-2xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400',
  body: 'text-sm text-gray-700 dark:text-gray-300',
  muted: 'text-sm text-gray-500 dark:text-gray-400',
  label: 'text-[13px] font-medium text-gray-700 dark:text-gray-300',
} as const;

/**
 * Shared surface styles (cards, panels, table containers).
 * Light mode: white card + ONE soft diffuse shadow (large blur, low alpha)
 * with a faint hairline ring for edge definition. Dark mode: shadows are
 * nearly invisible, so the ring is the fallback.
 */
export const surfaces = {
  card: 'bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800',
  panel: 'bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800',
  page: 'bg-canvas dark:bg-gray-950',
} as const;

/** Shared control styles. Inputs are h-9/h-10, brand focus ring. */
export const controls = {
  inputBase:
    'w-full h-10 px-3 text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:border-transparent transition-colors',
  inputFocus: {
    red: 'focus-visible:ring-brand-500',
    blue: 'focus-visible:ring-brand-500',
  },
} as const;
