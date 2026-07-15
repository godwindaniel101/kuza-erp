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

interface InventoryItem {
  id: string;
  name: string;
  currentStock?: number | string;
  reorderPoint?: number | string;
  reorderLevel?: number | string;
  minStock?: number | string;
  unitCost?: number | string;
  costPrice?: number | string;
}

const num = (v: unknown): number => {
  const n = typeof v === 'string' ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
};

const QUICK_ACTIONS: { href: string; label: string; desc: string; icon: string; tone: string }[] = [
  { href: '/ims/inflows', label: 'Receive Stock', desc: 'Record goods coming in', icon: 'bx-log-in', tone: 'bg-emerald-500' },
  { href: '/ims/inventory', label: 'Stock Items', desc: 'Your catalog and quantities', icon: 'bx-box', tone: 'bg-brand-600' },
  { href: '/ims/transfers', label: 'Transfers', desc: 'Move stock between branches', icon: 'bx-transfer', tone: 'bg-sky-500' },
  { href: '/ims/adjustments', label: 'Adjustments', desc: 'Corrections & write-offs', icon: 'bx-slider-alt', tone: 'bg-amber-500' },
];

export default function InventoryDashboardPage() {
  const currency = useCurrency();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<InventoryItem[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<{ success: boolean; data: InventoryItem[] }>('/ims/inventory');
        if (res.success && Array.isArray(res.data)) setItems(res.data);
      } catch {
        // graceful: dashboard still renders with zeroes + quick actions
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const totalItems = items.length;
  const reorderOf = (i: InventoryItem) => num(i.reorderPoint ?? i.reorderLevel ?? i.minStock);
  const lowStock = items.filter((i) => num(i.currentStock) > 0 && num(i.currentStock) <= reorderOf(i)).length;
  const outOfStock = items.filter((i) => num(i.currentStock) <= 0).length;
  const stockValue = items.reduce((sum, i) => sum + num(i.currentStock) * num(i.unitCost ?? i.costPrice), 0);

  return (
    <div>
      <PageHeader title="Inventory" subtitle="Stock levels, receiving and valuation at a glance" />

      {loading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((k) => (
            <CardSkeleton key={k} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Stock Items" value={totalItems} icon="bx-box" tone="info" />
          <StatCard label="Low Stock" value={lowStock} icon="bx-error" tone="warning" caption="at or below reorder point" />
          <StatCard label="Out of Stock" value={outOfStock} icon="bx-x-circle" tone="error" />
          <StatCard label="Stock Value" value={formatMoney(stockValue, currency)} icon="bx-wallet" tone="success" />
        </div>
      )}

      <h2 className="mt-8 mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Quick actions</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      {!loading && lowStock + outOfStock > 0 && (
        <Card className="mt-6">
          <div className="flex items-center justify-between p-1">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {lowStock + outOfStock} item{lowStock + outOfStock === 1 ? '' : 's'} need attention
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Review low and out-of-stock items and receive more.</p>
            </div>
            <Link
              href="/ims/inventory"
              className="rounded-lg bg-brand-gradient px-3 py-2 text-xs font-semibold text-white hover:opacity-90"
            >
              View items
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => ({
  props: { ...(await serverSideTranslations(locale || 'en', ['common'])) },
});
