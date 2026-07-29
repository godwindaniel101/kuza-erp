# Kuza — Product Truth

> The single source of product truth. Visual decisions live in DESIGN.md; this file is *what Kuza is and does*, and **how the pieces relate** — not how it looks. Keep it honest: real capabilities, with roadmap/partial items flagged in §11.

## 1. One-sentence mechanism
Kuza is an **AI operating system for business** — a multi-tenant ERP that runs a company's entire operation (stock, sales, money, people) across every branch **and** puts AI agents on the front line that sell and serve customers wherever they are, turning conversations and counter sales into structured operations.

## 2. Who it's for
African SMBs and mid-market operators who run real, physical, **multi-branch** businesses and sell where their customers already are — WhatsApp, Instagram, the shop floor, the table, the marketplace. Owners and managers done stitching together a POS, a spreadsheet, an accountant and a DM inbox. Wedge: *"better than Odoo, built for how African businesses actually operate."*

## 3. The core idea (why it's different)
Two products fused into one:
1. **The operating core** — one shared system of record for inventory, selling, invoicing, accounting, payments and people. Every branch and every module reads the same truth.
2. **The AI layer** — **Kuza Copilot** answers questions of the business's own data; **Kuza Agents** work the storefront across channels, take orders and verify payment against your rules, then hand structured orders back into the ERP.

---

## 4. How it works — architecture & relationships (the "how it connects")

**Multi-tenant, schema-per-tenant.** Each business is an isolated Postgres schema; the connection's `search_path` is switched per request. A shared **landlord (`public`)** schema holds cross-tenant data: tenant registry, billing/plans/subscriptions, webhook routes, public menu-slug routes, and the entire **Network** (marketplace directory, catalog, B2B orders, wallets). The tenant record (`Business`) carries brand (logo, colors), currency, country, edition (`businessType`), the stock **allocation method** (FIFO/LIFO/FEFO), and enabled apps.

**Branch scoping is the access spine.** Admins are unscoped (all branches); every other user sees only the branches they're assigned to (no assignment = no branch data), and is 403'd if they request a branch outside their set. Every operational record carries a `branchId`; list endpoints, dashboards and insights all filter by the resolved branch set. Branch managers approve inbound transfers and receive branch notifications.

**The shared stock core is the hub.** Inventory (IMS) owns items, FIFO/FEFO cost batches, and an **immutable stock-movement ledger** (append-only, one signed row per mutation, written in the same DB transaction as the change). Both verticals — retail **Inventory** and **Restaurant** — sell through the *same* order engine, so they share one inventory truth. Item-level and per-branch stock counters always move in lockstep.

**The canonical flow — a sale ripples through everything, in one transaction:**
> **Sale (POS or an agent-drafted order) → allocate stock** (FIFO/LIFO/FEFO, spilling to other branches when the home branch is short) → **write batch traceability** (which batch/supplier each line drew from) → **decrement item + branch stock** → **append SALE rows to the stock ledger** → **post the double-entry journal** (Dr Cash or Dr A/R, Cr Revenue + Tax, Dr COGS / Cr Inventory) → **dashboard & insights reflect it automatically.**

**A DM becomes an order.** The agent runtime reads catalog + knowledge to converse; when it detects buy/pay/deliver intent it drafts a structured order into the same pending-sale → fulfilment path the POS uses, subject to the payment rules in §10.

