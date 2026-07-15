# Kuza Apps Model — Target Architecture Spec

> Author: Jimi (PM), 2026-07-11. Implements the founder direction: "services modelled like Google apps — invoicing is an app, modules shared by RMS/IMS/WMS/pharmacy; business selection at registration determines the modules a business gets — and even then, not everything."
> Evidence base: [PM-REVIEW.md](./PM-REVIEW.md). Principle: **apps are packaging; cores are code.** The stock ledger, posting engine, and item master stay singular; apps are named bundles of routes + permissions + terminology over them.

## 1. App registry (canonical)

One vocabulary, used by plans (`plan.limits.modules`), the guard, the sidebar, and the launcher. Kills the `MODULE_ALIASES` fuzzy match (`AppSidebar.tsx:98-101`). Registry lives in code as a typed constant (`backend/src/common/apps/app-registry.ts`), exposed via `GET /apps`.

| Key | Display name | Value prop (one line) | Routes owned | Backend modules | Permissions implied | Depends on |
|---|---|---|---|---|---|---|
| `items` | Items | Your catalog and stock, one source of truth across branches | `/ims/inventory`, `/ims/stock-movements`, `/ims/adjustments`, `/ims/transfers`, `/settings/categories`, `/settings/uoms`, `/settings/allocation-method` | `ims/inventory`, `ims/stock-movements`, `ims/adjustments`, `ims/transfers`, `ims/categories`, `ims/uoms`, `ims/uom-conversions` | `inventory.*`, `adjustments.*`, `transfers.*`, `uoms.*` | — |
| `goods-in` | Goods In | Receive stock and know exactly what arrived, from whom, at what cost | `/ims/inflows`, `/purchasing/suppliers` (today `/rms/suppliers`) | `ims/inflows`, suppliers (relocated from `rms/suppliers`) | `inflows.*`, `suppliers.*` | `items` |
| `pos` | Point of Sale | Ring up sales; stock and books update themselves | `/rms/orders` (→ `/pos`) | `rms/orders` (→ Sales core, POS front-end) | `orders.*` | `items` |
| `tables` | Tables | Floor plan, table status, orders per table | `/rms/tables` | `rms/tables` | `tables.*` | `pos` |
| `menu` | Menu | Build and price menus from your items | `/rms/menus`, `/menu-studio` | `rms/menus` | `menus.*` | `items` |
| `kuza-menu` | Kuza Menu | Free QR menu website for your customers (the wedge — never paywalled) | `/menu-studio/sites`, public `/m/[slug]` | `menu-sites` | `menu-sites.*` | `menu` |
| `customers` | Customers | Who buys from you and who owes you | `/sales/customers` | `customers` | `customers.*` | — |
| `invoicing` | Invoicing | Send invoices, get paid, AR tracked automatically | `/sales/invoices` | `invoicing` | `invoices.*` | `customers` (+ `items` optional, for line items) |
| `books` | Books | Double-entry accounting that writes itself — no accountant required | `/accounting/*` | `accounting` | `accounting.*` | — (receives postings from any app) |
| `insights` | Insights | "Did I make money today?" — plain-language daily answers | `/` (dashboard), `/insights` | `insights`, `dashboard` | `reports.view` | `books` |
| `people` | People | Employees, attendance, leave in one place | `/hrms/*` except payroll | `hrms/*` except payroll | `employees.*`, `leaves.*`, `attendance.*` | — |
| `payroll` | Payroll | Run payroll with your country's taxes (per country pack) | `/hrms/payroll` | `hrms/payroll` | `payroll.*` | `people` + country pack (D1: hidden in NG until NG pack ships) |
| `payments` | Payments | Paystack/Monnify collection links; auto-reconciled into your books | `/settings/integrations` | `integrations` | `integrations.*` | `books` |
| `audit` | Audit Trail | Every action, by whom, forever (Enterprise) | `/settings/audit` | `common/audit` | `audit.view` | — |

