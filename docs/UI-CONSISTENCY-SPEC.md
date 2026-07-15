# Kuza UI Consistency Spec (canonical)

> Single source of truth for control sizing, spacing, tables, buttons, inputs and
> breadcrumbs. Derived from the existing primitives (`components/ui/Button.tsx`,
> `FormField.tsx`, `PageHeader.tsx`, `Card.tsx`). When in doubt, use the primitive —
> do not hand-roll.

## Canonical values

| Token | Value | Notes |
|---|---|---|
| **Control height (standard)** | `h-9` (36px) | inputs, selects, textareas (min), default (md) buttons |
| Button — small | `h-8 px-3 text-[13px]` | `<Button size="sm">` |
| Button — default | `h-9 px-3.5 text-[13px]` | `<Button size="md">` (default) |
| Button — POS/touch | `h-11` | ONLY inside `/pos` and POS components |
| Icon-only button | `h-9 w-9 inline-flex items-center justify-center rounded-lg` | + hover bg |
| Input / select / textarea | `w-full px-3 py-2 text-sm border rounded-md` | prefer `<FormField>` |
| Field label | `text-[13px] font-medium text-gray-700 dark:text-gray-300` | FormField renders this |
| Field error | `text-xs text-red-600 dark:text-red-400` | FormField renders this |
| Field stack gap | `space-y-1.5` (within field) · `space-y-4` (between fields) | |
| Card | `<Card>` → `rounded-2xl shadow-card`, body `p-5` | don't hand-roll card divs |
| Section gap | `mt-6` / `mt-8` | |

## Components — always use these

- **Buttons** → `import Button from '@/components/ui/Button'`. Variants: `primary`
  (brand gradient), `secondary` (bordered), `ghost` (transparent), `danger` (red).
  Sizes: `sm` | `md`. Pass layout classes (`w-full`, `ml-auto`) via `className`.
- **Form controls** → `import FormField from '@/components/ui/FormField'`. Handles
  input / select / textarea / checkbox with label + required + error + help.
- **Tables** → prefer `import DataTable from '@/components/ui/DataTable'`. If a raw
  table must stay, use canonical cell classes (below).
- **Breadcrumbs + title** → `import PageHeader from '@/components/ui/PageHeader'`
  and pass `breadcrumbs={[{ label, href? }]}`. NEVER hand-roll breadcrumb markup.

## Raw table (only if not migrating to DataTable)

- Header cell: `px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 text-left`
- Body cell: `px-4 py-3 text-sm text-gray-700 dark:text-gray-300`
- Row divider: `border-t border-gray-100 dark:border-gray-800`
- Wrapper: inside a `<Card padding={false}>` or `overflow-x-auto`

## Migration rules (behavior-preserving — NO functional changes)

1. `<button className="...">` → `<Button variant={…} size={…} className="{layout-only classes}">`.
   Map: gradient/brand → `primary`; bordered/white → `secondary`; transparent/link → `ghost`;
   red/delete → `danger`. Preserve `onClick`, `type`, `disabled`, `aria-*`, all handlers.
2. Labeled form `<input>/<select>/<textarea>` → `<FormField>` preserving
   `value/onChange/name/type/required/placeholder/options`. Non-form controls
   (search bars, inline filters) → normalize classes to canonical instead.
3. Stray control heights (`h-7/h-8/h-10/h-11/h-12`) and paddings on inputs/buttons →
   normalize to the canonical values above (sm buttons keep `h-8`; POS keeps `h-11`).
4. Hand-rolled breadcrumbs → `PageHeader breadcrumbs`.
5. Do NOT change API calls, state, data flow, or logic. Keep `tsc` green.
