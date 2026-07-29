# Kuza Design System

> **Kuza** = _"grow"_ (Swahili). The visual system is money- and trust-coded: a
> deep **emerald** primary for growth and value, a refined green-tinted
> **neutral** scale, a warm **gold** accent, and four unambiguous **status**
> hues. This is a deliberate departure from the generic indigo/blue SaaS look.

This directory is the **single source of truth** for Kuza's design tokens.

| File                 | Purpose                                                                 |
| -------------------- | ----------------------------------------------------------------------- |
| `tokens.ts`          | Typed TS tokens for programmatic consumers (components, tests, render).  |
| `tokens.css`         | CSS custom properties (RGB channel triplets) — the **runtime** source.  |
| `tailwind.tokens.js` | Maps the CSS vars into `theme.extend` (colors, spacing, radii, shadow…). |
| `README.md`          | This spec — palette rationale, usage rules, do/don't, wiring.           |

---

## Palette

### Primary — Kuza Emerald (grow / value)

A deep, slightly desaturated emerald that reads as _established money_, not a
neon fintech green. `600` (`#0f7a4b`) is the canonical brand stop: primary
buttons, active nav, focus ring, links. White text sits on `600`/`700` at AA.
`50`/`100` are the soft tint fills for selected rows and subtle badges.

```
50  #edfaf3   300 #72d3a2   600 #0f7a4b ← brand   900 #0a3f2c
100 #d3f2e0   400 #3fb97e   700 #0c6140            950 #04241a
200 #a8e6c4   500 #1f9d62   800 #0b4d34
```

### Neutral — Kuza Slate (green-tinted gray)

A cool green-gray carrying a hint of the primary's undertone, so surfaces feel
of a piece with the brand rather than clinically blue-gray. Text uses `900`
(primary) / `600` (secondary) / `500` (muted) on light; these flip on dark.

### Accent — Harvest Gold (warm emphasis)

The warm counterweight to the cool emerald. Reserved for value/currency
emphasis, highlights, premium/upsell, and occasional decorative flourishes.
**Accent is not a status color — never use gold to mean "success".**

### Status — distinct hues, always icon-paired

| Status    | Hue          | Icon (Boxicons)  |
| --------- | ------------ | ---------------- |
| `success` | grass green  | `bx-check-circle`|
| `warning` | amber        | `bx-error`       |
| `danger`  | red          | `bx-x-circle`    |
| `info`    | blue         | `bx-info-circle` |
| `pending` | amber        | `bx-time-five`   |
| `neutral` | slate        | `bx-minus-circle`|

`success` is a **brighter grass green** than the deep brand emerald so the two
never read as the same thing — reinforced by the mandatory icon (below).

---

## Accessibility — the one hard rule

**Never communicate status by color alone.** Every status is `color + icon +
text`. Each entry in `statusMeta` (`tokens.ts`) ships a paired Boxicons name for
exactly this reason. This protects color-blind users and the ~1-in-12 men with
deficient color vision, and disambiguates the two greens (brand vs. success).

- Body/label text targets **WCAG AA** (≥ 4.5:1). Use `text-primary` /
  `text-secondary`; muted text is for non-essential captions only.
- Focus is always visible: a 2px `primary-600` ring (see `.focus-ring`), never
  removed. `--shadow-focus` is an optional glow, not a replacement for the ring.
- Don't place text on `primary-400` or lighter; those are fills, not text beds.

---

## Usage rules

### Color

- **Do** use the semantic aliases for surfaces/text: `bg-canvas`, `bg-card`,
  `text-primary`, `text-secondary`, `border-subtle`. They are theme-aware and
  flip automatically in dark mode.
- **Do** use `primary-*` for anything interactive-and-branded (CTA, active nav,
  links, focus). One accent for the whole product — no per-module colors.
- **Do** use opacity modifiers for tints: `bg-primary-600/10`,
  `ring-primary-600/20`.
- **Don't** hardcode hex in components. Route everything through tokens.
- **Don't** use `accent` (gold) for status or primary actions.
- **Don't** reach for raw `emerald-*`, `green-*`, `slate-*` from Tailwind's
  default palette — use Kuza's `primary` / `success` / `neutral`.

### Surfaces & elevation

- Cards/panels: `bg-card rounded-xl shadow-card ring-1 ring-border-subtle`.
  On dark, shadows nearly vanish — the ring carries the edge (already handled by
  the `.dark` shadow overrides in `tokens.css`).
