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
import { downloadCsv, formatMoney, useCurrency } from '@/lib/format';
import Link from 'next/link';

const AVATAR_TONES = [
  'bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300',
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

const payrollStatusVariant = (status?: string): StatusBadgeVariant => {
  const s = (status || '').toLowerCase();
  if (s === 'approved') return 'success';
  if (s === 'draft') return 'info';
  return 'warning';
};

const paymentStatusVariant = (status?: string): StatusBadgeVariant => {
  const s = (status || '').toLowerCase();
  if (s === 'processed') return 'success';
  if (s === 'failed') return 'error';
  if (s === 'pending') return 'warning';
  return 'info';
};

export default function PayrollPage() {
  const { t } = useTranslation('common');
  const currency = useCurrency();
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPayrolls();
  }, []);

  const loadPayrolls = async () => {
    try {
      const response = await api.get<{ success: boolean; data: any[] }>('/hrms/payroll');
      if (response.success) {
        setPayrolls(response.data);
      }
    } catch (err: any) {
      setError(err.message || t('errorLoading'));
      console.error('Failed to load payrolls:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    downloadCsv(
      'payroll.csv',
      ['Employee', 'Period', 'Gross Pay', 'Net Pay', 'Status', 'Payment Status'],
      payrolls.map((p) => [
        `${p.employee?.firstName || ''} ${p.employee?.lastName || ''}`.trim(),
        p.payPeriod || '',
        formatMoney(p.grossPay, currency),
        formatMoney(p.netPay, currency),
        p.status || 'draft',
        p.paymentStatus || 'pending',
      ]),
    );
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('payroll')}
        subtitle="Pay runs, past and pending"
        count={loading ? undefined : payrolls.length}
        breadcrumbs={[{ label: 'HR', href: '/hrms/dashboard' }, { label: t('payroll') }]}
        actions={
          <>
            <Button size="sm" variant="secondary" onClick={handleExport} disabled={loading || payrolls.length === 0}>
              <i className="bx bx-download"></i>
              {t('export') === 'export' ? 'Export' : t('export')}
            </Button>
            <PermissionGuard permission="payroll.create">
              <Button size="sm" href="/hrms/payroll/create">
                <i className="bx bx-plus"></i>
                {t('create')} {t('payroll')}
              </Button>
            </PermissionGuard>
          </>
        }
      />
      <Card>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto"></div>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-600 dark:text-red-400">{error}</div>
        ) : payrolls.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-8">
              <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-3">
                <i className="bx bx-money text-gray-400 dark:text-gray-500 text-2xl"></i>
              </div>
              <h3 className="text-gray-900 dark:text-gray-100 font-medium">{t('noRecords')}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">No payroll records found</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                    {t('employee')}
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                    {t('period')}
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                    {t('grossPay')}
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                    {t('netPay')}
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                    {t('status')}
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                    {t('paymentStatus') || 'Payment Status'}
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                    {t('actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {payrolls.map((payroll, idx) => (
                  <tr key={payroll.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <Avatar name={`${payroll.employee?.firstName || ''} ${payroll.employee?.lastName || ''}`.trim() || '?'} i={idx} />
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {payroll.employee?.firstName} {payroll.employee?.lastName}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {payroll.payPeriod || '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm tabular-nums text-gray-700 dark:text-gray-300">
                      {formatMoney(payroll.grossPay, currency)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium tabular-nums text-gray-900 dark:text-gray-100">
                      {formatMoney(payroll.netPay, currency)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge variant={payrollStatusVariant(payroll.status)} label={payroll.status || 'draft'} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge variant={paymentStatusVariant(payroll.paymentStatus)} label={payroll.paymentStatus || 'pending'} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        {payroll.status === 'draft' && (
                          <PermissionGuard permission="payroll.approve">
                            <button
                              onClick={async () => {
                                if (typeof window !== 'undefined' && window.confirm(t('approvePayroll') || 'Approve this payroll?')) {
                                  try {
                                    await api.post(`/hrms/payroll/${payroll.id}/approve`);
                                    await loadPayrolls();
                                  } catch (err: any) {
                                    alert(err.message || t('errorLoading'));
                                  }
                                }
                              }}
                              className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300"
                              title={t('approve')}
                            >
                              <i className="bx bx-check-circle text-lg"></i>
                            </button>
                          </PermissionGuard>
                        )}
                        {payroll.status === 'approved' && payroll.paymentStatus !== 'processed' && (
                          <PermissionGuard permission="payroll.process">
                            <button
                              onClick={async () => {
                                if (typeof window !== 'undefined' && window.confirm(t('processPayment') || 'Process payment for this payroll?')) {
                                  try {
                                    const result = await api.post(`/hrms/payroll/${payroll.id}/process-payment`);
                                    if (result.success) {
                                      alert(t('paymentProcessed') || 'Payment processed successfully. Bank file generated.');
                                      await loadPayrolls();
                                    }
                                  } catch (err: any) {
                                    alert(err.response?.data?.message || err.message || t('errorLoading'));
                                  }
                                }
                              }}
                              className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-purple-600 dark:text-purple-400 hover:text-purple-900 dark:hover:text-purple-300"
                              title={t('processPayment') || 'Process Payment'}
                            >
                              <i className="bx bx-money text-lg"></i>
                            </button>
                          </PermissionGuard>
                        )}
                        <PermissionGuard permission="payroll.view">
                          <button
                            onClick={async () => {
                              try {
                                const result = await api.get(`/hrms/payroll/${payroll.id}/pay-stub`);
                                if (result.success) {
                                  // In a real app, this would open a PDF viewer or download
                                  console.log('Pay Stub Data:', result.data);
                                  alert(t('payStubGenerated') || 'Pay stub data available. Check console for details.');
                                }
                              } catch (err: any) {
                                alert(err.response?.data?.message || err.message || t('errorLoading'));
                              }
                            }}
                            className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300"
                            title={t('viewPayStub') || 'View Pay Stub'}
                          >
                            <i className="bx bx-file text-lg"></i>
                          </button>
                        </PermissionGuard>
                        <PermissionGuard permission="payroll.edit">
                          <Link
                            href={`/hrms/payroll/${payroll.id}/edit`}
                            className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300"
                            title={t('edit')}
                          >
                            <i className="bx bx-edit text-lg"></i>
                          </Link>
                        </PermissionGuard>
                        <PermissionGuard permission="payroll.delete">
                          <button
                            onClick={async () => {
                              if (typeof window !== 'undefined' && window.confirm(t('confirmDelete'))) {
                                try {
                                  await api.delete(`/hrms/payroll/${payroll.id}`);
                                  await loadPayrolls();
                                } catch (err: any) {
                                  alert(err.message || t('deleteFailed'));
                                }
                              }
                            }}
                            className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                            title={t('delete')}
                          >
                            <i className="bx bx-trash text-lg"></i>
                          </button>
                        </PermissionGuard>
                      </div>
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

