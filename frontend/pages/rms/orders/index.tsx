import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import Link from 'next/link';
import Toast from '@/components/Toast';
import Modal from '@/components/Modal';

export default function OrdersPage() {
  const { t } = useTranslation('common');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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

  return (
    <div className="p-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('orders')}</h1>
        <Link
          href="/rms/orders/create"
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
        >
          {t('create')} {t('order')}
        </Link>
      </div>
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-3">
            <i className="bx bx-receipt text-gray-400 dark:text-gray-500 text-2xl"></i>
          </div>
          <h3 className="text-gray-900 dark:text-gray-100 font-medium">{t('noOrdersYet') || 'No orders yet'}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('createYourFirstOrder') || 'Create your first order to get started'}</p>
          <Link
            href="/rms/orders/create"
            className="mt-4 inline-block px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
          >
            {t('create')} {t('order')}
          </Link>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    {t('orderNumber')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    {t('itemsSold') || 'Items Sold'}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    {t('totalPaid') || 'Total Paid'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    {t('createdDate') || 'Date/Time'}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    {t('totalCost') || 'Total Cost'}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    {t('totalSale') || 'Total Sale'}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    {t('profit')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    {t('status')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    {t('actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {orders.map((order) => {
                // Calculate total cost from order items - try multiple cost fields
                const totalCost = order.items?.reduce((sum: number, item: any) => {
                  // Try different cost field combinations
                  let itemCost = Number(item.costTotal || 0);
                  
                  // If costTotal is 0, try to calculate from unitCost * quantity
                  if (itemCost === 0) {
                    const unitCost = Number(item.unitCost || item.cost || item.costPrice || 0);
                    const quantity = Number(item.quantity || 0);
                    itemCost = unitCost * quantity;
                  }
                  
                  return sum + itemCost;
                }, 0) || 0;
                
                const totalSale = Number(order.subtotal || order.totalAmount || 0);
                const profit = totalSale - totalCost;
                const itemsSold = order.items?.reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0) || Number(order.itemsSold || 0) || 0;
                const existingPayments = order.payments || [];
                const totalPaid = existingPayments.reduce((sum: number, payment: any) => sum + Number(payment.amount || 0), 0);
                const isFullyPaid = totalPaid >= Number(order.totalAmount || 0);
                const createdAt = order.createdAt ? new Date(order.createdAt) : null;

                return (
                  <tr key={order.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      <Link href={`/rms/orders/${order.id}`} className="text-red-600 dark:text-red-400 hover:underline">
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {itemsSold}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500 dark:text-gray-400">
                      {formatCurrency(totalPaid)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {createdAt ? `${createdAt.toLocaleDateString()} ${createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500 dark:text-gray-400">
                      {formatCurrency(totalCost)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-gray-100">
                      {formatCurrency(totalSale)}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {profit >= 0 ? '+' : ''}{formatCurrency(profit)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          order.status === 'completed'
                            ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                            : order.status === 'pending'
                            ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {!isFullyPaid && (
                        <button
                          onClick={() => handleMarkAsPaid(order)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                        >
                          {t('markAsPaid') || 'Mark as Paid'}
                        </button>
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
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg mb-4">
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                className="w-full min-h-[48px] px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-transparent"
                required
              >
                <option value="full">{t('fullPayment') || 'Full Payment'}</option>
                <option value="partial">{t('partialPayment') || 'Partial Payment'}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('paymentMethod') || 'Payment Method'} <span className="text-red-500">*</span>
              </label>
              <select
                value={paymentForm.method}
                onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                className="w-full min-h-[48px] px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-transparent"
                required
              >
                <option value="cash">{t('cash') || 'Cash'}</option>
                <option value="bank_transfer">{t('bankTransfer') || 'Bank Transfer'}</option>
                <option value="pos">{t('pos') || 'POS'}</option>
                <option value="checkout">{t('checkout') || 'Checkout'}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('amount') || 'Amount'} <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) || 0 })}
                className="w-full min-h-[48px] px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('notes')} ({t('optional') || 'Optional'})
              </label>
              <textarea
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                rows={3}
                className="w-full min-h-[48px] px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-transparent"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedOrder(null);
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {t('cancel') || 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={processingPayment}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
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
