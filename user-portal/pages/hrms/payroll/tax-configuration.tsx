import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import PermissionGuard from '@/components/PermissionGuard';
import Card from '@/components/Card';
import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';

export default function TaxConfigurationPage() {
  const { t } = useTranslation('common');

  return (
    <PermissionGuard permission="payroll.view">
      <div className="space-y-6 kz-stagger">
        <PageHeader
          title={t('taxConfiguration') || 'Tax Configuration'}
          subtitle="PAYE bands and statutory deductions used by payroll"
          breadcrumbs={[
            { label: 'HR', href: '/hrms/dashboard' },
            { label: t('payroll') || 'Payroll', href: '/hrms/payroll' },
            { label: t('taxConfiguration') || 'Tax Configuration' },
          ]}
        />

        <Card>
          <div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 mb-6">
              <div className="flex items-start">
                <i className="bx bx-info-circle text-blue-600 dark:text-blue-400 text-xl mr-3 mt-0.5"></i>
                <div>
                  <h3 className="text-blue-900 dark:text-blue-200 font-medium mb-1">{t('taxConfigurationInfo') || 'Tax Configuration Information'}</h3>
                  <p className="text-blue-800 dark:text-blue-300 text-sm">
                    {t('taxConfigurationDescription') || 'Tax configurations are managed at the system level and are automatically used by the payroll tax calculation service. Tax brackets and rates can be configured for federal, state, and local taxes per country.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <h2 className="font-display text-sm font-semibold tracking-tight text-gray-900 dark:text-gray-100 mb-4">
                  {t('taxTypes') || 'Tax Types'}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">{t('federalTax') || 'Federal Tax'}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t('federalTaxDescription') || 'Federal income tax brackets configured by country with progressive rates.'}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">{t('stateTax') || 'State Tax'}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t('stateTaxDescription') || 'State income tax brackets and rates for applicable states.'}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">{t('localTax') || 'Local Tax'}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t('localTaxDescription') || 'Local income tax rates for cities and municipalities.'}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">{t('socialSecurityMedicare') || 'Social Security & Medicare'}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t('socialSecurityMedicareDescription') || 'Social Security (6.2%) and Medicare (1.45%) taxes are automatically calculated based on current rates and wage bases.'}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="font-display text-sm font-semibold tracking-tight text-gray-900 dark:text-gray-100 mb-4">
                  {t('howItWorks') || 'How It Works'}
                </h2>
                <div className="space-y-3">
                  <div className="flex items-start">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm font-medium mr-3">
                      1
                    </span>
                    <div>
                      <p className="text-gray-900 dark:text-gray-100 font-medium">{t('taxBracketsConfigured') || 'Tax Brackets Configured'}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{t('taxBracketsDescription') || 'Tax brackets are configured in the database with minimum income, maximum income, tax rate, and effective dates.'}</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm font-medium mr-3">
                      2
                    </span>
                    <div>
                      <p className="text-gray-900 dark:text-gray-100 font-medium">{t('automaticCalculation') || 'Automatic Calculation'}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{t('automaticCalculationDescription') || 'When payroll is processed, the system automatically calculates taxes based on the configured brackets and employee tax information (filing status, allowances, etc.).'}</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm font-medium mr-3">
                      3
                    </span>
                    <div>
                      <p className="text-gray-900 dark:text-gray-100 font-medium">{t('taxDeductions') || 'Tax Deductions'}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{t('taxDeductionsDescription') || 'Calculated taxes are automatically added as deductions to the payroll, and the net pay is calculated accordingly.'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                  {t('note') || 'Note'}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('taxConfigurationNote') || 'Tax configuration management requires database-level access. For production deployments, tax brackets should be managed by system administrators or configured through a dedicated tax management interface.'}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </PermissionGuard>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale || 'en', ['common'])),
    },
  };
};
