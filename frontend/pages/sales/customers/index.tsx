import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { api } from '@/lib/api';
import Toast from '@/components/Toast';
import Modal from '@/components/Modal';
import PageHeader from '@/components/ui/PageHeader';
import DataTable, { type DataTableColumn, type RowAction } from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import FormField from '@/components/ui/FormField';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { formatMoney, downloadCsv, useCurrency } from '@/lib/format';
import { usePageSearch } from '@/store/searchStore';

const AVATAR_TONES = [
  'bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
];

function Avatar({ name }: { name: string }) {
  const initials =
    (name || '?')
      .split(' ')
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?';
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  const tone = AVATAR_TONES[hash % AVATAR_TONES.length];
  return (
    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${tone}`}>
      {initials}
    </span>
  );
}

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  creditLimit?: number;
  isActive: boolean;
  notes?: string;
}

interface CustomerForm {
  id?: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  taxId: string;
  creditLimit: string;
  notes: string;
}

const emptyForm: CustomerForm = { name: '', email: '', phone: '', address: '', taxId: '', creditLimit: '', notes: '' };
const PAGE_SIZE = 10;

export default function CustomersPage() {
  const router = useRouter();
  const { t } = useTranslation('common');
  const currency = useCurrency();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const search = usePageSearch(t('customers.searchPlaceholder', 'Search customers...'));
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [form, setForm] = useState<CustomerForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (debouncedSearch) params.set('search', debouncedSearch);
      const res = await api.get<{ success: boolean; data: { items: Customer[]; total: number } }>(
        `/customers?${params.toString()}`,
      );
      if (res.success) {
        setCustomers(res.data.items || []);
        setTotal(res.data.total || 0);
      }
    } catch (err: any) {
      console.error('Failed to load customers:', err);
      setToast({ message: err.response?.data?.message || t('customers.failedToLoad', 'Failed to load customers'), type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const handleSave = async () => {
    if (!form) return;
    if (!form.name.trim()) {
      setToast({ message: t('customers.nameRequired', 'Name is required'), type: 'error' });
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      address: form.address.trim() || undefined,
      taxId: form.taxId.trim() || undefined,
      creditLimit: form.creditLimit !== '' ? Number(form.creditLimit) : undefined,
      notes: form.notes.trim() || undefined,
    };
    try {
      if (form.id) {
        await api.patch(`/customers/${form.id}`, payload);
        setToast({ message: t('customers.updated', 'Customer updated'), type: 'success' });
      } else {
        await api.post('/customers', payload);
        setToast({ message: t('customers.created', 'Customer created'), type: 'success' });
      }
      setForm(null);
      await loadCustomers();
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || t('customers.failedToSave', 'Failed to save customer'), type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/customers/${deleteTarget.id}`);
      setToast({ message: t('customers.deleted', 'Customer deleted'), type: 'success' });
      setDeleteTarget(null);
      await loadCustomers();
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || t('customers.failedToDelete', 'Failed to delete customer'), type: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const columns: DataTableColumn<Customer>[] = [
    {
      key: 'name',
      label: t('name', 'Name'),
      render: (c) => (
        <div className="flex items-center gap-3">
          <Avatar name={c.name} />
          <span className="font-medium text-gray-900 dark:text-white">{c.name}</span>
        </div>
      ),
    },
    { key: 'email', label: t('email', 'Email'), render: (c) => c.email || '-' },
    { key: 'phone', label: t('phone', 'Phone'), render: (c) => c.phone || '-' },
    {
      key: 'creditLimit',
      label: t('customers.creditLimit', 'Credit Limit'),
      align: 'right',
      render: (c) => (c.creditLimit != null ? formatMoney(c.creditLimit, currency) : '-'),
    },
    {
      key: 'status',
      label: t('status', 'Status'),
      render: (c) => (
        <StatusBadge
          variant={c.isActive ? 'success' : 'error'}
          label={c.isActive ? t('active', 'Active') : t('inactive', 'Inactive')}
          size="sm"
        />
      ),
    },
  ];

  const rowActions: RowAction<Customer>[] = [
    {
      label: t('customers.view', 'View'),
      icon: 'bx-show',
      iconColor: 'text-green-600',
      onClick: (c) => router.push(`/sales/customers/${c.id}`),
    },
    {
      label: t('edit', 'Edit'),
      icon: 'bx-edit',
      iconColor: 'text-blue-600',
      onClick: (c) =>
        setForm({
          id: c.id,
          name: c.name || '',
          email: c.email || '',
          phone: c.phone || '',
          address: c.address || '',
          taxId: c.taxId || '',
          creditLimit: c.creditLimit != null ? String(c.creditLimit) : '',
          notes: c.notes || '',
        }),
    },
    {
      label: t('delete', 'Delete'),
      icon: 'bx-trash',
      iconColor: 'text-red-600',
      danger: true,
      onClick: (c) => setDeleteTarget(c),
    },
  ];

  const handleExport = () => {
    if (customers.length === 0) return;
    downloadCsv(
      `customers-${new Date().toISOString().slice(0, 10)}.csv`,
      [t('name', 'Name'), t('email', 'Email'), t('phone', 'Phone'), t('customers.creditLimit', 'Credit Limit'), t('status', 'Status')],
      customers.map((c) => [
        c.name,
        c.email || '',
        c.phone || '',
        c.creditLimit != null ? Number(c.creditLimit).toFixed(2) : '',
        c.isActive ? t('active', 'Active') : t('inactive', 'Inactive'),
      ]),
    );
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const startIndex = (page - 1) * PAGE_SIZE;

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('customers.title', 'Customers')}
        count={loading ? undefined : total}
        subtitle={t('customers.subtitle', 'Manage the people and businesses you invoice')}
        breadcrumbs={[{ label: t('customers.sales', 'Sales') }, { label: t('customers.title', 'Customers') }]}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={handleExport} disabled={loading || customers.length === 0}>
              <i className="bx bx-download"></i>
              {t('customers.exportCsv', 'Export CSV')}
            </Button>
            <Button size="sm" onClick={() => setForm({ ...emptyForm })}>
              <i className="bx bx-plus"></i>
              {t('customers.addCustomer', 'Add Customer')}
            </Button>
          </>
        }
      />

      <DataTable<Customer>
        columns={columns}
        data={customers}
        loading={loading}
        rowActions={rowActions}
        onRowClick={(c) => router.push(`/sales/customers/${c.id}`)}
        pagination={{
          page,
          totalPages,
          startIndex,
          endIndex: Math.min(startIndex + customers.length, total),
          totalItems: total,
          onPageChange: setPage,
        }}
        emptyState={
          <EmptyState
            icon="bx-user"
            title={debouncedSearch ? t('customers.noCustomersFound', 'No customers found') : t('customers.noCustomersYet', 'No customers yet')}
            description={debouncedSearch ? t('customers.tryDifferentSearch', 'Try a different search term') : t('customers.addFirstCustomer', 'Add your first customer to start invoicing')}
            actions={
              <Button size="sm" onClick={() => setForm({ ...emptyForm })}>
                {t('customers.addCustomer', 'Add Customer')}
              </Button>
            }
          />
        }
      />

      {/* Add / edit modal */}
      <Modal isOpen={!!form} onClose={() => setForm(null)} title={form?.id ? t('customers.editCustomer', 'Edit Customer') : t('customers.addCustomer', 'Add Customer')} maxWidth="xl">
        {form && (
          <div className="space-y-4">
            <FormField
              label={t('name', 'Name')}
              name="customer-name"
              required
              value={form.name}
              onChange={(v) => setForm((f) => (f ? { ...f, name: v } : f))}
              placeholder={t('customers.namePlaceholder', 'Customer or business name')}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                label={t('email', 'Email')}
                name="customer-email"
                type="email"
                value={form.email}
                onChange={(v) => setForm((f) => (f ? { ...f, email: v } : f))}
              />
              <FormField
                label={t('phone', 'Phone')}
                name="customer-phone"
                value={form.phone}
                onChange={(v) => setForm((f) => (f ? { ...f, phone: v } : f))}
              />
            </div>
            <FormField
              label={t('address', 'Address')}
              name="customer-address"
              value={form.address}
              onChange={(v) => setForm((f) => (f ? { ...f, address: v } : f))}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                label={t('customers.taxId', 'Tax ID')}
                name="customer-taxid"
                value={form.taxId}
                onChange={(v) => setForm((f) => (f ? { ...f, taxId: v } : f))}
              />
              <FormField
                label={t('customers.creditLimit', 'Credit Limit')}
                name="customer-creditlimit"
                type="number"
                min={0}
                value={form.creditLimit}
                onChange={(v) => setForm((f) => (f ? { ...f, creditLimit: v } : f))}
              />
            </div>
            <FormField
              label={t('customers.notes', 'Notes')}
              name="customer-notes"
              type="textarea"
              value={form.notes}
              onChange={(v) => setForm((f) => (f ? { ...f, notes: v } : f))}
            />
            <div className="flex justify-end space-x-3 pt-2">
              <Button variant="secondary" type="button" onClick={() => setForm(null)} disabled={saving}>
                {t('cancel', 'Cancel')}
              </Button>
              <Button type="button" onClick={handleSave} disabled={saving}>
                {saving ? t('customers.saving', 'Saving...') : form.id ? t('customers.saveChanges', 'Save Changes') : t('customers.createCustomer', 'Create Customer')}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete confirm */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title={t('customers.deleteCustomer', 'Delete Customer')} maxWidth="md">
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            {t('customers.confirmDeletePrefix', 'Are you sure you want to delete')}{' '}
            <strong className="text-gray-900 dark:text-gray-100">{deleteTarget?.name}</strong>?
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">{t('customers.actionCannotBeUndone', 'This action cannot be undone.')}</p>
          <div className="flex justify-end space-x-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              {t('cancel', 'Cancel')}
            </Button>
            <Button variant="danger" type="button" onClick={handleDelete} disabled={deleting}>
              {deleting ? t('customers.deleting', 'Deleting...') : t('delete', 'Delete')}
            </Button>
          </div>
        </div>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
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
