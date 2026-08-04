import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import Card from '@/components/Card';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';

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
    <div className="space-y-6 kz-stagger">
      <PageHeader
        title={t('learning')}
        subtitle="Courses and training progress"
        count={loading ? undefined : courses.length}
        breadcrumbs={[{ label: 'HR', href: '/hrms/dashboard' }, { label: t('learning') }]}
        actions={
          <PermissionGuard permission="learning.create">
            <Button href="/hrms/learning/courses/create" size="sm">
              <i className="bx bx-plus"></i>
              {t('create')} {t('course')}
            </Button>
          </PermissionGuard>
        }
      />

      {loading ? (
        <Card>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
          </div>
        </Card>
      ) : error ? (
        <Card>
          <div className="text-center py-8 text-red-600 dark:text-red-400">{error}</div>
        </Card>
      ) : courses.length === 0 ? (
        <EmptyState icon="bx-book" title={t('noRecords')} description="No courses found" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course) => (
            <div key={course.id} className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 p-5 hover:ring-accent-ring transition-colors duration-150">
              <div className="flex items-start gap-3 mb-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300" aria-hidden="true">
                  <i className="bx bx-book text-base"></i>
                </span>
                <h3 className="font-display text-sm font-semibold tracking-tight text-gray-900 dark:text-gray-100 min-w-0">{course.title}</h3>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{course.description || '—'}</p>
              <div className="flex justify-between items-center">
                <StatusBadge variant={course.status === 'published' ? 'success' : 'info'} label={course.status || 'draft'} />
                <span className="text-sm tabular-nums text-gray-600 dark:text-gray-400">
                  {course.enrollments?.length || 0} {t('enrollments')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
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

