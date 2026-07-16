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
  const { id } = router.query;
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [itemStats, setItemStats] = useState<any>(null);
  const [inflowHistory, setInflowHistory] = useState<any[]>([]);
  const [salesHistory, setSalesHistory] = useState<any[]>([]);
  const [currency, setCurrency] = useState<string>('NGN');
  const [loadingInflow, setLoadingInflow] = useState(false);
  const [loadingSales, setLoadingSales] = useState(false);

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

  // Load data when switching to specific tabs
  useEffect(() => {
    if (id && activeTab === 'inflow') {
      loadInflowHistory();
    }
    if (id && activeTab === 'sales' && salesHistory.length === 0) {
      loadSalesHistory();
    }
  }, [id, activeTab]);

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
      console.log('--- Item Stats API Response ---', response.data); // <-- ADDING LOG
      if (response.success && response.data) {
        setItemStats(response.data);
      }
    } catch (err: any) {
      console.error('Failed to load item stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadInflowHistory = async () => {
    setLoadingInflow(true);
    try {
      const response = await api.get<{ success: boolean; data: any[] }>(
        `/ims/inflows?itemId=${id}`
      );
      console.log('--- Inflow History API Response ---', response.data); // <-- ADDING LOG
      if (response.success) {
        const mapped = (response.data || []).map((row: any) => ({
          receivedAt: row['Received At'] || row.receivedAt || row.received_at,
          quantity: row['Quantity Received'] ?? row.quantity ?? row.qty,
          uom: { name: row['Unit'] || row.uom?.name || row.unit },
          costPerUnit: row['Cost Per Unit'] ?? row.costPerUnit ?? row.unit_cost,
          totalCost: row['Total Cost'] ?? row.totalCost ?? row.total_amount ?? row.amount,
          batchNumber: row['Batch Number'] ?? row.batchNumber ?? row.batch,
          expiryDate: row['Expiry Date'] ?? row.expiryDate,
          supplier: { name: row['Supplier'] || row.supplier?.name || row.supplier_name || row.supplier },
        }));
        setInflowHistory(mapped);
      }
    } catch (err: any) {
      console.error('Failed to load inflow history:', err);
    } finally {
      setLoadingInflow(false);
    }
  };

  const loadSalesHistory = async () => {
    setLoadingSales(true);
    try {
      const response = await api.get<{ success: boolean; data: any[] }>(
        `/rms/sales?itemId=${id}`
      );
      console.log('--- Sales History API Response ---', response.data); // <-- ADDING LOG
      if (response.success) {
        const mapped = (response.data || []).map((row: any) => ({
          createdAt: row['Sale Date'] || row.createdAt || row.created_at,
          quantity: row['Quantity Sold'] ?? row.quantity ?? row.qty,
          uom: { name: row['Unit'] || row.uom?.name || row.unit },
          unitPrice: row['Sold At'] ?? row.unitPrice ?? row.sold_at ?? row.unit_price,
          totalPrice: row['Total Amount' ] ?? row.totalPrice ?? row.total_amount ?? row.amount,
          branch: { name: row['Branch'] || row.branch?.name || row.branch_name || row.branch },
          order: { orderNumber: row['Order Number'] || row.order?.orderNumber || row.order_number || row.orderId },
        }));
        setSalesHistory(mapped);
      }
    } catch (err: any) {
      console.error('Failed to load sales history:', err);
    } finally {
      setLoadingSales(false);
    }
  };

  if (!itemStats || !itemStats.item) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <p className="text-red-600 dark:text-red-400">
            {t('itemNotFound') || 'Item not found'}
          </p>
          <Link
            href="/ims/inventory"
            className="text-brand-600 dark:text-brand-400 hover:underline mt-4 inline-block"
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
      <div className="w-full max-w-5xl space-y-5">
        <PageHeader
          title={item.name}
          subtitle="Stock, batches and history for this item"
          breadcrumbs={[
            { label: t('inventory') || 'Inventory', href: '/ims/inventory' },
            { label: item.name },
          ]}
          actions={
            <PermissionGuard permission="inventory.edit">
              <Button href={`/ims/inventory/edit/${id}`} variant="primary" size="sm">
                <i className="bx bx-edit"></i>
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
                      ? 'border-brand-500 text-brand-600 dark:text-brand-400'
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
              loading={loadingInflow} 
              formatCurrency={formatCurrency}
              formatDate={formatDate}
              t={t} 
            />
          )}
          {activeTab === 'sales' && (
            <SalesHistoryTab 
              salesHistory={salesHistory} 
              loading={loadingSales}
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
  const frontImageUrl = resolveImageUrl(item.frontImage);
  return (
  <div className="w-full max-w-5xl space-y-5">
    <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
      {t('generalInformation')}
    </h2>
    
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Item Image */}
      <div className="lg:col-span-1">
        <h3 className="text-md font-medium text-gray-900 dark:text-white mb-3">
          {t('itemImage')}
        </h3>
        <div className="relative w-full max-w-sm">
          {frontImageUrl ? (
            <img
              src={frontImageUrl}
              alt={item.name}
              className="w-full h-auto rounded-lg ring-1 ring-gray-200 dark:ring-gray-800"
            />
          ) : (
            <div className="w-full h-48 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-600">
              <div className="text-center">
                <i className="bx bx-image text-4xl text-gray-400 dark:text-gray-500 mb-2"></i>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('noImageAvailable')}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Basic Information */}
      <div className="lg:col-span-1">
        <h3 className="text-md font-medium text-gray-900 dark:text-white mb-3">
          {t('basicInformation')}
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">{t('name')}:</span>
            <span className="text-gray-900 dark:text-white font-medium">{item.name}</span>
          </div>
          {item.barcode && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">{t('barcode')}:</span>
              <span className="text-gray-900 dark:text-white font-medium">{item.barcode}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">{t('category')}:</span>
            <span className="text-gray-900 dark:text-white font-medium">{item.category || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">{t('subcategory')}:</span>
            <span className="text-gray-900 dark:text-white font-medium">{item.subcategory || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">{t('unit')}:</span>
            <span className="text-gray-900 dark:text-white font-medium">
              {item.baseUom?.name || item.baseUom?.abbreviation || '-'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">{t('salePrice')}:</span>
            <span className="text-gray-900 dark:text-white font-medium">
              {formatCurrency(Number(item.salePrice || 0))}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">{t('trackStock')}:</span>
            <span className="text-gray-900 dark:text-white font-medium">
              {item.isTrackable ? t('yes') : t('no')}
            </span>
          </div>
          {item.description && (
            <div>
              <span className="text-gray-600 dark:text-gray-400 block mb-1">{t('description')}:</span>
              <p className="text-gray-900 dark:text-white text-sm">{item.description}</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Stock Information */}
      <div className="lg:col-span-1">
        <h3 className="text-md font-medium text-gray-900 dark:text-white mb-3">
          {t('stockInformation')}
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">{t('currentStock')}:</span>
            <span className="text-gray-900 dark:text-white font-medium text-lg">
              {Number(item.currentStock || 0).toLocaleString()}{' '}
              {item.baseUom?.abbreviation || item.baseUom?.name || ''}
            </span>
          </div>
          {item.isTrackable && (
            <>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">{t('minimumStock')}:</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {Number(item.minimumStock || 0).toLocaleString()}{' '}
                  {item.baseUom?.abbreviation || item.baseUom?.name || ''}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">{t('maximumStock')}:</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {Number(item.maximumStock || 0).toLocaleString()}{' '}
                  {item.baseUom?.abbreviation || item.baseUom?.name || ''}
                </span>
              </div>
            </>
          )}
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">{t('createdDate')}:</span>
            <span className="text-gray-900 dark:text-white font-medium">{formatDate(item.createdAt)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">{t('lastUpdated')}:</span>
            <span className="text-gray-900 dark:text-white font-medium">{formatDate(item.updatedAt)}</span>
          </div>
          <div className="mt-4">
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
  </div>
  );
};

const InflowHistoryTab = ({ inflowHistory, loading, formatCurrency, formatDate, t }: any) => (
  <div className="w-full max-w-5xl space-y-5">
    <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
      {t('inflowHistory')}
    </h2>
    
    {loading ? (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto"></div>
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
  <div className="w-full max-w-5xl space-y-5">
    <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
      {t('salesHistory')}
    </h2>
    
    {loading ? (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto"></div>
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

const BranchInventoryTab = ({ branchStocks, salesByBranch, item, formatCurrency, t }: any) => (
  <div className="w-full max-w-5xl space-y-5">
    <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
      {t('branchItemInventory')}
    </h2>
    
    {/* Branch Stock Distribution */}
    <div>
      <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">
        {t('branchDistribution')}
      </h3>
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
                  {t('status')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
              {branchStocks.map((branch: any) => {
                const isLowStock = Number(branch.stock || 0) <= Number(branch.minimumStock || 0);
                // Remaining stock hint (if salesByBranch available)
                const branchId = branch.branchId;
                const salesForBranch = Array.isArray(salesByBranch)
                  ? salesByBranch.find((b: any) => b.branchId === branchId)
                  : null;
                const soldQty = Number(salesForBranch?.quantity || 0);
                const remaining = Math.max(0, Number(branch.stock || 0) - soldQty);
                return (
                  <tr key={branch.branchId}>
                    <td className="px-6 py-3 whitespace-nowrap text-[13px] font-medium text-gray-900 dark:text-white">
                      {branch.branchName || t('unknownBranch') || 'Unknown Branch'}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-[13px] text-gray-500 dark:text-gray-400">
                      {Number(branch.stock || 0).toLocaleString()}{' '}
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
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {t('remaining') || 'Remaining'}: {remaining.toLocaleString()} {item.baseUom?.abbreviation || item.baseUom?.name || ''}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8">
          <i className="bx bx-store text-4xl text-gray-400 dark:text-gray-500 mb-4"></i>
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
                    {Number(branch.quantity || 0).toLocaleString()}{' '}
                    {item.baseUom?.abbreviation || item.baseUom?.name || ''}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-[13px] text-gray-500 dark:text-gray-400">
                    {formatCurrency(Number(branch.salesAmount || 0))}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-[13px] text-green-600 dark:text-green-400 font-medium">
                    {formatCurrency(Number(branch.profit || 0))}
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
