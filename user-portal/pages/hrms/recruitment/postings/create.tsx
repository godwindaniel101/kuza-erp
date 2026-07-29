import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import Card from '@/components/Card';
import { api } from '@/lib/api';
import PageHeader from '@/components/ui/PageHeader';
import FormField from '@/components/ui/FormField';
import Button from '@/components/ui/Button';

export default function CreateJobPostingPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    requirements: '',
    departmentId: '',
    positionId: '',
    salaryMin: '',
    salaryMax: '',
    closingDate: '',
    status: 'open',
    openings: 1,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [deptsRes, posRes] = await Promise.all([
        api.get<{ success: boolean; data: any[] }>('/hrms/departments'),
        api.get<{ success: boolean; data: any[] }>('/hrms/positions'),
      ]);
      if (deptsRes.success) setDepartments(deptsRes.data);
      if (posRes.success) setPositions(posRes.data);
    } catch (err: any) {
      setError(err.message || t('errorLoading'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        ...formData,
        salaryMin: formData.salaryMin ? parseFloat(formData.salaryMin) : undefined,
        salaryMax: formData.salaryMax ? parseFloat(formData.salaryMax) : undefined,
        departmentId: formData.departmentId || undefined,
        positionId: formData.positionId || undefined,
      };
      const response = await api.post('/hrms/recruitment/postings', payload);
      if (response.success) {
        router.push('/hrms/recruitment');
      } else {
        setError(response.error || t('createFailed'));
      }
    } catch (err: any) {
      setError(err.message || t('createFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl space-y-6 kz-stagger">
      <PageHeader
        title={<>{t('create')} {t('jobPosting')}</>}
        subtitle="Publish an open role"
        breadcrumbs={[
          { label: 'HR', href: '/hrms/dashboard' },
          { label: t('recruitment') || 'Recruitment', href: '/hrms/recruitment' },
          { label: t('create') || 'Create' },
        ]}
        actions={
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            {t('cancel')}
          </Button>
        }
      />

      <Card>
        <form onSubmit={handleSubmit} className="w-full max-w-3xl space-y-5">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FormField
              className="md:col-span-3"
              type="text"
              name="title"
              label={t('title')}
              required
              value={formData.title}
              onChange={(value) => setFormData({ ...formData, title: value })}
              placeholder="e.g., Senior Software Engineer"
            />

            <FormField
              type="select"
              name="departmentId"
              label={t('department')}
              value={formData.departmentId}
              onChange={(value) => setFormData({ ...formData, departmentId: value })}
              placeholder={`${t('select')} ${t('department')}`}
              options={departments.map((dept) => ({ value: dept.id, label: dept.name }))}
            />

            <FormField
              type="select"
              name="positionId"
              label={t('position')}
              value={formData.positionId}
              onChange={(value) => setFormData({ ...formData, positionId: value })}
              placeholder={`${t('select')} ${t('position')}`}
              options={positions.map((pos) => ({ value: pos.id, label: pos.title }))}
            />

            <FormField
              type="number"
              name="openings"
              label={t('openings')}
              required
              min={1}
              value={formData.openings}
              onChange={(value) => setFormData({ ...formData, openings: parseInt(value) || 1 })}
            />

            <FormField
              type="number"
              name="salaryMin"
              label={t('salaryMin')}
              value={formData.salaryMin}
              onChange={(value) => setFormData({ ...formData, salaryMin: value })}
              placeholder="Min salary"
            />

            <FormField
              type="number"
              name="salaryMax"
              label={t('salaryMax')}
              value={formData.salaryMax}
              onChange={(value) => setFormData({ ...formData, salaryMax: value })}
              placeholder="Max salary"
            />

            <FormField
              type="date"
              name="closingDate"
              label={t('closingDate')}
              value={formData.closingDate}
              onChange={(value) => setFormData({ ...formData, closingDate: value })}
            />

            <FormField
              type="select"
              name="status"
              label={t('status')}
              value={formData.status}
              onChange={(value) => setFormData({ ...formData, status: value })}
              options={[
                { value: 'open', label: t('open') },
                { value: 'closed', label: t('closed') },
                { value: 'draft', label: t('draft') },
              ]}
            />
          </div>

          <FormField
            type="textarea"
            name="description"
            label={t('description')}
            required
            rows={6}
            value={formData.description}
            onChange={(value) => setFormData({ ...formData, description: value })}
            placeholder="Job description..."
          />

          <FormField
            type="textarea"
            name="requirements"
            label={t('requirements')}
            rows={4}
            value={formData.requirements}
            onChange={(value) => setFormData({ ...formData, requirements: value })}
            placeholder="Requirements..."
          />

          <div className="flex justify-end space-x-4">
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t('saving') : t('create')}
            </Button>
          </div>
        </form>
      </Card>
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

