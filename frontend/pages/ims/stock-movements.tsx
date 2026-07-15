import { useState, useEffect, useCallback } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { api } from '@/lib/api';
import Toast from '@/components/Toast';
import PageHeader from '@/components/ui/PageHeader';
import FilterBar, { type FilterValues } from '@/components/ui/FilterBar';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable';
import EmptyState from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { formatDate, formatNumber } from '@/lib/format';

type MovementType = 'INFLOW' | 'SALE' | 'TRANSFER_OUT' | 'TRANSFER_IN' | 'ADJUSTMENT' | 'WRITE_OFF' | 'RETURN';

interface StockMovement {
  id: string;
  itemId: string;
  itemName?: string;
  branchId?: string;
  movementType: MovementType;
  quantity: number;
  unitCost?: number;
  sourceType?: string;
  sourceId?: string;
  balanceAfter: number;
  createdAt: string;
}

interface ReconciliationRow {
  itemId: string;
  itemName?: string;
  currentStock: number;
  ledgerBalance: number;
  drift: number;
}

interface InventoryItem {
  id: string;
  name?: string;
}

const TYPE_TOKENS: Record<MovementType, { label: string; classes: string; icon: string }> = {
  INFLOW: { label: 'Inflow', classes: 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300', icon: 'bx-down-arrow-alt' },
  SALE: { label: 'Sale', classes: 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300', icon: 'bx-cart' },
  TRANSFER_OUT: { label: 'Transfer out', classes: 'bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300', icon: 'bx-log-out' },
  TRANSFER_IN: { label: 'Transfer in', classes: 'bg-teal-100 dark:bg-teal-900/20 text-teal-800 dark:text-teal-300', icon: 'bx-log-in' },
  ADJUSTMENT: { label: 'Adjustment', classes: 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300', icon: 'bx-slider' },
  WRITE_OFF: { label: 'Write-off', classes: 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300', icon: 'bx-trash' },
  RETURN: { label: 'Return', classes: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300', icon: 'bx-undo' },
};

const PAGE_SIZE = 20;

function TypeBadge({ type }: { type: MovementType }) {
  const token = TYPE_TOKENS[type] ?? { label: type, classes: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300', icon: 'bx-transfer' };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${token.classes}`}>
      <i className={`bx ${token.icon}`} aria-hidden="true"></i>
      {token.label}
    </span>
  );
}

export default function StockMovementsPage() {
  const [tab, setTab] = useState<'ledger' | 'reconciliation'>('ledger');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [reconRows, setReconRows] = useState<ReconciliationRow[]>([]);
  const [reconLoading, setReconLoading] = useState(false);
  const [reconLoaded, setReconLoaded] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const [filters, setFilters] = useState<FilterValues>({ itemId: '', type: '' });
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const itemId = (filters.itemId as string) || '';
  const type = (filters.type as string) || '';

  useEffect(() => {
    const loadItems = async () => {
      try {
        const res = await api.get<{ success: boolean; data: InventoryItem[] }>('/ims/inventory');
        if (res.success) setItems(res.data || []);
      } catch (err) {
        console.error('Failed to load items:', err);
      }
    };
    loadItems();
  }, []);

  const loadMovements = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (itemId) params.set('itemId', itemId);
      if (type) params.set('type', type);
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);
      const res = await api.get<{ success: boolean; data: { items: StockMovement[]; total: number } }>(
        `/ims/stock-movements?${params.toString()}`,
      );
      if (res.success) {
        setMovements(res.data.items || []);
        setTotal(res.data.total || 0);
      }
    } catch (err: any) {
      console.error('Failed to load stock movements:', err);
      setToast({ message: err.response?.data?.message || 'Failed to load stock movements', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page, itemId, type, fromDate, toDate]);

  useEffect(() => {
    loadMovements();
  }, [loadMovements]);

  useEffect(() => {
    setPage(1);
  }, [itemId, type, fromDate, toDate]);

  const loadReconciliation = useCallback(async () => {
    setReconLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: ReconciliationRow[] }>('/ims/stock-movements/reconciliation');
      if (res.success) setReconRows(res.data || []);
      setReconLoaded(true);
    } catch (err: any) {
      console.error('Failed to load reconciliation:', err);
      setToast({ message: err.response?.data?.message || 'Failed to load reconciliation report', type: 'error' });
    } finally {
      setReconLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'reconciliation' && !reconLoaded) {
      loadReconciliation();
    }
  }, [tab, reconLoaded, loadReconciliation]);

  const columns: DataTableColumn<StockMovement>[] = [
    { key: 'createdAt', label: 'Date', render: (m) => formatDate(m.createdAt) },
    {
      key: 'itemName',
      label: 'Item',
      render: (m) => (
        <span className="font-medium text-gray-900 dark:text-white">
          {m.itemName || items.find((i) => i.id === m.itemId)?.name || m.itemId}
        </span>
      ),
    },
    { key: 'movementType', label: 'Type', render: (m) => <TypeBadge type={m.movementType} /> },
    {
      key: 'quantity',
      label: 'Qty',
      align: 'right',
      render: (m) => {
        const qty = Number(m.quantity || 0);
        return (
          <span
            className={`font-medium ${
              qty > 0 ? 'text-green-600 dark:text-green-400' : qty < 0 ? 'text-red-600 dark:text-red-400' : ''
            }`}
          >
            {qty > 0 ? `+${formatNumber(qty)}` : formatNumber(qty)}
          </span>
        );
      },
    },
    {
      key: 'balanceAfter',
      label: 'Balance After',
      align: 'right',
      render: (m) => formatNumber(m.balanceAfter),
    },
    {
      key: 'sourceType',
      label: 'Source',
      render: (m) => (m.sourceType ? <span className="text-gray-500 dark:text-gray-400 text-xs">{m.sourceType}</span> : '-'),
    },
  ];

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const startIndex = (page - 1) * PAGE_SIZE;
  const hasFilters = !!itemId || !!type || !!fromDate || !!toDate;
  const driftCount = reconRows.filter((r) => Number(r.drift) !== 0).length;

  const tabClass = (active: boolean) =>
    `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
      active
        ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
    }`;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Stock Ledger"
        subtitle="Every stock movement, and reconciliation against current stock"
        breadcrumbs={[{ label: 'IMS', href: '/ims/inventory' }, { label: 'Stock Ledger' }]}
      />

      {/* Tabs */}
      <div className="mb-4 flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 pb-3">
        <button type="button" onClick={() => setTab('ledger')} className={tabClass(tab === 'ledger')}>
          <i className="bx bx-list-ul mr-1" aria-hidden="true"></i>
          Ledger
        </button>
        <button type="button" onClick={() => setTab('reconciliation')} className={tabClass(tab === 'reconciliation')}>
          <i className="bx bx-check-shield mr-1" aria-hidden="true"></i>
          Reconciliation
          {reconLoaded && driftCount > 0 && (
            <span className="ml-2 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-red-100 dark:bg-red-900/30 text-xs font-semibold text-red-700 dark:text-red-300">
              {driftCount}
            </span>
          )}
        </button>
      </div>

      {tab === 'ledger' ? (
        <>
          <FilterBar
            filters={[
              {
                key: 'itemId',
                type: 'select',
                placeholder: 'All items',
                className: 'w-full sm:w-64',
                options: [
                  { value: '', label: 'All items' },
                  ...items.map((i) => ({ value: i.id, label: i.name || i.id })),
                ],
              },
              {
                key: 'type',
                type: 'select',
                placeholder: 'All types',
                className: 'w-full sm:w-56',
                options: [
                  { value: '', label: 'All types' },
                  ...Object.entries(TYPE_TOKENS).map(([value, t]) => ({ value, label: t.label })),
                ],
              },
            ]}
            values={filters}
            onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
            onClear={() => {
              setFilters({ itemId: '', type: '' });
              setFromDate('');
              setToDate('');
            }}
            actions={
              <div className="flex items-center gap-2">
                <label className="text-[13px] text-gray-500 dark:text-gray-400">From</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="h-9 px-3 text-[13px] border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500"
                />
                <label className="text-[13px] text-gray-500 dark:text-gray-400">To</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="h-9 px-3 text-[13px] border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500"
                />
              </div>
            }
          />

          <DataTable<StockMovement>
            columns={columns}
            data={movements}
            loading={loading}
            pagination={{
              page,
              totalPages,
              startIndex,
              endIndex: Math.min(startIndex + movements.length, total),
              totalItems: total,
              onPageChange: setPage,
            }}
            emptyState={
              <EmptyState
                icon="bx-transfer"
                title={hasFilters ? 'No movements match your filters' : 'No stock movements yet'}
                description={
                  hasFilters
                    ? 'Try adjusting the item, type or date filters'
                    : 'Stock movements appear here as inventory changes'
                }
              />
            }
          />
        </>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Compares current stock against the ledger balance for each item. Non-zero drift indicates a discrepancy.
            </p>
            <button
              onClick={loadReconciliation}
              disabled={reconLoading}
              className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center shrink-0"
            >
              <i className={`bx bx-refresh mr-1 ${reconLoading ? 'animate-spin' : ''}`} aria-hidden="true"></i>
              Refresh
            </button>
          </div>

          {reconLoading ? (
            <TableSkeleton rows={6} columns={4} />
          ) : reconRows.length === 0 ? (
            <EmptyState
              icon="bx-check-shield"
              title="Nothing to reconcile"
              description="No items with stock activity were found"
            />
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-6 py-2.5 text-left text-2xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase">Item</th>
                      <th className="px-6 py-2.5 text-right text-2xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase">Current Stock</th>
                      <th className="px-6 py-2.5 text-right text-2xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase">Ledger Balance</th>
                      <th className="px-6 py-2.5 text-right text-2xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase">Drift</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {reconRows.map((row) => {
                      const drift = Number(row.drift || 0);
                      const hasDrift = drift !== 0;
                      return (
                        <tr
                          key={row.itemId}
                          className={
                            hasDrift
                              ? 'bg-red-50/70 dark:bg-red-900/10 hover:bg-red-50 dark:hover:bg-red-900/20'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                          }
                        >
                          <td className="px-6 py-3 whitespace-nowrap text-[13px] font-medium text-gray-900 dark:text-white">
                            {row.itemName || items.find((i) => i.id === row.itemId)?.name || row.itemId}
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap text-[13px] text-right text-gray-700 dark:text-gray-300">
                            {formatNumber(row.currentStock)}
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap text-[13px] text-right text-gray-700 dark:text-gray-300">
                            {formatNumber(row.ledgerBalance)}
                          </td>
                          <td
                            className={`px-6 py-3 whitespace-nowrap text-[13px] text-right font-semibold ${
                              hasDrift ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                            }`}
                          >
                            {hasDrift ? (
                              <span className="inline-flex items-center gap-1">
                                <i className="bx bx-error-circle" aria-hidden="true"></i>
                                {drift > 0 ? `+${formatNumber(drift)}` : formatNumber(drift)}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1">
                                <i className="bx bx-check-circle" aria-hidden="true"></i>0
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
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
