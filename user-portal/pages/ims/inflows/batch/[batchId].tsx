import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';

interface BatchItem {
  branchName: string;
  itemName: string;
  uomName: string;
  quantity: number;
  baseQuantity: number;
  unitCost: number;
  totalCost: number;
  batchNumber: string | null;
  expiryDate: string | null;
  supplierName: string | null;
}
interface BatchBranch {
  branchId: string;
  branchName: string;
  itemCount: number;
  totalAmount: number;
}
interface BatchInflow {
  id: string;
  branchName: string;
  invoiceNumber?: string;
  status: string;
  totalAmount: number;
}
interface BatchSummary {
  batchId: string;
  receivedDate?: string;
  createdAt?: string;
  currency: string;
  status: string;
  inflowCount: number;
  branchCount: number;
  totalItems: number;
  totalAmount: number;
  suppliers: string[];
  branches: BatchBranch[];
  inflows: BatchInflow[];
  items: BatchItem[];
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: '₦', USD: '$', EUR: '€', GBP: '£', GHS: '₵', KES: 'KSh', ZAR: 'R',
};

export default function BatchSummaryPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { batchId } = router.query;
  const [summary, setSummary] = useState<BatchSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'branch' | 'items' | 'inflows'>('branch');

  const fmt = useCallback(
    (amount: number) => {
      const sym = CURRENCY_SYMBOLS[summary?.currency || 'NGN'] || summary?.currency || '';
      return `${sym}${Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    },
    [summary?.currency],
  );

  useEffect(() => {
    if (!batchId || typeof batchId !== 'string') return;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get<{ success: boolean; data: BatchSummary }>(`/ims/inflows/batch/${batchId}`);
        if (res.success) setSummary(res.data);
        else setError(t('batchNotFound') || 'Batch not found');
      } catch (err: any) {
        setError(err?.response?.data?.message || err?.message || (t('batchNotFound') || 'Batch not found'));
      } finally {
        setLoading(false);
      }
    })();
  }, [batchId, t]);

  const statusVariant = (s: string): 'success' | 'warning' | 'error' | 'info' => {
    if (s === 'approved' || s === 'received') return 'success';
    if (s === 'rejected') return 'error';
    if (s === 'partial') return 'info';
    return 'warning';
  };

  return (
    <div className="w-full max-w-5xl space-y-6 kz-stagger">
      <PageHeader
        title={t('purchaseBatch') || 'Purchase Batch'}
        subtitle={typeof batchId === 'string' ? batchId : undefined}
        breadcrumbs={[
          { label: t('ims', 'IMS'), href: '/ims' },
          { label: t('inventoryInflow') || 'Inflows', href: '/ims/inflows' },
          { label: t('batch') || 'Batch' },
        ]}
        actions={
          <Button href="/ims/inflows" variant="secondary" size="sm">
            <i className="bx bx-arrow-back" aria-hidden="true"></i>
            {t('backToInflows') || 'Back to inflows'}
          </Button>
        }
      />

      {loading ? (
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      ) : summary ? (
        <div className="w-full max-w-5xl space-y-5">
          {/* Summary stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label={t('totalValue') || 'Total value'} value={fmt(summary.totalAmount)} icon="bx-money" tone="red" />
            <StatCard label={t('itemsCount') || 'Items'} value={summary.totalItems} icon="bx-box" tone="red" />
            <StatCard label={t('branches') || 'Branches'} value={summary.branchCount} icon="bx-store" tone="red" />
            <StatCard label={t('inflows') || 'Inflows'} value={summary.inflowCount} icon="bx-transfer-alt" tone="red" />
          </div>

          {/* Meta row */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 p-4 flex flex-wrap items-center gap-x-8 gap-y-2 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">{t('status') || 'Status'}: </span>
              <StatusBadge variant={statusVariant(summary.status)} label={summary.status} size="sm" />
            </div>
            {summary.receivedDate && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">{t('receivedDate') || 'Received'}: </span>
                <span className="text-gray-900 dark:text-gray-100 font-medium">{new Date(summary.receivedDate).toLocaleDateString()}</span>
              </div>
            )}
            {summary.suppliers.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-gray-500 dark:text-gray-400">{t('suppliers') || 'Suppliers'}: </span>
                {summary.suppliers.map((s) => (
                  <span key={s} className="px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">{s}</span>
                ))}
              </div>
            )}
          </div>

          {/* Tabs: By branch · Items · Inflows */}
          <div className="border-b border-gray-200 dark:border-gray-800">
            <nav className="-mb-px flex gap-6" aria-label={t('inflows.batchSections', 'Batch sections')}>
              {([
                { k: 'branch', label: t('byBranch') || 'By branch' },
                { k: 'items', label: `${t('items') || 'Items'} (${summary.items.length})` },
                { k: 'inflows', label: `${t('inflows') || 'Inflows'} (${summary.inflows.length})` },
              ] as const).map((tb) => (
                <button
                  key={tb.k}
                  type="button"
                  onClick={() => setTab(tb.k)}
                  aria-current={tab === tb.k ? 'page' : undefined}
                  className={`-mb-px whitespace-nowrap border-b-2 py-2.5 px-1 text-[13px] font-medium transition-colors ${
                    tab === tb.k
                      ? 'border-accent text-accent'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  {tb.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Per-branch breakdown */}
          {tab === 'branch' && summary.branches.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 overflow-hidden">
              <h3 className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700">
                {t('byBranch') || 'By branch'}
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm divide-y divide-gray-100 dark:divide-gray-800">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('branch') || 'Branch'}</th>
                      <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('items') || 'Items'}</th>
                      <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('totalAmount') || 'Total'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {summary.branches.map((b) => (
                      <tr key={b.branchId} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                        <td className="px-4 py-2.5 whitespace-nowrap font-medium text-gray-900 dark:text-gray-100">{b.branchName}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-gray-600 dark:text-gray-400">{b.itemCount}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-gray-900 dark:text-gray-100">{fmt(b.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Line items */}
          {tab === 'items' && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 overflow-hidden">
            <h3 className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700">
              {t('items') || 'Items'} ({summary.items.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm divide-y divide-gray-100 dark:divide-gray-800">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    {[t('branch') || 'Branch', t('item') || 'Item', t('uom') || 'UOM', t('quantity') || 'Qty', t('costPerUnit') || 'Unit cost', t('totalAmount') || 'Total', t('batch') || 'Batch', t('supplier') || 'Supplier'].map((h, i) => (
                      <th key={i} className={`px-4 py-2 text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase ${i >= 3 && i <= 5 ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {summary.items.map((it, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                      <td className="px-4 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">{it.branchName}</td>
                      <td className="px-4 py-2 font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">{it.itemName}</td>
                      <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{it.uomName}</td>
                      <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">{it.quantity}</td>
                      <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">{fmt(it.unitCost)}</td>
                      <td className="px-4 py-2 text-right font-medium text-gray-900 dark:text-gray-100">{fmt(it.totalCost)}</td>
                      <td className="px-4 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">{it.batchNumber || '-'}</td>
                      <td className="px-4 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">{it.supplierName || '-'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 dark:bg-gray-900 font-semibold text-gray-900 dark:text-white">
                    <td className="px-4 py-2" colSpan={5}>{t('totalAmount') || 'Total'}</td>
                    <td className="px-4 py-2 text-right">{fmt(summary.totalAmount)}</td>
                    <td className="px-4 py-2" colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
          )}

          {/* Linked inflows */}
          {tab === 'inflows' && summary.inflows.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 overflow-hidden">
              <h3 className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700">
                {t('inflows') || 'Inflows'} ({summary.inflows.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm divide-y divide-gray-100 dark:divide-gray-800">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('branch') || 'Branch'}</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('invoiceNumber') || 'Invoice'}</th>
                      <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('totalAmount') || 'Total'}</th>
                      <th className="px-4 py-2" aria-hidden="true"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {summary.inflows.map((inf) => (
                      <tr
                        key={inf.id}
                        onClick={() => router.push(`/ims/inflows/${inf.id}`)}
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40"
                      >
                        <td className="px-4 py-2.5 whitespace-nowrap font-medium text-gray-900 dark:text-gray-100">{inf.branchName}</td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-gray-500 dark:text-gray-400">{inf.invoiceNumber || '-'}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-gray-900 dark:text-gray-100">{fmt(inf.totalAmount)}</td>
                        <td className="px-4 py-2.5 text-right"><i className="bx bx-chevron-right text-gray-400" aria-hidden="true"></i></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : null}
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