Notes:
- **Splitting `ims` → `items` + `goods-in`** matches the founder's "inflow is its own module"; stock-control (movements/adjustments/transfers) stays inside `items` — it's the ledger, not a product. A future `wms` edition may promote transfers/receiving into their own app; the registry supports adding keys without migration.
- **Splitting `hrms` → `people` + `payroll`** turns decision D1 (payroll gated out of NG pilots) from an env-var (`payroll.service.ts:38`) into a registry flag.
- **`pos` and `invoicing` are two front-ends over one future Sales core** (PM-REVIEW §4). The registry ships now; the core refactor is Phase 3.
- Old plan keys map: `ims→[items,goods-in]`, `rms→[pos,tables,menu,kuza-menu]`, `invoicing→[invoicing,customers]`, `accounting→[books,insights,payments]`, `hrms→[people,payroll]`, `audit→[audit]`. Applied at read time first (no data migration), then plan seeds updated.

## 2. Vertical presets + terminology skins

Presets seed `enabledApps` at registration. **Not everything on by default** (founder-explicit): each preset is the minimum honest set; everything else is one toggle away in the Apps page.

| App | Restaurant / Hospitality | Retail | Services | General | Pharmacy (future) | Warehouse/WMS (future) |
|---|---|---|---|---|---|---|
| items | ✅ "Ingredients" | ✅ "Products" | — | ✅ "Items" | ✅ "Medicines" | ✅ "SKUs" |
| goods-in | ✅ "Deliveries" | ✅ "Purchases" | — | ✅ "Purchases" | ✅ "Supplies" | ✅ "Receiving" |
| pos | ✅ "Orders" | ✅ "Checkout" | — | — | ✅ "Dispensing" | — |
| tables | ✅ | — | — | — | — | — |
| menu | ✅ "Menu" | — | — | — | — | — |
| kuza-menu | ✅ | — | — | — | — | — |
| customers | — | ✅ | ✅ "Clients" | ✅ | ✅ "Patients" | ✅ |
| invoicing | — | ✅ | ✅ | ✅ | — | ✅ "Dispatch notes" |
| books | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| insights | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| people | — | — | ✅ "Team" | — | — | — |
| payroll | — | — | — | — | — | — |
| payments | — | ✅ | ✅ | ✅ | — | — |

- `books` + `insights` are on for everyone — auto-posting is the moat (GTM positioning) and insights is the retention screen (D3).
- Restaurant deliberately omits `invoicing`/`customers` (cash POS business; enable on demand) — and `payroll` everywhere until country packs (D1).
- **Terminology skin** = a per-vertical label map keyed by app key + noun, resolved in the existing `tr()` layer (`AppSidebar.tsx` already wraps every label in `tr('key','Default')`). Skin covers nav labels, page titles, empty states, and the item-form noun. It does NOT rename entities, routes, or permissions — skin-deep by design. Stored alongside the registry: `TERMINOLOGY[businessType][appKey]`.
- Pharmacy preset additionally forces `allocationMethod='FEFO'` and (once ROADMAP I8 lands) expiry sale-block; WMS preset enables the PO/GRN flow when built. Presets can carry config, not just app lists.

## 3. Data model & enforcement

**Where enabledApps lives:** `Business.enabledApps: string[]` (jsonb, nullable) — next to `businessType`/`allocationMethod` (`common/entities/business.entity.ts:39-48`).
- `null` ⇒ legacy fallback: derive from `businessType` preset at read time (zero-downtime migration; existing tenants unaffected until they touch the Apps page).
- **Effective apps = enabledApps ∩ appsAllowedByPlan(plan.limits.modules)**, computed at read time — never stored, so plan up/downgrades apply instantly. TRIALING keeps its current behavior (plan side passes everything, `feature-gate.guard.ts:52`) but still respects the business's own enabledApps — a services firm on trial shouldn't see Tables.

**API** (in `billing` or a small `apps` module):
- `GET /apps` → registry + per-app state: `enabled | disabled | locked_by_plan (with required plan) | missing_dependency (with which)`.
- `POST /apps/:key/enable` → validates plan + dependency closure; response includes `alsoEnabled: []` when the client confirms cascade ("Invoicing needs Customers — enable both?").
- `POST /apps/:key/disable` → 409 with dependent list if other enabled apps depend on it; **never deletes data** — disabling hides routes/nav; re-enabling restores everything.
- Tenant context/bootstrap response (what feeds `useTenantStore`: `businessType`, `planModules` today — `AppSidebar.tsx:57`) adds `effectiveApps: string[]`.

