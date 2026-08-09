import { useCallback, useEffect, useMemo, useState } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import FormField from '@/components/ui/FormField';
import EmptyState from '@/components/ui/EmptyState';
import Toast from '@/components/Toast';
import AdminGuard from '@/components/AdminGuard';
import { adminApi, AdminPricing } from '@/lib/admin';

const GROUP_LABEL: Record<string, string> = {
  vertical: 'Verticals',
  common: 'Common apps',
  assist: 'Assists (free)',
};

const GROUP_ORDER: Array<'vertical' | 'common' | 'assist'> = [
  'vertical',
  'common',
  'assist',
];

/** Parse a price input, treating blank/NaN as 0 and clamping negatives to 0. */
function toPrice(value: string): number {
  const n = parseFloat(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function toCount(value: string): number {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function AdminPricingInner() {
  const [config, setConfig] = useState<AdminPricing | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currency, setCurrency] = useState<string>('');
  const [toast, setToast] = useState<
    { message: string; type: 'success' | 'error' | 'info' } | null
  >(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await adminApi.getPricing();
      if (!data) {
        setLoadError(true);
        return;
      }
      setConfig(data);
      setCurrency((prev) => prev || data.currencies[0] || 'NGN');
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const currencyOptions = useMemo(
    () => (config?.currencies ?? []).map((c) => ({ value: c, label: c })),
    [config],
  );

  const appsByGroup = useMemo(() => {
    const groups: Record<string, AdminPricing['apps']> = {
      vertical: [],
      common: [],
      assist: [],
    };
    for (const app of config?.apps ?? []) {
      (groups[app.group] ??= []).push(app);
    }
    return groups;
  }, [config]);

  // --- in-place editors (mutate the working copy across currency switches) ---
  const setAppPrice = (appKey: string, value: string) => {
    setConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        apps: prev.apps.map((a) =>
          a.key === appKey
            ? { ...a, prices: { ...a.prices, [currency]: toPrice(value) } }
            : a,
        ),
      };
    });
  };

  const setUsagePrice = (unit: 'branch' | 'user', value: string) => {
    setConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        usagePrices: {
          ...prev.usagePrices,
          [unit]: { ...prev.usagePrices[unit], [currency]: toPrice(value) },
        },
      };
    });
  };

  const setIncluded = (field: 'includedBranches' | 'includedUsers', value: string) => {
    setConfig((prev) => (prev ? { ...prev, [field]: toCount(value) } : prev));
  };

  const save = async () => {
    if (!config || saving) return;
    setSaving(true);
    try {
      // Send the full working copy — the server validates (assists stay 0) and
      // merges. Assist prices are never edited here, so they remain 0.
      const appPrices: Record<string, Record<string, number>> = {};
      for (const app of config.apps) {
        if (app.isAssist) continue; // assists are free — never priced
        appPrices[app.key] = app.prices;
      }
      const updated = await adminApi.updatePricing({
        appPrices,
        usagePrices: {
          branch: config.usagePrices.branch,
          user: config.usagePrices.user,
        },
        includedBranches: config.includedBranches,
        includedUsers: config.includedUsers,
      });
      if (updated) setConfig(updated);
      setToast({ message: 'Pricing saved', type: 'success' });
    } catch (err: any) {
      setToast({
        message: err?.response?.data?.message || 'Could not save pricing',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full space-y-5">
      <PageHeader
        title="Pricing"
        subtitle="À-la-carte prices for every app plus branch/user usage — platform-wide, per currency."
        breadcrumbs={[{ label: 'Tenants', href: '/admin' }, { label: 'Pricing' }]}
        actions={
          <div className="flex items-center gap-3">
            <div className="w-32">
              <FormField
                type="select"
                name="currency"
                value={currency}
                onChange={setCurrency}
                options={currencyOptions}
                disabled={loading || !config}
              />
            </div>
            <Button size="sm" onClick={save} loading={saving} disabled={loading || !config}>
              Save
            </Button>
          </div>
        }
      />

      {loadError ? (
        <EmptyState
          icon="bx-dollar-circle"
          title="Couldn't load pricing"
          description="The admin service didn't respond. Try again in a moment."
          actions={
            <Button size="sm" onClick={load}>
              Retry
            </Button>
          }
        />
      ) : loading || !config ? (
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-6 text-sm text-gray-500 dark:text-gray-400">
          Loading pricing…
        </div>
      ) : (
        <div className="space-y-4">
          {/* App prices, grouped */}
          {GROUP_ORDER.map((group) => {
            const apps = appsByGroup[group] ?? [];
            if (apps.length === 0) return null;
            return (
              <section
                key={group}
                className="rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden"
              >
                <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40 px-4 py-2.5">
                  <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    {GROUP_LABEL[group]}
                  </h2>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    Monthly price ({currency})
                  </span>
                </div>
                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                  {apps.map((app) => (
                    <li key={app.key} className="flex items-center gap-4 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 dark:text-gray-100">{app.name}</p>
                        {app.description && (
                          <p className="truncate text-xs text-gray-400 dark:text-gray-500">
                            {app.description}
                          </p>
                        )}
                      </div>
                      <div className="w-36">
                        {app.isAssist ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                            Free
                          </span>
                        ) : (
                          <FormField
                            type="number"
                            name={`price-${app.key}`}
                            value={String(app.prices[currency] ?? 0)}
                            onChange={(v) => setAppPrice(app.key, v)}
                            min={0}
                            step={1}
                          />
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}

          {/* Usage add-ons */}
          <section className="rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40 px-4 py-2.5">
              <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                Usage add-ons
              </h2>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Charged per unit beyond the included allowance ({currency}/month).
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
              <FormField
                type="number"
                label="Per extra branch"
                name="usage-branch"
                value={String(config.usagePrices.branch?.[currency] ?? 0)}
                onChange={(v) => setUsagePrice('branch', v)}
                min={0}
                step={1}
              />
              <FormField
                type="number"
                label="Per extra user"
                name="usage-user"
                value={String(config.usagePrices.user?.[currency] ?? 0)}
                onChange={(v) => setUsagePrice('user', v)}
                min={0}
                step={1}
              />
            </div>
          </section>

          {/* Included allowance (currency-independent) */}
          <section className="rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40 px-4 py-2.5">
              <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                Included allowance
              </h2>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Applies to every currency — usage add-ons only apply beyond these.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
              <FormField
                type="number"
                label="Included branches"
                name="includedBranches"
                value={String(config.includedBranches)}
                onChange={(v) => setIncluded('includedBranches', v)}
                min={0}
                step={1}
              />
              <FormField
                type="number"
                label="Included users"
                name="includedUsers"
                value={String(config.includedUsers)}
                onChange={(v) => setIncluded('includedUsers', v)}
                min={0}
                step={1}
              />
            </div>
          </section>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

export default function AdminPricingPage() {
  return (
    <AdminGuard>
      <AdminPricingInner />
    </AdminGuard>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale || 'en', ['common'])),
    },
  };
};
