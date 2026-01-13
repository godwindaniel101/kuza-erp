import { useState, useEffect, useRef } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import Link from 'next/link';
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

export default function Dashboard() {
  const { t } = useTranslation('common');
  const [stats, setStats] = useState({
    todaySales: 0,
    activeOrders: 0,
    lowStockCount: 0,
    occupancyRate: 0,
  });
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const hasLoadedRef = useRef(false);
  const isLoadingRef = useRef(false);

  useEffect(() => {
    // Only load data once, prevent multiple simultaneous loads
    if (!hasLoadedRef.current && !isLoadingRef.current) {
      hasLoadedRef.current = true;
      isLoadingRef.current = true;
      loadDashboardData().finally(() => {
        isLoadingRef.current = false;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load dashboard stats, analytics, and recent orders in parallel
      const [statsResponse, analyticsResponse, ordersResponse] = await Promise.all([
        api.get<{ success: boolean; data: any }>('/dashboard/stats').catch(() => ({ success: false, data: null })),
        api.get<{ success: boolean; data: AnalyticsData }>('/rms/reports/analytics').catch(() => ({ success: false, data: null })),
        api.get<{ success: boolean; data: any[] }>('/rms/orders?limit=10').catch(() => ({ success: false, data: [] })),
      ]);

      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data);
      }

      if (analyticsResponse.success && analyticsResponse.data) {
        setAnalytics(analyticsResponse.data);
      }

      if (ordersResponse.success && ordersResponse.data) {
        setRecentOrders(ordersResponse.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number | string | null | undefined, decimals: number = 2) => {
    if (num === null || num === undefined || num === '') return '0';
    const numValue = typeof num === 'string' ? parseFloat(num) : num;
    if (isNaN(numValue)) return '0';
    return parseFloat(numValue.toFixed(decimals)).toString().replace(/\.?0+$/, '');
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
    <PermissionGuard permission="dashboard.view">
      <div className="bg-white dark:bg-gray-900">
        {/* Statistics Cards - Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('todaysSales')}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2">
                  {formatCurrency(stats.todaySales)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <i className="bx bx-money text-2xl text-green-600 dark:text-green-400"></i>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('activeOrders')}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2">
                  {stats.activeOrders}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <i className="bx bx-receipt text-2xl text-blue-600 dark:text-blue-400"></i>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('lowStock')}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2">
                  {analytics?.lowStockCount || stats.lowStockCount || 0}
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
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('tableOccupancy')}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2">
                  {stats.occupancyRate}%
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <i className="bx bx-table text-2xl text-purple-600 dark:text-purple-400"></i>
              </div>
            </div>
          </Card>
        </div>

        {/* Top Branches and Top Products */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Top Branches */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {t('topBranches')}
              </h2>
              <Link
                href="/rms/reports"
                className="text-sm text-red-600 dark:text-red-400 hover:underline"
              >
                {t('viewAll')}
              </Link>
            </div>
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
                    {analytics.topBranches.slice(0, 5).map((branch) => (
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {t('topProducts')}
              </h2>
              <Link
                href="/rms/reports"
                className="text-sm text-red-600 dark:text-red-400 hover:underline"
              >
                {t('viewAll')}
              </Link>
            </div>
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
                    {analytics.topProducts.slice(0, 5).map((product) => (
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

        {/* Low Stock Items and Recent Orders */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Low Stock Items */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {t('lowStockItems')}
              </h2>
              <Link
                href="/rms/reports"
                className="text-sm text-red-600 dark:text-red-400 hover:underline"
              >
                {t('viewAll')}
              </Link>
            </div>
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
                    {analytics.lowStockItems.slice(0, 5).map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{item.name || '-'}</td>
                        <td className="px-4 py-3 text-sm text-red-600 dark:text-red-400 text-right font-medium">
                          {formatNumber(item.currentStock, 6)} {item.unit || ''}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 text-right">
                          {formatNumber(item.minimumStock, 6)} {item.unit || ''}
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

          {/* Recent Orders */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('recentOrders')}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('latestOrders')}</p>
              </div>
              <Link
                href="/rms/orders"
                className="text-sm text-red-600 dark:text-red-400 hover:underline"
              >
                {t('viewAll')}
              </Link>
            </div>
            {recentOrders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        {t('orderNumber')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        {t('branch')}
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        {t('status')}
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        {t('total')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {recentOrders.slice(0, 5).map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3">
                          <Link href={`/rms/orders/${order.id}`} className="text-sm text-red-600 dark:text-red-400 hover:underline font-medium">
                            {order.orderNumber || order.id}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{order.branch?.name || '—'}</td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              order.status === 'completed'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                                : order.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200'
                                : order.status === 'preparing'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'
                                : order.status === 'ready'
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
                            }`}
                          >
                            {order.status ? order.status.charAt(0).toUpperCase() + order.status.slice(1) : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-900 dark:text-gray-100 font-semibold">
                          {formatCurrency(order.total ? parseFloat(order.total) : 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <i className="bx bx-receipt text-6xl text-gray-300 dark:text-gray-600 mb-4"></i>
                <p className="text-gray-500 dark:text-gray-400 mb-6">{t('noOrdersYet')}</p>
                <Link
                  href="/rms/orders/create"
                  className="inline-flex items-center px-6 py-2 bg-red-600 dark:bg-red-700 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition"
                >
                  <i className="bx bx-plus mr-2"></i>
                  {t('newOrder')}
                </Link>
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
