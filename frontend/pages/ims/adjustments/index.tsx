import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
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
  branchName?: string | null;
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
  const { t } = useTranslation('common');
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
      setToast({ message: err.response?.data?.message || t('adjustments.failedLoad', 'Failed to load adjustments'), type: 'error' });
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
      label: t('adjustments.number', 'Adjustment #'),
      render: (a) => <span className="font-medium text-gray-900 dark:text-white">{a.adjustmentNumber}</span>,
    },
    { key: 'createdAt', label: t('adjustments.date', 'Date'), render: (a) => formatDate(a.createdAt) },
    {
      key: 'branch',
      label: t('adjustments.branch', 'Branch'),
      render: (a) =>
        a.branchName ? (
          <span className="inline-flex items-center gap-1 text-gray-700 dark:text-gray-300">
            <i className="bx bx-store text-gray-400" aria-hidden="true" />
            {a.branchName}
          </span>
        ) : (
          <span className="text-gray-400 dark:text-gray-500">{t('adjustments.allBranches', 'All branches')}</span>
        ),
    },
    {
      key: 'reason',
      label: t('adjustments.reason', 'Reason'),
      render: (a) => (
        <span className="inline-flex items-center gap-1.5">
          <i className={`bx ${REASON_ICONS[a.reason] || 'bx-dots-horizontal-rounded'} text-gray-400 dark:text-gray-500`} aria-hidden="true"></i>
          {REASON_LABELS[a.reason] || a.reason}
        </span>
      ),
    },
    { key: 'items', label: t('adjustments.items', 'Items'), align: 'right', cellClassName: 'tabular-nums', render: (a) => (a.items || []).length },
    {
      key: 'netChange',
      label: t('adjustments.netQtyChange', 'Net Qty Change'),
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
      label: t('adjustments.status', 'Status'),
      render: (a) => {
        const s = adjustmentStatusVariant[a.status] ?? adjustmentStatusVariant.DRAFT;
        return <StatusBadge variant={s.variant} label={s.label} size="sm" />;
      },
    },
  ];

  const handleExportCsv = () => {
    const headers = [
      t('adjustments.number', 'Adjustment #'),
      t('adjustments.date', 'Date'),
      t('adjustments.reason', 'Reason'),
      t('adjustments.items', 'Items'),
      t('adjustments.netQtyChange', 'Net Qty Change'),
      t('adjustments.status', 'Status'),
    ];
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
        title={t('adjustments.title', 'Stock Adjustments')}
        count={loading ? undefined : total}
        subtitle={t('adjustments.subtitle', 'Correct stock levels for damage, theft, counts and more')}
        breadcrumbs={[{ label: t('adjustments.ims', 'IMS'), href: '/ims/inventory' }, { label: t('adjustments.breadcrumb', 'Adjustments') }]}
        actions={
          <>
            {!loading && adjustments.length > 0 && (
              <Button size="sm" variant="secondary" onClick={handleExportCsv}>
                <i className="bx bx-download"></i>
                {t('adjustments.exportCsv', 'Export CSV')}
              </Button>
            )}
            <Link
              href="/ims/adjustments/new"
              className="h-8 px-3 bg-brand-600 text-white rounded-lg text-[13px] font-medium hover:bg-brand-700 flex items-center"
            >
              <i className="bx bx-plus mr-2"></i>
              {t('adjustments.new', 'New Adjustment')}
            </Link>
          </>
        }
      />

      <FilterBar
        filters={[
          {
            key: 'status',
            type: 'select',
            placeholder: t('adjustments.allStatuses', 'All statuses'),
            className: 'w-full sm:w-52',
            options: [
              { value: '', label: t('adjustments.allStatuses', 'All statuses') },
              { value: 'DRAFT', label: t('adjustments.statusDraft', 'Draft') },
              { value: 'APPROVED', label: t('adjustments.statusApproved', 'Approved') },
              { value: 'REJECTED', label: t('adjustments.statusRejected', 'Rejected') },
            ],
          },
          {
            key: 'reason',
            type: 'select',
            placeholder: t('adjustments.allReasons', 'All reasons'),
            className: 'w-full sm:w-52',
            options: [
              { value: '', label: t('adjustments.allReasons', 'All reasons') },
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
            title={hasFilters ? t('adjustments.noMatch', 'No adjustments match your filters') : t('adjustments.noneYet', 'No adjustments yet')}
            description={
              hasFilters ? t('adjustments.tryAdjustingFilters', 'Try adjusting the status or reason filters') : t('adjustments.createToCorrect', 'Create an adjustment to correct stock levels')
            }
            actions={
              <Link
                href="/ims/adjustments/new"
                className="h-8 px-3 bg-brand-600 text-white rounded-lg text-[13px] font-medium hover:bg-brand-700 flex items-center"
              >
                {t('adjustments.new', 'New Adjustment')}
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
