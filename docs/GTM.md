# Kuza — Go-To-Market & Product-Led Growth Playbook

> Owner: Godwin. Written 2026-07-11 (updated same day after strategy session). This is the operating document for making Kuza sell itself.
> Positioning: **"The ERP that does your books and collects your money — no accountant required."**
> **Spearhead decision (2026-07-11): Kuza Menu (free QR menus) + Kuza Hospitality is the wedge. Every other module exists to convert menu users into ERP users. When priorities conflict, the wedge wins.**

## 0. Brand decisions & open validations
- **Name:** keep "Kuza" (Swahili: grow; short; cross-market pronounceable) **pending a validation this week**: trademark search NG+KE (note existing "Kuza Biashara" SME platform in Kenya — the one real collision risk), domain (kuza.africa / getkuza.com), and social handles. Zero customers = renaming is free now, expensive later. If it clears, commit permanently.
- **Vertical naming:** company = Kuza; hospitality edition = **Kuza Hospitality** (restaurants, hotels, lounges, bars, cafés); QR product = **Kuza Menu** (marketable standalone).
- **Color:** shipping indigo now (velocity; trust-coded), but the design-token system makes the palette a one-file swap. A/B a deep-emerald variant ("Kuza = grow", money-coded, differentiates from the indigo SaaS sea) with the first 3 pilots, then commit.
- **Pricing display: local-first.** Show ₦/KSh as the primary price (USD as secondary/enterprise anchor). A Lagos lounge owner seeing "$99" hears "not for you", and naira rails (Paystack) are the collection path anyway.
- **Kuza Menu is FREE-plan** with a "Powered by Kuza" footer (the growth loop). Paid removes branding + unlocks table-side ordering when it ships. Never paywall the wedge.

## 0b. CEO decision log (2026-07-11, "Tony" session)
| # | Decision | Rationale |
|---|---|---|
| D1 | **Payroll gated out of NG pilot editions** until the Nigeria tax pack (PAYE/pension/NHF) replaces the US-centric engine | Mis-computed salaries = trust death. Fewer features, correct, beats more features, wrong |
| D2 | "Powered by Kuza" on every outbound surface (invoice emails/prints, public menus); removable on paid | B2B viral loop — customers acquire customers |
| D3 | Dashboard north star = "Did I make money today?" (profit today, cash, who owes me) | The daily-habit screen is retention |
| D4 | Full data export stays free forever | Trust-based lock-in only; exporters build trust, data gravity keeps them |
| D5 | Phase gates, not roadmap dates: Gate A = 5 pilots, 3 using 4+ days/wk by wk3 → Gate B = payments + NG tax pack + 40% activation → Gate C = 25 paying, <3% churn → then retail wedge (free invoice-maker) | No new verticals until the playbook is proven once |
| D6 | Vertical playbook (repeatable): free wedge tool → vertical edition → country pack → payments take-rate | This is how "most verticals" happens without becoming generic |
| D9 | **Two axes of product shape** (2026-07-11): apps decide what a BUSINESS has (Google/Odoo-style registry per businessType+plan — docs/APPS-MODEL.md); **roles decide which SURFACE a PERSON gets** — Back office (managers) vs **Shop floor** (attendants: phone-first big-button tasks — Sell / Check price / Receive / Count / Report damage — barcode camera, offline-queue, clock-in) vs Employee self-service. Companion finding: **retail has NO sale flow** (orders are restaurant-shaped, invoices B2B-shaped) — simple POS sell screen = missing core app, reusing orders' stock+posting machinery | Founder: "what is the journey for the person in the shop?" Answer was: we didn't have one. Now we do |

## 1. Who we sell to (ICP, in priority order)
1. **Restaurants & food businesses, 1–10 branches** (Lagos/Nairobi/Accra) — acute pain: ingredient stock theft/waste, no daily P&L per branch. We have a vertical edition. Warm leads exist today.
2. **Retail & distribution SMEs, 2–50 staff** — pain: stock drift between branches, invoicing on WhatsApp/Excel, no idea if they're profitable.
3. **Accountants/bookkeepers serving SMEs** — not end users; a **channel**. One accountant = 10–30 client businesses.

## 2. The self-sell funnel (and what's built vs missing)
```
Visit website → Start free trial → Activation → Habit → Paid → Expand → Refer
```
| Stage | Mechanism | Status |
|---|---|---|
| Visit | Marketing site (website/), SEO pages, restaurant vertical page | BUILT (deploy pending) |
| Signup | Self-serve /register, no card required, 14-day Growth trial auto-starts | BUILT |
| **Activation** | Defined as: **business creates 10 items + 1 inflow + 1 invoice OR 1 order within 7 days.** Everything in onboarding must push toward this | Onboarding wizard NOT built — top gap |
| Habit | Daily digest (insights), low-stock + overdue-invoice alerts | Insights API in progress; email digest TODO |
| Paid | Trial countdown in-app (billing page), limit-gating on FREE downgrade, upgrade CTA when hitting a limit | Billing page BUILT; hard limit-gates exist as FeatureGateGuard but are not applied to routes yet — apply after pilot feedback |
| Expand | Per-branch pricing pressure (branch limits per plan) | BUILT via plan limits |
| Refer | "Powered by Kuza" on printed/emailed invoices (free plan keeps it; paid can remove) + referral credit | TODO — cheap, high leverage: every invoice a business sends is an ad |

