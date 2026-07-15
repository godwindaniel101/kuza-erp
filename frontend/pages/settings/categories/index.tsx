import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import Toast from '@/components/Toast';
import Modal from '@/components/Modal';
import SearchableSelect from '@/components/SearchableSelect';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import FormField from '@/components/ui/FormField';

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
    <div className="space-y-5">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <PageHeader
        title={t('categories') || 'Categories'}
        subtitle="How your items are grouped"
        count={loading ? undefined : categories.length}
        breadcrumbs={[{ label: t('settings') || 'Settings' }, { label: t('categories') || 'Categories' }]}
        actions={
          <PermissionGuard permission="inventory.create">
            <Button size="sm" onClick={() => setShowCategoryModal(true)}>
              <i className="bx bx-plus"></i>
              <span>{t('add')} {t('category')}</span>
            </Button>
          </PermissionGuard>
        }
      />

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto"></div>
        </div>
      ) : categories.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 ring-1 ring-gray-200 dark:ring-gray-800 rounded-xl p-8 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
            <i className="bx bx-folder text-gray-400 dark:text-gray-500 text-2xl"></i>
          </div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">{t('noCategoriesYet') || 'No categories yet'}</h3>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-6">{t('addYourFirstCategory') || 'Add your first category to get started'}</p>
          <PermissionGuard permission="inventory.create">
            <Button size="sm" onClick={() => setShowCategoryModal(true)}>
              <i className="bx bx-plus"></i>
              <span>{t('add')} {t('category')}</span>
            </Button>
          </PermissionGuard>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => {
            const subcategoryCount = category.subcategories?.length || 0;
            return (
              <div
                key={category.id}
                className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 p-5 hover:ring-brand-300 dark:hover:ring-brand-700 transition-shadow duration-150"
              >
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">{category.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {subcategoryCount} {subcategoryCount === 1 ? t('subcategory') || 'subcategory' : t('subcategories') || 'subcategories'}
                  </p>
                </div>
                
                <div className="flex gap-2 mt-4">
                  <PermissionGuard permission="inventory.create">
                    <Button variant="primary" className="flex-1" onClick={() => handleAddSubcategory(category)}>
                      <i className="bx bx-plus text-xs"></i>
                      <span>{t('add')} {t('subcategory')}</span>
                    </Button>
                  </PermissionGuard>
                  <Button variant="secondary" className="flex-1" onClick={() => handleViewSubcategories(category)}>
                    <i className="bx bx-list-ul text-xs"></i>
                    <span>{t('viewSubcategories') || 'View'}</span>
                  </Button>
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
          <FormField
            type="text"
            name="categoryName"
            label={t('name')}
            required
            value={categoryForm.name}
            onChange={(value) => setCategoryForm({ ...categoryForm, name: value })}
            placeholder={t('categoryName') || 'Category name'}
          />
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowCategoryModal(false);
                setCategoryForm({ name: '' });
              }}
            >
              {t('cancel')}
            </Button>
            <Button type="submit" variant="primary" disabled={saving || !categoryForm.name.trim()}>
              {saving ? t('creating') || 'Creating...' : t('create')}
            </Button>
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
          <FormField
            type="text"
            name="subcategoryName"
            label={t('name')}
            required
            value={subcategoryForm.name}
            onChange={(value) => setSubcategoryForm({ ...subcategoryForm, name: value })}
            placeholder={t('subcategoryName') || 'Subcategory name'}
          />
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowSubcategoryModal(false);
                setSubcategoryForm({ categoryId: '', name: '' });
              }}
            >
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={saving || !subcategoryForm.categoryId || !subcategoryForm.name.trim()}
            >
              {saving ? t('creating') || 'Creating...' : t('create')}
            </Button>
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
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto"></div>
            </div>
          ) : categorySubcategories.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">{t('noSubcategoriesYet') || 'No subcategories yet'}</p>
              <PermissionGuard permission="inventory.create">
                <Button
                  variant="primary"
                  className="mt-4"
                  onClick={() => {
                    setShowViewSubcategoriesModal(false);
                    handleAddSubcategory(selectedCategory);
                  }}
                >
                  {t('add')} {t('subcategory')}
                </Button>
              </PermissionGuard>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 ring-1 ring-gray-200 dark:ring-gray-800 rounded-xl overflow-hidden">
              <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                      {t('name')}
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                      {t('actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
                  {categorySubcategories.map((subcategory) => (
                    <tr key={subcategory.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                        {subcategory.name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
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
            <Button
              variant="secondary"
              onClick={() => {
                setShowViewSubcategoriesModal(false);
                setSelectedCategory(null);
                setCategorySubcategories([]);
              }}
            >
              {t('close') || 'Close'}
            </Button>
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
