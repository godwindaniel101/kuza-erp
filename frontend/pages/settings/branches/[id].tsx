import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { api } from '@/lib/api';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { formatMoney, formatDate, useCurrency } from '@/lib/format';

interface Branch {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  isDefault?: boolean;
  isActive?: boolean;
}

type TabKey = 'performance' | 'stock' | 'inflow' | 'outflow';

const num = (v: unknown): number => {
  const n = typeof v === 'string' ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
};

const TH = 'px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400';
const TD = 'px-4 py-3 text-sm text-gray-700 dark:text-gray-300';

function TableCard({ title, headers, children, empty }: { title: string; headers: string[]; children: React.ReactNode; empty: boolean }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
      <h3 className="border-b border-gray-100 px-4 py-3 text-sm font-semibold text-gray-900 dark:border-gray-800 dark:text-gray-100">{title}</h3>
      {empty ? (
        <p className="px-4 py-10 text-center text-sm text-gray-400">Nothing here yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-900/60">
              <tr>{headers.map((h, i) => <th key={i} className={`${TH} ${i > 0 ? 'text-right' : ''}`}>{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">{children}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function BranchDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const currency = useCurrency();
  const [branch, setBranch] = useState<Branch | null>(null);
  const [tab, setTab] = useState<TabKey>('performance');

  const [orders, setOrders] = useState<any[] | null>(null);
  const [stock, setStock] = useState<any[] | null>(null);
  const [inflows, setInflows] = useState<any[] | null>(null);
  const [movements, setMovements] = useState<any[] | null>(null);

  useEffect(() => {
    if (!id || typeof id !== 'string') return;
    api.get<{ success: boolean; data: Branch }>(`/settings/branches/${id}`).then((r) => {
      if (r.success) setBranch(r.data);
    }).catch(() => {});
  }, [id]);

  // Lazy-load each tab's data the first time it's opened.
  const load = useCallback(
    async (which: TabKey) => {
      if (!id || typeof id !== 'string') return;
      try {
        if (which === 'performance' && orders === null) {
          const r = await api.get<{ success: boolean; data: any[] }>(`/rms/orders?branchId=${id}&limit=200`);
          setOrders(r.success && Array.isArray(r.data) ? r.data : []);
          if (stock === null) {
            const s = await api.get<{ success: boolean; data: any[] }>(`/ims/inventory?branchId=${id}`);
            setStock(s.success && Array.isArray(s.data) ? s.data : []);
          }
        }
        if (which === 'stock' && stock === null) {
          const r = await api.get<{ success: boolean; data: any[] }>(`/ims/inventory?branchId=${id}`);
          setStock(r.success && Array.isArray(r.data) ? r.data : []);
        }
        if (which === 'inflow' && inflows === null) {
          const r = await api.get<{ success: boolean; data: any[] }>(`/ims/inflows?branchId=${id}`);
          setInflows(r.success && Array.isArray(r.data) ? r.data : []);
        }
        if (which === 'outflow' && movements === null) {
          const r = await api.get<{ success: boolean; data: { items: any[] } }>(`/ims/stock-movements?branchId=${id}&page=1&limit=50`);
          const items = (r as any)?.data?.items;
          setMovements(r.success && Array.isArray(items) ? items : []);
        }
      } catch {
        if (which === 'performance') setOrders([]);
        if (which === 'stock') setStock([]);
        if (which === 'inflow') setInflows([]);
        if (which === 'outflow') setMovements([]);
      }
    },
    [id, orders, stock, inflows, movements],
  );

  useEffect(() => {
    load(tab);
  }, [tab, load]);

  const totalSales = (orders || []).reduce((s, o) => s + num(o.total), 0);
  const stockValue = (stock || []).reduce((s, i) => s + num(i.currentStock) * num(i.salePrice), 0);
  const lowStock = (stock || []).filter((i) => num(i.minimumStock) > 0 && num(i.currentStock) <= num(i.minimumStock)).length;
  const outMovements = (movements || []).filter((m) => ['OUT', 'SALE', 'TRANSFER_OUT', 'TRANSFER'].includes(String(m.movementType || '').toUpperCase()));

  const TABS: { k: TabKey; label: string }[] = [
    { k: 'performance', label: 'Performance' },
    { k: 'stock', label: 'Stock' },
    { k: 'inflow', label: 'Inflow' },
    { k: 'outflow', label: 'Outflow' },
  ];

  const uom = (i: any) => i.baseUom?.abbreviation || i.baseUom?.name || i.unit || '';

  return (
    <div className="max-w-5xl space-y-5">
      <PageHeader
        title={branch?.name || 'Branch'}
        subtitle={branch?.address || undefined}
        breadcrumbs={[
          { label: 'Settings', href: '/settings' },
          { label: 'Branches', href: '/settings/branches' },
          { label: branch?.name || 'Branch' },
        ]}
        actions={
          <Button href="/settings/branches" variant="secondary" size="sm">
            <i className="bx bx-arrow-back" aria-hidden="true"></i> Back
          </Button>
        }
      />

      {branch && (branch.isDefault || branch.isActive === false) && (
        <div className="flex gap-2">
          {branch.isDefault && <StatusBadge variant="info" label="Default" size="sm" />}
          {branch.isActive === false && <StatusBadge variant="error" label="Inactive" size="sm" />}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-800">
        <nav className="-mb-px flex gap-6" aria-label="Branch sections">
          {TABS.map((tb) => (
            <button
              key={tb.k}
              type="button"
              onClick={() => setTab(tb.k)}
              aria-current={tab === tb.k ? 'page' : undefined}
              className={`-mb-px whitespace-nowrap border-b-2 py-2.5 px-1 text-[13px] font-medium transition-colors ${
                tab === tb.k
                  ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {tb.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Performance */}
      {tab === 'performance' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Total sales" value={formatMoney(totalSales, currency)} icon="bx-money" tone="success" />
            <StatCard label="Orders" value={(orders || []).length} icon="bx-receipt" tone="info" />
            <StatCard label="Stock value" value={formatMoney(stockValue, currency)} icon="bx-box" tone="default" caption="at sale price" />
            <StatCard label="Low stock" value={lowStock} icon="bx-error" tone="warning" />
          </div>
          <TableCard title="Recent orders" headers={['Order', 'Date', 'Total']} empty={!orders || orders.length === 0}>
            {(orders || []).slice(0, 10).map((o) => (
              <tr key={o.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                <td className={TD}>
                  <Link href={`/rms/orders/${o.id}`} className="font-medium text-brand-600 hover:underline dark:text-brand-400">{o.orderNumber || o.id}</Link>
                </td>
                <td className={`${TD} text-right`}>{formatDate(o.createdAt || o.created_at)}</td>
                <td className={`${TD} text-right font-medium text-gray-900 dark:text-gray-100`}>{formatMoney(num(o.total), currency)}</td>
              </tr>
            ))}
          </TableCard>
        </div>
      )}

      {/* Stock */}
      {tab === 'stock' && (
        <TableCard title={`Stock (${(stock || []).length})`} headers={['Item', 'In stock', 'Value']} empty={!stock || stock.length === 0}>
          {(stock || []).map((i) => (
            <tr key={i.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
              <td className={`${TD} font-medium text-gray-900 dark:text-gray-100`}>{i.name}</td>
              <td className={`${TD} text-right tabular-nums`}>
                {num(i.currentStock).toLocaleString()} {uom(i)}
                {num(i.minimumStock) > 0 && num(i.currentStock) <= num(i.minimumStock) && (
                  <span className="ml-2 rounded-full bg-red-50 px-1.5 py-0.5 text-[11px] font-medium text-red-600 dark:bg-red-500/10">Low</span>
                )}
              </td>
              <td className={`${TD} text-right font-medium text-gray-900 dark:text-gray-100`}>{formatMoney(num(i.currentStock) * num(i.salePrice), currency)}</td>
            </tr>
          ))}
        </TableCard>
      )}

      {/* Inflow */}
      {tab === 'inflow' && (
        <TableCard title={`Inflows (${(inflows || []).length})`} headers={['Reference', 'Supplier', 'Date', 'Amount']} empty={!inflows || inflows.length === 0}>
          {(inflows || []).map((f) => (
            <tr key={f.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
              <td className={TD}>
                <Link href={`/ims/inflows/${f.id}`} className="font-medium text-brand-600 hover:underline dark:text-brand-400">{f.invoiceNumber || f.id}</Link>
              </td>
              <td className={TD}>{f.supplierName || f.supplier?.name || '—'}</td>
              <td className={`${TD} text-right`}>{formatDate(f.createdAt || f.receivedDate)}</td>
              <td className={`${TD} text-right font-medium text-gray-900 dark:text-gray-100`}>{formatMoney(num(f.totalAmount), currency)}</td>
            </tr>
          ))}
        </TableCard>
      )}

      {/* Outflow */}
      {tab === 'outflow' && (
        <TableCard title={`Outflow (${outMovements.length})`} headers={['Item', 'Type', 'Qty', 'Date']} empty={!movements || outMovements.length === 0}>
          {outMovements.map((m) => (
            <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
              <td className={`${TD} font-medium text-gray-900 dark:text-gray-100`}>{m.itemName || m.itemId}</td>
              <td className={TD}>
                <span className="rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600 dark:bg-red-500/10">{String(m.movementType || '').toUpperCase() || 'OUT'}</span>
              </td>
              <td className={`${TD} text-right tabular-nums`}>{num(m.quantity)}</td>
              <td className={`${TD} text-right`}>{formatDate(m.createdAt)}</td>
            </tr>
          ))}
        </TableCard>
      )}
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => ({
  props: { ...(await serverSideTranslations(locale || 'en', ['common'])) },
});
