import { useTranslation } from 'next-i18next';
import { formatDateTime } from '@/lib/format';
import { OrderStatus } from './OrderStatusBadge';

export interface OrderTimelineEntry {
  status: OrderStatus | string;
  at: string;
  byTenantId?: string;
  note?: string | null;
}

/**
 * Vertical, trackable stage timeline for a purchase order — one node per
 * statusHistory entry (checked node + connector line), newest at the bottom in
 * the order the backend returns them.
 */
export default function OrderTimeline({ history }: { history: OrderTimelineEntry[] }) {
  const { t } = useTranslation('common');

  const labels: Record<string, string> = {
    draft: t('orders.statusDraft', 'Draft'),
    requested: t('orders.statusRequested', 'Requested'),
    accepted: t('orders.statusAccepted', 'Accepted'),
    rejected: t('orders.statusRejected', 'Rejected'),
    shipped: t('orders.statusInTransit', 'In transit'),
    received: t('orders.statusReceived', 'Received'),
    cancelled: t('orders.statusCancelled', 'Cancelled'),
  };

  if (!history || history.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {t('orders.noHistory', 'No history yet')}
      </p>
    );
  }

  const total = history.length;

  return (
    <ol className="space-y-0">
      {history.map((entry, i) => {
        const isLast = i === total - 1;
        const isCurrent = isLast;
        return (
          <li key={`${entry.status}-${entry.at}-${i}`} className="relative flex gap-4 pb-6 last:pb-0">
            {/* Connector line to the next node */}
            {!isLast && (
              <span
                aria-hidden="true"
                className="absolute left-[15px] top-8 -bottom-0 w-0.5 bg-brand-300 dark:bg-brand-500/50"
              />
            )}

            {/* Node marker */}
            <span
              className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                isCurrent
                  ? 'bg-brand-600 text-white'
                  : 'bg-brand-50 text-brand-600 ring-1 ring-brand-200 dark:bg-brand-500/10 dark:text-brand-300 dark:ring-brand-500/30'
              }`}
            >
              <i className="bx bx-check text-base" aria-hidden="true"></i>
            </span>

            {/* Entry content */}
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {labels[entry.status] ?? entry.status}
              </p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{formatDateTime(entry.at)}</p>
              {entry.note && (
                <p className="mt-1 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:bg-gray-800/60 dark:text-gray-300">
                  {entry.note}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
