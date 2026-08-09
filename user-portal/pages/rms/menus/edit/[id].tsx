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
import Button from '@/components/ui/Button';
import FormField from '@/components/ui/FormField';
import PageHeader from '@/components/ui/PageHeader';
import { formatMoney, useCurrency } from '@/lib/format';

interface InventoryItem {
  id: string;
  name: string;
  price: number;
  category: string;
  subcategory?: string;
}

export default function EditMenuPage() {
  const { t } = useTranslation('common');
  const currency = useCurrency();
  const router = useRouter();
  const { id } = router.query;
  const [branches, setBranches] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [menu, setMenu] = useState<any>(null);
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
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [branchesRes, itemsRes, menuRes] = await Promise.all([
        api.get<{ success: boolean; data: any[] }>('/settings/branches'),
        api.get<{ success: boolean; data: any[] }>('/ims/inventory'),
        api.get<{ success: boolean; data: any }>(`/rms/menus/${id}`),
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

      if (menuRes.success && menuRes.data) {
        const menuData = menuRes.data;
        setMenu(menuData);
        setFormData({
          branchId: menuData.branchId || '',
          name: menuData.name || '',
          description: menuData.description || '',
        });
        
        // Get currently selected item IDs from menu categories
        if (menuData.categories && Array.isArray(menuData.categories)) {
          const currentItemIds: string[] = [];
          menuData.categories.forEach((category: any) => {
            if (category.items && Array.isArray(category.items)) {
              category.items.forEach((item: any) => {
                if (item.inventoryItemId) {
                  currentItemIds.push(item.inventoryItemId);
                }
              });
            }
          });
          setSelectedItemIds(currentItemIds);
        }
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
      // Update menu details
      const updateResponse = await api.patch<{ success: boolean; data?: any; message?: string }>(`/rms/menus/${id}`, {
        branchId: formData.branchId,
        name: formData.name,
        description: formData.description || undefined,
        inventoryItemIds: selectedItemIds,
      });

      if (!updateResponse.success) {
        setToast({ message: updateResponse.message || t('failedToUpdateMenu') || 'Failed to update menu', type: 'error' });
        return;
      }

      // Update menu items (this would require a separate endpoint or be part of the update)
      // For now, we'll redirect to template selection after updating basic info
      setToast({ 
        message: t('menuUpdatedSuccessfully') || 'Menu updated successfully!', 
        type: 'success' 
      });
      
      setTimeout(() => {
        // After editing, continue into the QR flow (menu-studio) for this menu.
        router.push(`/menu-studio?menuId=${id}`);
      }, 1500);
    } catch (err: any) {
      console.error('Failed to update menu:', err);
      setToast({ 
        message: err.response?.data?.message || t('failedToUpdateMenu') || 'Failed to update menu', 
        type: 'error' 
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
      </div>
    );
  }

  if (!menu) {
    return (
      <div className="bg-white dark:bg-gray-900 shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 rounded-2xl p-8 text-center">
        <p className="text-[13px] text-gray-500 dark:text-gray-400">{t('menuNotFound') || 'Menu not found'}</p>
        <Link href="/rms/menus" className="mt-4 inline-block text-[13px] font-medium text-accent hover:text-accent-hover">
          {t('backToMenus') || 'Back to Menus'}
        </Link>
      </div>
    );
  }

  return (
    <PermissionGuard permission="menus.edit">
      <div className="kz-stagger max-w-7xl mx-auto space-y-4">
        {toast && (
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        )}

        <PageHeader
          title={t('editMenu') || 'Edit Menu'}
          subtitle={t('updateMenuDetails') || 'Update menu details and select items'}
          breadcrumbs={[
            { label: t('menus') || 'Menus', href: '/rms/menus' },
            { label: t('edit') || 'Edit' },
          ]}
        />

        <form onSubmit={handleSubmit} className="menu-form">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Left Column - Menu Details */}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 p-6 sticky top-6">
                <h2 className="font-display tracking-tight text-[15px] font-semibold text-gray-900 dark:text-gray-100 mb-5 flex items-center">
                  <i className="bx bx-food-menu text-accent mr-2"></i>
                  {t('menuDetails') || 'Menu Details'}
                </h2>

                {/* Branch Selection */}
                <div className="mb-4">
                  <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                <FormField
                  name="name"
                  type="text"
                  label={t('menuName')}
                  required
                  value={formData.name}
                  onChange={(value) => setFormData({ ...formData, name: value })}
                  placeholder={t('menu.menuNamePlaceholder', 'e.g., Lunch Menu, Drinks Menu')}
                  className="mb-4"
                />

                {/* Selected Items Summary */}
                <div className="pt-5 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[13px] font-medium text-gray-700 dark:text-gray-300">{t('selectedItems')}</span>
                    <span className="px-2 py-0.5 text-xs font-medium tabular-nums rounded-full bg-accent-soft text-accent">
                      {selectedItemIds.length}
                    </span>
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                    {selectedItems.length > 0 ? (
                      selectedItems.map((item) => (
                        <div key={item.id} className="flex items-center justify-between gap-2 py-1.5 px-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-[13px]">
                          <span className="font-medium text-gray-900 dark:text-gray-100 truncate">{item.name}</span>
                          <span className="text-gray-700 dark:text-gray-300 shrink-0 tabular-nums">
                            {formatMoney(item.price, currency)}
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
                <Button
                  type="submit"
                  className="w-full mt-5"
                  disabled={submitting || selectedItemIds.length === 0 || !formData.branchId || !formData.name}
                >
                  {submitting ? (
                    <>
                      <i className="bx bx-loader-alt bx-spin text-base"></i>
                      <span>{t('updating') || 'Updating'}...</span>
                    </>
                  ) : (
                    <>
                      <i className="bx bx-arrow-right text-base"></i>
                      <span>{t('updateAndSelectTemplate') || 'Update & Select Template'}</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Right Column - Item Selection */}
            <div className="lg:col-span-3">
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="font-display tracking-tight text-[15px] font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                      <i className="bx bx-package text-accent mr-2"></i>
                      {t('selectItems')}
                    </h2>
                    <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">
                      {t('clickItemsToAddToMenu')}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button type="button" variant="secondary" size="sm" onClick={selectAll}>
                      {t('selectAll')}
                    </Button>
                    <Button type="button" variant="secondary" size="sm" onClick={deselectAll}>
                      {t('clear') || 'Clear'}
                    </Button>
                  </div>
                </div>

                {/* Search + category filter on one row to save space */}
                <div className="mb-5 flex items-center gap-3">
                  <div className="relative w-48 shrink-0 sm:w-60">
                    <i className="bx bx-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t('searchItems') || 'Search items...'}
                      className="h-9 block w-full pl-9 pr-3 text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring focus-visible:border-transparent"
                    />
                  </div>
                  <div className="flex flex-1 gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                    <button
                      type="button"
                      onClick={() => setFilterCategory('')}
                      className={`shrink-0 px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring ${
                        filterCategory === ''
                          ? 'bg-accent text-accent-fg'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {t('all') || 'All'}
                    </button>
                    {categories.map((category) => (
                      <button
                        key={category}
                        type="button"
                        onClick={() => setFilterCategory(category)}
                        className={`shrink-0 px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring ${
                          filterCategory === category
                            ? 'bg-accent text-accent-fg'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Items Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 max-h-[450px] overflow-y-auto pr-1 border-t border-gray-100 dark:border-gray-800 p-2">
                  {filteredItems.length > 0 ? (
                    filteredItems.map((item) => {
                      const isSelected = selectedItemIds.includes(item.id);
                      return (
                        <div
                          key={item.id}
                          onClick={() => toggleItem(item.id)}
                          className={`relative border rounded-xl p-3 cursor-pointer transition-colors duration-150 group flex justify-between ${
                            isSelected
                              ? 'ring-2 ring-accent-ring bg-accent-soft border-transparent'
                              : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/60'
                          }`}
                        >
                          {/* Selection Indicator */}
                          <div
                            className={`absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center transition-colors duration-150 ${
                              isSelected
                                ? 'bg-accent'
                                : 'bg-gray-200 dark:bg-gray-700 group-hover:bg-gray-300 dark:group-hover:bg-gray-600'
                            }`}
                          >
                            {isSelected && <i className="bx bx-check text-accent-fg text-sm"></i>}
                          </div>

                          <div className="pr-20 w-full">
                            <div className="flex items-center justify-between">
                              <h4 className="text-[13px] font-medium text-gray-900 dark:text-gray-100">{item.name}</h4>
                              <div className="text-[13px] font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                                {formatMoney(item.price, currency)}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 text-xs mt-1">
                              <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded">
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
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">{t('noInventoryItems')}</h4>
                      <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-4">{t('addInventoryItemsFirst')}</p>
                      <a
                        href="/ims/inventory/create"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg bg-accent-gradient text-accent-fg text-[13px] font-medium hover:opacity-90"
                      >
                        <i className="bx bx-plus"></i>
                        {t('addInventoryItem')}
                      </a>
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
