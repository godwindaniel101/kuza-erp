import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import Link from 'next/link';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';

export default function InventoryItemViewPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { id } = router.query;
  const [loading, setLoading] = useState(true);
  const [itemStats, setItemStats] = useState<any>(null);
  const [currency, setCurrency] = useState<string>('NGN');

  useEffect(() => {
    if (id) {
      loadItemStats();
      loadCurrency();
    }
  }, [id]);

  const loadCurrency = async () => {
    try {
      const response = await api.get<{
        success: boolean;
        data: { currency_code?: string; currency?: string };
      }>('/settings');
      if (response.success && response.data) {
        setCurrency(
          response.data.currency_code || response.data.currency || 'NGN'
        );
      }
    } catch (err) {
      console.error('Failed to load currency:', err);
      setCurrency('NGN');
    }
  };

  const formatCurrency = (amount: number): string => {
    const currencySymbols: { [key: string]: string } = {
      NGN: '₦',
      USD: '$',
      EUR: '€',
      GBP: '£',
    };
    const symbol = currencySymbols[currency] || currency;
    return `${symbol}${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (date: string | Date): string => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const loadItemStats = async () => {
    try {
      const response = await api.get<{ success: boolean; data: any }>(
        `/ims/inventory/${id}?stats=true`
      );
      if (response.success && response.data) {
        setItemStats(response.data);
      }
    } catch (err: any) {
      console.error('Failed to load item stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!itemStats || !itemStats.item) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <p className="text-red-600 dark:text-red-400">
            {t('itemNotFound') || 'Item not found'}
          </p>
          <Link
            href="/ims/inventory"
            className="text-blue-600 dark:text-blue-400 hover:underline mt-4 inline-block"
          >
            {t('backToInventory') || 'Back to Inventory'}
          </Link>
        </div>
      </div>
    );
  }

  const { item, branchStocks, sales, salesByBranch } = itemStats;

  return (
    <PermissionGuard permission="inventory.view">
      <div className="p-6 bg-white dark:bg-gray-900 min-h-screen">
        <div className="mb-6">
          <Link
            href="/ims/inventory"
            className="text-blue-600 dark:text-blue-400 hover:underline mb-4 inline-block"
          >
            ← {t('backToInventory') || 'Back to Inventory'}
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                {item.name}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {item.category && (
                  <span>
                    {item.category}
                    {item.subcategory && ` > ${item.subcategory}`}
                  </span>
                )}
              </p>
            </div>
            <PermissionGuard permission="inventory.edit">
              <Link
                href={`/ims/inventory/edit/${id}`}
                className="px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-lg text-sm font-medium hover:bg-red-700 dark:hover:bg-red-600 flex items-center space-x-2 shadow-sm"
              >
                <i className="bx bx-edit"></i>
                <span>{t('edit')}</span>
              </Link>
            </PermissionGuard>
          </div>
        </div>

        {/* Item Images */}
        {item.frontImage && (
          <div className="mb-6">
            <div className="relative w-full max-w-md">
              <img
                src={item.frontImage}
                alt={item.name}
                className="w-full h-auto rounded-lg shadow-lg"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Basic Information */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('basicInformation') || 'Basic Information'}
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  {t('name')}:
                </span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {item.name}
                </span>
              </div>
              {item.barcode && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    {t('barcode')}:
                  </span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {item.barcode}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  {t('createdDate') || 'Created Date'}:
                </span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {formatDate(item.createdAt)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  {t('lastUpdated') || 'Last Updated'}:
                </span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {formatDate(item.updatedAt)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  {t('unit') || 'Unit'}:
                </span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {item.baseUom?.name || item.baseUom?.abbreviation || '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  {t('salePrice') || 'Sale Price'}:
                </span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {formatCurrency(Number(item.salePrice || 0))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  {t('trackStock') || 'Track Stock'}:
                </span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {item.isTrackable ? t('yes') : t('no')}
                </span>
              </div>
            </div>
          </div>

          {/* Stock Information */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('stockInformation') || 'Stock Information'}
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  {t('currentStock') || 'Current Stock'}:
                </span>
                <span className="text-gray-900 dark:text-white font-medium text-lg">
                  {Number(item.currentStock || 0).toLocaleString()}{' '}
                  {item.baseUom?.abbreviation || item.baseUom?.name || ''}
                </span>
              </div>
              {item.isTrackable && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      {t('minimumStock')}:
                    </span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      {Number(item.minimumStock || 0).toLocaleString()}{' '}
                      {item.baseUom?.abbreviation || item.baseUom?.name || ''}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      {t('maximumStock')}:
                    </span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      {Number(item.maximumStock || 0).toLocaleString()}{' '}
                      {item.baseUom?.abbreviation || item.baseUom?.name || ''}
                    </span>
                  </div>
                </>
              )}
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div
                  className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                    Number(item.currentStock || 0) <= Number(item.minimumStock || 0)
                      ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300'
                      : 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                  }`}
                >
                  {Number(item.currentStock || 0) <= Number(item.minimumStock || 0)
                    ? t('lowStock')
                    : t('inStock')}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sales Performance */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('salesPerformance') || 'Sales Performance'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {t('totalSales') || 'Total Sales'}
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {formatCurrency(Number(sales?.totalAmount || 0))}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {Number(sales?.totalQuantity || 0).toLocaleString()}{' '}
                {item.baseUom?.abbreviation || item.baseUom?.name || 'units'}
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {t('totalProfit') || 'Total Profit'}
              </div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                {formatCurrency(Number(sales?.totalProfit || 0))}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {Number(sales?.profitMargin || 0).toFixed(2)}% {t('margin') || 'margin'}
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {t('totalOrders') || 'Total Orders'}
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {sales?.orderCount || 0}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t('allTime') || 'All time'}
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {t('last30Days') || 'Last 30 Days'}
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {formatCurrency(Number(sales?.recent30Days?.amount || 0))}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {Number(sales?.recent30Days?.quantity || 0).toLocaleString()}{' '}
                {item.baseUom?.abbreviation || item.baseUom?.name || 'units'}
              </div>
            </div>
          </div>
        </div>

        {/* Stock by Branch */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('stockByBranch') || 'Stock by Branch'}
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('branch') || 'Branch'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('currentStock') || 'Current Stock'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('minimumStock') || 'Minimum Stock'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('salePrice') || 'Sale Price'}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {branchStocks && branchStocks.length > 0 ? (
                  branchStocks.map((branch: any) => (
                    <tr key={branch.branchId}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {branch.branchName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {Number(branch.stock || 0).toLocaleString()}{' '}
                        {item.baseUom?.abbreviation || item.baseUom?.name || ''}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {branch.minimumStock !== null
                          ? `${Number(branch.minimumStock || 0).toLocaleString()} ${item.baseUom?.abbreviation || item.baseUom?.name || ''}`
                          : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatCurrency(Number(branch.salePrice || 0))}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400"
                    >
                      {t('noBranches') || 'No branches found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sales by Branch */}
        {salesByBranch && salesByBranch.length > 0 && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('salesByBranch') || 'Sales by Branch'}
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t('branch') || 'Branch'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t('quantity') || 'Quantity'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t('salesAmount') || 'Sales Amount'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t('profit') || 'Profit'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t('orders') || 'Orders'}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {salesByBranch.map((branch: any) => (
                    <tr key={branch.branchId}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {branch.branchName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {Number(branch.quantity || 0).toLocaleString()}{' '}
                        {item.baseUom?.abbreviation || item.baseUom?.name || ''}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatCurrency(Number(branch.salesAmount || 0))}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400 font-medium">
                        {formatCurrency(Number(branch.profit || 0))}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {branch.orderCount || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
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
