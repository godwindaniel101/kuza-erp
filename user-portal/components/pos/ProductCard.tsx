import { useTranslation } from 'next-i18next';
import type { PosProduct } from './types';
import {
  availableInUom,
  categoryAccent,
  formatNaira,
  formatQty,
  initials,
} from './posUtils';

interface ProductCardProps {
  product: PosProduct;
  /** Quantity of this product already in the cart (base-UOM agnostic count). */
  inCart: number;
  onAdd: (product: PosProduct) => void;
}

/**
 * Large, touch-friendly product tile. Tap anywhere to quick-add one to the
 * ticket. Shows a colour-coded avatar, name, unit price and live availability.
 */
export default function ProductCard({ product, inCart, onAdd }: ProductCardProps) {
  const { t } = useTranslation('common');
  const accent = categoryAccent(product.category);
  const price = product.uomPrices?.[product.defaultUomId] ?? product.price ?? 0;
  const available = availableInUom(product.stock, product.uomToBase, product.defaultUomId);
  const soldOut = available <= 0;

  return (
    <button
      type="button"
      onClick={() => onAdd(product)}
      disabled={soldOut}
      aria-label={t('pos.addProduct', 'Add {{name}} — {{price}}', { name: product.name, price: formatNaira(price) })}
      className={`group relative flex h-full flex-col items-start gap-1.5 rounded-xl border p-2.5 text-left transition
        focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1
        focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900
        ${
          soldOut
            ? 'cursor-not-allowed border-gray-200 bg-gray-50 opacity-60 dark:border-gray-800 dark:bg-gray-900'
            : 'border-gray-200 bg-white shadow-card hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-card-hover active:translate-y-0 active:scale-[0.99] dark:border-gray-800 dark:bg-gray-900 dark:hover:border-brand-700'
        }`}
    >
      {inCart > 0 && (
        <span className="absolute -right-1.5 -top-1.5 z-10 flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-brand-600 px-1.5 text-xs font-bold text-white shadow">
          {formatQty(inCart)}
        </span>
      )}

      <div className="flex w-full items-start justify-between gap-2">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[13px] font-bold"
          style={{ backgroundColor: accent.fill, color: accent.ink }}
          aria-hidden="true"
        >
          {initials(product.name)}
        </span>
        {soldOut && !product.unlimited ? (
          <span className="rounded-full bg-danger-100 px-2 py-0.5 text-2xs font-semibold uppercase tracking-wide text-danger-700 dark:bg-danger-900/40 dark:text-danger-300">
            {t('pos.soldOut', 'Sold out')}
          </span>
        ) : product.unlimited ? (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-2xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            {t('pos.inStock', 'In stock')}
          </span>
        ) : (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-2xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            {formatQty(available)} {product.unit}
          </span>
        )}
      </div>

      <p className="line-clamp-2 min-w-0 flex-1 text-[13px] font-semibold leading-snug text-gray-900 dark:text-gray-100">
        {product.name}
      </p>

      <p className="font-mono text-sm font-bold text-gray-900 dark:text-gray-100">
        {formatNaira(price)}
      </p>
    </button>
  );
}
