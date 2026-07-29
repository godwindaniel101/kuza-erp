import { useTranslation } from 'next-i18next';
import { OrderIcon, CustomerIcon, DiningIcon, PaymentIcon, ChevronIcon } from '@/components/icons';
import CartLine from './CartLine';
import { formatNaira } from './posUtils';
import type { CartLine as CartLineType, OrderMeta, OrderType, PosTable } from './types';

interface CartPanelProps {
  lines: CartLineType[];
  meta: OrderMeta;
  tables: PosTable[];
  subtotal: number;
  vat: number;
  total: number;
  itemCount: number;
  saving: boolean;
  onType: (type: OrderType) => void;
  onQty: (productId: string, quantity: number) => void;
  onUom: (productId: string, uomId: string) => void;
  onRemove: (productId: string) => void;
  onClear: () => void;
  onOpenDetails: () => void;
  onSubmit: () => void;
  /** Optional close handler for the mobile drawer. */
  onClose?: () => void;
}

// Retail POS order types — no "Dine in" (that's a Restaurant concept; the
// restaurant order flow at /rms/orders/create has its own dine-in/tables UI).
const ORDER_TYPES: { key: OrderType; labelKey: string; label: string }[] = [
  { key: 'takeaway', labelKey: 'pos.walkIn', label: 'Walk-in' },
  { key: 'delivery', labelKey: 'pos.delivery', label: 'Delivery' },
];

/**
 * Right pane: the running ticket — order type, line items, totals and the
 * primary Charge action. Header/footer stay put; only the line list scrolls.
 */
export default function CartPanel({
  lines,
  meta,
  tables,
  subtotal,
  vat,
  total,
  itemCount,
  saving,
  onType,
  onQty,
  onUom,
  onRemove,
  onClear,
  onOpenDetails,
  onSubmit,
  onClose,
}: CartPanelProps) {
  const { t } = useTranslation('common');
  const empty = lines.length === 0;
  const tableName = meta.tableId
    ? tables.find((tbl) => tbl.id === meta.tableId)?.name ||
      t('pos.tableNumber', 'Table {{number}}', { number: tables.find((tbl) => tbl.id === meta.tableId)?.number ?? '' }).trim()
    : '';
  const detailsSummary = [meta.customerName || null, tableName || null]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-card dark:border-gray-800 dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <span className="text-brand-600 dark:text-brand-400">
            <OrderIcon size={20} />
          </span>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {t('pos.currentOrder', 'Current order')}
          </h2>
          {itemCount > 0 && (
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
              {itemCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!empty && (
            <button
              type="button"
              onClick={onClear}
              className="rounded-md px-2 py-1 text-xs font-medium text-gray-500 transition hover:bg-gray-100 hover:text-danger-600 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              {t('pos.clear', 'Clear')}
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label={t('pos.closeCart', 'Close cart')}
              className="rounded-md p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 lg:hidden"
            >
              <ChevronIcon size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Order type segmented control */}
      <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
          {ORDER_TYPES.map((ot) => {
            const active = meta.type === ot.key;
            return (
              <button
                key={ot.key}
                type="button"
                onClick={() => onType(ot.key)}
                className={`h-8 rounded-md text-[13px] font-medium transition
                  ${
                    active
                      ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100'
                      : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
              >
                {t(ot.labelKey, ot.label)}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onOpenDetails}
          className="mt-2 flex w-full items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-left text-[13px] transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/60"
        >
          <span className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
            <CustomerIcon size={16} />
            {detailsSummary || t('pos.addCustomerDetails', 'Add customer, table & notes')}
          </span>
          <span className="text-gray-400">
            <DiningIcon size={16} />
          </span>
        </button>
      </div>

      {/* Lines */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4">
        {empty ? (
          <div className="flex h-full flex-col items-center justify-center py-10 text-center">
            <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500">
              <OrderIcon size={26} />
            </span>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
              {t('pos.noItemsYet', 'No items yet')}
            </p>
            <p className="mt-1 max-w-[14rem] text-xs text-gray-400 dark:text-gray-500">
              {t('pos.tapProductToStart', 'Tap a product on the left to start building this order.')}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {lines.map((line) => (
              <CartLine
                key={line.productId}
                line={line}
                onQty={onQty}
                onUom={onUom}
                onRemove={onRemove}
              />
            ))}
          </div>
        )}
      </div>

      {/* Totals + pay */}
      <div className="border-t border-gray-100 px-4 py-3 dark:border-gray-800">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-gray-500 dark:text-gray-400">{t('pos.subtotal', 'Subtotal')}</span>
            <span className="font-mono font-medium text-gray-900 dark:text-gray-100">
              {formatNaira(subtotal)}
            </span>
          </div>
          {meta.applyVat && vat > 0 && (
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-gray-500 dark:text-gray-400">
                {t('pos.vatWithRate', 'VAT ({{rate}}%)', { rate: meta.vatPercentage })}
              </span>
              <span className="font-mono font-medium text-gray-900 dark:text-gray-100">
                {formatNaira(vat)}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between pt-1.5">
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {t('pos.total', 'Total')}
            </span>
            <span className="font-mono text-xl font-bold text-gray-900 dark:text-gray-100">
              {formatNaira(total)}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onSubmit}
          disabled={empty || saving}
          className="mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-brand-gradient text-base font-semibold text-white shadow-sm transition
            hover:bg-brand-gradient-hover active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
        >
          {saving ? (
            <>
              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {t('pos.placing', 'Placing…')}
            </>
          ) : (
            <>
              <PaymentIcon size={20} />
              {empty ? t('pos.charge', 'Charge') : t('pos.chargeAmount', 'Charge {{amount}}', { amount: formatNaira(total) })}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
