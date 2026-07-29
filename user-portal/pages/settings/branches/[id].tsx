import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import Toast from '@/components/Toast';
import { formatMoney, formatDate, useCurrency } from '@/lib/format';

interface Branch {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  isDefault?: boolean;
  isActive?: boolean;
}

type TabKey = 'overview' | 'team' | 'stock' | 'inflow' | 'outflow';

const num = (v: unknown): number => {
  const n = typeof v === 'string' ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
};

const TH = 'px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400';
const TD = 'px-4 py-3 text-sm text-gray-700 dark:text-gray-300';

function TableCard({ title, headers, children, empty }: { title: string; headers: string[]; children: React.ReactNode; empty: boolean }) {
  const { t } = useTranslation('common');
  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
      <h3 className="border-b border-gray-100 px-4 py-3 text-sm font-semibold text-gray-900 dark:border-gray-800 dark:text-gray-100">{title}</h3>
      {empty ? (
        <p className="px-4 py-10 text-center text-sm text-gray-400">{t('settings.nothingHereYet', 'Nothing here yet.')}</p>
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
  const { t } = useTranslation('common');
  const router = useRouter();
  const { id } = router.query;
  const currency = useCurrency();
  const [branch, setBranch] = useState<Branch | null>(null);
  const [tab, setTab] = useState<TabKey>('overview');

  const [orders, setOrders] = useState<any[] | null>(null);
  const [stock, setStock] = useState<any[] | null>(null);
  const [inflows, setInflows] = useState<any[] | null>(null);
  const [movements, setMovements] = useState<any[] | null>(null);
  const [stockPage, setStockPage] = useState(1);

  // Branch members (users assigned to this branch; manager flag).
  const [members, setMembers] = useState<any[] | null>(null);
  const [assignable, setAssignable] = useState<any[]>([]);
  const [addUserId, setAddUserId] = useState('');
  const [memberBusy, setMemberBusy] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

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
        if (which === 'overview' && orders === null) {
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
        if (which === 'overview') setOrders([]);
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

  // Members + assignable users load once (shown on the Overview tab).
  const loadMembers = useCallback(async () => {
    if (!id || typeof id !== 'string') return;
    try {
      const [m, a] = await Promise.all([
        api.get<{ success: boolean; data: any[] }>(`/settings/branches/${id}/members`),
        api.get<{ success: boolean; data: any[] }>(`/settings/branches/assignable/users`),
      ]);
      setMembers(m.success && Array.isArray(m.data) ? m.data : []);
      setAssignable(a.success && Array.isArray(a.data) ? a.data : []);
    } catch {
      setMembers([]);
    }
  }, [id]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const addMember = async () => {
    if (!addUserId || typeof id !== 'string') return;
    setMemberBusy(true);
    try {
      const r = await api.post<{ success: boolean; data: any[] }>(`/settings/branches/${id}/members`, { userId: addUserId });
      if (r.success) setMembers(r.data);
      setAddUserId('');
    } catch (e: any) {
      setToast({ message: e?.response?.data?.message || t('settings.assignFailed', 'Failed to assign user'), type: 'error' });
    } finally {
      setMemberBusy(false);
    }
  };

  const toggleManager = async (m: any) => {
    if (typeof id !== 'string') return;
    try {
      const r = await api.patch<{ success: boolean; data: any[] }>(`/settings/branches/${id}/members/${m.userId}`, { isManager: !m.isManager });
      if (r.success) setMembers(r.data);
    } catch (e: any) {
      setToast({ message: e?.response?.data?.message || t('settings.updateFailed', 'Update failed'), type: 'error' });
    }
  };

  const removeMember = async (m: any) => {
    if (typeof id !== 'string') return;
    try {
      const r = await api.delete<{ success: boolean; data: any[] }>(`/settings/branches/${id}/members/${m.userId}`);
      if (r.success) setMembers(r.data);
    } catch (e: any) {
      setToast({ message: e?.response?.data?.message || t('settings.removeFailed', 'Remove failed'), type: 'error' });
    }
  };

  const totalSales = (orders || []).reduce((s, o) => s + num(o.total), 0);
  // Branch-scoped stock: only items actually stocked in THIS branch, using the
  // per-branch quantity/threshold (branchStock), not the tenant-wide currentStock.
  const bQty = (i: any) => num(i.branchStock?.currentStock);
  const bMin = (i: any) => num(i.branchStock?.minimumStock ?? i.branchStock?.lowStockThreshold ?? i.minimumStock);
  const branchStockItems = (stock || []).filter((i) => i.branchStock);
  const stockValue = branchStockItems.reduce((s, i) => s + bQty(i) * num(i.salePrice), 0);
  const lowStock = branchStockItems.filter((i) => bMin(i) > 0 && bQty(i) <= bMin(i)).length;

  // Client-side pagination for the Stock tab.
  const STOCK_PAGE_SIZE = 20;
  const stockPages = Math.max(1, Math.ceil(branchStockItems.length / STOCK_PAGE_SIZE));
  const stockPageSafe = Math.min(stockPage, stockPages);
  const pagedStock = branchStockItems.slice((stockPageSafe - 1) * STOCK_PAGE_SIZE, stockPageSafe * STOCK_PAGE_SIZE);
  const outMovements = (movements || []).filter((m) => ['OUT', 'SALE', 'TRANSFER_OUT', 'TRANSFER'].includes(String(m.movementType || '').toUpperCase()));

  const TABS: { k: TabKey; label: string }[] = [
    { k: 'overview', label: t('settings.overview', 'Overview') },
    { k: 'team', label: t('settings.teamAccess', 'Team & access') },
    { k: 'stock', label: t('settings.stock', 'Stock') },
    { k: 'inflow', label: t('settings.inflow', 'Inflow') },
    { k: 'outflow', label: t('settings.outflow', 'Outflow') },
  ];

  const uom = (i: any) => i.baseUom?.abbreviation || i.baseUom?.name || i.unit || '';

  return (
    <div className="max-w-5xl space-y-5">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <PageHeader
        title={branch?.name || t('branch', 'Branch')}
        subtitle={branch?.address || undefined}
        breadcrumbs={[
          { label: t('settings', 'Settings'), href: '/settings' },
          { label: t('branches', 'Branches'), href: '/settings/branches' },
          { label: branch?.name || t('branch', 'Branch') },
        ]}
        actions={
          <Button href="/settings/branches" variant="secondary" size="sm">
            <i className="bx bx-arrow-back" aria-hidden="true"></i> {t('back', 'Back')}
          </Button>
        }
      />

      {branch && (branch.isDefault || branch.isActive === false) && (
        <div className="flex gap-2">
          {branch.isDefault && <StatusBadge variant="info" label={t('default', 'Default')} size="sm" />}
          {branch.isActive === false && <StatusBadge variant="error" label={t('inactive', 'Inactive')} size="sm" />}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-800">
        <nav className="-mb-px flex gap-6" aria-label={t('settings.branchSections', 'Branch sections')}>
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

      {/* Overview */}
      {tab === 'overview' && (
        <div className="space-y-5">
          {/* Branch details */}
          <div className="rounded-2xl bg-white p-5 ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('settings.branchDetails', 'Branch details')}</h3>
              <div className="flex items-center gap-2">
                {branch?.isDefault && <StatusBadge variant="info" label={t('settings.default', 'Default')} size="sm" />}
                <StatusBadge variant={branch?.isActive === false ? 'warning' : 'success'} label={branch?.isActive === false ? t('settings.inactive', 'Inactive') : t('settings.active', 'Active')} size="sm" />
              </div>
            </div>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('settings.branchName', 'Branch name')}</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{branch?.name || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('settings.address', 'Address')}</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{branch?.address || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('settings.phone', 'Phone')}</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{branch?.phone || '—'}</dd>
              </div>
            </dl>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label={t('totalSales', 'Total sales')} value={formatMoney(totalSales, currency)} icon="bx-money" tone="success" />
            <StatCard label={t('settings.orders', 'Orders')} value={(orders || []).length} icon="bx-receipt" tone="info" />
            <StatCard label={t('settings.stockValue', 'Stock value')} value={formatMoney(stockValue, currency)} icon="bx-box" tone="default" caption={t('settings.atSalePrice', 'at sale price')} />
            <StatCard label={t('lowStock', 'Low stock')} value={lowStock} icon="bx-error" tone="warning" />
          </div>
          <TableCard title={t('settings.recentOrders', 'Recent orders')} headers={[t('settings.order', 'Order'), t('settings.date', 'Date'), t('settings.total', 'Total')]} empty={!orders || orders.length === 0}>
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

      {/* Team & access */}
      {tab === 'team' && (
        <div className="rounded-2xl bg-white p-5 ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('settings.teamAccess', 'Team & access')}</h3>
          <p className="mb-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
            {t('settings.teamAccessHint', 'Assign users to this branch. Managers approve incoming transfers and are notified of branch activity. Assigned users only see the branches they belong to.')}
          </p>

          {/* Add member */}
          <div className="mb-4 flex flex-col gap-2 sm:flex-row">
            <select
              value={addUserId}
              onChange={(e) => setAddUserId(e.target.value)}
              className="h-9 flex-1 rounded-lg border border-gray-300 bg-white px-3 text-[13px] text-gray-900 focus-ring dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="">{t('settings.selectUser', 'Select a user to assign…')}</option>
              {assignable
                .filter((u) => !(members || []).some((m) => m.userId === u.id))
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name || u.email}{u.name ? ` · ${u.email}` : ''}
                  </option>
                ))}
            </select>
            <Button variant="primary" size="sm" onClick={addMember} disabled={!addUserId || memberBusy}>
              {t('settings.assign', 'Assign')}
            </Button>
          </div>

          {/* Members list */}
          {members && members.length > 0 ? (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {members.map((m) => (
                <li key={m.userId} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{m.name || m.email}</p>
                    {m.name && <p className="truncate text-xs text-gray-500 dark:text-gray-400">{m.email}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <label className="flex cursor-pointer items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                      <input type="checkbox" checked={!!m.isManager} onChange={() => toggleManager(m)} className="h-4 w-4 cursor-pointer rounded border-gray-300 text-brand-600 focus-visible:ring-brand-500 dark:border-gray-600 dark:bg-gray-700" />
                      {t('settings.manager', 'Manager')}
                    </label>
                    <button type="button" onClick={() => removeMember(m)} className="text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400">
                      {t('settings.remove', 'Remove')}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-3 text-center text-xs text-gray-400">{t('settings.noMembers', 'No users assigned yet.')}</p>
          )}
        </div>
      )}

      {/* Stock — scoped to this branch, paginated */}
      {tab === 'stock' && (
        <div className="space-y-3">
          <TableCard title={t('settings.stockCount', 'Stock ({{count}})', { count: branchStockItems.length })} headers={[t('settings.item', 'Item'), t('settings.inStock', 'In stock'), t('settings.value', 'Value')]} empty={branchStockItems.length === 0}>
            {pagedStock.map((i) => (
              <tr key={i.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                <td className={`${TD} font-medium text-gray-900 dark:text-gray-100`}>{i.name}</td>
                <td className={`${TD} text-right tabular-nums`}>
                  {bQty(i).toLocaleString()} {uom(i)}
                  {bMin(i) > 0 && bQty(i) <= bMin(i) && (
                    <span className="ml-2 rounded-full bg-red-50 px-1.5 py-0.5 text-[11px] font-medium text-red-600 dark:bg-red-500/10">{t('settings.low', 'Low')}</span>
                  )}
                </td>
                <td className={`${TD} text-right font-medium text-gray-900 dark:text-gray-100`}>{formatMoney(bQty(i) * num(i.salePrice), currency)}</td>
              </tr>
            ))}
          </TableCard>
          {stockPages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">
                {t('settings.pageOf', 'Page {{page}} of {{pages}}', { page: stockPageSafe, pages: stockPages })}
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" disabled={stockPageSafe <= 1} onClick={() => setStockPage((p) => Math.max(1, p - 1))}>
                  {t('previous', 'Previous')}
                </Button>
                <Button size="sm" variant="secondary" disabled={stockPageSafe >= stockPages} onClick={() => setStockPage((p) => Math.min(stockPages, p + 1))}>
                  {t('next', 'Next')}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Inflow */}
      {tab === 'inflow' && (
        <TableCard title={t('settings.inflowsCount', 'Inflows ({{count}})', { count: (inflows || []).length })} headers={[t('settings.reference', 'Reference'), t('settings.supplier', 'Supplier'), t('settings.date', 'Date'), t('settings.amount', 'Amount')]} empty={!inflows || inflows.length === 0}>
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
        <TableCard title={t('settings.outflowCount', 'Outflow ({{count}})', { count: outMovements.length })} headers={[t('settings.item', 'Item'), t('settings.type', 'Type'), t('settings.qty', 'Qty'), t('settings.date', 'Date')]} empty={!movements || outMovements.length === 0}>
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
