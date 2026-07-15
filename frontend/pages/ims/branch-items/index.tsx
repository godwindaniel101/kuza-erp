import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import Toast from '@/components/Toast';
import PageHeader from '@/components/ui/PageHeader';

export default function BranchItemsPage() {
  const { t } = useTranslation('common');
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

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
      <i className="bx bx-sort-up text-brand-600 dark:text-brand-400"></i>
    ) : (
      <i className="bx bx-sort-down text-brand-600 dark:text-brand-400"></i>
    );
  };

  return (
    <PermissionGuard permission="inventory.view">
      <div className="space-y-5">
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
        <PageHeader
          title={t('branchItems') || 'Branch Items'}
          count={loading ? undefined : filteredItems.length}
          subtitle={t('viewItemsAcrossBranches') || 'View items across all branches'}
          breadcrumbs={[{ label: t('inventory') || 'Inventory' }, { label: t('branchItems') || 'Branch Items' }]}
        />

        {/* Search and Filters */}
        {!loading && inventoryItems.length > 0 && (
          <div className="bg-white dark:bg-gray-900 ring-1 ring-gray-200 dark:ring-gray-800 rounded-xl p-3">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="w-full md:w-1/3">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1); // Reset to first page when searching
                  }}
                  placeholder={t('search') || 'Search items...'}
                  className="h-9 w-full px-4 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-transparent text-[13px]"
                />
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto"></div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 ring-1 ring-gray-200 dark:ring-gray-800 rounded-xl px-6 py-14 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
              <i className="bx bx-package text-xl text-gray-400 dark:text-gray-500"></i>
            </div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
              {searchQuery ? (t('noItemsFound') || 'No items found') : (t('noInventoryItems') || 'No inventory items')}
            </h3>
            <p className="text-[13px] text-gray-500 dark:text-gray-400">
              {searchQuery ? (t('tryDifferentSearch') || 'Try a different search query') : (t('addInventoryItemsFirst') || 'Add inventory items first')}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-4 text-[13px] font-medium text-brand-600 dark:text-brand-400 hover:underline"
              >
                {t('clearSearch') || 'Clear search'}
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="bg-white dark:bg-gray-900 ring-1 ring-gray-200 dark:ring-gray-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th
                        className="sticky left-0 z-10 px-6 py-2.5 text-left text-2xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                        onClick={() => handleSort('name')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>{t('inventoryItem') || 'Item'}</span>
                          <SortIcon field="name" />
                        </div>
                      </th>
                      <th
                        className="px-6 py-2.5 text-left text-2xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                        onClick={() => handleSort('category')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>{t('category') || 'Category'}</span>
                          <SortIcon field="category" />
                        </div>
                      </th>
                      {branches.map((branch) => (
                        <th key={branch.id} className="px-6 py-2.5 text-center text-2xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase min-w-[120px]">
                          {branch.name}
                          {branch.isDefault && <span className="ml-1 text-xs text-gray-400">({t('default') || 'Default'})</span>}
                        </th>
                      ))}
                      <th
                        className="px-6 py-2.5 text-center text-2xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase bg-gray-100 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                        onClick={() => handleSort('totalStock')}
                      >
                        <div className="flex items-center justify-center space-x-1">
                          <span>{t('totalStock') || 'Total Stock'}</span>
                          <SortIcon field="totalStock" />
                        </div>
                      </th>
                      <th className="px-6 py-2.5 text-center text-2xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                        {t('unit') || 'Unit'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
                    {paginatedItems.map((item) => {
                  const hasLowStock = branches.some((branch) => {
                    const branchStock = item.branchStocks?.[branch.id];
                    if (!branchStock || !branchStock.minimumStock) return false;
                    return branchStock.stock <= branchStock.minimumStock;
                  });
                  
                  return (
                    <tr key={item.id} className={hasLowStock ? 'bg-red-50/50 dark:bg-red-900/10' : ''}>
                      <td className="sticky left-0 z-10 px-6 py-3 whitespace-nowrap text-[13px] font-medium text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
                        <div>
                          <div className="font-medium">{item.name}</div>
                          {item.subcategory && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">{item.category} / {item.subcategory}</div>
                          )}
                          {!item.subcategory && item.category && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">{item.category}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-[13px] text-gray-500 dark:text-gray-300">
                        {item.category || '-'}
                      </td>
                      {branches.map((branch) => {
                        const branchStock = item.branchStocks?.[branch.id];
                        const stock = branchStock && branchStock.stock !== undefined && branchStock.stock !== null ? Number(branchStock.stock) : 0;
                        const isLowStock = branchStock?.minimumStock && stock <= Number(branchStock.minimumStock);
                        
                        return (
                          <td key={branch.id} className="px-6 py-3 whitespace-nowrap text-center text-[13px]">
                            <div className="flex flex-col items-center">
                              <span className={`font-medium ${isLowStock ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>
                                {stock.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                              </span>
                              {branchStock?.minimumStock !== null && branchStock?.minimumStock !== undefined && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  Min: {Number(branchStock.minimumStock).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                      <td className="px-6 py-3 whitespace-nowrap text-center text-[13px] font-medium text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-900">
                        {Number(item.totalStock || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-center text-[13px] text-gray-500 dark:text-gray-300">
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
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('previous') || 'Previous'}
                  </button>
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    {t('page') || 'Page'} {currentPage} {t('of') || 'of'} {totalPages}
                  </div>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('next') || 'Next'}
                  </button>
                </div>
              </div>
            )}
          </>
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
