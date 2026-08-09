import { useMemo } from 'react';
import { useTranslation } from 'next-i18next';
import { SearchIcon, InventoryIcon } from '@/components/icons';
import EmptyState from '@/components/ui/EmptyState';
import SearchableSelect from '@/components/SearchableSelect';
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
      {/* Search + category filter (searchable select) side by side */}
      <div className="mb-3 flex items-center gap-2">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
            <SearchIcon size={18} />
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            disabled={disabled}
            placeholder={t('pos.searchProducts', 'Search products…')}
            className="h-9 w-full rounded-md border border-gray-300 bg-white pl-10 pr-4 text-sm text-gray-900
              placeholder:text-gray-400 focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500
              focus-visible:border-transparent disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
        </div>
        {categories.length > 0 && (
          <div className="w-40 shrink-0">
            <SearchableSelect
              options={[
                { value: ALL, label: t('pos.allCategories', 'All categories') },
                ...categories.map((c) => ({ value: c, label: c })),
              ]}
              value={activeCategory === '' ? ALL : activeCategory}
              onChange={onCategory}
              disabled={disabled}
              placeholder={t('pos.category', 'Category')}
              searchPlaceholder={t('pos.searchCategory', 'Search category…')}
            />
          </div>
        )}
      </div>

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
          /* 6×6 board: each category is a column (header + item cards). Every cell
             is a shadowed card — real items are tappable, empty slots are faint
             placeholder cards. Columns + rows pad to 6 (skipped while searching). */
          <div className="flex gap-2.5">
            {grouped.map(([category, items]) => (
              <div key={category} className="flex min-w-0 flex-1 basis-0 flex-col gap-2">
                {/* Category header */}
                <button
                  type="button"
                  onClick={() =>
                    onCategory(category === t('pos.uncategorized', 'Uncategorised') ? '' : category)
                  }
                  title={t('pos.showAllInCategory', 'Show all {{category}}', { category })}
                  className="truncate border-b-2 border-accent/40 pb-1.5 text-center text-[12px] font-bold uppercase tracking-wide text-gray-600 transition hover:text-accent dark:text-gray-200"
                >
                  {category}
                </button>
                {/* Item cards */}
                {items.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    inCart={cartCounts[product.id] || 0}
                    onAdd={onAdd}
                  />
                ))}
                {/* Empty placeholder cards to pad rows to 6 (not while searching) */}
                {!search.trim() &&
                  items.length < 6 &&
                  Array.from({ length: 6 - items.length }).map((_, r) => (
                    <div
                      key={`empty-${r}`}
                      className="min-h-[84px] rounded-lg border border-dashed border-gray-200 bg-gray-50/40 shadow-sm dark:border-gray-800 dark:bg-gray-900/30"
                    />
                  ))}
              </div>
            ))}
            {/* Placeholder columns to pad to 6 (not while searching) */}
            {!search.trim() &&
              grouped.length > 0 &&
              grouped.length < 6 &&
              Array.from({ length: 6 - grouped.length }).map((_, i) => (
                <div
                  key={`placeholder-${i}`}
                  aria-hidden="true"
                  className="hidden min-w-0 flex-1 basis-0 flex-col gap-2 md:flex"
                >
                  <div className="truncate border-b-2 border-dashed border-gray-200 pb-1.5 text-center text-[12px] font-bold uppercase tracking-wide text-gray-300 dark:border-gray-800 dark:text-gray-700">
                    —
                  </div>
                  {Array.from({ length: 6 }).map((_, r) => (
                    <div
                      key={r}
                      className="min-h-[84px] rounded-lg border border-dashed border-gray-200 bg-gray-50/40 shadow-sm dark:border-gray-800 dark:bg-gray-900/30"
                    />
                  ))}
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
