import { useState, useEffect } from 'react';
import Link from 'next/link';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import PageHeader from '@/components/ui/PageHeader';
import StatCard from '@/components/ui/StatCard';
import Button from '@/components/ui/Button';
import Card from '@/components/Card';
import Modal from '@/components/Modal';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { WeeklyBarChart, RevenueAreaChart, AreaPoint } from '@/components/ui/charts';
import { formatMoney, formatDate, useCurrency } from '@/lib/format';

interface InventoryItem {
  id: string;
  name: string;
  category?: string;
  currentStock?: number | string;
  reorderPoint?: number | string;
  reorderLevel?: number | string;
  minStock?: number | string;
  unit?: string;
  unitCost?: number | string;
  costPrice?: number | string;
}

interface StockMovement {
  id: string;
  itemId: string;
  itemName?: string;
  branchId?: string;
  branchName?: string;
  movementType: string;
  quantity: number;
  createdAt: string;
}

interface LowStockRow {
  key: string;
  itemName: string;
  branchName: string;
  stock: number;
  min: number;
  unit?: string;
}

const num = (v: unknown): number => {
  const n = typeof v === 'string' ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
};

const MOVE_TONE: Record<string, string> = {
  IN: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10',
  INFLOW: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10',
  OUT: 'text-red-600 bg-red-50 dark:bg-red-500/10',
  SALE: 'text-red-600 bg-red-50 dark:bg-red-500/10',
  TRANSFER: 'text-sky-600 bg-sky-50 dark:bg-sky-500/10',
  ADJUSTMENT: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10',
};

