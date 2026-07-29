---
name: Kuza Marketing Site
description: Growth-green conversion-first SaaS canon that proves the mechanism live — a WhatsApp DM becomes order, stock, ledger and books.
colors:
  ink: "#14201a"
  forest: "#0a3d2c"
  forest-deep: "#072b1f"
  leaf: "#0c6b45"
  leaf-dark: "#095436"
  mint: "#eaf4ee"
  paper: "#f5f7f4"
  line: "#e3e9e4"
  muted: "#4b5b53"
  amber: "#ffb020"
  amber-deep: "#8a5a00"
typography:
  display:
    fontFamily: "Bricolage Grotesque, Figtree, system-ui, sans-serif"
    fontSize: "2.6rem–3.5rem (sm:3rem, lg:3.5rem)"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Bricolage Grotesque, Figtree, system-ui, sans-serif"
    fontSize: "1.875rem–2.25rem (text-3xl sm:text-4xl)"
    fontWeight: 700
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Bricolage Grotesque, Figtree, system-ui, sans-serif"
    fontSize: "1.125rem–1.25rem"
    fontWeight: 600
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "1rem (lead paragraphs 1.125rem, support copy 0.95rem)"
    fontWeight: 400
    lineHeight: 1.625
  label:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
rounded:
  pill: "9999px"
  card-lg: "1.5rem"
  card: "1rem"
  inner: "0.75rem"
spacing:
  container: "max-width 72rem, px 1.25rem (md: 2rem)"
  section-y: "5rem (lg: 7rem)"
  split-gap: "3rem (lg: 3.5rem)"
components:
  button-primary:
    backgroundColor: "{colors.leaf}"
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    padding: "14px 28px"
  button-primary-hover:
    backgroundColor: "{colors.leaf-dark}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.forest}"
    rounded: "{rounded.pill}"
    padding: "12px 24px"
  button-secondary-hover:
    backgroundColor: "{colors.forest}"
    textColor: "#ffffff"
  button-inverse:
    backgroundColor: "{colors.amber}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "16px 32px"
  card:
    backgroundColor: "#ffffff"
    rounded: "{rounded.card}"
  badge-live:
    backgroundColor: "{colors.mint}"
    textColor: "{colors.leaf}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
  badge-roadmap:
    backgroundColor: "rgb(255 176 32 / 0.2)"
    textColor: "{colors.amber-deep}"
    rounded: "{rounded.pill}"
    padding: "4px 12px"
---

# Design System: Kuza Marketing Site

## Overview

**Creative North Star: "The Living Ledger"**

Where the category ships a floating dashboard screenshot, Kuza proves its mechanism live: a WhatsApp DM becomes a structured order, stock movement, ledger row and journal entry in one choreographed sequence. Everything on the site serves that proof — clean, conversion-first SaaS at the Bumpa/Paystack craft bar, executed straight, no vernacular pastiche. The world is deep growth-green and amber on white and off-white grounds, warm African merchant photography, and hand-built product-UI mockups whose demo data is always labeled illustrative.

The density is generous and calm: one 72rem container, alternating white and paper bands, split two-column sections that pair an argument with its evidence (a mockup or a photograph). Headings carry their own weight — there are no eyebrow/kicker labels anywhere. Copy is benefit-led and conversational, Naira-first, and never claims more than the product does: roadmap items wear an amber pill, money always sits in tabular figures, and every mockup admits it is a demo.

**Key Characteristics:**
- Mechanism proven live in hand-built product-UI mockups, never dashboard screenshots
- Growth-green (forest/leaf) authority with a single amber accent voice
- Bricolage Grotesque display over Figtree body, tight tracking, balanced headings
- Pill buttons, rounded-2xl/3xl cards, soft green-tinted shadows
- One authored motion moment (hero demo); everything else is restrained reveal
- Radical honesty devices: "Illustrative" labels, roadmap pills, approval-queue language

## Colors

A two-voice palette: deep growth-green carries structure and trust; amber is the single warm accent that marks proof, energy and honesty.

