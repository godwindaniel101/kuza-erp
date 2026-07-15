import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { api } from '@/lib/api';
import Toast from '@/components/Toast';
import PageHeader from '@/components/ui/PageHeader';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import InvoiceStatusBadge from '@/components/ui/InvoiceStatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import { Skeleton, TableSkeleton, CardSkeleton } from '@/components/ui/Skeleton';
import { formatMoney, formatDate, useCurrency } from '@/lib/format';

interface CustomerDetail {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  creditLimit?: number;
  isActive: boolean;
  notes?: string;
  totalInvoiced: number;
  totalPaid: number;
  balance: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  status: string;
  currency?: string;
  total: number;
  amountPaid: number;
  balance: number;
}

export default function CustomerDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const currency = useCurrency();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const load = useCallback(async () => {
    if (!id || typeof id !== 'string') return;
    setLoading(true);
    setInvoicesLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: CustomerDetail }>(`/customers/${id}`);
      if (res.success) setCustomer(res.data);
    } catch (err: any) {
      console.error('Failed to load customer:', err);
      setNotFound(true);
      setToast({ message: err.response?.data?.message || 'Failed to load customer', type: 'error' });
    } finally {
      setLoading(false);
    }
    try {
      const res = await api.get<{ success: boolean; data: { items: Invoice[] } }>(
        `/invoices?customerId=${id}&page=1&limit=50`,
      );
      if (res.success) setInvoices(res.data.items || []);
    } catch (err: any) {
      console.error('Failed to load invoices:', err);
      setToast({ message: err.response?.data?.message || 'Failed to load invoices', type: 'error' });
    } finally {
      setInvoicesLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <PageHeader
        title={customer?.name || 'Customer'}
        subtitle={customer?.email || undefined}
        breadcrumbs={[
          { label: 'Sales' },
          { label: 'Customers', href: '/sales/customers' },
          { label: customer?.name || 'Detail' },
        ]}
        actions={
          customer ? (
            <StatusBadge
              variant={customer.isActive ? 'success' : 'error'}
              label={customer.isActive ? 'Active' : 'Inactive'}
              size="lg"
            />
          ) : undefined
        }
      />

      {loading ? (
        <div className="mx-auto w-full max-w-5xl space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <CardSkeleton count={3} />
          </div>
          <Skeleton className="h-40 w-full" />
        </div>
      ) : notFound || !customer ? (
        <EmptyState
          icon="bx-user-x"
          title="Customer not found"
          description="It may have been removed, or the link is invalid"
          actions={
            <Link
              href="/sales/customers"
              className="h-8 px-3 bg-red-600 dark:bg-red-700 text-white rounded-lg text-[13px] font-medium hover:bg-red-700 dark:hover:bg-red-600"
            >
              Back to Customers
            </Link>
          }
        />
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <StatCard
              label="Total Invoiced"
              value={formatMoney(customer.totalInvoiced, currency)}
              icon="bx-receipt"
              tone="info"
            />
            <StatCard label="Total Paid" value={formatMoney(customer.totalPaid, currency)} icon="bx-check-circle" tone="success" />
            <StatCard
              label="Outstanding Balance"
              value={formatMoney(customer.balance, currency)}
              icon="bx-wallet"
              tone={Number(customer.balance) > 0 ? 'warning' : 'default'}
            />
          </div>

          {/* Profile */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 p-5 mb-6">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide mb-4">Profile</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div>
                <dt className="text-2xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase">Email</dt>
                <dd className="mt-1 text-gray-900 dark:text-white">{customer.email || '-'}</dd>
              </div>
              <div>
                <dt className="text-2xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase">Phone</dt>
                <dd className="mt-1 text-gray-900 dark:text-white">{customer.phone || '-'}</dd>
              </div>
              <div>
                <dt className="text-2xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase">Address</dt>
                <dd className="mt-1 text-gray-900 dark:text-white">{customer.address || '-'}</dd>
              </div>
              <div>
                <dt className="text-2xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase">Tax ID</dt>
                <dd className="mt-1 text-gray-900 dark:text-white">{customer.taxId || '-'}</dd>
              </div>
              <div>
                <dt className="text-2xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase">Credit Limit</dt>
                <dd className="mt-1 text-gray-900 dark:text-white">
                  {customer.creditLimit != null ? formatMoney(customer.creditLimit, currency) : '-'}
                </dd>
              </div>
              <div>
                <dt className="text-2xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase">Notes</dt>
                <dd className="mt-1 text-gray-900 dark:text-white">{customer.notes || '-'}</dd>
              </div>
            </dl>
          </div>

          {/* Invoices */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Invoices</h2>
            <Link
              href="/sales/invoices/new"
              className="text-sm text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
            >
              <i className="bx bx-plus" aria-hidden="true"></i>
              New Invoice
            </Link>
          </div>

          {invoicesLoading ? (
            <TableSkeleton rows={4} columns={6} />
          ) : invoices.length === 0 ? (
            <EmptyState
              icon="bx-receipt"
              title="No invoices yet"
              description="This customer has not been invoiced"
            />
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-6 py-2.5 text-left text-2xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase">Invoice #</th>
                      <th className="px-6 py-2.5 text-left text-2xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase">Issued</th>
                      <th className="px-6 py-2.5 text-left text-2xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase">Due</th>
                      <th className="px-6 py-2.5 text-right text-2xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase">Total</th>
                      <th className="px-6 py-2.5 text-right text-2xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase">Balance</th>
                      <th className="px-6 py-2.5 text-left text-2xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {invoices.map((inv) => (
                      <tr
                        key={inv.id}
                        onClick={() => router.push(`/sales/invoices/${inv.id}`)}
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      >
                        <td className="px-6 py-3 whitespace-nowrap text-[13px] font-medium text-gray-900 dark:text-white">
                          {inv.invoiceNumber}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-[13px] text-gray-700 dark:text-gray-300">
                          {formatDate(inv.issueDate)}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-[13px] text-gray-700 dark:text-gray-300">
                          {formatDate(inv.dueDate)}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-[13px] text-right text-gray-700 dark:text-gray-300">
                          {formatMoney(inv.total, inv.currency || currency)}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-[13px] text-right text-gray-700 dark:text-gray-300">
                          {formatMoney(inv.balance, inv.currency || currency)}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap">
                          <InvoiceStatusBadge status={inv.status} size="sm" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

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