export default function InventoryDashboardPage() {
  const { t } = useTranslation('common');
  const currency = useCurrency();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [lowStockRows, setLowStockRows] = useState<LowStockRow[]>([]);
  const [branchList, setBranchList] = useState<{ id: string; name: string }[]>([]);
  const [revenueSeries, setRevenueSeries] = useState<AreaPoint[]>([]);

  useEffect(() => {
    (async () => {
      const [inv, mv, br, od] = await Promise.allSettled([
        api.get<{ success: boolean; data: any[] }>('/ims/inventory?withBranchStock=true'),
        api.get<{ success: boolean; data: { items: StockMovement[] } }>('/ims/stock-movements?page=1&limit=5'),
        api.get<{ success: boolean; data: { id: string; name: string }[] }>('/settings/branches'),
        api.get<{ success: boolean; data: any[] }>('/rms/orders?limit=200'),
      ]);
      const branchMap = new Map<string, string>();
      if (br.status === 'fulfilled' && br.value.success && Array.isArray(br.value.data)) {
        br.value.data.forEach((b) => branchMap.set(b.id, b.name));
        setBranchList(br.value.data);
      }
      let inventory: any[] = [];
      if (inv.status === 'fulfilled' && inv.value.success && Array.isArray(inv.value.data)) {
        inventory = inv.value.data;
        setItems(inventory);
        // Per-branch low stock: an item is "needs restocking" AT a specific branch.
        const rows: LowStockRow[] = [];
        inventory.forEach((it) => {
          const bs = it.branchStocks || {};
          Object.keys(bs).forEach((bid) => {
            const stock = num(bs[bid]?.stock);
            const min = num(bs[bid]?.minimumStock);
            if (min > 0 && stock <= min) {
              rows.push({
                key: `${it.id}:${bid}`,
                itemName: it.name,
                branchName: branchMap.get(bid) || t('inventory.branchFallback', 'Branch'),
                stock,
                min,
                unit: it.unit,
              });
            }
          });
        });
        setLowStockRows(rows.sort((a, b) => a.stock - b.stock));
      }
      if (mv.status === 'fulfilled' && mv.value.success && Array.isArray(mv.value.data?.items)) {
        setMovements(
          mv.value.data.items.map((m) => ({ ...m, branchName: m.branchName || (m.branchId ? branchMap.get(m.branchId) : undefined) })),
        );
      }
      // 14-day sales & revenue trend from recent orders (renders flat when empty).
      const days: AreaPoint[] = [];
      const buckets = new Map<string, number>();
      for (let i = 13; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        buckets.set(d.toISOString().slice(0, 10), 0);
        days.push({ label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), value: 0 });
      }
      if (od.status === 'fulfilled' && od.value.success && Array.isArray(od.value.data)) {
        od.value.data.forEach((o: any) => {
          const key = String(o?.createdAt || o?.created_at || '').slice(0, 10);
          if (buckets.has(key)) buckets.set(key, (buckets.get(key) || 0) + Number(o.totalAmount ?? o.subtotal ?? 0));
        });
        let idx = 0;
        buckets.forEach((v) => {
          days[idx].value = v;
          idx += 1;
        });
      }
      setRevenueSeries(days);
      setLoading(false);
    })();
  }, []);

  // NOTE: `?withBranchStock=true` returns aggregate `totalStock` + `minimumStock`
  // + `salePrice` (not `currentStock`/`unitCost`), so derive everything from those.
  const totalItems = items.length;
  const lowStockItems = items
    .filter((i) => num(i.minimumStock) > 0 && num(i.totalStock) <= num(i.minimumStock))
    .sort((a, b) => num(a.totalStock) - num(b.totalStock));
  const outOfStock = items.filter((i) => num(i.totalStock) <= 0).length;
  const stockValue = items.reduce((s, i) => s + num(i.totalStock) * num(i.salePrice), 0);

  // Stock value by branch (top 6) — value at sale price, summed per branch.
  const stockByBranch = (() => {
    const map = new Map<string, number>();
    items.forEach((i) => {
      const bs = i.branchStocks || {};
      Object.keys(bs).forEach((bid) => {
        map.set(bid, (map.get(bid) || 0) + num(bs[bid]?.stock) * num(i.salePrice));
      });
    });
    return Array.from(map.entries())
      .map(([bid, value]) => ({ label: branchList.find((b) => b.id === bid)?.name || t('inventory.branchFallback', 'Branch'), value, bid }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  })();

  // Top products by stock value (top 6).
  const topProducts = items
    .map((i) => ({ label: (i.name as string) || t('inventory.itemFallback', 'Item'), value: num(i.totalStock) * num(i.salePrice), id: i.id as string }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  // Bar drill-down: click a branch bar → its item breakdown; a product bar → its per-branch stock.
  const [drill, setDrill] = useState<{ title: string; rows: { label: string; value: number }[]; href?: string } | null>(null);
  const [worklistTab, setWorklistTab] = useState<'restock' | 'expiring'>('restock');
  const openBranchDrill = (i: number) => {
    const b = stockByBranch[i];
    if (!b) return;
    const rows = items
      .map((it) => ({ label: (it.name as string) || t('inventory.itemFallback', 'Item'), value: num(it.branchStocks?.[b.bid]?.stock) * num(it.salePrice) }))
      .filter((r) => r.value > 0)
      .sort((x, y) => y.value - x.value)
      .slice(0, 12);
    setDrill({ title: t('inventory.drillByItem', '{{branch}} · stock value by item', { branch: b.label }), rows });
  };
  const openProductDrill = (i: number) => {
    const p = topProducts[i];
    if (!p) return;
    const it = items.find((x) => x.id === p.id);
    const bs = it?.branchStocks || {};
    const rows = Object.keys(bs)
      .map((bid) => ({ label: branchList.find((b) => b.id === bid)?.name || t('inventory.branchFallback', 'Branch'), value: num(bs[bid]?.stock) * num(it?.salePrice) }))
      .filter((r) => r.value > 0)
      .sort((x, y) => y.value - x.value);
    setDrill({ title: t('inventory.drillByBranch', '{{product}} · value by branch', { product: p.label }), rows, href: `/ims/inventory/${p.id}` });
  };

  // Items with a batch expiring within 60 days, soonest first (dashboard widget).
  const expiringItems = items
    .filter((it: any) => it.earliestExpiry)
    .map((it: any) => {
      const date = new Date(it.earliestExpiry);
      const days = Math.ceil((date.getTime() - Date.now()) / 86400000);
      return { id: it.id, name: it.name as string, date, days, count: num(it.expiringSoonCount) };
    })
    .filter((x) => x.days <= 60)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  return (
    <div>
      <PageHeader
        title={t('inventory.dashboardTitle', 'Inventory')}
        subtitle={t('inventory.dashboardSubtitle', 'Stock health, receiving and valuation at a glance')}
        actions={
          <div className="flex gap-2">
            <Button href="/ims/inflows" variant="secondary" size="md">
              <i className="bx bx-log-in" /> {t('inventory.receiveStock', 'Receive Stock')}
            </Button>
            <Button href="/ims/inventory" size="md">
              <i className="bx bx-plus" /> {t('inventory.addItem', 'Add Item')}
            </Button>
          </div>
        }
      />

      {loading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((k) => (
            <CardSkeleton key={k} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label={t('inventory.stockItems', 'Stock Items')} value={totalItems} icon="bx-box" tone="info" />
          <StatCard label={t('inventory.lowStock', 'Low Stock')} value={lowStockItems.length} icon="bx-error" tone="warning" />
          <StatCard label={t('inventory.outOfStock', 'Out of Stock')} value={outOfStock} icon="bx-x-circle" tone="error" />
          <StatCard label={t('inventory.stockValue', 'Stock Value')} value={formatMoney(stockValue, currency)} icon="bx-wallet" tone="success" />
        </div>
      )}

      {/* Three scoped charts: by branch · by product · sales & revenue */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title={t('inventory.stockValueByBranch', 'Stock value by branch')}>
          {loading ? (
            <div className="h-[150px] animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
          ) : (
            <WeeklyBarChart data={stockByBranch} height={150} formatValue={(v) => formatMoney(v, currency)} emptyMessage={t('inventory.noBranchStock', 'No branch stock yet')} onBarClick={openBranchDrill} />
          )}
        </Card>
        <Card title={t('inventory.topProductsByValue', 'Top products by value')}>
          {loading ? (
            <div className="h-[150px] animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
          ) : (
            <WeeklyBarChart data={topProducts} height={150} formatValue={(v) => formatMoney(v, currency)} emptyMessage={t('inventory.noValuedStock', 'No valued stock yet')} onBarClick={openProductDrill} />
          )}
        </Card>
        <Card title={t('inventory.salesAndRevenue', 'Sales & revenue')} subtitle={t('inventory.last14Days', 'Last 14 days')}>
          {loading ? (
            <div className="h-[150px] animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
          ) : (
            <RevenueAreaChart data={revenueSeries} height={150} formatValue={(v) => formatMoney(v, currency)} emptyMessage={t('inventory.noSales', 'No sales yet')} />
          )}
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Inventory worklist — Needs restocking / Expiring soon, tabbed */}
        <Card padding={false}>
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-5 pt-2">
            <div className="flex gap-4">
              {([
                { key: 'restock', label: t('inventory.needsRestocking', 'Needs restocking'), count: lowStockRows.length },
                { key: 'expiring', label: t('inventory.expiringSoon', 'Expiring soon'), count: expiringItems.length },
              ] as const).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setWorklistTab(tab.key)}
                  className={`-mb-px border-b-2 pb-2 pt-1 text-sm font-medium transition-colors ${
                    worklistTab === tab.key
                      ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && <span className="ml-1.5 text-xs text-gray-400">{tab.count}</span>}
                </button>
              ))}
            </div>
            <Link href="/ims/inventory" className="text-[13px] font-medium text-brand-600 hover:underline">
              {t('inventory.viewAll', 'View all')}
            </Link>
          </div>

          {loading ? (
            <div className="p-5 text-sm text-gray-400">{t('inventory.loading', 'Loading…')}</div>
          ) : worklistTab === 'restock' ? (
            lowStockRows.length === 0 ? (
              <div className="flex flex-col items-center gap-1 p-8 text-center">
                <i className="bx bx-check-circle text-3xl text-emerald-500" />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('inventory.wellStocked', "Everything's well stocked")}</p>
                <p className="text-xs text-gray-500">{t('inventory.noItemsBelowReorder', 'No items at or below their reorder point.')}</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {lowStockRows.slice(0, 6).map((r) => (
                  <div key={r.key} className="flex items-center justify-between px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{r.itemName}</p>
                      <p className="truncate text-xs text-gray-500">
                        <span className="inline-flex items-center gap-1"><i className="bx bx-store text-gray-400" />{r.branchName}</span>
                        {' · '}{t('inventory.stockLeftReorder', '{{stock}} {{unit}} left · reorder at {{min}}', { stock: r.stock, unit: r.unit || t('inventory.units', 'units'), min: r.min })}
                      </p>
                    </div>
                    <span
                      className={`ml-3 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                        r.stock <= 0 ? 'bg-red-50 text-red-600 dark:bg-red-500/10' : 'bg-amber-50 text-amber-600 dark:bg-amber-500/10'
                      }`}
                    >
                      {r.stock <= 0 ? t('inventory.out', 'Out') : t('inventory.low', 'Low')}
                    </span>
                  </div>
                ))}
              </div>
            )
          ) : expiringItems.length === 0 ? (
            <div className="flex flex-col items-center gap-1 p-8 text-center">
              <i className="bx bx-check-circle text-3xl text-emerald-500" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('inventory.nothingExpiring', 'Nothing expiring soon')}</p>
              <p className="text-xs text-gray-500">{t('inventory.noBatchesExpiring', 'No batches expire within the next 60 days.')}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {expiringItems.slice(0, 6).map((x) => (
                <Link
                  key={x.id}
                  href={`/ims/inventory/${x.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{x.name}</p>
                    <p className="truncate text-xs text-gray-500">
                      {t('inventory.expires', 'Expires')} {x.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {x.count > 1 && ` · ${t('inventory.batchesCount', '{{count}} batches', { count: x.count })}`}
                    </p>
                  </div>
                  <span
                    className={`ml-3 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      x.days <= 0
                        ? 'bg-red-50 text-red-600 dark:bg-red-500/10'
                        : x.days <= 30
                        ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                    }`}
                  >
                    {x.days <= 0 ? t('inventory.expired', 'Expired') : t('inventory.daysShort', '{{days}}d', { days: x.days })}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* Recent stock movements — activity feed */}
        <Card padding={false}>
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-5 py-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('inventory.recentMovements', 'Recent movements')}</h3>
            <Link href="/ims/stock-movements" className="text-[13px] font-medium text-brand-600 hover:underline">
              {t('inventory.stockLedger', 'Stock ledger')}
            </Link>
          </div>
          {loading ? (
            <div className="p-5 text-sm text-gray-400">{t('inventory.loading', 'Loading…')}</div>
          ) : movements.length === 0 ? (
            <div className="flex flex-col items-center gap-1 p-8 text-center">
              <i className="bx bx-transfer-alt text-3xl text-gray-300" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('inventory.noMovements', 'No movements yet')}</p>
              <p className="text-xs text-gray-500">{t('inventory.noMovementsHint', 'Receive stock or make a sale to see activity here.')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-[11px] font-medium uppercase tracking-wide text-gray-400 dark:border-gray-800">
                    <th className="px-5 py-2 font-medium">{t('inventory.item', 'Item')}</th>
                    <th className="px-3 py-2 font-medium">{t('inventory.type', 'Type')}</th>
                    <th className="px-3 py-2 text-right font-medium">{t('inventory.qty', 'Qty')}</th>
                    <th className="px-5 py-2 text-right font-medium">{t('inventory.date', 'Date')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {movements.slice(0, 5).map((m) => {
                    const t = (m.movementType || '').toUpperCase();
                    return (
                      <tr key={m.id}>
                        <td className="px-5 py-2.5">
                          <p className="truncate text-gray-700 dark:text-gray-300">{m.itemName || m.itemId}</p>
                          {m.branchName && (
                            <p className="truncate text-xs text-gray-400"><i className="bx bx-store" /> {m.branchName}</p>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium leading-none ${MOVE_TONE[t] || 'bg-gray-100 text-gray-600 dark:bg-gray-800'}`}>
                            {t || 'MOVE'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right font-medium tabular-nums text-gray-900 dark:text-gray-100">{num(m.quantity)}</td>
                        <td className="px-5 py-2.5 text-right text-xs text-gray-400">{formatDate(m.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Bar drill-down details */}
      <Modal
        isOpen={!!drill}
        onClose={() => setDrill(null)}
        title={drill?.title}
        maxWidth="sm"
        footer={
          drill?.href ? (
            <Link
              href={drill.href}
              className="inline-flex h-9 items-center rounded-lg bg-brand-gradient px-4 text-[13px] font-semibold text-white hover:opacity-90"
            >
              {t('inventory.viewItem', 'View item')}
            </Link>
          ) : undefined
        }
      >
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {drill && drill.rows.length > 0 ? (
            drill.rows.map((r, idx) => (
              <div key={idx} className="flex items-center justify-between gap-3 py-2">
                <span className="truncate text-sm text-gray-700 dark:text-gray-300">{r.label}</span>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                  {formatMoney(r.value, currency)}
                </span>
              </div>
            ))
          ) : (
            <p className="py-4 text-sm text-gray-400">{t('inventory.noDetails', 'No details.')}</p>
          )}
        </div>
      </Modal>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => ({
  props: { ...(await serverSideTranslations(locale || 'en', ['common'])) },
});
