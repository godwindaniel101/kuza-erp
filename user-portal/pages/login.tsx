import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { useAuthStore } from '@/store/authStore';
import { useTenantStore } from '@/store/globalStore';
import { authService } from '@/lib/auth';
import { api } from '@/lib/api';
import Cookies from 'js-cookie';
import Link from 'next/link';
import BrandMark from '@/components/BrandMark';
import Head from 'next/head';

export default function Login() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { login, isAuthenticated } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // Set when login is blocked because the email isn't verified — reveals a
  // resend action inline.
  const [needsVerify, setNeedsVerify] = useState(false);
  const [resent, setResent] = useState(false);

  // A management user is an admin/super-admin or someone with broad settings
  // access. Everyone else who is linked to an employee record lands on the
  // employee self-service dashboard. Read fully defensively — fields may be
  // absent on older tokens.
  const isManagementUser = (u: any): boolean => {
    if (!u) return true; // fail open to the generic dashboard, never trap a user
    const roles: string[] = Array.isArray(u.roles) ? u.roles : [];
    if (roles.includes('admin') || roles.includes('super_admin')) return true;
    if (u.isSuperAdmin) return true;
    const perms: string[] = Array.isArray(u.permissions) ? u.permissions : [];
    return perms.includes('settings.view') || perms.includes('settings.edit');
  };

  // Compute the default landing (no returnTo, no hrms service cookie). Employees
  // without management access go to /employee/dashboard. Everyone else lands on
  // their tenant's proper home, derived from its vertical/apps:
  //   ecommerce (shop)     → /storefront
  //   hospitality (rms)    → /            (the dashboard suits them)
  //   retail/warehouse…    → /            (Inventory dashboard)
  //   accounts (no vertical, has invoicing) → /sales
  //   hr       (no vertical, has people)    → /hrms/dashboard
  // `employeeId` is dropped by the auth normalizer, so read it from raw /auth/me.
  const resolveDefaultLanding = async (): Promise<string> => {
    try {
      const me = await api.get<any>('/auth/me');
      const raw = me?.data ?? me;
      const employeeId = raw?.employeeId ?? null;
      const storeUser = useAuthStore.getState().user;
      if (employeeId && !isManagementUser(storeUser)) {
        return '/employee/dashboard';
      }

      // Resolve the tenant context (businessType + effectiveApps) to pick the
      // right home. force=true so a fresh login never reads a stale cache.
      await useTenantStore.getState().fetchTenantContext(true);
      const { businessType, effectiveApps } = useTenantStore.getState();
      const has = (key: string) => !!effectiveApps && effectiveApps.includes(key);

      if (businessType === 'ecommerce' || has('shop')) return '/storefront';
      if (businessType === 'accounts') return '/sales';
      if (businessType === 'hr') return '/hrms/dashboard';
      // Non-vertical tenants whose businessType is unset but whose apps reveal
      // the edition — route them to the app they actually have.
      if (!businessType || businessType === 'general') {
        if (has('invoicing') || has('books')) return '/sales';
        if (has('people')) return '/hrms/dashboard';
      }
      // hospitality / retail / warehouse / services → the dashboard suits them.
    } catch {
      // Never break login — fall back to the generic dashboard on any failure.
    }
    return '/';
  };

  // Shared post-auth navigation: returnTo and the hrms service cookie keep
  // priority; only the default landing is employee-aware.
  const navigateAfterAuth = async () => {
    const returnTo = router.query.returnTo as string;
    if (returnTo) {
      router.push(returnTo);
      return;
    }
    if (Cookies.get('service') === 'hrms') {
      router.push('/hrms/dashboard');
      return;
    }
    router.push(await resolveDefaultLanding());
  };

  useEffect(() => {
    // Only redirect if authenticated AND we're actually on the login page
    // Don't redirect if user just landed here from a refresh
    if (isAuthenticated && router.pathname === '/login' && !router.query.from) {
      navigateAfterAuth();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]); // Only depend on isAuthenticated

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNeedsVerify(false);
    setResent(false);
    setLoading(true);

    try {
      const result = await login(email, password);
      // Email not verified yet → offer a resend instead of signing in.
      if (result?.needsVerification) {
        setNeedsVerify(true);
        setError(t('auth.verifyBeforeSignIn', 'Please verify your email before signing in.'));
        setLoading(false);
        return;
      }
      // Verified account that never finished onboarding → resume the wizard.
      if (result?.needsOnboarding && result.onboardingToken) {
        router.push(`/onboarding?token=${encodeURIComponent(result.onboardingToken)}`);
        return;
      }
      // login() has already set the auth store synchronously; resolve the
      // employee-aware landing and navigate.
      await navigateAfterAuth();
    } catch (err: any) {
      const data = err.response?.data;
      const msg = typeof data?.message === 'string' ? data.message : err.message;
      setError(msg || t('loginFailed'));
      setLoading(false);
      // Don't redirect on error - stay on page
    }
  };

  const handleResendVerification = async () => {
    setResent(false);
    try {
      await authService.resendVerification(email);
    } catch {
      /* endpoint never reveals whether the address exists */
    }
    setResent(true);
  };

  const handleGoogleSignIn = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';
    window.location.href = `${apiUrl}/api/auth/google`;
  };

  return (
    <>
      <Head>
        <title>{t('auth.signInTitle', 'Sign in · Kuza')}</title>
      </Head>
      <div className="min-h-screen bg-canvas dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="text-center mb-8">
            <a
              href={process.env.NEXT_PUBLIC_WEBSITE_URL || '/'}
              className="inline-flex items-center gap-2.5 mb-3 transition-transform hover:-translate-y-px"
              aria-label={t('auth.backToWebsite', 'Back to the Kuza website')}
            >
              <BrandMark size={40} className="rounded-xl shadow-card" />
              <span className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">Kuza</span>
            </a>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('auth.goodToSeeYou', 'Good to see you again')}</p>
          </div>

          {/* Login Card */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('auth.signIn', 'Sign in')}</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{t('auth.pickUpWhereLeftOff', 'Pick up where your business left off.')}</p>

            {router.query.verified && !error && (
              <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg ring-1 ring-emerald-200 dark:ring-emerald-900/40 animate-fade-in">
                <p className="text-sm text-emerald-700 dark:text-emerald-400 flex items-center">
                  <i className="bx bx-check-circle mr-2 text-lg"></i>
                  {t('auth.emailVerifiedSignIn', 'Email verified — sign in to continue.')}
                </p>
              </div>
            )}

            {error && (
              <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg ring-1 ring-red-200 dark:ring-red-900/40 animate-fade-in">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <i className="bx bx-error-circle text-red-500 dark:text-red-400 text-xl"></i>
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">
                      {needsVerify ? t('auth.verifyYourEmail', 'Verify your email') : t('auth.loginFailedTitle', 'Login Failed')}
                    </h3>
                    <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                    {needsVerify && (
                      <div className="mt-2">
                        {resent ? (
                          <p className="text-xs text-emerald-600 dark:text-emerald-400">
                            <i className="bx bx-check-circle mr-1"></i>
                            {t('auth.linkResent', 'A new link is on its way.')}
                          </p>
                        ) : (
                          <button
                            type="button"
                            onClick={handleResendVerification}
                            className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
                          >
                            {t('auth.resendVerification', 'Resend verification link')}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => { setError(''); setNeedsVerify(false); }}
                      className="inline-flex text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 focus:outline-none"
                    >
                      <i className="bx bx-x text-lg"></i>
                    </button>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('auth.emailAddress', 'Email address')} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <i className="bx bx-envelope absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500"></i>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-10 w-full !max-w-none pl-10 pr-4 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-[13px] text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:border-transparent"
                    placeholder={t('auth.enterYourEmail', 'Enter your email')}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('password', 'Password')} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <i className="bx bx-lock absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500"></i>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-10 w-full !max-w-none pl-10 pr-4 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-[13px] text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:border-transparent"
                    placeholder={t('auth.enterYourPassword', 'Enter your password')}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-brand-600 focus-visible:ring-brand-500 border-gray-300 rounded"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900 dark:text-gray-100">
                    {t('auth.rememberMe', 'Remember me')}
                  </label>
                </div>

                <div className="text-sm">
                  <Link href="/forgot-password" className="font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors duration-150">
                    {t('auth.forgotPassword', 'Forgot password?')}
                  </Link>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-10 bg-brand-gradient hover:bg-brand-gradient-hover text-white px-6 rounded-lg text-sm font-semibold transition-all duration-150 active:scale-[0.98] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
                >
                  {loading ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      <span>{t('auth.signingIn', 'Signing in...')}</span>
                    </>
                  ) : (
                    <>
                      <span>{t('auth.signIn', 'Sign in')}</span>
                      <i className="bx bx-right-arrow-alt ml-2"></i>
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400">{t('auth.orContinueWith', 'Or continue with')}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="mt-4 w-full h-10 inline-flex items-center justify-center px-4 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors duration-150 active:scale-[0.98]"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>{t('auth.signInWithGoogle', 'Sign in with Google')}</span>
              </button>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('auth.dontHaveAccount', "Don't have an account?")}
                <Link href="/register" className="text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-medium ml-1 transition-colors duration-150">
                  {t('auth.signUp', 'Sign up')}
                </Link>
              </p>
            </div>
          </div>
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
