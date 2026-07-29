import { useEffect, useState, useCallback } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import { heroActionPrimary } from '@/components/ui/DashboardHero';
import Button from '@/components/ui/Button';
import Toast from '@/components/Toast';
import Modal from '@/components/Modal';
import SearchableSelect from '@/components/SearchableSelect';

interface Account {
  id: string;
  accountNumber: string;
  accountName?: string;
  bankName?: string;
}
interface Method {
  id: string;
  branchId: string;
  type: string;
  label: string;
  status: string;
  accounts: Account[];
}

const TYPE_META: Record<string, { label: string; icon: string; available: boolean; blurb: string }> = {
  bank_transfer: { label: 'Bank Transfer', icon: 'bx-transfer', available: true, blurb: 'Virtual account per branch' },
  card: { label: 'Card', icon: 'bx-credit-card', available: false, blurb: 'Debit / credit cards' },
  ussd: { label: 'USSD', icon: 'bx-hash', available: false, blurb: 'Pay via bank USSD code' },
  mobile_money: { label: 'Mobile Money', icon: 'bx-mobile-alt', available: false, blurb: 'Wallet transfers' },
  cash: { label: 'Cash', icon: 'bx-money', available: true, blurb: 'Record cash at the till' },
};

export default function PaymentsPage() {
  const { t } = useTranslation('common');
  const [branches, setBranches] = useState<any[]>([]);
  const [methods, setMethods] = useState<Method[]>([]);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ branchId: '', type: 'bank_transfer' });
  const [archiveTarget, setArchiveTarget] = useState<Method | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const branchName = useCallback(
    (id: string) => branches.find((b) => b.id === id)?.name || '—',
    [branches],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [branchesRes, methodsRes, statusRes] = await Promise.all([
        api.get<{ success: boolean; data: any[] }>('/settings/branches'),
        api.get<{ success: boolean; data: Method[] }>('/payments/methods'),
        api.get<{ success: boolean; data: { configured: boolean } }>('/payments/status'),
      ]);
      if (branchesRes.success) setBranches(branchesRes.data);
      if (methodsRes.success) setMethods(methodsRes.data);
      if (statusRes.success) setConfigured(statusRes.data.configured);
    } catch {
      setToast({ message: 'Failed to load payments', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = () => {
    setForm({ branchId: branches.find((b) => b.isDefault)?.id || branches[0]?.id || '', type: 'bank_transfer' });
    setModalOpen(true);
  };

  const submit = async () => {
    if (!form.branchId) {
      setToast({ message: 'Select a branch', type: 'error' });
      return;
    }
    setSaving(true);
    try {
      await api.post('/payments/methods', { branchId: form.branchId, type: form.type });
      setToast({ message: 'Payment option added', type: 'success' });
      setModalOpen(false);
      load();
    } catch (e: any) {
      setToast({ message: e?.response?.data?.message || 'Failed to add payment option', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const confirmArchive = async () => {
    if (!archiveTarget) return;
    setArchiving(true);
    try {
      await api.delete(`/payments/methods/${archiveTarget.id}`);
      setToast({ message: 'Payment option archived', type: 'success' });
      setArchiveTarget(null);
      load();
    } catch (e: any) {
      setToast({ message: e?.response?.data?.message || 'Failed to archive', type: 'error' });
    } finally {
      setArchiving(false);
    }
  };

  const copy = (text: string) => {
    navigator.clipboard?.writeText(text);
    setToast({ message: `Copied ${text}`, type: 'success' });
  };

  return (
    <PermissionGuard permission="payments.view">
      <div className="space-y-5">
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

        <div className="flex flex-wrap items-center justify-end gap-2">
          <button type="button" onClick={openAdd} className={heroActionPrimary}>
            <i className="bx bx-plus" aria-hidden="true"></i>
            <span>Add payment option</span>
          </button>
        </div>

        {!configured && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
            <i className="bx bx-error-circle mt-0.5 text-lg"></i>
            <p>
              Monnify isn't configured yet. Set <code className="font-mono">MONNIFY_API_KEY</code>,{' '}
              <code className="font-mono">MONNIFY_SECRET_KEY</code> and{' '}
              <code className="font-mono">MONNIFY_CONTRACT_CODE</code> on the server to generate live virtual accounts.
            </p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-brand-600"></div>
          </div>
        ) : methods.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 py-16 text-center dark:border-gray-700">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-500/10">
              <i className="bx bx-credit-card text-3xl text-brand-600 dark:text-brand-400"></i>
            </div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">No payment options yet</h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
              Add a payment option to a branch — e.g. Bank Transfer generates a virtual account cashiers can collect into.
            </p>
            <div className="mt-4">
              <Button variant="primary" onClick={openAdd}>
                <i className="bx bx-plus" aria-hidden="true"></i>
                <span>Add payment option</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            {methods.map((m) => {
              const meta = TYPE_META[m.type] || { label: m.type, icon: 'bx-wallet' };
              return (
                <div
                  key={m.id}
                  className="rounded-2xl border border-gray-200 bg-white p-5 shadow-card ring-1 ring-gray-950/[0.04] dark:border-gray-800 dark:bg-gray-900 dark:ring-gray-800"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gradient text-white">
                        <i className={`bx ${meta.icon} text-xl`}></i>
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{m.label}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{branchName(m.branchId)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setArchiveTarget(m)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                      title="Archive"
                    >
                      <i className="bx bx-archive"></i>
                    </button>
                  </div>

                  {/* Virtual accounts — the "card" style that makes this feel like payments */}
                  {m.accounts.length > 0 ? (
                    <div className="mt-4 space-y-2">
                      {m.accounts.map((a) => (
                        <div
                          key={a.id}
                          className="flex items-center justify-between rounded-xl bg-gradient-to-br from-gray-900 to-gray-700 px-4 py-3 text-white dark:from-gray-800 dark:to-gray-900"
                        >
                          <div className="min-w-0">
                            <p className="text-[11px] uppercase tracking-wide text-white/60">{a.bankName || 'Bank'}</p>
                            <p className="font-mono text-lg font-semibold tabular-nums">{a.accountNumber}</p>
                            <p className="truncate text-xs text-white/70">{a.accountName}</p>
                          </div>
                          <button
                            onClick={() => copy(a.accountNumber)}
                            className="ml-2 shrink-0 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-white/20"
                          >
                            <i className="bx bx-copy"></i> Copy
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-4 text-xs text-gray-400">
                      {meta.available ? 'No virtual account generated.' : 'Flow coming soon.'}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {modalOpen && (
          <Modal
            isOpen
            onClose={() => setModalOpen(false)}
            title="Add payment option"
            maxWidth="md"
            footer={
              <>
                <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={submit} disabled={saving}>
                  {saving ? 'Adding…' : 'Add'}
                </Button>
              </>
            }
          >
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-gray-700 dark:text-gray-300">
                  Branch <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  options={branches.map((b) => ({ value: b.id, label: b.name }))}
                  value={form.branchId}
                  onChange={(v) => setForm({ ...form, branchId: v })}
                  placeholder="Select branch…"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-gray-700 dark:text-gray-300">
                  Payment method
                </label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {Object.entries(TYPE_META).map(([key, meta]) => {
                    const selected = form.type === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        disabled={!meta.available}
                        onClick={() => setForm({ ...form, type: key })}
                        className={`relative flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                          selected
                            ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500 dark:bg-brand-500/10'
                            : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                        } ${!meta.available ? 'cursor-not-allowed opacity-60' : ''}`}
                      >
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg ${
                            selected ? 'bg-brand-gradient text-white' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                          }`}
                        >
                          <i className={`bx ${meta.icon}`}></i>
                        </span>
                        <span className="min-w-0">
                          <span className="flex items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-gray-100">
                            {meta.label}
                            {!meta.available && (
                              <span className="rounded-full bg-gray-100 px-1.5 text-[10px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                                soon
                              </span>
                            )}
                          </span>
                          <span className="block truncate text-xs text-gray-500 dark:text-gray-400">{meta.blurb}</span>
                        </span>
                        {selected && (
                          <i className="bx bx-check-circle absolute right-2 top-2 text-brand-600 dark:text-brand-400"></i>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
              {form.type === 'bank_transfer' && (
                <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500 dark:bg-gray-800/60 dark:text-gray-400">
                  A virtual account will be generated for this branch. Transfers into it are matched to sales automatically.
                </p>
              )}
            </div>
          </Modal>
        )}

        {archiveTarget && (
          <Modal
            isOpen
            onClose={() => setArchiveTarget(null)}
            title="Archive payment option"
            maxWidth="sm"
            footer={
              <>
                <Button variant="secondary" onClick={() => setArchiveTarget(null)} disabled={archiving}>
                  Cancel
                </Button>
                <Button variant="danger" onClick={confirmArchive} disabled={archiving}>
                  {archiving ? 'Archiving…' : 'Archive'}
                </Button>
              </>
            }
          >
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Archive <span className="font-semibold">{archiveTarget.label}</span> for{' '}
              <span className="font-semibold">{branchName(archiveTarget.branchId)}</span>? It stops
              being offered at the POS, but its virtual account and past transactions are kept for
              your records. You can add it again later.
            </p>
          </Modal>
        )}
      </div>
    </PermissionGuard>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale || 'en', ['common'])),
    },
  };
};
