import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Card from '@/components/Card';
import SearchableSelect from '@/components/SearchableSelect';
import Toast from '@/components/Toast';

interface Branch {
  id: string;
  name: string;
  isDefault?: boolean;
}

interface Item {
  id: string;
  name: string;
  baseUomId?: string;
  unit?: string;
  uoms?: Array<{ id: string; name: string }>;
}

interface Line {
  key: string;
  inventoryItemId: string;
  uomId: string;
  unit: string;
  quantity: string;
}

let lineSeq = 0;
const newLine = (): Line => ({ key: `l${lineSeq++}`, inventoryItemId: '', uomId: '', unit: '', quantity: '' });

export default function CreateTransferPage() {
  const router = useRouter();
  const { t } = useTranslation('common');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [fromBranchId, setFromBranchId] = useState('');
  const [toBranchId, setToBranchId] = useState('');
  const [transferDate, setTransferDate] = useState('');
  const [lines, setLines] = useState<Line[]>([newLine()]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    setTransferDate(new Date().toISOString().split('T')[0]);
    (async () => {
      const [br, it] = await Promise.allSettled([
        api.get<{ success: boolean; data: Branch[] }>('/settings/branches'),
        api.get<{ success: boolean; data: Item[] }>('/ims/inventory'),
      ]);
      if (br.status === 'fulfilled' && br.value.success) setBranches(br.value.data || []);
      if (it.status === 'fulfilled' && it.value.success) setItems(it.value.data || []);
    })();
  }, []);

  const updateLine = (key: string, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const onPickItem = (key: string, itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    const uomId = item?.baseUomId || item?.uoms?.[0]?.id || '';
    updateLine(key, { inventoryItemId: itemId, uomId, unit: item?.unit || item?.uoms?.[0]?.name || '' });
  };

  const addLine = () => setLines((ls) => [...ls, newLine()]);
  const removeLine = (key: string) => setLines((ls) => (ls.length > 1 ? ls.filter((l) => l.key !== key) : ls));

  const handleSubmit = async () => {
    if (!fromBranchId || !toBranchId) {
      setToast({ message: 'Select both source and destination branches', type: 'error' });
      return;
    }
    if (fromBranchId === toBranchId) {
      setToast({ message: 'Source and destination branches must be different', type: 'error' });
      return;
    }
    const validLines = lines
      .filter((l) => l.inventoryItemId && Number(l.quantity) > 0 && l.uomId)
      .map((l) => ({ inventoryItemId: l.inventoryItemId, uomId: l.uomId, quantity: Number(l.quantity) }));
    if (validLines.length === 0) {
      setToast({ message: 'Add at least one item with a quantity', type: 'error' });
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/ims/transfers', {
        fromBranchId,
        toBranchId,
        transferDate,
        items: validLines,
        ...(notes ? { notes } : {}),
      });
      setToast({ message: 'Transfer created', type: 'success' });
      setTimeout(() => router.push('/ims/transfers'), 600);
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || 'Failed to create transfer', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const branchOptions = branches.map((b) => ({ value: b.id, label: b.name }));
  const itemOptions = items.map((i) => ({ value: i.id, label: i.name }));

  return (
    <div className="space-y-5">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <PageHeader
        title="New Transfer"
        subtitle="Move stock from one branch to another"
        breadcrumbs={[
          { label: 'Inventory', href: '/ims' },
          { label: 'Transfers', href: '/ims/transfers' },
          { label: 'New' },
        ]}
      />

      {/* overflow-visible so SearchableSelect dropdowns aren't clipped (Card uses overflow-hidden) */}
      <div className="rounded-2xl bg-white dark:bg-gray-900 shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-gray-700 dark:text-gray-300">From branch</label>
            <SearchableSelect options={branchOptions} value={fromBranchId} onChange={setFromBranchId} placeholder="Source branch" />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-gray-700 dark:text-gray-300">To branch</label>
            <SearchableSelect options={branchOptions} value={toBranchId} onChange={setToBranchId} placeholder="Destination branch" />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-gray-700 dark:text-gray-300">Transfer date</label>
            <input
              type="date"
              value={transferDate}
              onChange={(e) => setTransferDate(e.target.value)}
              className="h-9 w-full px-3 text-sm border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white dark:bg-gray-900 shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 p-5">
        <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Items</h3>
        <div className="space-y-2">
          {/* header */}
          <div className="hidden grid-cols-[2fr_1fr_auto] gap-3 px-1 pb-1 text-2xs font-semibold uppercase tracking-wider text-gray-500 sm:grid">
            <span>Item</span>
            <span className="text-right">Quantity</span>
            <span />
          </div>
          {lines.map((line) => (
            <div key={line.key} className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr_auto] sm:items-center">
              <SearchableSelect
                options={itemOptions}
                value={line.inventoryItemId}
                onChange={(v) => onPickItem(line.key, v)}
                placeholder="Select item"
              />
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={line.quantity}
                  onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
                  placeholder="0"
                  className="h-9 w-full px-3 text-sm text-right border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                />
                {line.unit && <span className="shrink-0 text-xs text-gray-400">{line.unit}</span>}
              </div>
              <button
                type="button"
                onClick={() => removeLine(line.key)}
                aria-label="Remove line"
                className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-red-600"
              >
                <i className="bx bx-trash" />
              </button>
            </div>
          ))}
          <Button variant="ghost" size="sm" onClick={addLine}>
            <i className="bx bx-plus" /> Add item
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button variant="secondary" href="/ims/transfers">
          Cancel
        </Button>
        <Button onClick={handleSubmit} loading={submitting}>
          Create Transfer
        </Button>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => ({
  props: { ...(await serverSideTranslations(locale || 'en', ['common'])) },
});
