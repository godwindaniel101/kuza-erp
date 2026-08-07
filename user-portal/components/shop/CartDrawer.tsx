import { useEffect } from 'react';
import { formatMoney, ITEM_PLACEHOLDER, onItemImageError } from '@/lib/format';
import { ShopCartItem } from './useShopCart';

/**
 * Slide-in cart drawer for the public marketplace. Items are grouped by seller
 * (multi-seller cart) with a per-store subtotal + grand total. Checkout is
 * Phase 2: the button navigates to the guest checkout (via onCheckout); the
 * frontend only DISPLAYS payment instructions — there is no payment logic here.
 */

interface Props {
  open: boolean;
  onClose: () => void;
  items: ShopCartItem[];
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  total: number;
  onCheckout: () => void;
}

export default function CartDrawer({ open, onClose, items, setQty, remove, total, onCheckout }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const currency = items[0]?.currency || 'NGN';

  // Group lines by store, preserving first-seen order.
  const groups: { storeName: string; storeSlug: string; lines: ShopCartItem[]; subtotal: number }[] = [];
  for (const it of items) {
    let g = groups.find((x) => x.storeName === it.storeName);
    if (!g) {
      g = { storeName: it.storeName, storeSlug: it.storeSlug, lines: [], subtotal: 0 };
      groups.push(g);
    }
    g.lines.push(it);
    g.subtotal += it.price * it.qty;
  }

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Your cart">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px]" onClick={onClose} />
      <div className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-lg font-bold tracking-tight text-gray-900">
            Your cart{items.length > 0 && <span className="ml-1 text-gray-400">({items.reduce((s, x) => s + x.qty, 0)})</span>}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close cart" className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            <i className="bx bx-x text-2xl" />
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-gray-400">
              <i className="bx bx-cart text-5xl" />
              <p className="mt-3 text-sm">Your cart is empty.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {groups.map((g) => (
                <div key={g.storeName}>
                  <div className="mb-2 flex items-center justify-between">
                    <a href={`/s/${g.storeSlug}`} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold uppercase tracking-wide text-gray-500 hover:text-brand-600">
                      {g.storeName}
                    </a>
                    <span className="text-xs font-medium text-gray-400">{formatMoney(g.subtotal, currency)}</span>
                  </div>
                  <div className="space-y-3">
                    {g.lines.map((it) => (
                      <div key={it.id} className="flex gap-3">
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-50">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={it.imageUrl || ITEM_PLACEHOLDER} onError={onItemImageError} alt={it.name} className="h-full w-full object-cover" />
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <div className="flex items-start justify-between gap-2">
                            <p className="line-clamp-2 text-sm font-medium text-gray-900">{it.name}</p>
                            <button type="button" onClick={() => remove(it.id)} aria-label="Remove" className="shrink-0 text-gray-300 hover:text-red-500">
                              <i className="bx bx-trash" />
                            </button>
                          </div>
                          <div className="mt-auto flex items-center justify-between">
                            <div className="flex items-center rounded-lg ring-1 ring-gray-200">
                              <button type="button" onClick={() => setQty(it.id, it.qty - 1)} aria-label="Decrease" className="px-2 py-1 text-gray-500 hover:text-gray-900"><i className="bx bx-minus" /></button>
                              <span className="min-w-[1.75rem] text-center text-sm font-medium tabular-nums">{it.qty}</span>
                              <button type="button" onClick={() => setQty(it.id, it.qty + 1)} aria-label="Increase" className="px-2 py-1 text-gray-500 hover:text-gray-900"><i className="bx bx-plus" /></button>
                            </div>
                            <span className="text-sm font-semibold text-gray-900">{formatMoney(it.price * it.qty, currency)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-gray-100 px-5 py-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-gray-500">Total</span>
              <span className="text-xl font-bold tracking-tight text-gray-900">{formatMoney(total, currency)}</span>
            </div>
            <button
              type="button"
              onClick={onCheckout}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-gradient py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
            >
              Checkout <i className="bx bx-right-arrow-alt text-lg" />
            </button>
            <p className="mt-2 text-center text-xs text-gray-400">You&apos;ll get a bank account to pay each store directly.</p>
          </div>
        )}
      </div>
    </div>
  );
}
