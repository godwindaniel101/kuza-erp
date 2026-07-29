import { useCallback, useEffect, useState } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Card from '@/components/Card';
import EmptyState from '@/components/ui/EmptyState';
import Icon from '@/components/ui/Icon';
import StatusBadge from '@/components/ui/StatusBadge';
import Toast from '@/components/Toast';
import { getApp } from '@/lib/apps';
import {
  adminApi,
  AdminAccessRequest,
  requesterLabel,
  requestTenantName,
} from '@/lib/admin';

function formatDate(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString();
}

type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

const STATUS_TABS: { value: RequestStatus; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
];

const STATUS_BADGE: Record<RequestStatus, 'pending' | 'approved' | 'rejected'> = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

export default function AdminRequestsPage() {
  const [status, setStatus] = useState<RequestStatus>('PENDING');
  const [requests, setRequests] = useState<AdminAccessRequest[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(
    null,
  );

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      setRequests(await adminApi.listAccessRequests(status));
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async (req: AdminAccessRequest, action: 'approve' | 'reject') => {
    if (decidingId) return;
    setDecidingId(req.id);
    const name = getApp(req.appKey)?.name || req.appKey;
    try {
      await adminApi.decideAccessRequest(req.id, action);
      setToast({
        message: action === 'approve' ? `Access to ${name} approved` : `Request for ${name} rejected`,
        type: 'success',
      });
      // Drop the decided request from the current (pending) view, then refresh.
      setRequests((prev) => (prev ? prev.filter((r) => r.id !== req.id) : prev));
      load();
    } catch (err: any) {
      setToast({
        message: err?.response?.data?.message || `Could not ${action} the request`,
        type: 'error',
      });
    } finally {
      setDecidingId(null);
    }
  };

  return (
    <div className="w-full max-w-3xl space-y-5">
      <PageHeader
        title="Access requests"
        subtitle="App-access requests across every business on the platform."
        count={requests?.length}
        breadcrumbs={[{ label: 'Tenants', href: '/tenants' }, { label: 'Requests' }]}
      />

      {/* Status filter */}
      <div className="inline-flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
        {STATUS_TABS.map((tab) => {
          const active = tab.value === status;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatus(tab.value)}
              className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
                active
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <Card>
          <div className="flex min-h-[20vh] items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-b-2 border-brand-600" />
          </div>
        </Card>
      ) : loadError ? (
        <EmptyState
          icon="bx-bell"
          title="Couldn't load requests"
          description="The admin service didn't respond. Try again in a moment."
          actions={
            <Button size="sm" onClick={load}>
              Retry
            </Button>
          }
        />
      ) : !requests || requests.length === 0 ? (
        <EmptyState
          icon={status === 'PENDING' ? 'bx-check-circle' : 'bx-inbox'}
          title={status === 'PENDING' ? 'No pending requests' : `No ${status.toLowerCase()} requests`}
          description={
            status === 'PENDING'
              ? "You're all caught up. New app-access requests will appear here."
              : `There are no ${status.toLowerCase()} requests to show.`
          }
        />
      ) : (
        <Card padding={false}>
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {requests.map((req) => {
              const def = getApp(req.appKey);
              return (
                <li key={req.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500">
                    <Icon name={def?.icon ?? 'squares-2x2'} size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {def?.name || req.appKey}
                      <span className="text-gray-400 dark:text-gray-500"> · </span>
                      {req.tenantId ? (
                        <Link
                          href={`/tenants/${req.tenantId}`}
                          className="font-medium text-brand-600 dark:text-brand-400 hover:underline"
                        >
                          {requestTenantName(req)}
                        </Link>
                      ) : (
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {requestTenantName(req)}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {requesterLabel(req)}
                      {formatDate(req.createdAt) && <span> · {formatDate(req.createdAt)}</span>}
                      {req.note && <span> · “{req.note}”</span>}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {status === 'PENDING' ? (
                      <>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={decidingId === req.id}
                          onClick={() => decide(req, 'reject')}
                        >
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          loading={decidingId === req.id}
                          onClick={() => decide(req, 'approve')}
                        >
                          Approve
                        </Button>
                      </>
                    ) : (
                      <StatusBadge variant={STATUS_BADGE[status]} label={STATUS_TABS.find((t) => t.value === status)?.label} size="sm" />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
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
