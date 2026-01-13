import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import Card from '@/components/Card';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('create')} {t('payroll')}</h1>
        <button
          onClick={() => router.back()}
          className="px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          {t('cancel')}
        </button>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('employee')} *
              </label>
              <select
                required
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                className="w-full min-h-[48px] px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-transparent"
              >
                <option value="">{t('select')} {t('employee')}</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('payPeriod')} *
              </label>
              <input
                type="text"
                required
                value={formData.payPeriod}
                onChange={(e) => setFormData({ ...formData, payPeriod: e.target.value })}
                placeholder="e.g., January 2024"
                className="w-full min-h-[48px] px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('payDate')} *
              </label>
              <input
                type="date"
                required
                value={formData.payDate}
                onChange={(e) => setFormData({ ...formData, payDate: e.target.value })}
                className="w-full min-h-[48px] px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('periodStart')} *
              </label>
              <input
                type="date"
                required
                value={formData.payPeriodStart}
                onChange={(e) => setFormData({ ...formData, payPeriodStart: e.target.value })}
                className="w-full min-h-[48px] px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('periodEnd')} *
              </label>
              <input
                type="date"
                required
                value={formData.payPeriodEnd}
                onChange={(e) => setFormData({ ...formData, payPeriodEnd: e.target.value })}
                min={formData.payPeriodStart}
                className="w-full min-h-[48px] px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-transparent"
              />
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('payrollItems')}</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
              <input
                type="text"
                placeholder={t('itemName')}
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-transparent"
              />
              <input
                type="number"
                placeholder={t('amount')}
                value={newItem.amount}
                onChange={(e) => setNewItem({ ...newItem, amount: parseFloat(e.target.value) || 0 })}
                className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-transparent"
              />
              <select
                value={newItem.isEarning ? 'earning' : 'deduction'}
                onChange={(e) => setNewItem({ ...newItem, isEarning: e.target.value === 'earning' })}
                className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-transparent"
              >
                <option value="earning">{t('earning')}</option>
                <option value="deduction">{t('deduction')}</option>
              </select>
              <input
                type="text"
                placeholder={t('description')}
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-transparent"
              />
              <button
                type="button"
                onClick={addItem}
                className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors dark:bg-blue-700 dark:hover:bg-blue-600"
              >
                {t('add')}
              </button>
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
                      className="ml-4 text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
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

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('notes')}
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
                className="w-full min-h-[48px] px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-transparent"
              placeholder={t('enterNotes')}
            />
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-700 dark:hover:bg-blue-600"
            >
              {loading ? t('saving') : t('create')}
            </button>
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

