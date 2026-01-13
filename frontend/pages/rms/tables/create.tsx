import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import Toast from '@/components/Toast';
import SearchableSelect from '@/components/SearchableSelect';

export default function CreateTablePage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [formData, setFormData] = useState({
    branchId: '',
    name: '',
    capacity: 4,
    status: 'available',
  });

  useEffect(() => {
    loadBranches();
  }, []);

  const loadBranches = async () => {
    try {
      const response = await api.get<{ success: boolean; data: any[] }>('/settings/branches');
      if (response.success) {
        setBranches(response.data);
        // Set default branch if available
        const defaultBranch = response.data.find((b) => b.isDefault) || response.data[0];
        if (defaultBranch) {
          setFormData((prev) => ({ ...prev, branchId: defaultBranch.id }));
        }
      }
    } catch (err) {
      console.error('Failed to load branches:', err);
      setToast({ message: t('failedToLoadBranches') || 'Failed to load branches', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.branchId || !formData.name.trim()) {
      setToast({ message: t('pleaseFillAllRequiredFields') || 'Please fill all required fields', type: 'error' });
      return;
    }

    setSaving(true);
    setToast(null);

    try {
      const payload = {
        branchId: formData.branchId,
        name: formData.name.trim(),
        capacity: Number(formData.capacity),
        status: formData.status,
      };

      const response = await api.post<{ success: boolean; data: any; message?: string }>('/rms/tables', payload);
      if (response.success) {
        setToast({ message: response.message || t('tableCreated') || 'Table created successfully', type: 'success' });
        setTimeout(() => {
          router.push('/rms/tables');
        }, 1000);
      } else {
        setToast({ message: response.message || t('failedToCreateTable') || 'Failed to create table', type: 'error' });
      }
    } catch (err: any) {
      console.error('Failed to create table:', err);
      const errorMessage = err.response?.data?.message || err.message || t('failedToCreateTable') || 'Failed to create table';
      setToast({ message: errorMessage, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        </div>
      </div>
    );
  }

  return (
    <PermissionGuard permission="tables.create">
      <div className="p-6 bg-white dark:bg-gray-900 min-h-screen">
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('create')} {t('table')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">{t('addNewTable') || 'Add a new table for your restaurant'}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('branch')} <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={branches.map((b) => ({ value: b.id, label: b.name }))}
                value={formData.branchId}
                onChange={(value) => setFormData({ ...formData, branchId: value })}
                placeholder={t('selectBranch') || 'Select branch'}
                focusColor="red"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('tableName') || 'Table Name'} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('tableNamePlaceholder') || 'e.g., Table 1, VIP 1'}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-transparent"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('capacity')} <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min="1"
                max="50"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 1 })}
                placeholder={t('numberOfPeople') || 'Number of people'}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-transparent"
              />
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('maximumNumberOfGuests') || 'Maximum number of guests this table can accommodate'}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('status')} <span className="text-gray-400 dark:text-gray-500 text-xs">({t('optional')})</span>
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-transparent"
              >
                <option value="available">{t('available')}</option>
                <option value="occupied">{t('occupied')}</option>
                <option value="reserved">{t('reserved')}</option>
                <option value="maintenance">{t('maintenance')}</option>
              </select>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-3 border border-gray-300 dark:border-gray-600 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                disabled={saving}
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={saving || !formData.branchId || !formData.name.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors dark:bg-red-700 dark:hover:bg-red-600"
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    {t('creating') || 'Creating...'}
                  </span>
                ) : (
                  t('save')
                )}
              </button>
            </div>
          </form>
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

