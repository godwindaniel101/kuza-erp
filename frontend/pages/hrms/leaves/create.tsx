import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import Card from '@/components/Card';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import FormField from '@/components/ui/FormField';
import SearchableSelect from '@/components/SearchableSelect';
import DatePicker from '@/components/DatePicker';

export default function CreateLeaveRequestPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    leaveTypeId: '',
    startDate: '',
    endDate: '',
    isHalfDay: false,
    reason: '',
  });

  useEffect(() => {
    loadLeaveTypes();
  }, []);

  const loadLeaveTypes = async () => {
    try {
      const response = await api.get<{ success: boolean; data: any[] }>('/hrms/leave-types');
      if (response.success) {
        setLeaveTypes(response.data.filter((lt: any) => lt.isActive));
      }
    } catch (err: any) {
      setError(err.message || t('errorLoading'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/hrms/leaves', formData);
      if (response.success) {
        router.push('/hrms/leaves');
      } else {
        setError(response.error || t('createFailed'));
      }
    } catch (err: any) {
      setError(err.message || t('createFailed'));
    } finally {
      setLoading(false);
    }
  };

  const calculateDays = () => {
    if (!formData.startDate || !formData.endDate) return 0;
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return formData.isHalfDay ? 0.5 : diffDays;
  };

  const selectedLeaveType = leaveTypes.find(lt => lt.id === formData.leaveTypeId);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <PageHeader
        title={<>{t('create')} {t('leaveRequest')}</>}
        subtitle="Request time off for an employee"
        breadcrumbs={[
          { label: 'HR', href: '/hrms/dashboard' },
          { label: t('leaves') || 'Leaves', href: '/hrms/leaves' },
          { label: t('create') || 'Create' },
        ]}
        actions={
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            {t('cancel')}
          </Button>
        }
      />

      <Card>
        <form onSubmit={handleSubmit} className="mx-auto w-full max-w-3xl space-y-5">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              type="select"
              name="leaveTypeId"
              label={t('leaveType')}
              required
              value={formData.leaveTypeId}
              onChange={(value) => setFormData({ ...formData, leaveTypeId: value })}
              placeholder={`${t('select')} ${t('leaveType')}`}
              options={leaveTypes.map((lt) => ({
                value: lt.id,
                label: `${lt.name} (${lt.maxDaysPerYear} ${t('days')}/year)`,
              }))}
            />

            <div className="flex items-end">
              <FormField
                type="checkbox"
                name="isHalfDay"
                checked={formData.isHalfDay}
                onChange={(checked) => setFormData({ ...formData, isHalfDay: checked })}
                checkboxLabel={t('halfDay')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('startDate')} *
              </label>
              <DatePicker
                value={formData.startDate}
                onChange={(value) => setFormData({ ...formData, startDate: value })}
                placeholder={t('startDate')}
                required
                focusColor="blue"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('endDate')} *
              </label>
              <DatePicker
                value={formData.endDate}
                onChange={(value) => setFormData({ ...formData, endDate: value })}
                placeholder={t('endDate')}
                required
                min={formData.startDate}
                focusColor="blue"
              />
            </div>
          </div>

          {formData.startDate && formData.endDate && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                {t('totalDays')}: <strong>{calculateDays()}</strong> {t('days')}
              </p>
            </div>
          )}

          <FormField
            type="textarea"
            name="reason"
            label={t('reason')}
            value={formData.reason}
            onChange={(value) => setFormData({ ...formData, reason: value })}
            rows={4}
            placeholder={t('enterReason')}
          />

          <div className="flex justify-end space-x-4">
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              {t('cancel')}
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? t('saving') : t('submit')}
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

