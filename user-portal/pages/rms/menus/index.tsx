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
import EmptyState from '@/components/ui/EmptyState';
import StatusBadge from '@/components/ui/StatusBadge';

export default function MenusPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const [menus, setMenus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
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
      // Not yet available — show an informational (not success) message
      setToast({ message: t('barcodeDownloadComingSoon') || 'Barcode download is coming soon', type: 'info' });
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
    <div className="kz-stagger space-y-4">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      <PageHeader
        title={t('menus') || 'Menus'}
        count={loading ? undefined : menus.length}
        subtitle={t('menu.guestBrowseBlurb', 'The menus your guests browse and order from')}
        breadcrumbs={[{ label: t('restaurant', 'Restaurant') }, { label: t('menus') || 'Menus' }]}
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
        </div>
      ) : menus.length === 0 ? (
        <EmptyState
          icon="bx-food-menu"
          title={t('noMenusYet') || 'No menus yet'}
          description={t('createFirstMenu') || 'Create your first menu to get started'}
          actions={
            <PermissionGuard permission="menus.create">
              <Button href="/rms/menus/create">
                <i className="bx bx-plus"></i>
                {t('create')} {t('menu')}
              </Button>
            </PermissionGuard>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {menus.map((menu) => {
            const itemCount = getItemCount(menu);
            const categoryCount = getCategoryCount(menu);
            const isDownloading = downloadingBarcode === menu.id;

            return (
              <div key={menu.id} className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 hover:ring-accent-ring transition-shadow duration-150">
                <div className="p-5">
                  {/* Header */}
                  <div className="mb-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-display tracking-tight text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                        <i className="bx bx-food-menu text-accent mr-2"></i>
                        {menu.name}
                      </h3>
                      {menu.isActive ? (
                        <StatusBadge variant="success" label={t('active') || 'Active'} size="sm" />
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                          <i className="bx bx-minus-circle" aria-hidden="true"></i>
                          {t('inactive') || 'Inactive'}
                        </span>
                      )}
                    </div>
                    {menu.description && (
                      <p className="text-[13px] text-gray-500 dark:text-gray-400 line-clamp-2">{menu.description}</p>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-gray-100 dark:border-gray-800">
                    <div>
                      <div className="font-display tabular-nums text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-100">{itemCount}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{t('items') || 'Items'}</div>
                    </div>
                    <div>
                      <div className="font-display tabular-nums text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-100">{categoryCount}</div>
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

