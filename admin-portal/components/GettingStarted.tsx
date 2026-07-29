import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useTenantStore } from '@/store/globalStore';

/**
 * Guided first-run checklist shown on the dashboard until the owner has set up
 * their workspace. Steps are business-type aware and each one's "done" state is
 * derived from real data (not a local flag), so it stays honest even if the
 * user completes a step elsewhere. Auto-hides once everything is done, and can
 * be dismissed. All checks are defensive — a failing endpoint just reads as
 * "not done yet" and never breaks the dashboard.
 */

const DISMISS_KEY = 'kuza:getting-started:dismissed:v1';

interface Step {
  key: string;
  label: string;
  desc: string;
  href: string;
  icon: string;
  done: boolean;
}

type StepSeed = Omit<Step, 'done'> & { check: () => Promise<boolean> };

/** GET a list endpoint and return whether it holds at least `min` rows. Never throws. */
async function hasRows(path: string, min = 1): Promise<boolean> {
  try {
    const res = await api.get<{ success: boolean; data: unknown }>(path);
    const data = (res as any)?.data;
    const arr = Array.isArray(data) ? data : data?.items;
    return Array.isArray(arr) && arr.length >= min;
  } catch {
    return false;
  }
}

/** Whether at least one invoice exists (uses the paginated total). Never throws. */
async function hasInvoices(): Promise<boolean> {
  try {
    const res = await api.get<{ success: boolean; data: { total?: number } }>('/invoices?page=1&limit=1');
    return Number((res as any)?.data?.total || 0) > 0;
  } catch {
    return false;
  }
}

/** Build the step list for a business type. All hrefs are real routes. */
function seedsFor(businessType: string | null): StepSeed[] {
  const inviteTeam: StepSeed = {
    key: 'team',
    label: 'Invite your team',
    desc: 'Add a teammate and assign their role',
    href: '/settings/users',
    icon: 'bx-user-plus',
    check: () => hasRows('/users', 2),
  };

  if (businessType === 'restaurant' || businessType === 'hospitality') {
    return [
      { key: 'menu', label: 'Create your first menu item', desc: 'Add a dish or drink to your menu', href: '/rms/menus/create', icon: 'bx-food-menu', check: () => hasRows('/rms/menus') },
      { key: 'tables', label: 'Set up your tables', desc: 'Lay out the floor so orders map to tables', href: '/rms/tables', icon: 'bx-grid-alt', check: () => hasRows('/rms/tables') },
      { key: 'order', label: 'Take your first order', desc: 'Ring up a sale from the order screen', href: '/rms/orders/create', icon: 'bx-receipt', check: () => hasRows('/rms/orders') },
      inviteTeam,
    ];
  }

  if (businessType === 'services') {
    return [
      { key: 'service', label: 'Add your first service', desc: 'List something you sell', href: '/ims/inventory/create', icon: 'bx-briefcase', check: () => hasRows('/ims/inventory') },
      { key: 'customer', label: 'Add a customer', desc: 'Start your customer list', href: '/customers', icon: 'bx-user-circle', check: () => hasRows('/customers') },
      { key: 'invoice', label: 'Create your first invoice', desc: 'Bill a customer and get paid', href: '/sales/invoices/new', icon: 'bx-receipt', check: hasInvoices },
      inviteTeam,
    ];
  }

  // retail / general / warehouse / accounts — the shop-shaped default
  return [
    { key: 'product', label: 'Add your first product', desc: 'Put an item in your catalogue', href: '/ims/inventory/create', icon: 'bx-package', check: () => hasRows('/ims/inventory') },
    { key: 'sale', label: 'Record your first sale', desc: 'Ring one up at the counter', href: '/pos', icon: 'bx-cart', check: () => hasRows('/rms/orders') },
    { key: 'invoice', label: 'Send your first invoice', desc: 'Bill a customer and get paid', href: '/sales/invoices/new', icon: 'bx-receipt', check: hasInvoices },
    inviteTeam,
  ];
}

