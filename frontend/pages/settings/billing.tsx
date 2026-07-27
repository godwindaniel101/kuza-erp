import { useState, useEffect, useCallback } from 'react';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import { useTenantStore } from '@/store/globalStore';
import Toast from '@/components/Toast';
import Modal from '@/components/Modal';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import StatusBadge, { type StatusBadgeVariant } from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import { Skeleton, CardSkeleton } from '@/components/ui/Skeleton';
import { formatDate, formatNumber } from '@/lib/format';

type PlanCode = 'FREE' | 'STARTER' | 'GROWTH' | 'ENTERPRISE';
type SubscriptionStatus = 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';

interface PlanLimits {
  maxUsers: number;
  maxBranches: number;
  maxItems: number;
  modules: string[];
}

interface Plan {
  id: string;
  code: PlanCode;
  name: string;
  monthlyPriceUsd: number;
  /** Price in the tenant's currency (from the registration country). */
  localPrice?: { currency: string; amount: number };
  description?: string;
  limits: PlanLimits;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: '₦',
  GHS: 'GH₵',
  KES: 'KSh',
  XOF: 'CFA',
  USD: '$',
  GBP: '£',
  EUR: '€',
};

/** "₦45,000" in the tenant currency; falls back to USD when unlocalized. */
function planPrice(plan: Plan, decimals = 0): { text: string; amount: number } {
  const lp = plan.localPrice ?? { currency: 'USD', amount: plan.monthlyPriceUsd };
  const symbol = CURRENCY_SYMBOLS[lp.currency] ?? `${lp.currency} `;
  return { text: `${symbol}${formatNumber(lp.amount, decimals)}`, amount: lp.amount };
}

/**
 * Pull the Paystack authorization URL (and reference) out of a checkout
 * response, tolerating envelope vs. raw payloads and snake/camel field names.
 */
function extractCheckout(res: any): { authorizationUrl?: string; reference?: string } {
  const d = res?.data ?? res ?? {};
  return {
    authorizationUrl: d.authorizationUrl ?? d.authorization_url ?? d.url ?? d.checkoutUrl,
    reference: d.reference ?? d.reference_id ?? d.ref,
  };
}

interface Subscription {
  id: string;
  status: SubscriptionStatus;
  trialEndsAt?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  plan: Plan;
}

interface Usage {
  usage: { users: number; branches: number; items: number };
  limits: PlanLimits;
  plan?: Plan;
}

const statusVariant: Record<SubscriptionStatus, { variant: StatusBadgeVariant; label: string }> = {
  TRIALING: { variant: 'info', label: 'Trialing' },
  ACTIVE: { variant: 'success', label: 'Active' },
  PAST_DUE: { variant: 'warning', label: 'Past due' },
  CANCELED: { variant: 'error', label: 'Canceled' },
};

