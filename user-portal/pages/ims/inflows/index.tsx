import { useMemo, useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import Toast from '@/components/Toast';
import BulkUploadWizard from '@/components/ui/BulkUploadWizard';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import StatusBadge, { type StatusBadgeVariant } from '@/components/ui/StatusBadge';
import OrderStatusBadge, { type OrderStatus } from '@/components/network/OrderStatusBadge';
import { useTenantStore } from '@/store/globalStore';
import { term } from '@/lib/terminology';
import { downloadCsv, formatMoney, useCurrency } from '@/lib/format';
import { usePageSearch } from '@/store/searchStore';

const inflowStatusVariant = (status?: string): StatusBadgeVariant => {
  const s = (status || '').toLowerCase();
  if (s === 'approved') return 'approved';
  if (s === 'rejected') return 'rejected';
  return 'pending';
};

type StatusBucket = 'received' | 'awaiting' | 'in_transit' | 'other';
type TabKey = 'all' | 'awaiting' | 'in_transit' | 'received';

interface PurchaseRow {
  id: string;
  kind: 'receipt' | 'po';
  ref: string;
  supplier: string;
  statusBucket: StatusBucket;
  total: number;
  currency: string;
  date: string;
  raw: any;
}

export default function PurchasesPage() {
  const { t } = useTranslation('common');
  const { businessType } = useTenantStore();
  const router = useRouter();
  const { branchId, batchId } = router.query;
  const [inflows, setInflows] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const currency = useCurrency();
  const [currentBranch, setCurrentBranch] = useState<any>(null);
  const searchQuery = usePageSearch(t('purchases.searchPlaceholder', 'Search reference or supplier…'));
  const [activeTab, setActiveTab] = useState<TabKey>('all');

  useEffect(() => {
    if (branchId && typeof branchId === 'string') {
      loadBranch(branchId);
    } else {
      setCurrentBranch(null);
    }
    loadPurchases();
  }, [branchId, batchId]);

  // Reset to page 1 when search / tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab]);

  const loadBranch = async (id: string) => {
    try {
      const response = await api.get<{ success: boolean; data: any }>(`/settings/branches/${id}`);
      if (response.success && response.data) {
        setCurrentBranch(response.data);
      }
    } catch (err) {
      console.error('Failed to load branch:', err);
    }
  };

  const loadPurchases = async () => {
    setLoading(true);
    try {
      // Branch / batch deep-links scope the view to private receipts only
      // (marketplace purchase orders are not branch-scoped).
      const scoped =
        (branchId && typeof branchId === 'string') || (batchId && typeof batchId === 'string');

      let inflowUrl = '/ims/inflows';
      const params = new URLSearchParams();
      if (branchId && typeof branchId === 'string') params.append('branchId', branchId);
      if (batchId && typeof batchId === 'string') params.append('batchId', batchId);
      if (params.toString()) inflowUrl += `?${params.toString()}`;

      const [inflowRes, orderRes] = await Promise.all([
        api.get<{ success: boolean; data: any[] }>(inflowUrl),
        scoped
          ? Promise.resolve({ success: true, data: [] as any[] })
          : api
              .get<{ success: boolean; data: any[] }>('/network/orders?role=buyer')
              .catch(() => ({ success: false, data: [] as any[] })),
      ]);

      setInflows(inflowRes.success ? inflowRes.data : []);
      setOrders(orderRes.success ? orderRes.data : []);
    } catch (err) {
      console.error('Failed to load purchases:', err);
    } finally {
      setLoading(false);
    }
  };

  const approveInflow = async (id: string) => {
    try {
      await api.post(`/ims/inflows/${id}/approve`);
      await loadPurchases();
    } catch (err) {
      console.error('Failed to approve inflow:', err);
    }
  };

  // Normalize + merge both sources into a single inbound list.
  const rows = useMemo<PurchaseRow[]>(() => {
    const receiptRows: PurchaseRow[] = inflows.map((inf) => ({
      id: inf.id,
      kind: 'receipt',
      ref: inf.invoiceNumber || inf.inflowNumber || inf.reference || inf.id || '',
      supplier: inf.supplier?.name || '-',
      statusBucket: 'received',
      total: Number(inf.totalAmount || 0),
      currency: inf.currency || currency,
      date: inf.receivedDate || inf.createdAt || '',
      raw: inf,
    }));

    const poRows: PurchaseRow[] = orders
      // A received PO is already represented by its receipt — drop it to avoid double-count.
      .filter((o) => o.status !== 'received')
      .map((o) => {
        const bucket: StatusBucket =
          o.status === 'shipped'
            ? 'in_transit'
            : o.status === 'requested' || o.status === 'accepted'
            ? 'awaiting'
            : 'other'; // draft / rejected / cancelled
        return {
          id: o.id,
          kind: 'po',
          ref: o.orderNumber || o.id,
          supplier: o.supplierName || '-',
          statusBucket: bucket,
          total: Number(o.total || 0),
          currency: o.currency || currency,
          date: o.createdAt || '',
          raw: o,
        };
      });

    return [...receiptRows, ...poRows].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [inflows, orders, currency]);

  const tabCounts = useMemo(() => {
    const counts = { all: rows.length, awaiting: 0, in_transit: 0, received: 0 };
    for (const r of rows) {
      if (r.statusBucket === 'awaiting') counts.awaiting += 1;
      else if (r.statusBucket === 'in_transit') counts.in_transit += 1;
      else if (r.statusBucket === 'received') counts.received += 1;
    }
    return counts;
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rows.filter((r) => {
      if (activeTab !== 'all' && r.statusBucket !== activeTab) return false;
      if (!q) return true;
      return r.ref.toLowerCase().includes(q) || r.supplier.toLowerCase().includes(q);
    });
  }, [rows, activeTab, searchQuery]);

  // Paginate
  const totalPages = Math.ceil(filteredRows.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRows = filteredRows.slice(startIndex, startIndex + itemsPerPage);

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'all', label: t('purchases.tabAll', 'All'), count: tabCounts.all },
    { key: 'awaiting', label: t('purchases.tabAwaiting', 'Awaiting'), count: tabCounts.awaiting },
    { key: 'in_transit', label: t('purchases.tabInTransit', 'In transit'), count: tabCounts.in_transit },
    { key: 'received', label: t('purchases.tabReceived', 'Received'), count: tabCounts.received },
  ];

  const handleExportCsv = () => {
    const headers = [
      t('purchases.csvRef', 'Reference'),
      t('purchases.csvType', 'Type'),
      t('supplier', 'Supplier'),
      t('date', 'Date'),
      t('totalAmount', 'Total Amount'),
      t('status', 'Status'),
    ];
    const csvRows = filteredRows.map((r) => [
      r.ref,
      r.kind === 'receipt' ? t('purchases.kindReceipt', 'Receipt') : t('purchases.kindPo', 'Purchase order'),
      r.supplier,
      r.date ? new Date(r.date).toLocaleDateString() : '',
      r.total.toFixed(2),
      r.kind === 'receipt' ? r.raw.status || '' : r.raw.status || '',
    ]);
    downloadCsv(`purchases-${new Date().toISOString().slice(0, 10)}.csv`, headers, csvRows);
  };

  const kindChip = (kind: 'receipt' | 'po') =>
    kind === 'receipt' ? (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-2xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
        <i className="bx bx-box text-xs" aria-hidden="true" />
        {t('purchases.kindReceipt', 'Receipt')}
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-2xs font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400">
        <i className="bx bx-cart text-xs" aria-hidden="true" />
        {t('purchases.kindPo', 'Purchase order')}
      </span>
    );

  return (
    <div className="space-y-6 kz-stagger">
      <PageHeader
        title={
          currentBranch
            ? `${term(businessType, 'goodsIn')} — ${currentBranch.name}`
            : term(businessType, 'goodsIn')
        }
        count={loading ? undefined : filteredRows.length}
        subtitle={
          currentBranch
            ? `${t('filteredByBranch')}${currentBranch.address ? ` • ${currentBranch.address}` : ''}`
            : branchId
            ? t('loadingBranch')
            : t('purchases.subtitle', 'Everything coming in — supplier receipts and open purchase orders.')
        }
        breadcrumbs={[
          { label: term(businessType, 'inventorySection') },
          { label: term(businessType, 'goodsIn') },
        ]}
        actions={
          <>
            {currentBranch && (
              <Button
                size="sm"
                variant="secondary"
                onClick={async () => {
                  await router.push('/ims/inflows');
                  setCurrentBranch(null);
                  await loadPurchases();
                }}
              >
                <i className="bx bx-x"></i>
                {t('clearFilter')}
              </Button>
            )}
            {!loading && filteredRows.length > 0 && (
              <Button size="sm" variant="secondary" onClick={handleExportCsv}>
                <i className="bx bx-download"></i>
                {t('exportCsv') || 'Export CSV'}
              </Button>
            )}
            <PermissionGuard permission="inflows.create">
              <Button size="sm" variant="secondary" onClick={() => setShowBulkUpload(true)}>
                <i className="bx bx-upload"></i>
                {t('bulkUpload')}
              </Button>
              <Button size="sm" variant="secondary" href="/market">
                <i className="bx bx-store"></i>
                {t('purchases.requestFromSupplier', 'Request from supplier')}
              </Button>
              <Button
                size="sm"
                href={branchId && typeof branchId === 'string' ? `/ims/inflows/create?branchId=${branchId}` : '/ims/inflows/create'}
              >
                <i className="bx bx-plus"></i>
                {t('purchases.addReceipt', 'Record purchase')}
              </Button>
            </PermissionGuard>
          </>
        }
      />

      {/* Status tabs */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="inline-flex flex-wrap gap-0.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition ${
                activeTab === tab.key
                  ? 'bg-accent text-white'
                  : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'
              }`}
            >
              {tab.label}
              <span
                className={`ml-1.5 tabular-nums ${activeTab === tab.key ? 'text-white/80' : 'text-gray-400'}`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      <BulkUploadWizard
        isOpen={showBulkUpload}
        onClose={() => setShowBulkUpload(false)}
        templateUrl="/ims/inflows/template"
        uploadUrl="/ims/inflows/bulk-upload"
        entityName={t('inflows') || 'inflows'}
        requiredColumns={[
          'Branch Name',
          'Supplier Name',
          'Inventory Item Name',
          'UOM',
          'Quantity',
          'Cost Per Unit',
          'Received At',
          'Batch Number',
          'Expiry Date',
          'Invoice Number',
          'Notes',
        ]}
        onComplete={async () => {
          await loadPurchases();
        }}
      />

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 ring-1 ring-gray-200 dark:ring-gray-800 rounded-xl px-6 py-14 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
            <i className="bx bx-transfer-alt text-xl text-gray-400 dark:text-gray-500"></i>
          </div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
            {searchQuery || activeTab !== 'all' ? t('noInflowsFound') : t('purchases.emptyTitle', 'Nothing incoming yet')}
          </h3>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-6">
            {searchQuery || activeTab !== 'all'
              ? t('tryDifferentSearch')
              : t('purchases.emptyDesc', 'Record a supplier receipt or request items from a supplier to get started.')}
          </p>
          <div className="flex items-center justify-center gap-3">
            {activeTab !== 'all' && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setActiveTab('all');
                }}
              >
                {t('clearSearch')}
              </Button>
            )}
            <PermissionGuard permission="inflows.create">
              <Button
                size="sm"
                href={branchId && typeof branchId === 'string' ? `/ims/inflows/create?branchId=${branchId}` : '/ims/inflows/create'}
              >
                {t('purchases.addReceipt', 'Record purchase')}
              </Button>
            </PermissionGuard>
            <Button size="sm" variant="secondary" href="/market">
              <i className="bx bx-store"></i>
              {t('purchases.requestFromSupplier', 'Request from supplier')}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-gray-900 ring-1 ring-gray-200 dark:ring-gray-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                      {t('purchases.reference', 'Reference')}
                    </th>
                    <th className="px-6 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                      {t('purchases.type', 'Type')}
                    </th>
                    <th className="px-6 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                      {t('supplier')}
                    </th>
                    <th className="px-6 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                      {t('date')}
                    </th>
                    <th className="px-6 py-2.5 text-right text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                      {t('totalAmount')}
                    </th>
                    <th className="px-6 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                      {t('status')}
                    </th>
                    <th className="px-6 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                      {t('actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
                  {paginatedRows.map((row) => (
                    <tr
                      key={`${row.kind}-${row.id}`}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                      onClick={() =>
                        router.push(row.kind === 'receipt' ? `/ims/inflows/${row.id}` : `/purchases/orders/${row.id}`)
                      }
                    >
                      <td className="px-6 py-3 whitespace-nowrap text-[13px] font-medium text-accent hover:underline">
                        {row.kind === 'receipt' ? `${String(row.ref).substring(0, 8)}${String(row.ref).length > 8 ? '…' : ''}` : row.ref}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">{kindChip(row.kind)}</td>
                      <td className="px-6 py-3 whitespace-nowrap text-[13px] text-gray-700 dark:text-gray-300">
                        {row.supplier}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-[13px] text-gray-500 dark:text-gray-400">
                        {row.date ? new Date(row.date).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-right text-[13px] tabular-nums font-medium text-gray-900 dark:text-gray-100">
                        {formatMoney(row.total, row.currency)}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        {row.kind === 'receipt' ? (
                          <StatusBadge variant={inflowStatusVariant(row.raw.status)} label={row.raw.status} size="sm" />
                        ) : (
                          <OrderStatusBadge status={row.raw.status as OrderStatus} />
                        )}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-[13px] font-medium" onClick={(e) => e.stopPropagation()}>
                        {row.kind === 'receipt' && row.raw.status === 'pending' && (
                          <PermissionGuard permission="inflows.approve">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                approveInflow(row.id);
                              }}
                              className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300"
                            >
                              {t('approve')}
                            </button>
                          </PermissionGuard>
                        )}
                        {row.kind === 'po' && (row.raw.status === 'accepted' || row.raw.status === 'shipped') && (
                          <PermissionGuard permission="inflows.create">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/ims/inflows/create?orderId=${row.id}`);
                              }}
                              className="text-accent hover:opacity-80"
                            >
                              {t('purchases.receive', 'Receive')}
                            </button>
                          </PermissionGuard>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 px-4 py-3">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                {t('showing') || 'Showing'} {startIndex + 1} {t('to') || 'to'} {Math.min(startIndex + itemsPerPage, filteredRows.length)} {t('of') || 'of'} {filteredRows.length} {t('items') || 'items'}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  {t('previous') || 'Previous'}
                </Button>
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  {t('page') || 'Page'} {currentPage} {t('of') || 'of'} {totalPages}
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  {t('next') || 'Next'}
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
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
