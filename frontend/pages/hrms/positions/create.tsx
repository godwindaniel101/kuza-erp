import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import Toast from '@/components/Toast';
import PageHeader from '@/components/ui/PageHeader';
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
      <div className="mx-auto w-full max-w-3xl space-y-5">
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        <PageHeader
          title={t('createPosition') || 'Create Position'}
          subtitle="Define a role people are hired into"
          breadcrumbs={[
            { label: 'HR', href: '/hrms/dashboard' },
            { label: t('positions') || 'Positions', href: '/hrms/positions' },
            { label: t('create') || 'Create' },
          ]}
        />
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 p-6">
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
                className="h-9 w-full px-4 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-transparent text-[13px]"
                placeholder={t('positionTitle') || 'Position title'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('description')}</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full min-h-[48px] px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-transparent"
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
              <Link href="/hrms/positions" className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                {t('cancel')}
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50"
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