const limitLabel = (value: number, t: (key: string, fallback: string) => string) =>
  value === -1 ? t('settings.unlimited', 'Unlimited') : formatNumber(value);

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const { t } = useTranslation('common');
  const unlimited = limit === -1;
  const pct = unlimited || limit === 0 ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const nearLimit = !unlimited && pct >= 90;
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="font-medium text-gray-700 dark:text-gray-300">{label}</span>
        <span className={`${nearLimit ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
          {formatNumber(used)} / {limitLabel(limit, t)}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
        {unlimited ? (
          <div className="h-full w-full bg-gradient-to-r from-green-400 to-green-500 dark:from-green-600 dark:to-green-500 opacity-40" />
        ) : (
          <div
            className={`h-full rounded-full transition-all ${nearLimit ? 'bg-red-500' : 'bg-brand-500 dark:bg-brand-400'}`}
            style={{ width: `${pct}%` }}
          />
        )}
      </div>
    </div>
  );
}

const moduleLabel = (module: string) =>
  module
    .replace(/[_-]/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

export default function BillingPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const fetchTenantContext = useTenantStore((s) => s.fetchTenantContext);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [switchTarget, setSwitchTarget] = useState<Plan | null>(null);
  const [switching, setSwitching] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    const [plansRes, subRes, usageRes] = await Promise.allSettled([
      api.get<{ success: boolean; data: Plan[] }>('/billing/plans'),
      api.get<{ success: boolean; data: Subscription }>('/billing/subscription'),
      api.get<{ success: boolean; data: Usage }>('/billing/usage'),
    ]);
    if (plansRes.status === 'fulfilled' && plansRes.value.success) setPlans(plansRes.value.data || []);
    if (subRes.status === 'fulfilled' && subRes.value.success) setSubscription(subRes.value.data);
    if (usageRes.status === 'fulfilled' && usageRes.value.success) setUsage(usageRes.value.data);
    if ([plansRes, subRes, usageRes].some((r) => r.status === 'rejected')) {
      setToast({ message: t('settings.billingDataLoadFailed', 'Some billing data failed to load'), type: 'error' });
      if (subRes.status === 'rejected' && plansRes.status === 'rejected') setFailed(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Handle the return from Paystack (?payment=success|cancelled). Activation is
  // webhook-driven, so on success we refresh context and re-fetch rather than
  // trusting the redirect alone. The query is stripped so a refresh won't re-fire.
  useEffect(() => {
    if (!router.isReady) return;
    const payment = router.query.payment;
    if (payment !== 'success' && payment !== 'cancelled') return;
    if (payment === 'success') {
      setToast({ message: t('settings.paymentReceived', 'Payment received — your plan is being activated.'), type: 'success' });
      fetchTenantContext(true);
      load();
    } else {
      setToast({ message: t('settings.paymentCancelled', 'Payment cancelled — your plan was not changed.'), type: 'info' });
    }
    const { payment: _p, reference: _r, ...rest } = router.query;
    router.replace({ pathname: router.pathname, query: rest }, undefined, { shallow: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, router.query.payment]);

  const handleSwitch = async () => {
    if (!switchTarget) return;
    setSwitching(true);
    const isPaid = (switchTarget.monthlyPriceUsd ?? 0) > 0;
    try {
      if (isPaid) {
        // Paid upgrade: start a Paystack checkout and hand off. The plan is
        // activated by the verified webhook, not by this redirect.
        const res = await api.post('/billing/subscription/checkout', {
          planCode: switchTarget.code,
        });
        const { authorizationUrl } = extractCheckout(res);
        if (!authorizationUrl) throw new Error(t('settings.couldNotStartCheckout', 'Could not start checkout. Please try again.'));
        window.location.href = authorizationUrl;
        return; // navigating away — keep the switching state
      }
      // Free plan: instant change, no payment.
      await api.post('/billing/subscription/change', { planCode: switchTarget.code });
      setToast({ message: t('settings.switchedToPlan', 'Switched to the {{name}} plan', { name: switchTarget.name }), type: 'success' });
      setSwitchTarget(null);
      await fetchTenantContext(true);
      await load();
      setSwitching(false);
    } catch (err: any) {
      setToast({
        message: err.response?.data?.message || err?.message || t('settings.failedToSwitchPlan', 'Failed to switch plan'),
        type: 'error',
      });
      setSwitching(false);
    }
  };

  const trialDaysLeft = (() => {
    if (subscription?.status !== 'TRIALING' || !subscription.trialEndsAt) return null;
    const ms = new Date(subscription.trialEndsAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
  })();

  const status = subscription ? statusVariant[subscription.status] ?? statusVariant.ACTIVE : null;
  const currentPlanCode = subscription?.plan?.code;

  const statusLabels: Record<SubscriptionStatus, string> = {
    TRIALING: t('settings.statusTrialing', 'Trialing'),
    ACTIVE: t('active', 'Active'),
    PAST_DUE: t('settings.statusPastDue', 'Past due'),
    CANCELED: t('settings.statusCanceled', 'Canceled'),
  };

  return (
    <div className="w-full max-w-5xl space-y-5">
      <PageHeader
        title={t('settings.billingTitle', 'Billing & Plans')}
        subtitle={t('settings.billingSubtitle', 'Your subscription, usage and available plans')}
        breadcrumbs={[{ label: t('settings', 'Settings'), href: '/settings' }, { label: t('settings.billing', 'Billing') }]}
      />

      {loading ? (
        <div className="w-full max-w-5xl space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <CardSkeleton count={2} />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      ) : failed ? (
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
            {/* Current plan card */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('settings.currentPlanLabel', 'Current Plan')}</p>
                  <h2 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white mt-1">
                    {subscription?.plan?.name || t('settings.noPlan', 'No plan')}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {subscription?.plan
                      ? planPrice(subscription.plan).amount > 0
                        ? t('settings.pricePerMonth', '{{price}} / month', { price: planPrice(subscription.plan).text })
                        : t('settings.free', 'Free')
                      : ''}
                  </p>
                </div>
                {status && subscription && <StatusBadge variant={status.variant} label={statusLabels[subscription.status] ?? status.label} />}
              </div>
              {subscription?.status === 'TRIALING' && trialDaysLeft != null && (
                <div className="mb-3 px-4 py-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-300 flex items-center gap-2">
                  <i className="bx bx-time-five" aria-hidden="true"></i>
                  {trialDaysLeft === 0
                    ? t('settings.trialEndsToday', 'Your trial ends today')
                    : t('settings.trialDaysLeft', '{{count}} day{{plural}} left in your trial', { count: trialDaysLeft, plural: trialDaysLeft === 1 ? '' : 's' })}
                  {subscription.trialEndsAt && <span>{t('settings.trialEndsDate', '(ends {{date}})', { date: formatDate(subscription.trialEndsAt) })}</span>}
                </div>
              )}
              {subscription?.currentPeriodStart && subscription?.currentPeriodEnd && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('settings.currentPeriod', 'Current period: {{start}} – {{end}}', { start: formatDate(subscription.currentPeriodStart), end: formatDate(subscription.currentPeriodEnd) })}
                </p>
              )}
              {subscription?.plan?.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{subscription.plan.description}</p>
              )}
            </div>

            {/* Usage card */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 p-6">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">{t('settings.usage', 'Usage')}</p>
              {usage ? (
                <div className="space-y-4">
                  <UsageBar label={t('settings.users', 'Users')} used={usage.usage.users} limit={usage.limits.maxUsers} />
                  <UsageBar label={t('settings.branches', 'Branches')} used={usage.usage.branches} limit={usage.limits.maxBranches} />
                  <UsageBar label={t('settings.items', 'Items')} used={usage.usage.items} limit={usage.limits.maxItems} />
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('settings.usageUnavailable', 'Usage information is unavailable.')}</p>
              )}
            </div>
          </div>

          {/* Plan comparison grid */}
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('settings.allPlans', 'All Plans')}</h2>
          {plans.length === 0 ? (
            <EmptyState icon="bx-package" title={t('settings.noPlansAvailable', 'No plans available')} description={t('settings.plansNotLoaded', 'Plans could not be loaded')} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {plans.map((plan) => {
                const isCurrent = plan.code === currentPlanCode;
                return (
                  <div
                    key={plan.id}
                    className={`rounded-xl ring-1 p-5 flex flex-col ${
                      isCurrent
                        ? 'bg-brand-50/50 dark:bg-brand-500/10 ring-brand-300 dark:ring-brand-700'
                        : 'bg-white dark:bg-gray-900 ring-gray-200 dark:ring-gray-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{plan.name}</h3>
                      {isCurrent && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                          <i className="bx bx-check" aria-hidden="true"></i>
                          {t('settings.current', 'Current')}
                        </span>
                      )}
                    </div>
                    <p className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
                      {planPrice(plan).amount > 0 ? (
                        <>
                          {planPrice(plan).text}
                          <span className="text-sm font-normal text-gray-500 dark:text-gray-400">{t('settings.perMonthShort', '/mo')}</span>
                        </>
                      ) : (
                        t('settings.free', 'Free')
                      )}
                    </p>
                    {plan.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{plan.description}</p>
                    )}
                    <ul className="mt-4 space-y-2 text-sm text-gray-700 dark:text-gray-300 flex-1">
                      <li className="flex items-center gap-2">
                        <i className="bx bx-user text-gray-400" aria-hidden="true"></i>
                        {t('settings.usersCount', '{{value}} users', { value: limitLabel(plan.limits.maxUsers, t) })}
                      </li>
                      <li className="flex items-center gap-2">
                        <i className="bx bx-git-branch text-gray-400" aria-hidden="true"></i>
                        {t('settings.branchesCount', '{{value}} branches', { value: limitLabel(plan.limits.maxBranches, t) })}
                      </li>
                      <li className="flex items-center gap-2">
                        <i className="bx bx-box text-gray-400" aria-hidden="true"></i>
                        {t('settings.itemsCount', '{{value}} items', { value: limitLabel(plan.limits.maxItems, t) })}
                      </li>
                      {(plan.limits.modules || []).map((module) => (
                        <li key={module} className="flex items-center gap-2">
                          <i className="bx bx-check text-green-500" aria-hidden="true"></i>
                          {moduleLabel(module)}
                        </li>
                      ))}
                    </ul>
                    <Button
                      variant="primary"
                      onClick={() => setSwitchTarget(plan)}
                      disabled={isCurrent}
                      className="mt-5 w-full"
                    >
                      {isCurrent ? t('settings.currentPlan', 'Current plan') : t('settings.switchPlan', 'Switch plan')}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Switch plan confirm */}
      <Modal isOpen={!!switchTarget} onClose={() => setSwitchTarget(null)} title={t('settings.switchPlanTitle', 'Switch Plan')} maxWidth="md">
        {switchTarget && (
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              {t('settings.switchFrom', 'Switch from')} <strong className="text-gray-900 dark:text-gray-100">{subscription?.plan?.name || t('settings.yourCurrentPlan', 'your current plan')}</strong>{' '}
              {t('settings.switchTo', 'to')} <strong className="text-gray-900 dark:text-gray-100">{switchTarget.name}</strong>
              {switchTarget.monthlyPriceUsd > 0
                ? t('settings.atPricePerMonth', ' at ${{price}}/month?', { price: formatNumber(switchTarget.monthlyPriceUsd, 2) })
                : t('settings.freeQuestion', ' (free)?')}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              {switchTarget.monthlyPriceUsd > 0
                ? t('settings.paystackRedirectNote', "You'll be redirected to Paystack to complete payment. Your plan activates once payment is confirmed.")
                : t('settings.downgradeNote', "Plan limits apply immediately. Downgrading may restrict access to features above the new plan's limits.")}
            </p>
            <div className="flex justify-end space-x-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setSwitchTarget(null)}
                disabled={switching}
              >
                {t('cancel', 'Cancel')}
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleSwitch}
                disabled={switching}
              >
                {switching
                  ? switchTarget.monthlyPriceUsd > 0
                    ? t('settings.redirecting', 'Redirecting...')
                    : t('settings.switching', 'Switching...')
                  : switchTarget.monthlyPriceUsd > 0
                    ? t('settings.continueToPayment', 'Continue to payment')
                    : t('settings.confirmSwitch', 'Confirm Switch')}
              </Button>
            </div>
          </div>
        )}
      </Modal>

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
