# Kuza ERP — Design System

One product, one accent, one rhythm. Every module shares the same shell, palette
and components. This file is the **permanent acceptance checklist** — numbers,
not adjectives. A PR that violates a number below is wrong.

## 0. Numeric acceptance spec (verify before shipping any page)

| Element | Spec |
|---|---|
| Sidebar total width | **240px** (`--sidebar-width`, w-60 equivalent) |
| Sidebar nav rows | **h-9 (36px)** — same height as buttons/inputs (one unified 36px control rhythm), labels **14px**, icons **18px**, item padding **px-3**, section labels **11px uppercase tracking-wider** with **mt-6** group spacing. Active item = **navy gradient pill** (`bg-brand-gradient`, white text + icon, full 36px row, rounded-lg) |
| Sidebar business block | **~64px** tall (9×9 avatar tile + 2 text lines, p-2) |
| Buttons — hierarchy | **Chrome = h-8**: anything in toolbars/headers — AppHeader quick actions, `PageHeader actions`, FilterBar actions, table row-action buttons, card-corner buttons (`Button size="sm"`, 13px; "View all" stays a text link). **Content = h-9**: form submits and standalone primary CTAs only (`Button` md, 13px). Nothing in the chrome is taller than a 36px nav row; **h-10 only on login/register** (h-11 banned) |
| Inputs / selects / date pickers | **h-9**, labels **13px medium**, `rounded-md` |
| FilterBar controls | **h-9** so bars align with buttons |
| Cards | `bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 p-5`. ONE soft diffuse resting shadow (`shadow-card`: large blur, very low alpha); dark mode relies on the ring (shadows invisible there). Stronger `shadow-popover` only on popovers/modals/dropdowns. Buttons/inputs stay rounded-lg/rounded-md |
| Tables | rows **h-11** (py-3 + 13px text), cell text **13px**, header **11px uppercase**, hairline dividers (`gray-100`/`dark:gray-800`) only — no full grids |
| Type scale | page title **18px semibold** (20px max), section headings **14px semibold**, body **13px**, metadata **12px** |
| StatCard | chip style — label **12px** top-left, value **23px bold**, delta pill (green/red + arrow), icon in a soft tinted **10×10 rounded-xl** square on the right |
| Content rhythm | sections stack with **space-y-5**; page gutter **px-6** (from `Layout`) — pages must NOT add their own `p-6`/`min-h-screen` wrapper |
| Header | **56px**, backdrop-blur, hairline bottom border |

## 0b. Page-width tiers (`components/ui/Page.tsx`)

Every page picks a tier deliberately — `<Page width="...">` or its classes
(`max-w-none` / `mx-auto w-full max-w-5xl` / `mx-auto w-full max-w-3xl`, always
with `space-y-5`). Layout's outer cap (1440px, px-6 gutter) still applies.

| Tier | Class | Pages |
|---|---|---|
| **full** (`max-w-none`) | dense data + dashboards (multi-column grids breathe at full width) | Home dashboard, Accounting overview, HRMS dashboard, Employee dashboard, Analytics, Inventory items, Inflows list, Branch items, Adjustments list, Stock ledger, Transfers, Invoices list, Customers list, Orders list + POS create, Tables, Menus list, Suppliers, Journal entries list, Chart of accounts, Employees, Attendance, Leaves, Leave types, Payroll list + tax config, Recruitment, Performance, Learning, Benefits, Compensation, Departments/Positions/Locations lists, Users, Roles list, Invitations, Categories, UOMs, Branches list, Menu Studio (preview column), employee/my-* |
| **wide** (`max-w-5xl`) | reports, detail/document views | Accounting reports (index, trial balance, P&L, balance sheet, general ledger), RMS analytics, Billing, Apps, Roles create (permission matrix), Inflows create (line items), Invoice detail, Customer detail, Inflow detail + batch, Adjustment detail, Item detail, Journal entry detail, Order detail, IMS AI |
| **narrow** (`max-w-3xl`) | create/edit forms, single-form settings | Invoice new, Adjustment new, Journal entry new, HRMS creates (employee, department, leave, location, payroll run, position, posting, review), Table create, Item create/edit, Branch create, Allocation method, General settings (SettingsForm), HRMS settings, Profile, Employee profile |

Rule of thumb: tables of records → full; read/analyze → wide; type into a form → narrow.

### Control height rule (non-negotiable)
ALL text inputs, selects, date pickers and SearchableSelect triggers are
**h-9 · text-[13px] · rounded-md** inside the app (`FormField` provides this;
raw controls must match). Textareas: rounded-md, 13px, natural height. Auth
pages (login/register) may use **h-10**, nothing taller. Checkboxes/radios are
exempt (h-4 w-4).

## 1. Color

