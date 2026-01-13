import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import Link from 'next/link';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import Toast from '@/components/Toast';
import { BulkUploadLog } from '@/../shared/types';

interface InflowDetails {
  id: string;
  businessId: string;
  branchId: string;
  invoiceNumber?: string;
  inflowNumber?: string;
  reference?: string;
  receivedDate?: string;
  notes?: string;
  totalAmount?: number;
  currency?: string;
  supplier?: { id: string; name: string };
  receivedBy?: { name?: string; email?: string } | string;
  branch?: { id: string; name: string };
  items?: InflowItemWithDetails[];
  failedUploads?: BulkUploadLog[];
}

interface InflowItemWithDetails {
  id: string;
  quantity: number;
  unitCost: number;
  totalCost?: number;
  inventoryItemName?: string;
  name?: string;
  itemName?: string;
  unitName?: string;
  unit?: string;
  supplierId?: string;
  branchId?: string;
  inventoryItem?: { 
    name: string; 
    baseUom?: { name: string; abbreviation: string };
    category?: { name: string };
    subcategory?: { name: string };
  };
  uom?: { name: string; abbreviation: string };
  supplier?: { name: string };
  branch?: { name: string };
  batchNumber?: string;
  expiryDate?: string;
  salesData?: {
    totalSold: number;
    totalSalesAmount: number;
    totalCost: number;
    orderCount: number;
    remainingQuantity: number;
  };
  baseQuantity?: number;
}

