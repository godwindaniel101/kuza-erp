import { useState } from 'react';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import Modal from '@/components/Modal';
import Button from '@/components/ui/Button';

type DeliveryMethod = 'shipment' | 'pickup' | 'dispatch';

const inputClass =
  'w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus-visible:ring-2 focus-visible:ring-brand-500 focus:outline-none';

/**
 * "Mark as in transit" flow for a supplier: pick how the goods reach the buyer
 * (shipment / pick-up / dispatch) and capture optional method-specific details.
 * Confirm posts { deliveryMethod, ...fields, note } to /network/orders/:id/ship.
 * The order status stays 'shipped' internally but displays as "In transit".
 */
export default function ShipOrderModal({
  orderId,
  onClose,
  onDone,
  onError,
}: {
  orderId: string;
  onClose: () => void;
  onDone: () => void;
  onError: (message: string) => void;
}) {
  const { t } = useTranslation('common');
  const [method, setMethod] = useState<DeliveryMethod>('shipment');
  const [shipmentCompany, setShipmentCompany] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [riderName, setRiderName] = useState('');
  const [riderPhone, setRiderPhone] = useState('');
  const [pickupContact, setPickupContact] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const methods: { value: DeliveryMethod; label: string; description: string; icon: string }[] = [
    {
      value: 'shipment',
      label: t('orders.deliveryShipment', 'Shipment'),
      description: t('orders.deliveryShipmentHint', 'Via a courier or logistics company'),
      icon: 'bx-package',
    },
    {
      value: 'pickup',
      label: t('orders.deliveryPickup', 'Pick-up'),
      description: t('orders.deliveryPickupHint', 'Buyer collects the goods'),
      icon: 'bx-store',
    },
    {
      value: 'dispatch',
      label: t('orders.deliveryDispatch', 'Dispatch'),
      description: t('orders.deliveryDispatchHint', 'Sent with a rider'),
      icon: 'bx-cycling',
    },
  ];

  const confirm = async () => {
    setSaving(true);
    const payload: Record<string, string> = { deliveryMethod: method };
    if (method === 'shipment') {
      if (shipmentCompany.trim()) payload.shipmentCompany = shipmentCompany.trim();
      if (trackingNumber.trim()) payload.trackingNumber = trackingNumber.trim();
    } else if (method === 'dispatch') {
      if (riderName.trim()) payload.riderName = riderName.trim();
      if (riderPhone.trim()) payload.riderPhone = riderPhone.trim();
    } else if (method === 'pickup') {
      if (pickupContact.trim()) payload.pickupContact = pickupContact.trim();
    }
    if (note.trim()) payload.note = note.trim();

    try {
      await api.post(`/network/orders/${orderId}/ship`, payload);
      onDone();
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      onError(e?.response?.data?.message || t('orders.shipFailed', 'Failed to update order'));
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={t('orders.markInTransitTitle', 'Mark as in transit')} maxWidth="lg">
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-300">
            {t('orders.deliveryMethod', 'Delivery method')}
          </label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {methods.map((m) => {
              const selected = method === m.value;
              return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMethod(m.value)}
                  aria-pressed={selected}
                  className={`flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors ${
                    selected
                      ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500 dark:bg-brand-500/10'
                      : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                  }`}
                >
                  <span className="flex items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-gray-100">
                    <i
                      className={`bx ${m.icon} text-base ${selected ? 'text-brand-600 dark:text-brand-300' : 'text-gray-400'}`}
                      aria-hidden="true"
                    />
                    {m.label}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{m.description}</span>
                </button>
              );
            })}
          </div>
        </div>

        {method === 'shipment' && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                {t('orders.shipmentCompany', 'Shipment company')}
              </label>
              <input
                className={inputClass}
                value={shipmentCompany}
                onChange={(e) => setShipmentCompany(e.target.value)}
                placeholder={t('orders.optional', 'Optional')}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                {t('orders.trackingNumber', 'Tracking number')}
              </label>
              <input
                className={inputClass}
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder={t('orders.optional', 'Optional')}
              />
            </div>
          </div>
        )}

        {method === 'dispatch' && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                {t('orders.riderName', 'Rider name')}
              </label>
              <input
                className={inputClass}
                value={riderName}
                onChange={(e) => setRiderName(e.target.value)}
                placeholder={t('orders.optional', 'Optional')}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                {t('orders.riderPhone', 'Rider phone')}
              </label>
              <input
                className={inputClass}
                value={riderPhone}
                onChange={(e) => setRiderPhone(e.target.value)}
                placeholder={t('orders.optional', 'Optional')}
              />
            </div>
          </div>
        )}

        {method === 'pickup' && (
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
              {t('orders.pickupContact', 'Pickup contact')}
            </label>
            <input
              className={inputClass}
              value={pickupContact}
              onChange={(e) => setPickupContact(e.target.value)}
              placeholder={t('orders.optional', 'Optional')}
            />
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
            {t('orders.note', 'Note')}
          </label>
          <textarea
            rows={2}
            className={inputClass}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('orders.shipNotePlaceholder', 'Anything the buyer should know (optional)')}
          />
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-100 dark:border-gray-800 pt-4">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            {t('cancel', 'Cancel')}
          </Button>
          <Button variant="primary" onClick={confirm} loading={saving} disabled={saving}>
            {t('orders.markInTransit', 'Mark as in transit')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
