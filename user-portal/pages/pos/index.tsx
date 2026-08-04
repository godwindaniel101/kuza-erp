import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GetServerSideProps } from 'next';
import Link from 'next/link';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import Toast from '@/components/Toast';
import Modal from '@/components/Modal';
import Receipt from '@/components/Receipt';
import SearchableSelect from '@/components/SearchableSelect';
import { useCurrency } from '@/lib/format';
import { useTenantStore } from '@/store/globalStore';
import { term } from '@/lib/terminology';
import { useUiStore } from '@/store/uiStore';
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
  const { t } = useTranslation('common');
  const currency = useCurrency();
  const { businessName, businessType } = useTenantStore();
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<PosBranch[]>([]);
  const [branchId, setBranchId] = useState('');
  const [tables, setTables] = useState<PosTable[]>([]);

  const [products, setProducts] = useState<PosProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);

  // Multiple concurrent sales — each "tab" holds its own cart + order meta, so a
  // cashier can park a sale and start another. Branch & products are shared.
  type SaleTab = { id: string; lines: CartLine[]; meta: OrderMeta };
  const [tabs, setTabs] = useState<SaleTab[]>([{ id: 'sale-1', lines: [], meta: EMPTY_META }]);
  const [activeTabId, setActiveTabId] = useState('sale-1');
  const activeTabIdRef = useRef(activeTabId);
  useEffect(() => {
    activeTabIdRef.current = activeTabId;
  }, [activeTabId]);
  const tabSeq = useRef(1);

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];
  const lines = activeTab.lines;
  const meta = activeTab.meta;

  // Wrappers so the rest of the file is unchanged: they update only the active
  // tab's cart / meta, and accept either a value or an updater function.
  const setLines = useCallback(
    (v: CartLine[] | ((p: CartLine[]) => CartLine[])) =>
      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTabIdRef.current
            ? { ...t, lines: typeof v === 'function' ? (v as (p: CartLine[]) => CartLine[])(t.lines) : v }
            : t,
        ),
      ),
    [],
  );
  const setMeta = useCallback(
    (v: OrderMeta | ((p: OrderMeta) => OrderMeta)) =>
      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTabIdRef.current
            ? { ...t, meta: typeof v === 'function' ? (v as (p: OrderMeta) => OrderMeta)(t.meta) : v }
            : t,
        ),
      ),
    [],
  );

  const addTab = useCallback(() => {
    tabSeq.current += 1;
    const id = `sale-${tabSeq.current}`;
    setTabs((prev) => [...prev, { id, lines: [], meta: EMPTY_META }]);
    setActiveTabId(id);
  }, []);
  const closeTab = useCallback((id: string) => {
    setTabs((prev) => {
      if (prev.length <= 1) return prev.map((t) => ({ ...t, lines: [], meta: EMPTY_META }));
      const idx = prev.findIndex((t) => t.id === id);
      const next = prev.filter((t) => t.id !== id);
      if (id === activeTabIdRef.current) setActiveTabId((next[Math.max(0, idx - 1)] || next[0]).id);
      return next;
    });
  }, []);

  // Full-screen toggle (browser Fullscreen API) for a distraction-free counter.
  const [isFullscreen, setIsFullscreen] = useState(false);
  const setSidebarCollapsed = useUiStore((s) => s.setSidebarCollapsed);
  useEffect(() => {
    const onChange = () => setIsFullscreen(typeof document !== 'undefined' && !!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);
  // Hide the sidebar while POS is full screen; restore it on exit / leaving POS.
  useEffect(() => {
    setSidebarCollapsed(isFullscreen);
  }, [isFullscreen, setSidebarCollapsed]);
  useEffect(() => () => setSidebarCollapsed(false), [setSidebarCollapsed]);
  const toggleFullscreen = useCallback(() => {
    if (typeof document === 'undefined') return;
    if (!document.fullscreenElement) {
      void (document.documentElement.requestFullscreen?.() ?? Promise.resolve()).catch(() => {});
    } else {
      void document.exitFullscreen?.();
    }
  }, []);

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>(ALL_CATEGORIES);

  const [saving, setSaving] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false); // mobile drawer
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  // Just-completed sale — used to offer a receipt print in the success modal.
  const [lastOrder, setLastOrder] = useState<any>(null);
  const [successOpen, setSuccessOpen] = useState(false);
  // Bank-transfer collection (Payment module): available when the branch has an
  // active transfer method; `awaiting` drives the awaiting-payment modal.
  const [hasTransfer, setHasTransfer] = useState(false);
  // Awaiting bank-transfer payments keyed by sale tab, so other tabs keep
  // working while one waits. A single background poller drives all of them.
  const [awaitingByTab, setAwaitingByTab] = useState<
    Record<
      string,
      {
        txId: string;
        account: any;
        amount: number;
        status: 'awaiting' | 'paid';
        items?: Array<{ name: string; quantity: number; totalPrice?: number }>;
        orderNumber?: string;
      }
    >
  >({});
  const [awaitingModalTab, setAwaitingModalTab] = useState<string | null>(null);

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
            // Restore the last-used branch so the cashier doesn't reselect each visit.
            const saved = typeof window !== 'undefined' ? localStorage.getItem('kuza.pos.branchId') : null;
            const preferred =
              (saved && branchesRes.data.find((b) => b.id === saved)) ||
              branchesRes.data.find((b) => b.isDefault) ||
              branchesRes.data[0];
            setBranchId(preferred.id);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setToast({ message: t('pos.failedToLoadData', 'Failed to load POS data'), type: 'error' });
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
      setProducts(res.success && Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      setProductsError(
        err?.response?.data?.message || err?.message || t('pos.failedToLoadProducts', 'Failed to load products'),
      );
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  }, [branchId]);

  // On branch change (and refresh), restore this branch's parked sale tabs +
  // awaiting payments from localStorage so nothing is lost on reload. Falls back
  // to a single fresh sale when there's nothing saved.
  useEffect(() => {
    setSearch('');
    setActiveCategory(ALL_CATEGORIES);
    const fresh = () => {
      setTabs([{ id: 'sale-1', lines: [], meta: EMPTY_META }]);
      setActiveTabId('sale-1');
      setAwaitingByTab({});
      tabSeq.current = 1;
    };
    if (branchId) {
      try {
        const raw = localStorage.getItem(`kuza-pos-${branchId}`);
        const saved = raw ? JSON.parse(raw) : null;
        if (saved?.tabs?.length) {
          setTabs(saved.tabs);
          setActiveTabId(
            saved.activeTabId && saved.tabs.some((t: any) => t.id === saved.activeTabId)
              ? saved.activeTabId
              : saved.tabs[0].id,
          );
          setAwaitingByTab(saved.awaitingByTab || {});
          tabSeq.current = saved.tabs.reduce(
            (m: number, t: any) => Math.max(m, parseInt(String(t.id).replace('sale-', ''), 10) || 1),
            1,
          );
        } else {
          fresh();
        }
      } catch {
        fresh();
      }
    } else {
      fresh();
    }
    loadProducts();
  }, [branchId, loadProducts]);

  // Persist tabs + awaiting per branch so a refresh keeps them.
  useEffect(() => {
    if (!branchId) return;
    try {
      localStorage.setItem(
        `kuza-pos-${branchId}`,
        JSON.stringify({ tabs, activeTabId, awaitingByTab }),
      );
    } catch {
      /* storage full / unavailable — non-fatal */
    }
  }, [tabs, activeTabId, awaitingByTab, branchId]);

  // Does this branch have an active bank-transfer payment option?
  useEffect(() => {
    let active = true;
    if (!branchId) {
      setHasTransfer(false);
      return;
    }
    (async () => {
      try {
        const res = await api.get<{ success: boolean; data: any[] }>(
          `/payments/methods?branchId=${branchId}`,
        );
        if (active) {
          setHasTransfer(
            !!res?.data?.some((m: any) => m.type === 'bank_transfer' && m.status === 'active'),
          );
        }
      } catch {
        if (active) setHasTransfer(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [branchId]);

  const collectByTransfer = useCallback(async () => {
    const order = lastOrder;
    if (!order?.id) return;
    try {
      const res = await api.post<{ success: boolean; data: any }>('/payments/awaiting', {
        branchId,
        orderId: order.id,
        amount: Number(order.totalAmount ?? order.total ?? 0),
      });
      if (res.success) {
        const tabId = activeTabIdRef.current;
        setSuccessOpen(false);
        setAwaitingByTab((prev) => ({
          ...prev,
          [tabId]: {
            txId: res.data.transaction.id,
            account: res.data.account,
            amount: Number(order.totalAmount ?? order.total ?? 0),
            status: 'awaiting',
            orderNumber: order.orderNumber,
            items: (order.items || []).map((it: any) => ({
              name: it.name,
              quantity: Number(it.quantity) || 0,
              totalPrice: Number(it.totalPrice ?? 0),
            })),
          },
        }));
        setAwaitingModalTab(tabId);
      }
    } catch (e: any) {
      setToast({
        message: e?.response?.data?.message || t('pos.couldNotStartTransfer', 'Could not start transfer collection'),
        type: 'error',
      });
    }
  }, [branchId, lastOrder]);

  // Background poller for ALL awaiting tabs — runs regardless of which tab is
  // active or whether the awaiting modal is open, so a parked sale still gets
  // marked paid while the cashier serves other customers.
  useEffect(() => {
    const pending = Object.entries(awaitingByTab).filter(([, a]) => a.status === 'awaiting');
    if (pending.length === 0) return;
    const poll = async () => {
      for (const [tabId, a] of pending) {
        try {
          const res = await api.get<{ success: boolean; data: any }>(
            `/payments/transactions/${a.txId}`,
          );
          if (res?.data?.status === 'paid') {
            setAwaitingByTab((prev) =>
              prev[tabId] ? { ...prev, [tabId]: { ...prev[tabId], status: 'paid' } } : prev,
            );
            setToast({ message: t('pos.paymentReceived', 'Payment received'), type: 'success' });
            setTimeout(() => {
              setAwaitingByTab((prev) => {
                const next = { ...prev };
                delete next[tabId];
                return next;
              });
              setAwaitingModalTab((cur) => (cur === tabId ? null : cur));
              // Payment landed → clear that tab's cart (it may not be active).
              setTabs((prev) =>
                prev.map((t) => (t.id === tabId ? { ...t, lines: [], meta: EMPTY_META } : t)),
              );
            }, 1600);
          }
        } catch {
          /* keep polling */
        }
      }
    };
    const id = setInterval(poll, 3000);
    return () => clearInterval(id);
  }, [awaitingByTab]);

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
      setToast({ message: t('pos.pleaseSelectBranch', 'Please select a branch'), type: 'error' });
      return;
    }
    if (lines.length === 0) {
      setToast({ message: t('pos.addAtLeastOneItem', 'Add at least one item to the order'), type: 'error' });
      return;
    }
    setSaving(true);
    try {
      const response = await api.post<{ success: boolean; data?: any }>('/rms/orders', {
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
        // Build a receipt-ready order from the create response, falling back to
        // the just-submitted ticket for any fields the API doesn't echo back.
        const created = response.data || {};
        const branch = branches.find((b) => b.id === branchId);
        const receiptOrder = {
          ...created,
          orderNumber: created.orderNumber || created.id || '',
          createdAt: created.createdAt || new Date().toISOString(),
          orderType: created.orderType ?? meta.type,
          branch: created.branch || (branch ? { name: branch.name } : undefined),
          customerName: created.customerName ?? (meta.customerName || undefined),
          customerPhone: created.customerPhone ?? (meta.customerPhone || undefined),
          items:
            Array.isArray(created.items) && created.items.length > 0
              ? created.items
              : lines.map((l) => ({
                  name: l.name,
                  quantity: l.quantity,
                  uom: l.uoms?.find((u) => u.id === l.uomId),
                  unitPrice: l.unitPrice,
                  totalPrice: l.unitPrice * l.quantity,
                })),
          subtotal: created.subtotal ?? subtotal,
          tax: created.tax ?? vat,
          totalAmount: created.totalAmount ?? total,
        };
        setLastOrder(receiptOrder);
        setSuccessOpen(true);
        setCartOpen(false);
        // NOTE: the cart is intentionally NOT cleared here — it's cleared on
        // "Done" (cash) or when a bank transfer is confirmed paid, so a sale
        // awaiting transfer keeps showing its items.
        // Stock changed — refresh availability for the next sale.
        loadProducts();
      }
    } catch (err: any) {
      setToast({
        message:
          err?.response?.data?.message || err?.message || t('pos.failedToPlaceOrder', 'Failed to place order'),
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  }, [branchId, lines, meta, loadProducts, branches, subtotal, vat, total]);

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

      <div className="kz-stagger flex h-[calc(100dvh-var(--header-height,56px)-2.5rem)] min-h-0 flex-col gap-3">
        {/* Toolbar */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent">
              <OrderIcon size={20} />
            </span>
            <div>
              <h1 className="font-display text-sm font-semibold leading-tight tracking-tight text-gray-900 dark:text-gray-100">
                {term(businessType, 'pos')}
              </h1>
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
                onChange={(v) => {
                  setBranchId(v);
                  if (typeof window !== 'undefined') localStorage.setItem('kuza.pos.branchId', v);
                }}
                placeholder={t('pos.selectBranch', 'Select branch')}
                searchPlaceholder={t('pos.searchBranch', 'Search branch…')}
                disabled={loading || branches.length === 0}
              />
            </div>
            <button
              type="button"
              onClick={toggleFullscreen}
              title={isFullscreen ? t('pos.exitFullScreen', 'Exit full screen') : t('pos.fullScreen', 'Full screen')}
              aria-label={isFullscreen ? t('pos.exitFullScreen', 'Exit full screen') : t('pos.fullScreen', 'Full screen')}
              className="hidden sm:inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-500 transition hover:text-gray-900 dark:hover:text-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
            >
              <i className={`bx ${isFullscreen ? 'bx-exit-fullscreen' : 'bx-fullscreen'} text-lg`} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Sale tabs — park multiple carts and switch between them */}
        <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto p-0.5">
          {tabs.map((tab, i) => {
            const count = tab.lines.reduce((s, l) => s + l.quantity, 0);
            const active = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                onClick={() => {
                  setActiveTabId(tab.id);
                  if (awaitingByTab[tab.id]) setAwaitingModalTab(tab.id);
                }}
                className={`flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border px-3 text-[13px] font-medium transition-colors ${
                  active
                    ? 'border-transparent bg-accent-soft text-accent ring-1 ring-accent-ring'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'
                }`}
                title={awaitingByTab[tab.id] ? t('pos.awaitingTransfer', 'Awaiting transfer') : undefined}
              >
                {awaitingByTab[tab.id] && (
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      awaitingByTab[tab.id].status === 'paid' ? 'bg-emerald-500' : 'animate-pulse bg-amber-500'
                    }`}
                  ></span>
                )}
                <span>{t('pos.sale', 'Sale {{n}}', { n: i + 1 })}</span>
                {count > 0 && (
                  <span className="flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-accent-gradient px-1 text-[10px] font-bold tabular-nums text-white">
                    {count}
                  </span>
                )}
                {tabs.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(tab.id);
                    }}
                    aria-label={t('pos.closeSale', 'Close Sale {{n}}', { n: i + 1 })}
                    className="-mr-1 ml-0.5 flex h-5 w-5 items-center justify-center rounded text-gray-400 hover:text-red-500"
                  >
                    <i className="bx bx-x text-base" aria-hidden="true" />
                  </button>
                )}
              </div>
            );
          })}
          <button
            type="button"
            onClick={addTab}
            aria-label={t('pos.newSale', 'New sale')}
            className="flex h-8 shrink-0 items-center gap-1 rounded-lg border border-dashed border-gray-300 px-2.5 text-[13px] font-medium text-gray-500 transition-colors hover:border-accent hover:text-accent dark:border-gray-600"
          >
            <i className="bx bx-plus text-base" aria-hidden="true" /> {t('pos.newSale', 'New sale')}
          </button>
        </div>

        {/* Two panes */}
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_344px]">
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
          className="flex shrink-0 items-center justify-between rounded-xl bg-accent-gradient px-4 py-3 text-white shadow-card transition active:scale-[0.99] lg:hidden"
        >
          <span className="flex items-center gap-2 text-sm font-semibold">
            <span className="flex h-7 min-w-[1.75rem] items-center justify-center rounded-full bg-white/20 px-1.5 text-xs font-bold tabular-nums">
              {itemCount}
            </span>
            {t('pos.viewOrder', 'View order')}
          </span>
          <span className="flex items-center gap-2 font-display text-base font-bold tabular-nums tracking-tight">
            <PaymentIcon size={18} />
            {formatNaira(total)}
          </span>
        </button>
      </div>

      {/* Mobile ticket drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div
            className="absolute inset-0 bg-gray-950/45 backdrop-blur-md"
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

      {/* Awaiting transfer — non-blocking: close it and keep serving; the tab's
          amber dot stays and the background poller flips it to paid. */}
      {awaitingModalTab && awaitingByTab[awaitingModalTab] && (() => {
        const a = awaitingByTab[awaitingModalTab];
        const paid = a.status === 'paid';
        return (
          <Modal
            isOpen
            onClose={() => setAwaitingModalTab(null)}
            title={t('pos.awaitingPayment', 'Awaiting payment')}
            maxWidth="sm"
            closeOnOutsideClick={false}
            footer={
              <button
                type="button"
                onClick={() => setAwaitingModalTab(null)}
                className="h-9 whitespace-nowrap rounded-lg border border-gray-300 px-4 text-[13px] font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                {paid ? t('pos.done', 'Done') : t('pos.keepServingOthers', 'Keep serving others')}
              </button>
            }
          >
            {paid ? (
              <div className="py-6 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300">
                  <i className="bx bx-check text-3xl"></i>
                </div>
                <p className="font-display font-semibold tracking-tight text-gray-900 dark:text-gray-100">{t('pos.paymentReceived', 'Payment received')}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('pos.amountConfirmed', '{{amount}} confirmed.', { amount: formatNaira(a.amount) })}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {a.items && a.items.length > 0 && (
                  <div className="rounded-xl border border-gray-200 dark:border-gray-800">
                    <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2 text-xs font-medium text-gray-500 dark:border-gray-800 dark:text-gray-400">
                      <span>{a.orderNumber || t('pos.order', 'Order')}</span>
                      <span>{t('pos.itemCount', '{{count}} item(s)', { count: a.items.reduce((s, it) => s + it.quantity, 0) })}</span>
                    </div>
                    <div className="max-h-40 overflow-y-auto">
                      {a.items.map((it, idx) => (
                        <div key={idx} className="flex items-center justify-between px-3 py-1.5 text-sm">
                          <span className="truncate text-gray-700 dark:text-gray-300">
                            <span className="text-gray-400">{it.quantity}×</span> {it.name}
                          </span>
                          <span className="tabular-nums text-gray-600 dark:text-gray-400">
                            {formatNaira(it.totalPrice || 0)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('pos.askCustomerTransfer', 'Ask the customer to transfer {{amount}} to:', { amount: formatNaira(a.amount) })}
                </p>
                {a.account ? (
                  <div className="rounded-xl bg-gradient-to-br from-gray-900 to-gray-700 px-4 py-4 text-white dark:from-gray-800 dark:to-gray-900">
                    <p className="text-[11px] uppercase tracking-wide text-white/60">{a.account.bankName || t('pos.bank', 'Bank')}</p>
                    <div className="flex items-center justify-between">
                      <p className="font-display text-2xl font-semibold tabular-nums tracking-tight">{a.account.accountNumber}</p>
                      <button
                        onClick={() => navigator.clipboard?.writeText(a.account.accountNumber)}
                        className="rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-medium hover:bg-white/20"
                      >
                        <i className="bx bx-copy"></i> {t('pos.copy', 'Copy')}
                      </button>
                    </div>
                    <p className="truncate text-xs text-white/70">{a.account.accountName}</p>
                  </div>
                ) : (
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                    {t('pos.noVirtualAccount', 'No virtual account is set up for this branch.')}
                  </p>
                )}
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500"></span>
                  {t('pos.waitingForTransfer', 'Waiting for the transfer to land — you can keep serving other customers.')}
                </div>
              </div>
            )}
          </Modal>
        );
      })()}

      {/* Sale-completed: offer to print the receipt for the just-created order. */}
      <Modal
        isOpen={successOpen}
        onClose={() => { clearCart(); setMeta(EMPTY_META); setSuccessOpen(false); }}
        title={t('pos.saleCompleted', 'Sale completed')}
        maxWidth="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => { clearCart(); setMeta(EMPTY_META); setSuccessOpen(false); }}
              className="h-9 whitespace-nowrap rounded-lg border border-gray-300 px-4 text-[13px] font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              {t('pos.done', 'Done')}
            </button>
            {hasTransfer && (
              <button
                type="button"
                onClick={collectByTransfer}
                className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg border border-transparent px-4 text-[13px] font-semibold text-accent ring-1 ring-accent-ring transition-colors hover:bg-accent-soft focus:outline-none focus-visible:ring-2"
              >
                <i className="bx bx-transfer text-base" aria-hidden="true"></i>
                {t('pos.payByTransfer', 'Pay by transfer')}
              </button>
            )}
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg bg-accent-gradient px-4 text-[13px] font-semibold text-white transition hover:opacity-90 active:scale-[0.98]"
            >
              <i className="bx bx-printer text-base" aria-hidden="true"></i>
              {t('pos.printReceipt', 'Print receipt')}
            </button>
          </>
        }
      >
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300">
            <i className="bx bx-check text-xl" aria-hidden="true"></i>
          </span>
          <div className="text-sm text-gray-700 dark:text-gray-300">
            <p className="font-display font-medium tracking-tight text-gray-900 dark:text-gray-100">{t('pos.orderPlacedSuccessfully', 'Order placed successfully')}</p>
            <p className="mt-0.5 text-gray-500 dark:text-gray-400">
              {lastOrder?.orderNumber
                ? t('pos.receiptNumber', 'Receipt {{number}}', { number: lastOrder.orderNumber })
                : t('pos.canPrintReceipt', 'You can print a receipt for this sale.')}
            </p>
          </div>
        </div>
      </Modal>

      {/* Hidden on screen; only this prints (see .receipt-print / @media print) */}
      {lastOrder && (
        <Receipt order={lastOrder} currency={currency} businessName={businessName || undefined} />
      )}
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
