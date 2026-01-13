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

export default function CreatePositionPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    departmentId: '',
  });
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      const response = await api.get<{ success: boolean; data: any[] }>('/hrms/departments');
      if (response.success) {
        setDepartments(response.data);
      }
    } catch (err) {
      console.error('Failed to load departments:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await api.post('/hrms/positions', {
        ...formData,
        departmentId: formData.departmentId || undefined,
      });
      if (response.success) {
        setToast({ message: t('positionCreated') || 'Position created successfully', type: 'success' });
        setTimeout(() => router.push('/hrms/positions'), 1500);
      }
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || t('failedToCreatePosition') || 'Failed to create position', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PermissionGuard permission="positions.create">
      <div className="p-6 max-w-2xl mx-auto">
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        <div className="mb-6">
          <Link href="/hrms/positions" className="text-gray-500 hover:text-gray-700 dark:text-gray-400">
            <i className="bx bx-arrow-back mr-2"></i>
            {t('back')}
          </Link>
        </div>
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">{t('createPosition') || 'Create Position'}</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('title')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full min-h-[48px] px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-transparent"
                placeholder={t('positionTitle') || 'Position title'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('description')}</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full min-h-[48px] px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-transparent"
                placeholder={t('positionDescription') || 'Position description (optional)'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('department')}</label>
              <SearchableSelect
                focusColor="blue"
                options={departments.map(dept => ({ value: dept.id, label: dept.name }))}
                value={formData.departmentId}
                onChange={(value) => setFormData({ ...formData, departmentId: value })}
                placeholder={t('selectDepartment') || 'Select department (optional)'}
                searchPlaceholder={t('searchDepartment') || 'Search department...'}
              />
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <Link href="/hrms/positions" className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                {t('cancel')}
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? t('creating') : t('create')}
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

