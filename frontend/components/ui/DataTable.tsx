import { ReactNode, useEffect, useRef, useState } from 'react';
import { TableSkeleton } from './Skeleton';

export type ColumnAlign = 'left' | 'center' | 'right';

export interface DataTableColumn<T> {
  /** Unique key. Used as the sort field and React key. */
  key: string;
  label: ReactNode;
  sortable?: boolean;
  align?: ColumnAlign;
  /** Tailwind width class e.g. "w-40" or a CSS width string. */
  width?: string;
  /** Custom cell renderer. Defaults to `row[key]`. */
  render?: (row: T) => ReactNode;
  /** Hide column header label visually (still in DOM for a11y). */
  headerClassName?: string;
  cellClassName?: string;
}

export interface RowAction<T> {
  label: string;
  /** Boxicons name e.g. "bx-edit". */
  icon?: string;
  /** Tailwind text color for the icon. */
  iconColor?: string;
  onClick: (row: T) => void;
  /** Hide this action for specific rows. */
  hidden?: (row: T) => boolean;
  danger?: boolean;
}

export interface SortState {
  field: string | null;
  direction: 'asc' | 'desc';
}

interface DataTableProps<T extends { id: string }> {
  columns: DataTableColumn<T>[];
  data: T[];
  loading?: boolean;
  /** @deprecated Legacy accent — everything renders in the single brand accent now. */
  accent?: 'red' | 'blue';
  /** Keep the header row pinned while the table body scrolls. */
  stickyHeader?: boolean;

  // Sorting (controlled)
  sort?: SortState;
  onSortChange?: (field: string) => void;

  // Row actions menu
  rowActions?: RowAction<T>[];
  /** Aria label for the actions trigger. */
  actionsLabel?: string;

  // Selection (optional)
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;

  // Pagination (optional, controlled)
  pagination?: {
    page: number;
    totalPages: number;
    startIndex: number;
    endIndex: number;
    totalItems: number;
    onPageChange: (page: number) => void;
  };

  // Empty state shown when data is empty and not loading.
  emptyState?: ReactNode;

  onRowClick?: (row: T) => void;
  className?: string;
}

const alignClass: Record<ColumnAlign, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