**Enforcement — FeatureGateGuard grows up:**
1. Rename decorator usage to `@RequireApp('<key>')` (keep `REQUIRE_MODULE_KEY` metadata for compatibility).
2. Guard checks the required key against **effective apps** (intersection above) instead of plan modules alone (`feature-gate.guard.ts:56-57`).
3. Apply at **controller class level** — one decorator per module controller (inflows→`goods-in`, orders→`pos`, invoices→`invoicing`, accounting→`books`, payroll→`payroll`, ...). ~14 one-line changes; the guard is already exported and idle (`billing/guards/feature-gate.guard.ts:20`).
4. Frontend: sidebar's `hasModule` (`AppSidebar.tsx:94-104`) is replaced by `effectiveApps.includes(sectionAppKey)`; the hardcoded businessType branch (`:242-253`) is replaced by rendering whatever's enabled, in registry order. 403 from the guard renders an upgrade/enable interstitial, not an error page.

## 4. App launcher UX

- **Header grid icon** (Google-style, right of search in `AppHeader`): popover grid of enabled apps — icon, skinned name, current-app highlighted — plus a pinned "All apps →" link to the management page. This is the cross-app jump.
- **Sidebar business block**: the existing `ServiceSwitcher` (`AppSidebar.tsx:353-358`) becomes the current-app identity (app icon + skinned name + edition badge); clicking opens the same grid. Sidebar sections below it collapse to *the current app's* routes — the sidebar stops being the whole ERP's map.
- **Apps management page** (`/settings/apps`): one card per registry app — icon, name, one-line value prop, dependency chips, and a state control: toggle (enabled/disabled) · **"Included in Growth" lock + upgrade CTA** (locked_by_plan) · "Requires Customers" prompt with one-click enable-both (missing_dependency). Disabling shows a "data is kept" reassurance line. This page is also the upsell surface — locked cards are ads for the next plan.

## 5. Surfaces: role-based UX

Two independent axes: **apps decide what a BUSINESS has; roles decide which SURFACE a PERSON gets.** A retail shop enables `items + goods-in + pos + books`; the owner sees the back office, the attendant sees a phone-first shop floor, and neither list changes the other.

| Surface | Who (role default) | What it is |
|---|---|---|
| **Back office** | owner, manager, accountant | The current UI — full nav, reports, settings. No change. |
| **Shop floor** | attendant, storekeeper, waiter, dispenser | Phone-first, task-first launcher: ~5 big buttons, camera scanning, offline-tolerant. Zero access to accounting, settings, or anything money-configuring. |
| **Employee self-service** | every employee | Exists today (`frontend/pages/employee/*`): payslips, leave, profile. Shop floor links to it for clock-in/out rather than duplicating it. |

**Shop floor design rules:** actions, not modules — the launcher never shows "Inventory", it shows "Receive delivery". Each action appears only if the business has the owning app enabled (apps axis still governs) AND the role has the narrow permission bundle. Barcode scanning uses the device camera against the item barcode field. Every write goes through the PWA offline write-queue (ROADMAP D4 Layer 2 design): client event IDs replayed through the existing idempotent posting pipeline, so a market-stall network blip never loses a sale.

**The five actions — target journey vs today's painful path:**

| Action | Today | Shop-floor journey |
|---|---|---|
| **Sell** | Retail: no flow at all (PM-REVIEW O4); restaurant: full back-office orders page | Scan/search → qty → tender (cash/transfer) → receipt. Stock deducts + books post via the existing orders machinery |
| **Check price/stock** | Log into back office, navigate the inventory DataTable (needs broad `inventory.view`) | Scan → price + stock at *my branch*. Read-only, one permission |
| **Receive delivery** | The inflow form demands supplier, unit cost, batch data — the storekeeper at the gate doesn't know costs, so receiving waits for the manager | Scan/pick item → qty received → done. Creates a **DRAFT inflow (capture)**; manager later completes supplier/cost and **approves (review)** — only approval posts stock + GL. Requires splitting `ims/inflows` into capture vs approve statuses; this also fixes the receive-twice double-add (PM-REVIEW F2) because posting happens once, at approval |
| **Count stock** | Adjustments module with reason codes and approval — pure back-office | Guided count ("Count Night", the D4 offline scope): scan → counted qty → next. Variances auto-create a draft COUNT adjustment for manager approval; reconciliation report already exists to receive it |
| **Report damage** | Same back-office adjustment form | Scan → qty → reason chip (damaged/expired/spilled) → optional photo → draft adjustment for approval |

