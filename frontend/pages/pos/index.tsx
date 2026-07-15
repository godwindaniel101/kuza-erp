import { useCallback, useEffect, useMemo, useState } from 'react';
import { GetServerSideProps } from 'next';
import Link from 'next/link';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import Toast from '@/components/Toast';
import SearchableSelect from '@/components/SearchableSelect';
import { OrderIcon, BranchIcon, PaymentIcon } from '@/components/icons';
import {
  ProductGrid,
  CartPanel,
  OrderDetailsModal,
  availableInUom,
  lineFromProduct,
  formatNaira,
} from '@/components/pos';
import type {
  CartLine,
  OrderMeta,
  OrderType,
  PosBranch,
  PosProduct,
  PosTable,
} from '@/components/pos/types';

const ALL_CATEGORIES = '__all__';

const EMPTY_META: OrderMeta = {
  // Retail counter sale — no dine-in / tables (those are Restaurant-only).
  type: 'takeaway',
  tableId: '',
  customerName: '',
  customerPhone: '',
  notes: '',
  applyVat: false,
  vatPercentage: 7.5,
};

/**
 * Point of Sale — a fast, touch-first two-pane checkout that reuses the exact
 * same API contract as the legacy `/rms/orders/create` flow:
 *   - GET  /settings/branches                        (branch picker)
 *   - GET  /rms/tables                               (optional table select)
 *   - GET  /ims/inventory?forOrders=true&branchId=…  (in-stock products)
 *   - POST /rms/orders  { items:[{inventoryItemId,uomId,quantity}], … }
 *
 * Left pane = product grid; right pane = the running ticket. On tablet/desktop
 * both are visible; on phones the ticket collapses into a bottom bar + drawer.
 */