export default function DataTable<T extends { id: string }>({
  columns,
  data,
  loading = false,
  accent: _accent = 'red',
  stickyHeader = false,
  sort,
  onSortChange,
  rowActions,
  actionsLabel = 'More actions',
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  pagination,
  emptyState,
  onRowClick,
  className = '',
}: DataTableProps<T>) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const accentText = 'text-brand-600 dark:text-brand-400';
  const checkboxClasses =
    'h-4 w-4 rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-brand-600 focus:ring-brand-500';

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && menuRef.current.contains(e.target as Node)) return;
      if (openMenu) setOpenMenu(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openMenu]);

  const hasActions = !!rowActions && rowActions.length > 0;
  const colSpan = columns.length + (selectable ? 1 : 0) + (hasActions ? 1 : 0);

  // Selection helpers
  const pageIds = data.map((r) => r.id);
  const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));
  const someSelected = pageIds.some((id) => selectedIds.includes(id));

  const toggleAll = () => {
    if (!onSelectionChange) return;
    if (allSelected) {
      onSelectionChange(selectedIds.filter((id) => !pageIds.includes(id)));
    } else {
      onSelectionChange(Array.from(new Set([...selectedIds, ...pageIds])));
    }
  };

  const toggleRow = (id: string) => {
    if (!onSelectionChange) return;
    onSelectionChange(
      selectedIds.includes(id) ? selectedIds.filter((s) => s !== id) : [...selectedIds, id],
    );
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (!sort || sort.field !== field) {
      return <i className="bx bx-sort text-gray-400" aria-hidden="true"></i>;
    }
    return sort.direction === 'asc' ? (
      <i className={`bx bx-sort-up ${accentText}`} aria-hidden="true"></i>
    ) : (
      <i className={`bx bx-sort-down ${accentText}`} aria-hidden="true"></i>
    );
  };

  if (loading) {
    return <TableSkeleton rows={6} columns={colSpan || 5} className={className} />;
  }

  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div className={className}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className={`bg-gray-50 dark:bg-gray-900 ${stickyHeader ? 'sticky top-0 z-10' : ''}`}>
              <tr>
                {selectable && (
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      aria-label="Select all rows"
                      checked={allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = !allSelected && someSelected;
                      }}
                      onChange={toggleAll}
                      className={checkboxClasses}
                    />
                  </th>
                )}
                {columns.map((col) => {
                  const align = col.align ?? 'left';
                  const sortable = col.sortable && onSortChange;
                  return (
                    <th
                      key={col.key}
                      style={col.width && col.width.includes('px') ? { width: col.width } : undefined}
                      className={`px-6 py-2.5 text-2xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase ${alignClass[align]} ${
                        col.width && !col.width.includes('px') ? col.width : ''
                      } ${sortable ? 'cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-800/70' : ''} ${
                        col.headerClassName ?? ''
                      }`}
                      onClick={sortable ? () => onSortChange!(col.key) : undefined}
                    >
                      <div
                        className={`flex items-center gap-1 ${
                          align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : ''
                        }`}
                      >
                        <span>{col.label}</span>
                        {sortable && <SortIcon field={col.key} />}
                      </div>
                    </th>
                  );
                })}
                {hasActions && (
                  <th className="px-6 py-2.5 text-right text-2xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase w-20">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
              {data.map((row) => {
                const isSelected = selectedIds.includes(row.id);
                return (
                  <tr
                    key={row.id}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={`${onRowClick ? 'cursor-pointer' : ''} transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                      isSelected ? 'bg-brand-50/60 dark:bg-brand-500/10' : ''
                    }`}
                  >
                    {selectable && (
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label={`Select row ${row.id}`}
                          checked={isSelected}
                          onChange={() => toggleRow(row.id)}
                          className={checkboxClasses}
                        />
                      </td>
                    )}
                    {columns.map((col) => {
                      const align = col.align ?? 'left';
                      const content = col.render
                        ? col.render(row)
                        : ((row as Record<string, unknown>)[col.key] as ReactNode) ?? '-';
                      return (
                        <td
                          key={col.key}
                          className={`px-6 py-3 whitespace-nowrap text-[13px] text-gray-700 dark:text-gray-300 ${alignClass[align]} ${
                            col.cellClassName ?? ''
                          }`}
                        >
                          {content}
                        </td>
                      );
                    })}
                    {hasActions && (
                      <td className="px-6 py-1.5 whitespace-nowrap text-right text-[13px]" onClick={(e) => e.stopPropagation()}>
                        <RowActionsMenu
                          row={row}
                          actions={rowActions!}
                          open={openMenu === row.id}
                          onToggle={() => setOpenMenu(openMenu === row.id ? null : row.id)}
                          onClose={() => setOpenMenu(null)}
                          menuRef={openMenu === row.id ? menuRef : undefined}
                          label={actionsLabel}
                        />
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 px-4 py-2.5">
          <div className="text-[13px] text-gray-500 dark:text-gray-400">
            Showing {pagination.startIndex + 1} to {pagination.endIndex} of {pagination.totalItems}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => pagination.onPageChange(Math.max(1, pagination.page - 1))}
              disabled={pagination.page === 1}
              className="h-8 px-3 border border-gray-300 dark:border-gray-700 rounded-lg text-[13px] font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-[13px] text-gray-500 dark:text-gray-400">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => pagination.onPageChange(Math.min(pagination.totalPages, pagination.page + 1))}
              disabled={pagination.page === pagination.totalPages}
              className="h-8 px-3 border border-gray-300 dark:border-gray-700 rounded-lg text-[13px] font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function RowActionsMenu<T extends { id: string }>({
  row,
  actions,
  open,
  onToggle,
  onClose,
  menuRef,
  label,
}: {
  row: T;
  actions: RowAction<T>[];
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  menuRef?: React.RefObject<HTMLDivElement>;
  label: string;
}) {
  const visible = actions.filter((a) => !a.hidden?.(row));
  if (visible.length === 0) return null;

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={onToggle}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-8 w-8 items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-150"
      >
        <i className="bx bx-dots-vertical-rounded text-lg" aria-hidden="true"></i>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-48 bg-white dark:bg-gray-900 rounded-xl shadow-popover border border-gray-200 dark:border-gray-800"
        >
          <div className="py-1">
            {visible.map((action) => (
              <button
                key={action.label}
                type="button"
                role="menuitem"
                onMouseDown={() => {
                  onClose();
                  action.onClick(row);
                }}
                className={`flex items-center w-full px-4 py-2 text-sm text-left transition-colors duration-150 hover:bg-gray-100 dark:hover:bg-gray-800 ${
                  action.danger ? 'text-red-700 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                {action.icon && (
                  <i className={`bx ${action.icon} mr-3 ${action.iconColor ?? ''}`} aria-hidden="true"></i>
                )}
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
