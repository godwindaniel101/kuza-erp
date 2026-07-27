import { useState, useEffect, useCallback, useMemo } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import Toast from '@/components/Toast';
import Modal from '@/components/Modal';
import Button from '@/components/ui/Button';
import FormField from '@/components/ui/FormField';
import PageHeader from '@/components/ui/PageHeader';
import SearchableSelect from '@/components/SearchableSelect';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ReservationStatus =
  | 'pending'
  | 'confirmed'
  | 'seated'
  | 'completed'
  | 'cancelled'
  | 'no_show';

interface Reservation {
  id: string;
  branchId?: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  partySize: number;
  reservationAt: string; // ISO
  durationMins?: number;
  status: ReservationStatus;
  tableLabel?: string;
  notes?: string;
  source?: 'staff' | 'online';
  createdByName?: string;
  createdAt?: string;
}

interface Branch {
  id: string;
  name: string;
  isDefault?: boolean;
}

interface ReservationForm {
  branchId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  partySize: string;
  date: string;
  time: string;
  durationMins: string;
  tableLabel: string;
  notes: string;
}

// ---------------------------------------------------------------------------
// Status metadata (color per status)
// ---------------------------------------------------------------------------

const STATUS_META: Record<
  ReservationStatus,
  { label: string; icon: string; pill: string }
> = {
  pending: {
    label: 'Pending',
    icon: 'bx-time-five',
    pill: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/20',
  },
  confirmed: {
    label: 'Confirmed',
    icon: 'bx-check-circle',
    pill: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20',
  },
  seated: {
    label: 'Seated',
    icon: 'bx-chair',
    pill: 'bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-400/20',
  },
  completed: {
    label: 'Completed',
    icon: 'bx-check-double',
    pill: 'bg-gray-100 text-gray-600 ring-gray-500/20 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-500/20',
  },
  cancelled: {
    label: 'Cancelled',
    icon: 'bx-x-circle',
    pill: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-400/20',
  },
  no_show: {
    label: 'No-show',
    icon: 'bx-user-x',
    pill: 'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-400/20',
  },
};

const STATUS_ORDER: ReservationStatus[] = [
  'pending',
  'confirmed',
  'seated',
  'completed',
  'cancelled',
  'no_show',
];

