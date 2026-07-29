import { useEffect, useState, useCallback } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import QRCode from 'qrcode';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Toast from '@/components/Toast';

const fieldCls =
  'h-9 w-full max-w-[160px] rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-transparent focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100';

export default function PaymentSecurityPage() {
  const { t } = useTranslation('common');
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [enroll, setEnroll] = useState<{ secret: string; qr: string } | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: { enabled: boolean } }>('/payments/2fa/status');
      if (res.success) setEnabled(res.data.enabled);
    } catch {
      setToast({ message: 'Failed to load', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const startEnroll = async () => {
    try {
      const res = await api.post<{ success: boolean; data: { secret: string; otpauthUri: string } }>('/payments/2fa/setup');
      if (res.success) {
        const qr = await QRCode.toDataURL(res.data.otpauthUri, { margin: 1, width: 200 });
        setEnroll({ secret: res.data.secret, qr });
        setCode('');
      }
    } catch (e: any) {
      setToast({ message: e?.response?.data?.message || 'Could not start setup', type: 'error' });
    }
  };

  const verify = async () => {
    setBusy(true);
    try {
      await api.post('/payments/2fa/activate', { code: code.trim() });
      setToast({ message: 'Two-factor authentication enabled', type: 'success' });
      setEnroll(null);
      setEnabled(true);
    } catch (e: any) {
      setToast({ message: e?.response?.data?.message || 'Invalid code', type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <PermissionGuard permission="payments.view">
      <div className="max-w-2xl space-y-5">
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        <PageHeader title="Two-factor authentication" subtitle="Protects sensitive changes like your settlement account" />

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-brand-600"></div>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-card ring-1 ring-gray-950/[0.04] dark:border-gray-800 dark:bg-gray-900 dark:ring-gray-800">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Authenticator app</h3>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  Use Google Authenticator or any TOTP app.
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                  enabled
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                    : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                }`}
              >
                {enabled ? 'Enabled' : 'Not set up'}
              </span>
            </div>

            {!enroll ? (
              <div className="mt-4">
                <Button variant={enabled ? 'secondary' : 'primary'} onClick={startEnroll}>
                  <i className="bx bx-shield-quarter" aria-hidden="true"></i>
                  <span>{enabled ? 'Re-configure' : 'Enable 2FA'}</span>
                </Button>
              </div>
            ) : (
              <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={enroll.qr} alt="Scan with your authenticator" className="h-40 w-40 rounded-lg border border-gray-200 dark:border-gray-700" />
                <div className="flex-1 space-y-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Scan the QR, or enter this key manually:</p>
                  <code className="block break-all rounded-lg bg-gray-50 px-3 py-2 font-mono text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                    {enroll.secret}
                  </code>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="6-digit code"
                      className={fieldCls}
                    />
                    <Button variant="primary" onClick={verify} disabled={busy || code.trim().length !== 6}>
                      {busy ? 'Verifying' : 'Verify'}
                    </Button>
                    <button className="text-xs text-gray-500 hover:underline" onClick={() => setEnroll(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  return { props: { ...(await serverSideTranslations(locale || 'en', ['common'])) } };
};
