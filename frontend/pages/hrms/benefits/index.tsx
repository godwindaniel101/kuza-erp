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

export default function BenefitsPage() {
  const { t } = useTranslation('common');
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const response = await api.get<{ success: boolean; data: any[] }>('/hrms/benefits/plans');
      if (response.success) {
        setPlans(response.data);
      }
    } catch (err: any) {
      setError(err.message || t('errorLoading'));
      console.error('Failed to load plans:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('benefits')}
        subtitle="What your team is enrolled in"
        count={loading ? undefined : plans.length}
        breadcrumbs={[{ label: 'HR', href: '/hrms/dashboard' }, { label: t('benefits') }]}
        actions={
          <PermissionGuard permission="benefits.plans.create">
            <Button href="/hrms/benefits/plans/create" size="sm">
              <i className="bx bx-plus"></i>
              {t('create')} {t('benefit')} {t('plan')}
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
        ) : plans.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-8">
              <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-3">
                <i className="bx bx-heart text-gray-400 dark:text-gray-500 text-2xl"></i>
              </div>
              <h3 className="text-gray-900 dark:text-gray-100 font-medium">{t('noRecords')}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">No benefit plans found</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div key={plan.id} className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 p-5 hover:ring-brand-300 dark:hover:ring-brand-700 transition-shadow duration-150">
                <div className="flex items-start gap-3 mb-2">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300" aria-hidden="true">
                    <i className="bx bx-heart text-base"></i>
                  </span>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 min-w-0">{plan.name}</h3>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{plan.description || '—'}</p>
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">{t('type')}:</span>
                    <span className="inline-flex items-center gap-1.5 font-medium text-gray-900 dark:text-gray-100">
                      <i className="bx bx-category text-gray-400"></i>
                      {plan.type || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">{t('enrollments')}:</span>
                    <span className="font-medium tabular-nums text-gray-900 dark:text-gray-100">{plan.employeeBenefits?.length || 0}</span>
                  </div>
                </div>
                <div>
                  <StatusBadge variant={plan.isActive ? 'success' : 'info'} label={plan.isActive ? t('active') : t('inactive')} />
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

