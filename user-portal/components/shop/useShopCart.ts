import { useCallback, useEffect, useState } from 'react';

/**
 * Client-side, anonymous shopping cart for the public marketplace (/shop).
 * Phase 1: browse + cart only — NO checkout/payment (that's a later money-path
 * phase). Persisted to localStorage; SSR-safe (loads in an effect, never at
 * module scope). Multi-seller: each line carries its store so the drawer can
 * group by seller.
 */

export interface ShopCartItem {
  id: string;
  name: string;
  price: number;
  currency: string;
  imageUrl: string | null;
  storeName: string;
  storeSlug: string;
  qty: number;
}

const KEY = 'kuza-shop-cart';

export function useShopCart() {
  const [items, setItems] = useState<ShopCartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Load once on mount (client only).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setItems(parsed);
      }
    } catch {
      /* ignore malformed/blocked storage */
    }
    setLoaded(true);
  }, []);

  // Persist after the initial load (so we never clobber saved state with []).
  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      /* ignore storage failures */
    }
  }, [items, loaded]);

  const add = useCallback((item: Omit<ShopCartItem, 'qty'>, qty = 1) => {
    setItems((prev) => {
      const i = prev.findIndex((x) => x.id === item.id);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], qty: next[i].qty + qty };
        return next;
      }
      return [...prev, { ...item, qty }];
    });
  }, []);

  const setQty = useCallback((id: string, qty: number) => {
    setItems((prev) =>
      prev.flatMap((x) => (x.id === id ? (qty <= 0 ? [] : [{ ...x, qty }]) : [x])),
    );
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const count = items.reduce((s, x) => s + x.qty, 0);
  const total = items.reduce((s, x) => s + x.price * x.qty, 0);

  return { items, add, setQty, remove, clear, count, total, loaded };
}
