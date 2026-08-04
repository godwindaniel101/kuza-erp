import { useState, useEffect, useCallback } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import Toast from '@/components/Toast';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import Modal from '@/components/Modal';
import { downloadCsv } from '@/lib/format';
import { useTenantStore } from '@/store/globalStore';
import { term } from '@/lib/terminology';
import { usePageSearch } from '@/store/searchStore';

type TabKey = 'stock' | 'expiring';

interface ExpiringRow {
  inflowItemId: string;
  inventoryItemId: string;
  itemName: string;
  branchId: string | null;
  branchName: string | null;
  batchNumber: string | null;
  expiryDate: string | null;
  quantity: number;
}

// A branch+item is "Low" when it holds less than its (non-zero) minimum stock.
function isBranchLow(branchStock: any): boolean {
  if (!branchStock) return false;
  const min = Number(branchStock.minimumStock || 0);
  if (!min || min <= 0) return false;
  return Number(branchStock.stock || 0) < min;
}

export default function BranchItemsPage() {
  const { t } = useTranslation('common');
  const { businessType } = useTenantStore();
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const searchQuery = usePageSearch(t('search') || 'Search items...');
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Tabs
  const [activeTab, setActiveTab] = useState<TabKey>('stock');

  // Expiring-soon tab
  const [expiring, setExpiring] = useState<ExpiringRow[]>([]);
  const [expiringLoading, setExpiringLoading] = useState(false);
  const [expiringBranchId, setExpiringBranchId] = useState<string>('');
  const [expiringDays, setExpiringDays] = useState<number>(30);

  // Per-branch config modal
  const [configItem, setConfigItem] = useState<any | null>(null);
  const [configBranchId, setConfigBranchId] = useState<string>('');
  const [configMin, setConfigMin] = useState<string>('');
  const [configMax, setConfigMax] = useState<string>('');
  const [configSaving, setConfigSaving] = useState(false);

  useEffect(() => {
    loadBranches();
    loadInventoryItems();
  }, []);

  const loadBranches = async () => {
    try {
      const response = await api.get<{ success: boolean; data: any[] }>('/settings/branches');
      if (response.success) {
        setBranches(response.data);
      }
    } catch (err) {
      console.error('Failed to load branches:', err);
    }
  };

  const loadInventoryItems = async () => {
    setLoading(true);
    try {
      const response = await api.get<{ success: boolean; data: any[] }>('/ims/inventory?withBranchStock=true');
      if (response.success) {
        setInventoryItems(response.data);
      }
    } catch (err) {
      console.error('Failed to load inventory items:', err);
      setToast({ message: t('failedToLoadData') || 'Failed to load data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadExpiring = useCallback(async () => {
    setExpiringLoading(true);
    try {
      const params = new URLSearchParams();
      if (expiringBranchId) params.set('branchId', expiringBranchId);
      params.set('days', String(expiringDays || 30));
      const response = await api.get<{ success: boolean; data: ExpiringRow[] }>(
        `/ims/inventory/expiring?${params.toString()}`,
      );
      if (response.success) {
        setExpiring(response.data || []);
      } else {
        setExpiring([]);
      }
    } catch (err) {
      console.error('Failed to load expiring stock:', err);
      setExpiring([]);
      setToast({ message: t('failedToLoadData') || 'Failed to load data', type: 'error' });
    } finally {
      setExpiringLoading(false);
    }
  }, [expiringBranchId, expiringDays, t]);

  useEffect(() => {
    if (activeTab === 'expiring') {
      loadExpiring();
    }
  }, [activeTab, loadExpiring]);

  // Reset to first page when the nav search query changes.
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // ----- Config modal helpers -----
  const openConfig = (item: any) => {
    const defaultBranch =
      branches.find((b) => isBranchLow(item.branchStocks?.[b.id])) ||
      branches.find((b) => b.isDefault) ||
      branches[0];
    const branchId = defaultBranch?.id || '';
    setConfigItem(item);
    setConfigBranchId(branchId);
    const bs = item.branchStocks?.[branchId];
    setConfigMin(bs?.minimumStock !== null && bs?.minimumStock !== undefined ? String(bs.minimumStock) : '');
    setConfigMax(bs?.maximumStock !== null && bs?.maximumStock !== undefined ? String(bs.maximumStock) : '');
  };

  const onConfigBranchChange = (branchId: string) => {
    setConfigBranchId(branchId);
    const bs = configItem?.branchStocks?.[branchId];
    setConfigMin(bs?.minimumStock !== null && bs?.minimumStock !== undefined ? String(bs.minimumStock) : '');
    setConfigMax(bs?.maximumStock !== null && bs?.maximumStock !== undefined ? String(bs.maximumStock) : '');
  };

  const closeConfig = () => {
    setConfigItem(null);
    setConfigBranchId('');
    setConfigMin('');
    setConfigMax('');
  };

  const saveConfig = async () => {
    if (!configItem || !configBranchId) return;
    const min = configMin === '' ? 0 : Number(configMin);
    const max = configMax === '' ? 0 : Number(configMax);
    if (!Number.isFinite(min) || min < 0 || !Number.isFinite(max) || max < 0) {
      setToast({ message: t('stock.saveFailed', 'Failed to update stock settings'), type: 'error' });
      return;
    }
    if (max > 0 && max < min) {
      setToast({ message: t('stock.maxLessThanMin', 'Maximum cannot be less than minimum'), type: 'error' });
      return;
    }
    setConfigSaving(true);
    try {
      await api.patch('/ims/inventory/branch-stock', {
        branchId: configBranchId,
        inventoryItemId: configItem.id,
        minimumStock: min,
        maximumStock: max,
      });
      // Optimistically update the in-memory row so the list reflects new thresholds.
      setInventoryItems((prev) =>
        prev.map((it) => {
          if (it.id !== configItem.id) return it;
          const branchStocks = { ...(it.branchStocks || {}) };
          const existing = branchStocks[configBranchId] || { stock: 0 };
          branchStocks[configBranchId] = { ...existing, minimumStock: min, maximumStock: max };
          return { ...it, branchStocks };
        }),
      );
      setToast({ message: t('stock.saved', 'Stock settings updated'), type: 'success' });
      closeConfig();
    } catch (err) {
      console.error('Failed to save stock config:', err);
      setToast({ message: t('stock.saveFailed', 'Failed to update stock settings'), type: 'error' });
    } finally {
      setConfigSaving(false);
    }
  };

  // Filter items based on search query
  const filteredItems = inventoryItems.filter((item) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.name?.toLowerCase().includes(query) ||
      (item.category && item.category.toLowerCase().includes(query)) ||
      (item.subcategory && item.subcategory.toLowerCase().includes(query)) ||
      (item.unit && item.unit.toLowerCase().includes(query))
    );
  });

  // Sort items
  const sortedItems = [...filteredItems].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortField) {
      case 'name':
        aValue = a.name || '';
        bValue = b.name || '';
        break;
      case 'category':
        aValue = a.category || '';
        bValue = b.category || '';
        break;
      case 'totalStock':
        aValue = Number(a.totalStock || 0);
        bValue = Number(b.totalStock || 0);
        break;
      default:
        aValue = a[sortField] || '';
        bValue = b[sortField] || '';
    }

    if (typeof aValue === 'string') {
      return sortDirection === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    } else {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }
  });

  // Paginate items
  const totalPages = Math.ceil(sortedItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = sortedItems.slice(startIndex, startIndex + itemsPerPage);

  const handleExportCsv = () => {
    const headers = [
      t('inventoryItem') || 'Item',
      t('category') || 'Category',
      ...branches.map((b) => b.name),
      t('totalStock') || 'Total Stock',
      t('unit') || 'Unit',
    ];
    const rows = sortedItems.map((item) => [
      item.name || '',
      item.category || '',
      ...branches.map((b) => {
        const bs = item.branchStocks?.[b.id];
        return bs && bs.stock !== undefined && bs.stock !== null ? Number(bs.stock) : 0;
      }),
      Number(item.totalStock || 0),
      item.unit && item.unit !== 'Unknown' ? item.unit : '',
    ]);
    downloadCsv(`branch-items-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) {
      return <i className="bx bx-sort text-gray-400"></i>;
    }
    return sortDirection === 'asc' ? (
      <i className="bx bx-sort-up text-accent"></i>
    ) : (
      <i className="bx bx-sort-down text-accent"></i>
    );
  };

  const LowChip = () => (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
      <i className="bx bx-error-circle text-[13px]" aria-hidden="true"></i>
      {t('stock.low', 'Low')}
    </span>
  );

  const formatDate = (value: string | null) => {
    if (!value) return '-';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'stock', label: t('stock.tab.stock', 'Stock') },
    { key: 'expiring', label: t('stock.tab.expiring', 'Expiring soon') },
  ];

  return (
    <PermissionGuard permission="inventory.view">
      <div className="space-y-6 kz-stagger">
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
        <PageHeader
          title={term(businessType, 'branchStock')}
          count={loading || activeTab !== 'stock' ? undefined : filteredItems.length}
          subtitle={t('viewItemsAcrossBranches') || 'View items across all branches'}
          breadcrumbs={[{ label: t('inventory') || 'Inventory' }, { label: term(businessType, 'branchStock') }]}
          actions={
            activeTab === 'stock' && !loading && filteredItems.length > 0 ? (
              <Button size="sm" variant="secondary" onClick={handleExportCsv}>
                <i className="bx bx-download"></i>
                {t('exportCsv') || 'Export CSV'}
              </Button>
            ) : undefined
          }
        />

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-800">
          <nav className="-mb-px flex gap-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={
                  activeTab === tab.key
                    ? 'whitespace-nowrap border-b-2 border-accent py-2.5 px-1 text-[13px] font-medium text-accent'
                    : 'whitespace-nowrap border-b-2 border-transparent py-2.5 px-1 text-[13px] font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-700'
                }
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {activeTab === 'stock' && (
          <>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="bg-white dark:bg-gray-900 ring-1 ring-gray-200 dark:ring-gray-800 rounded-xl px-6 py-14 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                  <Icon name="cube" size={20} className="text-gray-400 dark:text-gray-500" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  {searchQuery ? (t('noItemsFound') || 'No items found') : (t('noInventoryItems') || 'No inventory items')}
                </h3>
                <p className="text-[13px] text-gray-500 dark:text-gray-400">
                  {searchQuery ? (t('tryDifferentSearch') || 'Try a different search query') : (t('addInventoryItemsFirst') || 'Add inventory items first')}
                </p>
              </div>
            ) : (
              <>
                <div className="bg-white dark:bg-gray-900 ring-1 ring-gray-200 dark:ring-gray-800 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
                      <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                          <th
                            className="sticky left-0 z-10 px-6 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                            onClick={() => handleSort('name')}
                          >
                            <div className="flex items-center space-x-1">
                              <span>{t('inventoryItem') || 'Item'}</span>
                              <SortIcon field="name" />
                            </div>
                          </th>
                          <th
                            className="px-6 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                            onClick={() => handleSort('category')}
                          >
                            <div className="flex items-center space-x-1">
                              <span>{t('category') || 'Category'}</span>
                              <SortIcon field="category" />
                            </div>
                          </th>
                          {branches.map((branch) => (
                            <th key={branch.id} className="px-4 py-2.5 text-right text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase min-w-[120px]">
                              {branch.name}
                              {branch.isDefault && <span className="ml-1 text-xs text-gray-400">({t('default') || 'Default'})</span>}
                            </th>
                          ))}
                          <th
                            className="px-4 py-2.5 text-right text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase bg-gray-100 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                            onClick={() => handleSort('totalStock')}
                          >
                            <div className="flex items-center justify-end space-x-1">
                              <span>{t('totalStock') || 'Total Stock'}</span>
                              <SortIcon field="totalStock" />
                            </div>
                          </th>
                          <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                            {t('unit') || 'Unit'}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
                        {paginatedItems.map((item) => {
                          const hasLowStock = branches.some((branch) => isBranchLow(item.branchStocks?.[branch.id]));

                          return (
                            <tr
                              key={item.id}
                              onClick={() => openConfig(item)}
                              title={t('stock.clickToConfigure', 'Click to set min/max stock')}
                              className={
                                hasLowStock
                                  ? 'cursor-pointer bg-amber-50/40 dark:bg-amber-900/10 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors'
                                  : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors'
                              }
                            >
                              <td className="sticky left-0 z-10 px-6 py-3 whitespace-nowrap text-[13px] font-medium text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
                                <div className="flex items-center gap-2">
                                  <Icon name="cube" size={16} className="text-gray-400 dark:text-gray-500" aria-hidden="true" />
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">{item.name}</span>
                                      {hasLowStock && <LowChip />}
                                    </div>
                                    {item.subcategory && (
                                      <div className="text-xs text-gray-500 dark:text-gray-400">{item.category} / {item.subcategory}</div>
                                    )}
                                    {!item.subcategory && item.category && (
                                      <div className="text-xs text-gray-500 dark:text-gray-400">{item.category}</div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-3 whitespace-nowrap text-[13px] text-gray-500 dark:text-gray-300">
                                {item.category || '-'}
                              </td>
                              {branches.map((branch) => {
                                const branchStock = item.branchStocks?.[branch.id];
                                const stock = branchStock && branchStock.stock !== undefined && branchStock.stock !== null ? Number(branchStock.stock) : 0;
                                const low = isBranchLow(branchStock);

                                return (
                                  <td key={branch.id} className="px-4 py-3 whitespace-nowrap text-right text-[13px] tabular-nums">
                                    <div className="flex items-center justify-end gap-1.5">
                                      {low && <LowChip />}
                                      <span className={`font-medium ${low ? 'text-amber-700 dark:text-amber-300' : 'text-gray-900 dark:text-gray-100'}`}>
                                        {stock.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                      </span>
                                    </div>
                                    {branchStock?.minimumStock !== null && branchStock?.minimumStock !== undefined && (
                                      <div className="text-xs text-gray-500 dark:text-gray-400">
                                        {t('stock.min', 'Min')}: {Number(branchStock.minimumStock).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                      </div>
                                    )}
                                  </td>
                                );
                              })}
                              <td className="px-4 py-3 whitespace-nowrap text-right text-[13px] font-medium tabular-nums text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-900">
                                {Number(item.totalStock || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-left text-[13px] text-gray-500 dark:text-gray-300">
                                {item.unit && item.unit !== 'Unknown' ? item.unit : '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-4 flex items-center justify-between bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 px-4 py-3">
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      {t('showing') || 'Showing'} {startIndex + 1} {t('to') || 'to'} {Math.min(startIndex + itemsPerPage, sortedItems.length)} {t('of') || 'of'} {sortedItems.length} {t('items') || 'items'}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                      >
                        {t('previous') || 'Previous'}
                      </Button>
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        {t('page') || 'Page'} {currentPage} {t('of') || 'of'} {totalPages}
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                      >
                        {t('next') || 'Next'}
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {activeTab === 'expiring' && (
          <>
            {/* Expiring filters */}
            <div className="bg-white dark:bg-gray-900 ring-1 ring-gray-200 dark:ring-gray-800 rounded-xl p-3">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="w-full md:w-1/3">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {t('stock.branch', 'Branch')}
                  </label>
                  <select
                    value={expiringBranchId}
                    onChange={(e) => setExpiringBranchId(e.target.value)}
                    className="h-9 w-full px-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-accent-ring focus-visible:border-transparent text-[13px]"
                  >
                    <option value="">{t('stock.allBranches', 'All branches')}</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div className="w-full md:w-1/4">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {t('stock.expiring.days', 'Days to expiry')}
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={expiringDays}
                    onChange={(e) => setExpiringDays(Math.max(1, Number(e.target.value) || 1))}
                    className="h-9 w-full px-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-accent-ring focus-visible:border-transparent text-[13px]"
                  />
                </div>
              </div>
            </div>

            {expiringLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
              </div>
            ) : expiring.length === 0 ? (
              <div className="bg-white dark:bg-gray-900 ring-1 ring-gray-200 dark:ring-gray-800 rounded-xl px-6 py-14 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                  <i className="bx bx-calendar-check text-xl text-gray-400 dark:text-gray-500"></i>
                </div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  {t('stock.expiring.empty', 'Nothing expiring soon')}
                </h3>
                <p className="text-[13px] text-gray-500 dark:text-gray-400">
                  {t('stock.expiring.emptyHint', 'No batches expiring in the selected window')}
                </p>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-900 ring-1 ring-gray-200 dark:ring-gray-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <th className="px-6 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                          {t('inventoryItem') || 'Item'}
                        </th>
                        <th className="px-6 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                          {t('stock.branch', 'Branch')}
                        </th>
                        <th className="px-6 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                          {t('stock.expiring.batch', 'Batch')}
                        </th>
                        <th className="px-6 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                          {t('stock.expiring.expiryDate', 'Expiry date')}
                        </th>
                        <th className="px-4 py-2.5 text-right text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                          {t('stock.expiring.quantity', 'Quantity')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
                      {expiring.map((row) => {
                        const days = row.expiryDate
                          ? Math.ceil((new Date(row.expiryDate).getTime() - Date.now()) / 86400000)
                          : null;
                        const urgent = days !== null && days <= 7;
                        return (
                          <tr key={row.inflowItemId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                            <td className="px-6 py-3 whitespace-nowrap text-[13px] font-medium text-gray-900 dark:text-gray-100">
                              <div className="flex items-center gap-2">
                                <Icon name="cube" size={16} className="text-gray-400 dark:text-gray-500" aria-hidden="true" />
                                {row.itemName || '-'}
                              </div>
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-[13px] text-gray-500 dark:text-gray-300">
                              {row.branchName || '-'}
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-[13px] text-gray-500 dark:text-gray-300">
                              {row.batchNumber || '-'}
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-[13px]">
                              <span className={urgent ? 'font-medium text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-200'}>
                                {formatDate(row.expiryDate)}
                              </span>
                              {days !== null && (
                                <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">
                                  ({days <= 0 ? t('stock.expiring.today', 'today') : `${days}d`})
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right text-[13px] tabular-nums font-medium text-gray-900 dark:text-gray-100">
                              {Number(row.quantity || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* Per-branch min/max config modal */}
        <Modal
          isOpen={!!configItem}
          onClose={closeConfig}
          title={t('stock.configTitle', 'Stock settings')}
          maxWidth="md"
          footer={
            <>
              <Button variant="secondary" size="sm" onClick={closeConfig} disabled={configSaving}>
                {t('stock.cancel', 'Cancel')}
              </Button>
              <Button size="sm" onClick={saveConfig} disabled={configSaving || !configBranchId}>
                {configSaving ? (t('saving') || 'Saving...') : t('stock.save', 'Save')}
              </Button>
            </>
          }
        >
          {configItem && (
            <div className="space-y-4">
              <div>
                <div className="text-[13px] font-medium text-gray-900 dark:text-gray-100">{configItem.name}</div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {t('stock.configHint', 'Set reorder thresholds for this item at the selected branch')}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  {t('stock.branch', 'Branch')}
                </label>
                <select
                  value={configBranchId}
                  onChange={(e) => onConfigBranchChange(e.target.value)}
                  className="h-9 w-full px-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-accent-ring focus-visible:border-transparent text-[13px]"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {t('stock.minimumStock', 'Minimum stock')}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={configMin}
                    onChange={(e) => setConfigMin(e.target.value)}
                    placeholder="0"
                    className="h-9 w-full px-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-accent-ring focus-visible:border-transparent text-[13px] tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {t('stock.maximumStock', 'Maximum stock')}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={configMax}
                    onChange={(e) => setConfigMax(e.target.value)}
                    placeholder="0"
                    className="h-9 w-full px-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-accent-ring focus-visible:border-transparent text-[13px] tabular-nums"
                  />
                </div>
              </div>
            </div>
          )}
        </Modal>
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
