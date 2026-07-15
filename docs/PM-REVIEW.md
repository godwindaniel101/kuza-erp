# Kuza — PM End-to-End Review (2026-07-11)

> Reviewer: Jimi (PM). Method: code walk of every core flow, file:line evidence throughout.
> Frame: the founder's "Google apps" direction — invoicing/POS/menu/etc. as apps, shared cores underneath, business selection at registration decides what a tenant gets.
> Companion spec: [APPS-MODEL.md](./APPS-MODEL.md).
> One-line verdict: **the shared cores (stock ledger, posting engine) are already app-model-ready; what's missing is the thin layer on top — a real app registry, a wired-up registration step, and one unified Sales core. Most of the "apps model" is a packaging problem, not a rebuild.**

---

## 1. Registration → tenant provisioning

**What happens today** (`backend/src/modules/auth/auth.service.ts:40-169`):
tenant + schema created (`:58-79`), Business row created with `businessType || 'general'` (`:88-93`), admin role (`:111-128`), then defaults: one branch (`:133`) and **default UOMs for every tenant regardless of vertical** (`:137`). No trial subscription is seeded here — billing creates it lazily via `getOrCreateSubscription` (first hit from `feature-gate.guard.ts:49`). Chart of accounts is also lazy-seeded on first accounting use.

**Finding R1 — the registration wizard already asks the right question and then throws the answer away.**
`frontend/pages/register.tsx` step 1 collects a `services` multi-select (state `:21`, toggle `:47-49`, validated min-1 at `:60-62`, checkboxes for 'business' and 'hrms' at `:227-256`). But `handleSubmit` (`:93-99`) sends only `name, email, password, passwordConfirmation, businessName`. **Neither `services` nor `businessType` is ever sent.** The API is ready for it — `RegisterDto` accepts `businessType` with the 4-value enum (`auth/dto/register.dto.ts:29-36`) — so every self-serve tenant lands as `'general'` and the restaurant edition is unreachable through the public funnel. This is simultaneously the biggest dead end in the product and the cheapest win: the "apps selection" step the founder wants is *this exact screen*, rewired.

**Finding R2 — vertical config surface is two columns.** `Business` carries only `businessType` and `allocationMethod` (`common/entities/business.entity.ts:39-48`). There is no `enabledApps`; nothing per-tenant records which capabilities are on. This is where the jsonb goes (see APPS-MODEL.md §3).

**Finding R3 — defaults are one-size-fits-all.** Seeding UOMs + conversions for a services business (`auth.service.ts:137`) is noise; a restaurant should instead get a starter menu structure, a retail shop a default "Walk-in customer". Seeding should be preset-driven per vertical.

## 2. Items — is "item" one shared concept?

**Yes — closer than the module names suggest.** The hub is the IMS inventory item (with `BranchInventoryItem` per-branch stock and `InventoryBatch` for lots/expiry). The two other "item" concepts are already satellites:
- **RMS menu items** bridge via `inventoryItemId` (`rms/entities/menu-item.entity.ts`) — a 1:1 link, *not* a recipe/BOM (no ingredients entity exists). Menus can even be auto-built from IMS items (`rms/menus/menus.service.ts:64-127`). So a "dish" is a presentation skin over an item, exactly the founder's thesis.
- **Invoice lines** carry an optional `itemId` (`invoicing/entities/invoice-line.entity.ts:18`) — a soft reference used for description/price, with **no stock effect** (see §4).

**Finding I1 — InventoryBatch is half-dead.** Batches are created on inflow and FEFO allocation works (ROADMAP IMS-7), but `remainingQuantity` is never decremented on sale — allocation actually sums inflow items + `order_item_inflow_items` (verified live 2026-07-11). Pharmacy readiness (batch-accurate stock, expiry blocking — ROADMAP I8 TODO) is blocked on this.

**Finding I2 — no recipe/BOM.** A restaurant selling a plate of jollof that consumes 3 ingredients cannot model it: menu-item→item is 1:1. This is the single biggest gap for the hospitality wedge's "every plate updates ingredient stock" pitch (GTM §4.1) — today it only works if you stock finished plates.

