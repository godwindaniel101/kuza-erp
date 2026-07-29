import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Toast from '@/components/Toast';

interface ApiTokenInfo {
  hasToken: boolean;
  label: string | null;
  createdAt: string | null;
  lastUsedAt: string | null;
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return '—';
  }
}

export default function ApiSettingsPage() {
  const { t } = useTranslation('common');
  const [info, setInfo] = useState<ApiTokenInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [label, setLabel] = useState('');
  // The plaintext token, shown exactly once right after generating it.
  const [plaintext, setPlaintext] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadInfo();
  }, []);

  const loadInfo = async () => {
    try {
      const res = await api.get<{ success: boolean; data: ApiTokenInfo }>('/auth/api-token');
      if (res.success) setInfo(res.data);
    } catch (err) {
      console.error('Failed to load API token status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setBusy(true);
    setPlaintext(null);
    setCopied(false);
    try {
      const res = await api.post<{ success: boolean; data: { token: string; createdAt: string } }>(
        '/auth/api-token',
        { label: label.trim() || undefined },
      );
      if (res.success && res.data?.token) {
        setPlaintext(res.data.token);
        setLabel('');
        await loadInfo();
        setToast({ message: t('settings.apiTokenGenerated', 'API token generated. Copy it now — it will not be shown again.'), type: 'success' });
      }
    } catch (err: any) {
      setToast({
        message: err?.response?.data?.message || t('settings.apiTokenGenerateFailed', 'Failed to generate token'),
        type: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleRevoke = async () => {
    setBusy(true);
    try {
      const res = await api.delete<{ success: boolean }>('/auth/api-token');
      if (res.success) {
        setPlaintext(null);
        setConfirmRevoke(false);
        await loadInfo();
        setToast({ message: t('settings.apiTokenRevoked', 'API token revoked'), type: 'success' });
      }
    } catch (err: any) {
      setToast({
        message: err?.response?.data?.message || t('settings.apiTokenRevokeFailed', 'Failed to revoke token'),
        type: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleCopy = async () => {
    if (!plaintext) return;
    try {
      await navigator.clipboard.writeText(plaintext);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setToast({ message: t('settings.copyFailed', 'Could not copy — select and copy manually'), type: 'error' });
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-2xl space-y-5">
        <div className="py-12 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-brand-600"></div>
        </div>
      </div>
    );
  }

  const hasToken = info?.hasToken;

  return (
    <PermissionGuard permission="settings.view">
      <div className="w-full max-w-2xl space-y-5">
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

        <PageHeader
          title={t('settings.apiAccess', 'API access')}
          subtitle={t(
            'settings.apiAccessDescription',
            'Generate a revocable token so the Kuza MCP server can answer questions from Claude using your data.',
          )}
          breadcrumbs={[
            { label: t('settings', 'Settings'), href: '/settings' },
            { label: t('settings.apiAccess', 'API access') },
          ]}
        />

        {/* What this is — a short, plain-language note. */}
        <div className="flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-200">
          <i className="bx bx-info-circle mt-0.5 text-lg text-brand-600 dark:text-brand-400"></i>
          <p>
            {t(
              'settings.apiAccessNote',
              'This token acts on your behalf and is scoped to your business only. It is read-only through the MCP. Treat it like a password — store it safely, and revoke it if it leaks.',
            )}
          </p>
        </div>

        {/* Freshly-generated token — shown once. */}
        {plaintext && (
          <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-500/40 dark:bg-emerald-500/10">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
              <i className="bx bx-check-circle text-lg"></i>
              {t('settings.apiTokenCopyNow', 'Copy your token now — it will not be shown again')}
            </div>
            <div className="flex items-stretch gap-2">
              <code className="min-w-0 flex-1 overflow-x-auto rounded-lg border border-emerald-200 bg-white px-3 py-2 font-mono text-[12px] text-gray-800 dark:border-emerald-500/30 dark:bg-gray-900 dark:text-gray-100">
                {plaintext}
              </code>
              <Button variant="secondary" size="sm" onClick={handleCopy}>
                <i className={`bx ${copied ? 'bx-check' : 'bx-copy'} text-base`}></i>
                <span>{copied ? t('copied', 'Copied') : t('copy', 'Copy')}</span>
              </Button>
            </div>
          </div>
        )}

        {/* Current status + actions. */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex h-2 w-2 rounded-full ${
                    hasToken ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                ></span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {hasToken
                    ? t('settings.apiTokenActive', 'A token is active')
                    : t('settings.apiTokenNone', 'No token yet')}
                </span>
              </div>
              {hasToken && (
                <dl className="mt-2 space-y-1 text-xs text-gray-500 dark:text-gray-400">
                  {info?.label && (
                    <div className="flex gap-1.5">
                      <dt className="font-medium">{t('label', 'Label')}:</dt>
                      <dd className="truncate">{info.label}</dd>
                    </div>
                  )}
                  <div className="flex gap-1.5">
                    <dt className="font-medium">{t('created', 'Created')}:</dt>
                    <dd>{formatDate(info?.createdAt ?? null)}</dd>
                  </div>
                  <div className="flex gap-1.5">
                    <dt className="font-medium">{t('settings.lastUsed', 'Last used')}:</dt>
                    <dd>{info?.lastUsedAt ? formatDate(info.lastUsedAt) : t('never', 'Never')}</dd>
                  </div>
                </dl>
              )}
            </div>
            {hasToken && !confirmRevoke && (
              <Button variant="secondary" size="sm" onClick={() => setConfirmRevoke(true)} disabled={busy}>
                <i className="bx bx-trash text-base"></i>
                <span>{t('revoke', 'Revoke')}</span>
              </Button>
            )}
          </div>

          {/* Revoke confirmation. */}
          {confirmRevoke && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              <span>{t('settings.apiTokenRevokeConfirm', 'Revoke this token? Any MCP using it will stop working.')}</span>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setConfirmRevoke(false)} disabled={busy}>
                  {t('cancel', 'Cancel')}
                </Button>
                <Button variant="danger" size="sm" onClick={handleRevoke} disabled={busy}>
                  {busy ? t('revoking', 'Revoking…') : t('revoke', 'Revoke')}
                </Button>
              </div>
            </div>
          )}

          {/* Generate / rotate. */}
          <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
            <label htmlFor="token-label" className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
              {t('settings.apiTokenLabel', 'Label (optional)')}
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="token-label"
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                maxLength={100}
                placeholder={t('settings.apiTokenLabelPlaceholder', 'e.g. Claude Desktop MCP') as string}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
              <Button variant="primary" onClick={handleGenerate} disabled={busy}>
                {busy ? (
                  <>
                    <i className="bx bx-loader-alt bx-spin text-lg"></i>
                    <span>{t('generating', 'Generating…')}</span>
                  </>
                ) : (
                  <>
                    <i className="bx bx-key text-lg"></i>
                    <span>{hasToken ? t('settings.apiTokenRotate', 'Regenerate') : t('settings.apiTokenGenerate', 'Generate token')}</span>
                  </>
                )}
              </Button>
            </div>
            {hasToken && (
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                <i className="bx bx-error-circle align-middle"></i>{' '}
                {t('settings.apiTokenRotateNote', 'Regenerating replaces the existing token — the old one stops working immediately.')}
              </p>
            )}
          </div>
        </div>

        {/* How to use it. */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm dark:border-gray-700 dark:bg-gray-900">
          <h3 className="mb-1 font-semibold text-gray-900 dark:text-gray-100">
            {t('settings.apiTokenUsage', 'Using it with the Kuza MCP server')}
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            {t('settings.apiTokenUsageNote', 'Set this token as the KUZA_API_TOKEN environment variable for the MCP server:')}
          </p>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-gray-900 px-3 py-2 font-mono text-[12px] text-gray-100 dark:bg-gray-950">
            KUZA_API_TOKEN=kuza_… npm start
          </pre>
        </div>
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
