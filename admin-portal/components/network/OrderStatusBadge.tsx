import { useTranslation } from 'next-i18next';
import StatusBadge, { StatusBadgeVariant, StatusBadgeSize } from '@/components/ui/StatusBadge';

export type OrderStatus =
  | 'draft'
  | 'requested'
  | 'accepted'
  | 'rejected'
  | 'shipped'
  | 'received'
  | 'cancelled';

/**
 * Maps a cross-tenant purchase-order status to a StatusBadge variant + a
 * translated label. Statuses that have no semantic StatusBadge variant
 * (draft, cancelled) render as a neutral gray pill so color never carries
 * meaning alone.
 */
const VARIANT_BY_STATUS: Partial<Record<OrderStatus, StatusBadgeVariant>> = {
  requested: 'pending',
  accepted: 'info',
  shipped: 'pending',
  received: 'success',
  rejected: 'error',
};

const ICON_BY_STATUS: Partial<Record<OrderStatus, string>> = {
  requested: 'bx-paper-plane',
  accepted: 'bx-check',
  shipped: 'bx-navigation',
  received: 'bx-check-double',
  rejected: 'bx-x-circle',
};

export default function OrderStatusBadge({
  status,
  size = 'sm',
}: {
  status: OrderStatus;
  size?: StatusBadgeSize;
}) {
  const { t } = useTranslation('common');

  const labels: Record<OrderStatus, string> = {
    draft: t('orders.statusDraft', 'Draft'),
    requested: t('orders.statusRequested', 'Requested'),
    accepted: t('orders.statusAccepted', 'Accepted'),
    rejected: t('orders.statusRejected', 'Rejected'),
    shipped: t('orders.statusInTransit', 'In transit'),
    received: t('orders.statusReceived', 'Received'),
    cancelled: t('orders.statusCancelled', 'Cancelled'),
  };

  const label = labels[status] ?? status;
  const variant = VARIANT_BY_STATUS[status];

  // Neutral gray pill for draft / cancelled (no semantic variant).
  if (!variant) {
    const sizeClass =
      size === 'lg' ? 'px-3 py-1.5 text-sm gap-2' : size === 'md' ? 'px-2.5 py-1 text-xs gap-1.5' : 'px-2 py-0.5 text-xs gap-1';
    return (
      <span
        className={`inline-flex items-center rounded-full font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 ${sizeClass}`}
      >
        <i
          className={`bx ${status === 'cancelled' ? 'bx-x' : 'bx-edit'} ${size === 'lg' ? 'text-base' : 'text-xs'}`}
          aria-hidden="true"
        ></i>
        <span>{label}</span>
      </span>
    );
  }

  return <StatusBadge variant={variant} label={label} size={size} icon={ICON_BY_STATUS[status]} />;
}
