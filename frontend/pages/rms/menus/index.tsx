import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import Link from 'next/link';
import { useRouter } from 'next/router';
import PermissionGuard from '@/components/PermissionGuard';
import Toast from '@/components/Toast';

export default function MenusPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const [menus, setMenus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [downloadingBarcode, setDownloadingBarcode] = useState<string | null>(null);

  useEffect(() => {
    loadMenus();
  }, []);

  const loadMenus = async () => {
    try {
      const response = await api.get<{ success: boolean; data: any[] }>('/rms/menus');
      if (response.success) {
        setMenus(response.data);
      }
    } catch (err) {
      console.error('Failed to load menus:', err);
      setToast({ message: t('failedToLoadData') || 'Failed to load menus', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const getItemCount = (menu: any) => {
    if (!menu.categories || !Array.isArray(menu.categories)) return 0;
    return menu.categories.reduce((total: number, category: any) => {
      return total + (category.items?.length || 0);
    }, 0);
  };

  const getCategoryCount = (menu: any) => {
    return menu.categories?.length || 0;
  };

  const handleDownloadBarcode = async (menuId: string, menuName: string) => {
    setDownloadingBarcode(menuId);
    try {
      // TODO: Implement barcode download endpoint
      // For now, show a message
      setToast({ message: t('barcodeDownloadComingSoon') || 'Barcode download feature coming soon', type: 'success' });
    } catch (err: any) {
      console.error('Failed to download barcode:', err);
      setToast({ message: err.response?.data?.message || t('failedToDownloadBarcode') || 'Failed to download barcode', type: 'error' });
    } finally {
      setDownloadingBarcode(null);
    }
  };

  const handlePreview = (menuId: string) => {
    router.push(`/rms/menus/preview/${menuId}`);
  };

  const handleEdit = (menuId: string) => {
    router.push(`/rms/menus/edit/${menuId}`);
  };

  const handleDelete = async (menuId: string, menuName: string) => {
    if (!confirm(t('areYouSureDelete')?.replace('{item}', menuName) || `Are you sure you want to delete "${menuName}"?`)) {
      return;
    }
    try {
      const response = await api.delete<{ success: boolean; message?: string }>(`/rms/menus/${menuId}`);
      if (response.success) {
        setToast({ message: response.message || t('deletedSuccessfully') || 'Menu deleted successfully', type: 'success' });
        loadMenus();
      }
    } catch (err: any) {
      console.error('Failed to delete menu:', err);
      setToast({ message: err.response?.data?.message || t('failedToDelete') || 'Failed to delete menu', type: 'error' });
    }
  };

  return (
    <div className="p-6">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('menus')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('manageYourMenus') || 'Manage your restaurant menus'}</p>
        </div>
        <PermissionGuard permission="menus.create">
          <Link href="/rms/menus/create" className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 transition-colors flex items-center space-x-2">
            <i className="bx bx-plus text-lg"></i>
            <span>{t('create')} {t('menu')}</span>
          </Link>
        </PermissionGuard>
      </div>
      
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
        </div>
      ) : menus.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
            <i className="bx bx-food-menu text-gray-400 text-3xl"></i>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">{t('noMenusYet') || 'No menus yet'}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{t('createFirstMenu') || 'Create your first menu to get started'}</p>
          <PermissionGuard permission="menus.create">
            <Link href="/rms/menus/create" className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 transition-colors">
              <i className="bx bx-plus mr-2"></i>
              {t('create')} {t('menu')}
            </Link>
          </PermissionGuard>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menus.map((menu) => {
            const itemCount = getItemCount(menu);
            const categoryCount = getCategoryCount(menu);
            const isDownloading = downloadingBarcode === menu.id;
            
            return (
              <div key={menu.id} className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
                <div className="p-6">
                  {/* Header */}
                  <div className="mb-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                        <i className="bx bx-food-menu text-red-500 mr-2"></i>
                        {menu.name}
                      </h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        menu.isActive 
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400'
                      }`}>
                        {menu.isActive ? t('active') || 'Active' : t('inactive') || 'Inactive'}
                      </span>
                    </div>
                    {menu.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{menu.description}</p>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                    <div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{itemCount}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{t('items') || 'Items'}</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{categoryCount}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{t('categories') || 'Categories'}</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    <PermissionGuard permission="menus.view">
                      <button
                        onClick={() => handlePreview(menu.id)}
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center justify-center space-x-1"
                        title={t('preview') || 'Preview'}
                      >
                        <i className="bx bx-show text-base"></i>
                        <span>{t('preview') || 'Preview'}</span>
                      </button>
                    </PermissionGuard>
                    <PermissionGuard permission="menus.edit">
                      <button
                        onClick={() => handleEdit(menu.id)}
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center justify-center space-x-1"
                        title={t('edit') || 'Edit'}
                      >
                        <i className="bx bx-edit text-base"></i>
                        <span>{t('edit') || 'Edit'}</span>
                      </button>
                    </PermissionGuard>
                    <PermissionGuard permission="menus.view">
                      <button
                        onClick={() => handleDownloadBarcode(menu.id, menu.name)}
                        disabled={isDownloading}
                        className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={t('downloadBarcode') || 'Download Barcode'}
                      >
                        {isDownloading ? (
                          <i className="bx bx-loader-alt bx-spin text-base"></i>
                        ) : (
                          <i className="bx bx-download text-base"></i>
                        )}
                      </button>
                    </PermissionGuard>
                    <PermissionGuard permission="menus.delete">
                      <button
                        onClick={() => handleDelete(menu.id, menu.name)}
                        className="px-3 py-2 text-sm border border-red-300 dark:border-red-700 bg-white dark:bg-gray-700 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title={t('delete') || 'Delete'}
                      >
                        <i className="bx bx-trash text-base"></i>
                      </button>
                    </PermissionGuard>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
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