export default function GettingStarted() {
  const { user } = useAuthStore();
  const { businessType } = useTenantStore();
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [dismissed, setDismissed] = useState(true); // default hidden until we know

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDismissed(window.localStorage.getItem(DISMISS_KEY) === '1');
    }
  }, []);

  useEffect(() => {
    let alive = true;
    const seeds = seedsFor(businessType);
    Promise.all(seeds.map((s) => s.check())).then((results) => {
      if (!alive) return;
      setSteps(seeds.map(({ check, ...rest }, i) => ({ ...rest, done: results[i] })));
    });
    return () => {
      alive = false;
    };
  }, [businessType]);

  if (dismissed || !steps) return null;

  const doneCount = steps.filter((s) => s.done).length;
  const total = steps.length;
  if (doneCount === total) return null; // fully set up — quietly retire the guide

  const pct = Math.round((doneCount / total) * 100);
  const firstName = user?.name ? user.name.split(' ')[0] : 'there';
  // The one step we actively point the user at: the first that isn't done.
  const currentIndex = steps.findIndex((s) => !s.done);

  const dismiss = () => {
    if (typeof window !== 'undefined') window.localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  };

  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
      {/* Header band — brand gradient, calm */}
      <div className="flex items-start justify-between gap-4 bg-gradient-to-r from-brand-600 to-indigo-600 px-5 py-4 text-white sm:px-6">
        <div className="min-w-0">
          <h2 className="text-base font-semibold leading-tight">Welcome, {firstName} — let&apos;s get you set up</h2>
          <p className="mt-0.5 text-sm text-white/80">Follow the steps in order — we&apos;ll walk you through to your first sale.</p>
        </div>
        <button
          onClick={dismiss}
          className="shrink-0 rounded-md p-1.5 text-white/70 transition hover:bg-white/15 hover:text-white"
          aria-label="Dismiss getting started"
        >
          <i className="bx bx-x text-xl" />
        </button>
      </div>

      {/* Progress summary */}
      <div className="flex items-center gap-3 px-5 pt-4 sm:px-6">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-500 to-indigo-500 transition-all duration-500"
            style={{ width: `${Math.max(pct, 4)}%` }}
          />
        </div>
        <p className="shrink-0 text-xs font-medium text-gray-500 dark:text-gray-400">
          {doneCount}<span className="text-gray-400 dark:text-gray-500">/{total}</span> done
        </p>
      </div>

      {/* Guided timeline — a directed path, not a loose checklist */}
      <ol className="px-5 py-4 sm:px-6">
        {steps.map((s, i) => {
          const isCurrent = i === currentIndex;
          const isLast = i === total - 1;
          const stepNo = i + 1;
          return (
            <li key={s.key} className="relative flex gap-4 pb-5 last:pb-0">
              {/* Connector line to the next node */}
              {!isLast && (
                <span
                  aria-hidden="true"
                  className={`absolute left-[17px] top-9 -bottom-1 w-0.5 ${
                    s.done ? 'bg-brand-400 dark:bg-brand-500/60' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              )}

              {/* Node marker */}
              <span className="relative z-10 shrink-0">
                {isCurrent && (
                  <span className="absolute inset-0 animate-ping rounded-full bg-brand-400/40" aria-hidden="true" />
                )}
                <span
                  className={`relative flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${
                    s.done
                      ? 'bg-brand-600 text-white'
                      : isCurrent
                        ? 'bg-white text-brand-600 ring-2 ring-brand-500 dark:bg-gray-900 dark:text-brand-400'
                        : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'
                  }`}
                >
                  {s.done ? <i className="bx bx-check text-lg" /> : stepNo}
                </span>
              </span>

              {/* Step content */}
              {isCurrent ? (
                <div className="min-w-0 flex-1 rounded-xl bg-brand-50 p-3 ring-1 ring-brand-100 dark:bg-brand-500/10 dark:ring-brand-500/20">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-400">
                    Step {stepNo} of {total} · Do this next
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-gray-100">{s.label}</p>
                  <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">{s.desc}</p>
                  <Link
                    href={s.href}
                    className="group mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
                  >
                    <i className={`bx ${s.icon} text-base`} />
                    Start now
                    <i className="bx bx-right-arrow-alt text-base transition group-hover:translate-x-0.5" />
                  </Link>
                </div>
              ) : (
                <div className="min-w-0 flex-1 self-center">
                  <p
                    className={`text-sm font-medium ${
                      s.done
                        ? 'text-gray-400 line-through dark:text-gray-500'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {s.label}
                  </p>
                  {s.done && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">Done</p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
