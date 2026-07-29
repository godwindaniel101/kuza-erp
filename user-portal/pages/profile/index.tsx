import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { useAuthStore } from '@/store/authStore';
import PageHeader from '@/components/ui/PageHeader';

export default function Profile() {
  const { t } = useTranslation('common');
  const { user } = useAuthStore();

  return (
      <div className="w-full max-w-3xl space-y-5">
        <PageHeader
          title={t('profile') || 'Profile'}
          subtitle="Your account details and preferences"
          breadcrumbs={[{ label: t('profile') || 'Profile' }]}
        />
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('profileInformation')}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('updateAccountInformation')}</p>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('name')}</label>
              <input
                type="text"
                value={user?.name || ''}
                disabled
                className="h-9 w-full px-4 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-transparent bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-[13px]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('email')}</label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="h-9 w-full px-4 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-transparent bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-[13px]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('business')}</label>
              <input
                type="text"
                value={user?.businessId || ''}
                disabled
                className="h-9 w-full px-4 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-transparent bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-[13px]"
              />
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
