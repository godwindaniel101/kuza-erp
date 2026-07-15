import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import Card from '@/components/Card';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';

export default function LearningPage() {
  const { t } = useTranslation('common');
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      const response = await api.get<{ success: boolean; data: any[] }>('/hrms/learning/courses');
      if (response.success) {
        setCourses(response.data);
      }
    } catch (err: any) {
      setError(err.message || t('errorLoading'));
      console.error('Failed to load courses:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('learning')}
        subtitle="Courses and training progress"
        breadcrumbs={[{ label: 'HR', href: '/hrms/dashboard' }, { label: t('learning') }]}
        actions={
          <PermissionGuard permission="learning.courses.create">
            <Button href="/hrms/learning/courses/create" size="sm">
              <i className="bx bx-plus"></i>
              {t('create')} {t('course')}
            </Button>
          </PermissionGuard>
        }
      />

      <Card>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto"></div>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-600 dark:text-red-400">{error}</div>
        ) : courses.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-8">
              <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-3">
                <i className="bx bx-book text-gray-400 dark:text-gray-500 text-2xl"></i>
              </div>
              <h3 className="text-gray-900 dark:text-gray-100 font-medium">{t('noRecords')}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">No courses found</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <div key={course.id} className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 p-5 hover:ring-brand-300 dark:hover:ring-brand-700 transition-shadow duration-150">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">{course.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{course.description || '—'}</p>
                <div className="flex justify-between items-center">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      course.status === 'published'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {course.status || 'draft'}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {course.enrollments?.length || 0} {t('enrollments')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
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