**Marketplace ties two tenants together.** A B2B purchase order writes a **pending sale into the supplier's schema**; on the supplier's acceptance it fulfils (debiting the supplier's multi-branch stock) and drafts a **sales invoice** to the buyer; on the buyer's receipt it links a **purchases inflow** into the buyer's stock; payment settles instantly via the internal **wallet** (atomic ledger transfer) or as an external claim the supplier confirms.

**Money is collected and reconciled at the edges.** Enabling bank-transfer reserves a provider **virtual account** per branch; the POS opens an "awaiting payment" and a signature-verified provider **webhook** reconciles it and marks the order paid — idempotently.

---

## 5. Packaging model — editions, verticals, commons, assists
- **Editions** chosen at registration: `hospitality · retail · warehouse · accounts · hr`.
- **Verticals** (primary surface, mutually exclusive — a tenant has at most one): **Inventory** (`items`, retail/warehouse) or **Restaurant** (`rms`, hospitality).
- **Commons** (subscribe directly, stack on any vertical): **Invoicing**, **Accounting** (books), **People/HR**, **Payments**.
- **Assists** (not billed alone; enhance a host): **AI** (Copilot + Agents), **Marketplace** (supplier network + wallet).
- **Stock** and **Marketplace** are shared cores owned by no single app. Access is enforced by a feature-gate + permission catalog; a free **trial** (default 14 days, all-access) drops to read-only until subscribed.

---

## 6. Full feature catalog

### 6.1 Accounts, team & security
Email-first signup → email verification → first-run onboarding wizard (business type, country/currency, name) that provisions a fresh tenant schema; **Google** sign-in/up; landlord-based auth (one login across the schema-per-tenant architecture) with JWT + API-token exchange (for the MCP server); **team invitations** (email + public accept link); **roles & permissions** (custom roles over a permission catalog); **user management**; profile; **2FA/TOTP** (authenticator setup, gates sensitive settlement changes).

### 6.2 Multi-branch
Branch CRUD (+ CSV template & bulk-upload), default/active flags, per-branch address/phone/email; **branch-user assignments** with a `manager` flag; **branch-scoped access** everywhere (admins unscoped, others limited to assignments); **per-branch stock, prices, min/max and bin locations**; **inter-branch transfers** (from→to with a status workflow and a manager **receive** step); branch stamped on orders, payments, reservations and every report.

### 6.3 Inventory (IMS) — the shared stock core
Catalog (barcode, cost/sale price, min/max, trackable, `sell-at-POS`, images); **categories & subcategories**; **units of measure + conversions**; **make-up / bill-of-materials** (a parent item assembled from components; selling it depletes each component); **inflows / goods-in** with supplier, invoice no., cost & currency (**approval-gated**), creating **FIFO/FEFO cost batches** (with expiry); the **immutable stock-movement ledger** + a reconciliation report; **stock adjustments & write-offs** (reason-coded, approval-gated, row-locked); **low-stock, out-of-stock and expiring worklists**; **CSV bulk upload** (+ log); **Inventory AI** — demand prediction, reorder suggestions, inventory-health and sales forecast.

### 6.4 Restaurant (RMS) & the POS / selling flow
**POS / live sale** — the order engine both verticals sell through: allocates stock by the tenant's method (FIFO/LIFO/FEFO) with **multi-branch spillover**, writes per-batch cost traceability, decrements item + branch stock, computes cost/profit, and posts a cash sale — all in one transaction; **mark-paid** with payment method/mode; order edit/void; diagnostics.
**Pending-sale → fulfilment** — record an order with no stock debit (`pending`), then **fulfil** (row-locked `FOR UPDATE`, branch-drift-guarded, idempotent) which allocates stock and posts revenue on **credit (A/R)** — the bridge marketplace and agent orders use.
**Dine-in tables** (capacity, status, QR); **reservations** (+ a public booking page); **suppliers** (linkable to a Network business).

### 6.5 Menu creation & the QR menu site
**Menus & menu studio** — menus with categories and items linked to inventory (price, image, availability, order), **AI menu design**; **tables** carry QR codes. **Menu site** — a published public storefront per tenant: pick a **template** (elegant/minimal/noir/gallery/bistro/grand) + theme + accent color, venue info, socials, WiFi, feedback link, show/hide prices, and the ordered menus to publish; **preview, QR generation, publish/unpublish**. Public route `/m/:slug` resolves the tenant via a landlord slug map, then re-checks it's published.

### 6.6 Invoicing (dynamic / white-label) & A/R
**Invoices** — numbered (prefixed sequence), customer, issue/due dates, line items (item, qty, unit price, tax, discount), subtotal/tax/discount/total/amount-paid, status; **send**, **record payment**, **void**; order-managed invoices settle through the order flow. **Dynamic / white-label settings** — logo, accent, template, business display details, tax id/label/rate & show-tax, payment terms, number prefix, footer note, terms, **bank payment details**, and **email delivery** (sender, reply-to, CC, subject/body, attach-PDF, auto-send). **Customers / A/R** — credit limit, tax id; invoices post to Accounts Receivable.

### 6.7 Payments & reconciliation
**Payment methods per branch** (bank transfer, card, mobile money, USSD, cash). **Bank transfer via provider virtual accounts** (Monnify): enabling it reserves a virtual account; POS opens an awaiting payment and polls; a **signature-verified webhook** reconciles the transfer to the oldest awaiting payment (idempotent) and marks the order paid. **Settlement configuration** (2FA-gated). Full **payment-transaction ledger**. *(Card & mobile-money channels are defined but stubbed — see §11.)*

### 6.8 Marketplace, supplier network & wallet
**Directory** of businesses (supplier flag, public catalog) with search; **partnerships** (request/accept/reject/invite — accepting materializes the buyer as a Customer for A/R); **supplier catalog listings** (price, MOQ, availability, bargain-allowed, visibility gated by partnership/public); **B2B purchase orders** (`PO-YYYY-####`) with a full lifecycle *draft → submit → accept → ship → receive → pay → confirm*, bridging into both tenants' stock/invoices as in §4; **internal ledger wallet** — balance can never go negative, append-only entries with `balanceAfter`, **atomic, idempotent transfers** (order payment settles instantly via wallet, or an external claim the supplier confirms); per-tenant market settings.

### 6.9 Accounting / books
**Chart of accounts** (typed, normal-balance, hierarchical, system accounts); **journal entries** (draft → post → reverse, idempotent per source); a **posting engine** that writes balanced entries automatically from operations — sales, goods receipts, inventory adjustments, invoices issued, customer payments and payroll runs; **reports**: trial balance, general ledger, profit & loss, balance sheet.

### 6.10 People / HR / payroll
Employees, org chart, departments, positions, locations; **attendance** (clock in/out, timesheets + approval); **leave** (+ leave types, balances, request/approve); **payroll runs** (approve, process payment, generate pay stubs) with **tax calculation** (tax config + employee tax info) — posting to accounting; **compensation** (salary structures), **benefits**, **performance** (reviews/goals), **learning** (courses/enrollments), **recruitment** (postings/applications); employee self-service.

### 6.11 AI — Copilot, Agents & MCP
**Kuza Copilot** (`/insights`) — asks the business's own data (general or branch-scoped) across modules ("can I afford another employee?"); numbers are **computed in code** and the model only rephrases (it never invents figures), and it flags when a question needs a module the tenant hasn't enabled. **Kuza Agents** — named personas (tone/voice/languages/hours/guardrails/model); **channel connections** (WhatsApp, Instagram, Messenger, Telegram, web chat — real Meta/Telegram connect + OAuth callback); a **read-only conversation runtime** with an injection-hardened prompt and a full **action audit log**, a **human approval queue** for money-path actions, human **takeover/release/reply**; **knowledge/FAQ training**; an **MCP server** so a business can plug Kuza into Claude. Provider-agnostic LLM gateway (Ollama/OpenAI/Anthropic).

### 6.12 Platform
Per-surface **dashboards** (branch-scoped KPIs), **insights digest**; **notifications** (email via Brevo + an in-app inbox, used by the marketplace to notify counterparts); **audit logs**; **billing** (plans, subscription change/checkout, per-app + usage pricing & quotes, app toggles, app-access requests) activated only via a **signature-verified Paystack webhook**; a generic **integrations framework** (provider connections, dedup'd webhook inbox, Monnify/Paystack adapters, tenant-resolving webhook routes); a **super-admin console** over the landlord DB (tenants, apps/plan per tenant, global access-requests, plan & pricing management).

---

## 7. Business model
**Pay for what you use, à-la-carte.** Free = a time-limited trial (all-access), then pay per vertical/common module + usage add-ons (extra branches, extra users); assists are included. Prices are super-admin-editable per currency (local-first). Paid activation only ever happens via a signature-verified payment webhook.

## 8. Positioning line
**Kuza — the AI operating system that runs your business and sells for you.**

## 9. Industries served
Restaurants & hospitality · Retail shops · Wholesale & distribution · Services · Fuel stations · Manufacturing · Pharmacy (roadmap) · any multi-branch, stock-and-sell operation. Each industry gets its own scene, not a generic pitch.

## 10. Money-path stance (non-negotiable — informs every claim)
- Real money moves **only** through idempotent, signature-verified paths (payment webhooks; the wallet's atomic, idempotent, never-negative transfers). Sales/stock/ledger writes happen in one DB transaction so books can't drift from stock.
- **Rules-based payment verification is the model:** you set the conditions (amount, payer name, date, …); payments that pass clear automatically and can move to fulfilment, and only **exceptions** are escalated.
- The **agent runtime is read-only and fully audited** — every turn and tool call is logged, and today it **escalates money-moving intent to a human approval queue** (the auto-clear rules engine is the active direction — see §11). Never claim autonomy beyond what is wired.

## 11. Roadmap / partial (be honest on marketing surfaces)
- **Payments:** bank-transfer via Monnify virtual accounts is live + auto-reconciled; **card & mobile-money** channels are defined but **stubbed** (later phase).
- **Rules-engine auto-clear:** the agent runtime currently escalates *all* money-path intent to the approval queue; automatic rule-based clearing (amount/name/date) is the intended model, not yet the wired default.
- **Invoicing:** white-label settings + email delivery are configured; a hosted **pay-by-link** page / PDF generator is not confirmed in the invoicing module — treat as roadmap unless verified.
- **Verticals:** Pharmacy / Hospital are roadmap; Fuel stations & Manufacturing are represented via the shared stock/BOM core.

## 12. What must stay true on any marketing surface
Real capabilities only (this catalog); no invented customers; prices are **illustrative** unless pulled from the pricing model; no autonomy claims beyond §10. Demonstration data is design material — label it. Don't present stubbed/roadmap items (§11) as live. CTAs point at the app (`/register`, `/login`).
