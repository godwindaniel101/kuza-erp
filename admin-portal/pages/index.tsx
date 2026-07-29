import { useCallback, useEffect, useMemo, useState } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import PageHeader from '@/components/ui/PageHeader';
import StatCard from '@/components/ui/StatCard';
import Card from '@/components/Card';
import Button from '@/components/ui/Button';
import DataTable, { DataTableColumn } from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import {
  adminApi,
  AdminTenant,
  tenantPlan,
  tenantAppsCount,
  tenantSubscriptionStatus,
} from '@/lib/admin';

function formatDate(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

/** Map a subscription status to a status-badge variant. */
function subVariant(status: string): 'success' | 'pending' | 'error' | 'info' {
  if (status === 'active') return 'success';
  if (status === 'trialing' || status === 'trial') return 'pending';
  if (status === 'expired' || status === 'cancelled' || status === 'inactive') return 'error';
  return 'info';
}

export default function AdminDashboard() {
  const router = useRouter();
  const [tenants, setTenants] = useState<AdminTenant[] | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [list, reqs] = await Promise.all([
        adminApi.listTenants(),
        adminApi.listAccessRequests('PENDING').catch(() => []),
      ]);
      setTenants(list);
      setPendingCount(reqs.length);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const list = tenants ?? [];
    const byStatus: Record<string, number> = {};
    const byPlan: Record<string, number> = {};
    for (const t of list) {
      const s = tenantSubscriptionStatus(t);
      byStatus[s] = (byStatus[s] ?? 0) + 1;
      const planName = tenantPlan(t).name || 'No plan';
      byPlan[planName] = (byPlan[planName] ?? 0) + 1;
    }
    const trialing = (byStatus['trialing'] ?? 0) + (byStatus['trial'] ?? 0);
    const expired =
      (byStatus['expired'] ?? 0) + (byStatus['cancelled'] ?? 0) + (byStatus['inactive'] ?? 0);
    const planRows = Object.entries(byPlan).sort((a, b) => b[1] - a[1]);
    return {
      total: list.length,
      active: byStatus['active'] ?? 0,
      trialing,
      expired,
      planRows,
    };
  }, [tenants]);

  const recent = useMemo(() => {
    const list = [...(tenants ?? [])];
    list.sort((a, b) => {
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return db - da;
    });
    return list.slice(0, 6);
  }, [tenants]);

  const columns: DataTableColumn<AdminTenant>[] = [
    {
      key: 'name',
      label: 'Business',
      render: (t) => (
        <div className="min-w-0">
          <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{t.name || '—'}</p>
          {t.slug && <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{t.slug}</p>}
        </div>
      ),
    },
    {
      key: 'plan',
      label: 'Plan',
      render: (t) => {
        const { name } = tenantPlan(t);
        return name ? (
          <span className="inline-flex items-center rounded-full bg-brand-50 dark:bg-brand-500/10 px-2 py-0.5 text-xs font-medium text-brand-700 dark:text-brand-400 ring-1 ring-inset ring-brand-600/20">
            {name}
          </span>
        ) : (
          <span className="text-gray-400 dark:text-gray-500">—</span>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (t) => {
        const s = tenantSubscriptionStatus(t);
        return <StatusBadge variant={subVariant(s)} label={s.charAt(0).toUpperCase() + s.slice(1)} size="sm" />;
      },
    },
    {
      key: 'apps',
      label: 'Apps',
      align: 'center',
      render: (t) => <span className="tabular-nums text-gray-700 dark:text-gray-300">{tenantAppsCount(t)}</span>,
    },
    {
      key: 'createdAt',
      label: 'Created',
      render: (t) => <span className="text-gray-500 dark:text-gray-400">{formatDate(t.createdAt)}</span>,
    },
  ];

  return (
    <div className="w-full space-y-5">
      <PageHeader
        title="Dashboard"
        subtitle="Platform overview across every business on Kuza."
        actions={
          <Button href="/tenants" variant="secondary" size="sm">
            <i className="bx bx-buildings text-base" aria-hidden="true" />
            All tenants
          </Button>
        }
      />

      {loadError ? (
        <EmptyState
          icon="bx-bar-chart-alt-2"
          title="Couldn't load the overview"
          description="The admin service didn't respond. Try again in a moment."
          actions={
            <Button size="sm" onClick={load}>
              Retry
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total tenants" value={stats.total} icon="bx-buildings" tone="info" loading={loading} />
            <StatCard label="Active" value={stats.active} icon="bx-check-circle" tone="success" loading={loading} />
            <StatCard label="Trialing" value={stats.trialing} icon="bx-time-five" tone="warning" loading={loading} />
            <StatCard
              label="Pending requests"
              value={pendingCount}
              icon="bx-bell"
              tone={pendingCount > 0 ? 'warning' : 'default'}
              loading={loading}
              caption={pendingCount > 0 ? 'Awaiting review' : 'All caught up'}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <Card title="Plan distribution" subtitle="Tenants by subscription plan" className="lg:col-span-2">
              {stats.planRows.length === 0 ? (
                <p className="text-[13px] text-gray-500 dark:text-gray-400">No tenants yet.</p>
              ) : (
                <ul className="space-y-3">
                  {stats.planRows.map(([plan, count]) => {
                    const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                    return (
                      <li key={plan}>
                        <div className="mb-1 flex items-center justify-between text-[13px]">
                          <span className="font-medium text-gray-700 dark:text-gray-300">{plan}</span>
                          <span className="tabular-nums text-gray-500 dark:text-gray-400">
                            {count} · {pct}%
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                          <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${pct}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>

            <Card title="Subscription status" subtitle="Lifecycle across tenants">
              <dl className="space-y-3">
                {[
                  { label: 'Active', value: stats.active, variant: 'success' as const },
                  { label: 'Trialing', value: stats.trialing, variant: 'pending' as const },
                  { label: 'Expired', value: stats.expired, variant: 'error' as const },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between">
                    <dt>
                      <StatusBadge variant={row.variant} label={row.label} size="sm" />
                    </dt>
                    <dd className="font-display text-lg font-semibold tabular-nums text-gray-900 dark:text-white">
                      {loading ? '—' : row.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </Card>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-[15px] font-semibold tracking-tight text-gray-900 dark:text-gray-100">
                Recent tenants
              </h2>
              <Button href="/tenants" variant="ghost" size="sm">
                View all
                <i className="bx bx-right-arrow-alt text-base" aria-hidden="true" />
              </Button>
            </div>
            <DataTable<AdminTenant>
              columns={columns}
              data={recent}
              loading={loading}
              onRowClick={(t) => router.push(`/tenants/${t.id}`)}
              emptyState={
                <EmptyState
                  icon="bx-buildings"
                  title="No tenants yet"
                  description="Businesses will appear here once they sign up."
                />
              }
            />
          </div>
        </>
      )}
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
