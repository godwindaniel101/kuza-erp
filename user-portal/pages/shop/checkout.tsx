import { useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { formatMoney } from '@/lib/format';
import { useShopCart, ShopCartItem } from '@/components/shop/useShopCart';
import { API_BASE, CHECKOUT_STASH_KEY, CheckoutStash } from '@/components/shop/checkout';

/**
 * Guest checkout for the public marketplace (Phase 2). Collects buyer contact
 * details and POSTs the cart to the backend, which splits the order per seller
 * and returns a virtual account per store. The frontend has NO payment logic —
 * it only forwards the cart and then DISPLAYS the returned instructions.
 *
 * Idempotency: a single key is generated once per checkout attempt and reused
 * on every retry, so a resubmit after a network error can never create a second
 * set of orders. Layout is bypassed for /shop, so this renders for anon users.
 */

interface SellerGroup {
  storeName: string;
  storeSlug: string;
  lines: ShopCartItem[];
  subtotal: number;
}

export default function CheckoutPage() {
  const router = useRouter();
  const cart = useShopCart();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState(false);

  // One idempotency key for the whole life of this checkout attempt. Generated
  // once on mount (client-only; crypto.randomUUID is unavailable during SSR) and
  // reused on every retry so the same submit never creates duplicate orders.
  const idempotencyKey = useRef('');
  useEffect(() => {
    if (!idempotencyKey.current) {
      try {
        idempotencyKey.current = crypto.randomUUID();
      } catch {
        idempotencyKey.current = `ck_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      }
    }
  }, []);

  // Redirect back to the market if the cart is empty (once loaded).
  useEffect(() => {
    if (cart.loaded && cart.items.length === 0 && !submitting) {
      router.replace('/shop');
    }
  }, [cart.loaded, cart.items.length, submitting, router]);

  const currency = cart.items[0]?.currency || 'NGN';

  const groups = useMemo<SellerGroup[]>(() => {
    const out: SellerGroup[] = [];
    for (const it of cart.items) {
      let g = out.find((x) => x.storeName === it.storeName);
      if (!g) {
        g = { storeName: it.storeName, storeSlug: it.storeSlug, lines: [], subtotal: 0 };
        out.push(g);
      }
      g.lines.push(it);
      g.subtotal += it.price * it.qty;
    }
    return out;
  }, [cart.items]);

  const nameValid = name.trim().length > 0;
  const phoneValid = phone.trim().length >= 7;
  const emailValid = email.trim() === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const formValid = nameValid && phoneValid && emailValid;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!formValid || submitting || cart.items.length === 0) return;

    setSubmitting(true);
    setError('');
    try {
      const body = {
        idempotencyKey: idempotencyKey.current,
        buyer: {
          name: name.trim(),
          phone: phone.trim(),
          ...(email.trim() ? { email: email.trim() } : {}),
        },
        items: cart.items.map((it) => ({ storeSlug: it.storeSlug, itemId: it.id, qty: it.qty })),
      };

      const res = await fetch(`${API_BASE}/api/public/market/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.success || !json?.data?.reference) {
        throw new Error(json?.message || 'We could not place your order. Please try again.');
      }

      const data = json.data as CheckoutStash;
      try {
        window.sessionStorage.setItem(CHECKOUT_STASH_KEY, JSON.stringify(data));
      } catch {
        /* non-fatal: order page re-fetches from the backend anyway */
      }
      cart.clear();
      router.push(`/shop/order/${data.reference}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Checkout — Kuza Market</title>
        <meta name="robots" content="noindex" />
      </Head>

      <div className="min-h-screen bg-gray-50 text-gray-900">
        {/* Top bar (matches /shop wordmark for continuity) */}
        <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
            <Link href="/shop" className="flex shrink-0 items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-gradient text-white"><i className="bx bxs-store-alt text-lg" /></span>
              <span className="text-lg font-bold tracking-tight">Kuza Market</span>
            </Link>
            <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-gray-400">
              <i className="bx bx-lock-alt" /> Secure checkout
            </span>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
          <Link href="/shop" className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
            <i className="bx bx-chevron-left text-lg" /> Continue shopping
          </Link>
          <h1 className="mb-6 text-2xl font-bold tracking-tight">Checkout</h1>

          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            {/* Buyer details */}
            <form onSubmit={submit} noValidate className="order-2 lg:order-1">
              <div className="rounded-2xl bg-white p-5 ring-1 ring-gray-100 sm:p-6">
                <h2 className="text-base font-semibold text-gray-900">Your details</h2>
                <p className="mt-1 text-sm text-gray-500">We&apos;ll use these to confirm your order and payment.</p>

                <div className="mt-5 space-y-4">
                  <Field label="Full name" required error={touched && !nameValid ? 'Please enter your name.' : ''}>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="name"
                      placeholder="Jane Doe"
                      className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 text-sm outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
                    />
                  </Field>

                  <Field label="Phone number" required error={touched && !phoneValid ? 'Please enter a valid phone number.' : ''}>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      autoComplete="tel"
                      placeholder="0801 234 5678"
                      className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 text-sm outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
                    />
                  </Field>

                  <Field label="Email" optional error={touched && !emailValid ? 'Please enter a valid email.' : ''}>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      placeholder="jane@example.com"
                      className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 text-sm outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
                    />
                  </Field>
                </div>

                {error && (
                  <div className="mt-5 flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
                    <i className="bx bx-error-circle mt-0.5 shrink-0 text-lg" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-gradient py-3.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? (
                    <><i className="bx bx-loader-alt animate-spin text-lg" /> Placing order…</>
                  ) : (
                    <>Place order &amp; get payment details</>
                  )}
                </button>
                <p className="mt-3 text-center text-xs text-gray-400">
                  You&apos;ll receive a bank account for each store to transfer to. No card details needed.
                </p>
              </div>
            </form>

            {/* Order summary */}
            <aside className="order-1 lg:order-2">
              <div className="rounded-2xl bg-white p-5 ring-1 ring-gray-100 sm:p-6 lg:sticky lg:top-24">
                <h2 className="text-base font-semibold text-gray-900">Order summary</h2>
                <div className="mt-4 space-y-5">
                  {groups.map((g) => (
                    <div key={g.storeName}>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{g.storeName}</span>
                        <span className="text-xs font-medium text-gray-400">{formatMoney(g.subtotal, currency)}</span>
                      </div>
                      <div className="space-y-2">
                        {g.lines.map((it) => (
                          <div key={it.id} className="flex items-start justify-between gap-3 text-sm">
                            <span className="min-w-0 text-gray-700">
                              <span className="line-clamp-2">{it.name}</span>
                              <span className="text-gray-400">× {it.qty}</span>
                            </span>
                            <span className="shrink-0 font-medium text-gray-900">{formatMoney(it.price * it.qty, currency)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4">
                  <span className="text-sm font-medium text-gray-500">Total</span>
                  <span className="text-xl font-bold tracking-tight text-gray-900">{formatMoney(cart.total, currency)}</span>
                </div>
                {groups.length > 1 && (
                  <p className="mt-3 text-xs text-gray-400">
                    Your order is split across {groups.length} stores. You&apos;ll pay each store separately on the next step.
                  </p>
                )}
              </div>
            </aside>
          </div>
        </main>
      </div>
    </>
  );
}

function Field({
  label,
  required,
  optional,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500">*</span>}
        {optional && <span className="text-xs font-normal text-gray-400">(optional)</span>}
      </span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}
