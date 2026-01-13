import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import SettingsForm from '@/components/SettingsForm';

export default function HrmsSettingsPage() {
  const { t } = useTranslation('common');

  return (
    <SettingsForm
      title={t('organizationSettings') || 'Organization Settings'}
      organizationLabel="organizationName"
      currencyDescription={t('currencyDescriptionPayroll') || 'This currency will be used for payroll and financial reports'}
      languageDescription={t('languageDescriptionInterface') || 'This language will be used for the interface'}
    />
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale || 'en', ['common'])),
    },
  };
};

