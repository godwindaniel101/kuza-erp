import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { useTenantStore } from '@/store/globalStore';
import Toast from '@/components/Toast';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import StatusBadge, { type StatusBadgeVariant } from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatMoney } from '@/lib/format';
import {
  getPricing,
  quote as fetchQuote,
  getSubscription,
  checkoutQuote,
  type Pricing,
  type PricingApp,
  type Quote,
  type Subscription,
  type AppGroup,
} from '@/lib/billing';

/** Boxicons glyph per known app key, with a sensible per-group fallback. */
const APP_ICON: Record<string, string> = {
  items: 'bx-cube',
  ims: 'bx-cube',
  rms: 'bx-restaurant',
  restaurant: 'bx-restaurant',
  invoicing: 'bx-receipt',
  sales: 'bx-receipt',
  books: 'bx-calculator',
  accounting: 'bx-calculator',
  people: 'bx-group',
  hrms: 'bx-group',
  payments: 'bx-credit-card',
};
const GROUP_FALLBACK_ICON: Record<AppGroup, string> = {
  vertical: 'bx-store',
  common: 'bx-package',
  assist: 'bx-bot',
};
const appIcon = (app: PricingApp) => APP_ICON[app.key] ?? GROUP_FALLBACK_ICON[app.group];

const GROUP_ORDER: AppGroup[] = ['vertical', 'common', 'assist'];

const statusVariant: Record<string, { variant: StatusBadgeVariant; label: string }> = {
  TRIALING: { variant: 'info', label: 'Trialing' },
  ACTIVE: { variant: 'success', label: 'Active' },
  EXPIRED: { variant: 'error', label: 'Expired' },
  PAST_DUE: { variant: 'warning', label: 'Past due' },
  CANCELED: { variant: 'error', label: 'Canceled' },
};

interface StepperProps {
  label: string;
  value: number;
  min: number;
  included: number;
  unitPrice: number;
  currency: string;
  onChange: (v: number) => void;
}

function Stepper({ label, value, min, included, unitPrice, currency, onChange }: StepperProps) {
  const { t } = useTranslation('common');
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {t('settings.includedThenEach', '{{count}} included, then {{price}}/mo each', {
            count: included,
            price: formatMoney(unitPrice, currency),
          })}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={t('settings.decrease', 'Decrease')}
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <i className="bx bx-minus" aria-hidden="true"></i>
        </button>
        <input
          type="number"
          value={value}
          min={min}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10);
            onChange(Number.isNaN(n) ? min : Math.max(min, n));
          }}
          className="w-14 h-8 text-center text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        />
        <button
          type="button"
          aria-label={t('settings.increase', 'Increase')}
          onClick={() => onChange(value + 1)}
          className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          <i className="bx bx-plus" aria-hidden="true"></i>
        </button>
      </div>
    </div>
  );
}

interface AppToggleProps {
  app: PricingApp;
  selected: boolean;
  disabled: boolean;
  disabledReason?: string;
  currency: string;
  onToggle: () => void;
}

function AppToggle({ app, selected, disabled, disabledReason, currency, onToggle }: AppToggleProps) {
  const { t } = useTranslation('common');
  const isFree = app.price <= 0;
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={selected}
      title={disabled ? disabledReason : undefined}
      className={`relative text-left rounded-xl ring-1 p-4 transition-colors ${
        selected
          ? 'bg-brand-50/60 dark:bg-brand-500/10 ring-brand-400 dark:ring-brand-600'
          : 'bg-white dark:bg-gray-900 ring-gray-200 dark:ring-gray-800 hover:ring-gray-300 dark:hover:ring-gray-700'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`shrink-0 h-9 w-9 inline-flex items-center justify-center rounded-lg text-lg ${
            selected
              ? 'bg-brand-gradient text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
          }`}
        >
          <i className={`bx ${appIcon(app)}`} aria-hidden="true"></i>
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{app.name}</p>
            <span
              className={`shrink-0 h-4 w-4 inline-flex items-center justify-center rounded-full border ${
                selected
                  ? 'bg-brand-gradient border-transparent text-white'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
            >
              {selected && <i className="bx bx-check text-[11px]" aria-hidden="true"></i>}
            </span>
          </div>
          {app.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{app.description}</p>
          )}
          <p className="text-xs font-medium mt-2 text-gray-700 dark:text-gray-300">
            {isFree ? (
              <span className="text-green-600 dark:text-green-400">{t('settings.free', 'Free')}</span>
            ) : (
              <>
                {formatMoney(app.price, currency)}
                <span className="text-gray-400">{t('settings.perMonthShort', '/mo')}</span>
              </>
            )}
          </p>
        </div>
      </div>
    </button>
  );
}

