import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { formatMoney } from '@/lib/format';
import {
  API_BASE,
  CHECKOUT_STASH_KEY,
  CheckoutStash,
  OrderStatus,
  OrderTracking,
} from '@/components/shop/checkout';

/**
 * Payment-instructions + tracking page for a guest marketplace order (Phase 2).
 * The frontend only DISPLAYS what the backend returns — there is NO payment
 * logic here. Money moves off-platform: the buyer transfers the exact amount to
 * each store's virtual account. We render the stashed checkout response instantly
 * (if its reference matches) and poll GET /checkout/:reference for authoritative
 * status. Layout is bypassed for /shop, so this renders for anonymous users.
 */

const POLL_MS = 8000;

const STATUS_META: Record<OrderStatus, { label: string; cls: string; icon: string }> = {
  awaiting: { label: 'Awaiting payment', cls: 'bg-amber-50 text-amber-700 ring-amber-200', icon: 'bx-time-five' },
  paid: { label: 'Paid', cls: 'bg-blue-50 text-blue-700 ring-blue-200', icon: 'bx-check' },
  completed: { label: 'Completed', cls: 'bg-green-50 text-green-700 ring-green-200', icon: 'bx-check-double' },
  failed: { label: 'Failed', cls: 'bg-red-50 text-red-700 ring-red-200', icon: 'bx-x' },
};