function StatusBadge({ status, label }: { status: ReservationStatus; label: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.pending;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ring-1 ring-inset ${meta.pill}`}
    >
      <i className={`bx ${meta.icon}`} aria-hidden="true"></i>
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Date helpers (local-time aware)
// ---------------------------------------------------------------------------

function pad(n: number) {
  return String(n).padStart(2, '0');
}

/** YYYY-MM-DD for a Date, in local time. */
function toDateInput(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** HH:MM for a Date, in local time. */
function toTimeInput(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function todayInput(): string {
  return toDateInput(new Date());
}

/** Start/end of a local day (YYYY-MM-DD) as ISO strings. */
function dayRangeISO(dateStr: string): { from: string; to: string } {
  const start = new Date(`${dateStr}T00:00:00`);
  const end = new Date(`${dateStr}T23:59:59.999`);
  return { from: start.toISOString(), to: end.toISOString() };
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** First day of the month containing `d`. */
function monthStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/**
 * The 42 day cells (6 weeks, Sunday-first) covering the month that contains
 * `month`. Cells before/after the current month spill into adjacent months.
 */
function monthGridDays(month: Date): Date[] {
  const first = monthStart(month);
  const start = new Date(first);
  start.setDate(1 - first.getDay()); // back up to the Sunday on/before the 1st
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}

/** ISO range covering the full 6-week grid for the visible month. */
function monthGridRangeISO(month: Date): { from: string; to: string } {
  const days = monthGridDays(month);
  const first = days[0];
  const last = days[days.length - 1];
  const from = new Date(`${toDateInput(first)}T00:00:00`);
  const to = new Date(`${toDateInput(last)}T23:59:59.999`);
  return { from: from.toISOString(), to: to.toISOString() };
}

const EMPTY_FORM: ReservationForm = {
  branchId: '',
  customerName: '',
  customerPhone: '',
  customerEmail: '',
  partySize: '2',
  date: todayInput(),
  time: '19:00',
  durationMins: '90',
  tableLabel: '',
  notes: '',
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ReservationsPage() {
  const { t } = useTranslation('common');

  // Translated, display-only status labels (keys stay the API enum values).
  const statusLabel = useCallback(
    (s: ReservationStatus): string => {
      const labels: Record<ReservationStatus, string> = {
        pending: t('reservations.status_pending', 'Pending'),
        confirmed: t('reservations.status_confirmed', 'Confirmed'),
        seated: t('reservations.status_seated', 'Seated'),
        completed: t('reservations.status_completed', 'Completed'),
        cancelled: t('reservations.status_cancelled', 'Cancelled'),
        no_show: t('reservations.status_no_show', 'No-show'),
      };
      return labels[s] ?? labels.pending;
    },
    [t],
  );

  const weekdayLabels = useMemo(
    () => [
      t('reservations.weekday_sun', 'Sun'),
      t('reservations.weekday_mon', 'Mon'),
      t('reservations.weekday_tue', 'Tue'),
      t('reservations.weekday_wed', 'Wed'),
      t('reservations.weekday_thu', 'Thu'),
      t('reservations.weekday_fri', 'Fri'),
      t('reservations.weekday_sat', 'Sat'),
    ],
    [t],
  );

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // View
  const [viewMode, setViewMode] = useState<'calendar' | 'day'>('calendar');
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => monthStart(new Date()));

  // Filters
  const [selectedDate, setSelectedDate] = useState<string>(todayInput());
  const [statusFilter, setStatusFilter] = useState<'all' | ReservationStatus>('all');
  const [branchFilter, setBranchFilter] = useState<string>('');

  // New / edit modal
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ReservationForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof ReservationForm, string>>>({});

  // Confirm-with-table modal
  const [confirmTarget, setConfirmTarget] = useState<Reservation | null>(null);
  const [confirmTable, setConfirmTable] = useState('');
  const [confirmSubmitting, setConfirmSubmitting] = useState(false);

  const [busyId, setBusyId] = useState<string | null>(null);

  // Load branches once
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<{ success: boolean; data: Branch[] }>('/settings/branches');
        if (res.success) setBranches(res.data);
      } catch (err) {
        console.error('Failed to load branches:', err);
      }
    })();
  }, []);

  const loadReservations = useCallback(async () => {
    setLoading(true);
    try {
      const { from, to } =
        viewMode === 'calendar'
          ? monthGridRangeISO(calendarMonth)
          : dayRangeISO(selectedDate);
      const params = new URLSearchParams({ from, to });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (branchFilter) params.set('branchId', branchFilter);
      const res = await api.get<{ success: boolean; data: Reservation[] }>(
        `/rms/reservations?${params.toString()}`,
      );
      if (res.success) setReservations(res.data || []);
    } catch (err) {
      console.error('Failed to load reservations:', err);
      setToast({ message: t('failedToLoadData') || 'Failed to load reservations', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [viewMode, calendarMonth, selectedDate, statusFilter, branchFilter, t]);

  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

  // Sorted by time
  const sorted = useMemo(
    () =>
      [...reservations].sort(
        (a, b) => new Date(a.reservationAt).getTime() - new Date(b.reservationAt).getTime(),
      ),
    [reservations],
  );

  const pending = useMemo(() => sorted.filter((r) => r.status === 'pending'), [sorted]);

  // Reservations grouped by local day (YYYY-MM-DD) for fast calendar lookup.
  const byDay = useMemo(() => {
    const map: Record<string, Reservation[]> = {};
    for (const r of reservations) {
      const key = toDateInput(new Date(r.reservationAt));
      (map[key] ||= []).push(r);
    }
    for (const key of Object.keys(map)) {
      map[key].sort(
        (a, b) => new Date(a.reservationAt).getTime() - new Date(b.reservationAt).getTime(),
      );
    }
    return map;
  }, [reservations]);

  // The 42 day cells for the visible month.
  const calendarCells = useMemo(() => monthGridDays(calendarMonth), [calendarMonth]);

  const monthTitle = useMemo(
    () => calendarMonth.toLocaleDateString([], { month: 'long', year: 'numeric' }),
    [calendarMonth],
  );

  const shiftMonth = (delta: number) => {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const goThisMonth = () => setCalendarMonth(monthStart(new Date()));

  const branchName = useCallback(
    (id?: string) => branches.find((b) => b.id === id)?.name,
    [branches],
  );

  // -------------------------------------------------------------------------
  // Status transitions
  // -------------------------------------------------------------------------

  const changeStatus = async (
    r: Reservation,
    status: ReservationStatus,
    tableLabel?: string,
  ) => {
    setBusyId(r.id);
    try {
      const body: { status: ReservationStatus; tableLabel?: string } = { status };
      if (tableLabel) body.tableLabel = tableLabel;
      const res = await api.patch<{ success: boolean; message?: string }>(
        `/rms/reservations/${r.id}/status`,
        body,
      );
      if (res.success) {
        setToast({
          message: res.message || `${t('reservation') || 'Reservation'} ${statusLabel(status).toLowerCase()}`,
          type: 'success',
        });
        loadReservations();
      }
    } catch (err: any) {
      console.error('Failed to update status:', err);
      setToast({
        message: err.response?.data?.message || t('failedToUpdate') || 'Failed to update reservation',
        type: 'error',
      });
    } finally {
      setBusyId(null);
    }
  };

  const openConfirm = (r: Reservation) => {
    setConfirmTarget(r);
    setConfirmTable(r.tableLabel || '');
  };

  const submitConfirm = async () => {
    if (!confirmTarget) return;
    setConfirmSubmitting(true);
    await changeStatus(confirmTarget, 'confirmed', confirmTable.trim() || undefined);
    setConfirmSubmitting(false);
    setConfirmTarget(null);
    setConfirmTable('');
  };

  const handleDelete = async (r: Reservation) => {
    if (
      !confirm(
        (t('areYouSureDelete') || 'Are you sure you want to delete this reservation for {item}?').replace(
          '{item}',
          r.customerName,
        ),
      )
    ) {
      return;
    }
    setBusyId(r.id);
    try {
      const res = await api.delete<{ success: boolean; message?: string }>(`/rms/reservations/${r.id}`);
      if (res.success) {
        setToast({ message: res.message || t('deletedSuccessfully') || 'Reservation deleted', type: 'success' });
        loadReservations();
      }
    } catch (err: any) {
      console.error('Failed to delete reservation:', err);
      setToast({
        message: err.response?.data?.message || t('failedToDelete') || 'Failed to delete reservation',
        type: 'error',
      });
    } finally {
      setBusyId(null);
    }
  };

  // -------------------------------------------------------------------------
  // New / edit modal
  // -------------------------------------------------------------------------

  const openCreate = () => {
    const defaultBranch = branches.find((b) => b.isDefault)?.id || '';
    setEditingId(null);
    setErrors({});
    setForm({
      ...EMPTY_FORM,
      date: selectedDate || todayInput(),
      branchId: branchFilter || defaultBranch,
    });
    setFormOpen(true);
  };

  const openEdit = (r: Reservation) => {
    const d = new Date(r.reservationAt);
    setEditingId(r.id);
    setErrors({});
    setForm({
      branchId: r.branchId || '',
      customerName: r.customerName || '',
      customerPhone: r.customerPhone || '',
      customerEmail: r.customerEmail || '',
      partySize: String(r.partySize ?? ''),
      date: toDateInput(d),
      time: toTimeInput(d),
      durationMins: String(r.durationMins ?? 90),
      tableLabel: r.tableLabel || '',
      notes: r.notes || '',
    });
    setFormOpen(true);
  };

  const setField = (key: keyof ReservationForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): boolean => {
    const next: Partial<Record<keyof ReservationForm, string>> = {};
    if (!form.customerName.trim()) next.customerName = t('required') || 'Required';
    const size = Number(form.partySize);
    if (!form.partySize || Number.isNaN(size) || size < 1) {
      next.partySize = t('invalidPartySize') || 'Enter a valid party size';
    }
    if (!form.date) next.date = t('required') || 'Required';
    if (!form.time) next.time = t('required') || 'Required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const reservationAt = new Date(`${form.date}T${form.time}`).toISOString();
    const payload = {
      branchId: form.branchId || undefined,
      customerName: form.customerName.trim(),
      customerPhone: form.customerPhone.trim() || undefined,
      customerEmail: form.customerEmail.trim() || undefined,
      partySize: Number(form.partySize),
      reservationAt,
      durationMins: form.durationMins ? Number(form.durationMins) : undefined,
      tableLabel: form.tableLabel.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };

    setSubmitting(true);
    try {
      const res = editingId
        ? await api.patch<{ success: boolean; message?: string }>(`/rms/reservations/${editingId}`, payload)
        : await api.post<{ success: boolean; message?: string }>('/rms/reservations', payload);
      if (res.success) {
        setToast({
          message:
            res.message ||
            (editingId
              ? t('updatedSuccessfully') || 'Reservation updated'
              : t('createdSuccessfully') || 'Reservation created'),
          type: 'success',
        });
        setFormOpen(false);
        setEditingId(null);
        loadReservations();
      } else {
        setToast({ message: res.message || t('failedToSave') || 'Failed to save reservation', type: 'error' });
      }
    } catch (err: any) {
      console.error('Failed to save reservation:', err);
      setToast({
        message: err.response?.data?.message || t('failedToSave') || 'Failed to save reservation',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const branchOptions = useMemo(
    () =>
      branches.map((b) => ({
        value: b.id,
        label: `${b.name}${b.isDefault ? ` (${t('default') || 'Default'})` : ''}`,
      })),
    [branches, t],
  );

  const shiftDay = (delta: number) => {
    const d = new Date(`${selectedDate}T00:00:00`);
    d.setDate(d.getDate() + delta);
    setSelectedDate(toDateInput(d));
  };

  // -------------------------------------------------------------------------
  // Reservation row
  // -------------------------------------------------------------------------

  const Row = ({ r }: { r: Reservation }) => {
    const busy = busyId === r.id;
    const bName = branchName(r.branchId);
    return (
      <div
        className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between ${
          r.status === 'pending' ? 'bg-amber-50/40 dark:bg-amber-500/[0.04]' : ''
        }`}
      >
        {/* Left: time + details */}
        <div className="flex items-start gap-4 min-w-0">
          <div className="text-center shrink-0 w-16">
            <div className="text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100">
              {formatTime(r.reservationAt)}
            </div>
            {r.durationMins ? (
              <div className="text-[11px] text-gray-400 dark:text-gray-500">{r.durationMins}m</div>
            ) : null}
          </div>
          <div className="min-w-0">
            <div className="flex items-center flex-wrap gap-2">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {r.customerName}
              </span>
              <StatusBadge status={r.status} label={statusLabel(r.status)} />
              {r.source === 'online' && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-medium rounded-full bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-600/20 dark:bg-brand-500/10 dark:text-brand-400 dark:ring-brand-500/20">
                  <i className="bx bx-globe" aria-hidden="true"></i>
                  {t('online') || 'Online'}
                </span>
              )}
            </div>
            <div className="mt-1 flex items-center flex-wrap gap-x-3 gap-y-1 text-[13px] text-gray-500 dark:text-gray-400">
              <span className="inline-flex items-center gap-1">
                <i className="bx bx-group" aria-hidden="true"></i>
                {r.partySize} {t('guests') || 'guests'}
              </span>
              {r.tableLabel && (
                <span className="inline-flex items-center gap-1">
                  <i className="bx bx-table" aria-hidden="true"></i>
                  {r.tableLabel}
                </span>
              )}
              {r.customerPhone && (
                <span className="inline-flex items-center gap-1">
                  <i className="bx bx-phone" aria-hidden="true"></i>
                  {r.customerPhone}
                </span>
              )}
              {bName && (
                <span className="inline-flex items-center gap-1">
                  <i className="bx bx-store" aria-hidden="true"></i>
                  {bName}
                </span>
              )}
            </div>
            {r.notes && (
              <p className="mt-1 text-[13px] text-gray-500 dark:text-gray-400 line-clamp-1">
                <i className="bx bx-note mr-1" aria-hidden="true"></i>
                {r.notes}
              </p>
            )}
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex flex-wrap items-center gap-1.5 sm:justify-end shrink-0">
          <PermissionGuard permission="reservations.edit">
            {r.status === 'pending' && (
              <Button variant="secondary" size="sm" disabled={busy} onClick={() => openConfirm(r)}>
                <i className="bx bx-check text-base"></i>
                <span>{t('confirm') || 'Confirm'}</span>
              </Button>
            )}
            {r.status === 'confirmed' && (
              <Button variant="secondary" size="sm" disabled={busy} onClick={() => changeStatus(r, 'seated')}>
                <i className="bx bx-chair text-base"></i>
                <span>{t('seat') || 'Seat'}</span>
              </Button>
            )}
            {r.status === 'seated' && (
              <Button variant="secondary" size="sm" disabled={busy} onClick={() => changeStatus(r, 'completed')}>
                <i className="bx bx-check-double text-base"></i>
                <span>{t('complete') || 'Complete'}</span>
              </Button>
            )}
            {(r.status === 'pending' || r.status === 'confirmed' || r.status === 'seated') && (
              <>
                <Button variant="ghost" size="sm" disabled={busy} onClick={() => changeStatus(r, 'no_show')}>
                  <i className="bx bx-user-x text-base"></i>
                  <span className="hidden md:inline">{t('noShow') || 'No-show'}</span>
                </Button>
                <Button variant="ghost" size="sm" disabled={busy} onClick={() => changeStatus(r, 'cancelled')}>
                  <i className="bx bx-x-circle text-base"></i>
                  <span className="hidden md:inline">{t('cancel') || 'Cancel'}</span>
                </Button>
              </>
            )}
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => openEdit(r)} title={t('edit') || 'Edit'}>
              <i className="bx bx-edit text-base"></i>
            </Button>
          </PermissionGuard>
          <PermissionGuard permission="reservations.delete">
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => handleDelete(r)}
              title={t('delete') || 'Delete'}
              className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
            >
              <i className="bx bx-trash text-base"></i>
            </Button>
          </PermissionGuard>
        </div>
      </div>
    );
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <PermissionGuard permission="reservations.view">
      <div className="space-y-5">
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

        <PageHeader
          title={t('reservations') || 'Reservations'}
          count={loading ? undefined : sorted.length}
          subtitle={t('reservations.subtitle', 'Manage bookings, confirm requests and seat guests')}
          breadcrumbs={[{ label: t('restaurant', 'Restaurant') }, { label: t('reservations') || 'Reservations' }]}
          actions={
            <PermissionGuard permission="reservations.create">
              <Button size="sm" onClick={openCreate}>
                <i className="bx bx-plus text-base"></i>
                <span>{t('newReservation') || 'New reservation'}</span>
              </Button>
            </PermissionGuard>
          }
        />

        {/* Filter bar */}
        <div className="bg-white dark:bg-gray-900 ring-1 ring-gray-200 dark:ring-gray-800 rounded-xl p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* View toggle: Calendar | Day */}
            <div className="inline-flex rounded-lg bg-gray-100 dark:bg-gray-800 p-0.5">
              {(['calendar', 'day'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setViewMode(m)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                    viewMode === m
                      ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  <i className={`bx ${m === 'calendar' ? 'bx-calendar' : 'bx-list-ul'}`} aria-hidden="true"></i>
                  {m === 'calendar' ? t('calendar') || 'Calendar' : t('day') || 'Day'}
                </button>
              ))}
            </div>

            {/* Month navigation (calendar mode) */}
            {viewMode === 'calendar' ? (
              <div className="flex items-center gap-1.5">
                <Button variant="secondary" size="sm" onClick={() => shiftMonth(-1)} title={t('previousMonth') || 'Previous month'}>
                  <i className="bx bx-chevron-left text-base"></i>
                </Button>
                <div className="min-w-[9.5rem] text-center text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {monthTitle}
                </div>
                <Button variant="secondary" size="sm" onClick={() => shiftMonth(1)} title={t('nextMonth') || 'Next month'}>
                  <i className="bx bx-chevron-right text-base"></i>
                </Button>
                <Button variant="ghost" size="sm" onClick={goThisMonth}>
                  {t('today') || 'Today'}
                </Button>
              </div>
            ) : (
              /* Date navigation (day mode) */
              <div className="flex items-center gap-1.5">
                <Button variant="secondary" size="sm" onClick={() => shiftDay(-1)} title={t('previousDay') || 'Previous day'}>
                  <i className="bx bx-chevron-left text-base"></i>
                </Button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value || todayInput())}
                  className="h-9 px-3 text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:border-transparent"
                />
                <Button variant="secondary" size="sm" onClick={() => shiftDay(1)} title={t('nextDay') || 'Next day'}>
                  <i className="bx bx-chevron-right text-base"></i>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedDate(todayInput())}>
                  {t('today') || 'Today'}
                </Button>
              </div>
            )}

            {/* Branch filter */}
            {branches.length > 0 && (
              <div className="w-56">
                <SearchableSelect
                  options={[{ value: '', label: t('allBranches') || 'All branches' }, ...branchOptions]}
                  value={branchFilter}
                  onChange={setBranchFilter}
                  size="sm"
                  placeholder={t('allBranches') || 'All branches'}
                  searchPlaceholder={t('searchBranch') || 'Search branch...'}
                />
              </div>
            )}

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter((e.target.value || 'all') as 'all' | ReservationStatus)
              }
              aria-label={t('status') || 'Status'}
              className="h-9 px-3 pr-8 text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:border-transparent"
            >
              <option value="all">{t('allStatuses') || 'All statuses'}</option>
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {statusLabel(s)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Pending banner */}
        {!loading && pending.length > 0 && statusFilter === 'all' && (
          <div className="flex items-center gap-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 ring-1 ring-inset ring-amber-600/20 dark:ring-amber-400/20 px-4 py-3 text-[13px] text-amber-800 dark:text-amber-300">
            <i className="bx bx-time-five text-base" aria-hidden="true"></i>
            <span>
              {pending.length}{' '}
              {pending.length === 1
                ? t('pendingRequestNeedsAction') || 'pending request needs action'
                : t('pendingRequestsNeedAction') || 'pending requests need action'}
            </span>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto"></div>
          </div>
        ) : viewMode === 'calendar' ? (
          /* ------------------------------- Month calendar grid ------------------------------- */
          <div className="bg-white dark:bg-gray-900 ring-1 ring-gray-200 dark:ring-gray-800 rounded-xl overflow-hidden">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-800">
              {weekdayLabels.map((w) => (
                <div
                  key={w}
                  className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500"
                >
                  {w}
                </div>
              ))}
            </div>
            {/* Day cells */}
            <div className="grid grid-cols-7">
              {calendarCells.map((cell, idx) => {
                const key = toDateInput(cell);
                const dayItems = byDay[key] || [];
                const inMonth = cell.getMonth() === calendarMonth.getMonth();
                const isToday = key === todayInput();
                return (
                  <div
                    key={key}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setSelectedDate(key);
                      setViewMode('day');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedDate(key);
                        setViewMode('day');
                      }
                    }}
                    className={`flex flex-col gap-1 min-h-[92px] sm:min-h-[116px] p-1.5 text-left cursor-pointer border-b border-r border-gray-100 dark:border-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500 hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                      idx % 7 === 6 ? 'border-r-0' : ''
                    } ${idx >= 35 ? 'border-b-0' : ''} ${
                      !inMonth ? 'bg-gray-50/50 dark:bg-gray-900/40' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`inline-flex items-center justify-center h-6 min-w-[1.5rem] px-1 rounded-full text-xs font-semibold tabular-nums ${
                          isToday
                            ? 'bg-brand-600 text-white'
                            : inMonth
                            ? 'text-gray-700 dark:text-gray-200'
                            : 'text-gray-300 dark:text-gray-600'
                        }`}
                      >
                        {cell.getDate()}
                      </span>
                      {dayItems.length > 0 && (
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums">
                          {dayItems.length}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      {dayItems.slice(0, 3).map((r) => {
                        const meta = STATUS_META[r.status] ?? STATUS_META.pending;
                        return (
                          <button
                            key={r.id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEdit(r);
                            }}
                            title={`${formatTime(r.reservationAt)} · ${r.customerName}`}
                            className={`flex items-center gap-1 w-full px-1.5 py-0.5 rounded text-[11px] font-medium ring-1 ring-inset text-left ${meta.pill}`}
                          >
                            <span className="tabular-nums shrink-0">{formatTime(r.reservationAt)}</span>
                            <span className="truncate">{r.customerName}</span>
                          </button>
                        );
                      })}
                      {dayItems.length > 3 && (
                        <span className="px-1.5 text-[10px] font-medium text-gray-400 dark:text-gray-500">
                          +{dayItems.length - 3} {t('more') || 'more'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ---------------------------------- Day / list view -------------------------------- */
          <div className="max-w-3xl mx-auto space-y-3">
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className="inline-flex items-center gap-1 text-[13px] font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
            >
              <i className="bx bx-chevron-left text-base" aria-hidden="true"></i>
              {t('backToCalendar') || 'Back to calendar'}
            </button>

            {sorted.length === 0 ? (
              <div className="bg-white dark:bg-gray-900 ring-1 ring-gray-200 dark:ring-gray-800 rounded-xl p-8 text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                  <i className="bx bx-calendar-event text-gray-400 dark:text-gray-500 text-3xl"></i>
                </div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {t('noReservations') || 'No reservations'}
                </h3>
                <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-6">
                  {t('noReservationsForDay') || 'There are no reservations matching these filters for this day.'}
                </p>
                <PermissionGuard permission="reservations.create">
                  <Button onClick={openCreate}>
                    <i className="bx bx-plus"></i>
                    {t('newReservation') || 'New reservation'}
                  </Button>
                </PermissionGuard>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-900 ring-1 ring-gray-200 dark:ring-gray-800 rounded-xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
                {sorted.map((r) => (
                  <Row key={r.id} r={r} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* New / edit modal                                                     */}
      {/* -------------------------------------------------------------------- */}
      <Modal
        isOpen={formOpen}
        onClose={() => !submitting && setFormOpen(false)}
        title={editingId ? t('editReservation') || 'Edit reservation' : t('newReservation') || 'New reservation'}
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {branches.length > 0 && (
            <div className="space-y-1.5">
              <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300">
                {t('branch') || 'Branch'}
              </label>
              <SearchableSelect
                options={branchOptions}
                value={form.branchId}
                onChange={(v) => setField('branchId', v)}
                placeholder={t('selectBranch') || 'Select branch'}
                searchPlaceholder={t('searchBranch') || 'Search branch...'}
              />
            </div>
          )}

          <FormField
            name="customerName"
            type="text"
            label={t('customerName') || 'Customer name'}
            required
            value={form.customerName}
            onChange={(v) => setField('customerName', v)}
            placeholder={t('customerNamePlaceholder') || 'e.g. Jane Doe'}
            error={errors.customerName}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              name="customerPhone"
              type="text"
              label={t('phone') || 'Phone'}
              value={form.customerPhone}
              onChange={(v) => setField('customerPhone', v)}
              placeholder="+254 ..."
            />
            <FormField
              name="customerEmail"
              type="email"
              label={t('email') || 'Email'}
              value={form.customerEmail}
              onChange={(v) => setField('customerEmail', v)}
              placeholder="name@example.com"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField
              name="date"
              type="date"
              label={t('date') || 'Date'}
              required
              value={form.date}
              onChange={(v) => setField('date', v)}
              error={errors.date}
            />
            <div className="space-y-1.5">
              <label htmlFor="time" className="block text-[13px] font-medium text-gray-700 dark:text-gray-300">
                {t('time') || 'Time'}
                <span className="text-red-500 ml-0.5">*</span>
              </label>
              <input
                id="time"
                name="time"
                type="time"
                required
                value={form.time}
                onChange={(e) => setField('time', e.target.value)}
                className={`w-full h-9 px-3 text-sm border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:border-transparent transition-colors ${
                  errors.time
                    ? 'focus-visible:ring-red-500 border-red-400 dark:border-red-500'
                    : 'focus-visible:ring-brand-500 border-gray-300 dark:border-gray-700'
                }`}
              />
              {errors.time && (
                <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                  <i className="bx bx-error-circle" aria-hidden="true"></i>
                  {errors.time}
                </p>
              )}
            </div>
            <FormField
              name="partySize"
              type="number"
              label={t('partySize') || 'Party size'}
              required
              min={1}
              value={form.partySize}
              onChange={(v) => setField('partySize', v)}
              error={errors.partySize}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              name="durationMins"
              type="number"
              label={t('durationMins') || 'Duration (mins)'}
              min={0}
              step={15}
              value={form.durationMins}
              onChange={(v) => setField('durationMins', v)}
              placeholder="90"
            />
            <FormField
              name="tableLabel"
              type="text"
              label={t('tableLabel') || 'Table'}
              value={form.tableLabel}
              onChange={(v) => setField('tableLabel', v)}
              placeholder={t('tableLabelPlaceholder') || 'e.g. T4'}
            />
          </div>

          <FormField
            name="notes"
            type="textarea"
            label={t('notes') || 'Notes'}
            value={form.notes}
            onChange={(v) => setField('notes', v)}
            rows={2}
            placeholder={t('reservationNotesPlaceholder') || 'Allergies, occasion, seating preference...'}
          />

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setFormOpen(false)} disabled={submitting}>
              {t('cancel') || 'Cancel'}
            </Button>
            <Button type="submit" loading={submitting} disabled={submitting}>
              {editingId ? t('saveChanges') || 'Save changes' : t('create') || 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* -------------------------------------------------------------------- */}
      {/* Confirm-with-table modal                                             */}
      {/* -------------------------------------------------------------------- */}
      <Modal
        isOpen={!!confirmTarget}
        onClose={() => !confirmSubmitting && setConfirmTarget(null)}
        title={t('confirmReservation') || 'Confirm reservation'}
        maxWidth="sm"
      >
        <div className="space-y-4">
          {confirmTarget && (
            <p className="text-[13px] text-gray-500 dark:text-gray-400">
              {t('confirmReservationFor') || 'Confirm booking for'}{' '}
              <span className="font-medium text-gray-900 dark:text-gray-100">{confirmTarget.customerName}</span>
              {' · '}
              {formatTime(confirmTarget.reservationAt)}
              {' · '}
              {confirmTarget.partySize} {t('guests') || 'guests'}
            </p>
          )}
          <FormField
            name="confirmTable"
            type="text"
            label={t('assignTableOptional') || 'Assign table (optional)'}
            value={confirmTable}
            onChange={setConfirmTable}
            placeholder={t('tableLabelPlaceholder') || 'e.g. T4'}
          />
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setConfirmTarget(null)}
              disabled={confirmSubmitting}
            >
              {t('cancel') || 'Cancel'}
            </Button>
            <Button type="button" loading={confirmSubmitting} disabled={confirmSubmitting} onClick={submitConfirm}>
              <i className="bx bx-check text-base"></i>
              <span>{t('confirm') || 'Confirm'}</span>
            </Button>
          </div>
        </div>
      </Modal>
    </PermissionGuard>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale || 'en', ['common'])),
    },
  };
};
