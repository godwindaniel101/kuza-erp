import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Toast from '@/components/Toast';
import OrderStatusBadge, { OrderStatus } from '@/components/network/OrderStatusBadge';
import OrderTimeline from '@/components/network/OrderTimeline';
import PayOrderModal from '@/components/network/PayOrderModal';
import ShipOrderModal from '@/components/network/ShipOrderModal';
import Modal from '@/components/Modal';
import { formatMoney, formatDate } from '@/lib/format';

interface OrderItem {
  id: string;
  description: string;
  quantity: number | string;
  unit: string | null;
  unitPrice: number | string | null;
  lineTotal: number | string;
}
interface OrderDetail {
  id: string;
  orderNumber: string;
  buyerName: string;
  supplierName: string;
  status: OrderStatus;
  note: string | null;
  expectedDate: string | null;
  currency: string;
  subtotal: number | string;
  total: number | string;
  createdAt: string;
  role: 'buyer' | 'supplier';
  supplierTenantId: string | null;
  paymentStatus: 'unpaid' | 'paid' | 'claimed';
  paymentMethod: 'wallet' | 'external' | null;
  paidAt: string | null;
  salesInvoiceId: string | null;
  salesOrderId: string | null;
  deliveryMethod: string | null;
  deliveryInfo: Record<string, string> | null;
  items: OrderItem[];
  statusHistory: { status: string; at: string; byTenantId?: string; note?: string | null }[];
}

/**
 * Buyer's marketplace order detail (pay / receive / confirm actions). Shared by
 * the canonical `/purchases/orders/:id` route and the legacy `/network/orders/:id`
 * route (which now just redirects here) so the two never drift. It reads the id
 * from `router.query`. Suppliers who somehow land here are still bounced to the
 * POS sale detail (the order has materialized into a real sale in their tenant).
 */
