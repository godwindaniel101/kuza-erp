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
    <div className="w-full max-w-3xl space-y-6 kz-stagger">
      <PageHeader
        title={<>{t('create')} {t('performance')} {t('review')}</>}
        subtitle="Score an employee's performance"
        breadcrumbs={[
          { label: 'HR', href: '/hrms/dashboard' },
          { label: t('performance') || 'Performance', href: '/hrms/performance' },
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
              type="select"
              name="employeeId"
              label={t('employee')}
              required
              value={formData.employeeId}
              onChange={(value) => setFormData({ ...formData, employeeId: value })}
              placeholder={`${t('select')} ${t('employee')}`}
              options={employees.map((emp) => ({ value: emp.id, label: `${emp.firstName} ${emp.lastName}` }))}
            />

            <FormField
              type="text"
              name="reviewPeriod"
              label={t('reviewPeriod')}
              required
              value={formData.reviewPeriod}
              onChange={(value) => setFormData({ ...formData, reviewPeriod: value })}
              placeholder="e.g., Q1 2024"
            />

            <FormField
              type="date"
              name="reviewDate"
              label={t('reviewDate')}
              required
              value={formData.reviewDate}
              onChange={(value) => setFormData({ ...formData, reviewDate: value })}
            />

            <FormField
              type="date"
              name="periodStart"
              label={t('periodStart')}
              required
              value={formData.periodStart}
              onChange={(value) => setFormData({ ...formData, periodStart: value })}
            />

            <FormField
              type="date"
              name="periodEnd"
              label={t('periodEnd')}
              required
              value={formData.periodEnd}
              onChange={(value) => setFormData({ ...formData, periodEnd: value })}
              inputProps={{ min: formData.periodStart }}
            />
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="font-display text-sm font-semibold tracking-tight text-gray-900 dark:text-gray-100 mb-4">{t('performanceGoals')}</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <input
                type="text"
                placeholder={t('goalTitle')}
                value={newGoal.title}
                onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                className="h-9 w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-accent-ring focus-visible:border-transparent"
              />
              <input
                type="text"
                placeholder={t('description')}
                value={newGoal.description}
                onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                className="h-9 w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-accent-ring focus-visible:border-transparent"
              />
              <input
                type="number"
                placeholder={t('targetValue')}
                value={newGoal.targetValue}
                onChange={(e) => setNewGoal({ ...newGoal, targetValue: parseFloat(e.target.value) || 0 })}
                className="h-9 w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-accent-ring focus-visible:border-transparent"
              />
              <Button type="button" onClick={addGoal}>
                {t('add')} {t('goal')}
              </Button>
            </div>

            {formData.goals.length > 0 && (
              <div className="space-y-2 mb-4">
                {formData.goals.map((goal, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{goal.title}</p>
                      {goal.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{goal.description}</p>}
                      {goal.targetValue && <p className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">Target: {goal.targetValue}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeGoal(index)}
                      className="ml-4 h-9 w-9 inline-flex items-center justify-center rounded-lg text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                    >
                      <i className="bx bx-trash"></i>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="font-display text-sm font-semibold tracking-tight text-gray-900 dark:text-gray-100 mb-4">{t('performanceRatings')}</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <input
                type="text"
                placeholder={t('criteria')}
                value={newRating.criteria}
                onChange={(e) => setNewRating({ ...newRating, criteria: e.target.value })}
                className="h-9 w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-accent-ring focus-visible:border-transparent"
              />
              <input
                type="number"
                min="1"
                max="10"
                placeholder={t('rating')}
                value={newRating.rating}
                onChange={(e) => setNewRating({ ...newRating, rating: parseInt(e.target.value) || 5 })}
                className="h-9 w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-accent-ring focus-visible:border-transparent"
              />
              <input
                type="text"
                placeholder={t('comments')}
                value={newRating.comments}
                onChange={(e) => setNewRating({ ...newRating, comments: e.target.value })}
                className="h-9 w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-accent-ring focus-visible:border-transparent"
              />
              <Button type="button" onClick={addRating}>
                {t('add')} {t('rating')}
              </Button>
            </div>

            {formData.ratings.length > 0 && (
              <div className="space-y-2 mb-4">
                {formData.ratings.map((rating, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{rating.criteria}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 tabular-nums">{t('rating')}: {rating.rating}/10</p>
                      {rating.comments && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{rating.comments}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeRating(index)}
                      className="ml-4 h-9 w-9 inline-flex items-center justify-center rounded-lg text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                    >
                      <i className="bx bx-trash"></i>
                    </button>
                  </div>
                ))}
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 mt-4">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    {t('overallRating')}: <strong className="tabular-nums">{calculateOverallRating()}/10</strong>
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              type="textarea"
              name="strengths"
              label={t('strengths')}
              rows={4}
              value={formData.strengths}
              onChange={(value) => setFormData({ ...formData, strengths: value })}
              placeholder={t('enterStrengths')}
            />

            <FormField
              type="textarea"
              name="areasForImprovement"
              label={t('areasForImprovement')}
              rows={4}
              value={formData.areasForImprovement}
              onChange={(value) => setFormData({ ...formData, areasForImprovement: value })}
              placeholder={t('enterAreasForImprovement')}
            />
          </div>

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

