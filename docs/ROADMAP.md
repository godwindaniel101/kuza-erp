# Kuza ERP — Living Roadmap

> This is the single source of truth for sequencing. Updated every cycle. Status: `TODO` · `WIP` · `DONE` · `BLOCKED`.
> Source findings: [AUDIT-2026-06.md](./AUDIT-2026-06.md). Loop: Analyze → Identify → Prioritize → Design → Implement → Test → Validate → Document → Repeat.

## Phase 0 — Foundation & safety (must precede new modules)
These prevent us from building new code on a broken base.

| ID | Item | Why | Status |
|---|---|---|---|
| F1 | Resolve `businessId` removal: finish the migration (decision: REMOVE — schema-only isolation) | Every new entity needs to know if it carries `businessId`. Blocks accounting schema design. | TODO (decided, not yet executed) |
| F2 | `synchronize:false` in prod; fail-fast on missing/weak JWT secret | Prevent prod schema/data loss & token forgery | **DONE** (verified compile) |
| F3 | Per-request tenant connection (kill shared-pool `search_path` race) | Cross-tenant leak is a dealbreaker for SaaS | **DONE** (typeorm-transactional + TenantTransactionInterceptor; verified live: tenant reads now isolated) |
| F4 | Remove permission bypass; propagate roles into JWT request user | Security baseline | **DONE** (verified live: role-less denied, admin 200) |
| F4b | Rate-limit auth endpoints (@nestjs/throttler) | Brute-force protection | TODO |
| F5 | Global `AuditLog` (append-only) + interceptor | Required by accounting & enterprise sales | TODO |
| F6 | Migrate `transfers.service` + `menus.service` off manual `createQueryRunner` to the request transaction (`@Transactional()`) | Manual QueryRunners don't inherit the request's tenant schema → wrong-schema reads/writes | **DONE** (verified live: transfers move stock correctly) |
| F7 | Tenant schema migration strategy: new entity columns don't propagate to existing tenant schemas (only `public` + new tenants get them) | Schema drift across tenants | TODO |

### IMS end-to-end hardening (this cycle — user priority)
| ID | Item | Status |
|---|---|---|
| IMS-1 | Single + bulk item creation | **DONE** (verified: 1 single + 3 bulk) |
| IMS-2 | Inflow double-counting at item level (saved stock twice) | **FIXED + verified** (stock 200→100) |
| IMS-3 | Phantom inflow-item rows via `cascade:true` spread of DTO `items` | **FIXED + verified** (2 rows, no ghosts) |
| IMS-4 | item vs branch stock disagreement | **FIXED + verified** (both = 40) |
| IMS-5 | Allocation method config (FIFO/LIFO/FEFO) — was hardcoded FIFO | **DONE + verified** (Business.allocationMethod + settings + orders wiring; FIFO→100, LIFO→150) |
| IMS-6 | `PATCH /settings` 404 (frontend used PATCH, backend only PUT) → allocation config couldn't save | **FIXED + verified** |
| IMS-7 | FEFO path (expiry-ordered) | **DONE + verified** (3-batch test: FIFO=100, LIFO=300, FEFO=200 — all distinct) |
| IMS-8 | Bulk INFLOW upload (tab-delimited) | **FIXED + verified** (empty `IN ()` SQL crash when a column e.g. supplier was blank; now guarded) |
| IMS-9 | Inflow to MULTIPLE branches | **DONE + verified** (per-branch stock isolated: b1=40, b2=45) |
| IMS-10 | Transfer stock movement was a no-op (items relation returned empty → no deduct/receive) | **FIXED + verified** (load items via direct query) |
| IMS-11 | Transfer received qty added 0 (decimal-as-string: `"0.00" || qty` truthy; `+` concatenated) | **FIXED + verified** (numeric coercion) |

