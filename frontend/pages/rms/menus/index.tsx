import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import Link from 'next/link';
import { useRouter } from 'next/router';
import PermissionGuard from '@/components/PermissionGuard';
import Toast from '@/components/Toast';
import Button from '@/components/ui/Button';
import PageHeader from '@/components/ui/PageHeader';

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
    <div className="space-y-5">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      <PageHeader
        title={t('menus') || 'Menus'}
        count={loading ? undefined : menus.length}
        subtitle="The menus your guests browse and order from"
        breadcrumbs={[{ label: 'Restaurant' }, { label: t('menus') || 'Menus' }]}
        actions={
          <PermissionGuard permission="menus.create">
            <Button href="/rms/menus/create" size="sm">
              <i className="bx bx-plus text-base"></i>
              <span>{t('create')} {t('menu')}</span>
            </Button>
          </PermissionGuard>
        }
      />
      
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto"></div>
        </div>
      ) : menus.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 ring-1 ring-gray-200 dark:ring-gray-800 rounded-xl p-8 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
            <i className="bx bx-food-menu text-gray-400 dark:text-gray-500 text-3xl"></i>
          </div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">{t('noMenusYet') || 'No menus yet'}</h3>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-6">{t('createFirstMenu') || 'Create your first menu to get started'}</p>
          <PermissionGuard permission="menus.create">
            <Button href="/rms/menus/create">
              <i className="bx bx-plus"></i>
              {t('create')} {t('menu')}
            </Button>
          </PermissionGuard>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {menus.map((menu) => {
            const itemCount = getItemCount(menu);
            const categoryCount = getCategoryCount(menu);
            const isDownloading = downloadingBarcode === menu.id;

            return (
              <div key={menu.id} className="bg-white dark:bg-gray-900 rounded-xl ring-1 ring-gray-200 dark:ring-gray-800 hover:ring-brand-300 dark:hover:ring-brand-700 transition-colors duration-150">
                <div className="p-5">
                  {/* Header */}
                  <div className="mb-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                        <i className="bx bx-food-menu text-brand-500 dark:text-brand-400 mr-2"></i>
                        {menu.name}
                      </h3>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ring-1 ring-inset ${
                        menu.isActive
                          ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20'
                          : 'bg-gray-50 text-gray-600 ring-gray-500/20 dark:bg-gray-500/10 dark:text-gray-400 dark:ring-gray-500/20'
                      }`}>
                        {menu.isActive ? t('active') || 'Active' : t('inactive') || 'Inactive'}
                      </span>
                    </div>
                    {menu.description && (
                      <p className="text-[13px] text-gray-500 dark:text-gray-400 line-clamp-2">{menu.description}</p>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-gray-100 dark:border-gray-800">
                    <div>
                      <div className="text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-100">{itemCount}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{t('items') || 'Items'}</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-100">{categoryCount}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{t('categories') || 'Categories'}</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    <PermissionGuard permission="menus.view">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="flex-1"
                        onClick={() => handlePreview(menu.id)}
                        title={t('preview') || 'Preview'}
                      >
                        <i className="bx bx-show text-base"></i>
                        <span>{t('preview') || 'Preview'}</span>
                      </Button>
                    </PermissionGuard>
                    <PermissionGuard permission="menus.edit">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleEdit(menu.id)}
                        title={t('edit') || 'Edit'}
                      >
                        <i className="bx bx-edit text-base"></i>
                        <span>{t('edit') || 'Edit'}</span>
                      </Button>
                    </PermissionGuard>
                    <PermissionGuard permission="menus.view">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleDownloadBarcode(menu.id, menu.name)}
                        disabled={isDownloading}
                        title={t('downloadBarcode') || 'Download Barcode'}
                      >
                        {isDownloading ? (
                          <i className="bx bx-loader-alt bx-spin text-base"></i>
                        ) : (
                          <i className="bx bx-download text-base"></i>
                        )}
                      </Button>
                    </PermissionGuard>
                    <PermissionGuard permission="menus.delete">
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(menu.id, menu.name)}
                        title={t('delete') || 'Delete'}
                      >
                        <i className="bx bx-trash text-base"></i>
                      </Button>
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

