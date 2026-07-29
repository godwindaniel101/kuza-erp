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
import { downloadCsv, formatMoney, formatNumber, useCurrency } from '@/lib/format';

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
      {initials || '#'}
    </span>
  );
}

export default function CompensationPage() {
  const { t } = useTranslation('common');
  const currency = useCurrency();
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

  const handleExport = () => {
    downloadCsv(
      'compensation-structures.csv',
      ['Name', 'Base Salary', 'Employees', 'Status'],
      structures.map((s) => [
        s.name || '',
        formatMoney(s.baseSalary, currency),
        s.employeeSalaries?.length || 0,
        s.isActive ? 'Active' : 'Inactive',
      ]),
    );
  };

  return (
    <div className="space-y-6 kz-stagger">
      <PageHeader
        title={t('compensation')}
        subtitle="Salary bands and adjustments"
        count={loading ? undefined : structures.length}
        breadcrumbs={[{ label: 'HR', href: '/hrms/dashboard' }, { label: t('compensation') }]}
        actions={
          <>
            <Button size="sm" variant="secondary" onClick={handleExport} disabled={loading || structures.length === 0}>
              <i className="bx bx-download"></i>
              {t('export') === 'export' ? 'Export' : t('export')}
            </Button>
            <PermissionGuard permission="compensation.structures.create">
              <Button href="/hrms/compensation/structures/create" size="sm">
                <i className="bx bx-plus"></i>
                {t('create')} {t('compensation')} {t('structure')}
              </Button>
            </PermissionGuard>
          </>
        }
      />

      <Card>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
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
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium text-gray-500 dark:text-gray-400">
                    {t('name')}
                  </th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-medium text-gray-500 dark:text-gray-400">
                    {t('baseSalary')}
                  </th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-medium text-gray-500 dark:text-gray-400">
                    {t('employees')}
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium text-gray-500 dark:text-gray-400">
                    {t('status')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {structures.map((structure, idx) => (
                  <tr key={structure.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <Avatar name={structure.name || '#'} i={idx} />
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{structure.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm tabular-nums text-gray-700 dark:text-gray-300">
                      {formatMoney(structure.baseSalary, currency)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm tabular-nums text-gray-700 dark:text-gray-300">
                      {formatNumber(structure.employeeSalaries?.length || 0)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge variant={structure.isActive ? 'success' : 'info'} label={structure.isActive ? t('active') : t('inactive')} />
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

