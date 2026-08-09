import { useState } from 'react';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/format';

export interface CartLine {
  id: string;
  name: string;
  qty: number;
  unit?: string | null;
  price: number;
  currency?: string | null;
  /** The supplier's inventory item this line maps to (for fulfilment on accept). */
  sourceInventoryItemId?: string | null;
}

export interface CartGroup {
  supplierTenantId: string;
  supplierName: string;
  lines: CartLine[];
}

interface CatalogCartDrawerProps {
  groups: CartGroup[];
  onSetQty: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
  /** Called after checkout finishes (success message + count) so the page can clear + navigate. */
  onCheckoutDone: (message: string) => void;
  onError: (message: string) => void;
}

const groupCurrency = (g: CartGroup) => g.lines[0]?.currency || 'NGN';
const groupSubtotal = (g: CartGroup) => g.lines.reduce((sum, l) => sum + l.price * l.qty, 0);

export default function CatalogCartDrawer({
  groups,
  onSetQty,
  onRemove,
  onClose,
  onCheckoutDone,
  onError,
}: CatalogCartDrawerProps) {
  const { t } = useTranslation('common');
  const [submitting, setSubmitting] = useState(false);

  const itemCount = groups.reduce((n, g) => n + g.lines.length, 0);
  const supplierCount = groups.length;
  const grandTotalByCurrency = groups.reduce<Record<string, number>>((acc, g) => {
    const cur = groupCurrency(g);
    acc[cur] = (acc[cur] || 0) + groupSubtotal(g);
    return acc;
  }, {});

  const handleCheckout = async () => {
    if (itemCount === 0 || submitting) return;
    setSubmitting(true);
    try {
      const results = await Promise.allSettled(
        groups.map((g) =>
          api.post<{ success: boolean; data: { id: string } }>('/network/orders', {
            supplierTenantId: g.supplierTenantId,
            supplierName: g.supplierName,
            submit: true,
            items: g.lines.map((l) => {
              // Catalog prices arrive as decimal STRINGS from the API; the order
              // DTO requires numbers, so coerce (drop price if not a finite number).
              // TODO(bargain-offer-flow): when the listing has bargainAllowed, let
              // the buyer propose a price here (offer/counter) instead of sending
              // the catalog price as-is.
              const price = Number(l.price);
              return {
                description: l.name,
                sourceInventoryItemId: l.sourceInventoryItemId || undefined,
                quantity: Number(l.qty),
                unit: l.unit || undefined,
                unitPrice: Number.isFinite(price) ? price : undefined,
              };
            }),
          }),
        ),
      );

      const succeeded = results.filter((r) => r.status === 'fulfilled' && r.value?.success).length;
      const failed = supplierCount - succeeded;

      if (succeeded === 0) {
        onError(t('cart.checkoutAllFailed', 'Could not create any requests. Please try again.'));
        return;
      }

      let message = t('cart.checkoutSuccess', 'Created {{count}} request(s) across {{suppliers}} supplier(s)')
        .replace('{{count}}', String(succeeded))
        .replace('{{suppliers}}', String(succeeded));
      if (failed > 0) {
        message += ` — ${t('cart.checkoutPartial', '{{failed}} failed').replace('{{failed}}', String(failed))}`;
      }
      onCheckoutDone(message);
    } catch {
      onError(t('cart.checkoutAllFailed', 'Could not create any requests. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-gray-950/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      {/* Panel */}
      <div className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-popover dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-800">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {t('cart.title', 'Your order')}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('cart.summary', '{{items}} items · {{suppliers}} suppliers')
                .replace('{{items}}', String(itemCount))
                .replace('{{suppliers}}', String(supplierCount))}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('cart.close', 'Close')}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            <i className="bx bx-x text-2xl" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {itemCount === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-gray-400 dark:text-gray-500">
              <i className="bx bx-cart text-5xl" aria-hidden="true" />
              <p className="mt-2 text-sm">{t('cart.empty', 'Your cart is empty')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {groups.map((g) => {
                const cur = groupCurrency(g);
                return (
                  <div key={g.supplierTenantId} className="rounded-xl border border-gray-200 dark:border-gray-800">
                    <div className="flex items-center gap-1.5 border-b border-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 dark:border-gray-800 dark:text-gray-200">
                      <i className="bx bx-store-alt text-gray-400" aria-hidden="true" />
                      <span className="truncate">{g.supplierName}</span>
                    </div>
                    <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                      {g.lines.map((l) => (
                        <li key={l.id} className="flex items-start gap-3 px-3 py-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{l.name}</p>
                            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                              {formatMoney(l.price, cur)}
                              {l.unit ? ` / ${l.unit}` : ''}
                            </p>
                            <div className="mt-2 flex items-center gap-2">
                              <div className="flex items-center rounded-lg border border-gray-300 dark:border-gray-600">
                                <button
                                  type="button"
                                  aria-label={t('cart.decrease', 'Decrease quantity')}
                                  onClick={() => onSetQty(l.id, l.qty - 1)}
                                  className="flex h-7 w-7 items-center justify-center rounded-l-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                                >
                                  <i className="bx bx-minus" aria-hidden="true" />
                                </button>
                                <span className="min-w-[2rem] px-1 text-center text-sm font-medium text-gray-900 dark:text-gray-100">
                                  {l.qty}
                                </span>
                                <button
                                  type="button"
                                  aria-label={t('cart.increase', 'Increase quantity')}
                                  onClick={() => onSetQty(l.id, l.qty + 1)}
                                  className="flex h-7 w-7 items-center justify-center rounded-r-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                                >
                                  <i className="bx bx-plus" aria-hidden="true" />
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => onRemove(l.id)}
                                className="text-xs text-gray-400 hover:text-red-500"
                              >
                                {t('cart.remove', 'Remove')}
                              </button>
                            </div>
                          </div>
                          <div className="shrink-0 text-right text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {formatMoney(l.price * l.qty, cur)}
                          </div>
                        </li>
                      ))}
                    </ul>
                    <div className="flex items-center justify-between border-t border-gray-200 px-3 py-2 text-sm dark:border-gray-800">
                      <span className="text-gray-500 dark:text-gray-400">{t('cart.subtotal', 'Subtotal')}</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {formatMoney(groupSubtotal(g), cur)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {itemCount > 0 && (
          <div className="border-t border-gray-200 px-5 py-4 dark:border-gray-800">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('cart.total', 'Total')}</span>
              <span className="text-right text-base font-semibold text-gray-900 dark:text-gray-100">
                {Object.entries(grandTotalByCurrency)
                  .map(([cur, amt]) => formatMoney(amt, cur))
                  .join(' + ')}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCheckout}
              disabled={submitting}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-brand-gradient px-4 text-sm font-medium text-white transition-colors hover:bg-brand-gradient-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting && (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              )}
              {t('cart.createRequests', 'Create requests')}
            </button>
            <p className="mt-2 text-center text-[11px] text-gray-400 dark:text-gray-500">
              {t('cart.oneOrderPerSupplier', 'One request is created per supplier.')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
