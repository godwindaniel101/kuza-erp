import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import Card from '@/components/Card';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import StatusBadge, { StatusBadgeVariant } from '@/components/ui/StatusBadge';

const AVATAR_TONES = [
  'bg-accent-soft text-accent',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
];

function Avatar({ name, i }: { name: string; i: number }) {
  const initials = (name || '?')
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold ${AVATAR_TONES[i % AVATAR_TONES.length]}`}>
      {initials || 'U'}
    </span>
  );
}

const reviewVariant = (status?: string): StatusBadgeVariant => {
  const s = (status || '').toLowerCase();
  if (s === 'completed') return 'success';
  if (s === 'in_progress' || s === 'in progress') return 'info';
  return 'warning';
};

export default function PerformancePage() {
  const { t } = useTranslation('common');
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    try {
      const response = await api.get<{ success: boolean; data: any[] }>('/hrms/performance/reviews');
      if (response.success) {
        setReviews(response.data);
      }
    } catch (err: any) {
      setError(err.message || t('errorLoading'));
      console.error('Failed to load reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 kz-stagger">
      <PageHeader
        title={t('performance')}
        subtitle="Reviews and goals across the team"
        count={loading ? undefined : reviews.length}
        breadcrumbs={[{ label: 'HR', href: '/hrms/dashboard' }, { label: t('performance') }]}
        actions={
          <PermissionGuard permission="performance.create">
            <Button href="/hrms/performance/reviews/create" size="sm">
              <i className="bx bx-plus"></i>
              {t('create')} {t('performance')} {t('review')}
            </Button>
          </PermissionGuard>
        }
      />

      <Card>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-600 dark:text-red-400">{error}</div>
        ) : reviews.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
              <i className="bx bx-trophy text-gray-400 dark:text-gray-500 text-2xl"></i>
            </div>
            <h3 className="font-display font-semibold tracking-tight text-gray-900 dark:text-gray-100">{t('noRecords')}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">No performance reviews found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {reviews.map((review, idx) => (
              <div key={review.id} className="px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={`${review.employee?.firstName || ''} ${review.employee?.lastName || ''}`.trim() || '?'} i={idx} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {review.employee?.firstName} {review.employee?.lastName}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{review.reviewPeriod || '—'}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 inline-flex items-center gap-1 tabular-nums">
                        <i className="bx bxs-star text-amber-400"></i>
                        {t('overallRating')}: {review.overallRating?.toFixed(1) || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <StatusBadge variant={reviewVariant(review.status)} label={review.status || 'pending'} />
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

