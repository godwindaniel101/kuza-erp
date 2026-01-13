import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import Card from '@/components/Card';

interface AnalyticsData {
  bestBranch: {
    id: string;
    name: string;
    revenue: number;
    ordersCount: number;
  } | null;
  topBranches: Array<{
    id: string;
    name: string;
    revenue: number;
    ordersCount: number;
  }>;
  bestProduct: {
    id: string;
    name: string;
    unit: string;
    quantitySold: number;
    revenue: number;
  } | null;
  topProducts: Array<{
    id: string;
    name: string;
    unit: string;
    quantitySold: number;
    revenue: number;
  }>;
  lowStockItems: Array<{
    id: string;
    name: string;
    currentStock: number;
    minimumStock: number;
    unit: string;
  }>;
  overStockItems: Array<{
    id: string;
    name: string;
    currentStock: number;
    maximumStock: number;
    unit: string;
  }>;
  lowStockCount: number;
  overStockCount: number;
}

export default function ReportsPage() {
  const { t } = useTranslation('common');
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const response = await api.get<{ success: boolean; data: AnalyticsData }>('/rms/reports/analytics');
      if (response.success) {
        setAnalytics(response.data);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number, decimals: number = 2) => {
    return parseFloat(num.toFixed(decimals)).toString().replace(/\.?0+$/, '');
  };

  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <PermissionGuard permission="reports.view">
      <div className="bg-white dark:bg-gray-900">
        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('bestPerformingBranch')}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2">
                  {analytics?.bestBranch?.name || '-'}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <i className="bx bx-git-branch text-2xl text-red-600 dark:text-red-400"></i>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('bestPerformingProduct')}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2">
                  {analytics?.bestProduct?.name || '-'}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <i className="bx bx-package text-2xl text-green-600 dark:text-green-400"></i>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('lowStock')}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2">
                  {analytics?.lowStockCount || 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <i className="bx bx-error-circle text-2xl text-red-600 dark:text-red-400"></i>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('overStock')}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2">
                  {analytics?.overStockCount || 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <i className="bx bx-layer text-2xl text-yellow-600 dark:text-yellow-400"></i>
              </div>
            </div>
          </Card>
        </div>

        {/* Top Branches and Top Products */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Top Branches */}
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('topBranches')}
            </h2>
            {analytics && analytics.topBranches.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        {t('branch')}
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        {t('orders')}
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        {t('revenue')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {analytics.topBranches.map((branch) => (
                      <tr key={branch.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{branch.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 text-right">
                          {branch.ordersCount}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 text-right">
                          {formatCurrency(branch.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">{t('noDataYet')}</p>
              </div>
            )}
          </Card>

          {/* Top Products */}
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('topProducts')}
            </h2>
            {analytics && analytics.topProducts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        {t('product')}
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        {t('quantity')}
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        {t('revenue')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {analytics.topProducts.map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{product.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 text-right">
                          {formatNumber(product.quantitySold, 6)} {product.unit}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 text-right">
                          {formatCurrency(product.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">{t('noDataYet')}</p>
              </div>
            )}
          </Card>
        </div>

        {/* Low Stock and Over Stock Items */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Low Stock Items */}
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('lowStockItems')}
            </h2>
            {analytics && analytics.lowStockItems.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        {t('item')}
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        {t('currentStock')}
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        {t('minimumStock')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {analytics.lowStockItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{item.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 text-right">
                          {formatNumber(item.currentStock, 6)} {item.unit}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 text-right">
                          {formatNumber(item.minimumStock, 6)} {item.unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">{t('noLowStockItems')}</p>
              </div>
            )}
          </Card>

          {/* Over Stock Items */}
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('overStockItems')}
            </h2>
            {analytics && analytics.overStockItems.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        {t('item')}
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        {t('currentStock')}
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        {t('maximumStock')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {analytics.overStockItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{item.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 text-right">
                          {formatNumber(item.currentStock, 6)} {item.unit}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 text-right">
                          {formatNumber(item.maximumStock, 6)} {item.unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">{t('noOverStockItems')}</p>
              </div>
            )}
          </Card>
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

