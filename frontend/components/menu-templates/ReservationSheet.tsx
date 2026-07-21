import { useEffect, useMemo, useState } from 'react';
import { PublicVenue } from '@/lib/menu-public';
import { MenuTheme } from './types';

/**
 * Guest "Reserve a table" bottom-sheet. Shares the exact scrim + `menu-sheet`
 * panel styling as `ItemSheet` (see shared.tsx): a fixed full-viewport scrim
 * that closes on outside-click, and a rounded sheet whose colors come entirely
 * from theme/accent so it matches whichever archetype is rendering it.
 *
 * Posts to the already-built public bookings endpoint and shows an inline
 * success / error state. Self-contained, SSR-safe (no browser-only work at
 * module scope), no external libraries.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';

/** Local `YYYY-MM-DD` for the date input min (avoids picking a past day). */
function todayLocalDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = `${now.getMonth() + 1}`.padStart(2, '0');
  const d = `${now.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function ReservationSheet({
  open,
  onClose,
  venue,
  theme,
  accent,
}: {
  open: boolean;
  onClose: () => void;
  venue: PublicVenue;
  theme: MenuTheme;
  accent: string;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [partySize, setPartySize] = useState('2');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Reset the form whenever the sheet is (re)opened.
  useEffect(() => {
    if (open) {
      setName('');
      setPhone('');
      setEmail('');
      setPartySize('2');
      setDate('');
      setTime('');
      setNotes('');
      setSending(false);
      setError(null);
      setDone(false);
    }
  }, [open]);

  const minDate = useMemo(() => todayLocalDate(), []);

  if (!open) return null;

  const inputStyle: React.CSSProperties = {
    backgroundColor: theme.bg,
    color: theme.text,
    border: `1px solid ${theme.border}`,
    borderRadius: theme.radius,
  };
  const labelStyle: React.CSSProperties = { color: theme.muted };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const size = parseInt(partySize, 10);

    if (!trimmedName) return setError('Please enter your name.');
    if (!trimmedPhone) return setError('Please enter a phone number.');
    if (!date || !time) return setError('Please choose a date and time.');
    if (!Number.isFinite(size) || size < 1) return setError('Party size must be at least 1.');

    const reservationAt = new Date(`${date}T${time}`);
    if (isNaN(reservationAt.getTime())) return setError('That date and time is invalid.');
    if (reservationAt.getTime() < Date.now()) return setError('Please pick a future date and time.');

    setSending(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/public/reservations/${venue.slug}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerName: trimmedName,
            customerPhone: trimmedPhone,
            customerEmail: email.trim() || undefined,
            partySize: size,
            reservationAt: reservationAt.toISOString(),
            notes: notes.trim() || undefined,
          }),
        },
      );
      const json = (await res.json().catch(() => null)) as
        | { success?: boolean; message?: string }
        | null;
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || 'We could not send your request. Please try again.');
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className="menu-scrim fixed inset-0 z-[70] flex items-end justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="menu-sheet w-full overflow-y-auto"
        style={{
          maxWidth: '760px',
          backgroundColor: theme.surface,
          borderTopLeftRadius: '28px',
          borderTopRightRadius: '28px',
          maxHeight: '90vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 p-6 pb-4">
          <div className="min-w-0">
            <h3 className="text-xl font-bold" style={{ color: theme.text, fontFamily: theme.headingFont }}>
              Reserve a table
            </h3>
            <p className="mt-1 text-sm" style={{ color: theme.muted }}>
              at {venue.name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl"
            style={{ color: theme.bg, backgroundColor: accent }}
          >
            ×
          </button>
        </div>

        {done ? (
          <div className="flex flex-col items-center gap-4 px-6 pb-10 pt-4 text-center">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full text-2xl"
              style={{ backgroundColor: `${accent}1F`, color: accent }}
              aria-hidden="true"
            >
              ✓
            </div>
            <p className="text-base font-semibold" style={{ color: theme.text }}>
              Request received — the venue will confirm shortly.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 px-6 py-3 text-sm font-bold uppercase tracking-wider transition-transform active:scale-95"
              style={{ backgroundColor: accent, color: theme.bg, borderRadius: theme.radius }}
            >
              Done
            </button>
          </div>
        ) : (
          <form className="flex flex-col gap-4 px-6 pb-8" onSubmit={handleSubmit}>
            <label className="flex flex-col gap-1.5 text-sm font-medium" style={labelStyle}>
              Name
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
                placeholder="Your name"
                className="px-3.5 py-2.5 text-base outline-none"
                style={inputStyle}
              />
            </label>

            <div className="flex flex-col gap-4 sm:flex-row">
              <label className="flex flex-1 flex-col gap-1.5 text-sm font-medium" style={labelStyle}>
                Phone
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  autoComplete="tel"
                  placeholder="Phone number"
                  className="px-3.5 py-2.5 text-base outline-none"
                  style={inputStyle}
                />
              </label>
              <label className="flex flex-1 flex-col gap-1.5 text-sm font-medium" style={labelStyle}>
                Email <span style={{ color: theme.muted }}>(optional)</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="px-3.5 py-2.5 text-base outline-none"
                  style={inputStyle}
                />
              </label>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <label className="flex flex-col gap-1.5 text-sm font-medium sm:w-28" style={labelStyle}>
                Party size
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={partySize}
                  onChange={(e) => setPartySize(e.target.value)}
                  required
                  className="px-3.5 py-2.5 text-base outline-none"
                  style={inputStyle}
                />
              </label>
              <label className="flex flex-1 flex-col gap-1.5 text-sm font-medium" style={labelStyle}>
                Date
                <input
                  type="date"
                  value={date}
                  min={minDate}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="px-3.5 py-2.5 text-base outline-none"
                  style={inputStyle}
                />
              </label>
              <label className="flex flex-1 flex-col gap-1.5 text-sm font-medium" style={labelStyle}>
                Time
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                  className="px-3.5 py-2.5 text-base outline-none"
                  style={inputStyle}
                />
              </label>
            </div>

            <label className="flex flex-col gap-1.5 text-sm font-medium" style={labelStyle}>
              Notes <span style={{ color: theme.muted }}>(optional)</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Allergies, seating preferences, special occasion…"
                className="resize-none px-3.5 py-2.5 text-base outline-none"
                style={inputStyle}
              />
            </label>

            {error && (
              <p
                className="text-sm font-medium"
                style={{ color: '#E14747' }}
                role="alert"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={sending}
              className="mt-1 inline-flex items-center justify-center px-8 py-3.5 text-sm font-bold uppercase tracking-wider transition-transform active:scale-95 disabled:opacity-60"
              style={{ backgroundColor: accent, color: theme.bg, borderRadius: theme.radius }}
            >
              {sending ? 'Sending…' : 'Request table'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
