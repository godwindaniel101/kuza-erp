import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { api } from '@/lib/api';
import Toast from '@/components/Toast';
import PageHeader from '@/components/ui/PageHeader';
import FilterBar, { type FilterValues } from '@/components/ui/FilterBar';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable';
import StatusBadge, { type StatusBadgeVariant } from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';
import { formatDate, downloadCsv } from '@/lib/format';

type AdjustmentReason = 'DAMAGE' | 'THEFT' | 'COUNT' | 'EXPIRY' | 'OTHER';
type AdjustmentStatus = 'DRAFT' | 'APPROVED' | 'REJECTED';

interface AdjustmentItem {
  itemId: string;
  quantityChange: number;
  unitCost?: number;
  reason?: string;
}

interface Adjustment {
  id: string;
  adjustmentNumber: string;
  branchId?: string;
  reason: AdjustmentReason;
  notes?: string;
  status: AdjustmentStatus;
  items: AdjustmentItem[];
  createdAt: string;
}

const REASON_LABELS: Record<AdjustmentReason, string> = {
  DAMAGE: 'Damage',
  THEFT: 'Theft',
  COUNT: 'Stock count',
  EXPIRY: 'Expiry',
  OTHER: 'Other',
};

const REASON_ICONS: Record<AdjustmentReason, string> = {
  DAMAGE: 'bx-error-circle',
  THEFT: 'bx-shield-x',
  COUNT: 'bx-list-check',
  EXPIRY: 'bx-calendar-x',
  OTHER: 'bx-dots-horizontal-rounded',
};

const adjustmentStatusVariant: Record<AdjustmentStatus, { variant: StatusBadgeVariant; label: string }> = {
  DRAFT: { variant: 'pending', label: 'Draft' },
  APPROVED: { variant: 'approved', label: 'Approved' },
  REJECTED: { variant: 'rejected', label: 'Rejected' },
};

const PAGE_SIZE = 10;

export default function AdjustmentsPage() {
  const router = useRouter();
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [filters, setFilters] = useState<FilterValues>({ status: '', reason: '' });
  const status = (filters.status as string) || '';
  const reason = (filters.reason as string) || '';

  const loadAdjustments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (status) params.set('status', status);
      if (reason) params.set('reason', reason);
      const res = await api.get<{ success: boolean; data: { items: Adjustment[]; total: number } }>(
        `/ims/adjustments?${params.toString()}`,
      );
      if (res.success) {
        setAdjustments(res.data.items || []);
        setTotal(res.data.total || 0);
      }
    } catch (err: any) {
      console.error('Failed to load adjustments:', err);
      setToast({ message: err.response?.data?.message || 'Failed to load adjustments', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page, status, reason]);

  useEffect(() => {
    loadAdjustments();
  }, [loadAdjustments]);

  useEffect(() => {
    setPage(1);
  }, [status, reason]);

  const columns: DataTableColumn<Adjustment>[] = [
    {
      key: 'adjustmentNumber',
      label: 'Adjustment #',
      render: (a) => <span className="font-medium text-gray-900 dark:text-white">{a.adjustmentNumber}</span>,
    },
    { key: 'createdAt', label: 'Date', render: (a) => formatDate(a.createdAt) },
    {
      key: 'reason',
      label: 'Reason',
      render: (a) => (
        <span className="inline-flex items-center gap-1.5">
          <i className={`bx ${REASON_ICONS[a.reason] || 'bx-dots-horizontal-rounded'} text-gray-400 dark:text-gray-500`} aria-hidden="true"></i>
          {REASON_LABELS[a.reason] || a.reason}
        </span>
      ),
    },
    { key: 'items', label: 'Items', align: 'right', cellClassName: 'tabular-nums', render: (a) => (a.items || []).length },
    {
      key: 'netChange',
      label: 'Net Qty Change',
      align: 'right',
      render: (a) => {
        const net = (a.items || []).reduce((s, i) => s + Number(i.quantityChange || 0), 0);
        return (
          <span className={net > 0 ? 'text-green-600 dark:text-green-400' : net < 0 ? 'text-red-600 dark:text-red-400' : ''}>
            {net > 0 ? `+${net}` : net}
          </span>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (a) => {
        const s = adjustmentStatusVariant[a.status] ?? adjustmentStatusVariant.DRAFT;
        return <StatusBadge variant={s.variant} label={s.label} size="sm" />;
      },
    },
  ];

  const handleExportCsv = () => {
    const headers = ['Adjustment #', 'Date', 'Reason', 'Items', 'Net Qty Change', 'Status'];
    const rows = adjustments.map((a) => [
      a.adjustmentNumber || '',
      formatDate(a.createdAt),
      REASON_LABELS[a.reason] || a.reason,
      (a.items || []).length,
      (a.items || []).reduce((s, i) => s + Number(i.quantityChange || 0), 0),
      adjustmentStatusVariant[a.status]?.label || a.status,
    ]);
    downloadCsv(`adjustments-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const startIndex = (page - 1) * PAGE_SIZE;
  const hasFilters = !!status || !!reason;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Stock Adjustments"
        count={loading ? undefined : total}
        subtitle="Correct stock levels for damage, theft, counts and more"
        breadcrumbs={[{ label: 'IMS', href: '/ims/inventory' }, { label: 'Adjustments' }]}
        actions={
          <>
            {!loading && adjustments.length > 0 && (
              <Button size="sm" variant="secondary" onClick={handleExportCsv}>
                <i className="bx bx-download"></i>
                Export CSV
              </Button>
            )}
            <Link
              href="/ims/adjustments/new"
              className="h-8 px-3 bg-brand-600 text-white rounded-lg text-[13px] font-medium hover:bg-brand-700 flex items-center"
            >
              <i className="bx bx-plus mr-2"></i>
              New Adjustment
            </Link>
          </>
        }
      />

      <FilterBar
        filters={[
          {
            key: 'status',
            type: 'select',
            placeholder: 'All statuses',
            className: 'w-full sm:w-52',
            options: [
              { value: '', label: 'All statuses' },
              { value: 'DRAFT', label: 'Draft' },
              { value: 'APPROVED', label: 'Approved' },
              { value: 'REJECTED', label: 'Rejected' },
            ],
          },
          {
            key: 'reason',
            type: 'select',
            placeholder: 'All reasons',
            className: 'w-full sm:w-52',
            options: [
              { value: '', label: 'All reasons' },
              ...Object.entries(REASON_LABELS).map(([value, label]) => ({ value, label })),
            ],
          },
        ]}
        values={filters}
        onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
        onClear={() => setFilters({ status: '', reason: '' })}
      />

      <DataTable<Adjustment>
        columns={columns}
        data={adjustments}
        loading={loading}
        onRowClick={(a) => router.push(`/ims/adjustments/${a.id}`)}
        pagination={{
          page,
          totalPages,
          startIndex,
          endIndex: Math.min(startIndex + adjustments.length, total),
          totalItems: total,
          onPageChange: setPage,
        }}
        emptyState={
          <EmptyState
            icon="bx-transfer-alt"
            title={hasFilters ? 'No adjustments match your filters' : 'No adjustments yet'}
            description={
              hasFilters ? 'Try adjusting the status or reason filters' : 'Create an adjustment to correct stock levels'
            }
            actions={
              <Link
                href="/ims/adjustments/new"
                className="h-8 px-3 bg-brand-600 text-white rounded-lg text-[13px] font-medium hover:bg-brand-700 flex items-center"
              >
                New Adjustment
              </Link>
            }
          />
        }
      />

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
