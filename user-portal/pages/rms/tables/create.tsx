import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import PageHeader from '@/components/ui/PageHeader';
import Toast from '@/components/Toast';
import SearchableSelect from '@/components/SearchableSelect';
import Button from '@/components/ui/Button';

interface Branch {
  id: string;
  name: string;
  isDefault?: boolean;
}

export default function CreateTablePage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [form, setForm] = useState({
    branchId: '',
    prefix: 'Table',
    startNumber: 1,
    quantity: 1,
    capacity: 4,
    status: 'available',
  });

  useEffect(() => {
    api
      .get<{ success: boolean; data: Branch[] }>('/settings/branches')
      .then((res) => {
        if (res.success) {
          setBranches(res.data || []);
          const def = res.data.find((b) => b.isDefault) || res.data[0];
          if (def) setForm((f) => ({ ...f, branchId: def.id }));
        }
      })
      .catch(() => setToast({ message: t('tables.failedToLoadBranches', 'Failed to load branches'), type: 'error' }))
      .finally(() => setLoading(false));
  }, []);

  // The exact table names that will be created (single = plain name, many = numbered).
  const buildNames = (): string[] => {
    const prefix = form.prefix.trim() || 'Table';
    const qty = Math.max(1, Math.min(100, Number(form.quantity) || 1));
    if (qty === 1) return [prefix];
    const start = Number(form.startNumber) || 1;
    return Array.from({ length: qty }, (_, i) => `${prefix} ${start + i}`);
  };
  const names = buildNames();
  const previewLabel =
    names.length <= 4
      ? names.join(', ')
      : `${names.slice(0, 3).join(', ')} … ${names[names.length - 1]}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.branchId) {
      setToast({ message: t('tables.selectABranch', 'Select a branch'), type: 'error' });
      return;
    }
    if (!form.prefix.trim()) {
      setToast({ message: t('tables.enterTableName', 'Enter a table name'), type: 'error' });
      return;
    }
    setSaving(true);
    setToast(null);
    try {
      const capacity = Math.max(1, Number(form.capacity) || 1);
      // Create each table; tolerate partial failures and report the count made.
      const results = await Promise.allSettled(
        names.map((name) =>
          api.post('/rms/tables', {
            branchId: form.branchId,
            name,
            capacity,
            status: form.status,
          }),
        ),
      );
      const made = results.filter((r) => r.status === 'fulfilled').length;
      if (made === 0) {
        setToast({ message: t('tables.failedToCreate', 'Failed to create tables'), type: 'error' });
        return;
      }
      setToast({
        message:
          made === 1
            ? t('tables.tableCreated', 'Table created')
            : t('tables.tablesCreated', '{{count}} tables created', { count: made }),
        type: 'success',
      });
      setTimeout(() => router.push('/rms/tables'), 800);
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || t('tables.failedToCreate', 'Failed to create tables'), type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-accent" />
      </div>
    );
  }

  const inputCls =
    'h-9 w-full rounded-md border border-gray-200 px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100';

  return (
    <PermissionGuard permission="tables.create">
      <div className="kz-stagger w-full max-w-2xl space-y-6">
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        <PageHeader
          title={t('tables.addTables', 'Add tables')}
          subtitle={t('tables.addTablesSubtitle', 'Create one table or a whole batch at once')}
          breadcrumbs={[
            { label: t('restaurant', 'Restaurant'), href: '/rms/tables' },
            { label: t('tables', 'Tables'), href: '/rms/tables' },
            { label: t('tables.add', 'Add') },
          ]}
        />

        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-2xl bg-white p-6 shadow-card ring-1 ring-gray-950/[0.04] dark:bg-gray-900 dark:ring-gray-800"
        >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-gray-700 dark:text-gray-300">
              {t('branch', 'Branch')} <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={branches.map((b) => ({ value: b.id, label: b.name }))}
              value={form.branchId}
              onChange={(v) => setForm((f) => ({ ...f, branchId: v }))}
              placeholder={t('selectBranch', 'Select branch')}
              focusColor="red"
            />
          </div>

            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-gray-700 dark:text-gray-300">
                {t('tables.seatsPerTable', 'Seats per table')}
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={form.capacity}
                onChange={(e) => setForm((f) => ({ ...f, capacity: parseInt(e.target.value) || 1 }))}
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-gray-700 dark:text-gray-300">
                {form.quantity > 1 ? t('tables.namePrefix', 'Name prefix') : t('tables.name', 'Name')}{' '}
                <span className="text-red-500">*</span>
              </label>
              <input
                autoFocus
                value={form.prefix}
                onChange={(e) => setForm((f) => ({ ...f, prefix: e.target.value }))}
                placeholder={t('tables.tableNamePlaceholder', 'e.g. Table')}
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-gray-700 dark:text-gray-300">
                {t('tables.howMany', 'How many?')}
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: parseInt(e.target.value) || 1 }))}
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {form.quantity > 1 && (
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-gray-700 dark:text-gray-300">
                  {t('tables.startNumberingAt', 'Start numbering at')}
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.startNumber}
                  onChange={(e) => setForm((f) => ({ ...f, startNumber: parseInt(e.target.value) || 1 }))}
                  className={inputCls}
                />
              </div>
            )}
          </div>

          {/* Live preview so the batch is unambiguous before creating. */}
          <div className="rounded-xl bg-gray-50 px-4 py-3 text-[13px] dark:bg-gray-800/50">
            <span className="text-gray-500 dark:text-gray-400">{t('tables.willCreate', 'Will create ')}</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {names.length === 1
                ? t('tables.oneTable', '{{count}} table', { count: names.length })
                : t('tables.manyTables', '{{count}} tables', { count: names.length })}
            </span>
            <span className="text-gray-500 dark:text-gray-400">{t('tables.previewList', ': {{names}}', { names: previewLabel })}</span>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => router.back()} disabled={saving}>
              {t('cancel', 'Cancel')}
            </Button>
            <Button type="submit" loading={saving} disabled={!form.branchId || !form.prefix.trim()}>
              {form.quantity > 1
                ? t('tables.createNTables', 'Create {{count}} tables', { count: names.length })
                : t('tables.createTable', 'Create table')}
            </Button>
          </div>
        </form>
      </div>
    </PermissionGuard>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => ({
  props: { ...(await serverSideTranslations(locale || 'en', ['common'])) },
});
