import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import PageHeader from '@/components/ui/PageHeader';

export default function EmployeeProfilePage() {
  const { t } = useTranslation('common');
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await api.get<{ success: boolean; data: any }>(
        '/auth/me'
      );
      if (response.success) {
        const userData = response.data;
        setProfile(userData.user || userData);
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-5">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  const employee = profile?.employee;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <PageHeader
        title={t('myProfile')}
        subtitle="Your personal and employment details"
        breadcrumbs={[{ label: 'Me' }, { label: t('myProfile') }]}
      />

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-semibold mb-4">{t('personalInformation')}</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">{t('name')}</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{profile?.name || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">{t('email')}</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{profile?.email || '-'}</dd>
              </div>
              {employee && (
                <>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">{t('employeeNumber')}</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{employee.employeeNumber || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">{t('department')}</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{employee.department?.name || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">{t('position')}</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{employee.position?.title || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">{t('location')}</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{employee.location?.name || '-'}</dd>
                  </div>
                </>
              )}
            </dl>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-4">{t('contactInformation')}</h2>
            {employee && (
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">{t('phone')}</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{employee.phone || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">{t('address')}</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{employee.address || '-'}</dd>
                </div>
              </dl>
            )}
          </div>
        </div>
      </div>
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