**Finding I3 — UOM is front-and-center for everyone.** UOMs are seeded for every tenant (`auth.service.ts:137`), "Units of Measure" and "Allocation Method" sit in every tenant's Settings nav (`frontend/components/AppSidebar.tsx:225-226`). A boutique selling "1 dress" or a services firm should never see these. Also: UOM conversion is single-hop only (audit finding, `uom-conversions.service.ts:144`).

**Finding I4 — two category systems.** IMS has `ims/categories`; RMS has its own `MenuCategory` (rms/entities). Fine as presentation vs. stock taxonomy, but the naming invites confusion and the Settings nav exposes only the IMS one (`AppSidebar.tsx:224`).

**What pharmacy/WMS would need that's missing:** live batch decrement + expiry sale-block (I1), controlled-substance flag, batch shown on the sale document; WMS: bin/location within branch, PO→GRN (ROADMAP I7 TODO), barcode field. None of these conflict with the shared item core — they're additive columns/flags.

## 3. Inflow — how generic is "goods in"?

**Verdict: already ~90% vertical-agnostic.** `ims/inflows` receives stock against items, creates batches, writes INFLOW stock movements, and posts Dr Inventory / Cr AP (`inflows.service.ts:392` → `postGoodsReceipt`). Multi-branch receiving works (ROADMAP IMS-9), bulk upload works (IMS-8). Nothing in the flow is food-specific.

**Finding F1 — the restaurant leakage is Suppliers' home address.** Suppliers — needed by *any* vertical that receives goods — live under the restaurant module (`backend/src/modules/rms/suppliers/`), and the nav links them as `/rms/suppliers` (`AppSidebar.tsx:222`). A retail tenant managing suppliers through an "RMS" route is the clearest example of module naming blocking the apps model. Move to a shared/purchasing home.

**Finding F2 — no reversal path.** `remove()`/`update()` on an inflow don't reverse stock, and `receiveItems()` double-adds if called twice (known, ROADMAP line 60). For a "Goods In" app sold standalone, edit/delete must be movement-reversing, not row-editing.

**Finding F3 — no Purchase Order.** Inflow is receipt-only; PO→GRN→3-way match absent (ROADMAP I7). Acceptable for SMEs now; required for the WMS vertical later.

## 4. Outflow — the two selling paths (the critical one)

Today there are two disjoint sale flows:

| | RMS Orders (POS-style) | Invoicing (B2B) |
|---|---|---|
| Trigger | order creation | invoice send / payment |
| Stock | deducts item + branch stock under pessimistic locks, writes SALE movements | **never touches stock** |
| GL | Rev/Tax/COGS posted **cash, at creation** (ROADMAP A5; runtime-unverified) | AR/Rev/Tax on send (`invoicing/invoices.service.ts:385`), Bank/AR on payment (`:438`) |
| Customer | free-text `customerName`/`customerPhone` (`rms/entities/order.entity.ts:45-48`), no Customer FK | Customer entity required (`modules/customers`) |
| Payments | implicit cash | partial payments, Paystack/Monnify webhooks auto-reconcile (`integrations/.../webhooks.service.ts`, idempotent by reference `:104`) |

**Judgment: yes — these should be one Sales core with two front-ends (POS app + Invoicing app).** The evidence that they're already the same transaction wearing different clothes: both end in the same posting engine, both price the same items, and each has exactly the half the other is missing.

