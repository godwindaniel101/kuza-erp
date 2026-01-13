import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import Card from '@/components/Card';
import { api } from '@/lib/api';

export default function CreatePerformanceReviewPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    employeeId: '',
    reviewPeriod: '',
    reviewDate: '',
    periodStart: '',
    periodEnd: '',
    reviewedBy: '',
    strengths: '',
    areasForImprovement: '',
    goals: [] as Array<{ title: string; description?: string; targetValue?: number }>,
    ratings: [] as Array<{ criteria: string; rating: number; comments?: string }>,
  });

  const [newGoal, setNewGoal] = useState({ title: '', description: '', targetValue: 0 });
  const [newRating, setNewRating] = useState({ criteria: '', rating: 5, comments: '' });

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const response = await api.get<{ success: boolean; data: any[] }>('/hrms/employees');
      if (response.success) {
        setEmployees(response.data);
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
      const response = await api.post('/hrms/performance/reviews', formData);
      if (response.success) {
        router.push('/hrms/performance');
      } else {
        setError(response.error || t('createFailed'));
      }
    } catch (err: any) {
      setError(err.message || t('createFailed'));
    } finally {
      setLoading(false);
    }
  };

  const addGoal = () => {
    if (newGoal.title) {
      setFormData({
        ...formData,
        goals: [...formData.goals, { ...newGoal }],
      });
      setNewGoal({ title: '', description: '', targetValue: 0 });
    }
  };

  const removeGoal = (index: number) => {
    setFormData({
      ...formData,
      goals: formData.goals.filter((_, i) => i !== index),
    });
  };

  const addRating = () => {
    if (newRating.criteria) {
      setFormData({
        ...formData,
        ratings: [...formData.ratings, { ...newRating }],
      });
      setNewRating({ criteria: '', rating: 5, comments: '' });
    }
  };

  const removeRating = (index: number) => {
    setFormData({
      ...formData,
      ratings: formData.ratings.filter((_, i) => i !== index),
    });
  };

  const calculateOverallRating = () => {
    if (formData.ratings.length === 0) return 0;
    const sum = formData.ratings.reduce((acc, r) => acc + r.rating, 0);
    return (sum / formData.ratings.length).toFixed(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('create')} {t('performance')} {t('review')}</h1>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('employee')} *
              </label>
              <select
                required
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                className="w-full min-h-[48px] px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-transparent"
              >
                <option value="">{t('select')} {t('employee')}</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('reviewPeriod')} *
              </label>
              <input
                type="text"
                required
                value={formData.reviewPeriod}
                onChange={(e) => setFormData({ ...formData, reviewPeriod: e.target.value })}
                placeholder="e.g., Q1 2024"
                className="w-full min-h-[48px] px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('reviewDate')} *
              </label>
              <input
                type="date"
                required
                value={formData.reviewDate}
                onChange={(e) => setFormData({ ...formData, reviewDate: e.target.value })}
                className="w-full min-h-[48px] px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('periodStart')} *
              </label>
              <input
                type="date"
                required
                value={formData.periodStart}
                onChange={(e) => setFormData({ ...formData, periodStart: e.target.value })}
                className="w-full min-h-[48px] px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('periodEnd')} *
              </label>
              <input
                type="date"
                required
                value={formData.periodEnd}
                onChange={(e) => setFormData({ ...formData, periodEnd: e.target.value })}
                min={formData.periodStart}
                className="w-full min-h-[48px] px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-transparent"
              />
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('performanceGoals')}</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <input
                type="text"
                placeholder={t('goalTitle')}
                value={newGoal.title}
                onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                className="min-h-[48px] px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-transparent"
              />
              <input
                type="text"
                placeholder={t('description')}
                value={newGoal.description}
                onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                className="min-h-[48px] px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-transparent"
              />
              <input
                type="number"
                placeholder={t('targetValue')}
                value={newGoal.targetValue}
                onChange={(e) => setNewGoal({ ...newGoal, targetValue: parseFloat(e.target.value) || 0 })}
                className="min-h-[48px] px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-transparent"
              />
              <button
                type="button"
                onClick={addGoal}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors dark:bg-blue-700 dark:hover:bg-blue-600"
              >
                {t('add')} {t('goal')}
              </button>
            </div>

            {formData.goals.length > 0 && (
              <div className="space-y-2 mb-4">
                {formData.goals.map((goal, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{goal.title}</p>
                      {goal.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{goal.description}</p>}
                      {goal.targetValue && <p className="text-xs text-gray-500 dark:text-gray-400">Target: {goal.targetValue}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeGoal(index)}
                      className="ml-4 text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                    >
                      <i className="bx bx-trash"></i>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('performanceRatings')}</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <input
                type="text"
                placeholder={t('criteria')}
                value={newRating.criteria}
                onChange={(e) => setNewRating({ ...newRating, criteria: e.target.value })}
                className="min-h-[48px] px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-transparent"
              />
              <input
                type="number"
                min="1"
                max="10"
                placeholder={t('rating')}
                value={newRating.rating}
                onChange={(e) => setNewRating({ ...newRating, rating: parseInt(e.target.value) || 5 })}
                className="min-h-[48px] px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-transparent"
              />
              <input
                type="text"
                placeholder={t('comments')}
                value={newRating.comments}
                onChange={(e) => setNewRating({ ...newRating, comments: e.target.value })}
                className="min-h-[48px] px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-transparent"
              />
              <button
                type="button"
                onClick={addRating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors dark:bg-blue-700 dark:hover:bg-blue-600"
              >
                {t('add')} {t('rating')}
              </button>
            </div>

            {formData.ratings.length > 0 && (
              <div className="space-y-2 mb-4">
                {formData.ratings.map((rating, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{rating.criteria}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('rating')}: {rating.rating}/10</p>
                      {rating.comments && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{rating.comments}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeRating(index)}
                      className="ml-4 text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                    >
                      <i className="bx bx-trash"></i>
                    </button>
                  </div>
                ))}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-4">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    {t('overallRating')}: <strong>{calculateOverallRating()}/10</strong>
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('strengths')}
              </label>
              <textarea
                value={formData.strengths}
                onChange={(e) => setFormData({ ...formData, strengths: e.target.value })}
                rows={4}
                className="w-full min-h-[48px] px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-transparent"
                placeholder={t('enterStrengths')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('areasForImprovement')}
              </label>
              <textarea
                value={formData.areasForImprovement}
                onChange={(e) => setFormData({ ...formData, areasForImprovement: e.target.value })}
                rows={4}
                className="w-full min-h-[48px] px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-transparent"
                placeholder={t('enterAreasForImprovement')}
              />
            </div>
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
              {loading ? t('saving') : t('create')}
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

