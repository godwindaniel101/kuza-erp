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

  const dismiss = () => {
    if (typeof window !== 'undefined') window.localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  };

  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
      {/* Header band — brand gradient, calm */}
      <div className="flex items-start justify-between gap-4 bg-gradient-to-r from-brand-600 to-indigo-600 px-5 py-4 text-white sm:px-6">
        <div className="min-w-0">
          <h2 className="text-base font-semibold leading-tight">Welcome, {firstName} — let's get you set up</h2>
          <p className="mt-0.5 text-sm text-white/80">A few quick steps to your first sale. You can do these in any order.</p>
        </div>
        <button
          onClick={dismiss}
          className="shrink-0 rounded-md p-1.5 text-white/70 transition hover:bg-white/15 hover:text-white"
          aria-label="Dismiss getting started"
        >
          <i className="bx bx-x text-xl" />
        </button>
      </div>

      {/* Progress */}
      <div className="px-5 pt-4 sm:px-6">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {doneCount} of {total} complete
          </p>
          <p className="text-xs font-semibold text-brand-600 dark:text-brand-400">{pct}%</p>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-500 to-indigo-500 transition-all duration-500"
            style={{ width: `${Math.max(pct, 4)}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <ul className="divide-y divide-gray-100 px-2 py-2 dark:divide-gray-800 sm:px-3">
        {steps.map((s) => (
          <li key={s.key}>
            <Link
              href={s.href}
              className="group flex items-center gap-4 rounded-xl px-3 py-3 transition hover:bg-gray-50 dark:hover:bg-gray-800/60"
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg ${
                  s.done
                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400'
                    : 'bg-gray-100 text-gray-500 group-hover:bg-brand-50 group-hover:text-brand-600 dark:bg-gray-800 dark:text-gray-400'
                }`}
              >
                <i className={`bx ${s.done ? 'bx-check' : s.icon}`} />
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={`block text-sm font-medium ${
                    s.done
                      ? 'text-gray-400 line-through dark:text-gray-500'
                      : 'text-gray-900 dark:text-gray-100'
                  }`}
                >
                  {s.label}
                </span>
                {!s.done && <span className="block truncate text-xs text-gray-500 dark:text-gray-400">{s.desc}</span>}
              </span>
              {!s.done && (
                <i className="bx bx-right-arrow-alt shrink-0 text-lg text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600 dark:text-gray-600" />
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
