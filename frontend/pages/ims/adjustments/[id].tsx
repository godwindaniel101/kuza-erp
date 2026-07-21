import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { api } from '@/lib/api';
import Toast from '@/components/Toast';
import Modal from '@/components/Modal';
import Button from '@/components/ui/Button';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge, { type StatusBadgeVariant } from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import { Skeleton, TableSkeleton } from '@/components/ui/Skeleton';
import { formatMoney, formatDate, useCurrency } from '@/lib/format';

type AdjustmentReason = 'DAMAGE' | 'THEFT' | 'COUNT' | 'EXPIRY' | 'OTHER';
type AdjustmentStatus = 'DRAFT' | 'APPROVED' | 'REJECTED';

interface AdjustmentItem {
  itemId: string;
  itemName?: string;
  item?: { name?: string };
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

const statusVariant: Record<AdjustmentStatus, { variant: StatusBadgeVariant; label: string }> = {
  DRAFT: { variant: 'pending', label: 'Draft' },
  APPROVED: { variant: 'approved', label: 'Approved' },
  REJECTED: { variant: 'rejected', label: 'Rejected' },
};

export default function AdjustmentDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const currency = useCurrency();
  const [adjustment, setAdjustment] = useState<Adjustment | null>(null);
  const [itemNames, setItemNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [confirmAction, setConfirmAction] = useState<'approve' | 'reject' | null>(null);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    if (!id || typeof id !== 'string') return;
    setLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: Adjustment }>(`/ims/adjustments/${id}`);
      if (res.success) setAdjustment(res.data);
    } catch (err: any) {
      console.error('Failed to load adjustment:', err);
      setNotFound(true);
      setToast({ message: err.response?.data?.message || 'Failed to load adjustment', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Resolve item names in case the API returns only itemIds on lines.
  useEffect(() => {
    const loadNames = async () => {
      try {
        const res = await api.get<{ success: boolean; data: Array<{ id: string; name?: string }> }>('/ims/inventory');
        if (res.success) {
          const map: Record<string, string> = {};
          (res.data || []).forEach((i) => {
            if (i.name) map[i.id] = i.name;
          });
          setItemNames(map);
        }
      } catch (err) {
        console.error('Failed to load item names:', err);
      }
    };
    loadNames();
  }, []);

  const handleConfirm = async () => {
    if (!adjustment || !confirmAction) return;
    setActing(true);
    try {
      await api.post(`/ims/adjustments/${adjustment.id}/${confirmAction}`);
      setToast({
        message: confirmAction === 'approve' ? 'Adjustment approved — stock updated' : 'Adjustment rejected',
        type: 'success',
      });
      setConfirmAction(null);
      await load();
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || `Failed to ${confirmAction} adjustment`, type: 'error' });
    } finally {
      setActing(false);
    }
  };

  const status = adjustment ? statusVariant[adjustment.status] ?? statusVariant.DRAFT : null;
  const itemName = (item: AdjustmentItem) => item.itemName || item.item?.name || itemNames[item.itemId] || item.itemId;

  return (
    <div className="w-full max-w-5xl space-y-5">
      <PageHeader
        title={adjustment ? `Adjustment ${adjustment.adjustmentNumber}` : 'Stock Adjustment'}
        subtitle={adjustment ? REASON_LABELS[adjustment.reason] || adjustment.reason : undefined}
        breadcrumbs={[
          { label: 'IMS', href: '/ims/inventory' },
          { label: 'Adjustments', href: '/ims/adjustments' },
          { label: adjustment?.adjustmentNumber || 'Detail' },
        ]}
        actions={
          adjustment ? (
            <>
              {status && <StatusBadge variant={status.variant} label={status.label} size="lg" />}
              {adjustment.status === 'DRAFT' && (
                <>
                  <Button variant="danger" size="sm" onClick={() => setConfirmAction('approve')}>
                    <i className="bx bx-check"></i>
                    Approve
                  </Button>
                  <button
                    onClick={() => setConfirmAction('reject')}
                    className="h-8 px-3 bg-white dark:bg-gray-800 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg text-[13px] font-medium hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center"
                  >
                    <i className="bx bx-x mr-2"></i>
                    Reject
                  </button>
                </>
              )}
            </>
          ) : undefined
        }
      />

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <TableSkeleton rows={4} columns={4} />
        </div>
      ) : notFound || !adjustment ? (
        <EmptyState
          icon="bx-error-circle"
          title="Adjustment not found"
          description="It may have been removed, or the link is invalid"
          actions={
            <Link
              href="/ims/adjustments"
              className="h-8 px-3 bg-red-600 dark:bg-red-700 text-white rounded-lg text-[13px] font-medium hover:bg-red-700 dark:hover:bg-red-600"
            >
              Back to Adjustments
            </Link>
          }
        />
      ) : (
        <>
          {/* Meta */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 p-5 mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">Created</p>
              <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{formatDate(adjustment.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">Branch</p>
              <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                {adjustment.branchName ? (
                  <span className="inline-flex items-center gap-1">
                    <i className="bx bx-store text-gray-400" aria-hidden="true" /> {adjustment.branchName}
                  </span>
                ) : (
                  <span className="text-gray-400 dark:text-gray-500">All branches</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">Reason</p>
              <p className="mt-1 text-sm text-gray-900 dark:text-white">
                {REASON_LABELS[adjustment.reason] || adjustment.reason}
              </p>
            </div>
            <div className="col-span-2 sm:col-span-4">
              <p className="text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">Notes</p>
              <p className="mt-1 text-sm text-gray-900 dark:text-white">{adjustment.notes || '-'}</p>
            </div>
          </div>

          {/* Items */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">Item</th>
                    <th className="px-6 py-2.5 text-right text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">Qty Change</th>
                    <th className="px-6 py-2.5 text-right text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">Unit Cost</th>
                    <th className="px-6 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">Line Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {(adjustment.items || []).map((item, i) => {
                    const qty = Number(item.quantityChange || 0);
                    return (
                      <tr key={`${item.itemId}-${i}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-6 py-3 whitespace-nowrap text-[13px] font-medium text-gray-900 dark:text-white">
                          {itemName(item)}
                        </td>
                        <td
                          className={`px-6 py-3 whitespace-nowrap text-[13px] text-right font-medium ${
                            qty > 0
                              ? 'text-green-600 dark:text-green-400'
                              : qty < 0
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {qty > 0 ? `+${qty}` : qty}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-[13px] text-right text-gray-700 dark:text-gray-300">
                          {item.unitCost != null ? formatMoney(item.unitCost, currency) : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{item.reason || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Confirm modal */}
      <Modal
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        title={confirmAction === 'approve' ? 'Approve Adjustment' : 'Reject Adjustment'}
        maxWidth="md"
      >
        <div className="space-y-4">
          {confirmAction === 'approve' ? (
            <>
              <p className="text-gray-600 dark:text-gray-400">Approve this adjustment?</p>
              <div className="px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <i className="bx bx-error mt-0.5" aria-hidden="true"></i>
                <span>
                  Approving will immediately change stock levels for all items in this adjustment. This cannot be
                  undone.
                </span>
              </div>
            </>
          ) : (
            <p className="text-gray-600 dark:text-gray-400">
              Reject this adjustment? Stock levels will not be changed.
            </p>
          )}
          <div className="flex justify-end space-x-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setConfirmAction(null)} disabled={acting}>
              Cancel
            </Button>
            <Button type="button" variant="danger" onClick={handleConfirm} disabled={acting}>
              {acting ? 'Working...' : confirmAction === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </div>
        </div>
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
