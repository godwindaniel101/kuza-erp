import { useMemo } from 'react';
import { SearchIcon, InventoryIcon } from '@/components/icons';
import EmptyState from '@/components/ui/EmptyState';
import ProductCard from './ProductCard';
import type { PosProduct } from './types';

interface ProductGridProps {
  products: PosProduct[];
  loading: boolean;
  error: string | null;
  search: string;
  onSearch: (value: string) => void;
  activeCategory: string;
  onCategory: (value: string) => void;
  /** productId → quantity currently in cart. */
  cartCounts: Record<string, number>;
  onAdd: (product: PosProduct) => void;
  onRetry: () => void;
  disabled?: boolean;
}

const ALL = '__all__';

/**
 * Left pane: search, category chips and the tappable product grid, with
 * dedicated loading, error and empty states.
 */
export default function ProductGrid({
  products,
  loading,
  error,
  search,
  onSearch,
  activeCategory,
  onCategory,
  cartCounts,
  onAdd,
  onRetry,
  disabled = false,
}: ProductGridProps) {
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchesCat =
        activeCategory === ALL ||
        (activeCategory === '' ? !p.category : p.category === activeCategory);
      const matchesSearch = !q || p.name.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [products, search, activeCategory]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Search */}
      <div className="relative mb-3">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
          <SearchIcon size={18} />
        </span>
        <input
          type="search"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          disabled={disabled}
          placeholder="Search products…"
          className="h-11 w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 text-sm text-gray-900 shadow-sm
            placeholder:text-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500
            focus-visible:border-transparent disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        />
      </div>

      {/* Category chips */}
      {categories.length > 0 && (
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {[{ key: ALL, label: 'All' }, ...categories.map((c) => ({ key: c, label: c }))].map(
            (chip) => {
              const active = activeCategory === chip.key;
              return (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => onCategory(chip.key)}
                  disabled={disabled}
                  className={`h-9 shrink-0 whitespace-nowrap rounded-full px-4 text-[13px] font-medium transition
                    ${
                      active
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'bg-white text-gray-600 ring-1 ring-inset ring-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-gray-800'
                    }`}
                >
                  {chip.label}
                </button>
              );
            },
          )}
        </div>
      )}

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-y-auto pr-0.5 py-2">
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-[132px] animate-pulse rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-800/60"
              />
            ))}
          </div>
        ) : error ? (
          <EmptyState
            icon="bx-error-circle"
            title="Couldn't load products"
            description={error}
            actions={
              <button
                type="button"
                onClick={onRetry}
                className="h-9 rounded-lg bg-brand-600 px-4 text-[13px] font-medium text-white hover:bg-brand-700"
              >
                Try again
              </button>
            }
          />
        ) : disabled ? (
          <EmptyState
            icon="bx-store"
            title="Select a branch"
            description="Choose a branch to load its products and start selling."
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={search ? 'bx-search' : 'bx-box'}
            title={search ? 'No matches' : 'No products in stock'}
            description={
              search
                ? `Nothing matches “${search}”. Try a different term.`
                : 'This branch has no items with available stock yet.'
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {filtered.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                inCart={cartCounts[product.id] || 0}
                onAdd={onAdd}
              />
            ))}
          </div>
        )}
      </div>

      {/* Count footer */}
      {!loading && !error && !disabled && filtered.length > 0 && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
          <InventoryIcon size={14} />
          {filtered.length} {filtered.length === 1 ? 'product' : 'products'}
        </p>
      )}
    </div>
  );
}