export default function OrderDetailView() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { id } = router.query;
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [showPay, setShowPay] = useState(false);
  const [showShip, setShowShip] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [priceEdits, setPriceEdits] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  // Supplier processing: which branch to fulfil (debit stock) from.
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [fulfilBranchId, setFulfilBranchId] = useState<string>('');

  const load = useCallback(async () => {
    if (!id || typeof id !== 'string') return;
    setLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: OrderDetail }>(`/network/orders/${id}`);
      if (res.success) {
        // Unified flow: the SUPPLIER never sees a buyer detail for an accepted
        // order — it has materialized into a REAL sale in their tenant, so send
        // them straight to the POS sale detail. (The buyer's salesOrderId points
        // at the supplier's tenant, so this redirect is supplier-only.) Buyer
        // and legacy in-flight orders keep the detail page (pay/receive/ship).
        if (res.data.role === 'supplier' && res.data.salesOrderId) {
          void router.replace(`/rms/orders/${res.data.salesOrderId}`);
          return;
        }
        setOrder(res.data);
      }
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setToast({ message: e?.response?.data?.message || t('orders.loadFailed', 'Failed to load order'), type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [id, t, router]);

  useEffect(() => {
    load();
  }, [load]);

  // When a supplier is about to process an incoming request, load their branches
  // so they can choose which one to fulfil (debit stock) from.
  useEffect(() => {
    if (!order || order.role !== 'supplier' || order.status !== 'requested') return;
    (async () => {
      try {
        const res = await api.get<{ success: boolean; data: { id: string; name: string }[] }>('/settings/branches');
        if (res.success) {
          const list = (res.data || []).map((b) => ({ id: b.id, name: b.name }));
          setBranches(list);
          if (list[0]) setFulfilBranchId((prev) => prev || list[0].id);
        }
      } catch {
        // Non-fatal — accept falls back to the seller's default branch.
      }
    })();
  }, [order]);

  const act = async (action: string, body?: Record<string, unknown>) => {
    if (!order) return;
    setActing(true);
    try {
      const res = await api.post<{ success: boolean; data: OrderDetail }>(`/network/orders/${order.id}/${action}`, body || {});
      if (res.success) {
        setOrder(res.data);
        setPriceEdits({});
        setToast({ message: t('orders.updated', 'Order updated'), type: 'success' });
      }
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setToast({ message: e?.response?.data?.message || t('orders.actionFailed', 'Action failed'), type: 'error' });
    } finally {
      setActing(false);
    }
  };

  const accept = () => {
    const items = Object.entries(priceEdits)
      .filter(([, v]) => v !== '')
      .map(([itemId, v]) => ({ id: itemId, unitPrice: Number(v) }));
    act('accept', { ...(items.length ? { items } : {}), branchId: fulfilBranchId || undefined });
  };

  if (loading || !order) {
    return (
      <div>
        <PageHeader title={t('orders.title', 'Purchase orders')} />
        <div className="flex items-center justify-center py-24">
          {loading ? (
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-brand-600" />
          ) : (
            <p className="text-gray-500">{t('orders.notFound', 'Order not found')}</p>
          )}
        </div>
      </div>
    );
  }

  const isBuyer = order.role === 'buyer';
  const isSupplier = order.role === 'supplier';
  const s = order.status;
  const counterpart = isBuyer ? order.supplierName : order.buyerName;
  const editingPrices = isSupplier && s === 'requested';
  // Label by role: the buyer is placing a Purchase order; the supplier is
  // receiving a Sales order. (Same landlord row, opposite sides.)
  const sectionLabel = isSupplier
    ? t('orders.salesTitle', 'Sales orders')
    : t('orders.title', 'Purchase orders');

  return (
    <div className="space-y-5">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <PageHeader
        title={order.orderNumber}
        breadcrumbs={[{ label: sectionLabel, href: '/network/orders' }, { label: order.orderNumber }]}
        actions={
          <div className="flex items-center gap-2">
            <OrderStatusBadge status={order.status} size="md" />
            <PaymentBadge status={order.paymentStatus} method={order.paymentMethod} />
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main */}
        <div className="space-y-5 lg:col-span-2">
          <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <Meta label={isBuyer ? t('supplier', 'Supplier') : t('orders.buyer', 'Buyer')} value={counterpart} />
              <Meta label={t('date', 'Date')} value={formatDate(order.createdAt)} />
              <Meta label={t('orders.expectedDate', 'Expected')} value={order.expectedDate ? formatDate(order.expectedDate) : '—'} />
              <Meta label={t('orders.total', 'Total')} value={formatMoney(order.total, order.currency)} />
            </div>
            {order.note && (
              <p className="mt-4 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600 dark:bg-gray-800/60 dark:text-gray-300">
                {order.note}
              </p>
            )}
            {order.deliveryMethod && (
              <DeliveryBlock method={order.deliveryMethod} info={order.deliveryInfo} />
            )}
          </section>

          {/* Items */}
          <section className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/60">
                <tr className="text-left text-2xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  <th className="px-4 py-2.5">{t('orders.itemDescription', 'Item')}</th>
                  <th className="px-4 py-2.5 text-right">{t('orders.qty', 'Qty')}</th>
                  <th className="px-4 py-2.5">{t('orders.unit', 'Unit')}</th>
                  <th className="px-4 py-2.5 text-right">{t('orders.price', 'Price')}</th>
                  <th className="px-4 py-2.5 text-right">{t('orders.lineTotal', 'Total')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {order.items.map((it) => (
                  <tr key={it.id}>
                    <td className="px-4 py-2.5 text-gray-800 dark:text-gray-200">{it.description}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{Number(it.quantity)}</td>
                    <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">{it.unit || '—'}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {editingPrices ? (
                        <input
                          type="number"
                          min={0}
                          step="any"
                          defaultValue={it.unitPrice ?? ''}
                          onChange={(e) => setPriceEdits((p) => ({ ...p, [it.id]: e.target.value }))}
                          placeholder={t('orders.price', 'Price')}
                          className="w-24 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-right text-sm focus-visible:ring-2 focus-visible:ring-brand-500 focus:outline-none"
                        />
                      ) : it.unitPrice != null ? (
                        formatMoney(it.unitPrice, order.currency)
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{formatMoney(it.lineTotal, order.currency)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200 dark:border-gray-700 font-semibold">
                  <td className="px-4 py-2.5" colSpan={4}>
                    {t('orders.total', 'Total')}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{formatMoney(order.total, order.currency)}</td>
                </tr>
              </tfoot>
            </table>
          </section>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            {isBuyer && s === 'draft' && (
              <Button variant="primary" onClick={() => act('submit')} loading={acting}>
                {t('orders.sendRequest', 'Send request')}
              </Button>
            )}
            {isBuyer && (s === 'draft' || s === 'requested' || s === 'accepted') && (
              <Button variant="secondary" onClick={() => act('cancel')} disabled={acting}>
                {t('orders.cancel', 'Cancel order')}
              </Button>
            )}
            {isBuyer && (s === 'accepted' || s === 'shipped') && (
              // Receiving MUST go through the goods-receipt/inflow form: that
              // creates the inflow, adds the stock, then links it back to this
              // order (receive{inflowId}). Marking received without an inflow
              // would flip the order to `received` with no stock and drop it
              // from Purchases (the D3 bug).
              <Button
                variant="primary"
                onClick={() => router.push(`/ims/inflows/create?orderId=${order.id}`)}
                disabled={acting}
              >
                {t('orders.receiveIntoStock', 'Receive into stock')}
              </Button>
            )}
            {isBuyer && order.paymentStatus === 'unpaid' && (s === 'accepted' || s === 'shipped' || s === 'received') && (
              <Button variant="secondary" onClick={() => setShowPay(true)} disabled={acting}>
                {t('orders.paySupplier', 'Pay supplier')}
              </Button>
            )}
            {/* Supplier confirms or disputes an external "marked as paid" claim */}
            {isSupplier && order.paymentStatus === 'claimed' && (
              <>
                <Button variant="primary" onClick={() => act('confirm-payment', { accept: true })} loading={acting}>
                  {t('orders.confirmPayment', 'Confirm payment received')}
                </Button>
                <Button variant="secondary" onClick={() => act('confirm-payment', { accept: false })} disabled={acting}>
                  {t('orders.disputePayment', "Didn't receive it")}
                </Button>
              </>
            )}
            {isSupplier && s === 'requested' && (
              <>
                {branches.length > 0 && (
                  <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    {t('orders.fulfilFrom', 'Fulfil from')}
                    <select
                      value={fulfilBranchId}
                      onChange={(e) => setFulfilBranchId(e.target.value)}
                      className="h-9 rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-800 px-2 text-sm text-gray-900 dark:text-gray-100"
                    >
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </label>
                )}
                <Button variant="primary" onClick={accept} loading={acting}>
                  {t('orders.accept', 'Accept & fulfil')}
                </Button>
                <Button variant="secondary" onClick={() => setShowReject(true)} disabled={acting}>
                  {t('orders.reject', 'Decline')}
                </Button>
              </>
            )}
            {isSupplier && s === 'accepted' && (
              <Button variant="primary" onClick={() => setShowShip(true)} disabled={acting}>
                {t('orders.markInTransit', 'Mark as in transit')}
              </Button>
            )}
            {isSupplier && order.salesInvoiceId && (
              <Button variant="secondary" href={`/sales/invoices/${order.salesInvoiceId}`}>
                <i className="bx bx-file" aria-hidden="true" />
                {t('orders.viewSalesInvoice', 'View sales invoice')}
              </Button>
            )}
          </div>
        </div>

        {/* Timeline */}
        <div>
          <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 lg:sticky lg:top-6">
            <h2 className="mb-4 text-sm font-bold text-gray-900 dark:text-gray-100">{t('orders.timeline', 'Progress')}</h2>
            <OrderTimeline history={order.statusHistory} />
          </section>
        </div>
      </div>
      {showShip && (
        <ShipOrderModal
          orderId={order.id}
          onClose={() => setShowShip(false)}
          onDone={() => {
            setShowShip(false);
            setToast({ message: t('orders.markedInTransit', 'Order marked as in transit'), type: 'success' });
            load();
          }}
          onError={(m) => setToast({ message: m, type: 'error' })}
        />
      )}
      {showPay && (
        <PayOrderModal
          order={{
            id: order.id,
            total: order.total,
            currency: order.currency,
            supplierName: order.supplierName,
            supplierTenantId: order.supplierTenantId,
          }}
          onClose={() => setShowPay(false)}
          onPaid={() => {
            setShowPay(false);
            setToast({ message: t('orders.paid', 'Payment recorded'), type: 'success' });
            load();
          }}
          onError={(m) => setToast({ message: m, type: 'error' })}
        />
      )}

      {showReject && (
        <Modal isOpen onClose={() => setShowReject(false)} title={t('orders.rejectOrder', 'Reject order')} maxWidth="md">
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                {t('orders.rejectReason', 'Reason for rejection')}
              </label>
              <textarea
                rows={3}
                autoFocus
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder={t('orders.rejectReasonPlaceholder', 'Let the buyer know why (e.g. out of stock)…')}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus-visible:ring-2 focus-visible:ring-brand-500 focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowReject(false)} disabled={acting}>
                {t('cancel', 'Cancel')}
              </Button>
              <Button
                variant="danger"
                loading={acting}
                disabled={!rejectReason.trim()}
                onClick={() => {
                  act('reject', { note: rejectReason.trim() });
                  setShowReject(false);
                  setRejectReason('');
                }}
              >
                {t('orders.reject', 'Reject')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function PaymentBadge({
  status,
  method,
}: {
  status: 'unpaid' | 'paid' | 'claimed';
  method: 'wallet' | 'external' | null;
}) {
  const { t } = useTranslation('common');
  if (status === 'claimed') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/20">
        <i className="bx bx-hourglass text-sm" aria-hidden="true" />
        {t('orders.paymentClaimed', 'Payment claimed — awaiting confirmation')}
      </span>
    );
  }
  if (status === 'paid') {
    const methodLabel =
      method === 'wallet'
        ? ` · ${t('orders.methodWallet', 'wallet')}`
        : method === 'external'
        ? ` · ${t('orders.methodExternal', 'external')}`
        : '';
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20">
        <i className="bx bx-check-circle text-sm" aria-hidden="true" />
        {t('orders.paid', 'Paid')}
        {methodLabel}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
      <i className="bx bx-time-five text-sm" aria-hidden="true" />
      {t('orders.unpaid', 'Unpaid')}
    </span>
  );
}

function DeliveryBlock({ method, info }: { method: string; info: Record<string, string> | null }) {
  const { t } = useTranslation('common');
  const methodLabels: Record<string, string> = {
    shipment: t('orders.deliveryShipment', 'Shipment'),
    pickup: t('orders.deliveryPickup', 'Pick-up'),
    dispatch: t('orders.deliveryDispatch', 'Dispatch'),
  };
  const fieldLabels: Record<string, string> = {
    shipmentCompany: t('orders.shipmentCompany', 'Shipment company'),
    trackingNumber: t('orders.trackingNumber', 'Tracking number'),
    riderName: t('orders.riderName', 'Rider name'),
    riderPhone: t('orders.riderPhone', 'Rider phone'),
    pickupContact: t('orders.pickupContact', 'Pickup contact'),
  };
  const entries = Object.entries(info || {}).filter(([, v]) => v);

  return (
    <div className="mt-4 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200">
        <i className="bx bx-navigation text-sm text-brand-600 dark:text-brand-300" aria-hidden="true" />
        {t('orders.delivery', 'Delivery')}
      </p>
      <p className="mt-1 text-sm text-gray-800 dark:text-gray-200">{methodLabels[method] ?? method}</p>
      {entries.length > 0 && (
        <dl className="mt-1.5 space-y-0.5">
          {entries.map(([k, v]) => (
            <div key={k} className="flex gap-2 text-xs">
              <dt className="text-gray-500 dark:text-gray-400">{fieldLabels[k] ?? k}:</dt>
              <dd className="text-gray-800 dark:text-gray-200">{v}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-2xs uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-0.5 font-medium text-gray-900 dark:text-gray-100">{value}</p>
    </div>
  );
}
