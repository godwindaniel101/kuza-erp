import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import SettingsForm from '@/components/SettingsForm';

export default function SettingsPage() {
  const { t } = useTranslation('common');

  return <SettingsForm title={t('restaurantSettings')} />;
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale || 'en', ['common'])),
    },
  };
};

