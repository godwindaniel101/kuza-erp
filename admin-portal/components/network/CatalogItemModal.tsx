import { useState } from 'react';
import { useTranslation } from 'next-i18next';
import Modal from '@/components/Modal';
import Button from '@/components/ui/Button';
import { formatMoney, resolveImageUrl, onItemImageError } from '@/lib/format';
import type { CatalogItem } from './CatalogItemCard';

interface CatalogItemModalProps {
  item: CatalogItem;
  /** Quantity currently in cart for this item (0 when not added). */
  inCartQty: number;
  onAdd: (qty: number) => void;
  onClose: () => void;
}

const inputClass =
  'w-24 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus-visible:ring-2 focus-visible:ring-brand-500 focus:outline-none';

export default function CatalogItemModal({ item, inCartQty, onAdd, onClose }: CatalogItemModalProps) {
  const { t } = useTranslation('common');
  const img = resolveImageUrl(item.imageUrl);
  const defaultQty = inCartQty > 0 ? inCartQty : Math.max(1, item.moq || 1);
  const [qty, setQty] = useState<number>(defaultQty);

  const handleAdd = () => {
    const n = Math.max(1, Math.floor(qty) || 1);
    onAdd(n);
    onClose();
  };

  return (
    <Modal isOpen onClose={onClose} title={t('catalog.itemDetails', 'Item details')} maxWidth="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Image */}
          <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
            {img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={img} alt={item.name} onError={onItemImageError} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-gray-300 dark:text-gray-600">
                <i className="bx bx-package text-6xl" aria-hidden="true" />
              </div>
            )}
          </div>

          {/* Meta */}
          <div className="flex flex-col">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{item.name}</h3>
            <p className="mt-1 flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
              <i className="bx bx-store-alt" aria-hidden="true" />
              {item.supplierName}
            </p>

            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {formatMoney(item.price, item.currency || 'NGN')}
              </span>
              {item.unit && <span className="text-sm text-gray-500 dark:text-gray-400">/ {item.unit}</span>}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span
                className={`rounded-full px-2 py-0.5 font-medium ${
                  item.available
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                    : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                {item.available ? t('catalog.available', 'Available') : t('catalog.unavailable', 'Unavailable')}
              </span>
              {item.moq != null && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  {t('catalog.moqLabel', 'MOQ')}: {item.moq}
                  {item.unit ? ` ${item.unit}` : ''}
                </span>
              )}
            </div>

            <div className="mt-auto pt-4">
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                {t('catalog.quantity', 'Quantity')}
                {item.unit ? ` (${item.unit})` : ''}
              </label>
              <input
                type="number"
                min={1}
                step="any"
                className={inputClass}
                value={qty}
                onChange={(e) => setQty(Number(e.target.value))}
                disabled={!item.available}
              />
            </div>
          </div>
        </div>

        {item.description && (
          <div>
            <p className="mb-1 text-xs font-medium text-gray-600 dark:text-gray-300">
              {t('catalog.description', 'Description')}
            </p>
            <p className="whitespace-pre-line text-sm text-gray-600 dark:text-gray-400">{item.description}</p>
          </div>
        )}

        <div className="flex justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-800">
          <Button variant="secondary" onClick={onClose}>
            {t('cancel', 'Cancel')}
          </Button>
          <Button variant="primary" onClick={handleAdd} disabled={!item.available}>
            <i className="bx bx-cart-add" aria-hidden="true" />
            {inCartQty > 0 ? t('cart.updateCart', 'Update cart') : t('catalog.addToOrder', 'Add to order')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