**Finding O1 — invoiced goods produce a wrong P&L.** An invoice line with `itemId` posts revenue but no COGS and no stock deduction. Any retail/distribution business (ICP #2, GTM §1) that invoices products gets phantom stock and overstated gross margin. This must be fixed *in the shared core*, not per-app.

**Finding O2 — double-billing is one user mistake away.** Nothing links an order to an invoice; if a shopkeeper rings a sale as an order *and* invoices the customer (plausible for credit-then-pay retail), revenue posts twice and stock deducts once. Today they never overlap only because the flows live in different nav sections for different businessTypes — the apps model, which turns both on for retail, makes a guard mandatory (order↔invoice link + "already invoiced" check).

**Finding O4 — retail has NO sale flow at all.** Neither path fits ICP #2: orders are restaurant-shaped (table link, menu items, kitchen statuses `preparing/ready`), invoices are B2B-shaped (customer entity, send, AR). A shopkeeper selling a bag of rice for cash has no screen. The missing core app is a simple POS sell screen — search/scan → qty → cash/transfer → receipt → stock deducted + books posted — and ~90% of its machinery already exists inside `orders.service.ts` (locked stock deduction, SALE movements, cash-sale posting): it needs the tables/menu wrapping removed, not new plumbing. This is the retail wedge (D5 Gate C: "then retail wedge") sitting unbuilt on top of built infrastructure.

**Finding O3 — asymmetric maturity.** Orders lack: customer link, discounts/refunds/receipts (audit §4), cancellation stock-restore (ROADMAP:60). Invoicing lacks: stock/COGS. A Sales core (SalesDocument: type=POS_RECEIPT|INVOICE, lines→items, fulfilment=immediate|none, settlement=cash|AR) resolves both lists at once. `orders.service.ts` is 1,183 lines — it's already carrying core-sized weight in an app-shaped module.

## 5. Stock movements / adjustments / transfers — the shared ledger

**Verdict: this is the crown jewel, and it's already vertical-agnostic.** Immutable `stock_movement` ledger written by all four writers — inflows, orders (SALE), transfers, adjustments — with a reconciliation endpoint (currentStock vs Σmovements) (ROADMAP I1/I2, verified). Adjustments carry reason codes + approval and post to GL (`ims/adjustments/adjustments.service.ts:313` → `postInventoryAdjustment`). Nothing restaurant-flavoured anywhere in it.

**Finding S1 — adjustment GL value posts 0 while item `unitCost` is 0** (ROADMAP A5 note) — the I6 valuation gap makes write-offs financially invisible. **S2:** transfers write movements but no GL (defensible — same legal entity — but branch-level P&L, decision D3's per-branch profit promise, will eventually want it). **S3 (naming):** for the apps model this trio should present as one "Stock Control" capability inside the Items app, not three sidebar entries.

## 6. Accounting + insights — the shared "books" app

Posting engine is genuinely core-shaped: idempotent per (sourceType, sourceId) with a unique-index backstop (ROADMAP A3), hooks from inflows (`inflows.service.ts:392`), adjustments (`adjustments.service.ts:313`), invoices (`invoices.service.ts:385,438`), payroll (`hrms/payroll/payroll.service.ts:201,262`), orders (`rms/orders/orders.service.ts:28`). Reports: TB/GL done, P&L + Balance Sheet partial (A8).

**What's missing for Books to serve any vertical:** AR/AP aging (A6), cash flow, bank reconciliation, sales-tax handling beyond flat posting — the NG VAT 7.5% country pack (D3) is the real blocker for the "no accountant required" promise. **Order and payroll postings are still runtime-unverified** (ROADMAP A5) — a launch-checklist item, not a design gap.

**Finding B1 — Insights has a backend and no face.** `modules/insights` exists (controller/service/dto) but there is **no frontend page for it anywhere** (route sweep confirmed). Meanwhile the `dashboard` module — what every tenant sees daily — computes restaurant ops only (period sales from orders, active orders, table occupancy, low stock) and reads **nothing** from accounting/invoicing. A services tenant's home screen is about tables they don't have. This directly breaks decision D3 ("Did I make money today?" as north star) for 3 of 4 businessTypes.

## 7. Candidate apps: Kuza Menu, billing, HRMS

- **Kuza Menu is already shaped like an app.** `menu-sites` is presentation-only: it references RMS Menu/MenuCategory/MenuItem (`menu-sites.service.ts:11-13`), stores `menuIds` jsonb + theming, serves publicly via landlord `menu_slug_routes`, renders "Powered by Kuza" (`frontend/pages/m/[slug].tsx:48`, `components/menu-templates/shared.tsx:243`). Clean dependency: kuza-menu → menu → items. The AI menu-design endpoint is a hardcoded mock (`rms/menus/menus.controller.ts:56-91`) — don't demo it.
- **Billing is app-model-ready but the vocabulary is broken.** Plans carry `limits.modules`: FREE `['ims','rms']`, STARTER +hrms, GROWTH +accounting+invoicing, ENTERPRISE +audit (`billing/billing.service.ts:30-65`). `FeatureGateGuard` + `@RequireModule()` exist and are **applied to zero routes** (self-documented: `billing/guards/feature-gate.guard.ts:20`; TRIALING bypasses everything `:52`). Worse, the frontend nav gates on *different* keys — the sales section uses `moduleKeys: ['sales']` (`AppSidebar.tsx:150`) while plans say `'invoicing'`, papered over by a `MODULE_ALIASES` fuzzy **substring** match (`AppSidebar.tsx:98-101`, `m.includes(a) || a.includes(m)`). There is no canonical app-key vocabulary anywhere — that's the first thing APPS-MODEL.md fixes.
- **Sidebar progressive disclosure is the proto-apps-model.** `AppSidebar.tsx:242-253`: restaurant gets `[overview, restaurant, menuStudio, inventory, money, workspace]`, everyone else `[overview, inventory, sales, accounting, hr, workspace]` — a hardcoded 2-way switch where the registry should be. "All modules" deliberately bypasses the plan filter (`:243-245`).
- **HRMS ("People") is one app with 14 rooms, half unfurnished.** Nav promises recruitment/performance/learning/benefits/compensation (`AppSidebar.tsx:210-214`) over thin/stub services. Payroll's tax engine is US-only (SS 6.2%/$160,200 `hrms/payroll/tax-calculation.service.ts:263-282`, Medicare `:285-310`, 2024 US deductions `:334-348`, default country "US" `:47`), gated by `ENABLE_US_PAYROLL` (`payroll.service.ts:38`) — decision D1 correctly keeps it out of NG pilots. In the apps model, **payroll must be a separate app from people**, so D1 is a toggle, not a code gate.
- Notifications mailer is real but two referenced `.hbs` templates are missing (send fails, caught at `:31`).

---

## Top-10 fixes, ranked (effort: S ≤1d, M ≤1wk, L >1wk)

| # | Fix | Why first | Effort |
|---|---|---|---|
| 1 | Wire registration: send `businessType`, map step-1 services → seed `Business.enabledApps` (register.tsx:93-99, auth.service.ts:88-93) | The funnel's vertical selection currently does nothing; unblocks everything below | **S** |
| 2 | Canonical app-key registry + apply `FeatureGateGuard`/`@RequireApp` to top-level controllers; delete `MODULE_ALIASES` fuzzy match | One vocabulary for plans, nav, gating; guard is built and idle | **M** |
| 3 | **Retail POS sell screen** (Finding O4): search/scan → qty → cash/transfer → receipt, reusing the orders service's stock-deduction + posting machinery minus tables/menus; include optional customer link + receipts here | Retail vertical currently has NO sale flow; infrastructure already built | **M** |
| 4 | Dashboard v2: accounting-driven "Did I make money today?" + vertical-aware panels; surface insights (no UI today) | D3 north star broken for 3 of 4 businessTypes; retention screen | **M** |
| 5 | Sales core step 1: COGS + stock deduction on invoice lines with `itemId`; order↔invoice link to block double-billing | Wrong P&L for retail ICP; double-count risk once apps co-exist | **M** |
| 6 | Move suppliers out of `rms/` to shared purchasing (keep route alias) | Generic concept in vertical namespace; blocks Goods-In app | **S** |
| 7 | Recipe/BOM: menu-item → many ingredients with quantities | The hospitality wedge's core pitch (plate → ingredient stock) is 1:1-only today | **L** |
| 8 | Inflow reversal + `receiveItems` idempotency; order-cancel stock restore | Ledger correctness for the Goods-In app | **M** |
| 9 | Item valuation (I6): store unit cost, fix ₦0 adjustment postings | Write-offs are financially invisible | **M** |
| 10 | Batch `remainingQuantity` decrement + FEFO expiry-block (I8) | Pharmacy vertical prerequisite; food-safety credibility for hospitality | **M** |

Deliberately excluded (already tracked): auth rate limiting (F4b), runtime verification of order/payroll postings, missing email templates — launch-checklist items, not model questions.
