import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import Toast from '@/components/Toast';

type AllocationMethod = 'FIFO' | 'LIFO' | 'FEFO';

export default function AllocationMethodSettingsPage() {
  const { t } = useTranslation('common');
  const [allocationMethod, setAllocationMethod] = useState<AllocationMethod>('FIFO');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await api.get<{ success: boolean; data: { allocationMethod?: AllocationMethod } }>('/settings');
      if (response.success && response.data?.allocationMethod) {
        setAllocationMethod(response.data.allocationMethod);
      }
    } catch (err) {
      console.error('Failed to load allocation method:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await api.patch<{ success: boolean; message?: string }>('/settings', {
        allocationMethod,
      });
      
      if (response.success) {
        setToast({ message: response.message || t('settingsUpdated') || 'Settings updated successfully', type: 'success' });
      } else {
        setToast({ message: t('failedToUpdateSettings') || 'Failed to update settings', type: 'error' });
      }
    } catch (err: any) {
      console.error('Failed to save allocation method:', err);
      setToast({ message: err.response?.data?.message || t('failedToUpdateSettings') || 'Failed to update settings', type: 'error' });
    } finally {
      setSaving(false);
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

  return (
    <PermissionGuard permission="settings.view">
      <div className="p-6 max-w-4xl mx-auto">
        {toast && (
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        )}

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('allocationMethod') || 'Allocation Method'}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('allocationMethodDescription') || 'Choose how items are allocated during outflow'}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                {t('selectAllocationMethod') || 'Select Allocation Method'}
              </label>
              
              <div className="space-y-3">
                <label className="flex items-start p-4 border-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  style={{ borderColor: allocationMethod === 'FIFO' ? '#dc2626' : 'transparent' }}>
                  <input
                    type="radio"
                    name="allocationMethod"
                    value="FIFO"
                    checked={allocationMethod === 'FIFO'}
                    onChange={(e) => setAllocationMethod(e.target.value as AllocationMethod)}
                    className="mt-1 mr-3 text-red-600 focus:ring-red-500"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 dark:text-gray-100">{t('fifo') || 'FIFO — First In, First Out'}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Items received first are sold first. Best for items without expiry dates.
                    </div>
                  </div>
                </label>

                <label className="flex items-start p-4 border-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  style={{ borderColor: allocationMethod === 'LIFO' ? '#dc2626' : 'transparent' }}>
                  <input
                    type="radio"
                    name="allocationMethod"
                    value="LIFO"
                    checked={allocationMethod === 'LIFO'}
                    onChange={(e) => setAllocationMethod(e.target.value as AllocationMethod)}
                    className="mt-1 mr-3 text-red-600 focus:ring-red-500"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 dark:text-gray-100">{t('lifo') || 'LIFO — Last In, First Out'}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Items received last are sold first. Useful for tax or accounting purposes.
                    </div>
                  </div>
                </label>

                <label className="flex items-start p-4 border-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  style={{ borderColor: allocationMethod === 'FEFO' ? '#dc2626' : 'transparent' }}>
                  <input
                    type="radio"
                    name="allocationMethod"
                    value="FEFO"
                    checked={allocationMethod === 'FEFO'}
                    onChange={(e) => setAllocationMethod(e.target.value as AllocationMethod)}
                    className="mt-1 mr-3 text-red-600 focus:ring-red-500"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 dark:text-gray-100">{t('fefo') || 'FEFO — First Expiry, First Out'}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Items with earliest expiry dates are sold first. Recommended for perishable items.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {saving ? (
                  <>
                    <i className="bx bx-loader-alt bx-spin text-lg"></i>
                    <span>{t('saving') || 'Saving...'}</span>
                  </>
                ) : (
                  <>
                    <i className="bx bx-save text-lg"></i>
                    <span>{t('save') || 'Save'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
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
