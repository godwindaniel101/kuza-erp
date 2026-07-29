import { useCallback, useEffect, useMemo, useState } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Card from '@/components/Card';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import Toast from '@/components/Toast';
import Icon from '@/components/ui/Icon';
import AdminGuard from '@/components/AdminGuard';
import { APP_REGISTRY, getApp } from '@/lib/apps';
import type { IconName } from '@/components/ui/Icon';
import {
  adminApi,
  AdminTenantDetail,
  AdminAppState,
  AdminPlan,
  AdminAccessRequest,
  tenantPlan,
  tenantStatus,
  requesterLabel,
} from '@/lib/admin';

function formatDate(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString();
}

interface MergedApp {
  key: string;
  name: string;
  description: string;
  icon: IconName;
  enabled: boolean;
  effective: boolean;
  allowedByPlan: boolean;
}

function AdminTenantDetailInner() {
  const router = useRouter();
  const id = typeof router.query.id === 'string' ? router.query.id : '';

  const [tenant, setTenant] = useState<AdminTenantDetail | null>(null);
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [changingPlan, setChangingPlan] = useState(false);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(
    null,
  );

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setLoadError(false);
    try {
      const detail = await adminApi.getTenant(id);
      if (detail) {
        setTenant(detail);
      } else {
        setLoadError(true);
      }
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadPlans = useCallback(async () => {
    try {
      setPlans(await adminApi.listPlans());
    } catch {
      setPlans([]);
    }
  }, []);

  useEffect(() => {
    load();
    loadPlans();
  }, [load, loadPlans]);

  // Effective apps for the tenant across the possible payload shapes.
  const effectiveKeys = useMemo(() => {
    const list = tenant?.effective ?? tenant?.effectiveApps ?? tenant?.enabledApps;
    return Array.isArray(list) ? list : [];
  }, [tenant]);

  // Always show every registry app, overlaying the tenant's per-app state.
  const mergedApps: MergedApp[] = useMemo(() => {
    const byKey = new Map<string, AdminAppState>();
    (tenant?.apps ?? []).forEach((a) => byKey.set(a.key, a));
    return APP_REGISTRY.map((def) => {
      const state = byKey.get(def.key);
      const enabled = state?.enabled ?? effectiveKeys.includes(def.key);
      return {
        key: def.key,
        name: state?.name || def.name,
        description: state?.description || def.description,
        icon: def.icon,
        enabled,
        effective: state?.effective ?? (enabled && (state?.allowedByPlan ?? true)),
        allowedByPlan: state?.allowedByPlan ?? true,
      };
    });
  }, [tenant, effectiveKeys]);

  const pendingRequests: AdminAccessRequest[] = useMemo(
    () =>
      (tenant?.accessRequests ?? []).filter(
        (r) => !r.status || r.status.toUpperCase() === 'PENDING',
      ),
    [tenant],
  );

  const applyOrReload = useCallback(
    async (updated: AdminTenantDetail | undefined) => {
      if (updated && (updated.id || updated.apps || updated.plan)) {
        setTenant((prev) => ({ ...(prev ?? {} as AdminTenantDetail), ...updated }));
      } else {
        await load();
      }
    },
    [load],
  );

  const toggleApp = async (app: MergedApp) => {
    if (busyKey || !id) return;
    setBusyKey(app.key);
    try {
      const updated = await adminApi.setApp(id, app.key, !app.enabled);
      await applyOrReload(updated);
      setToast({
        message: `${app.name} ${!app.enabled ? 'enabled' : 'disabled'} for this business`,
        type: 'success',
      });
    } catch (err: any) {
      setToast({
        message: err?.response?.data?.message || `Could not update ${app.name}`,
        type: 'error',
      });
    } finally {
      setBusyKey(null);
    }
  };

  const changePlan = async (planCode: string) => {
    if (!planCode || !id || changingPlan) return;
    setChangingPlan(true);
    try {
      const updated = await adminApi.changePlan(id, planCode);
      await applyOrReload(updated);
      const planName = plans.find((p) => p.code === planCode)?.name || planCode;
      setToast({ message: `Plan changed to ${planName}`, type: 'success' });
    } catch (err: any) {
      setToast({
        message: err?.response?.data?.message || 'Could not change the plan',
        type: 'error',
      });
    } finally {
      setChangingPlan(false);
    }
  };

  const decideRequest = async (req: AdminAccessRequest, action: 'approve' | 'reject') => {
    if (decidingId) return;
    setDecidingId(req.id);
    const name = getApp(req.appKey)?.name || req.appKey;
    try {
      await adminApi.decideAccessRequest(req.id, action);
      setToast({
        message: action === 'approve' ? `Access to ${name} approved` : `Request for ${name} rejected`,
        type: 'success',
      });
      await load();
    } catch (err: any) {
      setToast({
        message: err?.response?.data?.message || `Could not ${action} the request`,
        type: 'error',
      });
    } finally {
      setDecidingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-brand-600" />
      </div>
    );
  }

  if (loadError || !tenant) {
    return (
      <div className="w-full max-w-3xl space-y-5">
        <PageHeader
          title="Tenant"
          breadcrumbs={[{ label: 'Tenants', href: '/admin' }, { label: 'Detail' }]}
        />
        <EmptyState
          icon="bx-buildings"
          title="Couldn't load this tenant"
          description="The tenant may not exist or the admin service didn't respond."
          actions={
            <>
              <Button size="sm" variant="secondary" href="/admin">
                Back to tenants
              </Button>
              <Button size="sm" onClick={load}>
                Retry
              </Button>
            </>
          }
        />
      </div>
    );
  }

  const { name: planName, code: planCode } = tenantPlan(tenant);
  const status = tenantStatus(tenant);
  const statusActive = status === 'active';

  return (
    <div className="w-full max-w-4xl space-y-5">
      <PageHeader
        title={tenant.name || 'Business'}
        subtitle={tenant.slug || undefined}
        breadcrumbs={[{ label: 'Tenants', href: '/admin' }, { label: tenant.name || 'Detail' }]}
        actions={
          <StatusBadge
            variant={statusActive ? 'success' : 'error'}
            label={statusActive ? 'Active' : status.charAt(0).toUpperCase() + status.slice(1)}
            size="sm"
          />
        }
      />

      {/* Overview */}
      <Card title="Overview">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-2xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Business type
            </dt>
            <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 capitalize">
              {tenant.businessType || '—'}
            </dd>
          </div>
          <div>
            <dt className="text-2xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Plan
            </dt>
            <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{planName || '—'}</dd>
          </div>
          <div>
            <dt className="text-2xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Status
            </dt>
            <dd className="mt-1">
              <StatusBadge
                variant={statusActive ? 'success' : 'error'}
                label={statusActive ? 'Active' : status.charAt(0).toUpperCase() + status.slice(1)}
                size="sm"
              />
            </dd>
          </div>
        </dl>
      </Card>

      {/* Plan selector */}
      <Card title="Plan" subtitle="Change the subscription plan for this business.">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={planCode ?? ''}
            disabled={changingPlan || plans.length === 0}
            onChange={(e) => changePlan(e.target.value)}
            aria-label="Subscription plan"
            className="h-9 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-[13px] text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-60"
          >
            {plans.length === 0 && <option value="">No plans available</option>}
            {planCode && !plans.some((p) => p.code === planCode) && (
              <option value={planCode}>{planName || planCode}</option>
            )}
            {plans.map((p) => (
              <option key={p.code} value={p.code}>
                {p.name}
                {typeof p.monthlyPriceUsd === 'number' ? ` — $${p.monthlyPriceUsd}/mo` : ''}
              </option>
            ))}
          </select>
          {changingPlan && (
            <span className="text-[13px] text-gray-500 dark:text-gray-400">Updating…</span>
          )}
        </div>
      </Card>

      {/* Apps */}
      <Card title="Apps" subtitle="Turn apps on or off for this business.">
        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {mergedApps.map((app) => (
            <li key={app.key} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                  app.effective
                    ? 'bg-brand-gradient text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                }`}
              >
                <Icon name={app.icon} size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {app.name}
                  </p>
                  {app.enabled && !app.effective && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-500/10 px-1.5 py-0.5 text-2xs font-medium text-amber-700 dark:text-amber-400 ring-1 ring-inset ring-amber-600/20">
                      <i className="bx bx-lock-alt" aria-hidden="true" />
                      Not in plan
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{app.description}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={app.enabled}
                aria-label={`${app.enabled ? 'Disable' : 'Enable'} ${app.name}`}
                disabled={busyKey === app.key}
                onClick={() => toggleApp(app)}
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-50 ${
                  app.enabled ? 'bg-brand-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-150 ${
                    app.enabled ? 'translate-x-[18px]' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </li>
          ))}
        </ul>
      </Card>

      {/* Pending access requests */}
      <Card
        title="Access requests"
        subtitle="Teammates in this business waiting on an app."
        headerAction={
          pendingRequests.length > 0 ? (
            <StatusBadge variant="pending" label={`${pendingRequests.length} pending`} size="sm" />
          ) : undefined
        }
      >
        {pendingRequests.length === 0 ? (
          <p className="text-[13px] text-gray-500 dark:text-gray-400">No pending requests.</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {pendingRequests.map((req) => (
              <li key={req.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {getApp(req.appKey)?.name || req.appKey}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {requesterLabel(req)}
                    {formatDate(req.createdAt) && <span> · {formatDate(req.createdAt)}</span>}
                    {req.note && <span> · “{req.note}”</span>}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={decidingId === req.id}
                    onClick={() => decideRequest(req, 'reject')}
                  >
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    loading={decidingId === req.id}
                    onClick={() => decideRequest(req, 'approve')}
                  >
                    Approve
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

export default function AdminTenantDetailPage() {
  return (
    <AdminGuard>
      <AdminTenantDetailInner />
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