### Primary
- **Leaf** (#0c6b45): the action green — primary buttons, active nav links, inline "explore" links, positive statuses. Darkens to **Leaf Dark** (#095436) on hover.
- **Forest** (#0a3d2c): the voice of headings — every h1/h2 on light grounds, the wordmark, secondary button borders, dark packaging cards.
- **Forest Deep** (#072b1f): full-bleed dark bands — the footer, engineering-trust section, page heroes on /ai and /industries, and dark CTA panels. Text on it is white with white/75–white/80 for body copy.

### Secondary
- **Amber** (#ffb020): the accent that is never the ground. Wordmark dot, bullet dots, link underlines (`decoration-amber decoration-2 underline-offset-4`), highlighted terms on dark bands, the text selection color, and the inverse CTA button on forest-deep. At 10–20% opacity it becomes the roadmap/warning surface.
- **Amber Deep** (#8a5a00): legible amber — text inside amber/20 roadmap pills.

### Neutral
- **Ink** (#14201a): default body text; a green-black, not a pure black.
- **Muted** (#4b5b53): supporting copy, captions, secondary table cells, mockup metadata.
- **Paper** (#f5f7f4): the off-white section ground that alternates with pure white; also inner panels inside white mockups.
- **Mint** (#eaf4ee): positive-status pill surface ("Online", "Paid", "Posted automatically") with leaf text; hover surface for the ghost nav button.
- **Line** (#e3e9e4): all hairlines — card borders, dividers, table rules, nav border.

### Named Rules
**The One Accent Voice Rule.** Amber never fills a large surface at full strength. It appears as dots, underlines, highlighted phrases, one inverse button on dark grounds, and 10–20% washes — its rarity is what makes roadmap pills and proof marks legible.

**The Alternating Grounds Rule.** Sections alternate white and paper (#f5f7f4) down the page; forest-deep bands are reserved for trust arguments, page heroes and final CTAs. Mockup cards are always white so they lift off either light ground.

## Typography

**Display Font:** Bricolage Grotesque (falls back to Figtree, system-ui) — loaded via next/font as `--font-bricolage`
**Body Font:** Figtree (system-ui fallback) — `--font-figtree`

**Character:** A characterful grotesque with just enough quirk to feel owned, set tight (-0.02em) and heavy over a friendly, highly legible body face. Confident, not shouty.

### Hierarchy
- **Display** (800, 2.6rem → 3.5rem at lg, line-height 1.05): page h1 only. Home hero and page heroes. `text-wrap: balance` applies to all h1/h2.
- **Headline** (700, text-3xl → sm:text-4xl): section h2. Always forest on light grounds, white on forest-deep.
- **Title** (600–700, text-lg–xl): card and step headings, mockup titles, dt terms (amber on dark bands).
- **Body** (400, 1.125rem lead / 1rem default / 0.95rem support, leading-relaxed): lead paragraphs are muted text-lg capped at max-w-xl/2xl; card support copy runs 0.9–0.95rem.
- **Label** (600, 0.75rem): status and roadmap pills; xs muted for captions and "Illustrative" notes.

### Named Rules
**The No-Eyebrow Rule.** No kicker/eyebrow labels above headings anywhere. The heading carries its own weight; context comes from the copy beneath it.

**The Tabular Money Rule.** Every monetary figure and quantity column is set `tabular-nums`, in Naira, and accompanied somewhere on the surface by an "Illustrative" label.

## Layout

One container: max-w-6xl (72rem), px-5 mobile / px-8 from md. Sections breathe at py-20 (lg:py-28). The signature composition is the split section — a grid of two columns (`lg:grid-cols-2` or slightly weighted like `1.05fr_1fr`), gap-12/14, pairing prose (heading + lead + amber-dot bullet list + one link) with evidence (a mockup card or photograph). Sides alternate via `lg:order-*` down the page. Multi-item content uses 2→4/5 column grids (`sm:grid-cols-2 lg:grid-cols-4`), and numbered processes are `<ol>` with forest circle badges (h-8/9 w-8/9, amber numeral in display font) linked by hairlines on desktop. The nav is sticky (h-16, white/90 + backdrop-blur, line border); the fold closes with a proof strip of amber-dot items on a line-bordered band.

## Elevation & Depth

Soft, green-tinted and sparse. Depth comes primarily from ground alternation (white cards on paper, paper panels inside white cards) and hairline borders; shadows are reserved for things that must feel liftable.

### Shadow Vocabulary
- **Card** (`box-shadow: 0 8px 24px -10px rgb(20 32 26 / 0.14)`): resting mockup cards, industry cards, chat bubbles inside demos.
- **Lift** (`box-shadow: 0 12px 32px -12px rgb(10 61 44 / 0.18)`): primary buttons, the hero demo frame, photo frames, and the hover state of cards (card → lift on hover).

### Named Rules
**The Two-Shadow Rule.** Only shadow-card and shadow-lift exist. No new shadow values; if something needs more separation, change its ground or add a line border instead.

## Shapes

Friendly, generous curvature with no sharp UI corners. Buttons and all badges are full pills (rounded-full). Major frames — hero demo, pricing composition card, CTA panels — are rounded-3xl (1.5rem); standard cards and mockups are rounded-2xl (1rem); nested elements inside mockups (list chips, note panels) step down to rounded-xl (0.75rem). Chat bubbles are rounded-2xl with one squared-off corner (rounded-bl-md / rounded-br-md) pointing at the speaker. Borders are 1px line, except the deliberate 2px amber border on the "Included with Kuza" packaging card and the 2px forest total rule on pricing.

## Components

### Buttons
- **Shape:** full pill (rounded-full), semibold, base text.
- **Primary:** leaf bg, white text, shadow-lift, px-7/8 py-3.5/4 (larger in CTAs); hover bg-leaf-dark via transition-colors.
- **Secondary (outline):** border-forest (or border-line in mobile menu), forest text, transparent; hover inverts to forest bg + white text.
- **Inverse (dark bands only):** amber bg, ink text; hover bg-white.
- **Text link:** semibold forest (or leaf) with `underline decoration-amber decoration-2 underline-offset-4`; hover shifts text toward leaf. This is the only inline-link treatment.

### Badges / Pills
- **Live/positive:** mint bg, leaf text, xs semibold, rounded-full ("Online", "Paid", "Posted automatically").
- **Roadmap:** `bg-amber/20 text-amber-deep`, xs semibold, rounded-full — mandatory on every roadmap/unshipped item.
- **Step numeral:** forest circle (h-8/9 w-8/9) with amber number in display font.
- **Amber dot:** h-2 w-2 rounded-full bg-amber — bullet marker in lists and proof strips, and the wordmark's period.

### Cards / Containers
- **Corner style:** rounded-2xl (rounded-3xl for major frames).
- **Background:** white on any ground; forest or forest-deep for dark feature/CTA panels; `bg-amber/10` with amber/40 border for the illustrative-figures disclaimer callout.
- **Border + shadow:** border-line + shadow-card at rest; interactive cards gain shadow-lift on hover.
- **Internal padding:** p-5 to p-7 (p-6/8 for large frames).

### Product-UI Mockups (signature component)
Hand-built, not screenshots: a white rounded-2xl/3xl card with border-line + shadow-card/lift containing labeled demo UI — chat threads (paper panel, white/leaf bubbles), journal tables (line-ruled, tabular-nums, muted em-dashes), transfer chips (paper rounded-xl), status pills. Every mockup carries realistic Nigerian trade data (Mama Nkechi Stores, Surulere, ₦85,000, Peak milk 400g) and a muted xs "Illustrative" caption. The hero version (HeroDemo) is the site's one authored motion moment.

### Navigation
Sticky h-16 header, bg-white/90 + backdrop-blur-md, border-b line. Wordmark = lowercase display-bold "kuza" in forest + amber dot. Links 0.95rem font-medium ink, hover/active leaf. Right side: ghost "Log in" (hover bg-mint) + primary "Start free" pill. Mobile: two-bar burger animating to an X; menu is a white sheet of line-divided links + stacked full-width pill CTAs.

### Photography
Real African merchant photography from /public/img, shown in rounded-2xl frames with shadow-lift or as h-44 card headers with `object-cover` and a gentle `group-hover:scale-105 duration-500` zoom. Warm, working-life scenes; alt text describes the merchant's activity.

### Motion
Two devices only, both disabled under `prefers-reduced-motion: reduce`:
1. **Hero demo choreography** — keyframes bubble-in / row-in / tick-pop, 0.5–0.55s, ease `cubic-bezier(0.16, 1, 0.3, 1)`, staggered via inline `animationDelay` (0.3s → 6.0s) telling the DM→order→ledger story once.
2. **Below-fold section reveal** (ScrollFx) — sections are visible by default; JS adds fx-pending (opacity 0, translateY 18px) only to sections below the first viewport, then fx-in (0.7s, same bezier) on 8% intersection.
Micro-interactions are `transition-colors`/`transition-shadow`/`transition-transform` only.

## Do's and Don'ts

### Do:
- **Do** prove the mechanism with a hand-built labeled mockup wherever the category would ship a screenshot — and caption demo data "Illustrative".
- **Do** badge every roadmap or unshipped item with the amber pill (`bg-amber/20 text-amber-deep`, xs semibold, rounded-full).
- **Do** set money and quantities `tabular-nums`, Naira-first, with realistic Nigerian trade names and figures.
- **Do** alternate white and paper section grounds and reserve forest-deep bands for trust arguments and final CTAs.
- **Do** use the amber-underline treatment (`decoration-amber decoration-2 underline-offset-4`) for every inline text link.
- **Do** keep focus states visible: 2px leaf outline, 2px offset (defined globally).

### Don't:
- **Don't** add eyebrow/kicker labels above headings — headings carry their own weight.
- **Don't** use `/img/hausa-girl-carrying-load.avif` — it is a watermarked comp, banned from any surface.
- **Don't** invent a third shadow, a sharp corner, or a non-pill button; the vocabulary is closed (card/lift, rounded-xl→3xl, pills).
- **Don't** add motion beyond the hero choreography and the ScrollFx reveal, and never motion that survives `prefers-reduced-motion`.
- **Don't** fill large surfaces with full-strength amber, and don't put muted (#4b5b53) text on forest grounds — use white at 70–80% opacity there.
- **Don't** present roadmap capabilities as live, invent customers, or state prices as real — figures are illustrative unless pulled from the pricing model (PRODUCT.md §12–13).
