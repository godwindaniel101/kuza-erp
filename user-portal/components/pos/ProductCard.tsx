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
  // Split the currency symbol from the amount so the symbol can render smaller.
  const priceStr = formatNaira(price);
  const priceMatch = priceStr.match(/^(\D*)(.*)$/);
  const priceSymbol = priceMatch?.[1] ?? '';
  const priceAmount = priceMatch?.[2] ?? priceStr;

  return (
    <button
      type="button"
      onClick={() => onAdd(product)}
      disabled={soldOut}
      aria-label={t('pos.addProduct', 'Add {{name}} — {{price}}', { name: product.name, price: formatNaira(price) })}
      className={`group relative flex min-h-[76px] w-full flex-col justify-between gap-1 px-2 py-2 text-left transition
        focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500
        ${
          soldOut
            ? 'cursor-not-allowed bg-gray-50 opacity-50 dark:bg-gray-900'
            : 'bg-white hover:bg-brand-50/70 active:bg-brand-100/70 dark:bg-gray-900 dark:hover:bg-brand-500/10'
        }`}
    >
      {inCart > 0 && (
        <span className="absolute -right-1.5 -top-1.5 z-10 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white shadow">
          {formatQty(inCart)}
        </span>
      )}

      <span className="line-clamp-2 text-[12.5px] font-medium leading-tight text-gray-900 dark:text-gray-100">
        {product.name}
      </span>
      <span className="flex items-baseline gap-1.5">
        <span className="flex items-baseline font-mono">
          <span className="text-[9px] font-semibold text-gray-400 dark:text-gray-500">{priceSymbol}</span>
          <span className="text-[13px] font-bold text-gray-900 dark:text-gray-100">{priceAmount}</span>
        </span>
        {soldOut ? (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-danger-600 dark:text-danger-400">
            {t('pos.soldOut', 'Sold out')}
          </span>
        ) : !product.unlimited ? (
          <span className="text-[10px] text-gray-400 dark:text-gray-500">
            {formatQty(available)} {product.unit}
          </span>
        ) : null}
      </span>
    </button>
  );
}