### Frontend UI overhaul (this cycle)
| ID | Item | Status |
|---|---|---|
| UI-1 | Component library: DataTable, FilterBar, BulkUploadWizard, FormField, StatusBadge, StatCard, PageHeader, EmptyState, Skeleton, useTableState, designTokens | **DONE** (tsc clean; under frontend/components/ui/) |
| UI-2 | Refactor inventory list page onto the new components + BulkUploadWizard | **DONE** (tsc clean; API contract unchanged) |
| UI-3 | Pre-existing build error `pages/ims/inventory/[id].tsx:551` (undefined `totalPrice`) | **FIXED** |
| UI-4 | Refactor remaining IMS + HRMS pages onto the library (Phases 2–3 of UI-OVERHAUL.md) | TODO |

### Known follow-up (surfaced this cycle)
- The `transfer.items` OneToMany relation join resolved to the wrong schema; worked around with a direct items query. Root cause (why relation joins to that table mis-resolve under the tenant transaction while ManyToMany user.roles works) deserves a dedicated investigation — may affect other OneToMany relation loads. (F7 territory.)

## Phase 1 — Inventory integrity (TOP PRIORITY)
Make inventory movements the single source of truth.

| ID | Item | Status |
|---|---|---|
| I1 | Introduce immutable `stock_movement` ledger; every inflow/outflow/transfer/adjust writes a movement | **DONE 2026-07-11** (tsc-verified; runtime unverified) |
| I2 | Reconciliation report (`GET /ims/stock-movements/reconciliation`: currentStock vs Σmovements, drift flagged). Pre-ledger stock shows as drift until an opening COUNT adjustment is approved per item | **DONE 2026-07-11** (report only; auto-derive still TODO) |
| I3 | Wrap inflows, orders, transfers in DB transactions (`@Transactional()`) | **DONE 2026-07-11** |
| I4 | Pessimistic locking (`FOR UPDATE`) on allocation + stock rows; forbid negative stock (replaces silent `Math.max(0,…)` clamps — under-stocked flows now 400) | **DONE 2026-07-11** |
| I5 | Inventory adjustments module (reason codes + approval, posts to GL) | **DONE 2026-07-11** |
| I6 | Weighted-average + FIFO valuation stored; valuation/aging reports | TODO |
| I7 | Purchase Order → GRN → 3-way match | TODO |
| I8 | Fix UOM multi-hop conversion; activate FEFO + expiry block | TODO |

Known pre-existing gaps surfaced 2026-07-11 (not fixed): inflow `remove()`/`update()` don't reverse stock; `receiveItems()` double-adds on repeat call; order cancellation doesn't restore stock; `InventoryBatch.remainingQuantity` never decremented on sale.

## Phase 2 — Accounting service (STRATEGIC PRIORITY)
Dedicated module, peer to HRMS. Double-entry from day one.

| ID | Item | Status |
|---|---|---|
| A1 | Chart of Accounts (typed, normal-balance, 20-account seed, lazy per-tenant) | **DONE 2026-07-11** (`modules/accounting`) |
| A2 | Journal Entry + Journal Line (balanced, DRAFT/POSTED/REVERSED, immutable once posted, reversal-only corrections) | **DONE 2026-07-11** |
| A3 | `PostingService` — @Transactional, Σdr=Σcr in cents, idempotent per (sourceType, sourceId) w/ partial unique index backstop | **DONE 2026-07-11** |
| A4 | General Ledger + Trial Balance | **DONE 2026-07-11** |
| A5 | Event hooks: inflow→Inv/AP · order→Rev/Tax/COGS (cash, at creation) · adjustment→Adj-Expense/Inv · invoice send→AR/Rev/Tax · invoice payment→Bank/AR · payroll approve→Wage-Exp/Payables · payroll payout→Payables/Bank | **DONE 2026-07-11** — live-verified: invoice, payment, inflow, adjustment, trial balance balanced, ledger drift 0. **Order + payroll hooks still runtime-unverified.** Adjustment GL value is 0 while item unitCost is 0 (I6 valuation gap) |
| A6 | AR & AP subledgers + aging (invoice summary exists; formal aging TODO) | TODO |
| A7 | Payroll → GL posting | **DONE 2026-07-11** (non-tax deductions credited to Wages Payable pending dedicated liability accounts) |
| A8 | Financial reports: Balance Sheet, P&L (Cash Flow TODO) | **PARTIAL 2026-07-11** |
| A9 | Bank reconciliation; tax management; multi-currency FX | TODO |
| A10 | Fixed assets + depreciation schedules → GL | TODO |

