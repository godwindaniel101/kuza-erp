import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import Link from 'next/link';
import Toast from '@/components/Toast';
import Modal from '@/components/Modal';
import PageHeader from '@/components/ui/PageHeader';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable';
import EmptyState from '@/components/ui/EmptyState';
import StatusBadge from '@/components/ui/StatusBadge';

const PAGE_SIZE = 20;

export default function OrdersPage() {
  const { t } = useTranslation('common');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
  }, []);

  const loadOrders = async () => {
    try {
      const response = await api.get<{ success: boolean; data: any[] }>('/rms/orders');
      if (response.success) {
        setOrders(response.data);
      }
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₦${Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleMarkAsPaid = (order: any) => {
    // Calculate total paid from existing payments
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

  // ---- Derived row helpers (same math as before, per row) ----
  const rowTotalCost = (order: any) =>
    order.items?.reduce((sum: number, item: any) => {
      let itemCost = Number(item.costTotal || 0);
      if (itemCost === 0) {
        const unitCost = Number(item.unitCost || item.cost || item.costPrice || 0);
        const quantity = Number(item.quantity || 0);
        itemCost = unitCost * quantity;
      }
      return sum + itemCost;
    }, 0) || 0;

  const rowTotalSale = (order: any) => Number(order.subtotal || order.totalAmount || 0);

  const rowItemsSold = (order: any) =>
    order.items?.reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0) ||
    Number(order.itemsSold || 0) ||
    0;

  const rowTotalPaid = (order: any) =>
    (order.payments || []).reduce((sum: number, payment: any) => sum + Number(payment.amount || 0), 0);

  const columns: DataTableColumn<any>[] = [
    {
      key: 'orderNumber',
      label: t('orderNumber'),
      render: (order) => (
        <Link
          href={`/rms/orders/${order.id}`}
          className="font-medium text-brand-600 dark:text-brand-400 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {order.orderNumber}
        </Link>
      ),
    },
    {
      key: 'itemsSold',
      label: t('itemsSold') || 'Items Sold',
      render: (order) => <span className="text-gray-500 dark:text-gray-400">{rowItemsSold(order)}</span>,
    },
    {
      key: 'totalPaid',
      label: t('totalPaid') || 'Total Paid',
      align: 'right',
      render: (order) => <span className="text-gray-500 dark:text-gray-400">{formatCurrency(rowTotalPaid(order))}</span>,
    },
    {
      key: 'createdAt',
      label: t('createdDate') || 'Date/Time',
      render: (order) => {
        const createdAt = order.createdAt ? new Date(order.createdAt) : null;
        return (
          <span className="text-gray-500 dark:text-gray-400">
            {createdAt
              ? `${createdAt.toLocaleDateString()} ${createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : '-'}
          </span>
        );
      },
    },
    {
      key: 'totalCost',
      label: t('totalCost') || 'Total Cost',
      align: 'right',
      render: (order) => <span className="text-gray-500 dark:text-gray-400">{formatCurrency(rowTotalCost(order))}</span>,
    },
    {
      key: 'totalSale',
      label: t('totalSale') || 'Total Sale',
      align: 'right',
      render: (order) => (
        <span className="text-gray-900 dark:text-gray-100">{formatCurrency(rowTotalSale(order))}</span>
      ),
    },
    {
      key: 'profit',
      label: t('profit'),
      align: 'right',
      render: (order) => {
        const profit = rowTotalSale(order) - rowTotalCost(order);
        return (
          <span
            className={`font-semibold ${profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
          >
            {profit >= 0 ? '+' : ''}
            {formatCurrency(profit)}
          </span>
        );
      },
    },
    {
      key: 'status',
      label: t('status'),
      render: (order) => (
        <StatusBadge
          variant={order.status === 'completed' ? 'success' : order.status === 'pending' ? 'pending' : 'info'}
          label={order.status}
        />
      ),
    },
    {
      key: 'actions',
      label: t('actions'),
      render: (order) => {
        const isFullyPaid = rowTotalPaid(order) >= Number(order.totalAmount || 0);
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

  const totalPages = Math.max(1, Math.ceil(orders.length / PAGE_SIZE));
  const startIndex = (page - 1) * PAGE_SIZE;
  const pageOrders = orders.slice(startIndex, startIndex + PAGE_SIZE);

  return (
    <div className="space-y-5">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <PageHeader
        title={t('orders') || 'Orders'}
        count={loading ? undefined : orders.length}
        subtitle="Every sale rung up, paid and settled"
        breadcrumbs={[{ label: 'Restaurant' }, { label: t('orders') || 'Orders' }]}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/pos"
              className="h-8 px-3 border border-brand-600 text-brand-700 dark:text-brand-300 dark:border-brand-500 rounded-lg text-[13px] font-medium hover:bg-brand-50 dark:hover:bg-brand-900/30 flex items-center"
            >
              <i className="bx bx-store-alt mr-2" aria-hidden="true"></i>
              {t('openPos') || 'Open POS'}
            </Link>
            <Link
              href="/rms/orders/create"
              className="h-8 px-3 bg-brand-600 text-white rounded-lg text-[13px] font-medium hover:bg-brand-700 flex items-center"
            >
              <i className="bx bx-plus mr-2" aria-hidden="true"></i>
              {t('create')} {t('order')}
            </Link>
          </div>
        }
      />

      <DataTable<any>
        columns={columns}
        data={pageOrders}
        loading={loading}
        pagination={{
          page,
          totalPages,
          startIndex,
          endIndex: Math.min(startIndex + pageOrders.length, orders.length),
          totalItems: orders.length,
          onPageChange: setPage,
        }}
        emptyState={
          <EmptyState
            icon="bx-receipt"
            title={t('noOrdersYet') || 'No orders yet'}
            description={t('createYourFirstOrder') || 'Create your first order to get started'}
            actions={
              <Link
                href="/rms/orders/create"
                className="h-8 px-3 bg-brand-600 text-white rounded-lg text-[13px] font-medium hover:bg-brand-700 flex items-center"
              >
                {t('create')} {t('order')}
              </Link>
            }
          />
        }
      />

      {/* Mark as Paid Modal */}
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

            <div>
              <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('paymentMode') || 'Payment Mode'} <span className="text-red-500">*</span>
              </label>
              <select
                value={paymentForm.paymentMode}
                onChange={(e) => {
                  const mode = e.target.value;
                  const existingPayments = selectedOrder.payments || [];
                  const totalPaid = existingPayments.reduce((sum: number, payment: any) => sum + Number(payment.amount || 0), 0);
                  const remainingBalance = Number(selectedOrder.totalAmount || 0) - totalPaid;
                  setPaymentForm({
                    ...paymentForm,
                    paymentMode: mode,
                    amount: mode === 'full' ? remainingBalance : paymentForm.amount,
                  });
                }}
                className="h-9 w-full px-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-transparent text-[13px]"
                required
              >
                <option value="full">{t('fullPayment') || 'Full Payment'}</option>
                <option value="partial">{t('partialPayment') || 'Partial Payment'}</option>
              </select>
            </div>

            <div>
              <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('paymentMethod') || 'Payment Method'} <span className="text-red-500">*</span>
              </label>
              <select
                value={paymentForm.method}
                onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                className="h-9 w-full px-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-transparent text-[13px]"
                required
              >
                <option value="cash">{t('cash') || 'Cash'}</option>
                <option value="bank_transfer">{t('bankTransfer') || 'Bank Transfer'}</option>
                <option value="pos">{t('pos') || 'POS'}</option>
                <option value="checkout">{t('checkout') || 'Checkout'}</option>
              </select>
            </div>

            <div>
              <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('amount') || 'Amount'} <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) || 0 })}
                className="h-9 w-full px-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-transparent text-[13px]"
                required
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('notes')} ({t('optional') || 'Optional'})
              </label>
              <textarea
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 text-[13px] border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-transparent"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedOrder(null);
                }}
                className="h-9 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-[13px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 flex items-center"
              >
                {t('cancel') || 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={processingPayment}
                className="h-9 px-4 bg-brand-600 text-white rounded-lg text-[13px] font-medium hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {processingPayment ? (t('processing') || 'Processing...') : (t('processPayment') || 'Process Payment')}
              </button>
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