export default function PosPage() {
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<PosBranch[]>([]);
  const [branchId, setBranchId] = useState('');
  const [tables, setTables] = useState<PosTable[]>([]);

  const [products, setProducts] = useState<PosProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);

  const [lines, setLines] = useState<CartLine[]>([]);
  const [meta, setMeta] = useState<OrderMeta>(EMPTY_META);

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>(ALL_CATEGORIES);

  const [saving, setSaving] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false); // mobile drawer
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  /* ---------------------------------------------------------------- */
  /* Data loading                                                      */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Retail POS: branches only. Tables/dine-in are a Restaurant concept and
        // are intentionally not loaded here, so the table selector stays hidden.
        const branchesRes = await api.get<{ success: boolean; data: PosBranch[] }>('/settings/branches');
        if (cancelled) return;
        if (branchesRes.success) {
          setBranches(branchesRes.data);
          if (branchesRes.data.length > 0) {
            const preferred =
              branchesRes.data.find((b) => b.isDefault) || branchesRes.data[0];
            setBranchId(preferred.id);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setToast({ message: 'Failed to load POS data', type: 'error' });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadProducts = useCallback(async () => {
    if (!branchId) {
      setProducts([]);
      return;
    }
    setProductsLoading(true);
    setProductsError(null);
    try {
      const res = await api.get<{ success: boolean; data: PosProduct[] }>(
        `/ims/inventory?forOrders=true&branchId=${branchId}`,
      );
      if (res.success && Array.isArray(res.data)) {
        setProducts(res.data);
      } else {
        setProducts([]);
      }
    } catch (err: any) {
      setProductsError(
        err?.response?.data?.message || err?.message || 'Failed to load products',
      );
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  }, [branchId]);

  // Reload products and reset the ticket whenever the branch changes — stock,
  // prices and available items are all branch-scoped.
  useEffect(() => {
    setLines([]);
    setSearch('');
    setActiveCategory(ALL_CATEGORIES);
    setMeta((m) => ({ ...m, tableId: '' }));
    loadProducts();
  }, [branchId, loadProducts]);

  /* ---------------------------------------------------------------- */
  /* Cart mutations                                                    */
  /* ---------------------------------------------------------------- */

  const addProduct = useCallback((product: PosProduct) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === product.id);
      if (existing) {
        const max = availableInUom(existing.stockBase, existing.uomToBase, existing.uomId);
        if (max > 0 && existing.quantity >= max) return prev; // stock-bound
        return prev.map((l) =>
          l.productId === product.id ? { ...l, quantity: l.quantity + 1 } : l,
        );
      }
      return [...prev, lineFromProduct(product)];
    });
  }, []);

  const setQty = useCallback((productId: string, quantity: number) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.productId !== productId) return l;
        const max = availableInUom(l.stockBase, l.uomToBase, l.uomId);
        let next = Number.isFinite(quantity) ? quantity : 1;
        if (next < 1) next = 1;
        if (max > 0 && next > max) next = max;
        return { ...l, quantity: next };
      }),
    );
  }, []);

  const setUom = useCallback((productId: string, uomId: string) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.productId !== productId) return l;
        const unitPrice = l.uomPrices?.[uomId] ?? l.unitPrice;
        const max = availableInUom(l.stockBase, l.uomToBase, uomId);
        const quantity = max > 0 && l.quantity > max ? max : l.quantity;
        return { ...l, uomId, unitPrice, quantity };
      }),
    );
  }, []);

  const removeLine = useCallback((productId: string) => {
    setLines((prev) => prev.filter((l) => l.productId !== productId));
  }, []);

  const clearCart = useCallback(() => setLines([]), []);

  /* ---------------------------------------------------------------- */
  /* Derived totals                                                    */
  /* ---------------------------------------------------------------- */

  const cartCounts = useMemo(() => {
    const map: Record<string, number> = {};
    lines.forEach((l) => {
      map[l.productId] = l.quantity;
    });
    return map;
  }, [lines]);

  const subtotal = useMemo(
    () => lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0),
    [lines],
  );
  const vat = useMemo(
    () => (meta.applyVat ? (subtotal * meta.vatPercentage) / 100 : 0),
    [subtotal, meta.applyVat, meta.vatPercentage],
  );
  const total = subtotal + vat;
  const itemCount = useMemo(
    () => lines.reduce((sum, l) => sum + l.quantity, 0),
    [lines],
  );

  /* ---------------------------------------------------------------- */
  /* Submit                                                            */
  /* ---------------------------------------------------------------- */

  const handleSubmit = useCallback(async () => {
    if (!branchId) {
      setToast({ message: 'Please select a branch', type: 'error' });
      return;
    }
    if (lines.length === 0) {
      setToast({ message: 'Add at least one item to the order', type: 'error' });
      return;
    }
    setSaving(true);
    try {
      const response = await api.post<{ success: boolean }>('/rms/orders', {
        branchId,
        tableId: meta.tableId || undefined,
        type: meta.type,
        customerName: meta.customerName || undefined,
        customerPhone: meta.customerPhone || undefined,
        notes: meta.notes || undefined,
        applyVat: meta.applyVat,
        vatPercentage: meta.applyVat ? meta.vatPercentage : undefined,
        items: lines.map((l) => ({
          inventoryItemId: l.productId,
          uomId: l.uomId,
          quantity: l.quantity,
        })),
      });
      if (response.success) {
        setToast({ message: 'Order placed successfully', type: 'success' });
        setLines([]);
        setMeta(EMPTY_META);
        setCartOpen(false);
        // Stock changed — refresh availability for the next sale.
        loadProducts();
      }
    } catch (err: any) {
      setToast({
        message:
          err?.response?.data?.message || err?.message || 'Failed to place order',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  }, [branchId, lines, meta, loadProducts]);

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */

  const cartPanelProps = {
    lines,
    meta,
    tables,
    subtotal,
    vat,
    total,
    itemCount,
    saving,
    onType: (type: OrderType) => setMeta((m) => ({ ...m, type })),
    onQty: setQty,
    onUom: setUom,
    onRemove: removeLine,
    onClear: clearCart,
    onOpenDetails: () => setDetailsOpen(true),
    onSubmit: handleSubmit,
  };

  return (
    <PermissionGuard permission="orders.create">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      <div className="flex h-[calc(100dvh-var(--header-height,56px)-2.5rem)] min-h-0 flex-col gap-3">
        {/* Toolbar */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
              <OrderIcon size={20} />
            </span>
            <div>
              <h1 className="text-sm font-semibold leading-tight text-gray-900 dark:text-gray-100">
                Point of Sale
              </h1>
              <Link
                href="/rms/orders"
                className="text-xs text-gray-500 hover:text-brand-600 hover:underline dark:text-gray-400 dark:hover:text-brand-400"
              >
                View orders list
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden text-gray-400 sm:inline dark:text-gray-500">
              <BranchIcon size={18} />
            </span>
            <div className="w-52 sm:w-64">
              <SearchableSelect
                options={branches.map((branch) => ({
                  value: branch.id,
                  label: `${branch.name}${branch.isDefault ? ' (Default)' : ''}`,
                }))}
                value={branchId}
                onChange={setBranchId}
                placeholder="Select branch"
                searchPlaceholder="Search branch…"
                disabled={loading || branches.length === 0}
              />
            </div>
          </div>
        </div>

        {/* Two panes */}
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_384px]">
          {/* Left — products */}
          <div className="min-h-0 min-w-0">
            <ProductGrid
              products={products}
              loading={loading || productsLoading}
              error={productsError}
              search={search}
              onSearch={setSearch}
              activeCategory={activeCategory}
              onCategory={setActiveCategory}
              cartCounts={cartCounts}
              onAdd={addProduct}
              onRetry={loadProducts}
              disabled={!branchId && !loading}
            />
          </div>

          {/* Right — ticket (desktop / tablet) */}
          <div className="hidden min-h-0 lg:block">
            <CartPanel {...cartPanelProps} />
          </div>
        </div>

        {/* Mobile ticket summary bar */}
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="flex shrink-0 items-center justify-between rounded-xl bg-brand-gradient px-4 py-3 text-white shadow-card transition active:scale-[0.99] lg:hidden"
        >
          <span className="flex items-center gap-2 text-sm font-semibold">
            <span className="flex h-7 min-w-[1.75rem] items-center justify-center rounded-full bg-white/20 px-1.5 text-xs font-bold">
              {itemCount}
            </span>
            View order
          </span>
          <span className="flex items-center gap-2 font-mono text-base font-bold">
            <PaymentIcon size={18} />
            {formatNaira(total)}
          </span>
        </button>
      </div>

      {/* Mobile ticket drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div
            className="absolute inset-0 bg-gray-950/50 backdrop-blur-sm"
            onClick={() => setCartOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-x-0 bottom-0 top-10 overflow-hidden rounded-t-2xl bg-white shadow-popover dark:bg-gray-900">
            <CartPanel {...cartPanelProps} onClose={() => setCartOpen(false)} />
          </div>
        </div>
      )}

      <OrderDetailsModal
        isOpen={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        meta={meta}
        tables={tables}
        onSave={(next) => setMeta(next)}
      />
    </PermissionGuard>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale || 'en', ['common'])),
    },
  };
};
