import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { formatMoney, ITEM_PLACEHOLDER, onItemImageError } from '@/lib/format';
import { useShopCart } from '@/components/shop/useShopCart';
import CartDrawer from '@/components/shop/CartDrawer';

/**
 * Public, anonymous retail marketplace (/shop). Browse + search + category
 * filter across every published Kuza store, with a client-side multi-seller
 * cart. Phase 1 — NO checkout/payment (money-path, later). Self-contained: the
 * dashboard Layout is bypassed for /shop.
 */

interface MarketItem {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  currency: string;
  storeName: string;
  storeSlug: string;
  category: string | null;
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';
const LIMIT = 24;

export default function ShopPage() {
  const router = useRouter();
  const cart = useShopCart();
  const [cartOpen, setCartOpen] = useState(false);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState<string[]>([]);

  const [items, setItems] = useState<MarketItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Debounce the search box.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Category chips.
  useEffect(() => {
    fetch(`${API}/api/public/market/categories`)
      .then((r) => r.json())
      .then((j) => { if (j?.success && Array.isArray(j.data)) setCategories(j.data); })
      .catch(() => { /* ignore */ });
  }, []);

  const load = async (pageNum: number, reset: boolean) => {
    if (reset) setLoading(true); else setLoadingMore(true);
    try {
      const url = `${API}/api/public/market?search=${encodeURIComponent(search)}&category=${encodeURIComponent(category)}&page=${pageNum}&limit=${LIMIT}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json?.success && Array.isArray(json.data)) {
        setItems((prev) => (reset ? json.data : [...prev, ...json.data]));
        setHasMore(!!json.hasMore);
        setPage(pageNum);
      }
    } catch {
      /* ignore — leave the current list */
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Refetch page 1 whenever the search or category changes.
  useEffect(() => {
    load(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category]);

  return (
    <>
      <Head>
        <title>Kuza Market — shop across every store</title>
        <meta name="description" content="Browse and buy products from businesses across Kuza." />
      </Head>

      <div className="min-h-screen bg-gray-50 text-gray-900">
        {/* Top bar */}
        <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:gap-5 sm:px-6">
            <Link href="/shop" className="flex shrink-0 items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-gradient text-white"><i className="bx bxs-store-alt text-lg" /></span>
              <span className="hidden text-lg font-bold tracking-tight sm:inline">Kuza Market</span>
            </Link>
            <div className="relative flex-1">
              <i className="bx bx-search pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-xl text-gray-400" />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                aria-label="Search products"
                placeholder="Search products across every store"
                className="h-11 w-full rounded-full border border-gray-200 bg-gray-50 pl-11 pr-4 text-sm outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              aria-label={`Open cart, ${cart.count} items`}
              className="relative shrink-0 rounded-full p-2.5 text-gray-700 hover:bg-gray-100"
            >
              <i className="bx bx-cart text-2xl" />
              {cart.count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-brand-600 px-1 text-[11px] font-bold text-white">
                  {cart.count}
                </span>
              )}
            </button>
          </div>

          {/* Category chips */}
          {categories.length > 0 && (
            <div className="border-t border-gray-100">
              <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-2.5 sm:px-6">
                <Chip active={category === ''} onClick={() => setCategory('')}>All</Chip>
                {categories.map((c) => (
                  <Chip key={c} active={category.toLowerCase() === c.toLowerCase()} onClick={() => setCategory(c)}>{c}</Chip>
                ))}
              </div>
            </div>
          )}
        </header>

        {/* Grid */}
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
          {loading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-2xl bg-white ring-1 ring-gray-100">
                  <div className="aspect-square animate-pulse bg-gray-100" />
                  <div className="space-y-2 p-3">
                    <div className="h-3 w-3/4 animate-pulse rounded bg-gray-100" />
                    <div className="h-3 w-1/3 animate-pulse rounded bg-gray-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-white py-24 text-center text-gray-400">
              <i className="bx bx-search-alt text-5xl" />
              <p className="mt-3 text-sm">No products found{search ? ` for “${search}”` : ''}.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {items.map((it) => (
                  <div key={`${it.storeSlug}-${it.id}`} className="group flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-gray-100 transition hover:-translate-y-0.5 hover:shadow-lg">
                    <a href={`/s/${it.storeSlug}`} target="_blank" rel="noopener noreferrer" className="block">
                      <div className="aspect-square overflow-hidden bg-gray-50">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={it.imageUrl || ITEM_PLACEHOLDER} onError={onItemImageError} alt={it.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                      </div>
                    </a>
                    <div className="flex flex-1 flex-col p-3">
                      <a href={`/s/${it.storeSlug}`} target="_blank" rel="noopener noreferrer">
                        <p className="line-clamp-2 text-sm font-medium text-gray-900 hover:text-brand-600">{it.name}</p>
                      </a>
                      <p className="mt-0.5 truncate text-xs text-gray-400">from {it.storeName}</p>
                      <div className="mt-auto flex items-center justify-between pt-2">
                        <span className="text-sm font-bold text-brand-600">{formatMoney(it.price, it.currency)}</span>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); cart.add({ id: it.id, name: it.name, price: it.price, currency: it.currency, imageUrl: it.imageUrl, storeName: it.storeName, storeSlug: it.storeSlug }); }}
                          aria-label={`Add ${it.name} to cart`}
                          className="inline-flex h-8 items-center gap-1 rounded-lg bg-brand-50 px-2.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-100"
                        >
                          <i className="bx bx-plus" /> Add
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {hasMore && (
                <div className="mt-8 text-center">
                  <button
                    type="button"
                    onClick={() => load(page + 1, false)}
                    disabled={loadingMore}
                    className="inline-flex h-11 items-center rounded-full border border-gray-200 bg-white px-8 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-brand-500 hover:text-brand-600 disabled:opacity-60"
                  >
                    {loadingMore ? 'Loading…' : 'Load more'}
                  </button>
                </div>
              )}
            </>
          )}
        </main>

        <footer className="border-t border-gray-100 bg-white">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-gray-500 sm:flex-row sm:px-6">
            <span>Kuza Market — one place to shop every store.</span>
            <a href="https://kuza.africa" className="hover:text-gray-700">Powered by Kuza</a>
          </div>
        </footer>
      </div>

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cart.items}
        setQty={cart.setQty}
        remove={cart.remove}
        total={cart.total}
        onCheckout={() => { setCartOpen(false); router.push('/shop/checkout'); }}
      />
    </>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
        active ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:ring-gray-300'
      }`}
    >
      {children}
    </button>
  );
}
