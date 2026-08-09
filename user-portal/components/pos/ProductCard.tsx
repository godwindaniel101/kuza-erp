import { useTranslation } from 'next-i18next';
import type { PosProduct } from './types';
import { availableInUom, formatNaira, formatQty } from './posUtils';

interface ProductCardProps {
  product: PosProduct;
  /** Quantity of this product already in the cart (base-UOM agnostic count). */
  inCart: number;
  onAdd: (product: PosProduct) => void;
}

/**
 * Compact product cell for the category-column board. Tap to quick-add one to
 * the ticket. Kept intentionally dense (name + price, tiny stock hint) so many
 * items fit in a narrow category column.
 */
export default function ProductCard({ product, inCart, onAdd }: ProductCardProps) {
  const { t } = useTranslation('common');
  const price = product.uomPrices?.[product.defaultUomId] ?? product.price ?? 0;
  const available = availableInUom(product.stock, product.uomToBase, product.defaultUomId);
  const soldOut = available <= 0 && !product.unlimited;
  // Amount without a currency symbol (currency shows on the cart totals).
  const priceAmount = price.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <button
      type="button"
      onClick={() => onAdd(product)}
      disabled={soldOut}
      aria-label={t('pos.addProduct', 'Add {{name}} — {{price}}', { name: product.name, price: formatNaira(price) })}
      className={`group relative flex min-h-[84px] w-full flex-col gap-1 rounded-lg border px-2.5 pb-2 pt-1.5 text-left shadow-sm transition
        focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1
        focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900
        ${
          soldOut
            ? 'cursor-not-allowed border-gray-200 bg-gray-50 opacity-60 dark:border-gray-800 dark:bg-gray-900'
            : 'border-gray-200 bg-white hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md active:translate-y-0 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-brand-700'
        }`}
    >
      {inCart > 0 && (
        <span className="absolute -right-1.5 -top-1.5 z-10 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white shadow">
          {formatQty(inCart)}
        </span>
      )}

      {/* stock / count — pinned at the top */}
      {soldOut ? (
        <span className="text-[10px] font-semibold uppercase tracking-wide text-danger-600 dark:text-danger-400">
          {t('pos.soldOut', 'Sold out')}
        </span>
      ) : product.unlimited ? (
        <span className="text-[10px] text-gray-400 dark:text-gray-500">{t('pos.inStock', 'In stock')}</span>
      ) : (
        <span className="text-[10px] text-gray-400 dark:text-gray-500">
          {formatQty(available)} {product.unit}
        </span>
      )}

      {/* name */}
      <span className="line-clamp-2 flex-1 text-[12.5px] font-medium leading-tight text-gray-900 dark:text-gray-100">
        {product.name}
      </span>

      {/* amount — no currency symbol */}
      <span className="font-mono text-[13px] font-bold text-gray-900 dark:text-gray-100">
        {priceAmount}
      </span>
    </button>
  );
}
