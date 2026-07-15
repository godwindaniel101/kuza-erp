import { useState, useEffect, useCallback } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { api } from '@/lib/api';
import Toast from '@/components/Toast';
import Modal from '@/components/Modal';
import PageHeader from '@/components/ui/PageHeader';
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

const limitLabel = (value: number) => (value === -1 ? 'Unlimited' : formatNumber(value));

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const unlimited = limit === -1;
  const pct = unlimited || limit === 0 ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const nearLimit = !unlimited && pct >= 90;
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="font-medium text-gray-700 dark:text-gray-300">{label}</span>
        <span className={`${nearLimit ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
          {formatNumber(used)} / {limitLabel(limit)}
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
      setToast({ message: 'Some billing data failed to load', type: 'error' });
      if (subRes.status === 'rejected' && plansRes.status === 'rejected') setFailed(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSwitch = async () => {
    if (!switchTarget) return;
    setSwitching(true);
    try {
      await api.post('/billing/subscription/change', { planCode: switchTarget.code });
      setToast({ message: `Switched to the ${switchTarget.name} plan`, type: 'success' });
      setSwitchTarget(null);
      await load();
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || 'Failed to switch plan', type: 'error' });
    } finally {
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

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <PageHeader
        title="Billing & Plans"
        subtitle="Your subscription, usage and available plans"
        breadcrumbs={[{ label: 'Settings', href: '/settings' }, { label: 'Billing' }]}
      />

      {loading ? (
        <div className="mx-auto w-full max-w-5xl space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <CardSkeleton count={2} />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      ) : failed ? (
        <EmptyState
          icon="bx-error-circle"
          title="Could not load billing information"
          description="Please try again"
          actions={
            <button
              onClick={load}
              className="h-8 px-3 bg-brand-600 text-white rounded-lg text-[13px] font-medium hover:bg-brand-700"
            >
              Retry
            </button>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
            {/* Current plan card */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Current Plan</p>
                  <h2 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white mt-1">
                    {subscription?.plan?.name || 'No plan'}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {subscription?.plan
                      ? planPrice(subscription.plan).amount > 0
                        ? `${planPrice(subscription.plan).text} / month`
                        : 'Free'
                      : ''}
                  </p>
                </div>
                {status && <StatusBadge variant={status.variant} label={status.label} />}
              </div>
              {subscription?.status === 'TRIALING' && trialDaysLeft != null && (
                <div className="mb-3 px-4 py-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-300 flex items-center gap-2">
                  <i className="bx bx-time-five" aria-hidden="true"></i>
                  {trialDaysLeft === 0
                    ? 'Your trial ends today'
                    : `${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'} left in your trial`}
                  {subscription.trialEndsAt && <span>(ends {formatDate(subscription.trialEndsAt)})</span>}
                </div>
              )}
              {subscription?.currentPeriodStart && subscription?.currentPeriodEnd && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Current period: {formatDate(subscription.currentPeriodStart)} – {formatDate(subscription.currentPeriodEnd)}
                </p>
              )}
              {subscription?.plan?.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{subscription.plan.description}</p>
              )}
            </div>

            {/* Usage card */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 p-6">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Usage</p>
              {usage ? (
                <div className="space-y-4">
                  <UsageBar label="Users" used={usage.usage.users} limit={usage.limits.maxUsers} />
                  <UsageBar label="Branches" used={usage.usage.branches} limit={usage.limits.maxBranches} />
                  <UsageBar label="Items" used={usage.usage.items} limit={usage.limits.maxItems} />
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">Usage information is unavailable.</p>
              )}
            </div>
          </div>

          {/* Plan comparison grid */}
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">All Plans</h2>
          {plans.length === 0 ? (
            <EmptyState icon="bx-package" title="No plans available" description="Plans could not be loaded" />
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
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
                      {planPrice(plan).amount > 0 ? (
                        <>
                          {planPrice(plan).text}
                          <span className="text-sm font-normal text-gray-500 dark:text-gray-400">/mo</span>
                        </>
                      ) : (
                        'Free'
                      )}
                    </p>
                    {plan.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{plan.description}</p>
                    )}
                    <ul className="mt-4 space-y-2 text-sm text-gray-700 dark:text-gray-300 flex-1">
                      <li className="flex items-center gap-2">
                        <i className="bx bx-user text-gray-400" aria-hidden="true"></i>
                        {limitLabel(plan.limits.maxUsers)} users
                      </li>
                      <li className="flex items-center gap-2">
                        <i className="bx bx-git-branch text-gray-400" aria-hidden="true"></i>
                        {limitLabel(plan.limits.maxBranches)} branches
                      </li>
                      <li className="flex items-center gap-2">
                        <i className="bx bx-box text-gray-400" aria-hidden="true"></i>
                        {limitLabel(plan.limits.maxItems)} items
                      </li>
                      {(plan.limits.modules || []).map((module) => (
                        <li key={module} className="flex items-center gap-2">
                          <i className="bx bx-check text-green-500" aria-hidden="true"></i>
                          {moduleLabel(module)}
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => setSwitchTarget(plan)}
                      disabled={isCurrent}
                      className={`mt-5 w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isCurrent
                          ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                          : 'bg-brand-600 text-white hover:bg-brand-700'
                      }`}
                    >
                      {isCurrent ? 'Current plan' : 'Switch plan'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Switch plan confirm */}
      <Modal isOpen={!!switchTarget} onClose={() => setSwitchTarget(null)} title="Switch Plan" maxWidth="md">
        {switchTarget && (
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              Switch from <strong className="text-gray-900 dark:text-gray-100">{subscription?.plan?.name || 'your current plan'}</strong>{' '}
              to <strong className="text-gray-900 dark:text-gray-100">{switchTarget.name}</strong>
              {switchTarget.monthlyPriceUsd > 0
                ? ` at $${formatNumber(switchTarget.monthlyPriceUsd, 2)}/month?`
                : ' (free)?'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Plan limits apply immediately. Downgrading may restrict access to features above the new plan&apos;s limits.
            </p>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setSwitchTarget(null)}
                disabled={switching}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSwitch}
                disabled={switching}
                className="px-4 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
              >
                {switching ? 'Switching...' : 'Confirm Switch'}
              </button>
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