Plus **Clock in/out** pinned at the top — a thin call into the existing self-service attendance, not a new feature.

**Implementation shape:** a `/floor` route group with its own layout (no sidebar, big touch targets), role→surface default mapping on the user (`role.defaultSurface`), and per-surface permission bundles in the registry (`APP_REGISTRY[key].floorActions`). The capture/approve split on inflows and adjustments is the only backend change; everything else is a new skin over existing services. Sequenced into Phase 2 (read-only actions: sell via POS app, check stock, clock-in) and Phase 3 (capture/approve split, count night, offline queue).

## 6. Registration flow

Rework the existing 3-step wizard (`frontend/pages/register.tsx`) — the structure is already right, it's just unwired (step-1 `services` never sent, `handleSubmit:93-99`):
1. **Step 1 — "What kind of business?"**: six tiles (Restaurant & hospitality / Retail shop / Services / Pharmacy `coming soon` / Warehouse `coming soon` / Other). Sets `businessType`.
2. **Step 1b — "Your apps"**: preset apps shown as pre-checked chips with skinned names ("Ingredients, Deliveries, Orders, Tables, Menu, Kuza Menu, Books, Insights"), **editable** — user can untick or add from the full list (plan-locked apps shown greyed with plan badge; trial unlocks all). Seeds `enabledApps`.
3. Step 2 — country (exists). Step 3 — account details (exists).
4. Submit sends `businessType` + `enabledApps`; `RegisterDto` gains `enabledApps?: string[]` (validated against registry keys); `auth.service.ts` persists both on Business (`:88-93`) and makes default-data seeding preset-aware (UOMs only when `items` enabled — `:137`).

## 7. Migration path (3 phases, each independently shippable)

**Phase 1 — wire what exists (≤2 days).** No refactors, no moved modules.
- Add `Business.enabledApps` jsonb + registry constant + presets (backend, ~2 files).
- `RegisterDto.enabledApps` + persist in `auth.service.register`; frontend sends `businessType` + maps step-1 services → preset (fixes the dead step).
- Tenant bootstrap returns `effectiveApps` (legacy-derive when null).
- Extend `FeatureGateGuard` to intersect with `enabledApps`; apply `@RequireApp` to the top-level controllers (accounting, invoicing, customers, inflows, orders, menus, tables, menu-sites, payroll, insights).
- Sidebar: replace the `businessType === 'restaurant'` branch + `MODULE_ALIASES` with `effectiveApps` filtering.
- Minimal `/settings/apps` page: cards + toggle + plan-lock state (no dependency engine yet — enforce deps server-side with a plain 409 message).
- **Rollback-safe:** `enabledApps=null` tenants behave exactly as today.

**Phase 2 — make it feel like Google (≈1–2 weeks).**
- Header launcher grid + ServiceSwitcher rework; dependency prompt UX (enable-both modal); registration step 1b preview-and-edit; terminology skin layer through `tr()`; plan seeds migrated to canonical keys; upgrade CTAs on locked cards; per-app empty states ("Enable Customers to start invoicing").
- **Retail POS sell screen** (PM-REVIEW fix #3): the `pos` app's non-restaurant front-end, reusing orders' stock+posting machinery.
- Shop-floor surface v1 (§5): `/floor` launcher with the read-safe actions — Sell, Check price/stock, Clock in/out.

**Phase 3 — pay the structural debts the model exposes (multi-week, sequenced).**
- Move suppliers `rms/suppliers` → `purchasing/` (route alias kept).
- Sales core: shared SalesDocument under `pos` + `invoicing`; COGS/stock on invoiced items; order↔invoice link (kills double-billing, PM-REVIEW O1/O2).
- Shop-floor surface v2: inflow/adjustment capture-vs-approve split → Receive delivery, Count stock, Report damage; offline write-queue (D4 Layer 2).
- Dashboard/insights per-app home ("Did I make money today?" from Books, not orders-only).
- Vertical packs as registry config: pharmacy (batch decrement + expiry block, I1/I8), WMS (PO→GRN, I7), recipe/BOM for hospitality.

**Success metric:** activation (GTM §2) measured per app — "10 items + 1 goods-in + 1 sale (pos or invoice)" — so the funnel finally knows which apps activate which verticals.
