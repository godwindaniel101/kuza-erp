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
import Button from '@/components/ui/Button';
import FormField from '@/components/ui/FormField';

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
            <Button href="/pos" variant="secondary" size="sm">
              <i className="bx bx-store-alt" aria-hidden="true"></i>
              {t('openPos') || 'Open POS'}
            </Button>
            <Button href="/rms/orders/create" variant="primary" size="sm">
              <i className="bx bx-plus" aria-hidden="true"></i>
              {t('create')} {t('order')}
            </Button>
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
              <Button href="/rms/orders/create" variant="primary" size="sm">
                {t('create')} {t('order')}
              </Button>
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