| Token | Tailwind | Use |
|---|---|---|
| **Brand** | `brand-*` (deep navy-blue, 600 = #2e56d3; `bg-brand-gradient` on active/primary) | ALL primary actions, active nav, focus rings, links, selected states |
| Neutral | `gray-*` | Text, borders, surfaces |
| Success | `emerald-*` | Positive status, upward deltas |
| Warning | `amber-*` | Pending, low stock, caution |
| Danger | `red-*` | Errors AND destructive actions only (delete/void/reject) |
| Info | `sky-*` | Neutral-informational status |

- The per-module split (red = RMS, blue = HRMS) is retired. Primary is always `brand-600`.
- Red unambiguously means danger: a red button must destroy something.
- Status = color + icon, never color alone (`StatusBadge`).
- Surfaces: canvas `canvas` (#f3f4f1 warm off-white)/`dark:gray-950`; cards `white`/`dark:gray-900` with soft shadow + faint ring.

### Chart colors (checked for legibility on both surfaces)
- Series 1 (revenue/income): **#4a77e8** (brand navy-blue 500)
- Series 2 (expenses): **#d97706** (amber-600)
- Positive accent (weekly highlight bar): **#10b981** (mint-emerald)
- Area charts: soft vertical gradient fill from the series color to transparent
- Grid/axis text wear gray text tokens, never series colors. Legend on ≥2 series.
- Charts are hand-rolled inline SVG (`components/ui/charts.tsx`) — no chart libraries.

## 2. Typography

Inter/system stack (`font-sans`). One 18px title per page (`PageHeader`), 14px
section headings, 13px body, 12px metadata, 11px overlines. No ad-hoc
`text-xl`/`text-2xl`/`text-3xl` headings inside the app shell.

## 3. Focus & interaction

- Focus ring, defined once: `focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500`.
- Interactive elements: `transition-colors duration-150`; buttons `active:scale-[0.98]`.
- No gratuitous animation.

## 4. Components

- **Button** — `primary | secondary | ghost | danger` × `sm(h-8) | md(h-9)`, loading, `href`.
- **PageHeader** — 18px title, 13px description, breadcrumbs, right-aligned actions, `mb-5`.
- **DataTable** — ring container, h-11 rows, 11px headers, hover rows, `stickyHeader`.
- **StatCard** — 12px label / 22px value / delta pill / optional `spark` series.
- **StatusBadge** — tinted pill `bg-*-50 text-*-700 ring-*-600/20` + dark variants.
- **charts.tsx** — `Sparkline`, `RevenueAreaChart` (crosshair+tooltip), `GroupedBarChart`
  (legend + per-bar tooltip). All render a quiet empty state on zero data.
- **Modal** — rounded-xl, hairline header, `footer` slot, `shadow-popover` (allowed: floating).
- **Icon** — hand-drawn 24×24 outline set, stroke 1.5, rendered 14–18px.

## 5. App shell & progressive disclosure

- **Sidebar (208px)** renders ONLY this tenant's modules:
  - Tenant context: `GET /settings` (`businessType`) + `GET /billing/subscription`
    (`plan.limits.modules`), fetched once via `useTenantStore` (store/globalStore.ts).
  - `restaurant` → Home, Restaurant (Orders/Tables/Menus/Analytics), Menu Studio,
    Inventory, Money (Invoices/Customers/Reports), Settings. Business block shows a
    **Hospitality** chip.
  - `general | retail | services` → Home, Inventory, Sales, Accounting, HR (only if
    plan modules include hrms), Settings.
  - Sections always intersect with `plan.limits.modules` (alias matching); if the
    subscription fetch fails, the businessType default set renders — never an empty sidebar.
  - A quiet **"All modules"** toggle at the sidebar bottom reveals everything
    (persisted in `localStorage["kuza.showAllModules"]`, default OFF).
- **Dashboard** follows the same logic: restaurant sees orders/revenue/occupancy KPIs;
  other tenants see revenue/outstanding-invoices/stock. HR KPIs hidden with HR.
- Public guest pages under `/m/*` render bare — no shell, no auth redirect.

### Settings items by enabled apps (any-of `effectiveApps`; composes with permission guards, never widens)

| Settings item | Requires app(s) |
|---|---|
| Suppliers | goods-in |
| Categories | items |
| Units of Measure | items |
| Allocation Method | items OR pos |
| Branches | items OR pos OR people |
| Departments / Positions / Locations | people |
| Users, Roles, Invitations, Apps, Billing, General | always |

Legacy backend (no `effectiveApps`): show all, as before. A Menu-Studio-only
tenant sees just General, Users, Roles, Invitations, Apps, Billing.

## 6b. Vertical skins (lib/terminology.ts)

Same shared core, vertical-appropriate presentation — three thin layers, no
separate pages. Composes with effectiveApps/workspace filtering.

### Terminology (`term(businessType, key)` — feeds the FALLBACK of t()/tr())

| key | neutral | restaurant | retail | services | warehouse (future) |
|---|---|---|---|---|---|
| items | Items | Ingredients & Dishes | Products | Services & Items | Stock |
| itemsNav | Items | Dishes | Products | Services & Items | Stock |
| addItem | Add item | Add dish | Add product | Add service or item | — |
| goodsIn | Goods In | Deliveries | Purchases | Purchases | Receiving |
| pos | Shop | Shop | Checkout | — | — |

New verticals slot in by adding one OVERRIDES entry — nothing else changes.

### Inventory column presets (COLUMN_PRESETS, pages/ims/inventory)

| vertical | columns |
|---|---|
| restaurant | name, category, current stock, UOM, status (no barcode/sale price) |
| retail | name, barcode, sale price, current stock, status (no UOM) |
| services/general | name, category, subcategory, current stock, sale price, status |

Unit cost & margin intentionally absent — the list API returns no cost field.

### Dashboard nuance
restaurant: sales+spark / active orders / low stock / occupancy. retail:
Today's takings / outstanding invoices / "Products low". services: sales /
Outstanding (invoiced-this-month & overdue KPIs blocked on API summary fields).

## 6. Dark mode

Class strategy. Every color ships a dark variant; tinted fills use `dark:bg-*-500/10`.
Chart series colors are validated against both surfaces.