export default function BillingPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const fetchTenantContext = useTenantStore((s) => s.fetchTenantContext);

  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [branches, setBranches] = useState(1);
  const [users, setUsers] = useState(1);

  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    const [pricingRes, subRes] = await Promise.allSettled([getPricing(), getSubscription()]);

    let pr: Pricing | null = null;
    if (pricingRes.status === 'fulfilled') {
      pr = pricingRes.value;
      setPricing(pr);
    }
    const sub = subRes.status === 'fulfilled' ? subRes.value : null;
    if (sub) setSubscription(sub);

    if (pr) {
      // Seed the builder from the current subscription, else from plan defaults.
      const seedApps = sub?.selectedApps ?? [];
      setSelected(new Set(seedApps));
      setBranches(Math.max(pr.includedBranches, sub?.branches ?? pr.usage.branch ?? pr.includedBranches));
      setUsers(Math.max(pr.includedUsers, sub?.users ?? pr.usage.user ?? pr.includedUsers));
    }

    if (pricingRes.status === 'rejected') {
      setFailed(true);
      setToast({ message: t('settings.billingDataLoadFailed', 'Some billing data failed to load'), type: 'error' });
    } else if (subRes.status === 'rejected') {
      setToast({ message: t('settings.billingDataLoadFailed', 'Some billing data failed to load'), type: 'error' });
    }
    setLoading(false);
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  // Return from Paystack. The verified webhook does the real activation, so we
  // just refresh context + re-fetch rather than trusting the redirect. Strip the
  // query so a manual refresh won't re-fire the toast.
  useEffect(() => {
    if (!router.isReady) return;
    const { ref, payment } = router.query;
    if (!ref && payment !== 'success' && payment !== 'cancelled') return;
    if (payment === 'cancelled') {
      setToast({ message: t('settings.paymentCancelled', 'Payment cancelled — your plan was not changed.'), type: 'info' });
    } else {
      setToast({ message: t('settings.paymentReceived', 'Payment received — your plan is being activated.'), type: 'success' });
      fetchTenantContext(true);
      load();
    }
    const { ref: _ref, payment: _p, reference: _r, ...rest } = router.query;
    router.replace({ pathname: router.pathname, query: rest }, undefined, { shallow: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, router.query.ref, router.query.payment]);

  const appsByKey = useMemo(() => {
    const m = new Map<string, PricingApp>();
    (pricing?.apps ?? []).forEach((a) => m.set(a.key, a));
    return m;
  }, [pricing]);

  const nonAssistSelected = useMemo(
    () => Array.from(selected).some((k) => appsByKey.get(k)?.group !== 'assist'),
    [selected, appsByKey],
  );

  const toggleApp = useCallback(
    (app: PricingApp) => {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(app.key)) {
          next.delete(app.key);
        } else {
          next.add(app.key);
          // Exclusivity: drop any already-selected sibling in the same group.
          if (app.exclusiveGroup) {
            for (const other of pricing?.apps ?? []) {
              if (other.key !== app.key && other.exclusiveGroup === app.exclusiveGroup) {
                next.delete(other.key);
              }
            }
          }
        }
        // Assists require at least one non-assist app — drop them if none remain.
        const stillHasNonAssist = Array.from(next).some((k) => appsByKey.get(k)?.group !== 'assist');
        if (!stillHasNonAssist) {
          for (const k of Array.from(next)) {
            if (appsByKey.get(k)?.group === 'assist') next.delete(k);
          }
        }
        return next;
      });
    },
    [pricing, appsByKey],
  );

  // Debounced live quote on any change to the selection / steppers.
  const quoteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!pricing) return;
    const apps = Array.from(selected);
    if (apps.length === 0) {
      setQuote(null);
      setQuoting(false);
      return;
    }
    setQuoting(true);
    if (quoteTimer.current) clearTimeout(quoteTimer.current);
    quoteTimer.current = setTimeout(async () => {
      try {
        const q = await fetchQuote({ apps, branches, users });
        setQuote(q);
      } catch {
        setQuote(null);
        setToast({ message: t('settings.quoteFailed', 'Could not calculate your quote'), type: 'error' });
      } finally {
        setQuoting(false);
      }
    }, 300);
    return () => {
      if (quoteTimer.current) clearTimeout(quoteTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pricing, selected, branches, users]);

  const handleSubscribe = async () => {
    if (!nonAssistSelected) return;
    setSubscribing(true);
    try {
      const res = await checkoutQuote({ apps: Array.from(selected), branches, users });
      if (res.free) {
        setToast({ message: t('settings.subscriptionUpdated', 'Your subscription has been updated.'), type: 'success' });
        setSubscription(res.subscription);
        await fetchTenantContext(true);
        await load();
        setSubscribing(false);
      } else {
        // Navigating away to Paystack — keep the subscribing state on the button.
        window.location.href = res.authorizationUrl;
      }
    } catch (err: any) {
      setToast({
        message: err?.response?.data?.message || err?.message || t('settings.checkoutFailed', 'Could not start checkout. Please try again.'),
        type: 'error',
      });
      setSubscribing(false);
    }
  };

  const currency = pricing?.currency ?? subscription?.currency ?? 'NGN';
  const status = subscription ? statusVariant[subscription.status] : null;
  const isExpired = subscription?.status === 'EXPIRED' || subscription?.status === 'CANCELED' || subscription?.status === 'PAST_DUE';
  const isActive = subscription?.status === 'ACTIVE';

  const grouped = useMemo(() => {
    const g: Record<AppGroup, PricingApp[]> = { vertical: [], common: [], assist: [] };
    (pricing?.apps ?? []).forEach((a) => g[a.group]?.push(a));
    return g;
  }, [pricing]);

  const groupTitle: Record<AppGroup, string> = {
    vertical: t('settings.groupVerticals', 'Verticals'),
    common: t('settings.groupCommon', 'Common'),
    assist: t('settings.groupAssist', 'Assist'),
  };
  const groupSubtitle: Record<AppGroup, string> = {
    vertical: t('settings.groupVerticalsHint', 'Pick the one that matches your business'),
    common: t('settings.groupCommonHint', 'Add-ons that work across any business'),
    assist: t('settings.groupAssistHint', 'AI helpers — free with any paid app'),
  };

  // Exclusivity groups that already have a selection (used to disable siblings).
  const lockedExclusiveGroups = useMemo(() => {
    const locked = new Set<string>();
    Array.from(selected).forEach((k) => {
      const a = appsByKey.get(k);
      if (a?.exclusiveGroup) locked.add(a.exclusiveGroup);
    });
    return locked;
  }, [selected, appsByKey]);

  return (
    <div className="w-full max-w-6xl space-y-5">
      <PageHeader
        title={t('settings.planBuilderTitle', 'Build your plan')}
        subtitle={t('settings.planBuilderSubtitle', 'Pick the apps you need and pay only for those')}
        breadcrumbs={[{ label: t('settings', 'Settings'), href: '/settings' }, { label: t('settings.billing', 'Billing') }]}
      />

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
          <Skeleton className="h-80 w-full" />
        </div>
      ) : failed || !pricing ? (
        <EmptyState
          icon="bx-error-circle"
          title={t('settings.billingLoadError', 'Could not load billing information')}
          description={t('settings.pleaseTryAgain', 'Please try again')}
          actions={
            <Button variant="primary" size="sm" onClick={load}>
              {t('settings.retry', 'Retry')}
            </Button>
          }
        />
      ) : (
        <>
          {/* Status banners */}
          {isExpired && (
            <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-800 dark:text-red-300 flex items-center gap-2">
              <i className="bx bx-error-circle text-lg" aria-hidden="true"></i>
              {t('settings.trialEndedBanner', 'Your free trial has ended — pick your apps to continue.')}
            </div>
          )}
          {subscription?.status === 'TRIALING' && (
            <div className="px-4 py-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-300 flex items-center gap-2">
              <i className="bx bx-time-five text-lg" aria-hidden="true"></i>
              {t('settings.trialActiveBanner', "You're on a free trial. Choose your apps below whenever you're ready to continue.")}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
            {/* Builder */}
            <div className="lg:col-span-2 space-y-6">
              {GROUP_ORDER.map((group) => {
                const apps = grouped[group];
                if (!apps || apps.length === 0) return null;
                const assistLocked = group === 'assist' && !nonAssistSelected;
                return (
                  <section key={group}>
                    <div className="mb-2">
                      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{groupTitle[group]}</h2>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{groupSubtitle[group]}</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {apps.map((app) => {
                        const isSelected = selected.has(app.key);
                        const exclusiveLocked =
                          !isSelected &&
                          !!app.exclusiveGroup &&
                          lockedExclusiveGroups.has(app.exclusiveGroup);
                        const disabled = (assistLocked && !isSelected) || exclusiveLocked;
                        const reason = assistLocked
                          ? t('settings.assistNeedsApp', 'Select a paid app first')
                          : exclusiveLocked
                            ? t('settings.exclusiveLocked', 'Not available with your current selection')
                            : undefined;
                        return (
                          <AppToggle
                            key={app.key}
                            app={app}
                            selected={isSelected}
                            disabled={disabled}
                            disabledReason={reason}
                            currency={currency}
                            onToggle={() => toggleApp(app)}
                          />
                        );
                      })}
                    </div>
                  </section>
                );
              })}

              {/* Capacity */}
              <section>
                <div className="mb-2">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('settings.capacity', 'Capacity')}</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('settings.capacityHint', 'Branches and team members on your account')}</p>
                </div>
                <div className="rounded-xl ring-1 ring-gray-200 dark:ring-gray-800 bg-white dark:bg-gray-900 px-4 divide-y divide-gray-100 dark:divide-gray-800">
                  <Stepper
                    label={t('settings.branches', 'Branches')}
                    value={branches}
                    min={pricing.includedBranches}
                    included={pricing.includedBranches}
                    unitPrice={quote?.lines.find((l) => l.key === 'branch')?.unit ?? 0}
                    currency={currency}
                    onChange={setBranches}
                  />
                  <Stepper
                    label={t('settings.users', 'Users')}
                    value={users}
                    min={pricing.includedUsers}
                    included={pricing.includedUsers}
                    unitPrice={quote?.lines.find((l) => l.key === 'user')?.unit ?? 0}
                    currency={currency}
                    onChange={setUsers}
                  />
                </div>
              </section>
            </div>

            {/* Live quote summary (sticky) */}
            <div className="lg:sticky lg:top-4">
              <div className="rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 bg-white dark:bg-gray-900 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('settings.yourPlan', 'Your plan')}</h2>
                  {status && subscription && (
                    <StatusBadge variant={status.variant} label={status.label} size="sm" />
                  )}
                </div>

                {isActive && subscription?.amountMajor != null && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                    {t('settings.currentlyPaying', 'Currently {{price}}/mo', {
                      price: formatMoney(subscription.amountMajor, subscription.currency ?? currency),
                    })}
                  </p>
                )}

                {selected.size === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 py-6 text-center">
                    {t('settings.selectAppsToQuote', 'Select apps to see your monthly price.')}
                  </p>
                ) : (
                  <>
                    <ul className="space-y-2.5 mb-4">
                      {(quote?.lines ?? []).map((line) => (
                        <li key={`${line.kind}-${line.key}`} className="flex items-start justify-between gap-3 text-sm">
                          <span className="text-gray-700 dark:text-gray-300">
                            {line.label}
                            {line.kind === 'usage' && line.qty > 0 && (
                              <span className="text-gray-400 dark:text-gray-500">
                                {' '}
                                ({line.qty} × {formatMoney(line.unit, currency)})
                              </span>
                            )}
                          </span>
                          <span className="shrink-0 tabular-nums text-gray-900 dark:text-gray-100">
                            {line.amount > 0 ? formatMoney(line.amount, currency) : t('settings.free', 'Free')}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="border-t border-gray-100 dark:border-gray-800 pt-4 flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('settings.totalPerMonth', 'Total / month')}</span>
                      <span className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white tabular-nums">
                        {quoting && !quote ? (
                          <span className="inline-block h-5 w-20 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
                        ) : (
                          formatMoney(quote?.total ?? 0, currency)
                        )}
                      </span>
                    </div>
                  </>
                )}

                <Button
                  variant="primary"
                  className="mt-5 w-full"
                  loading={subscribing}
                  disabled={!nonAssistSelected || subscribing}
                  onClick={handleSubscribe}
                >
                  {isActive
                    ? t('settings.updatePlan', 'Update plan')
                    : t('settings.subscribe', 'Subscribe')}
                </Button>
                {!nonAssistSelected && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-2">
                    {t('settings.pickOneApp', 'Pick at least one paid app to continue.')}
                  </p>
                )}
                <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center mt-3 leading-relaxed">
                  {t('settings.paystackSecured', 'Payments are securely processed by Paystack. Billed monthly, cancel anytime.')}
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale || 'en', ['common'])),
    },
  };
};
