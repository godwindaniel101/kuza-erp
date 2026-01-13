import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import Card from '@/components/Card';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('create')} {t('leaveRequest')}</h1>
        <button
          onClick={() => router.back()}
          className="px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          {t('cancel')}
        </button>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('leaveType')} *
              </label>
              <select
                required
                value={formData.leaveTypeId}
                onChange={(e) => setFormData({ ...formData, leaveTypeId: e.target.value })}
                className="w-full min-h-[48px] px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-transparent"
              >
                <option value="">{t('select')} {t('leaveType')}</option>
                {leaveTypes.map((lt) => (
                  <option key={lt.id} value={lt.id}>
                    {lt.name} ({lt.maxDaysPerYear} {t('days')}/year)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <input
                  type="checkbox"
                  checked={formData.isHalfDay}
                  onChange={(e) => setFormData({ ...formData, isHalfDay: e.target.checked })}
                  className="mr-2"
                />
                {t('halfDay')}
              </label>
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

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('reason')}
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              rows={4}
              className="w-full min-h-[48px] px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-transparent"
              placeholder={t('enterReason')}
            />
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-700 dark:hover:bg-blue-600"
            >
              {loading ? t('saving') : t('submit')}
            </button>
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

