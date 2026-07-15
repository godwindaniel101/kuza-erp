# Kuza ERP — IMS & HRMS UI Overhaul (Designer Recommendations)

Stack: Next.js 14 (Pages Router) + Tailwind 3.3 + React 18, dark-mode enabled, existing components (Card, Modal, Toast, Pagination, DatePicker, SearchableSelect). Benchmark: Linear / Stripe / Zoho quality.

## Design-system findings
Functional but inconsistent: no design tokens (colors hardcoded `bg-red-600`/`bg-blue-600`), each page rolls its own table, weak empty/loading states, no button-variant system, inconsistent spacing. **Standardize first**, then refactor pages onto the shared components.

## Cross-cutting components to build (foundation — highest leverage)
1. **DataTable** — sortable, paginated, selectable, row actions, loading skeleton, empty state, dense mode, expandable rows.
2. **FilterBar** — config-driven filters (text/select/multiselect/date/daterange), "clear filters", results count, mobile drawer.
3. **BulkUploadWizard** — 4 steps: download template → drag-drop + preview → validate (row-level errors) → results (imported/failed + download-failed-rows). Reuse for inventory, inflows, employees.
4. **FormField** — label + required + inline error + help + consistent focus/sizing; pairs with `/lib/validators/*` for real-time validation.
5. **PageHeader** (breadcrumbs/title/status/actions), **EmptyState**, **StatCard**, **StatusBadge** (color+icon, never color-only — a11y), enhanced **Modal** (size/footer), **Drawer**, **Skeleton** loaders.
6. **useTableState** hook — centralize sort/paginate/filter; **lib/errorHandler** for friendly API messages.
7. Adopt **SWR/React Query** for caching; lazy-load heavy components.

## IMS redesign (per screen)
- **Inventory list** (`pages/ims/inventory/index.tsx`): StatCard row (total / low-stock / overstock), FilterBar, DataTable, StockStatusBadge (low/optimal/overstock), bulk actions, BulkUploadWizard modal, robust stock formatting (don't crash when UOM missing).
- **Inventory create/edit** (`components/InventoryItemForm.tsx`, 600+ lines): split into BasicInfo / Pricing+Stock / UOM / Images sections (tabs), client-side validation, drag-drop image uploader with preview, clearer UOM-conversion modal.
- **Inflows list/detail**: summary stats (pending approval / value), colored status badges, approval CTA on pending, two-column detail (line items + summary/timeline), inline failed-upload table, print/export receipt.
- **Transfers**: add search/filter, status badges, **create page is missing — build it** (from/to branch, item rows w/ current stock & qty), status transitions.
- **Branch items**: multi-view toggle (table / by-branch matrix / low-stock alert), total + per-branch distribution.
- **UOMs / Categories**: tabs (Units | Conversions), editable conversions, add Categories management page.

## HRMS redesign (per screen)
- **Employees list**: grouped FilterBar, avatars, bulk actions, card-view toggle, onboarding empty state; consolidate the two "Add employee" buttons.
- **Employees create**: multi-step wizard (Personal → Organization → Payment → Review), smart payment-method form (bank/mobile-money/check), invite-email preview.
- **Payroll**: summary stats (gross/deductions/net/pending), period filter, inline approve/reject, payroll-detail breakdown modal, improved tax-config UI.
- **Leaves**: table ↔ calendar toggle, approval panel for pending, leave-detail modal, leave-balance widget.
- **Attendance**: today summary (present/late/absent/WFH), prominent clock in/out, date-range filter + CSV export, day-detail timeline, absentee/still-clocked-in alerts.
- **Performance / Recruitment**: review table + rating breakdown modal; recruitment kanban pipeline (stages) + candidate detail.

## Prioritized roadmap
- **Phase 1 (foundation, ~2 wks):** design tokens, FormField, StatusBadge, validators → DataTable, FilterBar, PageHeader, EmptyState, Modal+, Drawer, Skeleton → BulkUploadWizard, StatCard, Button variants, Tabs.
- **Phase 2 (IMS, ~3 wks):** refactor list pages → DataTable/FilterBar; split inventory form; inflow detail two-column + approval; build transfers create; branch-items matrix; UOM tabs + categories page; wire BulkUploadWizard.
- **Phase 3 (HRMS, ~3 wks):** employees list+wizard; payroll summary+detail; leaves calendar+approval; attendance summary+alerts; performance/recruitment.
- **Phase 4 (~1 wk):** mobile responsiveness, WCAG 2.1 AA, perf (lazy load, image opt), error boundaries, DESIGN.md, Storybook, validator/formatter unit tests.

> Status: recommendations only (not yet implemented). Implementation is tracked separately; the component library (Phase 1) is the prerequisite for the page refactors.