export default function OrderPage() {
  const router = useRouter();
  const reference = typeof router.query.reference === 'string' ? router.query.reference : '';

  const [stash, setStash] = useState<CheckoutStash | null>(null);
  const [tracking, setTracking] = useState<OrderTracking | null>(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);

  // Read the stashed checkout response for instant render (client-only, guarded).
  useEffect(() => {
    if (!reference) return;
    try {
      const raw = window.sessionStorage.getItem(CHECKOUT_STASH_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CheckoutStash;
        if (parsed?.reference === reference) setStash(parsed);
      }
    } catch {
      /* ignore malformed/blocked storage */
    }
  }, [reference]);

  const fetchTracking = useCallback(async () => {
    if (!reference) return;
    try {
      const res = await fetch(`${API_BASE}/api/public/market/checkout/${encodeURIComponent(reference)}`);
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success && json?.data) {
        setTracking(json.data as OrderTracking);
        setLoadError('');
      } else if (!json?.success) {
        setLoadError('We could not find this order.');
      }
    } catch {
      /* keep the last good render; transient network errors shouldn't blank the page */
    } finally {
      setLoading(false);
    }
  }, [reference]);

  // Initial fetch + poll for authoritative status.
  useEffect(() => {
    if (!reference) return;
    fetchTracking();
    const t = setInterval(fetchTracking, POLL_MS);
    return () => clearInterval(t);
  }, [reference, fetchTracking]);

  // Status by store name, from the authoritative tracking response.
  const statusByStore = useMemo(() => {
    const m = new Map<string, OrderStatus>();
    tracking?.sellers.forEach((s) => m.set(s.storeName, s.status));
    return m;
  }, [tracking]);

  // Prefer the stash (has account details) for the seller cards; fall back to
  // tracking-only sellers if the stash is absent (e.g. reopened link).
  const sellers = useMemo(() => {
    if (stash?.sellers?.length) {
      return stash.sellers.map((s) => ({
        storeName: s.storeName,
        orderNumber: s.orderNumber,
        amount: s.amount,
        currency: s.currency,
        virtualAccount: s.virtualAccount,
        status: statusByStore.get(s.storeName) ?? 'awaiting',
      }));
    }
    return (tracking?.sellers ?? []).map((s) => ({
      storeName: s.storeName,
      orderNumber: s.orderNumber,
      amount: s.amount,
      currency: s.currency,
      // The status endpoint now returns the virtual account too, so the payment
      // page works from the reference alone (no stash needed).
      virtualAccount: s.virtualAccount,
      status: s.status,
    }));
  }, [stash, tracking, statusByStore]);

  const currency = sellers[0]?.currency || 'NGN';
  const grandTotal = sellers.reduce((sum, s) => sum + Number(s.amount || 0), 0);
  const failed = stash?.failed ?? [];
  const notFound = !loading && !stash && !tracking && loadError;

  return (
    <>
      <Head>
        <title>Your order — Kuza Market</title>
        <meta name="robots" content="noindex" />
      </Head>

      <div className="min-h-screen bg-gray-50 text-gray-900">
        <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3 sm:px-6">
            <Link href="/shop" className="flex shrink-0 items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-gradient text-white"><i className="bx bxs-store-alt text-lg" /></span>
              <span className="text-lg font-bold tracking-tight">Kuza Market</span>
            </Link>
            <Link href="/shop" className="ml-auto inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
              <i className="bx bx-chevron-left text-lg" /> Back to market
            </Link>
          </div>
        </header>

        <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
          {notFound ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-white py-24 text-center text-gray-400">
              <i className="bx bx-receipt text-5xl" />
              <p className="mt-3 text-sm">{loadError}</p>
              <Link href="/shop" className="mt-4 text-sm font-semibold text-brand-600 hover:text-brand-700">Back to market</Link>
            </div>
          ) : loading && !stash && !tracking ? (
            <div className="space-y-4">
              <div className="h-24 animate-pulse rounded-2xl bg-white ring-1 ring-gray-100" />
              <div className="h-48 animate-pulse rounded-2xl bg-white ring-1 ring-gray-100" />
            </div>
          ) : (
            <>
              {/* Confirmation banner */}
              <div className="rounded-2xl bg-white p-5 ring-1 ring-gray-100 sm:p-6">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-600">
                    <i className="bx bx-check text-2xl" />
                  </span>
                  <div className="min-w-0">
                    <h1 className="text-xl font-bold tracking-tight text-gray-900">Order placed</h1>
                    <p className="mt-1 text-sm text-gray-500">
                      {tracking?.buyerName ? `Thanks, ${tracking.buyerName}. ` : ''}
                      Reference <span className="font-semibold text-gray-700">{reference}</span>
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex items-start gap-2 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800 ring-1 ring-brand-100">
                  <i className="bx bx-info-circle mt-0.5 shrink-0 text-lg" />
                  <span>Transfer the <strong>exact amount</strong> to each store&apos;s account below. Status updates automatically once each store confirms payment.</span>
                </div>
              </div>

              {/* Seller cards */}
              <div className="mt-4 space-y-4">
                {sellers.map((s) => {
                  const meta = STATUS_META[s.status] ?? STATUS_META.awaiting;
                  return (
                    <div key={s.orderNumber || s.storeName} className="rounded-2xl bg-white p-5 ring-1 ring-gray-100 sm:p-6">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h2 className="text-base font-semibold text-gray-900">{s.storeName}</h2>
                          <p className="mt-0.5 text-xs text-gray-400">Order {s.orderNumber}</p>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${meta.cls}`}>
                          <i className={`bx ${meta.icon} text-sm`} /> {meta.label}
                        </span>
                      </div>

                      <div className="mt-4 flex items-baseline justify-between border-t border-gray-100 pt-4">
                        <span className="text-sm text-gray-500">Amount to pay</span>
                        <span className="text-2xl font-bold tracking-tight text-gray-900">{formatMoney(s.amount, s.currency)}</span>
                      </div>

                      {s.virtualAccount ? (
                        <div className="mt-4 rounded-xl bg-gray-50 p-4 ring-1 ring-gray-100">
                          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Pay into this account</p>
                          <dl className="space-y-3">
                            <Row label="Bank">
                              <span className="font-medium text-gray-900">{s.virtualAccount.bankName}</span>
                            </Row>
                            <Row label="Account number">
                              <CopyValue value={s.virtualAccount.accountNumber} big />
                            </Row>
                            <Row label="Account name">
                              <span className="font-medium text-gray-900">{s.virtualAccount.accountName}</span>
                            </Row>
                          </dl>
                        </div>
                      ) : (
                        <p className="mt-4 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-500 ring-1 ring-gray-100">
                          Payment account details aren&apos;t available on this device. Check the confirmation you received at checkout.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Failed sellers */}
              {failed.length > 0 && (
                <div className="mt-4 rounded-2xl bg-white p-5 ring-1 ring-red-100 sm:p-6">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-red-700">
                    <i className="bx bx-error-circle text-lg" /> Couldn&apos;t be ordered
                  </h2>
                  <ul className="mt-3 space-y-2">
                    {failed.map((f, i) => (
                      <li key={`${f.storeName}-${i}`} className="flex items-start justify-between gap-3 text-sm">
                        <span className="font-medium text-gray-900">{f.storeName}</span>
                        <span className="text-right text-gray-500">{f.reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Grand total */}
              {sellers.length > 0 && (
                <div className="mt-4 flex items-center justify-between rounded-2xl bg-white px-5 py-4 ring-1 ring-gray-100 sm:px-6">
                  <span className="text-sm font-medium text-gray-500">
                    Grand total{sellers.length > 1 ? ` · ${sellers.length} stores` : ''}
                  </span>
                  <span className="text-xl font-bold tracking-tight text-gray-900">{formatMoney(grandTotal, currency)}</span>
                </div>
              )}

              <div className="mt-6 text-center">
                <Link href="/shop" className="inline-flex h-11 items-center rounded-full border border-gray-200 bg-white px-8 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-brand-500 hover:text-brand-600">
                  Back to market
                </Link>
              </div>
            </>
          )}
        </main>
      </div>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="min-w-0 text-right text-sm">{children}</dd>
    </div>
  );
}

function CopyValue({ value, big }: { value: string; big?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — value is still visible to copy manually */
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copy ${value}`}
      className="inline-flex items-center gap-2 rounded-lg text-gray-900 transition hover:text-brand-600"
    >
      <span className={`font-semibold tabular-nums tracking-wide ${big ? 'text-lg' : ''}`}>{value}</span>
      <i className={`bx ${copied ? 'bx-check text-green-600' : 'bx-copy'} text-base`} />
      {copied && <span className="text-xs font-medium text-green-600">Copied</span>}
    </button>
  );
}
