import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
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
  currentStock?: number | string;
  uoms?: Array<{ id: string; name: string }>;
}

interface Line {
  key: string;
  inventoryItemId: string;
  uomId: string;
  unit: string;
  quantity: string;
  available: number;
}

let lineSeq = 0;
const newLine = (): Line => ({ key: `l${lineSeq++}`, inventoryItemId: '', uomId: '', unit: '', quantity: '', available: 0 });

export default function CreateTransferPage() {
  const router = useRouter();
  const { t } = useTranslation('common');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [fromBranchId, setFromBranchId] = useState('');
  const [toBranchId, setToBranchId] = useState('');
  const [transferDate, setTransferDate] = useState('');
  const [lines, setLines] = useState<Line[]>([newLine()]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Branches + today's date on mount.
  useEffect(() => {
    setTransferDate(new Date().toISOString().split('T')[0]);
    api
      .get<{ success: boolean; data: Branch[] }>('/settings/branches')
      .then((res) => {
        if (res.success) setBranches(res.data || []);
      })
      .catch(() => setToast({ message: 'Failed to load branches', type: 'error' }));
  }, []);

  // Items are branch-scoped: only load them once a SOURCE branch is chosen, and
  // only that branch's stock. Changing the source resets the item lines.
  useEffect(() => {
    if (!fromBranchId) {
      setItems([]);
      setLines([newLine()]);
      return;
    }
    setItemsLoading(true);
    setLines([newLine()]);
    api
      .get<{ success: boolean; data: Item[] }>(`/ims/inventory?branchId=${fromBranchId}`)
      .then((res) => setItems(res.success && Array.isArray(res.data) ? res.data : []))
      .catch(() => setItems([]))
      .finally(() => setItemsLoading(false));
  }, [fromBranchId]);

  const updateLine = (key: string, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const onPickItem = (key: string, itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    const uomId = item?.baseUomId || item?.uoms?.[0]?.id || '';
    updateLine(key, {
      inventoryItemId: itemId,
      uomId,
      unit: item?.unit || item?.uoms?.[0]?.name || '',
      available: Number(item?.currentStock || 0),
      quantity: '',
    });
  };

  const setQty = (line: Line, raw: number) => {
    let q = Number.isFinite(raw) ? raw : 0;
    if (q < 0) q = 0;
    if (line.available > 0 && q > line.available) q = line.available;
    updateLine(line.key, { quantity: q ? String(q) : '' });
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
  const toBranchOptions = branchOptions.filter((b) => b.value !== fromBranchId);
  // Only in-stock items of the source branch are transferable; show the level.
  const chosen = new Set(lines.map((l) => l.inventoryItemId).filter(Boolean));
  const itemOptions = items
    .filter((i) => Number(i.currentStock || 0) > 0)
    .map((i) => ({
      value: i.id,
      label: `${i.name} · ${Number(i.currentStock || 0).toLocaleString()} in stock`,
      disabled: chosen.has(i.id),
    }));

  return (
    // Contained, left-aligned (not full-bleed), like the adjustment form.
    <div className="max-w-3xl space-y-5">
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

      {/* overflow-visible so SearchableSelect dropdowns aren't clipped */}
      <div className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-gray-950/[0.04] dark:bg-gray-900 dark:ring-gray-800">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-gray-700 dark:text-gray-300">From branch</label>
            <SearchableSelect options={branchOptions} value={fromBranchId} onChange={setFromBranchId} placeholder="Source branch" />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-gray-700 dark:text-gray-300">To branch</label>
            <SearchableSelect
              options={toBranchOptions}
              value={toBranchId}
              onChange={setToBranchId}
              placeholder="Destination branch"
              disabled={!fromBranchId}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-gray-700 dark:text-gray-300">Transfer date</label>
            <input
              type="date"
              value={transferDate}
              onChange={(e) => setTransferDate(e.target.value)}
              className="h-9 w-full rounded-md border border-gray-200 px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-gray-950/[0.04] dark:bg-gray-900 dark:ring-gray-800">
        <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Items</h3>

        {!fromBranchId ? (
          <div className="flex items-center gap-2 rounded-xl border border-dashed border-gray-200 px-4 py-6 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            <i className="bx bx-info-circle text-lg text-gray-400" />
            Choose a source branch first — then pick items from that branch&apos;s stock.
          </div>
        ) : itemsLoading ? (
          <div className="px-1 py-4 text-sm text-gray-400">Loading items…</div>
        ) : itemOptions.length === 0 && chosen.size === 0 ? (
          <div className="px-1 py-4 text-sm text-gray-400">No in-stock items at this branch.</div>
        ) : (
          <div className="space-y-2.5">
            {lines.map((line) => (
              <div
                key={line.key}
                className="flex flex-col gap-3 rounded-xl border border-gray-200 p-3 dark:border-gray-700 sm:flex-row sm:items-start"
              >
                <div className="min-w-0 flex-1">
                  <SearchableSelect
                    options={itemOptions}
                    value={line.inventoryItemId}
                    onChange={(v) => onPickItem(line.key, v)}
                    placeholder="Select item"
                  />
                  {line.inventoryItemId && (
                    <p className="mt-1 pl-0.5 text-xs text-gray-400">
                      {line.available.toLocaleString()} {line.unit || 'units'} available
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="inline-flex h-9 items-stretch overflow-hidden rounded-md border border-gray-200 dark:border-gray-700">
                    <button
                      type="button"
                      onClick={() => setQty(line, (Number(line.quantity) || 0) - 1)}
                      disabled={!line.inventoryItemId}
                      className="w-9 text-gray-500 hover:bg-gray-50 disabled:opacity-40 dark:hover:bg-gray-800"
                      aria-label="Decrease quantity"
                    >
                      <i className="bx bx-minus" />
                    </button>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={line.quantity}
                      onChange={(e) => setQty(line, parseFloat(e.target.value))}
                      disabled={!line.inventoryItemId}
                      placeholder="0"
                      className="w-16 border-x border-gray-200 text-center text-sm focus:outline-none disabled:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:disabled:bg-gray-900"
                    />
                    <button
                      type="button"
                      onClick={() => setQty(line, (Number(line.quantity) || 0) + 1)}
                      disabled={!line.inventoryItemId}
                      className="w-9 text-gray-500 hover:bg-gray-50 disabled:opacity-40 dark:hover:bg-gray-800"
                      aria-label="Increase quantity"
                    >
                      <i className="bx bx-plus" />
                    </button>
                  </div>
                  {line.unit && <span className="w-10 shrink-0 text-xs text-gray-400">{line.unit}</span>}
                  <button
                    type="button"
                    onClick={() => removeLine(line.key)}
                    aria-label="Remove line"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-red-600 dark:hover:bg-gray-800"
                  >
                    <i className="bx bx-trash" />
                  </button>
                </div>
              </div>
            ))}
            <Button variant="ghost" size="sm" onClick={addLine} disabled={itemOptions.length === 0}>
              <i className="bx bx-plus" /> Add item
            </Button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button variant="secondary" href="/ims/transfers">
          Cancel
        </Button>
        <Button onClick={handleSubmit} loading={submitting} disabled={!fromBranchId}>
          Create Transfer
        </Button>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => ({
  props: { ...(await serverSideTranslations(locale || 'en', ['common'])) },
});
