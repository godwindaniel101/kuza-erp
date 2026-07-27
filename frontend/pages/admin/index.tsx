import { useCallback, useEffect, useMemo, useState } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import DataTable, { DataTableColumn } from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import AdminGuard from '@/components/AdminGuard';
import { usePageSearch } from '@/store/searchStore';
import {
  adminApi,
  AdminTenant,
  tenantPlan,
  tenantStatus,
  tenantAppsCount,
} from '@/lib/admin';

function formatDate(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

function AdminTenantsInner() {
  const router = useRouter();
  const [tenants, setTenants] = useState<AdminTenant[] | null>(null);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const search = usePageSearch('Search businesses');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const list = await adminApi.listTenants();
      setTenants(list);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPending = useCallback(async () => {
    try {
      const reqs = await adminApi.listAccessRequests('PENDING');
      setPendingCount(reqs.length);
    } catch {
      setPendingCount(0);
    }
  }, []);

  useEffect(() => {
    load();
    loadPending();
  }, [load, loadPending]);

  const filtered = useMemo(() => {
    const list = tenants ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (t) =>
        t.name?.toLowerCase().includes(q) ||
        t.slug?.toLowerCase().includes(q) ||
        tenantPlan(t).name?.toLowerCase().includes(q),
    );
  }, [tenants, search]);

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
        const status = tenantStatus(t);
        const active = status === 'active';
        return (
          <StatusBadge
            variant={active ? 'success' : 'error'}
            label={active ? 'Active' : status.charAt(0).toUpperCase() + status.slice(1)}
            size="sm"
          />
        );
      },
    },
    {
      key: 'apps',
      label: 'Apps',
      align: 'center',
      render: (t) => (
        <span className="tabular-nums text-gray-700 dark:text-gray-300">{tenantAppsCount(t)}</span>
      ),
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
        title="Tenants"
        subtitle="Every business on the platform. Open a tenant to manage its apps, plan and access requests."
        count={tenants?.length}
        actions={
          <div className="flex items-center gap-2">
            <Button href="/admin/plans" variant="secondary" size="sm">
              <i className="bx bx-package text-base" aria-hidden="true" />
              Plans
            </Button>
            <Button href="/admin/requests" variant="secondary" size="sm">
              <i className="bx bx-bell text-base" aria-hidden="true" />
              Pending requests
              {pendingCount > 0 && (
                <span className="ml-1 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-2xs font-semibold text-amber-700 dark:text-amber-400">
                  {pendingCount}
                </span>
              )}
            </Button>
          </div>
        }
      />

      {loadError ? (
        <EmptyState
          icon="bx-buildings"
          title="Couldn't load tenants"
          description="The admin service didn't respond. Try again in a moment."
          actions={
            <Button size="sm" onClick={load}>
              Retry
            </Button>
          }
        />
      ) : (
        <DataTable<AdminTenant>
          columns={columns}
          data={filtered}
          loading={loading}
          onRowClick={(t) => router.push(`/admin/tenants/${t.id}`)}
          emptyState={
            <EmptyState
              icon="bx-buildings"
              title={search ? 'No matching businesses' : 'No tenants yet'}
              description={
                search
                  ? 'No businesses match your search.'
                  : 'Businesses will appear here once they sign up.'
              }
            />
          }
        />
      )}
    </div>
  );
}

export default function AdminTenantsPage() {
  return (
    <AdminGuard>
      <AdminTenantsInner />
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
