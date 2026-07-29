import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'next-i18next';
import Modal from '@/components/Modal';
import Button from '@/components/ui/Button';
import { api } from '@/lib/api';
import { formatNaira } from './posUtils';

interface AwaitingAccount {
  accountNumber: string;
  bankName?: string;
  accountName?: string;
}

interface AwaitingPaymentModalProps {
  transactionId: string;
  account: AwaitingAccount | null;
  amount: number;
  onPaid: () => void;
  onClose: () => void;
}

/**
 * Shows the virtual account for a transfer and polls the transaction until the
 * Monnify webhook flips it to `paid`, then calls onPaid. The tab is literally
 * "awaiting payment" until the money lands.
 */
export default function AwaitingPaymentModal({
  transactionId,
  account,
  amount,
  onPaid,
  onClose,
}: AwaitingPaymentModalProps) {
  const { t } = useTranslation('common');
  const [status, setStatus] = useState<'awaiting' | 'paid' | 'failed'>('awaiting');
  const paidRef = useRef(false);

  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const res = await api.get<{ success: boolean; data: any }>(
          `/payments/transactions/${transactionId}`,
        );
        if (!active) return;
        const s = res?.data?.status;
        if (s === 'paid' && !paidRef.current) {
          paidRef.current = true;
          setStatus('paid');
          setTimeout(() => active && onPaid(), 900);
        } else if (s === 'failed') {
          setStatus('failed');
        }
      } catch {
        /* keep polling */
      }
    };
    poll();
    const id = setInterval(poll, 3000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [transactionId, onPaid]);

  const copy = (t: string) => navigator.clipboard?.writeText(t);

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={t('pos.awaitingPayment', 'Awaiting payment')}
      maxWidth="sm"
      closeOnOutsideClick={false}
      footer={
        <Button variant="secondary" onClick={onClose}>
          {status === 'paid' ? t('pos.done', 'Done') : t('pos.cancel', 'Cancel')}
        </Button>
      }
    >
      {status === 'paid' ? (
        <div className="py-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300">
            <i className="bx bx-check text-3xl"></i>
          </div>
          <p className="font-semibold text-gray-900 dark:text-gray-100">{t('pos.paymentReceived', 'Payment received')}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('pos.amountConfirmed', '{{amount}} confirmed.', { amount: formatNaira(amount) })}</p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('pos.askCustomerTransfer', 'Ask the customer to transfer {{amount}} to:', { amount: formatNaira(amount) })}
          </p>

          {account ? (
            <div className="rounded-xl bg-gradient-to-br from-gray-900 to-gray-700 px-4 py-4 text-white dark:from-gray-800 dark:to-gray-900">
              <p className="text-[11px] uppercase tracking-wide text-white/60">{account.bankName || t('pos.bank', 'Bank')}</p>
              <div className="flex items-center justify-between">
                <p className="font-mono text-2xl font-semibold tabular-nums">{account.accountNumber}</p>
                <button
                  onClick={() => copy(account.accountNumber)}
                  className="rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-medium hover:bg-white/20"
                >
                  <i className="bx bx-copy"></i> {t('pos.copy', 'Copy')}
                </button>
              </div>
              <p className="truncate text-xs text-white/70">{account.accountName}</p>
            </div>
          ) : (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
              {t('pos.noVirtualAccount', 'No virtual account is set up for this branch.')}
            </p>
          )}

          <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500"></span>
            {status === 'failed' ? t('pos.paymentFailedTryAgain', 'Payment failed — try again.') : t('pos.waitingForTransferShort', 'Waiting for the transfer to land…')}
          </div>
        </div>
      )}
    </Modal>
  );
}
