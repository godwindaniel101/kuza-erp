import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { api } from '@/lib/api';
import Toast from '@/components/Toast';
import SearchableSelect from '@/components/SearchableSelect';
import PageHeader from '@/components/ui/PageHeader';
import FormField from '@/components/ui/FormField';
import Button from '@/components/ui/Button';
import { formatMoney, todayIso, useCurrency } from '@/lib/format';

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
  isActive: boolean;
}

interface EntryLineDraft {
  key: number;
  accountId: string;
  debit: string;
  credit: string;
  description: string;
}

let lineKey = 0;
const newLine = (): EntryLineDraft => ({ key: ++lineKey, accountId: '', debit: '', credit: '', description: '' });

export default function NewJournalEntryPage() {
  const router = useRouter();
  const currency = useCurrency();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [date, setDate] = useState(todayIso());
  const [memo, setMemo] = useState('');
  const [lines, setLines] = useState<EntryLineDraft[]>([newLine(), newLine()]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const res = await api.get<{ success: boolean; data: Account[] }>('/accounting/accounts');
        if (res.success) setAccounts((res.data || []).filter((a) => a.isActive));
      } catch (err: any) {
        console.error('Failed to load accounts:', err);
        setToast({ message: err.response?.data?.message || 'Failed to load accounts', type: 'error' });
      }
    };
    loadAccounts();
  }, []);

  const accountOptions = accounts
    .slice()
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((a) => ({ value: a.id, label: `${a.code} — ${a.name}` }));

  const updateLine = (key: number, patch: Partial<EntryLineDraft>) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  };

  // Entering a debit zeroes the credit on the same line (and vice versa).
  const setDebit = (key: number, value: string) => {
    if (value && Number(value) !== 0) {
      updateLine(key, { debit: value, credit: '' });
    } else {
      updateLine(key, { debit: value });
    }
  };

  const setCredit = (key: number, value: string) => {
    if (value && Number(value) !== 0) {
      updateLine(key, { credit: value, debit: '' });
    } else {
      updateLine(key, { credit: value });
    }
  };

  const removeLine = (key: number) => {
    setLines((prev) => (prev.length > 2 ? prev.filter((l) => l.key !== key) : prev));
  };

  const totalDebit = lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
  const balanced = totalDebit > 0 && Math.abs(totalDebit - totalCredit) < 0.005;
  const allLinesValid = lines.every(
    (l) => l.accountId && ((Number(l.debit) || 0) > 0 || (Number(l.credit) || 0) > 0),
  );
  const canSave = balanced && allLinesValid && !!date && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const res = await api.post<{ success: boolean; data: { id: string } }>('/accounting/journal-entries', {
        date,
        memo: memo.trim(),
        lines: lines.map((l) => ({
          accountId: l.accountId,
          debit: Number(l.debit) || 0,
          credit: Number(l.credit) || 0,
          description: l.description.trim() || undefined,
        })),
      });
      if (res.success && res.data?.id) {
        router.push(`/accounting/journal-entries/${res.data.id}`);
      } else {
        router.push('/accounting/journal-entries');
      }
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || 'Failed to save journal entry', type: 'error' });
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <PageHeader
        title="New Journal Entry"
        subtitle="Debits must equal credits before you can save"
        breadcrumbs={[
          { label: 'Accounting', href: '/accounting' },
          { label: 'Journal Entries', href: '/accounting/journal-entries' },
          { label: 'New' },
        ]}
      />

      {/* Header fields */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 p-5 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <FormField label="Date" name="entry-date" type="date" required value={date} onChange={setDate} />
        <FormField
          label="Memo"
          name="entry-memo"
          value={memo}
          onChange={setMemo}
          placeholder="What is this entry for?"
          className="sm:col-span-2"
        />
      </div>

      {/* Line editor */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 overflow-visible">
        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 grid grid-cols-12 gap-3 text-2xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase">
          <div className="col-span-4">Account</div>
          <div className="col-span-3">Description</div>
          <div className="col-span-2 text-right">Debit</div>
          <div className="col-span-2 text-right">Credit</div>
          <div className="col-span-1"></div>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {lines.map((line) => (
            <div key={line.key} className="px-6 py-3 grid grid-cols-12 gap-3 items-center">
              <div className="col-span-4">
                <SearchableSelect
                  options={accountOptions}
                  value={line.accountId}
                  onChange={(v) => updateLine(line.key, { accountId: v })}
                  placeholder="Select account..."
                  focusColor="red"
                  size="sm"
                />
              </div>
              <div className="col-span-3">
                <input
                  type="text"
                  value={line.description}
                  onChange={(e) => updateLine(line.key, { description: e.target.value })}
                  placeholder="Line description"
                  className="h-9 w-full px-3 text-[13px] border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500"
                />
              </div>
              <div className="col-span-2">
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={line.debit}
                  onChange={(e) => setDebit(line.key, e.target.value)}
                  placeholder="0.00"
                  aria-label="Debit"
                  className="h-9 w-full px-3 text-[13px] text-right border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500"
                />
              </div>
              <div className="col-span-2">
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={line.credit}
                  onChange={(e) => setCredit(line.key, e.target.value)}
                  placeholder="0.00"
                  aria-label="Credit"
                  className="h-9 w-full px-3 text-[13px] text-right border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500"
                />
              </div>
              <div className="col-span-1 text-right">
                <button
                  type="button"
                  onClick={() => removeLine(line.key)}
                  disabled={lines.length <= 2}
                  title="Remove line"
                  className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <i className="bx bx-trash" aria-hidden="true"></i>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer: add line + totals */}
        <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between flex-wrap gap-3">
          <Button variant="ghost" size="sm" type="button" onClick={() => setLines((prev) => [...prev, newLine()])}>
            <i className="bx bx-plus"></i>
            Add line
          </Button>
          <div
            className={`flex items-center gap-6 text-sm font-semibold px-4 py-2 rounded-lg ${
              balanced
                ? 'text-gray-900 dark:text-white'
                : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
            }`}
          >
            <span>
              Σ Debit: <span className="font-mono">{formatMoney(totalDebit, currency)}</span>
            </span>
            <span>
              Σ Credit: <span className="font-mono">{formatMoney(totalCredit, currency)}</span>
            </span>
            {balanced ? (
              <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                <i className="bx bx-check-circle" aria-hidden="true"></i>
                Balanced
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <i className="bx bx-error-circle" aria-hidden="true"></i>
                Out of balance by {formatMoney(Math.abs(totalDebit - totalCredit), currency)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" type="button" onClick={() => router.push('/accounting/journal-entries')}>
          Cancel
        </Button>
        <Button type="button" onClick={handleSave} disabled={!canSave}>
          {saving ? 'Saving...' : 'Save Entry'}
        </Button>
      </div>

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
