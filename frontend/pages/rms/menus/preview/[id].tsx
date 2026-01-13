import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import Link from 'next/link';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import Toast from '@/components/Toast';

export default function MenuPreviewPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { id } = router.query;
  const [menu, setMenu] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState<string>('NGN');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (id) {
      loadMenu();
      loadCurrency();
    }
  }, [id]);

  const loadCurrency = async () => {
    try {
      const response = await api.get<{ success: boolean; data: { currency_code?: string; currency?: string } }>('/settings');
      if (response.success && response.data) {
        setCurrency(response.data.currency_code || response.data.currency || 'NGN');
      }
    } catch (err) {
      console.error('Failed to load currency:', err);
      setCurrency('NGN');
    }
  };

  const formatCurrency = (amount: number): string => {
    const currencySymbols: { [key: string]: string } = {
      'NGN': '₦',
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
    };
    const symbol = currencySymbols[currency] || currency;
    return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const loadMenu = async () => {
    try {
      const response = await api.get<{ success: boolean; data: any }>(`/rms/menus/${id}`);
      if (response.success && response.data) {
        setMenu(response.data);
      }
    } catch (err: any) {
      console.error('Failed to load menu:', err);
      setToast({ message: err.response?.data?.message || t('failedToLoadData') || 'Failed to load menu', type: 'error' });
      setTimeout(() => router.push('/rms/menus'), 2000);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!menu) {
    return (
      <div className="p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">{t('menuNotFound') || 'Menu not found'}</p>
          <Link href="/rms/menus" className="mt-4 inline-block text-red-600 hover:text-red-700 dark:text-red-400">
            {t('backToMenus') || 'Back to Menus'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <PermissionGuard permission="menus.view">
      <div className="p-6 max-w-4xl mx-auto">
        {toast && (
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        )}

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/rms/menus" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              <i className="bx bx-arrow-back text-xl"></i>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('menuPreview') || 'Menu Preview'}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('customerView') || 'This is how customers will see your menu'}</p>
            </div>
          </div>
        </div>

        {/* Menu Preview Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Menu Header */}
          <div className="bg-gradient-to-r from-red-600 to-red-700 p-8 text-white">
            <h2 className="text-3xl font-bold mb-2">{menu.name}</h2>
            {menu.description && (
              <p className="text-red-100">{menu.description}</p>
            )}
          </div>

          {/* Menu Categories and Items */}
          <div className="p-6">
            {menu.categories && menu.categories.length > 0 ? (
              menu.categories.map((category: any, categoryIndex: number) => (
                <div key={category.id || categoryIndex} className="mb-8 last:mb-0">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b-2 border-red-500">
                    {category.name}
                  </h3>
                  <div className="space-y-4">
                    {category.items && category.items.length > 0 ? (
                      category.items.map((item: any, itemIndex: number) => (
                        <div key={item.id || itemIndex} className="flex items-start justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-0">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 dark:text-gray-100">{item.name}</h4>
                            {item.description && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{item.description}</p>
                            )}
                          </div>
                          <div className="ml-4">
                            <span className="text-lg font-semibold text-red-600 dark:text-red-400">
                              {formatCurrency(Number(item.price || 0))}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400 italic">{t('noItemsInCategory') || 'No items in this category'}</p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">{t('noCategoriesInMenu') || 'No categories in this menu'}</p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end space-x-3">
          <Link
            href="/rms/menus"
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            {t('back') || 'Back'}
          </Link>
          <Link
            href={`/rms/menus/edit/${id}`}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600"
          >
            {t('edit') || 'Edit Menu'}
          </Link>
        </div>
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
