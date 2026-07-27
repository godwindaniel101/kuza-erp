import { useMemo, useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { api } from '@/lib/api';
import Toast from '@/components/Toast';
import Modal from '@/components/Modal';
import PageHeader from '@/components/ui/PageHeader';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable';
import EmptyState from '@/components/ui/EmptyState';
import StatusBadge from '@/components/ui/StatusBadge';
import Button from '@/components/ui/Button';
import FormField from '@/components/ui/FormField';
import OrderStatusBadge, { type OrderStatus } from '@/components/network/OrderStatusBadge';
import { downloadCsv, formatMoney, useCurrency } from '@/lib/format';

const PAGE_SIZE = 20;

// ---- Unified sales row model ---------------------------------------------
// One outbound list = private POS/direct sales + incoming marketplace orders
// (where I'm the supplier). Both sources are normalized to this shape, merged
// and sorted by date desc; status tabs filter across the merged list.
type StatusBucket = 'in_progress' | 'completed' | 'rejected';
type PaymentStatus = 'unpaid' | 'paid' | 'claimed';
type SaleKind = 'pos' | 'marketplace';

interface SaleRow {
  /** Unique React key across both sources (rawId can theoretically collide). */
  id: string;
  rawId: string;
  kind: SaleKind;
  ref: string;
  party: string;
  statusBucket: StatusBucket;
  /** For marketplace we render OrderStatusBadge; this label is the fallback/POS text. */
  statusLabel: string;
  /** Raw marketplace status, used to drive OrderStatusBadge (shipped -> "In transit"). */
  marketplaceStatus?: OrderStatus;
  total: number;
  currency: string;
  date: string;
  paymentStatus: PaymentStatus;
  /** Supplier-side: id of the REAL sale materialized on accept (opens POS detail). */
  salesOrderId?: string | null;
  raw: any;
}

type TabKey = 'all' | StatusBucket;

const totalPaidOf = (order: any) =>
  (order.payments || []).reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);

// POS status values seen in the backend: 'pending' (default) and 'completed'
// (set together with paidAt on full payment). No rejected/cancelled state
// exists for POS, so those never fall into the Rejected bucket.
function bucketPos(order: any): StatusBucket {
  if (order.status === 'cancelled' || order.status === 'rejected') return 'rejected';
  const paid = totalPaidOf(order) >= Number(order.totalAmount || 0) && Number(order.totalAmount || 0) > 0;
  if (order.status === 'completed' || order.paidAt || paid) return 'completed';
  return 'in_progress';
}

function bucketMarketplace(order: any): StatusBucket {
  if (order.status === 'received' || order.paymentStatus === 'paid') return 'completed';
  if (order.status === 'rejected' || order.status === 'cancelled') return 'rejected';
  // requested | accepted | shipped (and anything else in flight)
  return 'in_progress';
}

function normalizePos(order: any, currency: string): SaleRow {
  const paid = totalPaidOf(order) >= Number(order.totalAmount || 0) && Number(order.totalAmount || 0) > 0;
  // A marketplace-sourced RMS order IS the seller's one canonical sale record
  // (created pending at checkout, fulfilled in place). Tag it so the Source chip
  // reads "Market"; it still opens at /rms/orders/:id like any other sale.
  const isMarket = order.source === 'marketplace';
  return {
    id: `pos:${order.id}`,
    rawId: order.id,
    kind: isMarket ? 'marketplace' : 'pos',
    ref: order.orderNumber || '—',
    party: order.customerName || '—',
    statusBucket: bucketPos(order),
    statusLabel: order.status || 'pending',
    total: Number(order.totalAmount || 0),
    currency,
    date: order.paidAt || order.createdAt || '',
    paymentStatus: paid || order.status === 'completed' ? 'paid' : 'unpaid',
    raw: order,
  };
}