export default function InflowDetailsPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { id } = router.query;
  const [inflow, setInflow] = useState<InflowDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState<string>('NGN');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showFailedUploads, setShowFailedUploads] = useState(false);

  useEffect(() => {
    if (id) {
      loadInflow();
      loadCurrency();
    }
  }, [id]);

  const loadCurrency = async () => {
    try {
      const response = await api.get<{ success: boolean; data: { currency_code?: string; currency?: string } }>('/settings');
      if (response.success && response.data) {
        setCurrency(response.data.currency_code || response.data.currency || 'NGN');
      }
    } catch (err) {
      console.error('Failed to load currency:', err);
      setCurrency('NGN');
    }
  };

  const formatCurrency = (amount: number, inflowCurrency?: string): string => {
    const currencySymbols: { [key: string]: string } = {
      'NGN': '₦',
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'GHS': '₵',
      'KES': 'KSh',
      'ZAR': 'R',
    };
    const currencyCode = inflowCurrency || currency;
    const symbol = currencySymbols[currencyCode] || currencyCode;
    return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const loadInflow = async () => {
    try {
      const response = await api.get<{ success: boolean; data: InflowDetails }>(`/ims/inflows/${id}?withSales=true`);
      if (response.success && response.data) {
        setInflow(response.data);
      }
    } catch (err: any) {
      console.error('Failed to load inflow:', err);
      setToast({ message: err.response?.data?.message || t('failedToLoadData') || 'Failed to load inflow details', type: 'error' });
      setTimeout(() => router.push('/ims/inflows'), 2000);
    } finally {
      setLoading(false);
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

  if (!inflow) {
    return (
      <div className="p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">{t('inflowNotFound') || 'Inflow not found'}</p>
          <Link href="/ims/inflows" className="mt-4 inline-block text-red-600 hover:text-red-700 dark:text-red-400">
            {t('backToInflows') || 'Back to Inflows'}
          </Link>
        </div>
      </div>
    );
  }

  const totalAmount = inflow.items?.reduce((sum: number, item: any) => {
    return sum + ((item.quantity || 0) * (item.unitCost || 0));
  }, 0) || inflow.totalAmount || 0;

  return (
    <PermissionGuard permission="inventory.view">
      <div className="p-6 max-w-7xl mx-auto">
        {toast && (
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        )}

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/ims/inflows" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              <i className="bx bx-arrow-back text-xl"></i>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('inflowDetails') || 'Inflow Details'}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {t('invoiceNumber') || 'Invoice'}: {inflow.invoiceNumber || inflow.inflowNumber || inflow.reference || id}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* Inflow Information - Full Width Top Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('inflowInformation') || 'Inflow Information'}</h2>
              
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {inflow.branch && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('branch')}</label>
                    <p className="text-gray-900 dark:text-gray-100 mt-1">{inflow.branch.name || '-'}</p>
                  </div>
                )}
                {inflow.supplier && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('supplier')}</label>
                    <p className="text-gray-900 dark:text-gray-100 mt-1">{inflow.supplier.name || '-'}</p>
                  </div>
                )}
                
                {inflow.invoiceNumber && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('invoiceNumber')}</label>
                    <p className="text-gray-900 dark:text-gray-100 mt-1">{inflow.invoiceNumber}</p>
                  </div>
                )}
                
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('receivedDate')}</label>
                  <p className="text-gray-900 dark:text-gray-100 mt-1">{formatDate(inflow.receivedDate)}</p>
                </div>
                
                {inflow.receivedBy && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('receivedBy')}</label>
                    <p className="text-gray-900 dark:text-gray-100 mt-1">
                      {typeof inflow.receivedBy === 'string' 
                        ? inflow.receivedBy 
                        : (inflow.receivedBy?.name || inflow.receivedBy?.email || '-')
                      }
                    </p>
                  </div>
                )}
            </div>
                
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('totalAmount')}</label>
                  <p className="text-xl font-bold text-red-600 dark:text-red-400 mt-1">{formatCurrency(totalAmount, inflow.currency)}</p>
              </div>
                </div>
                
                {inflow.notes && (
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('notes')}</label>
                <div className="mt-1 max-h-32 overflow-y-auto">
                  <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{inflow.notes}</p>
                  </div>
              </div>
            )}
          </div>

          {/* Failed Uploads Section - Show only if there are failed uploads */}
          {inflow.failedUploads && inflow.failedUploads.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <div>
                  <div className="flex items-center space-x-2">
                    <i className="bx bx-error-circle text-red-500 text-lg"></i>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {t('failedUploads') || 'Failed Uploads'} ({inflow.failedUploads.length})
                    </h2>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {t('failedUploadsDescription') || 'Items that could not be processed during bulk upload'}
                  </p>
                </div>
                <button
                  onClick={() => setShowFailedUploads(!showFailedUploads)}
                  className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30 transition-colors"
                >
                  {showFailedUploads ? (t('hideDetails') || 'Hide Details') : (t('showDetails') || 'Show Details')}
                </button>
              </div>
              
              {showFailedUploads && (
                <>
                  <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                    <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-red-50 dark:bg-red-900/10 sticky top-0 z-10">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            {t('lineNumber') || 'Line #'}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            {t('itemName') || 'Item Name'}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            {t('quantity') || 'Quantity'}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            {t('uom') || 'UOM'}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            {t('errors') || 'Errors'}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {inflow.failedUploads.map((failedUpload: BulkUploadLog, index: number) => {
                          const rowData = failedUpload.rowData || {};
                          return (
                            <tr key={failedUpload.id || index} className="hover:bg-red-50 dark:hover:bg-red-900/5">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600 dark:text-red-400">
                                {failedUpload.lineNumber || '-'}
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                  {rowData.item_name || rowData.itemName || '-'}
                                </div>
                                {rowData.description && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {rowData.description}
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                {rowData.quantity || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                {rowData.uom || '-'}
                              </td>
                              <td className="px-6 py-4">
                                <div className="space-y-1">
                                  {failedUpload.errorMessages && failedUpload.errorMessages.length > 0 ? (
                                    failedUpload.errorMessages.map((error: string, errorIndex: number) => (
                                      <div key={errorIndex} className="flex items-start space-x-2">
                                        <i className="bx bx-error-circle text-red-500 text-xs mt-0.5 flex-shrink-0"></i>
                                        <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
                                      </div>
                                    ))
                                  ) : (
                                    <span className="text-sm text-red-600 dark:text-red-400">
                                      {t('unknownError') || 'Unknown error'}
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="p-4 bg-red-50 dark:bg-red-900/10 border-t border-red-200 dark:border-red-800">
                    <div className="flex items-center space-x-2 text-sm text-red-700 dark:text-red-300">
                      <i className="bx bx-info-circle"></i>
                      <span>
                        {t('failedUploadsNote') || 'These items were skipped during the bulk upload process and need to be corrected and re-uploaded.'}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Inflow Items - Full Width Below Information */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('inflowItems') || 'Inflow Items'}</h2>
              </div>
              
              {inflow.items && inflow.items.length > 0 ? (
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                  <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          {t('item')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          {t('supplier')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          {t('quantity')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          {t('unit')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          {t('unitCost')}
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          {t('sold') || 'Sold'}
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          {t('remaining') || 'Remaining'}
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          {t('total')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {inflow.items?.map((item: InflowItemWithDetails, index: number) => {
                        const itemTotal = (item.quantity || 0) * (item.unitCost || 0);
                        // Access relations properly - backend loads them with these property names
                        const inventoryItem = item.inventoryItem;
                        const uom = item.uom;
                      const itemSupplier = item.supplier || null;
                      const itemBranch = item.branch || null;
                        
                        // Get item name with proper fallbacks
                        const itemName = inventoryItem?.name || item.inventoryItemName || item.name || item.itemName || '-';
                        
                        // Get unit name with proper fallbacks
                        const unitName = uom?.abbreviation || uom?.name || inventoryItem?.baseUom?.abbreviation || inventoryItem?.baseUom?.name || item.unitName || item.unit || '-';
                        
                      // Get supplier name - item-specific supplier first, then inflow supplier, then '-'
                        const supplierName = itemSupplier?.name || (item.supplierId ? '-' : (inflow.supplier?.name || '-'));
                      
                      // Get branch name - item-specific branch first, then inflow branch, then '-'
                      const branchName = itemBranch?.name || (item.branchId ? (inflow.branch?.name || '-') : (inflow.branch?.name || '-'));
                        
                        // Sales data
                        const salesData = item.salesData || {
                          totalSold: 0,
                          totalSalesAmount: 0,
                          totalCost: 0,
                          orderCount: 0,
                          remainingQuantity: Number(item.baseQuantity || item.quantity || 0),
                        };

                        // Calculate status indicators
                        const baseQuantity = Number(item.baseQuantity || item.quantity || 0);
                        const soldQuantity = Number(salesData.totalSold || 0);
                        const remainingQuantity = Number(salesData.remainingQuantity || baseQuantity);
                        const soldPercentage = baseQuantity > 0 ? (soldQuantity / baseQuantity * 100) : 0;
                        
                        return (
                          <tr key={item.id || index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {itemName !== '-' ? itemName : (t('item') || 'Item')}
                              </div>
                              {(inventoryItem?.category?.name || inventoryItem?.subcategory?.name) && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  {inventoryItem.category?.name || ''}
                                  {inventoryItem.category?.name && inventoryItem.subcategory?.name ? ' - ' : ''}
                                  {inventoryItem.subcategory?.name || ''}
                                </div>
                              )}
                              {(item.batchNumber || item.expiryDate) && (
                                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 space-x-2">
                                  {item.batchNumber && <span>Batch: {item.batchNumber}</span>}
                                  {item.expiryDate && <span>Exp: {formatDate(item.expiryDate)}</span>}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {supplierName !== '-' ? supplierName : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                              {Number(item.quantity || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                              {unitName !== '-' ? unitName : (t('unit') || 'Unit')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                              {formatCurrency(item.unitCost || 0, inflow.currency)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <div className="text-sm text-gray-900 dark:text-gray-100">
                                {soldQuantity.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                              </div>
                              {baseQuantity > 0 && (
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {soldPercentage.toFixed(1)}% sold
                                </div>
                              )}
                              {salesData.orderCount > 0 && (
                                <div className="text-xs text-blue-600 dark:text-blue-400">
                                  {salesData.orderCount} order{salesData.orderCount !== 1 ? 's' : ''}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <div className={`text-sm font-medium ${
                                remainingQuantity > 0 
                                  ? 'text-green-600 dark:text-green-400' 
                                  : 'text-gray-500 dark:text-gray-400'
                              }`}>
                                {remainingQuantity.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                              </div>
                              {remainingQuantity === 0 && baseQuantity > 0 && (
                                <div className="text-xs text-red-600 dark:text-red-400">
                                  Fully sold
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900 dark:text-gray-100">
                              {formatCurrency(itemTotal || item.totalCost || 0, inflow.currency)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-gray-50 dark:bg-gray-700 sticky bottom-0">
                      <tr>
                      <td colSpan={7} className="px-6 py-4 text-right text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {t('grandTotal') || 'Grand Total'}:
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-bold text-red-600 dark:text-red-400">
                          {formatCurrency(totalAmount || inflow.totalAmount || 0, inflow.currency)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  <i className="bx bx-package text-4xl mb-2"></i>
                  <p>{t('noItemsInInflow') || 'No items in this inflow'}</p>
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
