import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import Card from '@/components/Card';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import Link from 'next/link';

export default function PayrollPage() {
  const { t } = useTranslation('common');
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('payroll')}</h1>
        <PermissionGuard permission="payroll.create">
          <Link
            href="/hrms/payroll/create"
            className="inline-flex items-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors dark:bg-blue-700 dark:hover:bg-blue-600"
          >
            <i className="bx bx-plus mr-2"></i>
            {t('create')} {t('payroll')}
          </Link>
        </PermissionGuard>
      </div>
      <Card>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-600 dark:text-red-400">{error}</div>
        ) : payrolls.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8">
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
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    {t('employee')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    {t('period')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    {t('grossPay')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    {t('netPay')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    {t('status')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    {t('paymentStatus') || 'Payment Status'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    {t('actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {payrolls.map((payroll) => (
                  <tr key={payroll.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      {payroll.employee?.firstName} {payroll.employee?.lastName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {payroll.payPeriod || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      ${payroll.grossPay || '0.00'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      ${payroll.netPay || '0.00'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          payroll.status === 'approved'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                            : payroll.status === 'draft'
                            ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200'
                        }`}
                      >
                        {payroll.status || 'draft'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          payroll.paymentStatus === 'processed'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'
                            : payroll.paymentStatus === 'pending'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200'
                            : payroll.paymentStatus === 'failed'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {payroll.paymentStatus || 'pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
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
                              className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300"
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
                              className="text-purple-600 dark:text-purple-400 hover:text-purple-900 dark:hover:text-purple-300"
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
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                            title={t('viewPayStub') || 'View Pay Stub'}
                          >
                            <i className="bx bx-file text-lg"></i>
                          </button>
                        </PermissionGuard>
                        <PermissionGuard permission="payroll.edit">
                          <Link
                            href={`/hrms/payroll/${payroll.id}/edit`}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
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
                            className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
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

