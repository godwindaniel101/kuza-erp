import { useTranslation } from 'next-i18next';
import { formatMoney, resolveImageUrl, onItemImageError } from '@/lib/format';

/** A marketplace catalog item visible to the current buyer. */
export interface CatalogItem {
  id: string;
  supplierTenantId: string;
  supplierName: string;
  name: string;
  description?: string | null;
  unit?: string | null;
  price: number;
  currency?: string | null;
  moq?: number | null;
  available: boolean;
  isPublic?: boolean;
  imageUrl?: string | null;
  /** The supplier's inventory item behind this listing (for fulfilment on accept). */
  sourceInventoryItemId?: string | null;
}

interface CatalogItemCardProps {
  item: CatalogItem;
  /** Quantity of this item currently in the cart (0 when not added). */
  inCartQty: number;
  onAdd: (item: CatalogItem) => void;
  onSetQty: (id: string, qty: number) => void;
  onView: (item: CatalogItem) => void;
}

export default function CatalogItemCard({ item, inCartQty, onAdd, onView }: CatalogItemCardProps) {
  const { t } = useTranslation('common');
  const img = resolveImageUrl(item.imageUrl);
  const inCart = inCartQty > 0;
  const unit = item.unit ? ` ${item.unit}` : '';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onView(item)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onView(item);
        }
      }}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-xl bg-white text-left shadow-card ring-1 ring-gray-950/[0.04] transition-shadow duration-150 hover:ring-brand-300 dark:bg-gray-900 dark:ring-gray-800 dark:hover:ring-brand-700"
    >
      {/* Image — the focus of the card */}
      <div className="relative aspect-square w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt={item.name}
            onError={onItemImageError}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-300 dark:text-gray-600">
            <i className="bx bx-package text-5xl" aria-hidden="true" />
          </div>
        )}

        {/* Dim + label only when unavailable — otherwise the image stays clean */}
        {!item.available && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-black/50">
            <span className="rounded-full bg-gray-800/80 px-2 py-0.5 text-[11px] font-medium text-white">
              {t('catalog.unavailable', 'Unavailable')}
            </span>
          </div>
        )}

        {/* Compact cart+ button, top-right */}
        <button
          type="button"
          disabled={!item.available}
          aria-label={t('catalog.addToOrder', 'Add to order')}
          title={t('catalog.addToOrder', 'Add to order')}
          onClick={(e) => {
            e.stopPropagation();
            onAdd(item);
          }}
          className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-white shadow-md ring-1 ring-black/5 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <i className="bx bx-cart-add text-lg" aria-hidden="true" />
          {inCart && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-gray-900">
              {inCartQty}
            </span>
          )}
        </button>
      </div>

      {/* Compact body */}
      <div className="p-2.5">
        <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{item.name}</p>
        <p className="flex items-center gap-1 truncate text-[11px] text-gray-500 dark:text-gray-400">
          <i className="bx bx-store-alt shrink-0" aria-hidden="true" />
          <span className="truncate">{item.supplierName}</span>
        </p>
        <div className="mt-1 flex items-baseline justify-between gap-2">
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {formatMoney(item.price, item.currency || 'NGN')}
            {item.unit && <span className="text-[11px] font-normal text-gray-500 dark:text-gray-400"> / {item.unit}</span>}
          </span>
          {item.moq != null && (
            <span className="shrink-0 text-[11px] text-gray-400">
              {t('catalog.moqLabel', 'MOQ')}: {item.moq}
              {unit}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
