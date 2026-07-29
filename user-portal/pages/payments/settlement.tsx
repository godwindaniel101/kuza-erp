import { useEffect, useState, useCallback } from 'react';
import { GetServerSideProps } from 'next';
import Link from 'next/link';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Toast from '@/components/Toast';
import Modal from '@/components/Modal';

interface Settlement {
  bankName?: string;
  bankCode?: string;
  accountNumber?: string;
  accountName?: string;
}

const fieldCls =
  'h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-transparent focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100';

export default function SettlementPage() {
  const { t } = useTranslation('common');
  const [settlement, setSettlement] = useState<Settlement | null>(null);
  const [twoFaEnabled, setTwoFaEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({ bankName: '', bankCode: '', accountNumber: '', accountName: '', code: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, faRes] = await Promise.all([
        api.get<{ success: boolean; data: Settlement | null }>('/payments/settlement'),
        api.get<{ success: boolean; data: { enabled: boolean } }>('/payments/2fa/status'),
      ]);
      if (sRes.success) setSettlement(sRes.data);
      if (faRes.success) setTwoFaEnabled(faRes.data.enabled);
    } catch {
      setToast({ message: 'Failed to load', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openEdit = () => {
    setForm({
      bankName: settlement?.bankName || '',
      bankCode: settlement?.bankCode || '',
      accountNumber: settlement?.accountNumber || '',
      accountName: settlement?.accountName || '',
      code: '',
    });
    setEditOpen(true);
  };

  const save = async () => {
    if (form.code.trim().length !== 6) {
      setToast({ message: 'Enter your 6-digit authenticator code', type: 'error' });
      return;
    }
    setSaving(true);
    try {
      await api.put('/payments/settlement', form);
      setToast({ message: 'Settlement account updated', type: 'success' });
      setEditOpen(false);
      load();
    } catch (e: any) {
      setToast({ message: e?.response?.data?.message || 'Could not update', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <PermissionGuard permission="payments.view">
      <div className="max-w-2xl space-y-5">
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        <PageHeader title="Settlement account" subtitle="Collected payments are settled to this bank account" />

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-brand-600"></div>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-card ring-1 ring-gray-950/[0.04] dark:border-gray-800 dark:bg-gray-900 dark:ring-gray-800">
            {!twoFaEnabled && (
              <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                <i className="bx bx-shield-quarter mt-0.5 text-lg"></i>
                <p>
                  Changing the settlement account needs two-factor authentication.{' '}
                  <Link href="/payments/security" className="font-semibold underline">
                    Enable 2FA
                  </Link>{' '}
                  first.
                </p>
              </div>
            )}

            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Bank account</h3>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Where inflows are paid out.</p>
              </div>
              <Button variant="secondary" onClick={openEdit} disabled={!twoFaEnabled}>
                <i className="bx bx-edit" aria-hidden="true"></i>
                <span>{settlement?.accountNumber ? 'Update' : 'Set account'}</span>
              </Button>
            </div>

            {settlement?.accountNumber ? (
              <div className="mt-4 rounded-xl bg-gradient-to-br from-gray-900 to-gray-700 px-4 py-4 text-white dark:from-gray-800 dark:to-gray-900">
                <p className="text-[11px] uppercase tracking-wide text-white/60">{settlement.bankName || 'Bank'}</p>
                <p className="font-mono text-xl font-semibold tabular-nums">{settlement.accountNumber}</p>
                <p className="text-xs text-white/70">{settlement.accountName}</p>
              </div>
            ) : (
              <p className="mt-4 text-sm text-gray-400">No settlement account set yet.</p>
            )}
          </div>
        )}

        {editOpen && (
          <Modal
            isOpen
            onClose={() => setEditOpen(false)}
            title="Settlement account"
            maxWidth="md"
            footer={
              <>
                <Button variant="secondary" onClick={() => setEditOpen(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={save} disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </Button>
              </>
            }
          >
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[13px] font-medium text-gray-700 dark:text-gray-300">Bank name</label>
                  <input value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} className={fieldCls} />
                </div>
                <div>
                  <label className="mb-1 block text-[13px] font-medium text-gray-700 dark:text-gray-300">Bank code</label>
                  <input value={form.bankCode} onChange={(e) => setForm({ ...form, bankCode: e.target.value })} className={fieldCls} />
                </div>
                <div>
                  <label className="mb-1 block text-[13px] font-medium text-gray-700 dark:text-gray-300">Account number</label>
                  <input value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} className={fieldCls} />
                </div>
                <div>
                  <label className="mb-1 block text-[13px] font-medium text-gray-700 dark:text-gray-300">Account name</label>
                  <input value={form.accountName} onChange={(e) => setForm({ ...form, accountName: e.target.value })} className={fieldCls} />
                </div>
              </div>
              <div className="border-t border-gray-200 pt-3 dark:border-gray-800">
                <label className="mb-1 block text-[13px] font-medium text-gray-700 dark:text-gray-300">
                  Authenticator code <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="6-digit code"
                  className={`${fieldCls} max-w-[160px]`}
                />
              </div>
            </div>
          </Modal>
        )}
      </div>
    </PermissionGuard>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  return { props: { ...(await serverSideTranslations(locale || 'en', ['common'])) } };
};
