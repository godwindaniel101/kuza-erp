import { useState, useEffect } from 'react';
import Link from 'next/link';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { api } from '@/lib/api';
import PageHeader from '@/components/ui/PageHeader';
import StatCard from '@/components/ui/StatCard';
import Card from '@/components/Card';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { formatMoney, useCurrency } from '@/lib/format';

interface InvoiceSummary {
  totalOutstanding: number;
  totalOverdue: number;
  paidThisMonth: number;
}

const QUICK_ACTIONS: { href: string; label: string; desc: string; icon: string; tone: string }[] = [
  { href: '/sales/invoices/new', label: 'New Invoice', desc: 'Bill a customer and get paid', icon: 'bx-receipt', tone: 'bg-emerald-500' },
  { href: '/sales/invoices', label: 'Invoices', desc: 'Track sent, paid and overdue', icon: 'bx-file', tone: 'bg-brand-600' },
  { href: '/sales/customers', label: 'Customers', desc: 'Your customer directory', icon: 'bx-group', tone: 'bg-sky-500' },
];

export default function SalesDashboardPage() {
  const currency = useCurrency();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<InvoiceSummary>({ totalOutstanding: 0, totalOverdue: 0, paidThisMonth: 0 });
  const [invoiceCount, setInvoiceCount] = useState(0);
  const [customerCount, setCustomerCount] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const [inv, cust] = await Promise.allSettled([
          api.get<{ success: boolean; data: { total: number; summary?: InvoiceSummary } }>('/invoices?page=1&limit=1'),
          api.get<{ success: boolean; data: { total: number } }>('/customers?page=1&limit=1'),
        ]);
        if (inv.status === 'fulfilled' && inv.value.success) {
          setInvoiceCount(inv.value.data.total || 0);
          if (inv.value.data.summary) setSummary(inv.value.data.summary);
        }
        if (cust.status === 'fulfilled' && cust.value.success) {
          setCustomerCount(cust.value.data.total || 0);
        }
      } catch {
        // graceful
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div>
      <PageHeader title="Sales" subtitle="Invoices, customers and money owed to you" />

      {loading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((k) => (
            <CardSkeleton key={k} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Outstanding" value={formatMoney(summary.totalOutstanding, currency)} icon="bx-time-five" tone="warning" caption="awaiting payment" />
          <StatCard label="Overdue" value={formatMoney(summary.totalOverdue, currency)} icon="bx-error-circle" tone="error" />
          <StatCard label="Paid this month" value={formatMoney(summary.paidThisMonth, currency)} icon="bx-check-circle" tone="success" />
          <StatCard label="Customers" value={customerCount} icon="bx-group" tone="info" caption={`${invoiceCount} invoices`} />
        </div>
      )}

      <h2 className="mt-8 mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Quick actions</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {QUICK_ACTIONS.map((a) => (
          <Link key={a.href} href={a.href}>
            <Card className="h-full cursor-pointer transition-shadow duration-150 hover:shadow-md">
              <div className="flex items-start gap-3 p-1">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white ${a.tone}`}>
                  <i className={`bx ${a.icon} text-xl`} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{a.label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{a.desc}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => ({
  props: { ...(await serverSideTranslations(locale || 'en', ['common'])) },
});
