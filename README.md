# Kuza — the AI operating system for business

> One system to run your entire operation — **stock, sales, money and people, across every branch** — and put **AI agents on the front line** that sell and serve customers wherever they are. Built for African businesses. _For Africa, by Africa._

This README is the consolidated product reference (product, how it works, features, roadmap, and the **portal design system**). The exhaustive, code-grounded feature truth lives in [`PRODUCT.md`](./PRODUCT.md).

---

## Contents
1. [What Kuza is](#1-what-kuza-is)
2. [Why Kuza wins — the wedge](#2-why-kuza-wins--the-wedge)
3. [How it works — architecture & the flow](#3-how-it-works--architecture--the-flow)
4. [Packaging — editions, verticals, commons, assists](#4-packaging--editions-verticals-commons-assists)
5. [Features](#5-features)
6. [The AI layer](#6-the-ai-layer--copilot-agents-mcp)
7. [Money-path stance](#7-money-path-stance)
8. [Repository layout & running it](#8-repository-layout--running-it)
9. [Future plans / roadmap](#9-future-plans--roadmap)
10. [Portal design system (consistency contract)](#10-portal-design-system-consistency-contract)

---

## 1. What Kuza is

Kuza is a **multi-tenant ERP fused with an AI layer**. Two products in one:

1. **The operating core** — one shared system of record for inventory, selling, invoicing, accounting, payments and people. Every branch and every module reads the same truth.
2. **The AI layer** — **Kuza Copilot** answers questions of the business's own data; **Kuza Agents** work the storefront across channels, take orders and verify payment against your rules, then hand structured orders back into the ERP.

**Who it's for:** African SMBs and mid-market operators who run real, physical, **multi-branch** businesses and sell where their customers already are — WhatsApp, Instagram, the shop floor, the table, the marketplace — and are done stitching together a POS, a spreadsheet, an accountant and a DM inbox.

**Positioning line:** *Kuza — the AI operating system that runs your business and sells for you.*

---

## 2. Why Kuza wins — the wedge

Foreign ERPs (Odoo, SAP, QuickBooks, Sage) were designed for developed markets and *retro-fitted* to Africa — every local reality becomes a paid customization. (~75% of African ERP implementations fail to deliver.) Kuza makes the things those systems bolt on **native and default**:

- **Money rails are native** — collection, virtual accounts and reconciliation are built in, not a clunky third-party connector.
- **Reconciliation across bank + transfer + cash** happens automatically instead of on paper.
- **Local tax & payroll statutory** (NG VAT/WHT/PAYE/pension …) are first-class, not billed add-ons.
- **Mobile-first, offline-tolerant** — African SMEs are phone-first and connectivity-variable; Kuza is a PWA that tolerates patchy networks.
- **Minutes to set up, local-currency pricing** — no consultants, no USD enterprise licensing.

Feature parity with Odoo is explicitly **not** the goal. The goal: *"the ERP that does your books and collects your money in your country, with zero accounting knowledge required — and sells for you in the DMs."*

---

## 3. How it works — architecture & the flow

**Multi-tenant, schema-per-tenant.** Each business is an isolated Postgres schema (the connection's `search_path` is switched per request). A shared **landlord (`public`)** schema holds cross-tenant data: the tenant registry, billing/plans/subscriptions, webhook routes, public menu-slug routes, and the entire **Network** (marketplace directory, catalog, B2B orders, wallets).

**Branch scoping is the access spine.** Admins are unscoped; every other user sees only the branches they're assigned to (no assignment = no data), and is 403'd for a branch outside their set. Every operational record carries a `branchId`; list endpoints, dashboards and insights all filter by the resolved branch set.

**The shared stock core is the hub.** Inventory owns items, FIFO/FEFO cost batches, and an **immutable stock-movement ledger** (append-only, one signed row per mutation, written in the same DB transaction as the change). Both verticals — retail **Inventory** and **Restaurant** — sell through the *same* order engine, so they share one inventory truth; item-level and per-branch counters always move in lockstep.

**The canonical flow — a sale ripples through everything, in one transaction:**

```
Sale (POS or an agent-drafted order)
  → allocate stock (FIFO/LIFO/FEFO, spilling to other branches when short)
  → write batch traceability (which batch/supplier each line drew from)
  → decrement item + branch stock
  → append SALE rows to the immutable stock ledger
  → post the double-entry journal (Dr Cash/AR · Cr Revenue+Tax · Dr COGS/Cr Inventory)
  → dashboard & insights reflect it automatically
```

- **A DM becomes an order** — the agent runtime reads catalog + knowledge to converse; on buy/pay/deliver intent it drafts a structured order into the same pending-sale → fulfilment path the POS uses (subject to the payment rules in §7).
- **Marketplace ties two tenants together** — a B2B purchase order writes a *pending sale into the supplier's schema*; on acceptance it fulfils (debiting the supplier's stock) and drafts a **sales invoice** to the buyer; on receipt it links a **purchases inflow** into the buyer's stock; payment settles via the internal **wallet** (atomic, idempotent transfer) or an external claim the supplier confirms.
- **Money is collected at the edges** — enabling bank-transfer reserves a provider **virtual account** per branch; the POS opens an "awaiting payment" and a signature-verified provider **webhook** reconciles it and marks the order paid, idempotently.

---

## 4. Packaging — editions, verticals, commons, assists

- **Editions** (chosen at registration): `hospitality · retail · warehouse · accounts · hr`.
- **Verticals** (primary surface, mutually exclusive — at most one): **Inventory** (`items`) or **Restaurant** (`rms`).
- **Commons** (subscribe directly, stack on any vertical): **Invoicing**, **Accounting**, **People/HR**, **Payments**.
- **Assists** (not billed alone; enhance a host): **AI** (Copilot + Agents), **Marketplace** (supplier network + wallet).
- **Stock** and **Marketplace** are shared cores owned by no single app. A free **trial** (default 14 days, all-access) drops to read-only until subscribed. Pricing is **à-la-carte**, super-admin-editable per currency; paid activation only ever happens via a signature-verified webhook.

---

## 5. Features

_Condensed catalog — see [`PRODUCT.md`](./PRODUCT.md) for the exhaustive, file-referenced list._

- **Accounts, team & security** — email signup → verify → onboarding wizard (provisions a tenant schema); Google sign-in; landlord auth + API-token exchange (MCP); team invitations; custom **roles & permissions**; **2FA/TOTP** (gates sensitive settlement changes).
- **Multi-branch** — branch CRUD (+ bulk upload), branch-user assignments with a manager flag, **branch-scoped access everywhere**, per-branch stock/prices/min-max/bins, and **inter-branch transfers** with a manager receive step.
- **Inventory (the shared stock core)** — catalog (barcode, cost/sale price, images, sell-at-POS), categories/sub-categories, units of measure + conversions, **make-up / bill-of-materials**, approval-gated **goods-in with FIFO/FEFO cost batches**, the **immutable stock-movement ledger** + reconciliation, approval-gated **adjustments/write-offs**, low-stock/out-of-stock/expiring worklists, CSV bulk upload, and **Inventory AI** (demand, reorder, health, forecast).
- **Restaurant & the POS / selling flow** — the order engine both verticals sell through: FIFO/LIFO/FEFO allocation with **multi-branch spillover**, per-batch cost traceability, cost/profit, cash posting; **pending-sale → fulfilment** (row-locked, idempotent, posts A/R); dine-in **tables** (QR), **reservations** (+ public booking), suppliers.
- **Menu creation & QR menu site** — menus/menu studio with items linked to inventory + **AI menu design**; a published public **menu site** per tenant (templates, theme, accent, venue info, socials, WiFi, show/hide prices, preview, QR, publish) at `/m/:slug`.
- **Invoicing (dynamic / white-label) & A/R** — numbered invoices with line taxes/discounts, send / record payment / void; **white-label settings** (logo, accent, template, tax, prefix, footer, terms, bank details, email delivery/auto-send); customers with credit limits; posts to Accounts Receivable.
- **Payments & reconciliation** — per-branch payment methods; **bank transfer via provider virtual accounts (Monnify)** with a signature-verified reconciliation **webhook**; 2FA-gated settlement config; full payment-transaction ledger. _(Card & mobile-money channels are defined but stubbed — roadmap.)_
- **Marketplace, supplier network & wallet** — business directory + partnerships, supplier catalog listings (price/MOQ/bargain), **B2B purchase orders** (draft→submit→accept→ship→receive→pay→confirm) bridging both tenants' stock/invoices, and an **internal ledger wallet** (never-negative, append-only, atomic idempotent transfers).
- **Accounting / books** — chart of accounts, journal entries (draft→post→reverse, idempotent per source), an auto-posting engine driven by operations, and reports (trial balance, general ledger, P&L, balance sheet).
- **People / HR / payroll** — employees, org chart, departments/positions/locations, attendance & timesheets, leave, **payroll runs with tax calculation** (posts to GL), compensation, benefits, performance, learning, recruitment, self-service.
- **AI** — Copilot, Agents & an MCP server (see §6).
- **Platform** — per-surface dashboards, insights digest, notifications (email + in-app inbox), audit logs, billing/pricing & app-access requests, an integrations framework (webhook inbox, Monnify/Paystack adapters), and a super-admin console.

---

## 6. The AI layer — Copilot, Agents, MCP

- **Kuza Copilot** (`/insights`) — asks the business's own data (general or branch-scoped) across modules ("can I afford another employee?"). Numbers are **computed in code**; the model only rephrases (it never invents figures) and flags when a question needs a module the tenant hasn't enabled.
- **Kuza Agents** — named personas (tone/voice/languages/hours/guardrails/model) on **WhatsApp, Instagram, Messenger, Telegram and web chat** (real Meta/Telegram connect). A **read-only, injection-hardened conversation runtime** with a full **action audit log**, a **human approval queue** for money-path actions, and human takeover/reply. Trained on catalog + FAQ knowledge.
- **MCP server** — a business can plug Kuza into Claude (read-only tools over its own data). Provider-agnostic LLM gateway (Ollama / OpenAI / Anthropic).

---

## 7. Money-path stance (non-negotiable)

- Real money moves **only** through idempotent, signature-verified paths (payment webhooks; the wallet's atomic, never-negative transfers). Sales/stock/ledger writes happen in one DB transaction so books can't drift from stock.
- **Rules-based payment verification is the model:** you set the conditions (amount, payer name, date, …); payments that pass clear automatically and can move to fulfilment; only **exceptions** are escalated.
- The **agent runtime is read-only and fully audited** — every turn and tool call is logged; today it escalates money-moving intent to a human approval queue (rules-based auto-clear is the active direction). Never claim autonomy beyond what is wired.

---

## 8. Repository layout & running it

Monorepo — each deployable service owns its own `Dockerfile`; `docker-compose.yml` orchestrates them.

```
kuza-erp/
├─ backend/        NestJS API — the ERP core (Dockerfile + Dockerfile.dev)
├─ user-portal/    Next.js operator portal / dashboard (Dockerfile + Dockerfile.dev)
├─ website/        Marketing site (static export)
├─ mcp/            MCP server (plug Kuza into Claude)
├─ mobile/         Mobile app
├─ docker/ infra/  Ops config
├─ docs/           Portal UI reference (design-refs/)
├─ docker-compose.yml / docker-compose.dev.yml
└─ PRODUCT.md      Canonical product-truth doc
```

**Run the stack (dev):**
```bash
docker compose -f docker-compose.dev.yml up   # postgres · backend · user-portal · ollama (+ website)
```
Services (dev defaults): backend API `:4001`, operator portal `:5001`, Postgres, Ollama (local LLM). Production images build from each service's `Dockerfile` (override via `DOCKERFILE_BACKEND` / `DOCKERFILE_FRONTEND`).

**Architecture invariants:** schema-per-tenant isolation (never query across tenants); every mutation writes through the request-scoped tenant transaction; money paths stay idempotent and signature-verified (§7).

---

## 9. Future plans / roadmap

Sequenced by phase (`TODO · WIP · DONE`). Foundation & inventory-integrity & the accounting service are largely **done**; the commercial/SaaS layer is in place. The differentiation bets are where Kuza pulls away:

**Near-term hardening**
- Rate-limit auth endpoints; per-tenant schema-migration strategy (new columns must reach existing tenant schemas); weighted-average + FIFO valuation & aging; Purchase-Order → GRN → 3-way match; UOM multi-hop + expiry blocking.

**Differentiation bets**
- **D1 · Accountant-in-the-box** — auto-posting (done) + plain-language insights ("you made ₦840k profit; Chidi owes ₦120k, 40 days late") and anomaly alerts.
- **D2 · Payments-native invoicing** — pay-link on every invoice (Paystack / M-Pesa / bank transfer); webhook auto-reconciles into the GL. _(A second revenue line via take-rate.)_
- **D3 · Country packs** — NG first (VAT 7.5%, PAYE, pension, WHT), then KE / GH; replaces the US-centric tax service.
- **D4 · Offline-tolerant POS/stock** — PWA layer done (installable, offline reads, public menus offline); next: an offline write-queue replayed through the idempotent posting pipeline ("Count Night").
- **D5 · WhatsApp surface** — send invoices, approvals and a daily sales digest.
- **D7 · Credit passport** — "Kuza-verified financials" (immutable double-entry books) as underwriting data → supplier-credit / lending partnerships.

**Also planned:** rules-engine auto-clear for agent payments (§7); card & mobile-money payment channels; data export (Excel/PDF); report builder; approval workflows; enterprise SSO (SAML/OIDC); Pharmacy / Hospital verticals.

**Benchmark targets:** inventory → Zoho / Odoo Inventory; accounting → QuickBooks / Xero core; SaaS → enterprise RBAC + audit + data residency.

---

## 10. Portal design system (consistency contract)

> The **operator portal** (`user-portal/`) design system — the acceptance contract for the app UI. Numbers and rules, not adjectives. (Marketing-site design is intentionally out of scope here.)

**Thesis** — one calm, warm-paper operator's console that *dresses for the trade it runs*; the vertical you're in re-tints the accent. Refuses generic SaaS blue-on-grey and the "no motion" rut. Mode: **Operate** — scanability and consistency first; brand lives in precise details, never decoration.

**Type** — Display **Bricolage Grotesque** (`font-display`): page/section/card/modal titles, KPI numbers (`tabular-nums`, `tracking-tight`). Body **Hanken Grotesk** (`font-sans`). Both self-hosted via `next/font`. Scale: page title `1.35rem` · section `15px semibold` · body `13px` · metadata `12px` · overline `11px`. No ad-hoc `text-2xl/3xl` in the shell.

**Color** — warm-paper canvas `#faf9f7` (`bg-canvas`) / `dark:bg-gray-950`; cards `bg-white` / `dark:bg-gray-900`. **Accent is CSS-variable-driven and follows the current app** (`data-app` → tokens: `bg-accent`, `text-accent`, `bg-accent-soft`, `ring-accent-ring`, `bg-accent-gradient`) — restaurant→ember, inventory→cobalt, accounting→indigo, hr→rose, payments→violet, default→teal. **Semantic** colors are separate and never the accent: success emerald, warning amber, danger red, info sky (status = colour **+** icon via `StatusBadge`, never colour alone). Charts: series-1 `var(--accent)`, series-2 `#d97706`, positive `#10b981` (hand-rolled SVG).

**Space & rhythm** — generous by default. Sections stack `space-y-6`; cards `p-6` (StatCards `p-5`); more space above a heading than below. Page gutter from `Layout` — pages don't add their own `p-6`/`min-h-screen`. Control rhythm: chrome `h-8`, content `h-9`, POS `h-11`, auth `h-10`. Page widths via `Page.tsx`: **full** (tables/dashboards) · **wide** (reports) · **narrow** (forms).

**Motion** — one curve `--ease-out-expo` `cubic-bezier(0.16,1,0.3,1)`; speeds `140 / 280 / 460ms`; arrive from an already-visible default, never bounce. Per-navigation `.page-enter` (opacity only). Per-view `.kz-stagger` (children rise once). `.kz-lift` on clickable cards; buttons `active:scale-[0.98]`. One authored moment per view; everything disabled under `prefers-reduced-motion`.

**Elevation** — resting cards: **ring only** (`ring-1 ring-gray-950/[0.04]`) on `rounded-2xl` + one soft `shadow-card` (never a >1px border under a shadow — the "ghost card"). Radii 12–16px; pills only for small controls. Floating surfaces: `shadow-popover` (light) / `dark:ring-1`. One elevation per surface.

**Modal** — the canonical focused action (`components/Modal.tsx`): warm backdrop blur, single-elevation panel, expo-out scale+fade, Bricolage title, ESC + outside-click, body-scroll lock. A modal is only for a task that needs protected focus.

**Components (edit these, not one-off pages)** — `Button` (`primary|secondary|ghost|danger` × `sm h-8|md h-9`), `Card`, `PageHeader` (18px display title, actions right, breadcrumbs), `DataTable` (h-11 rows, 11px headers, hairline dividers), `StatCard`, `StatusBadge`, `FilterBar` (h-9), `EmptyState`, `Modal`, `Icon`. Canonical control sizing is captured above; when in doubt use the primitive, don't hand-roll.

**Icons** — one distinctive **hand-drawn 24×24 outline family** (`components/ui/Icon.tsx`, stroke 1.5, rendered 14–18px). One family, one stroke weight, one corner language; legacy boxicons are being migrated out.

**Craft floor (absolute refusals)** — no eyebrow/kicker above a heading; no gradient text; no glass/blur as decoration; no colored `border-left/right` >1px (use tinted fill + full ring); no sparkline/progress-ring standing in for content; no monospace-as-costume; no nested cards; no modal for a task that needs no protected focus. Tracking floor `-0.04em`. Every interactive element ships hover/focus/disabled/loading/empty states **and** a dark variant.

**Dark mode** — class strategy (`.dark`); every colour ships a dark variant (tinted fills `dark:bg-*-500/10`); charts validated on both surfaces. Light leads (a daytime operator's console); dark is first-class but secondary.
