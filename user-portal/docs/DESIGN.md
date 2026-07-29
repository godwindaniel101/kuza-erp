<!--
KUZA DESIGN SYSTEM — the committed world (replaces the retired navy/Inter/"no-animation" system).
THESIS: an ERP that dresses for the trade it runs. One calm, warm-paper operator's console; the
  vertical you're in re-tints it. Refuses generic SaaS blue-on-grey and the "no motion" rut.
OWN-WORLD: warm paper (#faf9f7) + ink, Bricolage Grotesque display over Hanken Grotesk body,
  a per-vertical accent that follows the current app, one expo-out motion curve, one elevation rule.
STORY: the operator scans a summary, drills to detail, acts in a focused modal; motion confirms
  where they are and what changed. Brand lives in precise details, never in decoration.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review + this file.
-->

# Kuza Design System

Operate mode. Every module shares one shell, one palette engine, one rhythm, one motion curve.
This file is the acceptance contract — numbers and rules, not adjectives.

## 1. Type
- **Display — Bricolage Grotesque** (`font-display`): page titles, KPI numbers, card/section titles, modal titles. `tracking-tight`. `tabular-nums` on any figure.
- **Body — Hanken Grotesk** (`font-sans`): everything else. Both self-hosted via `next/font` (no CDN).
- Scale: page title `text-[1.35rem]` display / section `text-[15px] font-semibold` / body `13px` / metadata `12px` / overline `11px`. Never ad-hoc `text-2xl/3xl` in the shell.

## 2. Color — warm paper + per-vertical accent
- Canvas `bg-canvas` (#faf9f7) / `dark:bg-gray-950`. Cards `bg-white` / `dark:bg-gray-900`.
- **Accent is CSS-variable-driven and follows the current app** (`data-app` on the shell → globals.css). Use the tokens, never a raw hex: `bg-accent`, `text-accent`, `bg-accent-soft`, `ring-accent-ring`, `text-accent-fg`, `bg-accent-gradient` (== `bg-brand-gradient`).
  - restaurant → ember · inventory → cobalt · accounting → indigo · hr → rose · payments → violet · default/kuza → teal.
- **Semantic (separate from accent, never the accent):** success emerald, warning amber, danger red, info sky. A red control must destroy something. Status = color + icon (`StatusBadge`), never color alone.
- **Commerce-friendly, light-first:** the world is warm paper under vibrant, trade-coded accents (ember=appetite, cobalt=trust, indigo=ledger, rose=people, violet=payments, teal=growth) — inviting and money-positive, not cool corporate. Light leads (daytime operator's console); dark is first-class but secondary.
- Charts: series-1 = `var(--accent)`; series-2 #d97706; positive #10b981. Hand-rolled SVG (`components/ui/charts.tsx`).

## 3. Space & rhythm — breathe
- **Generous by default** (commerce-storefront air, not enterprise density). Sections stack **`space-y-6`**; cards use **`p-6`** (StatCards `p-5`); more space above a heading than below. Page gutter from `Layout` (px-6→lg:px-8, py-6→lg:py-8) — pages must NOT add their own `p-6`/`min-h-screen`.
- Control rhythm: chrome (toolbar/header/table actions) **h-8**; content (form submits, inputs, selects) **h-9**; auth pages may use **h-10**. Nothing in chrome taller than a nav row.
- Page-width tiers via `components/ui/Page.tsx`: **full** (record tables + dashboards), **wide** (reports/detail), **narrow** (create/edit forms).

## 4. Motion — one curve, one authored moment (globals.css)
- Curve `--ease-out-expo` `cubic-bezier(0.16,1,0.3,1)`; speeds `--dur-fast 140ms · --dur 280ms · --dur-slow 460ms`. Arrive from an already-visible default; never bounce.
- **Per-navigation:** `.page-enter` fades (opacity-only — a transform/filter there traps the fixed sidebar).
- **Per-view:** wrap the top-level section stack in `.kz-stagger` — children rise in once, cascaded. One moment per view, not scattered hovers, not an identical entrance on every card.
- **Lean into motion** (commerce energy): staggered reveals on every view (`.kz-stagger`), `.kz-lift` on clickable cards/tiles (hover rise + deepened shadow), buttons `active:scale-[0.98]`, and one authored draw-in on charts/KPIs where it earns its place. Reach past transform/opacity (blur, backdrop-filter, shadow) when smooth. Everything disabled under `prefers-reduced-motion`. More motion, never busy: one moment per view, not per element.

## 5. Elevation — declare once
- Resting cards: **ring only** — `ring-1 ring-gray-950/[0.04] dark:ring-gray-800` on `rounded-2xl` + a single soft `shadow-card`. Do not stack a >1px border under a shadow (ghost card). Radii 12–16px (`rounded-xl/2xl`); pills only for small controls.
- Floating (modal/popover/dropdown): `shadow-popover` in light, `dark:ring-1 dark:ring-gray-800` in dark — one elevation per surface.

## 6. Modal — the canonical focused action (`components/Modal.tsx`)
Warm real backdrop blur (`backdrop-blur-md bg-gray-950/45`), single-elevation panel, expo-out scale+fade, Bricolage title, ESC + outside-click close, body-scroll lock. **All ad-hoc overlays migrate to this.** A modal is for a task that needs protected focus — not for what a page can show inline.

## 7. Components (shared — edit these, not one-off pages)
Button (`primary|secondary|ghost|danger` × `sm h-8|md h-9`, accent primary), Card, PageHeader (18px display title, actions right, `mb-5`), DataTable (h-11 rows, 11px headers, hairline dividers only, accent active states), StatCard (12px label / 24px display value / delta pill / accent halo), StatusBadge (tinted pill), FilterBar (h-9), EmptyState (quiet, on-brand), Modal, Icon (hand-drawn 24×24 outline, rendered 14–18px).

## 8. Craft floor — absolute refusals
No eyebrow/kicker above a heading (ban). No gradient text. No glass/blur as decoration. No colored `border-left/right` >1px on cards/alerts/list-items — use a tinted fill + full ring. No sparkline/progress-ring standing in for content. No monospace-as-costume. No nested cards. No modal for a task that needs no protected focus. Tracking floor -0.04em. Every interactive element ships hover/focus/disabled/loading/empty states + a dark variant.

## 9. Icons — one distinctive family
- Kuza's signature is the **hand-drawn 24×24 outline set** (`components/ui/Icon.tsx`, stroke 1.5, rendered 14–18px), NOT generic boxicons. New/overhauled surfaces use `Icon`; the generic boxicons CDN set is legacy and being migrated out (incremental — do not introduce new `bx bx-*` usages). One family, one stroke weight, one corner language across the whole product.

## 10. Dark mode
Class strategy (`.dark`). Every color ships a dark variant; tinted fills use `dark:bg-*-500/10`. Chart series validated on both surfaces. Pick neither light-first nor dark-first by habit — the app is a daytime operator's console, so light leads, dark is first-class.
