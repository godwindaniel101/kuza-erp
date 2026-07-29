import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import Link from 'next/link';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';

type Tab = 'general' | 'inflow' | 'sales' | 'branch';

const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';

/**
 * Resolve an item image value to a browser-loadable URL.
 * - base64 data URIs, blob URLs and absolute http(s) URLs are used as-is
 *   (single-item create stores a base64 data URI, so those already work).
 * - Backend-relative paths such as "/uploads/inventory/x.jpg" (produced by the
 *   bulk upload image pipeline) are prefixed with the API origin so the browser
 *   fetches them from the backend instead of the frontend origin.
 */
function resolveImageUrl(src?: string): string {
  if (!src) return '';
  const trimmed = src.trim();
  if (!trimmed) return '';
  if (/^(data:|blob:|https?:\/\/)/i.test(trimmed)) return trimmed;
  return `${API_ORIGIN}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
}

export default function InventoryItemViewPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const base = router.pathname.startsWith('/rms/items') ? '/rms/items' : '/ims/inventory';
  const { id } = router.query;
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [itemStats, setItemStats] = useState<any>(null);
  const [currency, setCurrency] = useState<string>('NGN');

  // Tabs definition
  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'general', label: t('generalInformation'), icon: 'bx-info-circle' },
    { id: 'inflow', label: t('inflowHistory'), icon: 'bx-import' },
    { id: 'sales', label: t('salesHistory'), icon: 'bx-line-chart' },
    { id: 'branch', label: t('branchItemInventory'), icon: 'bx-store' },
  ];

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
      month: 'short',
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

  if (!itemStats || !itemStats.item) {
    return (
      <div className="py-8">
        <div className="text-center py-8">
          <p className="text-red-600 dark:text-red-400">
            {t('itemNotFound') || 'Item not found'}
          </p>
          <Link
            href={base}
            className="text-accent hover:underline mt-4 inline-block"
          >
            {t('backToInventory') || 'Back to Inventory'}
          </Link>
        </div>
      </div>
    );
  }

  const {
    item,
    branchStocks,
    sales,
    salesByBranch,
    inflowHistory = [],
    salesHistory = [],
  } = itemStats;

  return (
    <PermissionGuard permission="inventory.view">
      <div className="w-full max-w-5xl space-y-6 kz-stagger">
        <PageHeader
          title={item.name}
          subtitle={t('inventory.viewSubtitle', 'Stock, batches and history for this item')}
          breadcrumbs={[
            { label: t('inventory') || 'Inventory', href: base },
            { label: item.name },
          ]}
          actions={
            <PermissionGuard permission="inventory.edit">
              <Button href={`${base}/edit/${id}`} variant="primary" size="sm">
                <Icon name="pencil-square" size={16} />
                <span>{t('edit')}</span>
              </Button>
            </PermissionGuard>
          }
        />

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-accent text-accent'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <i className={`bx ${tab.icon}`}></i>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 p-6">
          {activeTab === 'general' && (
            <GeneralInformationTab item={item} formatCurrency={formatCurrency} formatDate={formatDate} t={t} />
          )}
          {activeTab === 'inflow' && (
            <InflowHistoryTab
              inflowHistory={inflowHistory}
              loading={false}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
              t={t}
            />
          )}
          {activeTab === 'sales' && (
            <SalesHistoryTab
              salesHistory={salesHistory}
              loading={false}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
              t={t}
            />
          )}
          {activeTab === 'branch' && (
            <BranchInventoryTab 
              branchStocks={branchStocks}
              salesByBranch={salesByBranch}
              item={item}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
              t={t}
            />
          )}
        </div>
      </div>
    </PermissionGuard>
  );
}

// Tab Components
const GeneralInformationTab = ({ item, formatCurrency, formatDate, t }: any) => {
  const frontImageUrl = resolveImageUrl(item.frontImage) || '/img/item-placeholder.svg';
  return (
  <div className="w-full max-w-5xl space-y-6">
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Item Image */}
      <div className="lg:col-span-1">
        <h3 className="text-md font-medium text-gray-900 dark:text-white mb-3">
          {t('itemImage')}
        </h3>
        {/* Fixed square frame so every item image is the same size regardless
            of the source photo's dimensions; object-cover crops to fill. */}
        <div className="relative aspect-square w-full max-w-sm overflow-hidden rounded-lg bg-gray-50 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-800">
          <img
            src={frontImageUrl}
            alt={item.name}
            onError={(e) => {
              const img = e.currentTarget as HTMLImageElement;
              if (!img.src.endsWith('/img/item-placeholder.svg')) img.src = '/img/item-placeholder.svg';
            }}
            className="h-full w-full object-cover"
          />
        </div>
      </div>
      
      {/* Basic Information */}
      <div className="lg:col-span-1">
        <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {t('basicInformation')}
        </h3>
        <dl className="divide-y divide-gray-100 rounded-xl bg-white px-4 ring-1 ring-gray-200 dark:divide-gray-800 dark:bg-gray-900 dark:ring-gray-800">
          <div className="flex items-center justify-between gap-3 py-2.5">
            <dt className="text-sm text-gray-500 dark:text-gray-400">{t('name')}</dt>
            <dd className="text-right text-sm font-medium text-gray-900 dark:text-gray-100">{item.name}</dd>
          </div>
          {item.barcode && (
            <div className="flex items-center justify-between gap-3 py-2.5">
              <dt className="text-sm text-gray-500 dark:text-gray-400">{t('barcode')}</dt>
              <dd className="text-right font-mono text-sm text-gray-900 dark:text-gray-100">{item.barcode}</dd>
            </div>
          )}
          <div className="flex items-center justify-between gap-3 py-2.5">
            <dt className="text-sm text-gray-500 dark:text-gray-400">{t('category')}</dt>
            <dd className="text-right text-sm font-medium text-gray-900 dark:text-gray-100">{item.category || '—'}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-2.5">
            <dt className="text-sm text-gray-500 dark:text-gray-400">{t('subcategory')}</dt>
            <dd className="text-right text-sm font-medium text-gray-900 dark:text-gray-100">{item.subcategory || '—'}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-2.5">
            <dt className="text-sm text-gray-500 dark:text-gray-400">{t('unit')}</dt>
            <dd className="text-right text-sm font-medium text-gray-900 dark:text-gray-100">{item.baseUom?.name || item.baseUom?.abbreviation || '—'}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-2.5">
            <dt className="text-sm text-gray-500 dark:text-gray-400">{t('salePrice')}</dt>
            <dd className="text-right text-sm font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(Number(item.salePrice || 0))}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-2.5">
            <dt className="text-sm text-gray-500 dark:text-gray-400">{t('trackStock')}</dt>
            <dd className="text-right">
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${item.isTrackable ? 'bg-accent-soft text-accent' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>{item.isTrackable ? t('yes') : t('no')}</span>
            </dd>
          </div>
          {item.description && (
            <div className="py-2.5">
              <dt className="mb-1 text-sm text-gray-500 dark:text-gray-400">{t('description')}</dt>
              <dd className="text-sm text-gray-700 dark:text-gray-300">{item.description}</dd>
            </div>
          )}
        </dl>
      </div>
      
      {/* Stock Information */}
      <div className="lg:col-span-1">
        <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {t('stockInformation')}
        </h3>
        <div className="rounded-xl bg-white ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
          <div className="flex items-end justify-between gap-3 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('currentStock')}</p>
              <p className="mt-0.5 font-display text-[1.35rem] font-semibold tracking-tight tabular-nums text-gray-900 dark:text-gray-100">
                {Number(item.currentStock || 0).toLocaleString()}
                <span className="ml-1 text-sm font-normal text-gray-400">
                  {item.baseUom?.abbreviation || item.baseUom?.name || ''}
                </span>
              </p>
            </div>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                Number(item.currentStock || 0) <= Number(item.minimumStock || 0)
                  ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300'
                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
              }`}
            >
              {Number(item.currentStock || 0) <= Number(item.minimumStock || 0) ? t('lowStock') : t('inStock')}
            </span>
          </div>
          <dl className="divide-y divide-gray-100 px-4 dark:divide-gray-800">
            {item.isTrackable && (
              <>
                <div className="flex items-center justify-between gap-3 py-2.5">
                  <dt className="text-sm text-gray-500 dark:text-gray-400">{t('minimumStock')}</dt>
                  <dd className="text-right text-sm font-medium tabular-nums text-gray-900 dark:text-gray-100">
                    {Number(item.minimumStock || 0).toLocaleString()} {item.baseUom?.abbreviation || item.baseUom?.name || ''}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 py-2.5">
                  <dt className="text-sm text-gray-500 dark:text-gray-400">{t('maximumStock')}</dt>
                  <dd className="text-right text-sm font-medium tabular-nums text-gray-900 dark:text-gray-100">
                    {Number(item.maximumStock || 0).toLocaleString()} {item.baseUom?.abbreviation || item.baseUom?.name || ''}
                  </dd>
                </div>
              </>
            )}
            <div className="flex items-center justify-between gap-3 py-2.5">
              <dt className="text-sm text-gray-500 dark:text-gray-400">{t('createdDate')}</dt>
              <dd className="text-right text-sm font-medium text-gray-900 dark:text-gray-100">{formatDate(item.createdAt)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-2.5">
              <dt className="text-sm text-gray-500 dark:text-gray-400">{t('lastUpdated')}</dt>
              <dd className="text-right text-sm font-medium text-gray-900 dark:text-gray-100">{formatDate(item.updatedAt)}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  </div>
  );
};

