import { useState } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import Head from 'next/head';
import Link from 'next/link';
import { api } from '@/lib/api';
import BrandMark from '@/components/BrandMark';

/**
 * Public invitation-acceptance page. The invite email links here with
 * `?token=…`; the invitee sets their name + password and we POST to
 * /invitations/accept/:token, which creates their account. Standalone (no app
 * chrome / auth) — registered as a public route in Layout.
 */
export default function AcceptInvitation() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const token = typeof router.query.token === 'string' ? router.query.token : '';

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!token) {
      setError(t('invitations.missingToken', 'This invitation link is invalid or incomplete.'));
      return;
    }
    if (password.length < 8) {
      setError(t('invitations.passwordTooShort', 'Password must be at least 8 characters.'));
      return;
    }
    if (password !== confirm) {
      setError(t('invitations.passwordMismatch', 'Passwords do not match.'));
      return;
    }
    setLoading(true);
    try {
      await api.post(`/invitations/accept/${token}`, {
        password,
        ...(name.trim() ? { name: name.trim() } : {}),
      });
      setDone(true);
      setTimeout(() => router.push('/login'), 1800);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          t('invitations.acceptFailed', 'Could not accept this invitation. It may have expired or already been used.'),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>{t('invitations.acceptTitle', 'Accept invitation · Kuza')}</title>
      </Head>
      <div className="min-h-screen bg-canvas dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2.5 mb-3">
              <BrandMark size={40} className="rounded-xl shadow-card" />
            </div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t('invitations.acceptHeading', 'Join your team on Kuza')}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t('invitations.acceptSubtitle', 'Set your name and a password to activate your account.')}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-card ring-1 ring-gray-950/[0.04] dark:bg-gray-900 dark:ring-gray-800">
            {done ? (
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10">
                  <i className="bx bx-check text-2xl" aria-hidden="true" />
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {t('invitations.accepted', 'Account created!')}
                </p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {t('invitations.redirectingToLogin', 'Taking you to sign in…')}
                </p>
                <Link href="/login" className="mt-4 inline-block text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
                  {t('invitations.goToLogin', 'Go to sign in')}
                </Link>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                {error && (
                  <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
                    {error}
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                    {t('name', 'Name')} <span className="text-gray-400">({t('optional', 'optional')})</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus-ring dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                    {t('password', 'Password')}
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                    className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus-ring dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                    {t('invitations.confirmPassword', 'Confirm password')}
                  </label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                    required
                    className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus-ring dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-brand-gradient px-4 text-sm font-medium text-white shadow-card transition-colors hover:bg-brand-gradient-hover disabled:opacity-50"
                >
                  {loading ? t('invitations.activating', 'Activating…') : t('invitations.activateAccount', 'Activate account')}
                </button>
              </form>
            )}
          </div>

          <p className="mt-6 text-center text-xs text-gray-400">
            {t('invitations.alreadyHaveAccount', 'Already have an account?')}{' '}
            <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
              {t('signIn', 'Sign in')}
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => ({
  props: { ...(await serverSideTranslations(locale ?? 'en', ['common'])) },
});