## Phase 3 — Commercial & SaaS layer
| Item | Status |
|---|---|
| Customer master (`modules/customers`) | **DONE 2026-07-11** |
| Invoicing: sequential numbers, line taxes/discounts, partial payments, overdue, void; posts to GL | **DONE 2026-07-11** |
| SaaS billing (`modules/billing`, landlord-scoped): FREE/STARTER/GROWTH/ENTERPRISE plans, 14-day GROWTH trial, usage endpoint, FeatureGateGuard (**built, not yet applied to routes**) | **DONE 2026-07-11** (no payment provider wired — Stripe/Paystack stubs on TenantSubscription) |
| Append-only audit log + interceptor on all mutating requests | **DONE 2026-07-11** |
| Frontend: 19 new pages (accounting ×7, sales ×5, adjustments/ledger ×4, billing, + nav) | **DONE 2026-07-11** (`next build` clean) |
| Still open: data export beyond CSV (Excel/PDF) · report builder · approval workflows · onboarding wizard · employee self-service · RMS receipts/refunds · rate limiting on auth (F4b) · payment provider integration | TODO |

## Phase 4 — Differentiation (the reason a business picks Kuza — see 2026-07-11 strategy discussion)
Positioning: **"the ERP that does your books and collects your money in your country, with zero accounting knowledge required."** Feature parity with Odoo is explicitly NOT the goal.

| # | Bet | Notes |
|---|---|---|
| D1 | **Accountant-in-the-box**: auto-posting (done) + plain-language insights ("you made ₦840k profit; Chidi owes ₦120k, 40 days late"), anomaly alerts | Grow from `ims/ai` stub; incumbents don't offer this to SMEs |
| D2 | **Payments-native invoicing**: Paystack/M-Pesa/bank-transfer link on every invoice; webhook auto-reconciles into GL | Second revenue line (take-rate on collections); provider stubs already on TenantSubscription/InvoicePayment |
| D3 | **Country packs**: NG first (VAT 7.5%, PAYE, pension, WHT), then KE/GH | Replace the US-centric `tax-calculation.service.ts`; Odoo's weak point in these markets |
| D4 | Offline-tolerant POS/stock entry with sync | **Layer 1 DONE 2026-07-11 (verified live):** PWA — installable, manifest+SW, offline read of visited pages, public menus work offline after first scan, offline fallback page; writes never intercepted. **Layer 2 (designed, next):** offline write-queue with client event IDs replayed through the existing idempotent posting pipeline; conflicts surface via adjustments/reconciliation. Scope: sales capture + stock counts ("Count Night" feature) only. Caveat: very first visit precedes SW control — cached from second visit on |
| D7 | **Credit passport**: "Kuza-verified financials" (immutable double-entry books) as underwriting data → supplier-credit/lending partnerships as a revenue line | Added 2026-07-11 — deepest moat candidate; revisit at Gate C |
| D8 | Marketing site: port static HTML v2 → Next.js static-export (shared design system, MDX blog/SEO engine, A/B). v2 HTML ships now; port follows | Founder call 2026-07-11. Also: fix Google OAuth tenant-context bug (audit C-SEC-5) BEFORE promoting social sign-in; enterprise SSO (SAML/OIDC) = Enterprise-plan feature later. Boxicons CDN link in _app.tsx is the last external request in the app — replace with self-hosted glyphs |
| D5 | WhatsApp surface: send invoices, approvals, daily sales digest | Retention play |

## Benchmark targets
Inventory parity → Zoho Inventory / Odoo Inventory. Accounting parity → QuickBooks / Xero core. Multi-tenant SaaS → enterprise RBAC + audit + data residency.
</content>