const InflowHistoryTab = ({ inflowHistory, loading, formatCurrency, formatDate, t }: any) => (
  <div className="w-full max-w-5xl space-y-6">
    {loading ? (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
      </div>
    ) : inflowHistory.length === 0 ? (
      <div className="text-center py-8">
        <i className="bx bx-import text-4xl text-gray-400 dark:text-gray-500 mb-4"></i>
        <p className="text-gray-500 dark:text-gray-400">
          {t('noInflowHistory')}
        </p>
      </div>
    ) : (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                {t('inflowDate')}
              </th>
              <th className="px-6 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                {t('supplier')}
              </th>
              <th className="px-6 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                {t('quantityReceived')}
              </th>
              <th className="px-6 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                {t('costPerUnit')}
              </th>
              <th className="px-6 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                {t('totalCost')}
              </th>
              <th className="px-6 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                {t('batchNumber')}
              </th>
              <th className="px-6 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                {t('expiryDate')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
            {inflowHistory.map((inflow: any, index: number) => (
              <tr key={index}>
                <td className="px-6 py-3 whitespace-nowrap text-[13px] text-gray-900 dark:text-white">
                  {formatDate(inflow.receivedAt)}
                </td>
                <td className="px-6 py-3 whitespace-nowrap text-[13px] text-gray-500 dark:text-gray-400">
                  {inflow.supplier?.name || '-'}
                </td>
                <td className="px-6 py-3 whitespace-nowrap text-[13px] text-gray-500 dark:text-gray-400">
                  {inflow.quantity} {inflow.uom?.abbreviation || inflow.uom?.name || ''}
                </td>
                <td className="px-6 py-3 whitespace-nowrap text-[13px] text-gray-500 dark:text-gray-400">
                  {formatCurrency(Number(inflow.costPerUnit || 0))}
                </td>
                <td className="px-6 py-3 whitespace-nowrap text-[13px] text-gray-500 dark:text-gray-400">
                  {formatCurrency(Number(inflow.totalCost || 0))}
                </td>
                <td className="px-6 py-3 whitespace-nowrap text-[13px] text-gray-500 dark:text-gray-400">
                  {inflow.batchNumber || '-'}
                </td>
                <td className="px-6 py-3 whitespace-nowrap text-[13px] text-gray-500 dark:text-gray-400">
                  {inflow.expiryDate ? formatDate(inflow.expiryDate) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

const SalesHistoryTab = ({ salesHistory, loading, formatCurrency, formatDate, t }: any) => (
  <div className="w-full max-w-5xl space-y-6">
    {loading ? (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
      </div>
    ) : salesHistory.length === 0 ? (
      <div className="text-center py-8">
        <i className="bx bx-line-chart text-4xl text-gray-400 dark:text-gray-500 mb-4"></i>
        <p className="text-gray-500 dark:text-gray-400">
          {t('noSalesHistory')}
        </p>
      </div>
    ) : (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                {t('saleDate')}
              </th>
              <th className="px-6 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                {t('quantitySold')}
              </th>
              <th className="px-6 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                {t('soldAt')}
              </th>
              <th className="px-6 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                {t('totalAmount')}
              </th>
              <th className="px-6 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                {t('branch')}
              </th>
              <th className="px-6 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                {t('orderNumber')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
            {salesHistory.map((sale: any, index: number) => (
              <tr key={index}>
                <td className="px-6 py-3 whitespace-nowrap text-[13px] text-gray-900 dark:text-white">
                  {formatDate(sale.createdAt)}
                </td>
                <td className="px-6 py-3 whitespace-nowrap text-[13px] text-gray-500 dark:text-gray-400">
                  {sale.quantity} {sale.uom?.abbreviation || sale.uom?.name || ''}
                </td>
                <td className="px-6 py-3 whitespace-nowrap text-[13px] text-gray-500 dark:text-gray-400">
                  {formatCurrency(Number(sale.unitPrice || 0))}
                </td>
                <td className="px-6 py-3 whitespace-nowrap text-[13px] text-gray-500 dark:text-gray-400">
                  {formatCurrency(Number(sale.totalPrice ?? (Number(sale.quantity || 0) * Number(sale.unitPrice || 0))))}
                </td>
                <td className="px-6 py-3 whitespace-nowrap text-[13px] text-gray-500 dark:text-gray-400">
                  {sale.branch?.name || '-'}
                </td>
                <td className="px-6 py-3 whitespace-nowrap text-[13px] text-gray-500 dark:text-gray-400">
                  {sale.order?.orderNumber || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

const BranchInventoryTab = ({ branchStocks, salesByBranch, item, formatCurrency, formatDate, t }: any) => (
  <div className="w-full max-w-5xl space-y-6">
    {/* Branch Stock Distribution */}
    <div>
      {branchStocks && branchStocks.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                  {t('branch')}
                </th>
                <th className="px-6 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                  {t('currentStock')}
                </th>
                <th className="px-6 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                  {t('minimumStock')}
                </th>
                <th className="px-6 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                  {t('salePrice')}
                </th>
                <th className="px-6 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                  {t('inventory.expiringSoon', 'Expiring soon')}
                </th>
                <th className="px-6 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                  {t('status')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
              {branchStocks.map((branch: any) => {
                const currentStock = Number(branch.currentStock || 0);
                const isLowStock = currentStock <= Number(branch.minimumStock || 0);
                const expiringSoonCount = Number(branch.expiringSoonCount || 0);
                return (
                  <tr key={branch.branchId}>
                    <td className="px-6 py-3 whitespace-nowrap text-[13px] font-medium text-gray-900 dark:text-white">
                      {branch.branchName || t('unknownBranch') || 'Unknown Branch'}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-[13px] text-gray-500 dark:text-gray-400">
                      {currentStock.toLocaleString()}{' '}
                      {item.baseUom?.abbreviation || item.baseUom?.name || ''}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-[13px] text-gray-500 dark:text-gray-400">
                      {branch.minimumStock !== null
                        ? `${Number(branch.minimumStock || 0).toLocaleString()} ${item.baseUom?.abbreviation || item.baseUom?.name || ''}`
                        : '-'}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-[13px] text-gray-500 dark:text-gray-400">
                      {formatCurrency(Number(branch.salePrice || 0))}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-[13px]">
                      {expiringSoonCount > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                          <i className="bx bx-time-five"></i>
                          {t('inventory.expiringCount', '{{count}} expiring', { count: expiringSoonCount })}
                          {branch.nextExpiry
                            ? ` · ${t('inventory.soonest', 'soonest')} ${formatDate(branch.nextExpiry)}`
                            : ''}
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          isLowStock
                            ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300'
                            : 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                        }`}
                      >
                        {isLowStock ? t('lowStock') : t('inStock')}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8">
          <Icon name="building-storefront" size={36} className="text-gray-400 dark:text-gray-500 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            {t('noBranchData')}
          </p>
          <p className="text-xs text-gray-400 mt-2">{t('tipEnsureStatsEndpoint')} </p>
        </div>
      )}
    </div>

    {/* Sales by Branch */}
    {salesByBranch && salesByBranch.length > 0 && (
      <div>
        <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">
          {t('salesByBranch')}
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                  {t('branch')}
                </th>
                <th className="px-6 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                  {t('quantity')}
                </th>
                <th className="px-6 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                  {t('salesAmount')}
                </th>
                <th className="px-6 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                  {t('profit')}
                </th>
                <th className="px-6 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                  {t('orders')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
              {salesByBranch.map((branch: any) => (
                <tr key={branch.branchId}>
                  <td className="px-6 py-3 whitespace-nowrap text-[13px] font-medium text-gray-900 dark:text-white">
                    {branch.branchName}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-[13px] text-gray-500 dark:text-gray-400">
                    {Number(branch.totalQuantity || 0).toLocaleString()}{' '}
                    {item.baseUom?.abbreviation || item.baseUom?.name || ''}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-[13px] text-gray-500 dark:text-gray-400">
                    {formatCurrency(Number(branch.totalAmount || 0))}
                  </td>
                  <td className={`px-6 py-3 whitespace-nowrap text-[13px] font-medium ${Number(branch.totalProfit || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatCurrency(Number(branch.totalProfit || 0))}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-[13px] text-gray-500 dark:text-gray-400">
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
);

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale || 'en', ['common'])),
    },
  };
};