- One card shadow (`shadow-card`), one hover (`shadow-card-hover`), one popover
  (`shadow-popover`). Don't invent new shadows.
- Radii: cards `rounded-xl` (16px), modals `rounded-2xl`, buttons/inputs
  `rounded-md` (8px), chips `rounded-sm`, avatars/pills `rounded-full`.

### Typography

- Self-hosted **Inter** for UI, **JetBrains Mono** for numerics/codes/IDs (no
  external font CDNs — host the woff2 under `public/fonts` and `@font-face` it).
- One page title per page: `text-2xl font-semibold tracking-tight`.
- Section titles: `text-lg font-semibold`. Body: `text-base`. Labels:
  `text-sm font-medium`. Overlines / table headers: `text-2xs font-semibold
  uppercase tracking-wider text-text-muted`.

### Spacing & motion

- 4px rhythm. Default card/section padding is `p-6`; stack sections `space-y-6`.
- Transitions: default `duration-base` (160ms) with `ease-standard`. Entrances
  `ease-out`, exits `ease-in`. Motion collapses to 0ms under
  `prefers-reduced-motion` (handled in `tokens.css`).

---

## Do / Don't at a glance

| ✅ Do                                             | ❌ Don't                                           |
| ------------------------------------------------ | ------------------------------------------------- |
| `bg-primary-600 text-on-primary`                 | `bg-[#0f7a4b] text-white`                          |
| Status pill with color **and** icon **and** text | Green dot alone to mean "active"                   |
| `bg-card ring-1 ring-border-subtle shadow-card`  | Custom one-off `box-shadow`                        |
| `text-secondary` for captions                    | `text-muted` for essential content                |
| Gold accent for a "Premium" highlight            | Gold accent for a success toast                    |
| `primary-*` for every module's CTA               | A different accent color per module               |

---

## Swapping the palette (one file)

To rebrand, edit the **`--color-primary-*` channel triplets** at the top of
[`tokens.css`](./tokens.css) (and `--color-accent-*` if you want a new accent).
Because Tailwind classes and hand-written CSS both resolve to those variables,
the swap propagates everywhere with no code changes.

1. Pick your 11-stop scale (50→950). Convert each hex to a space-separated RGB
   triplet, e.g. `#0f7a4b` → `15 122 75`.
2. Paste the triplets into the `--color-primary-*` block in `tokens.css`.
3. Mirror the same hexes into the `primary` scale in `tokens.ts` (keeps TS
   consumers and any canvas/PDF rendering in sync).
4. Done. Rebuild the app; every `primary-*` class, focus ring, and gradient
   updates.

> The channel-triplet format is what enables Tailwind's `<alpha-value>` support
> (`bg-primary-600/10`). Keep it as triplets, not hex, in `tokens.css`.

---

## Wiring in (merge, don't overwrite)

`tailwind.tokens.js` is a **separate snippet** — it intentionally does not touch
the existing `tailwind.config.js`. To adopt it:

**1. Import the CSS variables once** (top of `styles/globals.css`, before
`@tailwind`):

```css
@import '../lib/design/tokens.css';
```

**2. Deep-merge the token map** into `tailwind.config.js`:

```js
const kuzaTokens = require('./lib/design/tailwind.tokens.js');

module.exports = {
  darkMode: 'class',
  content: [/* …unchanged… */],
  theme: {
    extend: {
      ...kuzaTokens, // colors, spacing, borderRadius, boxShadow, fontFamily,
                     // fontSize, zIndex, transitionDuration/TimingFunction,
                     // backgroundImage
      // keep any existing extend keys you still need below.
    },
  },
  plugins: [],
};
```

If a key already exists in `theme.extend` (e.g. `colors`, `fontFamily`), spread
`kuzaTokens.colors` / `kuzaTokens.fontFamily` into the existing object instead of
letting the top-level spread clobber it, e.g.
`colors: { ...existing, ...kuzaTokens.colors }`.

**3. (Optional) migrate the legacy `brand-*` classes.** The current config uses
navy `brand-*`. During transition you can alias it — add
`brand: kuzaTokens.colors.primary` — then remove `brand-*` once components move
to `primary-*`.

> This snippet is additive and self-contained. It does not remove existing
> tokens; it only introduces the Kuza emerald system alongside them so migration
> can be incremental.