function normalizeMarketplace(order: any): SaleRow {
  return {
    id: `mkt:${order.id}`,
    rawId: order.id,
    kind: 'marketplace',
    ref: order.orderNumber || '—',
    party: order.buyerName || order.counterpartyName || order.buyer?.name || '—',
    statusBucket: bucketMarketplace(order),
    statusLabel: order.status || '—',
    marketplaceStatus: order.status as OrderStatus,
    total: Number(order.total || 0),
    currency: order.currency || 'NGN',
    date: order.createdAt || '',
    paymentStatus: (order.paymentStatus as PaymentStatus) || 'unpaid',
    salesOrderId: order.salesOrderId ?? null,
    raw: order,
  };
}

export default function SalesPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const currency = useCurrency();
  const [rows, setRows] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>('all');
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    paymentMode: 'full',
    method: 'cash',
    notes: '',
  });
  const [processingPayment, setProcessingPayment] = useState(false);


  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currency]);

  const loadOrders = async () => {
    setLoading(true);
    // Fetch both sources in parallel; a failure in one source must not blank
    // the whole list. Marketplace is optional (tenant may have no network).
    const [posRes, mktRes] = await Promise.allSettled([
      api.get<{ success: boolean; data: any[] }>('/rms/orders'),
      api.get<{ success: boolean; data: any[] }>('/network/orders?role=supplier'),
    ]);

    const merged: SaleRow[] = [];
    if (posRes.status === 'fulfilled' && posRes.value.success) {
      merged.push(...(posRes.value.data || []).map((o) => normalizePos(o, currency)));
    } else if (posRes.status === 'rejected') {
      console.error('Failed to load POS sales:', posRes.reason);
    }
    if (mktRes.status === 'fulfilled' && mktRes.value.success) {
      // Dedupe: any network order that already has a materialized sale
      // (salesOrderId) is represented by its RMS row above — skip it so each
      // order shows exactly once. Only truly network-only orders (off-catalog /
      // no branch at checkout) surface here.
      merged.push(
        ...(mktRes.value.data || [])
          .filter((o) => !o.salesOrderId)
          .map(normalizeMarketplace),
      );
    } else if (mktRes.status === 'rejected') {
      console.error('Failed to load marketplace orders:', mktRes.reason);
    }

    merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setRows(merged);
    setLoading(false);
  };

  const formatCurrency = (amount: number, cur?: string) => formatMoney(amount, cur || currency);

  // ---- Mark as Paid (POS only) — unchanged behavior --------------------
  const handleMarkAsPaid = (order: any) => {
    const existingPayments = order.payments || [];
    const totalPaid = existingPayments.reduce((sum: number, payment: any) => sum + Number(payment.amount || 0), 0);
    const remainingBalance = Number(order.totalAmount || 0) - totalPaid;

    setSelectedOrder(order);
    setPaymentForm({
      amount: remainingBalance > 0 ? remainingBalance : Number(order.totalAmount || 0),
      paymentMode: 'full',
      method: 'cash',
      notes: '',
    });
    setShowPaymentModal(true);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    const existingPayments = selectedOrder.payments || [];
    const totalPaid = existingPayments.reduce((sum: number, payment: any) => sum + Number(payment.amount || 0), 0);
    const remainingBalance = Number(selectedOrder.totalAmount || 0) - totalPaid;

    if (paymentForm.amount > remainingBalance) {
      setToast({ message: t('paymentExceedsBalance') || 'Payment amount exceeds remaining balance', type: 'error' });
      return;
    }

    if (paymentForm.amount <= 0) {
      setToast({ message: t('paymentAmountRequired') || 'Payment amount must be greater than zero', type: 'error' });
      return;
    }

    setProcessingPayment(true);
    try {
      const response = await api.post(`/rms/orders/${selectedOrder.id}/mark-paid`, {
        amount: paymentForm.amount,
        paymentMode: paymentForm.paymentMode,
        method: paymentForm.method,
        notes: paymentForm.notes || undefined,
      });

      if (response.success) {
        setToast({ message: t('paymentProcessed') || 'Payment processed successfully', type: 'success' });
        setShowPaymentModal(false);
        setSelectedOrder(null);
        await loadOrders();
      }
    } catch (err: any) {
      console.error('Failed to process payment:', err);
      const errorMessage = err.response?.data?.message || err.message || t('paymentFailed') || 'Failed to process payment';
      setToast({ message: errorMessage, type: 'error' });
    } finally {
      setProcessingPayment(false);
    }
  };

  // ---- Status tabs -----------------------------------------------------
  const counts = useMemo(() => {
    const c: Record<TabKey, number> = { all: rows.length, in_progress: 0, completed: 0, rejected: 0 };
    for (const r of rows) c[r.statusBucket] += 1;
    return c;
  }, [rows]);

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'all', label: t('all', 'All') },
    { key: 'in_progress', label: t('sales.tabInProgress', 'In progress') },
    { key: 'completed', label: t('sales.tabCompleted', 'Completed') },
    { key: 'rejected', label: t('sales.tabRejected', 'Rejected') },
  ];

  const filtered = useMemo(
    () => (tab === 'all' ? rows : rows.filter((r) => r.statusBucket === tab)),
    [rows, tab],
  );

  // Reset to the first page whenever the active tab changes.
  useEffect(() => setPage(1), [tab]);

  // Row click / navigation. A marketplace order that has been accepted opens the
  // REAL sale (full POS detail); one still 'requested' opens the Accept panel.
  // The user never navigates to /network for the seller flow.
  const goToDetail = (row: SaleRow) => {
    // RMS rows (id `pos:…`) are the canonical one-record sale — POS *and*
    // marketplace sales materialized on the seller's table. Always /rms/orders/:id.
    if (row.id.startsWith('pos:')) {
      router.push(`/rms/orders/${row.rawId}`);
      return;
    }
    // Network-only fallback (no materialized sale): a materialized one would have
    // been deduped away above, so this only fires for off-catalog orders.
    if (row.salesOrderId) {
      router.push(`/rms/orders/${row.salesOrderId}`);
      return;
    }
    router.push(`/purchases/orders/${row.rawId}`);
  };

  const handleExport = () => {
    downloadCsv(
      'sales.csv',
      [
        t('orderNumber'),
        t('sales.source', 'Source'),
        t('sales.party', 'Customer / Buyer'),
        t('status'),
        t('sales.paymentStatus', 'Payment'),
        t('totalSale') || 'Total',
        t('createdDate') || 'Date/Time',
      ],
      filtered.map((r) => [
        r.ref,
        r.kind === 'pos' ? 'POS' : 'Marketplace',
        r.party,
        r.statusLabel,
        r.paymentStatus,
        r.total.toFixed(2),
        r.date ? new Date(r.date).toLocaleString() : '',
      ]),
    );
  };

  const KindChip = ({ kind }: { kind: SaleKind }) => (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-medium ${
        kind === 'pos'
          ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400'
          : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
      }`}
    >
      <i className={`bx ${kind === 'pos' ? 'bx-store' : 'bx-globe'} text-xs`} aria-hidden="true" />
      {kind === 'pos' ? t('sales.kindPos', 'POS') : t('sales.kindMarketplace', 'Marketplace')}
    </span>
  );

  const PaymentPill = ({ status }: { status: PaymentStatus }) => (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-medium ${
        status === 'paid'
          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
          : status === 'claimed'
          ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
          : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
      }`}
    >
      <i
        className={`bx ${status === 'paid' ? 'bx-check' : status === 'claimed' ? 'bx-hourglass' : 'bx-time-five'} text-xs`}
        aria-hidden="true"
      />
      {status === 'paid'
        ? t('orders.paid', 'Paid')
        : status === 'claimed'
        ? t('orders.claimed', 'Claimed')
        : t('orders.unpaid', 'Unpaid')}
    </span>
  );

  const columns: DataTableColumn<SaleRow>[] = [
    {
      key: 'ref',
      label: t('orderNumber'),
      render: (row) => (
        <span className="font-medium text-brand-600 dark:text-brand-400">{row.ref}</span>
      ),
    },
    {
      key: 'kind',
      label: t('sales.source', 'Source'),
      render: (row) => <KindChip kind={row.kind} />,
    },
    {
      key: 'party',
      label: t('sales.party', 'Customer / Buyer'),
      render: (row) => <span className="text-gray-700 dark:text-gray-300">{row.party}</span>,
    },
    {
      key: 'status',
      label: t('status'),
      render: (row) => (
        <div className="flex items-center gap-1.5">
          {/* Unified terminal status across channels: a concluded sale reads
              "Completed" whether it came from POS or the marketplace (a received
              marketplace order IS a completed sale). Marketplace keeps its
              intermediate stages (In transit, etc.) via OrderStatusBadge. */}
          {row.statusBucket === 'completed' ? (
            <StatusBadge variant="success" label={t('sales.statusCompleted', 'Completed')} />
          ) : row.kind === 'marketplace' && row.marketplaceStatus ? (
            <OrderStatusBadge status={row.marketplaceStatus} />
          ) : (
            <StatusBadge variant="pending" label={row.statusLabel} />
          )}
          <PaymentPill status={row.paymentStatus} />
        </div>
      ),
    },
    {
      key: 'total',
      label: t('totalSale') || 'Total',
      align: 'right',
      render: (row) => (
        <span className="text-gray-900 dark:text-gray-100">{formatCurrency(row.total, row.currency)}</span>
      ),
    },
    {
      key: 'date',
      label: t('createdDate') || 'Date/Time',
      render: (row) => {
        const d = row.date ? new Date(row.date) : null;
        return (
          <span className="text-gray-500 dark:text-gray-400">
            {d ? `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '—'}
          </span>
        );
      },
    },
    {
      key: 'actions',
      label: t('actions'),
      render: (row) => {
        // Marketplace: a still-'requested' order gets a Review action that opens
        // the in-place Accept panel (approve/decline). Accepted/other rows just
        // route (to the real sale) via the row click — show a chevron.
        if (row.kind !== 'pos') {
          if (!row.salesOrderId && row.raw?.status === 'requested') {
            return (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/purchases/orders/${row.rawId}`);
                }}
                className="font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300"
              >
                {t('sales.review', 'Review')}
              </button>
            );
          }
          return (
            <span className="inline-flex items-center gap-1 text-gray-400 dark:text-gray-500">
              <i className="bx bx-chevron-right" aria-hidden="true" />
            </span>
          );
        }
        const order = row.raw;
        const isFullyPaid = totalPaidOf(order) >= Number(order.totalAmount || 0);
        if (isFullyPaid) return <span className="text-gray-400 dark:text-gray-500">—</span>;
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleMarkAsPaid(order);
            }}
            className="font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300"
          >
            {t('markAsPaid') || 'Mark as Paid'}
          </button>
        );
      },
    },
  ];

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const startIndex = (page - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(startIndex, startIndex + PAGE_SIZE);

  return (
    <div className="space-y-5">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <PageHeader
        title={t('nav.sales', 'Sales')}
        count={loading ? undefined : rows.length}
        subtitle={t('sales.subtitle', 'Every outbound sale — over the counter and from your network — in one place')}
        breadcrumbs={[{ label: t('orders.restaurant', 'Restaurant') }, { label: t('nav.sales', 'Sales') }]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={handleExport} disabled={loading || filtered.length === 0}>
              <i className="bx bx-download" aria-hidden="true"></i>
              {t('export') || 'Export'} CSV
            </Button>
            <Button href="/rms/orders/create" variant="primary" size="sm">
              <i className="bx bx-plus" aria-hidden="true"></i>
              {t('create')} {t('order')}
            </Button>
          </div>
        }
      />

      {/* Status tabs — source-agnostic filter pills */}
      <div className="inline-flex flex-wrap rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-0.5">
        {tabs.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setTab(f.key)}
            className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition ${
              tab === f.key
                ? 'bg-brand-600 text-white'
                : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'
            }`}
          >
            {f.label}
            <span
              className={`ml-1.5 rounded-full px-1.5 py-0.5 text-2xs ${
                tab === f.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
              }`}
            >
              {counts[f.key]}
            </span>
          </button>
        ))}
      </div>

      <DataTable<SaleRow>
        columns={columns}
        data={pageRows}
        loading={loading}
        onRowClick={goToDetail}
        pagination={{
          page,
          totalPages,
          startIndex,
          endIndex: Math.min(startIndex + pageRows.length, filtered.length),
          totalItems: filtered.length,
          onPageChange: setPage,
        }}
        emptyState={
          <EmptyState
            icon="bx-receipt"
            title={t('noOrdersYet') || 'No sales yet'}
            description={t('createYourFirstOrder') || 'Create your first order to get started'}
            actions={
              <Button href="/rms/orders/create" variant="primary" size="sm">
                {t('create')} {t('order')}
              </Button>
            }
          />
        }
      />

      {/* Mark as Paid Modal (POS) */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedOrder(null);
        }}
        title={t('markAsPaid') || 'Mark as Paid'}
        maxWidth="md"
      >
        {selectedOrder && (
          <form onSubmit={handlePaymentSubmit} className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">{t('orderTotal') || 'Order Total'}:</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(Number(selectedOrder.totalAmount || 0))}</span>
              </div>
              {selectedOrder.payments && selectedOrder.payments.length > 0 && (
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-gray-600 dark:text-gray-400">{t('totalPaid') || 'Total Paid'}:</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {formatCurrency(selectedOrder.payments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0))}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm mt-2 border-t border-gray-200 dark:border-gray-700 pt-2">
                <span className="text-gray-600 dark:text-gray-400">{t('remainingBalance') || 'Remaining Balance'}:</span>
                <span className="font-semibold text-red-600 dark:text-red-400">
                  {formatCurrency(Number(selectedOrder.totalAmount || 0) - (selectedOrder.payments?.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0) || 0))}
                </span>
              </div>
            </div>

            <FormField
              name="paymentMode"
              type="select"
              label={t('paymentMode') || 'Payment Mode'}
              required
              value={paymentForm.paymentMode}
              onChange={(value) => {
                const mode = value;
                const existingPayments = selectedOrder.payments || [];
                const totalPaid = existingPayments.reduce((sum: number, payment: any) => sum + Number(payment.amount || 0), 0);
                const remainingBalance = Number(selectedOrder.totalAmount || 0) - totalPaid;
                setPaymentForm({
                  ...paymentForm,
                  paymentMode: mode,
                  amount: mode === 'full' ? remainingBalance : paymentForm.amount,
                });
              }}
              options={[
                { value: 'full', label: t('fullPayment') || 'Full Payment' },
                { value: 'partial', label: t('partialPayment') || 'Partial Payment' },
              ]}
            />

            <FormField
              name="method"
              type="select"
              label={t('paymentMethod') || 'Payment Method'}
              required
              value={paymentForm.method}
              onChange={(value) => setPaymentForm({ ...paymentForm, method: value })}
              options={[
                { value: 'cash', label: t('cash') || 'Cash' },
                { value: 'bank_transfer', label: t('bankTransfer') || 'Bank Transfer' },
                { value: 'pos', label: t('pos') || 'POS' },
                { value: 'checkout', label: t('checkout') || 'Checkout' },
              ]}
            />

            <FormField
              name="amount"
              type="number"
              label={t('amount') || 'Amount'}
              required
              step={0.01}
              min={0.01}
              value={paymentForm.amount}
              onChange={(value) => setPaymentForm({ ...paymentForm, amount: Number(value) || 0 })}
            />

            <div>
              <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('notes')} ({t('optional') || 'Optional'})
              </label>
              <textarea
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:border-transparent"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedOrder(null);
                }}
              >
                {t('cancel') || 'Cancel'}
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={processingPayment}
              >
                {processingPayment ? (t('processing') || 'Processing...') : (t('processPayment') || 'Process Payment')}
              </Button>
            </div>
          </form>
        )}
      </Modal>

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
