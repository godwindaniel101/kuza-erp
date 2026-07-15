import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { api } from '@/lib/api';
import Toast from '@/components/Toast';
import SearchableSelect from '@/components/SearchableSelect';
import PageHeader from '@/components/ui/PageHeader';
import FormField from '@/components/ui/FormField';

interface InventoryItem {
  id: string;
  name?: string;
  currentStock?: number | string;
}

interface Branch {
  id: string;
  name: string;
}

interface ItemRowDraft {
  key: number;
  itemId: string;
  quantityChange: string;
  reason: string;
}

let rowKey = 0;
const newRow = (): ItemRowDraft => ({ key: ++rowKey, itemId: '', quantityChange: '', reason: '' });

const REASONS = [
  { value: 'DAMAGE', label: 'Damage' },
  { value: 'THEFT', label: 'Theft' },
  { value: 'COUNT', label: 'Stock count' },
  { value: 'EXPIRY', label: 'Expiry' },
  { value: 'OTHER', label: 'Other' },
];

export default function NewAdjustmentPage() {
  const router = useRouter();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [rows, setRows] = useState<ItemRowDraft[]>([newRow()]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get<{ success: boolean; data: InventoryItem[] }>('/ims/inventory');
        if (res.success) setItems(res.data || []);
      } catch (err: any) {
        console.error('Failed to load inventory items:', err);
        setToast({ message: err.response?.data?.message || 'Failed to load inventory items', type: 'error' });
      }
      try {
        const res = await api.get<{ success: boolean; data: Branch[] }>('/settings/branches');
        if (res.success && Array.isArray(res.data)) setBranches(res.data);
      } catch (err) {
        // Branches are optional for adjustments; ignore failures.
        console.error('Failed to load branches:', err);
      }
    };
    load();
  }, []);

  const updateRow = (key: number, patch: Partial<ItemRowDraft>) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const removeRow = (key: number) => {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev));
  };

  const validRows = rows.filter((r) => r.itemId && Number(r.quantityChange) !== 0 && r.quantityChange !== '');
  const canSave = !!reason && validRows.length > 0 && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const res = await api.post<{ success: boolean; data: { id: string } }>('/ims/adjustments', {
        branchId: branchId || undefined,
        reason,
        notes: notes.trim(),
        items: validRows.map((r) => ({
          itemId: r.itemId,
          quantityChange: Number(r.quantityChange),
          reason: r.reason.trim() || undefined,
        })),
      });
      if (res.success && res.data?.id) {
        router.push(`/ims/adjustments/${res.data.id}`);
      } else {
        router.push('/ims/adjustments');
      }
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || 'Failed to create adjustment', type: 'error' });
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <PageHeader
        title="New Stock Adjustment"
        subtitle="Use positive quantities to add stock, negative to remove"
        breadcrumbs={[
          { label: 'IMS', href: '/ims/inventory' },
          { label: 'Adjustments', href: '/ims/adjustments' },
          { label: 'New' },
        ]}
      />

      {/* Header fields */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 p-5 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <FormField
          label="Reason"
          name="adjustment-reason"
          type="select"
          required
          value={reason}
          onChange={setReason}
          placeholder="Select reason"
          options={REASONS}
        />
        {branches.length > 0 && (
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Branch</label>
            <SearchableSelect
              options={branches.map((b) => ({ value: b.id, label: b.name }))}
              value={branchId}
              onChange={setBranchId}
              placeholder="Default branch"
              focusColor="red"
              size="sm"
            />
          </div>
        )}
        <FormField
          label="Notes"
          name="adjustment-notes"
          value={notes}
          onChange={setNotes}
          placeholder="Why is this adjustment needed?"
          className={branches.length > 0 ? '' : 'sm:col-span-2'}
        />
      </div>

      {/* Item rows */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 overflow-visible mb-6">
        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 grid grid-cols-12 gap-3 text-2xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase">
          <div className="col-span-5">Item</div>
          <div className="col-span-2 text-right">Qty Change (+/-)</div>
          <div className="col-span-4">Line Reason</div>
          <div className="col-span-1"></div>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {rows.map((row) => {
            const qty = Number(row.quantityChange) || 0;
            return (
              <div key={row.key} className="px-6 py-3 grid grid-cols-12 gap-3 items-center">
                <div className="col-span-5">
                  <SearchableSelect
                    options={items.map((i) => ({
                      value: i.id,
                      label: `${i.name || i.id}${i.currentStock != null ? ` (stock: ${Math.floor(Number(i.currentStock))})` : ''}`,
                    }))}
                    value={row.itemId}
                    onChange={(v) => updateRow(row.key, { itemId: v })}
                    placeholder="Select item..."
                    focusColor="red"
                    size="sm"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    step={1}
                    value={row.quantityChange}
                    onChange={(e) => updateRow(row.key, { quantityChange: e.target.value })}
                    placeholder="e.g. -5"
                    aria-label="Quantity change"
                    className={`h-9 w-full px-3 text-[13px] text-right border rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500 dark:bg-gray-700 dark:text-gray-100 border-gray-300 dark:border-gray-600 ${
 qty > 0 ? 'text-green-600 dark:text-green-400' : qty < 0 ? 'text-red-600 dark:text-red-400' : ''
 }`}
                  />
                </div>
                <div className="col-span-4">
                  <input
                    type="text"
                    value={row.reason}
                    onChange={(e) => updateRow(row.key, { reason: e.target.value })}
                    placeholder="Optional line-level reason"
                    className="h-9 w-full px-3 text-[13px] border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500"
                  />
                </div>
                <div className="col-span-1 text-right">
                  <button
                    type="button"
                    onClick={() => removeRow(row.key)}
                    disabled={rows.length <= 1}
                    title="Remove row"
                    className="p-2 text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <i className="bx bx-trash" aria-hidden="true"></i>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => setRows((prev) => [...prev, newRow()])}
            className="px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg flex items-center"
          >
            <i className="bx bx-plus mr-1"></i>
            Add item
          </button>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push('/ims/adjustments')}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className="px-4 py-2 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Saving...' : 'Create Adjustment'}
        </button>
      </div>

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
