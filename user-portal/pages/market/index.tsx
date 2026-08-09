import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { api } from '@/lib/api';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Toast from '@/components/Toast';
import EmptyState from '@/components/ui/EmptyState';
import CatalogItemCard, { CatalogItem } from '@/components/network/CatalogItemCard';
import CatalogItemModal from '@/components/network/CatalogItemModal';
import CatalogCartDrawer, { CartGroup } from '@/components/network/CatalogCartDrawer';
import { useSearchStore } from '@/store/searchStore';

interface NetworkBusiness {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  businessType?: string | null;
  logo?: string | null;
  country?: string | null;
  currency?: string | null;
}

type View = 'browse' | 'catalog';

interface CartEntry {
  item: CatalogItem;
  qty: number;
}

const CART_STORAGE_KEY = 'kuza:catalog-cart';
const CATALOG_PAGE_SIZE = 24;

export default function MarketPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const [view, setView] = useState<View>('catalog');
  // Search is driven by the top-nav box (usePageSearch/searchStore), enabled only
  // on the searchable views below.
  const search = useSearchStore((s) => s.query);
  const setSearchEnabled = useSearchStore((s) => s.setEnabled);
  const setNavQuery = useSearchStore((s) => s.setQuery);
  const resetSearch = useSearchStore((s) => s.reset);
  const [supplierOnly, setSupplierOnly] = useState(true);

  const [directory, setDirectory] = useState<NetworkBusiness[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  // Catalog is paginated (infinite scroll): fetch a page at a time and append.
  const [catalogHasMore, setCatalogHasMore] = useState(false);
  const [catalogLoadingMore, setCatalogLoadingMore] = useState(false);
  const catalogOffsetRef = useRef(0);
  const catalogSentinelRef = useRef<HTMLDivElement | null>(null);

  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [requested, setRequested] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const reqId = useRef(0);

  // Multi-supplier cart, persisted to sessionStorage so it survives modal opens / re-renders.
  const [cart, setCart] = useState<Record<string, CartEntry>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(CART_STORAGE_KEY);
      if (raw) setCart(JSON.parse(raw) as Record<string, CartEntry>);
    } catch {
      /* ignore malformed cart */
    }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      /* storage unavailable — cart stays in-memory */
    }
  }, [cart]);

  const addToCart = useCallback((item: CatalogItem) => {
    const qty = Math.max(1, item.moq || 1);
    setCart((prev) => ({ ...prev, [item.id]: { item, qty } }));
  }, []);

  const setQty = useCallback((id: string, qty: number) => {
    setCart((prev) => {
      const entry = prev[id];
      if (!entry) return prev;
      if (qty <= 0) {
        const { [id]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: { ...entry, qty } };
    });
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCart((prev) => {
      const { [id]: _removed, ...rest } = prev;
      return rest;
    });
  }, []);

  const clearCart = useCallback(() => setCart({}), []);

  const groupsBySupplier = useMemo<CartGroup[]>(() => {
    const map = new Map<string, CartGroup>();
    for (const { item, qty } of Object.values(cart)) {
      const g = map.get(item.supplierTenantId);
      const line = {
        id: item.id,
        name: item.name,
        qty,
        unit: item.unit,
        price: item.price,
        currency: item.currency,
        sourceInventoryItemId: item.sourceInventoryItemId,
      };
      if (g) g.lines.push(line);
      else map.set(item.supplierTenantId, { supplierTenantId: item.supplierTenantId, supplierName: item.supplierName, lines: [line] });
    }
    return Array.from(map.values());
  }, [cart]);

  const cartItemCount = Object.keys(cart).length;
  const cartSupplierCount = groupsBySupplier.length;

  // Enable the top-nav search only on the searchable views (Catalog, Find
  // suppliers); clear the query whenever the view switches. Reset on unmount so
  // leaving Market disables the box.
  useEffect(() => {
    if (view === 'catalog') {
      setSearchEnabled(true, t('market.searchCatalogPlaceholder', 'Search items…'));
    } else if (view === 'browse') {
      setSearchEnabled(true, t('market.searchPlaceholder', 'Search businesses…'));
    } else {
      setSearchEnabled(false, '');
    }
    setNavQuery('');
  }, [view, setSearchEnabled, setNavQuery, t]);

  useEffect(() => () => resetSearch(), [resetSearch]);

  // Directory (browse) is debounced against the search/supplierOnly filters.
  useEffect(() => {
    if (view !== 'browse') return;
    const id = ++reqId.current;
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const res = await api.get<{ success: boolean; data: NetworkBusiness[] }>(
          `/network/directory?search=${encodeURIComponent(search.trim())}&supplierOnly=${supplierOnly}`,
        );
        if (id !== reqId.current) return;
        if (res.success) setDirectory(res.data || []);
      } catch (err) {
        if (id !== reqId.current) return;
        const e = err as { response?: { data?: { message?: string } } };
        setToast({ message: e?.response?.data?.message || t('market.loadFailed', 'Failed to load businesses'), type: 'error' });
      } finally {
        if (id === reqId.current) setLoading(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [view, search, supplierOnly, t]);

  // Catalog browse — paginated. `reset` starts a fresh search from offset 0;
  // otherwise it appends the next page (infinite scroll). Guarded by reqId so a
  // stale search/page can't clobber a newer one.
  const fetchCatalogPage = useCallback(
    async (reset: boolean) => {
      const id = ++reqId.current;
      const offset = reset ? 0 : catalogOffsetRef.current;
      if (reset) setLoading(true);
      else setCatalogLoadingMore(true);
      try {
        const res = await api.get<{ success: boolean; data: CatalogItem[]; hasMore?: boolean }>(
          `/network/catalog/browse?search=${encodeURIComponent(search.trim())}&limit=${CATALOG_PAGE_SIZE}&offset=${offset}`,
        );
        if (id !== reqId.current) return;
        const items = res.data || [];
        setCatalog((prev) => (reset ? items : [...prev, ...items]));
        catalogOffsetRef.current = offset + items.length;
        setCatalogHasMore(!!res.hasMore);
      } catch (err) {
        if (id !== reqId.current) return;
        const e = err as { response?: { data?: { message?: string } } };
        setToast({ message: e?.response?.data?.message || t('catalog.loadFailed', 'Failed to load catalog'), type: 'error' });
        if (reset) {
          setCatalog([]);
          setCatalogHasMore(false);
        }
      } finally {
        if (id === reqId.current) {
          setLoading(false);
          setCatalogLoadingMore(false);
        }
      }
    },
    [search, t],
  );

  // Reset + fetch the first page whenever the view or search changes (debounced).
  useEffect(() => {
    if (view !== 'catalog') return;
    const handle = setTimeout(() => {
      catalogOffsetRef.current = 0;
      fetchCatalogPage(true);
    }, 300);
    return () => clearTimeout(handle);
  }, [view, search, fetchCatalogPage]);

  // Infinite scroll: load the next page when the sentinel nears the viewport.
  useEffect(() => {
    if (view !== 'catalog') return;
    const el = catalogSentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && catalogHasMore && !catalogLoadingMore && !loading) {
          fetchCatalogPage(false);
        }
      },
      { rootMargin: '600px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [view, catalogHasMore, catalogLoadingMore, loading, fetchCatalogPage]);

  const handleCheckoutDone = (message: string) => {
    setToast({ message, type: 'success' });
    clearCart();
    setCartOpen(false);
    router.push('/network/orders');
  };

  const requestPartnership = async (b: NetworkBusiness) => {
    setBusy((s) => ({ ...s, [b.tenantId]: true }));
    try {
      const res = await api.post<{ success: boolean }>('/network/partnerships/request', { supplierTenantId: b.tenantId });
      if (res.success) {
        setRequested((s) => ({ ...s, [b.tenantId]: true }));
        setToast({ message: t('market.requestSent', 'Partnership request sent'), type: 'success' });
      }
    } catch (err) {
      const e = err as { response?: { status?: number; data?: { message?: string } } };
      const dup = e?.response?.status === 409;
      if (dup) setRequested((s) => ({ ...s, [b.tenantId]: true }));
      setToast({
        message: dup
          ? t('market.alreadyConnected', 'You already have a partnership with this business')
          : e?.response?.data?.message || t('market.requestFailed', 'Failed to send request'),
        type: dup ? 'info' : 'error',
      });
    } finally {
      setBusy((s) => ({ ...s, [b.tenantId]: false }));
    }
  };

  const filters: { key: View; label: string; count?: number }[] = [
    { key: 'catalog', label: t('market.filterCatalog', 'Catalog') },
    { key: 'browse', label: t('market.filterBrowse', 'Find suppliers') },
  ];

  const avatar = (name: string, logo?: string | null) =>
    logo ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logo} alt={name} className="h-12 w-12 shrink-0 rounded-lg object-contain ring-1 ring-gray-200 dark:ring-gray-700" />
    ) : (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-500/10">
        <span className="text-lg font-semibold text-brand-700 dark:text-brand-300">{(name || '?').trim().charAt(0).toUpperCase()}</span>
      </div>
    );

  return (
    <div className="w-full space-y-5">
      <PageHeader
        title={t('market.title', 'Market')}
        subtitle={t('market.subtitle', 'Discover businesses on Kuza and shop their catalogs.')}
      />

      {/* Filters — sticky segmented view selector + search. Pins to the top of
          the scroll area (just under the header) once the page scrolls past it. */}
      <div className="sticky top-0 z-30 flex flex-col gap-3 border-b border-gray-200 bg-canvas py-3 dark:border-gray-800 dark:bg-gray-950 sm:flex-row sm:items-center">
        <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-0.5">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setView(f.key)}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                view === f.key
                  ? 'bg-brand-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'
              }`}
            >
              {f.label}
              {f.count ? (
                <span className={`rounded-full px-1.5 text-xs ${view === f.key ? 'bg-white/20' : 'bg-gray-200 dark:bg-gray-700'}`}>
                  {f.count}
                </span>
              ) : null}
            </button>
          ))}
        </div>
        {/* Search moved to the top-nav box (active on Catalog + Find suppliers). */}
        {view === 'browse' && (
          <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300 sm:ml-auto">
            <input
              type="checkbox"
              checked={supplierOnly}
              onChange={(e) => setSupplierOnly(e.target.checked)}
              className="h-4 w-4 cursor-pointer rounded border-gray-300 text-brand-600 focus-visible:ring-brand-500 dark:border-gray-600 dark:bg-gray-700"
            />
            {t('market.suppliersOnly', 'Suppliers only')}
          </label>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-brand-600" />
        </div>
      ) : view === 'browse' ? (
        directory.length === 0 ? (
          <EmptyState
            icon="bx-store"
            title={t('market.noBusinesses', 'No businesses found')}
            description={search.trim() ? t('market.noBusinessesSearch', 'Try a different search term.') : t('market.noBusinessesDesc', 'Check back as more businesses join Kuza.')}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {directory.map((b) => {
              const done = requested[b.tenantId];
              return (
                <div key={b.id} className="flex flex-col rounded-2xl bg-white p-4 shadow-card ring-1 ring-gray-950/[0.04] transition-shadow duration-150 hover:ring-brand-300 dark:bg-gray-900 dark:ring-gray-800 dark:hover:ring-brand-700">
                  <div className="flex items-center gap-3">
                    {avatar(b.name, b.logo)}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{b.name}</p>
                      <p className="truncate text-xs text-gray-500 dark:text-gray-400">@{b.slug}</p>
                    </div>
                  </div>
                  {(b.businessType || b.country) && (
                    <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">{[b.businessType, b.country].filter(Boolean).join(' · ')}</p>
                  )}
                  <div className="mt-4">
                    <Button variant={done ? 'secondary' : 'primary'} size="sm" className="w-full" onClick={() => requestPartnership(b)} loading={!!busy[b.tenantId]} disabled={done || !!busy[b.tenantId]}>
                      {done ? t('market.requested', 'Requested') : t('market.connect', 'Connect')}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : catalog.length === 0 ? (
        <EmptyState
          icon="bx-package"
          title={t('market.noCatalog', 'No items yet')}
          description={
            search.trim()
              ? t('market.noCatalogSearch', 'Try a different search term.')
              : t('market.noCatalogDesc', 'Connect with a supplier to see their catalog here, or browse public listings.')
          }
          actions={
            !search.trim() ? (
              <Button variant="primary" size="sm" onClick={() => setView('browse')}>
                <i className="bx bx-search" aria-hidden="true" />
                {t('market.findSuppliersCta', 'Find suppliers')}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {catalog.map((it) => (
              <CatalogItemCard
                key={it.id}
                item={it}
                inCartQty={cart[it.id]?.qty ?? 0}
                onAdd={addToCart}
                onSetQty={setQty}
                onView={setSelectedItem}
              />
            ))}
          </div>

          {/* Infinite scroll: this sentinel triggers the next page as it nears view. */}
          <div ref={catalogSentinelRef} className="h-1" aria-hidden="true" />
          {catalogLoadingMore && (
            <div className="flex items-center justify-center py-6">
              <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-brand-600" />
            </div>
          )}
          {!catalogHasMore && !catalogLoadingMore && catalog.length > 0 && (
            <p className="py-6 text-center text-xs text-gray-400 dark:text-gray-500">
              {t('market.endOfCatalog', "You've reached the end")}
            </p>
          )}
        </>
      )}

      {/* Floating cart button — catalog view only, when the cart has items */}
      {view === 'catalog' && cartItemCount > 0 && !cartOpen && (
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-brand-gradient px-5 py-3 text-sm font-medium text-white shadow-popover transition-colors hover:bg-brand-gradient-hover"
        >
          <span className="relative">
            <i className="bx bx-cart text-xl" aria-hidden="true" />
            <span className="absolute -right-2 -top-2 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-white px-1 text-[11px] font-semibold text-brand-700">
              {cartItemCount}
            </span>
          </span>
          {t('cart.viewOrder', 'View order')}
          <span className="text-xs opacity-80">
            {t('cart.supplierCount', '{{n}} suppliers').replace('{{n}}', String(cartSupplierCount))}
          </span>
        </button>
      )}

      {selectedItem && (
        <CatalogItemModal
          item={selectedItem}
          inCartQty={cart[selectedItem.id]?.qty ?? 0}
          onAdd={(qty) => {
            setCart((prev) => ({ ...prev, [selectedItem.id]: { item: selectedItem, qty } }));
          }}
          onClose={() => setSelectedItem(null)}
        />
      )}

      {cartOpen && (
        <CatalogCartDrawer
          groups={groupsBySupplier}
          onSetQty={setQty}
          onRemove={removeFromCart}
          onClose={() => setCartOpen(false)}
          onCheckoutDone={handleCheckoutDone}
          onError={(message) => setToast({ message, type: 'error' })}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale || 'en', ['common'])),
    },
  };
};
