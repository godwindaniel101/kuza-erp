import { useMemo, useState } from 'react';

export type SortDirection = 'asc' | 'desc';

export interface UseTableStateOptions<T> {
  data: T[];
  /** Initial sort field key. */
  initialSortField?: keyof T | string | null;
  initialSortDirection?: SortDirection;
  pageSize?: number;
  /**
   * Optional client-side filter predicate. Re-runs whenever `data` or the
   * predicate's closure changes. Keep it referentially stable (useCallback)
   * if the closure captures state, or pass a fresh predicate each render.
   */
  filterFn?: (item: T) => boolean;
  /**
   * Optional accessor to resolve a value for sorting a given field. Useful
   * when the sort key does not map 1:1 to a top-level property.
   */
  sortAccessor?: (item: T, field: string) => unknown;
}

export interface UseTableStateReturn<T> {
  // Sort
  sortField: string | null;
  sortDirection: SortDirection;
  toggleSort: (field: string) => void;
  setSort: (field: string | null, direction?: SortDirection) => void;
  // Pagination
  page: number;
  pageSize: number;
  totalPages: number;
  setPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  startIndex: number;
  endIndex: number;
  // Derived data
  filtered: T[];
  sorted: T[];
  paginated: T[];
  totalCount: number;
  filteredCount: number;
}

function defaultAccessor<T>(item: T, field: string): unknown {
  return (item as Record<string, unknown>)[field];
}

function compare(a: unknown, b: unknown, direction: SortDirection): number {
  const av = a ?? '';
  const bv = b ?? '';
  let result: number;
  if (typeof av === 'string' || typeof bv === 'string') {
    result = String(av).localeCompare(String(bv));
  } else {
    result = Number(av) - Number(bv);
  }
  return direction === 'asc' ? result : -result;
}

/**
 * Centralizes client-side sort + filter + pagination for table-driven pages.
 */
export function useTableState<T>({
  data,
  initialSortField = null,
  initialSortDirection = 'asc',
  pageSize = 10,
  filterFn,
  sortAccessor = defaultAccessor,
}: UseTableStateOptions<T>): UseTableStateReturn<T> {
  const [sortField, setSortField] = useState<string | null>(
    initialSortField != null ? String(initialSortField) : null,
  );
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialSortDirection);
  const [page, setPageState] = useState(1);

  const filtered = useMemo(() => {
    return filterFn ? data.filter(filterFn) : data;
  }, [data, filterFn]);

  const sorted = useMemo(() => {
    if (!sortField) return filtered;
    return [...filtered].sort((a, b) =>
      compare(sortAccessor(a, sortField), sortAccessor(b, sortField), sortDirection),
    );
  }, [filtered, sortField, sortDirection, sortAccessor]);

  const filteredCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(filteredCount / pageSize));

  // Clamp page if data shrank below current page.
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredCount);

  const paginated = useMemo(
    () => sorted.slice(startIndex, startIndex + pageSize),
    [sorted, startIndex, pageSize],
  );

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const setSort = (field: string | null, direction: SortDirection = 'asc') => {
    setSortField(field);
    setSortDirection(direction);
  };

  const setPage = (p: number) => setPageState(Math.max(1, p));
  const nextPage = () => setPageState((p) => Math.min(totalPages, p + 1));
  const prevPage = () => setPageState((p) => Math.max(1, p - 1));

  return {
    sortField,
    sortDirection,
    toggleSort,
    setSort,
    page: safePage,
    pageSize,
    totalPages,
    setPage,
    nextPage,
    prevPage,
    startIndex,
    endIndex,
    filtered,
    sorted,
    paginated,
    totalCount: data.length,
    filteredCount,
  };
}

export default useTableState;
