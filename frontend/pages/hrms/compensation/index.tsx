import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import Card from '@/components/Card';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';

export default function CompensationPage() {
  const { t } = useTranslation('common');
  const [structures, setStructures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStructures();
  }, []);

  const loadStructures = async () => {
    try {
      const response = await api.get<{ success: boolean; data: any[] }>('/hrms/compensation/structures');
      if (response.success) {
        setStructures(response.data);
      }
    } catch (err: any) {
      setError(err.message || t('errorLoading'));
      console.error('Failed to load structures:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('compensation')}
        subtitle="Salary bands and adjustments"
        breadcrumbs={[{ label: 'HR', href: '/hrms/dashboard' }, { label: t('compensation') }]}
        actions={
          <PermissionGuard permission="compensation.structures.create">
            <Button href="/hrms/compensation/structures/create" size="sm">
              <i className="bx bx-plus"></i>
              {t('create')} {t('compensation')} {t('structure')}
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
        ) : structures.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-8">
              <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-3">
                <i className="bx bx-dollar text-gray-400 dark:text-gray-500 text-2xl"></i>
              </div>
              <h3 className="text-gray-900 dark:text-gray-100 font-medium">{t('noRecords')}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">No compensation structures found</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {t('name')}
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {t('baseSalary')}
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {t('employees')}
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {t('status')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {structures.map((structure) => (
                  <tr key={structure.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      {structure.name}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      ${structure.baseSalary || '0.00'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      {structure.employeeSalaries?.length || 0}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          structure.isActive
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {structure.isActive ? t('active') : t('inactive')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

