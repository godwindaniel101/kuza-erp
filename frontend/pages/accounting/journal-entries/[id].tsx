import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { api } from '@/lib/api';
import Toast from '@/components/Toast';
import Modal from '@/components/Modal';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge, { type StatusBadgeVariant } from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import { Skeleton, TableSkeleton } from '@/components/ui/Skeleton';
import { formatMoney, formatDate, useCurrency } from '@/lib/format';

interface JournalEntryLine {
  id: string;
  accountId: string;
  account?: { code: string; name: string };
  debit: number;
  credit: number;
  description?: string;
}

interface JournalEntry {
  id: string;
  entryNumber: string;
  date: string;
  memo?: string;
  status: 'DRAFT' | 'POSTED' | 'REVERSED';
  sourceType?: string;
  sourceId?: string;
  lines: JournalEntryLine[];
}

const entryStatusVariant: Record<JournalEntry['status'], { variant: StatusBadgeVariant; label: string }> = {
  DRAFT: { variant: 'pending', label: 'Draft' },
  POSTED: { variant: 'success', label: 'Posted' },
  REVERSED: { variant: 'error', label: 'Reversed' },
};

export default function JournalEntryDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const currency = useCurrency();
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [confirmAction, setConfirmAction] = useState<'post' | 'reverse' | null>(null);
  const [acting, setActing] = useState(false);

  const loadEntry = useCallback(async () => {
    if (!id || typeof id !== 'string') return;
    setLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: JournalEntry }>(`/accounting/journal-entries/${id}`);
      if (res.success) setEntry(res.data);
    } catch (err: any) {
      console.error('Failed to load journal entry:', err);
      setNotFound(true);
      setToast({ message: err.response?.data?.message || 'Failed to load journal entry', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadEntry();
  }, [loadEntry]);

  const handleConfirm = async () => {
    if (!entry || !confirmAction) return;
    setActing(true);
    try {
      await api.post(`/accounting/journal-entries/${entry.id}/${confirmAction}`);
      setToast({
        message: confirmAction === 'post' ? 'Entry posted' : 'Entry reversed',
        type: 'success',
      });
      setConfirmAction(null);
      await loadEntry();
    } catch (err: any) {
      setToast({
        message: err.response?.data?.message || `Failed to ${confirmAction} entry`,
        type: 'error',
      });
    } finally {
      setActing(false);
    }
  };

  const totalDebit = (entry?.lines || []).reduce((sum, l) => sum + Number(l.debit || 0), 0);
  const totalCredit = (entry?.lines || []).reduce((sum, l) => sum + Number(l.credit || 0), 0);
  const status = entry ? entryStatusVariant[entry.status] ?? entryStatusVariant.DRAFT : null;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <PageHeader
        title={entry ? `Entry ${entry.entryNumber}` : 'Journal Entry'}
        subtitle={entry?.memo || undefined}
        breadcrumbs={[
          { label: 'Accounting', href: '/accounting' },
          { label: 'Journal Entries', href: '/accounting/journal-entries' },
          { label: entry?.entryNumber || 'Detail' },
        ]}
        actions={
          entry ? (
            <>
              {status && <StatusBadge variant={status.variant} label={status.label} size="lg" />}
              {entry.status === 'DRAFT' && (
                <button
                  onClick={() => setConfirmAction('post')}
                  className="h-8 px-3 bg-brand-600 text-white rounded-lg text-[13px] font-medium hover:bg-brand-700 flex items-center"
                >
                  <i className="bx bx-check mr-2"></i>
                  Post
                </button>
              )}
              {entry.status === 'POSTED' && (
                <button
                  onClick={() => setConfirmAction('reverse')}
                  className="h-8 px-3 bg-white dark:bg-gray-800 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg text-[13px] font-medium hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center"
                >
                  <i className="bx bx-undo mr-2"></i>
                  Reverse
                </button>
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
      ) : notFound || !entry ? (
        <EmptyState
          icon="bx-error-circle"
          title="Journal entry not found"
          description="It may have been removed, or the link is invalid"
          actions={
            <button
              onClick={() => router.push('/accounting/journal-entries')}
              className="h-8 px-3 bg-red-600 dark:bg-red-700 text-white rounded-lg text-[13px] font-medium hover:bg-red-700 dark:hover:bg-red-600"
            >
              Back to Journal Entries
            </button>
          }
        />
      ) : (
        <>
          {/* Meta */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 p-5 mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-2xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase">Date</p>
              <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{formatDate(entry.date)}</p>
            </div>
            <div>
              <p className="text-2xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase">Memo</p>
              <p className="mt-1 text-sm text-gray-900 dark:text-white">{entry.memo || '-'}</p>
            </div>
            <div>
              <p className="text-2xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase">Source</p>
              <p className="mt-1 text-sm text-gray-900 dark:text-white">
                {entry.sourceType ? `${entry.sourceType}${entry.sourceId ? ` (${entry.sourceId})` : ''}` : 'Manual'}
              </p>
            </div>
            <div>
              <p className="text-2xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase">Amount</p>
              <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{formatMoney(totalDebit, currency)}</p>
            </div>
          </div>

          {/* Lines */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-2.5 text-left text-2xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase">Account</th>
                    <th className="px-6 py-2.5 text-left text-2xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase">Description</th>
                    <th className="px-6 py-2.5 text-right text-2xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase">Debit</th>
                    <th className="px-6 py-2.5 text-right text-2xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase">Credit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {entry.lines.map((line) => (
                    <tr key={line.id}>
                      <td className="px-6 py-3 whitespace-nowrap text-[13px]">
                        <span className="font-mono text-gray-500 dark:text-gray-400 mr-2">{line.account?.code}</span>
                        <span className="font-medium text-gray-900 dark:text-white">{line.account?.name}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{line.description || '-'}</td>
                      <td className="px-6 py-3 whitespace-nowrap text-[13px] text-right text-gray-700 dark:text-gray-300">
                        {Number(line.debit) > 0 ? formatMoney(line.debit, currency) : '-'}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-[13px] text-right text-gray-700 dark:text-gray-300">
                        {Number(line.credit) > 0 ? formatMoney(line.credit, currency) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <td colSpan={2} className="px-6 py-3 text-sm font-semibold text-gray-900 dark:text-white">
                      Totals
                    </td>
                    <td className="px-6 py-3 text-sm font-semibold text-right text-gray-900 dark:text-white">
                      {formatMoney(totalDebit, currency)}
                    </td>
                    <td className="px-6 py-3 text-sm font-semibold text-right text-gray-900 dark:text-white">
                      {formatMoney(totalCredit, currency)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Confirm modal */}
      <Modal
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        title={confirmAction === 'post' ? 'Post Entry' : 'Reverse Entry'}
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            {confirmAction === 'post'
              ? 'Posting makes this entry final and updates account balances. Continue?'
              : 'Reversing creates an offsetting entry and marks this one as reversed. This cannot be undone. Continue?'}
          </p>
          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={() => setConfirmAction(null)}
              disabled={acting}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={acting}
              className="px-4 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            >
              {acting ? 'Working...' : confirmAction === 'post' ? 'Post Entry' : 'Reverse Entry'}
            </button>
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
