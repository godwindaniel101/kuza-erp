import { ReactNode, useEffect, useRef, useState } from 'react';
import SearchableSelect from '@/components/SearchableSelect';

/** Multi-select rendered as a dropdown with checkboxes (collapses long lists). */
function MultiSelectDropdown({
  options,
  selected,
  onChange,
  placeholder,
}: {
  options: FilterOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  const toggle = (v: string) =>
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);

  const label =
    selected.length === 0
      ? placeholder ?? 'Select…'
      : selected.length === 1
      ? options.find((o) => o.value === selected[0])?.label ?? '1 selected'
      : `${selected.length} selected`;

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-gray-300 bg-white px-3 text-[13px] text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
      >
        <span className={selected.length ? '' : 'text-gray-400 dark:text-gray-500'}>{label}</span>
        <i className={`bx bx-chevron-down text-lg text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-md border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-800"
        >
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="mb-1 w-full rounded px-2 py-1 text-left text-xs font-medium text-accent hover:bg-gray-50 dark:hover:bg-gray-700/60"
            >
              Clear selection
            </button>
          )}
          {options.length === 0 && (
            <p className="px-2 py-1.5 text-xs text-gray-400">No options</p>
          )}
          {options.map((opt) => {
            const on = selected.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggle(opt.value)}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[13px] text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700/60"
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                    on
                      ? 'border-transparent bg-accent text-accent-fg'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  {on && <i className="bx bx-check text-xs" aria-hidden="true" />}
                </span>
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export interface FilterOption {
  value: string;
  label: string;
}

export type FilterConfig =
  | {
      key: string;
      type: 'text';
      label?: string;
      placeholder?: string;
      /** Width class, default flexible. */
      className?: string;
    }
  | {
      key: string;
      type: 'select';
      label?: string;
      placeholder?: string;
      options: FilterOption[];
      className?: string;
    }
  | {
      key: string;
      type: 'multiselect';
      label?: string;
      placeholder?: string;
      options: FilterOption[];
      className?: string;
    };

/** Filter values: string for text/select, string[] for multiselect. */
export type FilterValues = Record<string, string | string[]>;

interface FilterBarProps {
  filters: FilterConfig[];
  values: FilterValues;
  onChange: (key: string, value: string | string[]) => void;
  onClear?: () => void;
  /** Results count text e.g. shown on the right. */
  resultsCount?: number;
  resultsLabel?: string;
  /** Accent for focus rings / chips (red=IMS, blue=HRMS). */
  accent?: 'red' | 'blue';
  /** Right-aligned action slot (e.g. bulk action buttons). */
  actions?: ReactNode;
  className?: string;
}

export default function FilterBar({
  filters,
  values,
  onChange,
  onClear,
  resultsCount,
  resultsLabel = 'results',
  accent = 'red',
  actions,
  className = '',
}: FilterBarProps) {
  const focusRing = 'focus-visible:ring-brand-500';
  const chip = 'bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300 ring-1 ring-inset ring-brand-600/20 dark:ring-brand-400/20';

  const hasActiveFilters = filters.some((f) => {
    const v = values[f.key];
    return Array.isArray(v) ? v.length > 0 : !!v;
  });

  const renderFilter = (filter: FilterConfig) => {
    const value = values[filter.key];

    if (filter.type === 'text') {
      return (
        <div key={filter.key} className={`relative ${filter.className ?? 'flex-1 min-w-[200px]'}`}>
          <i className="bx bx-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" aria-hidden="true"></i>
          <input
            type="text"
            value={(value as string) ?? ''}
            onChange={(e) => onChange(filter.key, e.target.value)}
            placeholder={filter.placeholder ?? filter.label ?? 'Search...'}
            aria-label={filter.label ?? filter.placeholder ?? 'Search'}
            className={`w-full h-9 pl-10 pr-4 text-[13px] border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-gray-100 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:border-transparent transition-colors duration-150 ${focusRing}`}
          />
        </div>
      );
    }

    if (filter.type === 'select') {
      return (
        <div key={filter.key} className={filter.className ?? 'flex-1 min-w-[180px]'}>
          <SearchableSelect
            options={filter.options}
            value={(value as string) ?? ''}
            onChange={(v) => onChange(filter.key, v)}
            placeholder={filter.placeholder ?? filter.label ?? 'Select...'}
            className="w-full"
            focusColor={accent}
            size="sm"
          />
        </div>
      );
    }

    // multiselect — rendered as a dropdown with checkboxes
    const selected = Array.isArray(value) ? value : [];
    return (
      <div key={filter.key} className={filter.className ?? 'flex-1 min-w-[180px]'}>
        {filter.label && (
          <span className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{filter.label}</span>
        )}
        <MultiSelectDropdown
          options={filter.options}
          selected={selected}
          onChange={(next) => onChange(filter.key, next)}
          placeholder={filter.placeholder ?? filter.label}
        />
      </div>
    );
  };

  return (
    <div
      // relative z-30: the page wraps FilterBar and DataTable in `kz-stagger`,
      // whose transform makes each a separate stacking context — so the later
      // table would paint over this bar's open dropdowns. Elevating this context
      // lets the category/filter dropdowns sit above the table.
      className={`relative z-30 mb-4 bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 p-3 ${className}`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 flex-1">{filters.map(renderFilter)}</div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>

      {(resultsCount != null || hasActiveFilters) && (
        <div className="mt-3 flex items-center justify-between text-sm">
          {resultsCount != null ? (
            <span className="text-gray-500 dark:text-gray-400">
              {resultsCount} {resultsLabel}
            </span>
          ) : (
            <span />
          )}
          {hasActiveFilters && onClear && (
            <button
              type="button"
              onClick={onClear}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-1 transition-colors duration-150"
            >
              <i className="bx bx-x" aria-hidden="true"></i>
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
