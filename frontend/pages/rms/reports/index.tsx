import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import PageHeader from '@/components/ui/PageHeader';
import { formatMoney, useCurrency } from '@/lib/format';

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

/** Share-of-total inline bar. Text wears gray tokens; the bar carries magnitude. */
const SHARE_BAR_COLOR = '#6366f1';

const thBase =
  'py-2.5 px-4 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400';
const tdBase = 'py-3 px-4 text-sm';

export default function ReportsPage() {
  const { t } = useTranslation('common');
  const currency = useCurrency();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  // Fallback to English where a translation key is missing.
  const tt = (key: string, fallback: string) => (t(key) === key ? fallback : t(key));

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await api.get<{ success: boolean; data: AnalyticsData }>(
          `/rms/reports/analytics?period=${period}`
        );
        if (!cancelled && response.success) {
          setAnalytics(response.data);
        }
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [period]);

  const formatNumber = (num: number, decimals: number = 2) => {
    return parseFloat(num.toFixed(decimals)).toString().replace(/\.?0+$/, '');
  };

  const formatCurrency = (amount: number) => formatMoney(amount, currency);

  const periodLabel =
    period === 'today' ? t('today') : period === 'week' ? t('thisWeek') : t('thisMonth');

  const productTotal = (analytics?.topProducts || []).reduce((sum, p) => sum + p.revenue, 0);
  const branchTotal = (analytics?.topBranches || []).reduce((sum, b) => sum + b.revenue, 0);

  const shareCell = (value: number, total: number) => {
    const pct = total > 0 ? (value / total) * 100 : 0;
    return (
      <div className="flex items-center justify-end gap-2">
        <div className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.min(100, pct)}%`, backgroundColor: SHARE_BAR_COLOR }}
          />
        </div>
        <span className="w-10 text-right tabular-nums text-gray-600 dark:text-gray-400">
          {pct.toFixed(0)}%
        </span>
      </div>
    );
  };

  const emptyState = (message: string) => (
    <p className="px-4 py-10 text-center text-[13px] text-gray-500 dark:text-gray-400">{message}</p>
  );

  const tableShell = (title: string, meta: string, children: React.ReactNode) => (
    <section className="overflow-hidden rounded-xl bg-white dark:bg-gray-900 ring-1 ring-gray-200 dark:ring-gray-800">
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
        <span className="text-xs text-gray-500 dark:text-gray-400">{meta}</span>
      </div>
      {children}
    </section>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  return (
    <PermissionGuard permission="reports.view">
      <div className="space-y-5">
        <PageHeader
          title={tt('analytics', 'Analytics')}
          subtitle={tt('analyticsSubtitle', "What's driving your numbers")}
          breadcrumbs={[{ label: tt('restaurant', 'Restaurant') }, { label: tt('analytics', 'Analytics') }]}
          actions={
            /* Fixed-width wrapper: a global rule makes selects 100% wide */
            <div className="w-40 shrink-0">
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="h-9 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:border-transparent"
              >
                <option value="today">{t('today')}</option>
                <option value="week">{t('thisWeek')}</option>
                <option value="month">{t('thisMonth')}</option>
              </select>
            </div>
          }
        />

        {/* Slim summary strip — compact drivers, not KPI tiles */}
        <div className="grid grid-cols-2 divide-y divide-gray-100 dark:divide-gray-800 sm:divide-y-0 sm:divide-x rounded-xl bg-white dark:bg-gray-900 ring-1 ring-gray-200 dark:ring-gray-800 sm:grid-cols-4">
          <div className="px-4 py-3">
            <p className="text-2xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {tt('topItem', 'Top item')} · {periodLabel}
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
              {tt('topBranch', 'Top branch')} · {t('allTime')}
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
              {analytics?.bestBranch?.name || '—'}
            </p>
            <p className="text-xs tabular-nums text-gray-500 dark:text-gray-400">
              {analytics?.bestBranch ? formatCurrency(analytics.bestBranch.revenue) : '—'}
            </p>
          </div>
          <div className="px-4 py-3">
            <p className="text-2xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {t('lowStock')}
            </p>
            <p
              className={`mt-1 text-sm font-semibold tabular-nums ${
                (analytics?.lowStockCount || 0) > 0
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-gray-900 dark:text-gray-100'
              }`}
            >
              {analytics?.lowStockCount || 0}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{tt('items', 'items')}</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-2xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {t('overStock')}
            </p>
            <p
              className={`mt-1 text-sm font-semibold tabular-nums ${
                (analytics?.overStockCount || 0) > 0
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-gray-900 dark:text-gray-100'
              }`}
            >
              {analytics?.overStockCount || 0}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{tt('items', 'items')}</p>
          </div>
        </div>

        {/* Breakdown tables — the core of the page */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {tableShell(
            tt('revenueByItem', 'Revenue by item'),
            `${tt('topFive', 'Top 5')} · ${periodLabel}`,
            analytics && analytics.topProducts.length > 0 ? (
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className={`${thBase} text-left`}>{t('product')}</th>
                    <th className={`${thBase} text-right`}>{t('quantity')}</th>
                    <th className={`${thBase} text-right`}>{t('revenue')}</th>
                    <th className={`${thBase} text-right`}>{tt('share', 'Share')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {analytics.topProducts.map((product) => (
                    <tr
                      key={product.id}
                      className="transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className={`${tdBase} text-gray-900 dark:text-gray-100`}>{product.name}</td>
                      <td className={`${tdBase} text-right tabular-nums text-gray-600 dark:text-gray-400`}>
                        {formatNumber(product.quantitySold, 6)} {product.unit}
                      </td>
                      <td className={`${tdBase} text-right font-medium tabular-nums text-gray-900 dark:text-gray-100`}>
                        {formatCurrency(product.revenue)}
                      </td>
                      <td className={`${tdBase} text-right`}>{shareCell(product.revenue, productTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              emptyState(t('noDataYet'))
            )
          )}

          {tableShell(
            tt('revenueByBranch', 'Revenue by branch'),
            `${tt('topFive', 'Top 5')} · ${t('allTime')}`,
            analytics && analytics.topBranches.length > 0 ? (
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className={`${thBase} text-left`}>{t('branch')}</th>
                    <th className={`${thBase} text-right`}>{t('orders')}</th>
                    <th className={`${thBase} text-right`}>{t('revenue')}</th>
                    <th className={`${thBase} text-right`}>{tt('share', 'Share')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {analytics.topBranches.map((branch) => (
                    <tr
                      key={branch.id}
                      className="transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className={`${tdBase} text-gray-900 dark:text-gray-100`}>{branch.name}</td>
                      <td className={`${tdBase} text-right tabular-nums text-gray-600 dark:text-gray-400`}>
                        {branch.ordersCount}
                      </td>
                      <td className={`${tdBase} text-right font-medium tabular-nums text-gray-900 dark:text-gray-100`}>
                        {formatCurrency(branch.revenue)}
                      </td>
                      <td className={`${tdBase} text-right`}>{shareCell(branch.revenue, branchTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              emptyState(t('noDataYet'))
            )
          )}
        </div>

        {/* Stock outliers — what needs attention */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {tableShell(
            t('lowStockItems'),
            `${analytics?.lowStockCount || 0} ${tt('items', 'items')}`,
            analytics && analytics.lowStockItems.length > 0 ? (
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className={`${thBase} text-left`}>{t('item')}</th>
                    <th className={`${thBase} text-left`}>{t('branch')}</th>
                    <th className={`${thBase} text-right`}>{t('currentStock')}</th>
                    <th className={`${thBase} text-right`}>{t('minimumStock')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {analytics.lowStockItems.map((item, index) => (
                    <tr
                      key={`${item.id}-${item.branchId || index}`}
                      className="transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className={`${tdBase} text-gray-900 dark:text-gray-100`}>{item.name}</td>
                      <td className={`${tdBase} text-gray-600 dark:text-gray-400`}>{item.branchName || '—'}</td>
                      <td className={`${tdBase} text-right font-medium tabular-nums text-amber-600 dark:text-amber-400`}>
                        {formatNumber(item.currentStock, 6)} {item.unit}
                      </td>
                      <td className={`${tdBase} text-right tabular-nums text-gray-600 dark:text-gray-400`}>
                        {formatNumber(item.minimumStock, 6)} {item.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              emptyState(t('noLowStockItems'))
            )
          )}

          {tableShell(
            t('overStockItems'),
            `${analytics?.overStockCount || 0} ${tt('items', 'items')}`,
            analytics && analytics.overStockItems.length > 0 ? (
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className={`${thBase} text-left`}>{t('item')}</th>
                    <th className={`${thBase} text-right`}>{t('currentStock')}</th>
                    <th className={`${thBase} text-right`}>{t('maximumStock')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {analytics.overStockItems.map((item) => (
                    <tr
                      key={item.id}
                      className="transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className={`${tdBase} text-gray-900 dark:text-gray-100`}>{item.name}</td>
                      <td className={`${tdBase} text-right font-medium tabular-nums text-amber-600 dark:text-amber-400`}>
                        {formatNumber(item.currentStock, 6)} {item.unit}
                      </td>
                      <td className={`${tdBase} text-right tabular-nums text-gray-600 dark:text-gray-400`}>
                        {formatNumber(item.maximumStock, 6)} {item.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              emptyState(t('noOverStockItems'))
            )
          )}
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
