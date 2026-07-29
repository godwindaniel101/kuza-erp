import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Head from 'next/head';
import Cookies from 'js-cookie';
import { useAuthStore } from '@/store/authStore';
import BrandMark from '@/components/BrandMark';

/**
 * Super-admin sign-in for the Kuza platform console. The gate is
 * `user.isSuperAdmin`: after a successful login we re-read /auth/me and only
 * proceed for a confirmed super-admin — otherwise the session is cleared. The
 * server also enforces this on every /admin endpoint via a SuperAdminGuard.
 */
export default function AdminLogin() {
  const router = useRouter();
  const { login, fetchUser, logout, user, isAuthenticated } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const NOT_ADMIN = 'This portal is for platform administrators only.';

  // Already signed in as a super-admin → skip the form.
  useEffect(() => {
    if (isAuthenticated && user?.isSuperAdmin) {
      router.replace((router.query.returnTo as string) || '/');
    }
  }, [isAuthenticated, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(email, password);
      // Non-session outcomes (unverified / never onboarded) are never a
      // super-admin session — reject uniformly.
      if ((result as any)?.needsVerification || (result as any)?.needsOnboarding) {
        logout();
        setError(NOT_ADMIN);
        setLoading(false);
        return;
      }
      // Confirm against /auth/me — the authoritative super-admin signal.
      await fetchUser().catch(() => undefined);
      const me = useAuthStore.getState().user;
      if (!me?.isSuperAdmin) {
        logout();
        setError(NOT_ADMIN);
        setLoading(false);
        return;
      }
      router.replace((router.query.returnTo as string) || '/');
    } catch (err: any) {
      // If a token slipped into the cookie on a partial failure, drop it.
      if (Cookies.get('auth_token')) logout();
      const data = err?.response?.data;
      const msg = typeof data?.message === 'string' ? data.message : err?.message;
      setError(msg || 'Sign in failed. Check your email and password.');
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Sign in · Kuza Admin</title>
      </Head>
      <div className="min-h-screen bg-canvas dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2.5 mb-3">
              <BrandMark size={40} className="rounded-xl shadow-card" />
              <div className="text-left leading-tight">
                <span className="block text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
                  Kuza
                </span>
                <span className="block text-2xs font-semibold uppercase tracking-wider text-accent">
                  Admin
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Platform console for super-admins
            </p>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 p-8">
            <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Sign in
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">
              Manage tenants, plans, pricing and access.
            </p>

            {error && (
              <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg ring-1 ring-red-200 dark:ring-red-900/40">
                <div className="flex items-start gap-2">
                  <i className="bx bx-error-circle text-red-500 dark:text-red-400 text-xl" aria-hidden="true" />
                  <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5"
                >
                  Email address
                </label>
                <div className="relative">
                  <i className="bx bx-envelope absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" aria-hidden="true" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-10 w-full pl-10 pr-4 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-[13px] text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:border-transparent"
                    placeholder="admin@kuza.africa"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <i className="bx bx-lock absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" aria-hidden="true" />
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-10 w-full pl-10 pr-4 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-[13px] text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:border-transparent"
                    placeholder="Enter your password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-10 bg-brand-gradient hover:bg-brand-gradient-hover text-white px-6 rounded-lg text-sm font-semibold transition-all duration-150 active:scale-[0.98] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Signing in…</span>
                  </>
                ) : (
                  <>
                    <span>Sign in</span>
                    <i className="bx bx-right-arrow-alt ml-2" aria-hidden="true" />
                  </>
                )}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-gray-400 dark:text-gray-500">
            Access is restricted and logged.
          </p>
        </div>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale || 'en', ['common'])),
    },
  };
};
