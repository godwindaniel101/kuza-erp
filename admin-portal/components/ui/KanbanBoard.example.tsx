/**
 * KanbanBoard usage example — Orders grouped by status.
 *
 * This is a reference/example only; it is NOT imported by any page. It mirrors
 * the shape of orders returned from `/rms/orders` (see
 * frontend/pages/rms/orders/index.tsx) to show a realistic wiring, including an
 * optimistic move that reverts on failure.
 *
 * To use in a real page: fetch your data, map it to columns via `groupBy`, and
 * persist the change inside `onCardMove`.
 */
import { useState } from 'react';
import { api } from '@/lib/api';
import KanbanBoard, { type KanbanColumn } from './KanbanBoard';
import StatusBadge from './StatusBadge';

interface OrderCard {
  id: string;
  orderNumber: string;
  status: string; // 'pending' | 'completed' | 'cancelled' | ...
  totalAmount: number;
  createdAt?: string;
}

const ORDER_COLUMNS: KanbanColumn[] = [
  { id: 'pending', title: 'Pending', variant: 'pending', emptyIcon: 'bx-time-five', emptyLabel: 'No pending orders' },
  { id: 'completed', title: 'Completed', variant: 'success', emptyIcon: 'bx-check-circle', emptyLabel: 'No completed orders' },
  { id: 'cancelled', title: 'Cancelled', variant: 'error', emptyIcon: 'bx-x-circle', emptyLabel: 'No cancelled orders' },
];

const formatCurrency = (amount: number) =>
  `₦${Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function OrdersKanbanExample() {
  const [orders, setOrders] = useState<OrderCard[]>([]);
  const [loading] = useState(false);

  const handleCardMove = async (itemId: string, fromColumn: string, toColumn: string) => {
    // Optimistic update.
    const previous = orders;
    setOrders((prev) => prev.map((o) => (o.id === itemId ? { ...o, status: toColumn } : o)));

    try {
      await api.patch(`/rms/orders/${itemId}`, { status: toColumn });
    } catch {
      // Revert on failure.
      setOrders(previous);
      // (surface a toast in a real page)
      void fromColumn;
    }
  };

  return (
    <KanbanBoard<OrderCard>
      columns={ORDER_COLUMNS}
      items={orders}
      loading={loading}
      groupBy={(order) => order.status}
      onCardMove={handleCardMove}
      renderCard={(order) => (
        <div className="p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="truncate text-sm font-medium text-brand-600 dark:text-brand-400">
              {order.orderNumber}
            </span>
            <StatusBadge
              size="sm"
              variant={order.status === 'completed' ? 'success' : order.status === 'pending' ? 'pending' : 'info'}
              label={order.status}
            />
          </div>
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {formatCurrency(order.totalAmount)}
          </div>
          {order.createdAt && (
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {new Date(order.createdAt).toLocaleDateString()}
            </div>
          )}
        </div>
      )}
    />
  );
}
