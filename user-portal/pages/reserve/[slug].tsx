import { useState } from 'react';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import { fetchPublicMenu, PublicVenue } from '@/lib/menu-public';

interface Props {
  venue: Pick<PublicVenue, 'name' | 'tagline' | 'logoUrl' | 'accentColor' | 'address' | 'phone'> | null;
  slug: string;
}

const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';

/**
 * PUBLIC reservation request page — a standalone branded form a guest can open
 * directly (or via QR) to request a table. No auth. Posts to the public
 * endpoint which creates a `pending` request the venue confirms.
 *
 * Layout.tsx bypasses auth redirects for '/reserve/' (see its public-path checks).
 */
export default function ReservePage({ venue, slug }: Props) {
  const accent = venue?.accentColor || '#2563EB';
  const [form, setForm] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    partySize: '2',
    date: '',
    time: '',
    notes: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  if (!venue) {
    return (
      <>
        <Head>
          <title>Reservations unavailable</title>
          <meta name="robots" content="noindex" />
        </Head>
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6 text-center text-gray-800">
          <div className="text-5xl" aria-hidden="true">📅</div>
          <h1 className="mt-4 text-xl font-bold">Reservations aren&apos;t available</h1>
          <p className="mt-2 max-w-xs text-sm text-gray-500">
            This venue isn&apos;t taking online reservations right now.
          </p>
        </div>
      </>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.customerName.trim()) return setError('Please enter your name.');
    if (!form.customerPhone.trim()) return setError('Please enter a phone number.');
    if (!form.date || !form.time) return setError('Please pick a date and time.');
    const reservationAt = new Date(`${form.date}T${form.time}`);
    if (Number.isNaN(reservationAt.getTime())) return setError('Invalid date or time.');
    if (reservationAt.getTime() < Date.now()) return setError('Please pick a future date and time.');
    const party = parseInt(form.partySize, 10);
    if (!party || party < 1) return setError('Please enter the number of guests.');

    setSubmitting(true);
    try {
      const res = await fetch(
        `${API_ORIGIN}/api/public/reservations/${encodeURIComponent(slug)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerName: form.customerName.trim(),
            customerPhone: form.customerPhone.trim(),
            customerEmail: form.customerEmail.trim() || undefined,
            partySize: party,
            reservationAt: reservationAt.toISOString(),
            notes: form.notes.trim() || undefined,
          }),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || 'Could not submit your request. Please try again.');
      }
      setDone(true);
    } catch (err: any) {
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls =
    'w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-transparent focus:ring-2';
  const labelCls = 'mb-1 block text-[13px] font-medium text-gray-700';

  return (
    <>
      <Head>
        <title>Reserve a table — {venue.name}</title>
        <meta name="robots" content="noindex" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className="min-h-screen bg-gray-50 px-4 py-10">
        <div className="mx-auto w-full max-w-md">
          {/* Brand header */}
          <div className="mb-6 text-center">
            {venue.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={venue.logoUrl}
                alt={venue.name}
                className="mx-auto mb-4 h-20 w-20 object-contain"
                style={{ filter: `drop-shadow(0 0 18px ${accent}44)` }}
              />
            )}
            <h1 className="text-2xl font-black tracking-tight text-gray-900">{venue.name}</h1>
            <p className="mt-1 text-sm text-gray-500">Reserve a table</p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            {done ? (
              <div className="py-8 text-center">
                <div
                  className="mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl text-white"
                  style={{ backgroundColor: accent }}
                >
                  ✓
                </div>
                <h2 className="mt-4 text-lg font-bold text-gray-900">Request received</h2>
                <p className="mt-2 text-sm text-gray-500">
                  Thanks, {form.customerName.split(' ')[0] || 'there'}! {venue.name} will confirm your
                  reservation shortly{form.customerEmail ? ' by email' : ''}.
                </p>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className={labelCls}>Full name</label>
                  <input
                    className={inputCls}
                    style={{ ['--tw-ring-color' as string]: accent }}
                    value={form.customerName}
                    onChange={(e) => set('customerName', e.target.value)}
                    placeholder="Your name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Phone</label>
                    <input
                      className={inputCls}
                      style={{ ['--tw-ring-color' as string]: accent }}
                      value={form.customerPhone}
                      onChange={(e) => set('customerPhone', e.target.value)}
                      placeholder="+234…"
                      inputMode="tel"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Guests</label>
                    <input
                      className={inputCls}
                      style={{ ['--tw-ring-color' as string]: accent }}
                      type="number"
                      min={1}
                      max={100}
                      value={form.partySize}
                      onChange={(e) => set('partySize', e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Email (optional)</label>
                  <input
                    className={inputCls}
                    style={{ ['--tw-ring-color' as string]: accent }}
                    type="email"
                    value={form.customerEmail}
                    onChange={(e) => set('customerEmail', e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Date</label>
                    <input
                      className={inputCls}
                      style={{ ['--tw-ring-color' as string]: accent }}
                      type="date"
                      value={form.date}
                      onChange={(e) => set('date', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Time</label>
                    <input
                      className={inputCls}
                      style={{ ['--tw-ring-color' as string]: accent }}
                      type="time"
                      value={form.time}
                      onChange={(e) => set('time', e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Notes (optional)</label>
                  <textarea
                    className={`${inputCls} resize-none`}
                    style={{ ['--tw-ring-color' as string]: accent }}
                    rows={2}
                    value={form.notes}
                    onChange={(e) => set('notes', e.target.value)}
                    placeholder="Occasion, seating preference…"
                  />
                </div>

                {error && <p className="text-sm font-medium text-red-600">{error}</p>}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-lg py-3 text-sm font-bold text-white transition-opacity disabled:opacity-60"
                  style={{ backgroundColor: accent }}
                >
                  {submitting ? 'Sending…' : 'Request reservation'}
                </button>
                <p className="text-center text-xs text-gray-400">
                  We&apos;ll hold your request and confirm shortly.
                </p>
              </form>
            )}
          </div>

          <p className="mt-6 text-center text-xs text-gray-400">Powered by Kuza</p>
        </div>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async ({ params }) => {
  const slug = String(params?.slug || '');
  const data = await fetchPublicMenu(slug).catch(() => null);
  const v = data?.venue;
  return {
    props: {
      slug,
      venue: v
        ? {
            name: v.name,
            tagline: v.tagline,
            logoUrl: v.logoUrl,
            accentColor: v.accentColor,
            address: v.address,
            phone: v.phone,
          }
        : null,
    },
  };
};
