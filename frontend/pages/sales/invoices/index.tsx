import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { api } from '@/lib/api';
import Toast from '@/components/Toast';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import StatCard from '@/components/ui/StatCard';
import FilterBar, { type FilterValues } from '@/components/ui/FilterBar';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable';
import InvoiceStatusBadge from '@/components/ui/InvoiceStatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { formatMoney, formatDate, downloadCsv, useCurrency } from '@/lib/format';

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

interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customer?: { name: string };
  issueDate: string;
  dueDate: string;
  status: 'DRAFT' | 'SENT' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'VOID';
  currency?: string;
  total: number;
  amountPaid: number;
  balance: number;
}

interface InvoiceSummary {
  totalOutstanding: number;
  totalOverdue: number;
  paidThisMonth: number;
}

interface CustomerOption {
  id: string;
  name: string;
}

const PAGE_SIZE = 10;

export default function InvoicesPage() {
  const router = useRouter();
  const currency = useCurrency();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [summary, setSummary] = useState<InvoiceSummary | null>(null);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [filters, setFilters] = useState<FilterValues>({ search: '', status: '', customerId: '' });
  const search = (filters.search as string) || '';
  const status = (filters.status as string) || '';
  const customerId = (filters.customerId as string) || '';
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const res = await api.get<{ success: boolean; data: { items: CustomerOption[] } }>('/customers?page=1&limit=100');
        if (res.success) setCustomers(res.data.items || []);
      } catch (err) {
        console.error('Failed to load customers:', err);
      }
    };
    loadCustomers();
  }, []);

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (status) params.set('status', status);
      if (customerId) params.set('customerId', customerId);
      if (debouncedSearch) params.set('search', debouncedSearch);
      const res = await api.get<{
        success: boolean;
        data: { items: Invoice[]; total: number; summary?: InvoiceSummary };
      }>(`/invoices?${params.toString()}`);
      if (res.success) {
        setInvoices(res.data.items || []);
        setTotal(res.data.total || 0);
        if (res.data.summary) setSummary(res.data.summary);
      }
    } catch (err: any) {
      console.error('Failed to load invoices:', err);
      setToast({ message: err.response?.data?.message || 'Failed to load invoices', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page, status, customerId, debouncedSearch]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  useEffect(() => {
    setPage(1);
  }, [status, customerId, debouncedSearch]);

  const columns: DataTableColumn<Invoice>[] = [
    {
      key: 'invoiceNumber',
      label: 'Invoice #',
      render: (inv) => <span className="font-medium text-gray-900 dark:text-white">{inv.invoiceNumber}</span>,
    },
    {
      key: 'customer',
      label: 'Customer',
      render: (inv) =>
        inv.customer?.name ? (
          <div className="flex items-center gap-3">
            <Avatar name={inv.customer.name} />
            <span className="text-gray-900 dark:text-gray-100">{inv.customer.name}</span>
          </div>
        ) : (
          '-'
        ),
    },
    { key: 'issueDate', label: 'Issued', render: (inv) => formatDate(inv.issueDate) },
    {
      key: 'dueDate',
      label: 'Due',
      render: (inv) => (
        <span className={inv.status === 'OVERDUE' ? 'text-red-600 dark:text-red-400 font-medium' : ''}>
          {formatDate(inv.dueDate)}
        </span>
      ),
    },
    {
      key: 'total',
      label: 'Total',
      align: 'right',
      render: (inv) => formatMoney(inv.total, currency),
    },
    {
      key: 'amountPaid',
      label: 'Paid',
      align: 'right',
      render: (inv) => formatMoney(inv.amountPaid, currency),
    },
    {
      key: 'status',
      label: 'Status',
      render: (inv) => <InvoiceStatusBadge status={inv.status} size="sm" />,
    },
  ];

  const handleExport = () => {
    if (invoices.length === 0) return;
    downloadCsv(
      `invoices-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Invoice #', 'Customer', 'Issued', 'Due', 'Total', 'Paid', 'Balance', 'Status'],
      invoices.map((inv) => [
        inv.invoiceNumber,
        inv.customer?.name || '',
        formatDate(inv.issueDate),
        formatDate(inv.dueDate),
        Number(inv.total ?? 0).toFixed(2),
        Number(inv.amountPaid ?? 0).toFixed(2),
        Number(inv.balance ?? 0).toFixed(2),
        inv.status,
      ]),
    );
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const startIndex = (page - 1) * PAGE_SIZE;
  const hasFilters = !!status || !!customerId || !!debouncedSearch;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Invoices"
        count={loading ? undefined : total}
        subtitle="Bill customers and track payments"
        breadcrumbs={[{ label: 'Sales' }, { label: 'Invoices' }]}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={handleExport} disabled={loading || invoices.length === 0}>
              <i className="bx bx-download"></i>
              Export CSV
            </Button>
            <Button href="/sales/invoices/new" size="sm">
              <i className="bx bx-plus"></i>
              New Invoice
            </Button>
          </>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {loading && !summary ? (
          <CardSkeleton count={3} />
        ) : (
          <>
            <StatCard
              label="Outstanding"
              value={formatMoney(summary?.totalOutstanding ?? 0, currency)}
              icon="bx-hourglass"
              tone="warning"
            />
            <StatCard
              label="Overdue"
              value={formatMoney(summary?.totalOverdue ?? 0, currency)}
              icon="bx-time-five"
              tone="error"
            />
            <StatCard
              label="Paid This Month"
              value={formatMoney(summary?.paidThisMonth ?? 0, currency)}
              icon="bx-check-circle"
              tone="success"
            />
          </>
        )}
      </div>

      <FilterBar
        filters={[
          { key: 'search', type: 'text', placeholder: 'Search invoices...', className: 'flex-1 min-w-[220px]' },
          {
            key: 'status',
            type: 'select',
            placeholder: 'All statuses',
            className: 'w-full sm:w-52',
            options: [
              { value: '', label: 'All statuses' },
              { value: 'DRAFT', label: 'Draft' },
              { value: 'SENT', label: 'Sent' },
              { value: 'PARTIALLY_PAID', label: 'Partially paid' },
              { value: 'PAID', label: 'Paid' },
              { value: 'OVERDUE', label: 'Overdue' },
              { value: 'VOID', label: 'Void' },
            ],
          },
          {
            key: 'customerId',
            type: 'select',
            placeholder: 'All customers',
            className: 'w-full sm:w-64',
            options: [{ value: '', label: 'All customers' }, ...customers.map((c) => ({ value: c.id, label: c.name }))],
          },
        ]}
        values={filters}
        onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
        onClear={() => setFilters({ search: '', status: '', customerId: '' })}
      />

      <DataTable<Invoice>
        columns={columns}
        data={invoices}
        loading={loading}
        onRowClick={(inv) => router.push(`/sales/invoices/${inv.id}`)}
        pagination={{
          page,
          totalPages,
          startIndex,
          endIndex: Math.min(startIndex + invoices.length, total),
          totalItems: total,
          onPageChange: setPage,
        }}
        emptyState={
          <EmptyState
            icon="bx-receipt"
            title={hasFilters ? 'No invoices match your filters' : 'No invoices yet'}
            description={hasFilters ? 'Try adjusting your filters' : 'Create your first invoice to start billing customers'}
            actions={
              <Button href="/sales/invoices/new" size="sm">
                New Invoice
              </Button>
            }
          />
        }
      />

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
