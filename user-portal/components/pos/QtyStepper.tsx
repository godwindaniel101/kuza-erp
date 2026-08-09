import { useTranslation } from 'next-i18next';
import { AddIcon } from '@/components/icons';

interface QtyStepperProps {
  value: number;
  onChange: (next: number) => void;
  /** Max whole units allowed (stock-bound). Undefined = unbounded. */
  max?: number;
  min?: number;
  size?: 'sm' | 'md';
  disabled?: boolean;
}

/** Minus glyph — no dedicated icon in the set, so a stroke-matched inline mark. */
function MinusGlyph({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
    </svg>
  );
}

/**
 * Touch-friendly quantity control: big +/- targets flanking a direct-entry
 * field. Clamps to [min, max] on every change.
 */
export default function QtyStepper({
  value,
  onChange,
  max,
  min = 1,
  size = 'md',
  disabled = false,
}: QtyStepperProps) {
  const { t } = useTranslation('common');
  const btn =
    size === 'sm'
      ? 'h-6 w-6'
      : 'h-10 w-10';
  const field = size === 'sm' ? 'h-6 w-9 text-[13px]' : 'h-10 w-12 text-base';

  const clamp = (n: number) => {
    let next = Number.isFinite(n) ? n : min;
    if (next < min) next = min;
    if (max != null && next > max) next = max;
    return next;
  };

  const atMax = max != null && value >= max;

  return (
    <div className="inline-flex items-center rounded-lg border border-gray-200 dark:border-gray-700">
      <button
        type="button"
        onClick={() => onChange(clamp(value - 1))}
        disabled={disabled || value <= min}
        aria-label={t('pos.decreaseQuantity', 'Decrease quantity')}
        className={`${btn} flex items-center justify-center rounded-l-lg text-gray-600 transition
          hover:bg-gray-100 disabled:opacity-40 dark:text-gray-300 dark:hover:bg-gray-800`}
      >
        <MinusGlyph size={size === 'sm' ? 16 : 18} />
      </button>
      <input
        type="number"
        inputMode="decimal"
        value={value || ''}
        onChange={(e) => onChange(clamp(Number(e.target.value)))}
        onFocus={(e) => e.currentTarget.select()}
        disabled={disabled}
        aria-label={t('pos.quantity', 'Quantity')}
        className={`${field} border-x border-gray-200 bg-transparent text-center font-mono font-semibold
          text-gray-900 focus:outline-none dark:border-gray-700 dark:text-gray-100
          [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
      />
      <button
        type="button"
        onClick={() => onChange(clamp(value + 1))}
        disabled={disabled || atMax}
        aria-label={t('pos.increaseQuantity', 'Increase quantity')}
        className={`${btn} flex items-center justify-center rounded-r-lg text-gray-600 transition
          hover:bg-gray-100 disabled:opacity-40 dark:text-gray-300 dark:hover:bg-gray-800`}
      >
        <AddIcon size={size === 'sm' ? 16 : 18} />
      </button>
    </div>
  );
}
