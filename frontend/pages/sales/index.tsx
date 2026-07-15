import { useState, useEffect, useMemo } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { api } from '@/lib/api';
import PageHeader from '@/components/ui/PageHeader';
import StatCard from '@/components/ui/StatCard';
import Button from '@/components/ui/Button';
import Card from '@/components/Card';
import InvoiceStatusBadge from '@/components/ui/InvoiceStatusBadge';
import { RevenueAreaChart, type AreaPoint } from '@/components/ui/charts';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { formatMoney, formatDate, useCurrency } from '@/lib/format';

interface InvoiceSummary {
  totalOutstanding: number;
  totalOverdue: number;
  paidThisMonth: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  customer?: { name: string };
  issueDate: string;
  dueDate: string;
  status: 'DRAFT' | 'SENT' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'VOID';
  currency?: string;
  total: number;
  amountPaid: number;
  balance: number;
}

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
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold ${AVATAR_TONES[i % AVATAR_TONES.length]}`}>
      {initials}
    </span>
  );
}

export default function SalesDashboardPage() {
  const currency = useCurrency();
  const [greeting, setGreeting] = useState('Welcome back');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<InvoiceSummary>({ totalOutstanding: 0, totalOverdue: 0, paidThisMonth: 0 });
  const [invoiceCount, setInvoiceCount] = useState(0);
  const [customerCount, setCustomerCount] = useState(0);
  const [recent, setRecent] = useState<Invoice[]>([]);

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening');
    (async () => {
      try {
        const [inv, cust, recentInv] = await Promise.allSettled([
          api.get<{ success: boolean; data: { total: number; summary?: InvoiceSummary } }>('/invoices?page=1&limit=1'),
          api.get<{ success: boolean; data: { total: number } }>('/customers?page=1&limit=1'),
          api.get<{ success: boolean; data: { items: Invoice[] } }>('/invoices?page=1&limit=20'),
        ]);
        if (inv.status === 'fulfilled' && inv.value.success) {
          setInvoiceCount(inv.value.data.total || 0);
          if (inv.value.data.summary) setSummary(inv.value.data.summary);
        }
        if (cust.status === 'fulfilled' && cust.value.success) {
          setCustomerCount(cust.value.data.total || 0);
        }
        if (recentInv.status === 'fulfilled' && recentInv.value.success) {
          setRecent(recentInv.value.data.items || []);
        }
      } catch {
        // graceful
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Invoiced amount by day over the last 14 days, derived from recent invoices.
  const chartData = useMemo<AreaPoint[]>(() => {
    const days: { key: string; label: string; value: number }[] = [];
    const byDay: Record<string, number> = {};
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().split('T')[0];
      byDay[key] = 0;
      days.push({ key, label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), value: 0 });
    }
    recent.forEach((inv) => {
      if (!inv.issueDate) return;
      const key = new Date(inv.issueDate).toISOString().split('T')[0];
      if (key in byDay) byDay[key] += Number(inv.total) || 0;
    });
    return days.map((d) => ({ label: d.label, value: byDay[d.key] || 0 }));
  }, [recent]);

  // Top customers by amount owed, aggregated from recent invoices.
  const topCustomers = useMemo(() => {
    const map: Record<string, { name: string; owed: number; total: number; count: number }> = {};
    recent.forEach((inv) => {
      const name = inv.customer?.name || 'Unknown customer';
      if (!map[name]) map[name] = { name, owed: 0, total: 0, count: 0 };
      map[name].owed += Number(inv.balance) || 0;
      map[name].total += Number(inv.total) || 0;
      map[name].count += 1;
    });
    return Object.values(map)
      .sort((a, b) => b.owed - a.owed || b.total - a.total)
      .slice(0, 5);
  }, [recent]);

  const recentInvoices = recent.slice(0, 6);

  const collected = summary.paidThisMonth;
  const owed = summary.totalOutstanding;
  const cashTotal = Math.max(1, collected + owed);

  const statusLine =
    summary.totalOverdue > 0
      ? `You have ${formatMoney(summary.totalOverdue, currency)} overdue — chase these payments`
      : summary.totalOutstanding > 0
      ? `${formatMoney(summary.totalOutstanding, currency)} outstanding across ${invoiceCount} invoice${invoiceCount === 1 ? '' : 's'}`
      : 'You are all caught up — no money owed to you';

  return (
    <div className="space-y-5">
      <PageHeader
        title={`${greeting} 👋`}
        subtitle={statusLine}
        breadcrumbs={[{ label: 'Sales' }, { label: 'Overview' }]}
        actions={
          <div className="flex gap-2">
            <Button href="/sales/customers" variant="secondary" size="md">
              <i className="bx bx-user-plus" /> New Customer
            </Button>
            <Button href="/sales/invoices/new" size="md">
              <i className="bx bx-plus" /> New Invoice
            </Button>
          </div>
        }
      />

      {/* KPI row */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((k) => (
            <CardSkeleton key={k} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Outstanding"
            value={formatMoney(summary.totalOutstanding, currency)}
            icon="bx-hourglass"
            tone="warning"
            caption="awaiting payment"
          />
          <StatCard
            label="Overdue"
            value={formatMoney(summary.totalOverdue, currency)}
            icon="bx-error-circle"
            tone="error"
            caption={summary.totalOverdue > 0 ? 'needs chasing' : 'nothing overdue'}
          />
          <StatCard
            label="Paid this month"
            value={formatMoney(summary.paidThisMonth, currency)}
            icon="bx-check-circle"
            tone="success"
            caption="collected"
          />
          <StatCard
            label="Customers"
            value={customerCount}
            icon="bx-group"
            tone="info"
            caption={`${invoiceCount} invoice${invoiceCount === 1 ? '' : 's'}`}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Invoiced trend */}
        <Card title="Invoiced, last 14 days" subtitle="Total billed per day" className="lg:col-span-2">
          {loading ? (
            <div className="h-40 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
          ) : (
            <div className="pt-1">
              <RevenueAreaChart
                data={chartData}
                formatValue={(v) => formatMoney(v, currency)}
                emptyMessage="No invoices billed recently"
              />
            </div>
          )}
        </Card>

        {/* Cash position */}
        <Card title="Cash position">
          <div className="space-y-4 pt-1">
            <div>
              <div className="mb-1 flex items-center justify-between text-[13px]">
                <span className="text-gray-700 dark:text-gray-300">Collected this month</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  {formatMoney(collected, currency)}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(collected / cashTotal) * 100}%` }} />
              </div>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-[13px]">
                <span className="text-gray-700 dark:text-gray-300">Outstanding</span>
                <span className="font-medium text-amber-600 dark:text-amber-400">{formatMoney(owed, currency)}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <div className="h-full rounded-full bg-amber-500" style={{ width: `${(owed / cashTotal) * 100}%` }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="rounded-xl bg-red-50 p-3 dark:bg-red-500/10">
                <p className="text-lg font-bold text-red-600 dark:text-red-400">{formatMoney(summary.totalOverdue, currency)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Overdue</p>
              </div>
              <div className="rounded-xl bg-sky-50 p-3 dark:bg-sky-500/10">
                <p className="text-lg font-bold text-sky-600 dark:text-sky-400">{invoiceCount}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Invoices</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Recent invoices */}
        <Card padding={false}>
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Recent invoices</h3>
            <Button href="/sales/invoices" variant="ghost" size="sm">
              View all
            </Button>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <p className="p-5 text-sm text-gray-400">Loading…</p>
            ) : recentInvoices.length === 0 ? (
              <p className="p-5 text-sm text-gray-400">No invoices yet.</p>
            ) : (
              recentInvoices.map((inv, i) => {
                const name = inv.customer?.name || 'Customer';
                return (
                  <div key={inv.id || i} className="flex items-center gap-3 px-5 py-3">
                    <Avatar name={name} i={i} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{name}</p>
                      <p className="truncate text-xs text-gray-500">
                        {inv.invoiceNumber} · {formatDate(inv.issueDate)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {formatMoney(inv.total, inv.currency || currency)}
                      </span>
                      <InvoiceStatusBadge status={inv.status} size="sm" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Top customers */}
        <Card padding={false}>
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Top customers</h3>
            <Button href="/sales/customers" variant="ghost" size="sm">
              View all
            </Button>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <p className="p-5 text-sm text-gray-400">Loading…</p>
            ) : topCustomers.length === 0 ? (
              <p className="p-5 text-sm text-gray-400">No customer activity yet.</p>
            ) : (
              topCustomers.map((c, i) => (
                <div key={c.name} className="flex items-center gap-3 px-5 py-3">
                  <Avatar name={c.name} i={i} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{c.name}</p>
                    <p className="truncate text-xs text-gray-500">
                      {c.count} invoice{c.count === 1 ? '' : 's'} · {formatMoney(c.total, currency)} billed
                    </p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className={`text-sm font-semibold ${c.owed > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {formatMoney(c.owed, currency)}
                    </span>
                    <span className="text-xs text-gray-500">{c.owed > 0 ? 'owed' : 'settled'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => ({
  props: { ...(await serverSideTranslations(locale || 'en', ['common'])) },
});