## 3. Lifecycle communications (build next — mailer already exists in notifications module)
- Day 0: welcome + "add your first 10 items" (single CTA)
- Day 2: "your books write themselves" — show their own first journal entry if it exists, else nudge
- Day 7: activation check — activated: feature discovery (reports); not: "need help?" + demo link
- Day 11: trial ends in 3 days + what they lose (their own numbers: "you tracked ₦X this week")
- Day 14: downgrade to Free happened + one-click upgrade
- Ongoing weekly: Monday digest email from /insights/digest (top debtor, cash position, low stock)

## 4. Restaurant Edition — direct sales motion (for the warm leads NOW)
1. **Pitch (30s):** "Kuza runs your restaurant's stock, menus, tables and orders — and every plate sold updates your books and your ingredient stock automatically. You see profit per day per branch without an accountant."
2. **Demo script (15 min):** register live → add 5 ingredients + 1 menu item → take an order at a table → show stock depleted + the journal entry it wrote → show P&L. The wow is the automatic accounting.
3. **Pilot offer:** 60 days free Growth (extend trial manually in DB/admin for named pilots), in exchange for weekly feedback call + logo/testimonial rights on success.
4. **Onboarding checklist per pilot (you are customer-success):** branches created, menu imported (bulk upload exists), staff roles set, first real day's orders entered, week-1 reconciliation reviewed together.
5. Success metric per pilot: they check the dashboard ≥4 days/week by week 3.

## 5. Channels (ranked by expected CAC)
1. **Warm/direct** (restaurant leads) — do these personally; each becomes a case study.
2. **Accountant partner program** — 20% recurring rev-share, partner dashboard later; start with a WhatsApp group of 10 accountants.
3. **SEO/content** — "restaurant profit template Nigeria", "how to track inventory for a small shop", each article ends in the relevant template inside Kuza. Website ships with the base.
4. **Communities** — Nairaland business, Twitter/X SME fintech circles, restaurant owner WhatsApp groups. Show real screenshots, not ads.
5. Paid ads — NOT yet; only after activation rate >40% (or you're paying to fill a leaky bucket).

## 6. Pricing guardrails
- Free plan is the top of funnel — never remove it; keep it genuinely useful but single-branch.
- Anchor on Growth ($99): it has accounting+invoicing — the actual moat. Trial defaults to Growth so the downgrade is felt.
- Price in USD, display ₦/KSh equivalents; collect via Paystack (card + transfer) when payments land.
- Annual = 2 months free (introduce after 10 paying customers, not before).

## 7. Metrics that matter (check weekly, in this order)
1. Signups (per channel)
2. **Activation rate** (the definition above) — the single number that predicts everything
3. Week-4 retention (tenant had ≥1 write action in week 4)
4. Trial→paid conversion
5. MRR, logo churn
> Instrument via the audit_logs table (already captures every mutating action per tenant) — a nightly rollup query gives all of these without new tracking code.

## 8. Launch checklist (order of operations)
- [ ] **BLOCKER (D1): gate payroll behind "coming soon — Nigeria payroll" for pilot tenants** (US tax engine must not run a real NG payroll)
- [ ] Deploy marketing site (Cloudflare Pages — see DEPLOY.md)
- [ ] Deploy app (backend + frontend + Postgres — see DEPLOY.md); real JWT secret; synchronize OFF; backups ON
- [ ] Run the 2 unverified money-paths once in prod-like env (restaurant order posting, payroll posting)
- [ ] Onboarding wizard (biggest product gap for self-serve)
- [ ] Lifecycle emails (day 0/2/7/11/14)
- [ ] "Powered by Kuza" on invoices
- [ ] Paystack keys in integrations → invoice payment links live
- [ ] 3 restaurant pilots onboarded personally
- [ ] Rate limiting on auth endpoints (security gap, pre-public-launch blocker)
- [ ] Privacy policy + ToS pages on the website (required before ads/partnerships)

## 9. Operating cadence (solo-founder-with-AI process)
- **Monday:** metrics review (30 min) → pick the ONE funnel stage to improve this week.
- **Tue–Thu:** build/ship against that stage (use Claude Code sessions per module; docs/ROADMAP.md is the backlog of record).
- **Friday:** pilot check-ins + write one piece of content from a real customer question.
- Every feature ships with: roadmap entry updated, smoke test run, one sentence added to the changelog page.
