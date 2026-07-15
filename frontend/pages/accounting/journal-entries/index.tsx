import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { api } from '@/lib/api';
import Toast from '@/components/Toast';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import FilterBar, { type FilterValues } from '@/components/ui/FilterBar';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable';
import StatusBadge, { type StatusBadgeVariant } from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import { formatMoney, formatDate, downloadCsv, useCurrency } from '@/lib/format';

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

const PAGE_SIZE = 20;

const entryStatusVariant: Record<JournalEntry['status'], { variant: StatusBadgeVariant; label: string }> = {
  DRAFT: { variant: 'pending', label: 'Draft' },
  POSTED: { variant: 'success', label: 'Posted' },
  REVERSED: { variant: 'error', label: 'Reversed' },
};

export default function JournalEntriesPage() {
  const router = useRouter();
  const currency = useCurrency();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [filters, setFilters] = useState<FilterValues>({ status: '' });
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const status = (filters.status as string) || '';

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (status) params.set('status', status);
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);
      const res = await api.get<{ success: boolean; data: { items: JournalEntry[]; total: number } }>(
        `/accounting/journal-entries?${params.toString()}`,
      );
      if (res.success) {
        setEntries(res.data.items || []);
        setTotal(res.data.total || 0);
      }
    } catch (err: any) {
      console.error('Failed to load journal entries:', err);
      setToast({ message: err.response?.data?.message || 'Failed to load journal entries', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page, status, fromDate, toDate]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  useEffect(() => {
    setPage(1);
  }, [status, fromDate, toDate]);

  const entryTotal = (entry: JournalEntry) =>
    (entry.lines || []).reduce((sum, l) => sum + Number(l.debit || 0), 0);

  const columns: DataTableColumn<JournalEntry>[] = [
    {
      key: 'entryNumber',
      label: 'Entry #',
      render: (e) => <span className="font-medium text-gray-900 dark:text-white">{e.entryNumber}</span>,
    },
    { key: 'date', label: 'Date', render: (e) => formatDate(e.date) },
    {
      key: 'memo',
      label: 'Memo',
      render: (e) => <span className="block max-w-xs truncate">{e.memo || '-'}</span>,
    },
    { key: 'lines', label: 'Lines', align: 'center', render: (e) => (e.lines || []).length },
    {
      key: 'amount',
      label: 'Amount',
      align: 'right',
      render: (e) => formatMoney(entryTotal(e), currency),
    },
    {
      key: 'status',
      label: 'Status',
      render: (e) => {
        const s = entryStatusVariant[e.status] ?? entryStatusVariant.DRAFT;
        return <StatusBadge variant={s.variant} label={s.label} size="sm" />;
      },
    },
  ];

  const handleExport = () => {
    if (entries.length === 0) return;
    downloadCsv(
      `journal-entries-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Entry #', 'Date', 'Memo', 'Lines', 'Amount', 'Status'],
      entries.map((e) => [
        e.entryNumber,
        formatDate(e.date),
        e.memo || '',
        (e.lines || []).length,
        entryTotal(e).toFixed(2),
        entryStatusVariant[e.status]?.label ?? e.status,
      ]),
    );
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const startIndex = (page - 1) * PAGE_SIZE;
  const hasFilters = !!status || !!fromDate || !!toDate;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Journal Entries"
        count={loading ? undefined : total}
        subtitle="Record and review double-entry transactions"
        breadcrumbs={[{ label: 'Accounting', href: '/accounting' }, { label: 'Journal Entries' }]}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={handleExport} disabled={loading || entries.length === 0}>
              <i className="bx bx-download"></i>
              Export CSV
            </Button>
            <Button href="/accounting/journal-entries/new" size="sm">
              <i className="bx bx-plus"></i>
              New Entry
            </Button>
          </>
        }
      />

      <FilterBar
        filters={[
          {
            key: 'status',
            type: 'select',
            placeholder: 'All statuses',
            className: 'w-full sm:w-56',
            options: [
              { value: '', label: 'All statuses' },
              { value: 'DRAFT', label: 'Draft' },
              { value: 'POSTED', label: 'Posted' },
              { value: 'REVERSED', label: 'Reversed' },
            ],
          },
        ]}
        values={filters}
        onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
        onClear={() => {
          setFilters({ status: '' });
          setFromDate('');
          setToDate('');
        }}
        actions={
          <div className="flex items-center gap-2">
            <label className="text-[13px] text-gray-500 dark:text-gray-400">From</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-9 px-3 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500"
            />
            <label className="text-[13px] text-gray-500 dark:text-gray-400">To</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-9 px-3 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500"
            />
          </div>
        }
      />

      <DataTable<JournalEntry>
        columns={columns}
        data={entries}
        loading={loading}
        onRowClick={(entry) => router.push(`/accounting/journal-entries/${entry.id}`)}
        pagination={{
          page,
          totalPages,
          startIndex,
          endIndex: Math.min(startIndex + entries.length, total),
          totalItems: total,
          onPageChange: setPage,
        }}
        emptyState={
          <EmptyState
            icon="bx-book"
            title={hasFilters ? 'No entries match your filters' : 'No journal entries yet'}
            description={
              hasFilters
                ? 'Try adjusting the status or date range'
                : 'Create your first journal entry to start recording transactions'
            }
            actions={
              <Button href="/accounting/journal-entries/new" size="sm">
                New Entry
              </Button>
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
