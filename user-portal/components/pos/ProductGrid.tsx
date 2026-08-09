import { useMemo } from 'react';
import { useTranslation } from 'next-i18next';
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
  const { t } = useTranslation('common');
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

  // Group the visible products by category so the grid reads like a sectioned
  // table (category header, then its items). Sorted A→Z; uncategorised last.
  const grouped = useMemo(() => {
    const uncategorised = t('pos.uncategorized', 'Uncategorised');
    const map = new Map<string, PosProduct[]>();
    filtered.forEach((p) => {
      const cat = p.category || uncategorised;
      const list = map.get(cat);
      if (list) list.push(p);
      else map.set(cat, [p]);
    });
    return Array.from(map.entries()).sort(([a], [b]) => {
      if (a === uncategorised) return 1;
      if (b === uncategorised) return -1;
      return a.localeCompare(b);
    });
  }, [filtered, t]);

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
          placeholder={t('pos.searchProducts', 'Search products…')}
          className="h-11 w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 text-sm text-gray-900 shadow-sm
            placeholder:text-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500
            focus-visible:border-transparent disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        />
      </div>

      {/* Category chips */}
      {categories.length > 0 && (
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {[{ key: ALL, label: t('pos.all', 'All') }, ...categories.map((c) => ({ key: c, label: c }))].map(
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
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="h-[104px] animate-pulse rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-800/60"
              />
            ))}
          </div>
        ) : error ? (
          <EmptyState
            icon="bx-error-circle"
            title={t('pos.couldntLoadProducts', "Couldn't load products")}
            description={error}
            actions={
              <button
                type="button"
                onClick={onRetry}
                className="h-9 rounded-lg bg-brand-600 px-4 text-[13px] font-medium text-white hover:bg-brand-700"
              >
                {t('pos.tryAgain', 'Try again')}
              </button>
            }
          />
        ) : disabled ? (
          <EmptyState
            icon="bx-store"
            title={t('pos.selectABranch', 'Select a branch')}
            description={t('pos.selectBranchDescription', 'Choose a branch to load its products and start selling.')}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={search ? 'bx-search' : 'bx-box'}
            title={search ? t('pos.noMatches', 'No matches') : t('pos.noProductsInStock', 'No products in stock')}
            description={
              search
                ? t('pos.noMatchesDescription', 'Nothing matches “{{query}}”. Try a different term.', { query: search })
                : t('pos.noStockDescription', 'This branch has no items with available stock yet.')
            }
          />
        ) : (
          /* Category-column board: each category is a column (header + its items
             stacked). Columns wrap and grow to fill; a category with no matching
             items simply isn't rendered, so search removes empty columns. */
          <div className="flex flex-wrap items-start gap-2.5">
            {grouped.map(([category, items]) => (
              <div key={category} className="flex min-w-[136px] flex-1 basis-[150px] flex-col">
                {/* Column header = category (tap to show only this category) */}
                <button
                  type="button"
                  onClick={() =>
                    onCategory(category === t('pos.uncategorized', 'Uncategorised') ? '' : category)
                  }
                  title={t('pos.showAllInCategory', 'Show all {{category}}', { category })}
                  className="group sticky top-0 z-[1] mb-2 flex items-center border-b-2 border-accent/40 bg-canvas pb-1.5 pt-0.5 text-left dark:bg-gray-950"
                >
                  <span className="truncate text-[12px] font-bold uppercase tracking-wide text-gray-700 transition group-hover:text-accent dark:text-gray-200">
                    {category}
                  </span>
                </button>
                {/* Items under the category */}
                <div className="space-y-1.5">
                  {items.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      inCart={cartCounts[product.id] || 0}
                      onAdd={onAdd}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Count footer */}
      {!loading && !error && !disabled && filtered.length > 0 && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
          <InventoryIcon size={14} />
          {filtered.length} {filtered.length === 1 ? t('pos.product', 'product') : t('pos.products', 'products')}
        </p>
      )}
    </div>
  );
}
