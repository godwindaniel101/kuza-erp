import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import Card from '@/components/Card';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import FormField from '@/components/ui/FormField';

export default function CreatePayrollPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    employeeId: '',
    payPeriod: '',
    payPeriodStart: '',
    payPeriodEnd: '',
    payDate: '',
    items: [] as Array<{ type: string; name: string; amount: number; isEarning: boolean; description?: string }>,
    notes: '',
  });

  const [newItem, setNewItem] = useState({
    type: '',
    name: '',
    amount: 0,
    isEarning: true,
    description: '',
  });

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const response = await api.get<{ success: boolean; data: any[] }>('/hrms/employees');
      if (response.success) {
        setEmployees(response.data);
      }
    } catch (err: any) {
      setError(err.message || t('errorLoading'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/hrms/payroll', formData);
      if (response.success) {
        router.push('/hrms/payroll');
      } else {
        setError(response.error || t('createFailed'));
      }
    } catch (err: any) {
      setError(err.message || t('createFailed'));
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    if (newItem.name && newItem.amount) {
      setFormData({
        ...formData,
        items: [...formData.items, { ...newItem }],
      });
      setNewItem({ type: '', name: '', amount: 0, isEarning: true, description: '' });
    }
  };

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const calculateTotal = () => {
    const earnings = formData.items.filter(i => i.isEarning).reduce((sum, i) => sum + i.amount, 0);
    const deductions = formData.items.filter(i => !i.isEarning).reduce((sum, i) => sum + i.amount, 0);
    return { grossPay: earnings, totalDeductions: deductions, netPay: earnings - deductions };
  };

  const totals = calculateTotal();

  return (
    <div className="w-full max-w-3xl space-y-5">
      <PageHeader
        title={<>{t('create')} {t('payroll')}</>}
        subtitle="Set up a new pay run"
        breadcrumbs={[
          { label: 'HR', href: '/hrms/dashboard' },
          { label: t('payroll') || 'Payroll', href: '/hrms/payroll' },
          { label: t('create') || 'Create' },
        ]}
        actions={
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            {t('cancel')}
          </Button>
        }
      />

      <Card>
        <form onSubmit={handleSubmit} className="w-full max-w-3xl space-y-5">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FormField
              type="select"
              name="employeeId"
              label={t('employee')}
              required
              value={formData.employeeId}
              onChange={(value) => setFormData({ ...formData, employeeId: value })}
              placeholder={`${t('select')} ${t('employee')}`}
              options={employees.map((emp) => ({
                value: emp.id,
                label: `${emp.firstName} ${emp.lastName}`,
              }))}
            />

            <FormField
              type="text"
              name="payPeriod"
              label={t('payPeriod')}
              required
              value={formData.payPeriod}
              onChange={(value) => setFormData({ ...formData, payPeriod: value })}
              placeholder="e.g., January 2024"
            />

            <FormField
              type="date"
              name="payDate"
              label={t('payDate')}
              required
              value={formData.payDate}
              onChange={(value) => setFormData({ ...formData, payDate: value })}
            />

            <FormField
              type="date"
              name="payPeriodStart"
              label={t('periodStart')}
              required
              value={formData.payPeriodStart}
              onChange={(value) => setFormData({ ...formData, payPeriodStart: value })}
            />

            <FormField
              type="date"
              name="payPeriodEnd"
              label={t('periodEnd')}
              required
              value={formData.payPeriodEnd}
              onChange={(value) => setFormData({ ...formData, payPeriodEnd: value })}
              inputProps={{ min: formData.payPeriodStart }}
            />
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('payrollItems')}</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
              <input
                type="text"
                placeholder={t('itemName')}
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                className="h-9 px-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-transparent text-sm"
              />
              <input
                type="number"
                placeholder={t('amount')}
                value={newItem.amount}
                onChange={(e) => setNewItem({ ...newItem, amount: parseFloat(e.target.value) || 0 })}
                className="h-9 px-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-transparent text-sm"
              />
              <select
                value={newItem.isEarning ? 'earning' : 'deduction'}
                onChange={(e) => setNewItem({ ...newItem, isEarning: e.target.value === 'earning' })}
                className="h-9 px-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-transparent text-sm"
              >
                <option value="earning">{t('earning')}</option>
                <option value="deduction">{t('deduction')}</option>
              </select>
              <input
                type="text"
                placeholder={t('description')}
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                className="h-9 px-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-transparent text-sm"
              />
              <Button type="button" variant="primary" onClick={addItem}>
                {t('add')}
              </Button>
            </div>

            {formData.items.length > 0 && (
              <div className="space-y-2 mb-4">
                {formData.items.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex-1 grid grid-cols-4 gap-4">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.name}</span>
                      <span className={`text-sm ${item.isEarning ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {item.isEarning ? '+' : '-'} ${item.amount.toFixed(2)}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{item.isEarning ? t('earning') : t('deduction')}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{item.description || '—'}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="ml-4 h-9 w-9 inline-flex items-center justify-center rounded-lg text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                    >
                      <i className="bx bx-trash"></i>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">{t('grossPay')}:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">${totals.grossPay.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">{t('totalDeductions')}:</span>
                <span className="font-medium text-red-600 dark:text-red-400">${totals.totalDeductions.toFixed(2)}</span>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-2 flex justify-between">
                <span className="font-medium text-gray-900 dark:text-gray-100">{t('netPay')}:</span>
                <span className="font-bold text-lg text-gray-900 dark:text-gray-100">${totals.netPay.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <FormField
            type="textarea"
            name="notes"
            label={t('notes')}
            value={formData.notes}
            onChange={(value) => setFormData({ ...formData, notes: value })}
            rows={3}
            placeholder={t('enterNotes')}
          />

          <div className="flex justify-end space-x-4">
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              {t('cancel')}
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? t('saving') : t('create')}
            </Button>
          </div>
        </form>
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

