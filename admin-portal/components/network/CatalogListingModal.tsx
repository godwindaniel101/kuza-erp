import { useState, useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import Modal from '@/components/Modal';
import Button from '@/components/ui/Button';

/**
 * A supplier's marketplace listing for one item. Linked back to an inventory
 * item via `sourceInventoryItemId`. Shape mirrors GET /network/catalog rows.
 */
export interface CatalogListing {
  id: string;
  supplierTenantId?: string;
  supplierName?: string;
  sourceInventoryItemId?: string | null;
  name: string;
  description?: string | null;
  unit?: string | null;
  price: number;
  currency?: string | null;
  moq?: number | null;
  available: boolean;
  isPublic: boolean;
  bargainAllowed?: boolean;
  imageUrl?: string | null;
  status?: string | null;
}

interface CatalogListingModalProps {
  /** The inventory item being listed / edited. */
  item: { id: string; name: string; unit?: string; currency?: string; salePrice?: number | string; imageUrl?: string | null };
  /** The existing marketplace listing for this item, if any. */
  existing?: CatalogListing | null;
  onClose: () => void;
  /** Called after any successful create / update / delete. */
  onSaved: () => void;
  onError: (message: string) => void;
}

const inputClass =
  'w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus-visible:ring-2 focus-visible:ring-brand-500 focus:outline-none';
const labelClass = 'block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1';

const errMsg = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

export default function CatalogListingModal({ item, existing, onClose, onSaved, onError }: CatalogListingModalProps) {
  const { t } = useTranslation('common');

  const [price, setPrice] = useState<string>(
    existing?.price != null ? String(existing.price) : item.salePrice != null ? String(item.salePrice) : '',
  );
  const [moq, setMoq] = useState<string>(existing?.moq != null ? String(existing.moq) : '1');
  const [available, setAvailable] = useState<boolean>(existing?.available ?? true);
  const [isPublic, setIsPublic] = useState<boolean>(existing?.isPublic ?? false);
  const [bargainAllowed, setBargainAllowed] = useState<boolean>(existing?.bargainAllowed ?? false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  // Market rules (Configuration → Stock rules → Market Setup) decide whether the
  // per-item availability / visibility controls are shown at all. When a rule is
  // automatic, the control is hidden and its value is derived from the rule.
  const [availabilityMode, setAvailabilityMode] = useState<'auto_in_stock' | 'manual'>('auto_in_stock');
  const [visibilityMode, setVisibilityMode] = useState<'public' | 'connections' | 'manual'>('public');

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<{ success: boolean; data: { availabilityMode?: string; visibilityMode?: string } }>(
          '/network/market-settings',
        );
        if (res.success && res.data) {
          if (res.data.availabilityMode) setAvailabilityMode(res.data.availabilityMode as 'auto_in_stock' | 'manual');
          if (res.data.visibilityMode) setVisibilityMode(res.data.visibilityMode as 'public' | 'connections' | 'manual');
        }
      } catch {
        // Defaults stand if settings can't load.
      }
    })();
  }, []);

  const showAvailableToggle = availabilityMode === 'manual';
  const showPublicToggle = visibilityMode === 'manual';
  // Bargaining is a per-item opt-in. Shown always for now (config-only); the
  // full offer/counter flow is not built yet.
  const showBargainToggle = true;

  const handleSave = async () => {
    if (price === '' || Number.isNaN(Number(price))) {
      onError(t('catalog.priceRequired', 'A valid price is required'));
      return;
    }
    setSaving(true);
    // Automatic rules derive the value (their control is hidden): availability
    // auto → available; visibility public → public, connections → private.
    const effAvailable = showAvailableToggle ? available : true;
    const effIsPublic = showPublicToggle ? isPublic : visibilityMode === 'public';
    try {
      if (existing) {
        await api.patch(`/network/catalog/${existing.id}`, {
          price: Number(price),
          moq: moq === '' ? undefined : Number(moq),
          available: effAvailable,
          isPublic: effIsPublic,
          bargainAllowed: showBargainToggle ? bargainAllowed : false,
          // Backfill image + unit from the source item if the listing lacks them.
          ...(!existing.imageUrl && item.imageUrl ? { imageUrl: item.imageUrl } : {}),
          ...(!existing.unit && item.unit ? { unit: item.unit } : {}),
        });
      } else {
        await api.post('/network/catalog', {
          name: item.name,
          price: Number(price),
          unit: item.unit,
          currency: item.currency,
          moq: moq === '' ? undefined : Number(moq),
          available: effAvailable,
          isPublic: effIsPublic,
          bargainAllowed: showBargainToggle ? bargainAllowed : false,
          imageUrl: item.imageUrl || undefined,
          sourceInventoryItemId: item.id,
        });
      }
      onSaved();
    } catch (err) {
      onError(errMsg(err, t('catalog.saveFailed', 'Failed to save listing')));
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!existing) return;
    if (typeof window !== 'undefined' && !window.confirm(t('catalog.confirmUnlist', 'Remove this item from the market?'))) {
      return;
    }
    setRemoving(true);
    try {
      await api.delete(`/network/catalog/${existing.id}`);
      onSaved();
    } catch (err) {
      onError(errMsg(err, t('catalog.deleteFailed', 'Failed to remove listing')));
    } finally {
      setRemoving(false);
    }
  };

  const busy = saving || removing;

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={existing ? t('catalog.editListing', 'Edit listing') : t('catalog.listOnMarket', 'List on market')}
      maxWidth="md"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('catalog.listingFor', 'Listing')} <span className="font-medium text-gray-800 dark:text-gray-200">{item.name}</span>
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>
                {t('catalog.price', 'Price')}
                {item.currency ? ` (${item.currency})` : ''}
              </label>
              <input
                type="number"
                min={0}
                step="any"
                className={inputClass}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                autoFocus
              />
            </div>
            <div>
              <label className={labelClass}>{t('catalog.moq', 'MOQ')}</label>
              <input
                type="number"
                min={0}
                step="any"
                className={inputClass}
                value={moq}
                onChange={(e) => setMoq(e.target.value)}
                placeholder={t('catalog.moqPlaceholder', 'Minimum order quantity')}
              />
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 p-3">
            {showAvailableToggle ? (
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={available}
                  onChange={(e) => setAvailable(e.target.checked)}
                  className="h-4 w-4 cursor-pointer rounded border-gray-300 text-brand-600 focus-visible:ring-brand-500 dark:border-gray-600 dark:bg-gray-700"
                />
                {t('catalog.availableToggle', 'Available for order')}
              </label>
            ) : (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                <i className="bx bx-check-circle mr-1 text-emerald-500" aria-hidden="true"></i>
                {t('catalog.availabilityAuto', 'Availability is automatic — offered whenever in stock (Configuration → Market Setup).')}
              </p>
            )}
            {showPublicToggle ? (
              <label className="flex cursor-pointer items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-gray-300 text-brand-600 focus-visible:ring-brand-500 dark:border-gray-600 dark:bg-gray-700"
                />
                <span>
                  <span className="block">{t('catalog.publicToggle', 'Show publicly')}</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">
                    {t('catalog.publicHint', 'Requires your public catalog on in Market.')}
                  </span>
                </span>
              </label>
            ) : (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                <i className="bx bx-info-circle mr-1" aria-hidden="true"></i>
                {visibilityMode === 'public'
                  ? t('catalog.visibilityAutoPublic', 'Listings are public by default (Configuration → Market Setup).')
                  : t('catalog.visibilityAutoConnections', 'Listings are visible to your connections only (Configuration → Market Setup).')}
              </p>
            )}
            {showBargainToggle && (
              <label className="flex cursor-pointer items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={bargainAllowed}
                  onChange={(e) => setBargainAllowed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-gray-300 text-brand-600 focus-visible:ring-brand-500 dark:border-gray-600 dark:bg-gray-700"
                />
                <span>
                  <span className="block">{t('catalog.bargainToggle', 'Allow buyers to bargain')}</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">
                    {t('catalog.bargainHint', 'Buyers can propose a different price for this item.')}
                  </span>
                </span>
              </label>
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <div>
            {existing && (
              <Button type="button" variant="danger" onClick={handleRemove} loading={removing} disabled={busy}>
                <i className="bx bx-trash" aria-hidden="true"></i>
                {t('catalog.removeFromMarket', 'Remove from market')}
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
              {t('cancel', 'Cancel')}
            </Button>
            <Button type="submit" variant="primary" loading={saving} disabled={busy}>
              {t('save', 'Save')}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
