import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { api } from '@/lib/api';
import Toast from '@/components/Toast';
import Modal from '@/components/Modal';
import PageHeader from '@/components/ui/PageHeader';
import FilterBar, { type FilterValues } from '@/components/ui/FilterBar';
import DataTable, { type DataTableColumn, type RowAction } from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import FormField from '@/components/ui/FormField';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { formatMoney, useCurrency } from '@/lib/format';

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
  const currency = useCurrency();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [filters, setFilters] = useState<FilterValues>({ search: '' });
  const search = (filters.search as string) || '';
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
      setToast({ message: err.response?.data?.message || 'Failed to load customers', type: 'error' });
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
      setToast({ message: 'Name is required', type: 'error' });
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
        setToast({ message: 'Customer updated', type: 'success' });
      } else {
        await api.post('/customers', payload);
        setToast({ message: 'Customer created', type: 'success' });
      }
      setForm(null);
      await loadCustomers();
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || 'Failed to save customer', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/customers/${deleteTarget.id}`);
      setToast({ message: 'Customer deleted', type: 'success' });
      setDeleteTarget(null);
      await loadCustomers();
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || 'Failed to delete customer', type: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const columns: DataTableColumn<Customer>[] = [
    {
      key: 'name',
      label: 'Name',
      render: (c) => <span className="font-medium text-gray-900 dark:text-white">{c.name}</span>,
    },
    { key: 'email', label: 'Email', render: (c) => c.email || '-' },
    { key: 'phone', label: 'Phone', render: (c) => c.phone || '-' },
    {
      key: 'creditLimit',
      label: 'Credit Limit',
      align: 'right',
      render: (c) => (c.creditLimit != null ? formatMoney(c.creditLimit, currency) : '-'),
    },
    {
      key: 'status',
      label: 'Status',
      render: (c) => (
        <StatusBadge variant={c.isActive ? 'success' : 'error'} label={c.isActive ? 'Active' : 'Inactive'} size="sm" />
      ),
    },
  ];

  const rowActions: RowAction<Customer>[] = [
    {
      label: 'View',
      icon: 'bx-show',
      iconColor: 'text-green-600',
      onClick: (c) => router.push(`/sales/customers/${c.id}`),
    },
    {
      label: 'Edit',
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
      label: 'Delete',
      icon: 'bx-trash',
      iconColor: 'text-red-600',
      danger: true,
      onClick: (c) => setDeleteTarget(c),
    },
  ];

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const startIndex = (page - 1) * PAGE_SIZE;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Customers"
        count={loading ? undefined : total}
        subtitle="Manage the people and businesses you invoice"
        breadcrumbs={[{ label: 'Sales' }, { label: 'Customers' }]}
        actions={
          <Button size="sm" onClick={() => setForm({ ...emptyForm })}>
            <i className="bx bx-plus"></i>
            Add Customer
          </Button>
        }
      />

      <FilterBar
        filters={[
          {
            key: 'search',
            type: 'text',
            placeholder: 'Search customers...',
            className: 'flex-1 min-w-[240px]',
          },
        ]}
        values={filters}
        onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
        onClear={() => setFilters({ search: '' })}
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
            title={debouncedSearch ? 'No customers found' : 'No customers yet'}
            description={debouncedSearch ? 'Try a different search term' : 'Add your first customer to start invoicing'}
            actions={
              <Button size="sm" onClick={() => setForm({ ...emptyForm })}>
                Add Customer
              </Button>
            }
          />
        }
      />

      {/* Add / edit modal */}
      <Modal isOpen={!!form} onClose={() => setForm(null)} title={form?.id ? 'Edit Customer' : 'Add Customer'} maxWidth="xl">
        {form && (
          <div className="space-y-4">
            <FormField
              label="Name"
              name="customer-name"
              required
              value={form.name}
              onChange={(v) => setForm((f) => (f ? { ...f, name: v } : f))}
              placeholder="Customer or business name"
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Email"
                name="customer-email"
                type="email"
                value={form.email}
                onChange={(v) => setForm((f) => (f ? { ...f, email: v } : f))}
              />
              <FormField
                label="Phone"
                name="customer-phone"
                value={form.phone}
                onChange={(v) => setForm((f) => (f ? { ...f, phone: v } : f))}
              />
            </div>
            <FormField
              label="Address"
              name="customer-address"
              value={form.address}
              onChange={(v) => setForm((f) => (f ? { ...f, address: v } : f))}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Tax ID"
                name="customer-taxid"
                value={form.taxId}
                onChange={(v) => setForm((f) => (f ? { ...f, taxId: v } : f))}
              />
              <FormField
                label="Credit Limit"
                name="customer-creditlimit"
                type="number"
                min={0}
                value={form.creditLimit}
                onChange={(v) => setForm((f) => (f ? { ...f, creditLimit: v } : f))}
              />
            </div>
            <FormField
              label="Notes"
              name="customer-notes"
              type="textarea"
              value={form.notes}
              onChange={(v) => setForm((f) => (f ? { ...f, notes: v } : f))}
            />
            <div className="flex justify-end space-x-3 pt-2">
              <Button variant="secondary" type="button" onClick={() => setForm(null)} disabled={saving}>
                Cancel
              </Button>
              <Button type="button" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : form.id ? 'Save Changes' : 'Create Customer'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete confirm */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Customer" maxWidth="md">
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Are you sure you want to delete{' '}
            <strong className="text-gray-900 dark:text-gray-100">{deleteTarget?.name}</strong>?
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">This action cannot be undone.</p>
          <div className="flex justify-end space-x-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="danger" type="button" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
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
