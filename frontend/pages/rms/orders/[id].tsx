import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import Toast from '@/components/Toast';
import Link from 'next/link';

export default function OrderViewPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { id } = router.query;
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<any>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (id) {
      loadOrder();
    }
  }, [id]);

  const loadOrder = async () => {
    try {
      const response = await api.get<{ success: boolean; data: any }>(`/rms/orders/${id}`);
      if (response.success && response.data) {
        // Ensure items and payments arrays exist
        const orderData = {
          ...response.data,
          items: response.data.items || [],
          payments: response.data.payments || [],
        };
        console.log('[loadOrder] Order data:', orderData);
        console.log('[loadOrder] Payments:', orderData.payments);
        setOrder(orderData);
      } else {
        setToast({ message: t('orderNotFound') || 'Order not found', type: 'error' });
      }
    } catch (err: any) {
      console.error('Failed to load order:', err);
      setToast({ message: err.response?.data?.message || t('failedToLoadOrder') || 'Failed to load order', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const toggleRow = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  const formatCurrency = (amount: number) => {
    return `₦${Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 dark:border-red-400 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">{t('loading') || 'Loading...'}</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <PermissionGuard permission="orders.view">
        <div className="p-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">{t('orderNotFound') || 'Order not found'}</p>
            <Link href="/rms/orders" className="mt-4 inline-block text-red-600 hover:text-red-700 dark:text-red-400">
              {t('backToOrders') || 'Back to Orders'}
            </Link>
          </div>
        </div>
      </PermissionGuard>
    );
  }

  // Calculate totals from items
  // Use values directly from order object (backend calculates these)
  const totalCost = Number(order.totalCost || 0);
  const totalSale = Number(order.subtotal || 0);
  const profit = Number(order.profit || 0);

  return (
    <PermissionGuard permission="orders.view">
      <div className="p-6 max-w-7xl mx-auto">
        {toast && (
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        )}

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/rms/orders" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              <i className="bx bx-arrow-back text-xl"></i>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('salesDetails') || 'Sales Details'}</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t('orderNumber') || 'Order'}: {order.orderNumber}
              </p>
            </div>
          </div>
        </div>

        {/* First Row: Order Information and Payment History */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {/* Order Information - 2/3 Width */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6 flex flex-col">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('orderInformation') || 'Order Information'}</h2>
            
            <div className="flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('orderNumber')}</label>
                  <p className="text-sm text-gray-900 dark:text-gray-100 mt-1 font-mono">
                    {order.orderNumber.length > 20 ? order.orderNumber.substring(0, 20) + '...' : order.orderNumber}
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('date')}</label>
                  <p className="text-gray-900 dark:text-gray-100 mt-1">{formatDate(order.createdAt)}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('status')}</label>
                  <p className="mt-1">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        order.status === 'completed'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                          : order.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                      }`}
                    >
                      {order.status}
                    </span>
                  </p>
                </div>

                {order.orderType && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('orderType')}</label>
                    <p className="text-gray-900 dark:text-gray-100 mt-1 capitalize">{order.orderType.replace('_', ' ')}</p>
                  </div>
                )}
              </div>

              {(order.branch || order.table || order.customerName || order.customerPhone) && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  {order.branch && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('branch')}</label>
                      <p className="text-gray-900 dark:text-gray-100 mt-1">{order.branch.name || '-'}</p>
                    </div>
                  )}
                  
                  {order.table && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('table')}</label>
                      <p className="text-gray-900 dark:text-gray-100 mt-1">{order.table.name || order.table.number || '-'}</p>
                    </div>
                  )}
                  
                  {order.customerName && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('customerName')}</label>
                      <p className="text-gray-900 dark:text-gray-100 mt-1">{order.customerName}</p>
                    </div>
                  )}

                  {order.customerPhone && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('customerPhone')}</label>
                      <p className="text-gray-900 dark:text-gray-100 mt-1">{order.customerPhone}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('cost')}</label>
                  <p className="text-xl font-bold text-gray-700 dark:text-gray-300 mt-1">{formatCurrency(totalCost)}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('sales')}</label>
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">{formatCurrency(totalSale)}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('profit')}</label>
                  <p className={`text-xl font-bold mt-1 ${profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {profit >= 0 ? '+' : ''}{formatCurrency(profit)}
                  </p>
                </div>

                {order.allocationMethod && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('allocationMethod')}</label>
                    <p className="text-gray-900 dark:text-gray-100 mt-1">{order.allocationMethod}</p>
                  </div>
                )}
              </div>

              {order.notes && (
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('notes')}</label>
                  <p className="text-gray-900 dark:text-gray-100 mt-1">{order.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Payment History - 1/3 Width */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6 flex flex-col">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('paymentHistory') || 'Payment History'}</h2>
            
            {/* Payment Summary - At the top */}
            <div className="space-y-3 mb-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('orderTotal') || 'Order Total'}</label>
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">{formatCurrency(Number(order.totalAmount || 0))}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('totalPaid') || 'Total Paid'}</label>
                  <p className="text-xl font-bold text-green-600 dark:text-green-400 mt-1">
                    {formatCurrency((order.payments || []).reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0))}
                  </p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('remainingBalance') || 'Remaining Balance'}</label>
                <p className="text-xl font-bold text-red-600 dark:text-red-400 mt-1">
                  {formatCurrency(Number(order.totalAmount || 0) - (order.payments || []).reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0))}
                </p>
              </div>
            </div>

            {/* Payment Log - Scrollable */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 flex-1 flex flex-col min-h-0">
              {order.payments && order.payments.length > 0 ? (
                <div className="flex-1 overflow-y-auto">
                  <div className="space-y-3">
                    {order.payments.map((payment: any, index: number) => (
                      <div key={index} className="border-b border-gray-200 dark:border-gray-700 pb-3 last:border-b-0 last:pb-0">
                        <div className="flex justify-between items-start mb-1">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{formatCurrency(Number(payment.amount || 0))}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{formatDate(payment.createdAt)}</p>
                          </div>
                          <span className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 capitalize">
                            {payment.method.replace('_', ' ')}
                          </span>
                        </div>
                        {payment.notes && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{payment.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center">{t('noPayments') || 'No payments recorded'}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Second Row: Order Items - Full Width */}
        <div className="mt-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('orderItems') || 'Order Items'}</h2>
              </div>
              
              {order.items && order.items.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          {t('item')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          {t('quantity')}
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          {t('salesPrice') || 'Sales Price'}
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          {t('totalCost') || 'Total Cost'}
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          {t('soldFor') || 'Sold For'}
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          {t('profit')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {order.items.map((item: any, index: number) => {
                        const itemProfit = Number(item.totalPrice || 0) - Number(item.costTotal || 0);
                        const isExpanded = expandedRows.has(index);
                        const hasBreakdown = item.batches && item.batches.length > 0;

                        return (
                          <>
                            <tr
                              key={item.id || index}
                              className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                              style={{ cursor: hasBreakdown ? 'pointer' : 'default' }}
                              onClick={() => hasBreakdown && toggleRow(index)}
                            >
                              <td className="px-6 py-4">
                                <div className="flex items-center space-x-2">
                                  {hasBreakdown && (
                                    <i className={`bx text-lg text-gray-400 ${isExpanded ? 'bx-chevron-down' : 'bx-chevron-right'}`}></i>
                                  )}
                                  <div>
                                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                      {item.name || item.inventoryItem?.name || 'Unknown Item'}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                {Number(item.quantity || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {item.uom?.name || item.uom?.abbreviation || ''}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-gray-100">
                                {formatCurrency(item.unitPrice || 0)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600 dark:text-gray-400">
                                {formatCurrency(item.costTotal || 0)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900 dark:text-gray-100">
                                {formatCurrency(item.totalPrice || 0)}
                              </td>
                              <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${itemProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {itemProfit >= 0 ? '+' : ''}{formatCurrency(itemProfit)}
                              </td>
                            </tr>
                            {/* Batch breakdown row - show individual batch/inflow details */}
                            {isExpanded && hasBreakdown && item.batches && (
                              <tr>
                                <td colSpan={6} className="px-6 py-4">
                                  <div className="ml-7 text-xs">
                                    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
                                      <div className="flex items-center justify-between mb-3">
                                        <p className="font-medium text-gray-700 dark:text-gray-200 flex items-center">
                                          <i className="bx bx-store-alt mr-1"></i>
                                          {t('batchBreakdown') || 'Batch/Inflow Breakdown'}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                          {item.batches.length} {t('batch') || 'batch'}({item.batches.length !== 1 ? 'es' : ''})
                                        </p>
                                      </div>
                                      <div className="h-px bg-gray-200 dark:bg-gray-700 mb-3"></div>
                                      <div className="overflow-x-auto">
                                        <table className="w-full">
                                          <thead>
                                            <tr className="bg-purple-50 dark:bg-purple-900/20 text-gray-600 dark:text-gray-300">
                                              <th className="text-left py-2 px-3 font-medium">{t('supplier')}</th>
                                              <th className="text-left py-2 px-3 font-medium">{t('branch')}</th>
                                              <th className="text-left py-2 px-3 font-medium">{t('invoiceNumber') || 'Invoice'}</th>
                                              <th className="text-left py-2 px-3 font-medium">{t('batchNumber') || 'Batch'}</th>
                                              <th className="text-center py-2 px-3 font-medium">{t('qty') || 'Qty'} ({item.uom?.name || item.uom?.abbreviation || ''})</th>
                                              <th className="text-center py-2 px-3 font-medium">{t('baseQty') || 'Base Qty'} ({item.baseUom?.name || item.baseUom?.abbreviation || ''})</th>
                                              <th className="text-right py-2 px-3 font-medium">{t('costPerUnit') || 'Cost/Unit'}</th>
                                              <th className="text-right py-2 px-3 font-medium">{t('totalCost') || 'Total Cost'}</th>
                                              <th className="text-right py-2 px-3 font-medium">{t('soldFor') || 'Sold For'}</th>
                                              <th className="text-right py-2 px-3 font-medium">{t('profit')}</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {item.batches.map((batch: any, batchIdx: number) => {
                                              const batchQtySale = Number(batch.quantityUsedSaleUom || batch.quantityUsed || 0);
                                              const batchQtyBase = Number(batch.quantityUsed || 0);
                                              const batchSaleValue = Number(batch.saleValue || 0);
                                              const batchCostValue = Number(batch.costTotal || 0);
                                              const batchProfit = Number(batch.profit || batchSaleValue - batchCostValue);

                                              return (
                                                <tr key={batchIdx} className="border-b border-gray-100 dark:border-gray-800">
                                                  <td className="py-2 px-3">
                                                    <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-200 rounded font-medium">
                                                      {batch.supplier?.name || 'Unknown Supplier'}
                                                    </span>
                                                  </td>
                                                  <td className="py-2 px-3 text-gray-700 dark:text-gray-200">
                                                    {batch.branch?.name || '-'}
                                                  </td>
                                                  <td className="py-2 px-3 text-gray-700 dark:text-gray-200">
                                                    {batch.invoiceNumber || '-'}
                                                  </td>
                                                  <td className="py-2 px-3 text-gray-700 dark:text-gray-200">
                                                    {batch.batchNumber || '-'}
                                                  </td>
                                                  <td className="py-2 px-3 text-center text-gray-700 dark:text-gray-200">
                                                    {batchQtySale.toFixed(2)}
                                                  </td>
                                                  <td className="py-2 px-3 text-center text-gray-700 dark:text-gray-200">
                                                    {batchQtyBase.toFixed(2)}
                                                  </td>
                                                  <td className="py-2 px-3 text-right text-gray-600 dark:text-gray-400">
                                                    {formatCurrency(batch.costPerUnit || 0)}
                                                  </td>
                                                  <td className="py-2 px-3 text-right text-gray-600 dark:text-gray-400">
                                                    {formatCurrency(batchCostValue)}
                                                  </td>
                                                  <td className="py-2 px-3 text-right font-medium text-gray-900 dark:text-gray-100">
                                                    {formatCurrency(batchSaleValue)}
                                                  </td>
                                                  <td className={`py-2 px-3 text-right font-semibold ${batchProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                    {batchProfit >= 0 ? '+' : ''}{formatCurrency(batchProfit)}
                                                  </td>
                                                </tr>
                                              );
                                            })}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-gray-50 dark:bg-gray-700 sticky bottom-0">
                      <tr>
                        <td colSpan={3} className="px-6 py-4 text-right text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {t('totals') || 'Totals'}:
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-semibold text-gray-600 dark:text-gray-400">{formatCurrency(totalCost)}</td>
                        <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(totalSale)}</td>
                        <td className={`px-6 py-4 text-right text-sm font-bold ${profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {profit >= 0 ? '+' : ''}{formatCurrency(profit)}
                        </td>
                      </tr>
                      {order.tax > 0 && (
                        <tr>
                          <td colSpan={4} className="px-6 py-4 text-right text-sm font-medium text-gray-600 dark:text-gray-400">{t('vat') || 'VAT'}</td>
                          <td className="px-6 py-4 text-right text-sm font-medium text-gray-900 dark:text-gray-100">{formatCurrency(order.tax || 0)}</td>
                          <td className="px-6 py-4"></td>
                        </tr>
                      )}
                      <tr>
                        <td colSpan={4} className="px-6 py-4 text-right text-sm font-semibold text-gray-900 dark:text-gray-100">{t('total')}</td>
                        <td className="px-6 py-4 text-right text-sm font-bold text-red-600 dark:text-red-400">{formatCurrency(order.totalAmount || 0)}</td>
                        <td className="px-6 py-4"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  <i className="bx bx-package text-4xl mb-2"></i>
                  <p>{t('noItems')}</p>
                </div>
              )}
          </div>
        </div>
      </div>
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
