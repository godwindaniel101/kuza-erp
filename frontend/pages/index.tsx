import { useState, useEffect, useRef } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import Link from 'next/link';
import PermissionGuard from '@/components/PermissionGuard';
import Card from '@/components/Card';
import StatCard from '@/components/ui/StatCard';
import StatusBadge, { StatusBadgeVariant } from '@/components/ui/StatusBadge';
import Button from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import { useTenantStore } from '@/store/globalStore';
import { term } from '@/lib/terminology';
import { RevenueAreaChart, WeeklyBarChart, AreaPoint } from '@/components/ui/charts';
import PageHeader from '@/components/ui/PageHeader';

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
    branchId?: string;
    branchName?: string;
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
  const { user } = useAuthStore();
  const { businessType, fetchTenantContext } = useTenantStore();
  const [period, setPeriod] = useState('today');
  const [revenueSeries, setRevenueSeries] = useState<AreaPoint[]>([]);
  const [outstandingInvoices, setOutstandingInvoices] = useState<number | null>(null);
  const [stats, setStats] = useState({
    todaySales: 0,
    periodSales: 0,
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
    if (user) fetchTenantContext();
  }, [user, fetchTenantContext]);

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

  // Reload data when period changes
  useEffect(() => {
    if (hasLoadedRef.current) {
      loadDashboardData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const loadDashboardData = async () => {
    try {
      // Load dashboard stats, analytics, and recent orders in parallel
      const [statsResponse, analyticsResponse, ordersResponse, seriesResponse, invoicesResponse] = await Promise.all([
        api.get<{ success: boolean; data: any }>(`/dashboard/stats?period=${period}`).catch(() => ({ success: false, data: null })),
        api.get<{ success: boolean; data: AnalyticsData }>(`/rms/reports/analytics?period=${period}`).catch(() => ({ success: false, data: null })),
        api.get<{ success: boolean; data: any[] }>('/rms/orders?limit=10').catch(() => ({ success: false, data: [] })),
        api.get<{ success: boolean; data: any[] }>('/rms/orders?limit=200').catch(() => ({ success: false, data: [] as any[] })),
        api
          .get<{ success: boolean; data: { summary?: { totalOutstanding: number } } }>('/invoices?page=1&limit=1')
          .catch(() => ({ success: false, data: null as any })),
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

      // 14-day revenue series bucketed from recent orders (renders flat when empty)
      const days: AreaPoint[] = [];
      const buckets = new Map<string, number>();
      for (let i = 13; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        buckets.set(key, 0);
        days.push({ label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), value: 0 });
      }
      if (seriesResponse.success && Array.isArray(seriesResponse.data)) {
        for (const order of seriesResponse.data) {
          const raw = order?.createdAt || order?.created_at;
          if (!raw) continue;
          const key = String(raw).slice(0, 10);
          if (buckets.has(key)) {
            buckets.set(key, (buckets.get(key) || 0) + (order.total ? parseFloat(order.total) : 0));
          }
        }
        let idx = 0;
        buckets.forEach((value) => {
          days[idx].value = value;
          idx += 1;
        });
      }
      setRevenueSeries(days);

      if (invoicesResponse.success && invoicesResponse.data?.summary) {
        setOutstandingInvoices(Number(invoicesResponse.data.summary.totalOutstanding ?? 0));
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
    const formatted = parseFloat(numValue.toFixed(decimals));
    // Handle zero case - don't remove it with regex
    if (formatted === 0) return '0';
    return formatted.toString().replace(/\.?0+$/, '');
  };

  const isRestaurant = businessType === 'restaurant' || businessType === null;

  const compactNumber = (v: number) =>
    Math.abs(v) >= 1_000_000
      ? `${(v / 1_000_000).toFixed(1)}M`
      : Math.abs(v) >= 1_000
      ? `${(v / 1_000).toFixed(Math.abs(v) >= 10_000 ? 0 : 1)}k`
      : `${Math.round(v)}`;

  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return t('goodMorning') !== 'goodMorning' ? t('goodMorning') : 'Good morning';
    if (h < 17) return t('goodAfternoon') !== 'goodAfternoon' ? t('goodAfternoon') : 'Good afternoon';
    return t('goodEvening') !== 'goodEvening' ? t('goodEvening') : 'Good evening';
  })();
  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const firstName = user?.name ? user.name.split(' ')[0] : '';

  const orderStatusVariant = (status?: string): StatusBadgeVariant => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'pending':
        return 'pending';
      case 'preparing':
      case 'ready':
        return 'info';
      default:
        return 'error';
    }
  };

  const thClass =
    'px-4 py-2.5 text-2xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400';

  // Period comparisons derived from the 14-day revenue series (no extra fetches)
  const todayRevenue = revenueSeries[13]?.value ?? 0;
  const yesterdayRevenue = revenueSeries[12]?.value ?? 0;
  const thisWeekRevenue = revenueSeries.slice(7).reduce((s, d) => s + d.value, 0);
  const lastWeekRevenue = revenueSeries.slice(0, 7).reduce((s, d) => s + d.value, 0);

  const DeltaPill = ({ current, previous }: { current: number; previous: number }) => {
    if (previous === 0 && current === 0) {
      return <span className="text-xs text-gray-400 dark:text-gray-500">—</span>;
    }
    const pct = previous === 0 ? 100 : ((current - previous) / previous) * 100;
    const up = pct >= 0;
    return (
      <span
        className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium ${
          up
            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
            : 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400'
        }`}
      >
        <i className={`bx ${up ? 'bx-up-arrow-alt' : 'bx-down-arrow-alt'}`} aria-hidden="true"></i>
        {Math.abs(pct).toFixed(0)}%
      </span>
    );
  };

  return (
    <PermissionGuard permission="dashboard.view">
      <div className="space-y-5">
        {/* Greeting + period filter */}
        <PageHeader
          title={<>{greeting}{firstName ? `, ${firstName}` : ''}</>}
          subtitle={`${todayLabel} · ${
            period === 'today'
              ? t('todayOverview')
              : period === 'week'
              ? t('thisWeekOverview')
              : t('thisMonthOverview')
          }`}
          breadcrumbs={[{ label: t('home') || 'Home' }]}
          actions={
            <div className="w-40 shrink-0">
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="h-9 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-[13px] text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:border-transparent"
              >
                <option value="today">{t('today')}</option>
                <option value="week">{t('thisWeek')}</option>
                <option value="month">{t('thisMonth')}</option>
              </select>
            </div>
          }
        />

        {/* KPI row — progressive disclosure by business type */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label={
              businessType === 'retail' && period === 'today'
                ? "Today's takings"
                : period === 'today'
                ? t('todaysSales')
                : period === 'week'
                ? t('thisWeekSales')
                : t('thisMonthSales')
            }
            value={formatCurrency(stats.periodSales || stats.todaySales)}
            icon="bx-money"
            tone="success"
            spark={revenueSeries.map((d) => d.value)}
          />
          {isRestaurant ? (
            <StatCard label={t('activeOrders')} value={stats.activeOrders} icon="bx-receipt" tone="info" />
          ) : (
            <StatCard
              label={businessType === 'services' ? 'Outstanding' : 'Outstanding invoices'}
              value={outstandingInvoices != null ? formatCurrency(outstandingInvoices) : '—'}
              icon="bx-file"
              tone="info"
            />
          )}
          {businessType !== 'services' && (
            <StatCard
              label={
                businessType === 'retail'
                  ? `${term(businessType, 'items')} low`
                  : t('lowStock')
              }
              value={analytics?.lowStockCount || stats.lowStockCount || 0}
              icon="bx-error-circle"
              tone="warning"
            />
          )}
          {isRestaurant && (
            <StatCard label={t('tableOccupancy')} value={`${stats.occupancyRate}%`} icon="bx-table" tone="default" />
          )}
        </div>

        {/* Compact comparison strip (Analytics-style drivers) */}
        <div className="grid grid-cols-2 divide-y divide-gray-100 dark:divide-gray-800 sm:divide-y-0 sm:divide-x rounded-xl bg-white dark:bg-gray-900 ring-1 ring-gray-200 dark:ring-gray-800 sm:grid-cols-4">
          <div className="px-4 py-3">
            <p className="text-2xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Today vs yesterday
            </p>
            <div className="mt-1 flex items-center gap-2">
              <p className="text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                {formatCurrency(todayRevenue)}
              </p>
              <DeltaPill current={todayRevenue} previous={yesterdayRevenue} />
            </div>
            <p className="text-xs tabular-nums text-gray-500 dark:text-gray-400">
              Yesterday {formatCurrency(yesterdayRevenue)}
            </p>
          </div>
          <div className="px-4 py-3">
            <p className="text-2xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              This week vs last
            </p>
            <div className="mt-1 flex items-center gap-2">
              <p className="text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                {formatCurrency(thisWeekRevenue)}
              </p>
              <DeltaPill current={thisWeekRevenue} previous={lastWeekRevenue} />
            </div>
            <p className="text-xs tabular-nums text-gray-500 dark:text-gray-400">
              Last week {formatCurrency(lastWeekRevenue)}
            </p>
          </div>
          <div className="px-4 py-3">
            <p className="text-2xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Top item
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
              {analytics?.bestProduct?.name || '—'}
            </p>
            <p className="text-xs tabular-nums text-gray-500 dark:text-gray-400">
              {analytics?.bestProduct ? formatCurrency(analytics.bestProduct.revenue) : '—'}
            </p>
          </div>
          <div className="px-4 py-3">
            <p className="text-2xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Top branch
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
              {analytics?.bestBranch?.name || '—'}
            </p>
            <p className="text-xs tabular-nums text-gray-500 dark:text-gray-400">
              {analytics?.bestBranch ? formatCurrency(analytics.bestBranch.revenue) : '—'}
            </p>
          </div>
        </div>

        {/* Primary revenue chart + stacked mini charts (reference layout) */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card title="Revenue" subtitle="Last 14 days" className="lg:col-span-2">
            <RevenueAreaChart data={revenueSeries} height={230} formatValue={(v) => `\u20a6${compactNumber(v)}`} />
          </Card>
          <div className="flex flex-col gap-4">
            <Card title="Sales trend" subtitle="Daily totals">
              <RevenueAreaChart
                data={revenueSeries}
                height={130}
                formatValue={(v) => `\u20a6${compactNumber(v)}`}
                emptyMessage={t('noDataYet')}
              />
            </Card>
            <Card title="This week" subtitle="Revenue by day">
              <WeeklyBarChart
                data={revenueSeries.slice(-7).map((d, i) => {
                  const day = new Date();
                  day.setDate(day.getDate() - (6 - i));
                  return { label: day.toLocaleDateString('en-US', { weekday: 'short' }), value: d.value };
                })}
                formatValue={(v) => `\u20a6${compactNumber(v)}`}
                emptyMessage={t('noDataYet')}
              />
            </Card>
          </div>
        </div>

        {/* Top Branches and Top Products */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card
            title={t('topBranches')}
            headerAction={
              <Link
                href="/rms/reports"
                className="text-[13px] font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors duration-150"
              >
                {t('viewAll')}
              </Link>
            }
            padding={false}
          >
            {analytics && analytics.topBranches.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <th className={`${thClass} text-left`}>{t('branch')}</th>
                      <th className={`${thClass} text-right`}>{t('orders')}</th>
                      <th className={`${thClass} text-right`}>{t('revenue')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {analytics.topBranches.slice(0, 5).map((branch) => (
                      <tr
                        key={branch.id}
                        className="transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      >
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{branch.name}</td>
                        <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-400">
                          {branch.ordersCount}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-gray-100">
                          {formatCurrency(branch.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">{t('noDataYet')}</p>
            )}
          </Card>

          <Card
            title={t('topProducts')}
            headerAction={
              <Link
                href="/rms/reports"
                className="text-[13px] font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors duration-150"
              >
                {t('viewAll')}
              </Link>
            }
            padding={false}
          >
            {analytics && analytics.topProducts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <th className={`${thClass} text-left`}>{t('product')}</th>
                      <th className={`${thClass} text-right`}>{t('quantity')}</th>
                      <th className={`${thClass} text-right`}>{t('revenue')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {analytics.topProducts.slice(0, 5).map((product) => (
                      <tr
                        key={product.id}
                        className="transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      >
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{product.name}</td>
                        <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-400">
                          {formatNumber(product.quantitySold, 6)} {product.unit}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-gray-100">
                          {formatCurrency(product.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">{t('noDataYet')}</p>
            )}
          </Card>
        </div>

        {/* Low Stock Items and Recent Orders */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card
            title={t('lowStockItems')}
            headerAction={
              <Link
                href="/rms/reports"
                className="text-[13px] font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors duration-150"
              >
                {t('viewAll')}
              </Link>
            }
            padding={false}
          >
            {analytics && analytics.lowStockItems.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <th className={`${thClass} text-left`}>{t('item')}</th>
                      <th className={`${thClass} text-left`}>{t('branch')}</th>
                      <th className={`${thClass} text-right`}>{t('currentStock')}</th>
                      <th className={`${thClass} text-right`}>{t('minimumStock')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {analytics.lowStockItems.slice(0, 5).map((item, index) => (
                      <tr
                        key={`${item.id}-${item.branchId || index}`}
                        className="transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      >
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{item.name || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.branchName || '—'}</td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-red-600 dark:text-red-400">
                          {formatNumber(item.currentStock, 6)} {item.unit || ''}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-400">
                          {formatNumber(item.minimumStock, 6)} {item.unit || ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">{t('noLowStockItems')}</p>
            )}
          </Card>

          <Card
            title={t('recentOrders')}
            subtitle={t('latestOrders')}
            headerAction={
              <Link
                href="/rms/orders"
                className="text-[13px] font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors duration-150"
              >
                {t('viewAll')}
              </Link>
            }
            padding={false}
          >
            {recentOrders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <th className={`${thClass} text-left`}>{t('orderNumber')}</th>
                      <th className={`${thClass} text-left`}>{t('branch')}</th>
                      <th className={`${thClass} text-center`}>{t('status')}</th>
                      <th className={`${thClass} text-right`}>{t('total')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {recentOrders.slice(0, 5).map((order) => (
                      <tr
                        key={order.id}
                        className="transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={`/rms/orders/${order.id}`}
                            className="text-sm font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors duration-150"
                          >
                            {order.orderNumber || order.id}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {order.branch?.name || '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <StatusBadge
                            size="sm"
                            variant={orderStatusVariant(order.status)}
                            label={order.status ? order.status.charAt(0).toUpperCase() + order.status.slice(1) : '—'}
                          />
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-gray-100">
                          {formatCurrency(order.total ? parseFloat(order.total) : 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-6 py-12 text-center">
                <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">{t('noOrdersYet')}</p>
                <Button href="/rms/orders/create">
                  <i className="bx bx-plus" aria-hidden="true"></i>
                  {t('newOrder')}
                </Button>
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
