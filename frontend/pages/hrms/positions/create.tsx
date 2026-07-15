import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import Toast from '@/components/Toast';
import PageHeader from '@/components/ui/PageHeader';
import SearchableSelect from '@/components/SearchableSelect';
import FormField from '@/components/ui/FormField';
import Button from '@/components/ui/Button';

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
      <div className="w-full max-w-3xl space-y-5">
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
            <FormField
              type="text"
              name="title"
              label={t('title')}
              required
              value={formData.title}
              onChange={(value) => setFormData({ ...formData, title: value })}
              placeholder={t('positionTitle') || 'Position title'}
            />
            <FormField
              type="textarea"
              name="description"
              label={t('description')}
              rows={3}
              value={formData.description}
              onChange={(value) => setFormData({ ...formData, description: value })}
              placeholder={t('positionDescription') || 'Position description (optional)'}
            />
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
              <Button href="/hrms/positions" variant="secondary">
                {t('cancel')}
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? t('creating') : t('create')}
              </Button>
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

