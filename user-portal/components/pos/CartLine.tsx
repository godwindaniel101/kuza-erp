import { useTranslation } from 'next-i18next';
import { DeleteIcon } from '@/components/icons';
import type { CartLine as CartLineType } from './types';
import { availableInUom, formatNaira } from './posUtils';

interface CartLineProps {
  line: CartLineType;
  onQty: (productId: string, quantity: number) => void;
  onUom: (productId: string, uomId: string) => void;
  onRemove: (productId: string) => void;
}

/**
 * One ticket row: name + remove on top, then an editable quantity, the unit and
 * the line total below. Quantity is a plain editable field (no +/- stepper),
 * clamped to available stock.
 */
export default function CartLine({ line, onQty, onUom, onRemove }: CartLineProps) {
  const { t } = useTranslation('common');
  const max = availableInUom(line.stockBase, line.uomToBase, line.uomId);
  const lineTotal = line.unitPrice * line.quantity;
  const hasMultipleUoms = line.uoms.length > 1;

  const clampQty = (n: number) => {
    let next = Number.isFinite(n) ? n : 1;
    if (next < 1) next = 1;
    if (max > 0 && next > max) next = max;
    return next;
  };

  return (
    <div className="p-2">
      {/* Row 1: name + remove */}
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 flex-1 truncate text-sm text-gray-900 dark:text-gray-100">
          {line.name}
        </p>
        <button
          type="button"
          onClick={() => onRemove(line.productId)}
          aria-label={t('pos.removeItem', 'Remove {{name}}', { name: line.name })}
          className="-mr-1 -mt-0.5 rounded-md p-1 text-gray-400 transition hover:bg-danger-50 hover:text-danger-600 dark:hover:bg-danger-900/30 dark:hover:text-danger-400"
        >
          <DeleteIcon size={16} />
        </button>
      </div>

      {/* Row 2: qty (editable) + unit, and the line total */}
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <input
            type="number"
            inputMode="decimal"
            value={line.quantity || ''}
            onChange={(e) => onQty(line.productId, clampQty(Number(e.target.value)))}
            onFocus={(e) => e.currentTarget.select()}
            aria-label={t('pos.quantity', 'Quantity')}
            className="h-8 w-14 rounded-md border border-gray-200 bg-white text-center font-mono text-sm text-gray-900
              focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100
              [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          {hasMultipleUoms ? (
            <select
              value={line.uomId}
              onChange={(e) => onUom(line.productId, e.target.value)}
              aria-label={t('pos.unit', 'Unit')}
              className="h-8 max-w-[7.5rem] rounded-md border border-gray-200 bg-white px-1.5 text-xs text-gray-700 focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            >
              {line.uoms.map((uom) => (
                <option key={uom.id} value={uom.id}>
                  {uom.abbreviation ? `${uom.name} (${uom.abbreviation})` : uom.name}
                </option>
              ))}
            </select>
          ) : (
            <span className="truncate text-xs text-gray-400 dark:text-gray-500">
              {line.uoms[0]?.abbreviation || line.uoms[0]?.name}
            </span>
          )}
        </div>
        <span className="shrink-0 font-mono text-sm text-gray-900 dark:text-gray-100">
          {formatNaira(lineTotal)}
        </span>
      </div>
    </div>
  );
}
