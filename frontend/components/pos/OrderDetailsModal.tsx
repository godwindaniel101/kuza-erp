import { useEffect, useState } from 'react';
import Modal from '@/components/Modal';
import type { OrderMeta, PosTable } from './types';

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  meta: OrderMeta;
  tables: PosTable[];
  onSave: (meta: OrderMeta) => void;
}

const inputCls =
  'h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-[13px] text-gray-900 focus:outline-none ' +
  'focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-transparent dark:border-gray-700 ' +
  'dark:bg-gray-800 dark:text-gray-100';
const labelCls = 'mb-1.5 block text-[13px] font-medium text-gray-700 dark:text-gray-300';

/**
 * Optional order metadata — customer, table, notes and VAT. Edits a local draft
 * and only commits on Save so a cancel leaves the ticket untouched.
 */
export default function OrderDetailsModal({
  isOpen,
  onClose,
  meta,
  tables,
  onSave,
}: OrderDetailsModalProps) {
  const [draft, setDraft] = useState<OrderMeta>(meta);

  // Re-sync the draft whenever the modal is (re)opened.
  useEffect(() => {
    if (isOpen) setDraft(meta);
  }, [isOpen, meta]);

  const set = <K extends keyof OrderMeta>(key: K, value: OrderMeta[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Order details"
      maxWidth="md"
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-lg border border-gray-300 px-4 text-[13px] font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800/60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onSave(draft);
              onClose();
            }}
            className="h-9 rounded-lg bg-brand-600 px-4 text-[13px] font-medium text-white hover:bg-brand-700"
          >
            Save details
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>
              Customer name <span className="text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              value={draft.customerName}
              onChange={(e) => set('customerName', e.target.value)}
              className={inputCls}
              placeholder="Walk-in"
            />
          </div>
          <div>
            <label className={labelCls}>
              Phone <span className="text-gray-400">(optional)</span>
            </label>
            <input
              type="tel"
              value={draft.customerPhone}
              onChange={(e) => set('customerPhone', e.target.value)}
              className={inputCls}
              placeholder="Optional"
            />
          </div>
        </div>

        {tables.length > 0 && (
          <div>
            <label className={labelCls}>
              Table <span className="text-gray-400">(optional)</span>
            </label>
            <select
              value={draft.tableId}
              onChange={(e) => set('tableId', e.target.value)}
              className={inputCls}
            >
              <option value="">No table</option>
              {tables.map((table) => (
                <option key={table.id} value={table.id}>
                  {table.name || `Table ${table.number}`}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className={labelCls}>
            Notes <span className="text-gray-400">(optional)</span>
          </label>
          <textarea
            value={draft.notes}
            onChange={(e) => set('notes', e.target.value)}
            rows={3}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-[13px] text-gray-900 focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-transparent dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            placeholder="Any special instructions…"
          />
        </div>

        <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
          <label className="flex cursor-pointer items-center justify-between">
            <span className="text-[13px] font-medium text-gray-700 dark:text-gray-300">
              Apply VAT
            </span>
            <input
              type="checkbox"
              checked={draft.applyVat}
              onChange={(e) => set('applyVat', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-brand-600 focus-visible:ring-brand-500"
            />
          </label>
          {draft.applyVat && (
            <div className="mt-3 flex items-center gap-2">
              <label className="text-[13px] text-gray-600 dark:text-gray-400">Rate</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={draft.vatPercentage}
                onChange={(e) => set('vatPercentage', Number(e.target.value))}
                className="h-9 w-20 rounded-md border border-gray-300 bg-white px-2 text-[13px] text-gray-900 focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
              <span className="text-[13px] text-gray-500 dark:text-gray-400">%</span>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
