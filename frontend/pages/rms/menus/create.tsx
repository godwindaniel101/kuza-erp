import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import Toast from '@/components/Toast';
import Link from 'next/link';
import SearchableSelect from '@/components/SearchableSelect';

interface InventoryItem {
  id: string;
  name: string;
  price: number;
  category: string;
  subcategory?: string;
}

export default function CreateMenuPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const [branches, setBranches] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [formData, setFormData] = useState({
    branchId: '',
    name: '',
    description: '',
  });

  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [branchesRes, itemsRes] = await Promise.all([
        api.get<{ success: boolean; data: any[] }>('/settings/branches'),
        api.get<{ success: boolean; data: any[] }>('/ims/inventory'),
      ]);

      if (branchesRes.success) {
        setBranches(branchesRes.data);
      }

      if (itemsRes.success) {
        const items = itemsRes.data.map((item: any) => ({
          id: item.id,
          name: item.name,
          price: Number(item.salePrice || 0),
          category: item.category || 'Uncategorized',
          subcategory: item.subcategory,
        }));
        setInventoryItems(items);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
      setToast({ message: t('failedToLoadData') || 'Failed to load data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const categories = Array.from(new Set(inventoryItems.map(item => item.category))).sort();

  const filteredItems = inventoryItems.filter(item => {
    const matchesSearch = searchQuery === '' || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === '' || item.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const selectedItems = inventoryItems.filter(item => selectedItemIds.includes(item.id));

  const toggleItem = (itemId: string) => {
    if (selectedItemIds.includes(itemId)) {
      setSelectedItemIds(selectedItemIds.filter(id => id !== itemId));
    } else {
      setSelectedItemIds([...selectedItemIds, itemId]);
    }
  };

  const selectAll = () => {
    const filteredIds = filteredItems.map(item => item.id);
    setSelectedItemIds(prev => {
      const newIds = filteredIds.filter(id => !prev.includes(id));
      return [...prev, ...newIds];
    });
  };

  const deselectAll = () => {
    setSelectedItemIds([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.branchId) {
      setToast({ message: t('pleaseSelectBranch') || 'Please select a branch', type: 'error' });
      return;
    }

    if (!formData.name.trim()) {
      setToast({ message: t('pleaseEnterMenuName') || 'Please enter a menu name', type: 'error' });
      return;
    }

    if (selectedItemIds.length === 0) {
      setToast({ message: t('pleaseSelectAtLeastOneItem') || 'Please select at least one item', type: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post<{ success: boolean; menu_id?: string; created_items?: any[]; message?: string }>('/rms/menus', {
        branchId: formData.branchId,
        name: formData.name,
        description: formData.description || undefined,
        inventoryItemIds: selectedItemIds,
      });

      if (response.success) {
        setToast({ 
          message: response.message || t('menuCreatedSuccessfully') || 'Menu created successfully!', 
          type: 'success' 
        });
        setTimeout(() => {
          // Redirect to template selection page (similar to Laravel flow)
          if (response.menu_id) {
            router.push(`/rms/menus/templates?menu_id=${response.menu_id}`);
          } else {
            router.push('/rms/menus');
          }
        }, 1500);
      } else {
        setToast({ message: response.message || t('failedToCreateMenu') || 'Failed to create menu', type: 'error' });
      }
    } catch (err: any) {
      console.error('Failed to create menu:', err);
      setToast({ 
        message: err.response?.data?.message || t('failedToCreateMenu') || 'Failed to create menu', 
        type: 'error' 
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <PermissionGuard permission="menus.create">
      <div className="p-6 max-w-7xl mx-auto">
        {toast && (
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        )}

        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-3">
              <Link href="/rms/menus" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <i className="bx bx-arrow-back text-xl"></i>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('createNewMenu')}</h1>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-400 ml-10">Select a branch and items to create your menu</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Menu Details */}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 sticky top-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center">
                  <i className="bx bx-food-menu text-red-500 mr-2"></i>
                  {t('menuDetails') || 'Menu Details'}
                </h2>

                {/* Branch Selection */}
                <div className="mb-5">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('branch')} <span className="text-red-500">*</span>
                  </label>
                  <SearchableSelect
                    options={branches.map(branch => ({ 
                      value: branch.id, 
                      label: `${branch.name}${branch.isDefault ? ` (${t('default') || 'Default'})` : ''}` 
                    }))}
                    value={formData.branchId}
                    onChange={(value) => setFormData({ ...formData, branchId: value })}
                    placeholder={t('selectBranch') || 'Select Branch'}
                    required
                    searchPlaceholder={t('searchBranch') || 'Search branch...'}
                  />
                </div>

                {/* Menu Name */}
                <div className="mb-5">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('menuName')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={t('e.g. Lunch Menu') || 'e.g., Lunch Menu, Drinks Menu'}
                    required
                    className="w-full min-h-[48px] px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-transparent"
                  />
                </div>

                {/* Description */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('description')} <span className="text-gray-400 text-xs">({t('optional') || 'Optional'})</span>
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    placeholder={t('briefDescription')}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-transparent resize-none"
                  />
                </div>

                {/* Selected Items Summary */}
                <div className="pt-5 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('selectedItems')}</span>
                    <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-sm font-semibold">
                      {selectedItemIds.length}
                    </span>
                  </div>

                  <div className="space-y-2 h-64 overflow-y-auto pr-2">
                    {selectedItems.length > 0 ? (
                      selectedItems.map((item) => (
                        <div key={item.id} className="flex items-center justify-between py-1.5 px-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm">
                          <span className="font-medium text-gray-900 dark:text-gray-100 truncate">{item.name}</span>
                          <span className="text-gray-700 dark:text-gray-300 ml-2">
                            ₦{Number(item.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                        <i className="bx bx-package text-2xl mb-1"></i>
                        <p>{t('noItemsSelectedYet')}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting || selectedItemIds.length === 0 || !formData.branchId || !formData.name}
                  className="w-full mt-6 px-6 py-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg font-semibold hover:from-red-700 hover:to-red-800 focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-transparent focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
                >
                  {submitting ? (
                    <>
                      <i className="bx bx-loader-alt bx-spin text-xl"></i>
                      <span>{t('creating') || 'Creating'}...</span>
                    </>
                  ) : (
                    <>
                      <i className="bx bx-arrow-right text-xl"></i>
                      <span>{t('createMenu')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right Column - Item Selection */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                      <i className="bx bx-package text-red-500 mr-2"></i>
                      {t('selectItems')}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {t('clickItemsToAddToMenu')}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={selectAll}
                      className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                    >
                      {t('selectAll')}
                    </button>
                    <button
                      type="button"
                      onClick={deselectAll}
                      className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                    >
                      {t('clear') || 'Clear'}
                    </button>
                  </div>
                </div>

                {/* Search & Filter */}
                <div className="mb-6">
                  <div className="relative">
                    <i className="bx bx-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t('searchItemsByNameOrCategory') || 'Search items by name or category...'}
                      className="block w-full pl-11 pr-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-transparent"
                    />
                  </div>
                </div>

                {/* Category Filter */}
                <div className="flex flex-wrap gap-2 mb-6">
                  <button
                    type="button"
                    onClick={() => setFilterCategory('')}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      filterCategory === ''
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {t('all') || 'All'}
                  </button>
                  {categories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setFilterCategory(category)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        filterCategory === category
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>

                {/* Items Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 h-[600px] overflow-y-auto pr-1 border-t border-gray-200 dark:border-gray-700 pt-4">
                  {filteredItems.length > 0 ? (
                    filteredItems.map((item) => {
                      const isSelected = selectedItemIds.includes(item.id);
                      return (
                        <div
                          key={item.id}
                          onClick={() => toggleItem(item.id)}
                          className={`relative border rounded-lg p-3 cursor-pointer transition-all group flex justify-between ${
                            isSelected
                              ? 'ring-2 ring-red-500 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                              : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900'
                          }`}
                        >
                          {/* Selection Indicator */}
                          <div
                            className={`absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                              isSelected
                                ? 'bg-red-500'
                                : 'bg-gray-200 dark:bg-gray-600 group-hover:bg-gray-300 dark:group-hover:bg-gray-500'
                            }`}
                          >
                            {isSelected && <i className="bx bx-check text-white text-sm"></i>}
                          </div>

                          <div className="pr-20 w-full">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-gray-900 dark:text-gray-100">{item.name}</h4>
                              <div className="text-sm font-semibold text-red-600 dark:text-red-400">
                                ₦{Number(item.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 text-xs mt-1">
                              <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                                {item.category || t('uncategorized') || 'Uncategorized'}
                              </span>
                              {item.subcategory && (
                                <>
                                  <span className="text-gray-400 dark:text-gray-500">•</span>
                                  <span className="text-gray-500 dark:text-gray-400">{item.subcategory}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : inventoryItems.length === 0 ? (
                    <div className="col-span-2 text-center py-12">
                      <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
                        <i className="bx bx-package text-3xl text-gray-400"></i>
                      </div>
                      <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">{t('noInventoryItems')}</h4>
                      <p className="text-gray-500 dark:text-gray-400 mb-4">{t('addInventoryItemsFirst')}</p>
                      <Link href="/ims/inventory/create" className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                        <i className="bx bx-plus mr-2"></i>
                        {t('addInventoryItem')}
                      </Link>
                    </div>
                  ) : (
                    <div className="col-span-2 text-center py-8 text-gray-500 dark:text-gray-400">
                      <i className="bx bx-search-alt text-4xl mb-2"></i>
                      <p>{t('noItemsMatchYourSearch') || 'No items match your search'}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </form>
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

