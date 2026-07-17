# Kuza V3 — "The ERP Africa deserves"

> One system to **receive money, reconcile it, pay your people, settle your tax, and see the
> true state of your business** — built for African realities, elegant enough to feel inevitable.
> _For Africa, by Africa._

Branch: `feat/v3` · Owner: Godwin · Started: 2026-07-17

---

## 1. Why we win (the wedge)

Foreign ERPs (Odoo, SAP, QuickBooks, Sage) were designed for developed markets and *retro-fitted*
to Africa. Every African reality that wasn't in the original design becomes a paid customization.
The research is blunt:

- **~75% of ERP implementations in Africa fail** to deliver their projected benefits.
- Payment-gateway support for Africa "feels like an afterthought" — clunky third-party connectors,
  extra cost, extra complexity.
- Reconciliation across **M-Pesa + banks + agent networks + cash** is manual and paper-based —
  the single biggest drain on SME working capital.
- Local **tax** (NG VAT/WHT, KE eTIMS, GH VAT) and **payroll statutory** (PAYE, pension, NHF,
  NSSF/SHIF) need custom modules the vendor bills for.
- Systems assume **always-online desktop**; African SMEs are **phone-first, connectivity-variable**.
- Enterprise licensing is priced in **USD** and needs consultants — out of reach for the SME majority.

**Our answer:** the money rails, the reconciliation, the payroll, and the tax are **native and
default**, not add-ons. The product is mobile-first, offline-tolerant, and set-up in minutes with
no accountant required. That is the thing Odoo structurally cannot be for this market.

_Sources: techguypeter.com (East-Africa ERP what-works/what-fails), crm.africa (Odoo alternatives /
invoicing for African SMEs), serpa.africa (Odoo SME implementation), businessfront.com (African
payment APIs), World Bank M-Pesa case, versopaid.tech (M-Pesa reconciliation for Kenyan SMEs)._

---

## 2. The five differentiators we must own

| # | Pillar | What "great" looks like | Odoo/foreign gap we exploit |
|---|--------|-------------------------|------------------------------|
| 1 | **Collect** — native payment rails | Paystack / Flutterwave / M-Pesa collection built in; money lands *inside* the ERP against an invoice | Bolt-on connectors, manual matching |
| 2 | **Reconcile** — auto bank + rail + cash | Import/stream transactions; auto-match to invoices/expenses; one screen shows unmatched | Manual, paper-based, add-on cost |
| 3 | **Pay** — local payroll | Salaries with PAYE, pension, NHF/NSSF, net-pay, payslips, bulk disburse via rails | Needs custom statutory module |
| 4 | **Comply** — local tax | VAT (7.5% NG etc.), WHT, tax reports, e-invoice-ready | US/EU-centric, retrofitted |
| 5 | **See** — true state, AI-native | Every dashboard has graphs; AI copilot explains "how's my business?" in plain language | Reports need a consultant |

Everything else (inventory, POS/Shop, Restaurant, invoicing, HR) is **table stakes** we already
have — it must simply be *cleaner and faster* than Odoo.

---

## 3. The experience bar: seamless & elegant, end-to-end

The product is judged as one continuous ribbon — any rough seam breaks the "world-standard" feel.

1. **Website** — a premium, multi-page marketing site in *our* app palette (emerald→indigo on
   soft-white), clear per-vertical pages (Shop, Restaurant, Inventory, Invoicing, Payroll,
   Payments), honest pricing. Fast, calm typography, no clutter.
2. **Sign-up** — from landing CTA to a live workspace in **under 2 minutes**: email → workspace →
   pick your business type → currency/country → *guided first-run* (add first product / first
   invoice / invite a teammate). Zero dead ends.
3. **First 10 minutes** — a "Get started" checklist that walks the owner to first value
   (first sale, first invoice, connect a payment method). Empty states teach, never blank-stare.
4. **Daily usage** — one app at a time (Odoo-style isolation), dense but breathable ERP UI,
   consistent primitives (h-9 controls, shared tables/buttons/breadcrumbs), graphs everywhere,
   AI a keystroke away.

---

## 4. Current state (grounded in the codebase)

> Filled from the codebase map. Legend: ✅ solid · 🟡 partial/needs work · 🔴 stub/missing.

_(reconciled against the repo scan — see §6 backlog for the gaps this exposes)_

- **Onboarding / sign-up:** _<map pending>_
- **Website:** _<map pending>_
- **Payments (collect):** _<map pending>_
- **Reconciliation:** _<map pending>_
- **Payroll:** _<map pending>_
- **Tax:** _<map pending>_
- **Accounting / Invoicing / Inventory / POS / HR / Insights-AI / Admin-billing:** _<map pending>_

---

## 5. Rollout — phased, each phase shippable

**Phase 0 — Foundation & hygiene _(this branch, now)_**
- Cut `feat/v3`; remove dead code / scraper junk / copyright liabilities. ✅
- Lock the plan + north-star; align design tokens & shared UI primitives.

**Phase 1 — The front door (elegance you can see)**
- Rebuild the marketing website: multi-page, app-palette, per-vertical, honest pricing.
- Elegant sign-up → guided first-run wizard (business type, currency, first product, invite team).
- "Get started" checklist + teaching empty states across every module.

**Phase 2 — Collect & Reconcile (the wedge)**
- Payment-rail collection (Paystack first; abstract a `PaymentRail` port for Flutterwave/M-Pesa).
- Payment ⇒ invoice settlement inside the ERP (idempotent, HMAC-verified webhooks).
- Reconciliation workspace: import bank/rail statements, auto-match, unmatched worklist.

**Phase 3 — Pay & Comply**
- Payroll: earnings + statutory (PAYE, pension, NHF), payslips, bulk pay via rail.
- Tax engine: VAT/WHT on invoices & purchases, tax reports, e-invoice-ready export.

**Phase 4 — See & Scale**
- AI copilot on real tenant data (provider-agnostic; Llama-on-Docker option), on-demand charts.
- Mobile-first passes + offline tolerance; performance & polish sweep.

Each phase ends with: QA pass, typecheck/build green, product validation, demo-able flow.

---

## 6. Backlog (fills as the map returns)

_High-leverage, ranked; checked when done._

- [x] Phase 0: branch + dead-code/junk removal
- [ ] _Phase 1+ items enumerated from the codebase map_

---

## 7. Non-negotiable constraints (carried from prior work)

- **Money-path:** every debit/credit/transfer idempotent & retry-safe; webhooks HMAC-verified;
  figures computed in code (AI phrases, never invents numbers).
- **Single-currency:** display the business currency everywhere (no per-record currency picker).
- **App isolation:** Shop ≠ Restaurant; switching apps only via the launcher, never a stray button.
- **Provider-agnostic AI:** `AI_PROVIDER` env; read-only, tenant-scoped.
- **Design system:** h-9 canonical control height; shared `components/ui/*`; emerald→indigo brand.
- **IP:** no cloning of third-party (e.g. doola) assets — patterns/principles only.
