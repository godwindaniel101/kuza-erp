import { ReactNode } from 'react';
import SearchableSelect from '@/components/SearchableSelect';

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

    // multiselect
    const selected = Array.isArray(value) ? value : [];
    const toggle = (optValue: string) => {
      onChange(
        filter.key,
        selected.includes(optValue) ? selected.filter((s) => s !== optValue) : [...selected, optValue],
      );
    };
    return (
      <div key={filter.key} className={filter.className ?? 'flex-1 min-w-[200px]'}>
        {filter.label && (
          <span className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{filter.label}</span>
        )}
        <div className="flex flex-wrap gap-1.5">
          {filter.options.map((opt) => {
            const isOn = selected.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggle(opt.value)}
                className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                  isOn
                    ? `${chip} border-transparent`
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/60'
                }`}
              >
                {isOn && <i className="bx bx-check mr-1" aria-hidden="true"></i>}
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div
      className={`mb-4 bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 p-3 ${className}`}
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
