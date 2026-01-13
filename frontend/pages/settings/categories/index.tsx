import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import Toast from '@/components/Toast';
import Modal from '@/components/Modal';
import SearchableSelect from '@/components/SearchableSelect';

export default function CategoriesSettingsPage() {
  const { t } = useTranslation('common');
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSubcategoryModal, setShowSubcategoryModal] = useState(false);
  const [showViewSubcategoriesModal, setShowViewSubcategoriesModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [categorySubcategories, setCategorySubcategories] = useState<any[]>([]);
  const [categoryForm, setCategoryForm] = useState({ name: '' });
  const [subcategoryForm, setSubcategoryForm] = useState({ categoryId: '', name: '' });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const categoriesRes = await api.get<{ success: boolean; data: any[] }>('/ims/categories');
      if (categoriesRes.success) {
        // Ensure subcategories are included in the response
        const categoriesWithSubs = await Promise.all(
          categoriesRes.data.map(async (cat) => {
            try {
              const subsRes = await api.get<{ success: boolean; data: any[] }>(`/ims/categories/${cat.id}/subcategories`);
              return {
                ...cat,
                subcategories: subsRes.success ? subsRes.data : (cat.subcategories || []),
              };
            } catch {
              return {
                ...cat,
                subcategories: cat.subcategories || [],
              };
            }
          })
        );
        setCategories(categoriesWithSubs);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
      setToast({ message: t('failedToLoadData') || 'Failed to load data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadSubcategoriesForCategory = async (categoryId: string) => {
    try {
      setLoadingSubcategories(true);
      const response = await api.get<{ success: boolean; data: any[] }>(`/ims/categories/${categoryId}/subcategories`);
      if (response.success) {
        setCategorySubcategories(response.data);
      }
    } catch (err) {
      console.error('Failed to load subcategories:', err);
      setToast({ message: t('failedToLoadData') || 'Failed to load subcategories', type: 'error' });
    } finally {
      setLoadingSubcategories(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) {
      setToast({ message: t('nameRequired') || 'Name is required', type: 'error' });
      return;
    }

    setSaving(true);
    try {
      const res = await api.post('/ims/categories', { name: categoryForm.name.trim() });
      if (res.success) {
        setToast({ message: t('categoryAdded') || 'Category added successfully', type: 'success' });
        setCategoryForm({ name: '' });
        setShowCategoryModal(false);
        await loadData();
      }
    } catch (err: any) {
      console.error('Failed to create category:', err);
      const errorMessage = err.response?.data?.message || err.message || t('failedToAddCategory') || 'Failed to add category';
      setToast({ message: errorMessage, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subcategoryForm.categoryId || !subcategoryForm.name.trim()) {
      setToast({ message: t('pleaseFillAllFields') || 'Please fill all fields', type: 'error' });
      return;
    }

    setSaving(true);
    try {
      const res = await api.post(`/ims/categories/${subcategoryForm.categoryId}/subcategories`, {
        name: subcategoryForm.name.trim(),
      });
      if (res.success) {
        setToast({ message: t('subcategoryAdded') || 'Subcategory added successfully', type: 'success' });
        setSubcategoryForm({ categoryId: '', name: '' });
        setShowSubcategoryModal(false);
        // Reload data to refresh the subcategories count
        await loadData();
      }
    } catch (err: any) {
      console.error('Failed to create subcategory:', err);
      const errorMessage = err.response?.data?.message || err.message || t('failedToAddSubcategory') || 'Failed to add subcategory';
      setToast({ message: errorMessage, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleViewSubcategories = async (category: any) => {
    setSelectedCategory(category);
    setShowViewSubcategoriesModal(true);
    await loadSubcategoriesForCategory(category.id);
  };

  const handleAddSubcategory = (category: any) => {
    setSubcategoryForm({ categoryId: category.id, name: '' });
    setShowSubcategoryModal(true);
  };

  const categoryOptions = categories.map((cat) => ({
    value: cat.id,
    label: cat.name,
  }));

  return (
    <div className="p-6">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('categories') || 'Categories'}</h1>
        <PermissionGuard permission="inventory.create">
          <button
            onClick={() => setShowCategoryModal(true)}
            className="px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-lg text-sm font-medium hover:bg-red-700 dark:hover:bg-red-600 flex items-center space-x-2 shadow-sm"
          >
            <i className="bx bx-plus"></i>
            <span>{t('add')} {t('category')}</span>
          </button>
        </PermissionGuard>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
        </div>
      ) : categories.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-3">
            <i className="bx bx-folder text-gray-400 dark:text-gray-500 text-2xl"></i>
          </div>
          <h3 className="text-gray-900 dark:text-gray-100 font-medium">{t('noCategoriesYet') || 'No categories yet'}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('addYourFirstCategory') || 'Add your first category to get started'}</p>
          <PermissionGuard permission="inventory.create">
            <button
              onClick={() => setShowCategoryModal(true)}
              className="mt-4 px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-lg text-sm font-medium hover:bg-red-700 dark:hover:bg-red-600 flex items-center space-x-2 shadow-sm mx-auto"
            >
              <i className="bx bx-plus"></i>
              <span>{t('add')} {t('category')}</span>
            </button>
          </PermissionGuard>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => {
            const subcategoryCount = category.subcategories?.length || 0;
            return (
              <div
                key={category.id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{category.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {subcategoryCount} {subcategoryCount === 1 ? t('subcategory') || 'subcategory' : t('subcategories') || 'subcategories'}
                  </p>
                </div>
                
                <div className="flex gap-2 mt-4">
                  <PermissionGuard permission="inventory.create">
                    <button
                      onClick={() => handleAddSubcategory(category)}
                      className="flex-1 px-3 py-2 text-sm bg-red-600 dark:bg-red-700 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors flex items-center justify-center space-x-1"
                    >
                      <i className="bx bx-plus text-xs"></i>
                      <span>{t('add')} {t('subcategory')}</span>
                    </button>
                  </PermissionGuard>
                  <button
                    onClick={() => handleViewSubcategories(category)}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center space-x-1"
                  >
                    <i className="bx bx-list-ul text-xs"></i>
                    <span>{t('viewSubcategories') || 'View'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Category Modal */}
      <Modal
        isOpen={showCategoryModal}
        onClose={() => {
          setShowCategoryModal(false);
          setCategoryForm({ name: '' });
        }}
        title={`${t('add')} ${t('category')}`}
        maxWidth="md"
      >
        <form onSubmit={handleCreateCategory} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('name')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={categoryForm.name}
              onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
              className="w-full min-h-[48px] px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-transparent"
              placeholder={t('categoryName') || 'Category name'}
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowCategoryModal(false);
                setCategoryForm({ name: '' });
              }}
              className="px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={saving || !categoryForm.name.trim()}
              className="px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-lg font-medium hover:bg-red-700 dark:hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? t('creating') || 'Creating...' : t('create')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Subcategory Modal */}
      <Modal
        isOpen={showSubcategoryModal}
        onClose={() => {
          setShowSubcategoryModal(false);
          setSubcategoryForm({ categoryId: '', name: '' });
        }}
        title={`${t('add')} ${t('subcategory')}`}
        maxWidth="md"
      >
        <form onSubmit={handleCreateSubcategory} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('category')} <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={categoryOptions}
              value={subcategoryForm.categoryId}
              onChange={(value) => setSubcategoryForm({ ...subcategoryForm, categoryId: value })}
              placeholder={t('selectCategory') || 'Select a category'}
              required
              focusColor="red"
            />
            {categories.length === 0 && (
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {t('noCategoriesAvailable') || 'No categories available. Please create a category first.'}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('name')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={subcategoryForm.name}
              onChange={(e) => setSubcategoryForm({ ...subcategoryForm, name: e.target.value })}
              className="w-full min-h-[48px] px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-transparent"
              placeholder={t('subcategoryName') || 'Subcategory name'}
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowSubcategoryModal(false);
                setSubcategoryForm({ categoryId: '', name: '' });
              }}
              className="px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={saving || !subcategoryForm.categoryId || !subcategoryForm.name.trim()}
              className="px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-lg font-medium hover:bg-red-700 dark:hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? t('creating') || 'Creating...' : t('create')}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Subcategories Modal */}
      <Modal
        isOpen={showViewSubcategoriesModal}
        onClose={() => {
          setShowViewSubcategoriesModal(false);
          setSelectedCategory(null);
          setCategorySubcategories([]);
        }}
        title={selectedCategory ? `${t('subcategories') || 'Subcategories'} - ${selectedCategory.name}` : t('subcategories') || 'Subcategories'}
        maxWidth="md"
      >
        <div className="space-y-4">
          {loadingSubcategories ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
            </div>
          ) : categorySubcategories.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">{t('noSubcategoriesYet') || 'No subcategories yet'}</p>
              <PermissionGuard permission="inventory.create">
                <button
                  onClick={() => {
                    setShowViewSubcategoriesModal(false);
                    handleAddSubcategory(selectedCategory);
                  }}
                  className="mt-4 px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-lg text-sm font-medium hover:bg-red-700 dark:hover:bg-red-600"
                >
                  {t('add')} {t('subcategory')}
                </button>
              </PermissionGuard>
            </div>
          ) : (
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      {t('name')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      {t('actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {categorySubcategories.map((subcategory) => (
                    <tr key={subcategory.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                        {subcategory.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <PermissionGuard permission="inventory.delete">
                          <button
                            onClick={async () => {
                              if (confirm(t('areYouSureDelete') || 'Are you sure you want to delete this subcategory?')) {
                                try {
                                  await api.delete(`/ims/categories/${selectedCategory.id}/subcategories/${subcategory.id}`);
                                  setToast({ message: t('deletedSuccessfully') || 'Subcategory deleted successfully', type: 'success' });
                                  await loadSubcategoriesForCategory(selectedCategory.id);
                                  await loadData(); // Refresh category count
                                } catch (err) {
                                  setToast({ message: t('deleteFailed') || 'Failed to delete subcategory', type: 'error' });
                                }
                              }
                            }}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          >
                            {t('delete')}
                          </button>
                        </PermissionGuard>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => {
                setShowViewSubcategoriesModal(false);
                setSelectedCategory(null);
                setCategorySubcategories([]);
              }}
              className="px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {t('close') || 'Close'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale || 'en', ['common'])),
    },
  };
};
