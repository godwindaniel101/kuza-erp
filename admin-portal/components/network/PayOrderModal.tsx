import { useState } from 'react';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import Modal from '@/components/Modal';
import Button from '@/components/ui/Button';
import { formatMoney } from '@/lib/format';

type PayMethod = 'wallet' | 'mark_paid';

interface PayOrderModalProps {
  order: {
    id: string;
    total: number | string;
    currency: string;
    supplierName: string;
    supplierTenantId: string | null;
  };
  onClose: () => void;
  onPaid: () => void;
  onError: (message: string) => void;
}

const inputClass =
  'w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus-visible:ring-2 focus-visible:ring-brand-500 focus:outline-none';

/**
 * Settle a purchase order the buyer owes. Two paths:
 *  - "wallet": internal transfer to an on-platform supplier (needs
 *    supplierTenantId). Moves money on the network wallet ledger.
 *  - "mark_paid": external settlement (bank transfer/cash off-platform). No
 *    wallet movement — just records the order as paid.
 */
export default function PayOrderModal({ order, onClose, onPaid, onError }: PayOrderModalProps) {
  const { t } = useTranslation('common');
  const canWallet = !!order.supplierTenantId;
  const [method, setMethod] = useState<PayMethod>(canWallet ? 'wallet' : 'mark_paid');
  const [amount, setAmount] = useState(String(Number(order.total) || ''));
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const confirm = async () => {
    const amt = Number(amount);
    if (!(amt > 0)) return onError(t('orders.payAmountRequired', 'Enter an amount above 0'));
    if (method === 'wallet' && !canWallet) {
      return onError(t('orders.payWalletUnavailable', 'This supplier is off-platform — mark as paid instead'));
    }
    setSaving(true);
    try {
      await api.post(`/network/orders/${order.id}/pay`, { method, amount: amt, note: note || undefined });
      onPaid();
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      onError(e?.response?.data?.message || t('orders.payFailed', 'Payment failed'));
      setSaving(false);
    }
  };

  const options: { key: PayMethod; icon: string; title: string; desc: string; disabled: boolean; hint?: string }[] = [
    {
      key: 'wallet',
      icon: 'bx-wallet',
      title: t('orders.payFromWallet', 'Pay from wallet'),
      desc: t('orders.payFromWalletDesc', 'Internal transfer to the supplier on Kuza.'),
      disabled: !canWallet,
      hint: !canWallet ? t('orders.payWalletHint', 'Only for suppliers on the platform.') : undefined,
    },
    {
      key: 'mark_paid',
      icon: 'bx-check-circle',
      title: t('orders.markAsPaid', 'Mark as paid'),
      desc: t(
        'orders.markAsPaidDesc',
        'Paid off-platform (bank/cash). The supplier must confirm they received it before it counts as paid.',
      ),
      disabled: false,
    },
  ];

  return (
    <Modal isOpen onClose={onClose} title={t('orders.payTitle', 'Pay supplier')} maxWidth="md">
      <div className="space-y-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t('orders.paySubtitle', 'Settle this order with {{supplier}}.', { supplier: order.supplierName })}
        </p>

        {/* Method choice */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {options.map((opt) => {
            const selected = method === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                disabled={opt.disabled}
                onClick={() => setMethod(opt.key)}
                className={`flex flex-col items-start rounded-lg border p-3 text-left transition ${
                  selected
                    ? 'border-brand-500 ring-2 ring-brand-500/40 bg-brand-50/50 dark:bg-brand-500/10'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                } ${opt.disabled ? 'cursor-not-allowed opacity-50' : ''}`}
              >
                <span className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                  <i className={`bx ${opt.icon} text-lg text-brand-600 dark:text-brand-400`} aria-hidden="true" />
                  {opt.title}
                </span>
                <span className="mt-1 text-xs text-gray-500 dark:text-gray-400">{opt.hint || opt.desc}</span>
              </button>
            );
          })}
        </div>

        {/* Amount */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
            {t('orders.payAmount', 'Amount')}
          </label>
          <input
            type="number"
            min={0}
            step="any"
            className={inputClass}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={t('orders.payAmount', 'Amount')}
          />
          <p className="mt-1 text-xs text-gray-400">
            {t('orders.total', 'Total')}: {formatMoney(order.total, order.currency)}
          </p>
        </div>

        {/* Note */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
            {t('orders.payNote', 'Note (optional)')}
          </label>
          <input
            type="text"
            className={inputClass}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('orders.payNotePlaceholder', 'e.g. Bank ref, invoice #')}
          />
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 dark:border-gray-800 pt-4">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            {t('cancel', 'Cancel')}
          </Button>
          <Button variant="primary" onClick={confirm} loading={saving} disabled={saving}>
            {method === 'wallet' ? t('orders.payConfirmWallet', 'Pay from wallet') : t('orders.payConfirmExternal', 'Mark as paid')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
