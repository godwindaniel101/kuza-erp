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

export default function CreateDepartmentPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parentId: '',
    isActive: true,
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
      const payload: any = {
        name: formData.name.trim(),
        isActive: formData.isActive,
      };
      
      // Only include description if it's not empty
      if (formData.description && formData.description.trim() !== '') {
        payload.description = formData.description.trim();
      }
      
      // Only include parentId if it's not empty
      if (formData.parentId && formData.parentId.trim() !== '') {
        payload.parentId = formData.parentId.trim();
      }
      
      console.log('Submitting payload:', payload);
      const response = await api.post('/hrms/departments', payload);
      if (response.success) {
        setToast({ message: t('departmentCreated') || 'Department created successfully', type: 'success' });
        setTimeout(() => router.push('/hrms/departments'), 1500);
      }
    } catch (err: any) {
      console.error('Department creation error:', err);
      const errorMessage = err.response?.data?.message || 
                          (err.response?.data?.error && Array.isArray(err.response.data.error) 
                            ? err.response.data.error.join(', ') 
                            : err.response?.data?.error) ||
                          err.message ||
                          t('failedToCreateDepartment') || 
                          'Failed to create department';
      setToast({ message: errorMessage, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PermissionGuard permission="departments.create">
      <div className="w-full max-w-3xl space-y-5">
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        <PageHeader
          title={t('createDepartment') || 'Create Department'}
          subtitle="Add a new department to your structure"
          breadcrumbs={[
            { label: 'HR', href: '/hrms/dashboard' },
            { label: t('departments') || 'Departments', href: '/hrms/departments' },
            { label: t('create') || 'Create' },
          ]}
        />
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              type="text"
              name="name"
              label={t('name')}
              required
              value={formData.name}
              onChange={(value) => setFormData({ ...formData, name: value })}
            />
            <FormField
              type="textarea"
              name="description"
              label={t('description')}
              rows={3}
              value={formData.description}
              onChange={(value) => setFormData({ ...formData, description: value })}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('parentDepartment')}</label>
              <SearchableSelect
                focusColor="blue"
                options={departments.map(dept => ({ value: dept.id, label: dept.name }))}
                value={formData.parentId}
                onChange={(value) => setFormData({ ...formData, parentId: value })}
                placeholder={t('selectParentDepartment') || 'Select parent department (optional)'}
                searchPlaceholder={t('searchDepartment') || 'Search department...'}
              />
            </div>
            <FormField
              type="checkbox"
              name="isActive"
              checked={formData.isActive}
              onChange={(checked) => setFormData({ ...formData, isActive: checked })}
              checkboxLabel={t('active')}
            />
            <div className="flex justify-end space-x-3 pt-4">
              <Button href="/hrms/departments" variant="secondary">
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

