import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { useAuthStore } from '@/store/authStore';
import { authService } from '@/lib/auth';
import Link from 'next/link';
import Head from 'next/head';

/**
 * Email-first signup (step 1 of 3): we take only an email + password, email a
 * verification link, and collect the business details later at first-run
 * onboarding. On success the form flips to a "check your inbox" state.
 */
export default function Register() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (isAuthenticated) router.push('/');
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError(t('auth.passwordTooShort', 'Password must be at least 6 characters.'));
      return;
    }
    setLoading(true);
    try {
      await authService.signup(email, password);
      setSent(true);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || t('auth.signupFailed', 'Sign up failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResent(false);
    try {
      await authService.resendVerification(email);
      setResent(true);
    } catch {
      /* the endpoint never reveals whether the address exists */
      setResent(true);
    }
  };

  const handleGoogleSignUp = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';
    window.location.href = `${apiUrl}/api/auth/google`;
  };

  return (
    <>
      <Head>
        <title>{t('auth.createAccountTitle', 'Create your account · Kuza')}</title>
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
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gradient text-lg font-bold text-white shadow-card">
                K
              </span>
              <span className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">Kuza</span>
            </a>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('auth.getBusinessSetUp', "Let's get your business set up")}</p>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 p-8">
            {sent ? (
              /* ---------- Check your inbox ---------- */
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400">
                  <i className="bx bx-envelope text-3xl" aria-hidden="true"></i>
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('auth.checkYourInbox', 'Check your inbox')}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  {t('auth.verificationSentTo', "We've sent a verification link to")}
                </p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-6 break-all">{email}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
                  {t('auth.clickLinkToContinue', 'Click the link in that email to verify your address and finish setting up your business.')}
                </p>
                {resent ? (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-4">
                    <i className="bx bx-check-circle mr-1" aria-hidden="true"></i>
                    {t('auth.linkResent', 'A new link is on its way.')}
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    className="text-sm font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 mb-4"
                  >
                    {t('auth.didntGetIt', "Didn't get it? Resend link")}
                  </button>
                )}
                <div className="mt-2 text-center">
                  <button
                    type="button"
                    onClick={() => { setSent(false); setResent(false); }}
                    className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  >
                    {t('auth.useDifferentEmail', 'Use a different email')}
                  </button>
                </div>
              </div>
            ) : (
              /* ---------- Signup form ---------- */
              <>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('auth.createYourAccount', 'Create your account')}</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">{t('auth.startFreeNoCard', 'Start free — no card required.')}</p>

                {error && (
                  <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg ring-1 ring-red-200 dark:ring-red-900/40 animate-fade-in">
                    <div className="flex items-start">
                      <i className="bx bx-error-circle text-red-500 dark:text-red-400 text-xl"></i>
                      <p className="ml-3 flex-1 text-sm text-red-700 dark:text-red-400">{error}</p>
                      <button type="button" onClick={() => setError('')} className="ml-4 text-red-500 dark:text-red-400 hover:text-red-700">
                        <i className="bx bx-x text-lg"></i>
                      </button>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('auth.emailAddress', 'Email address')} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <i className="bx bx-envelope absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"></i>
                      <input
                        id="email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t('auth.enterYourEmail', 'Enter your email')}
                        className="h-10 w-full pl-10 pr-4 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-[13px] text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('password', 'Password')} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <i className="bx bx-lock absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"></i>
                      <input
                        id="password"
                        type="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={t('auth.createAPassword', 'Create a password (min. 6 characters)')}
                        className="h-10 w-full pl-10 pr-4 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-[13px] text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:border-transparent"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-10 bg-brand-gradient hover:bg-brand-gradient-hover text-white px-6 rounded-lg text-sm font-semibold transition-all active:scale-[0.98] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>{t('auth.creatingAccount', 'Creating account...')}</span>
                      </>
                    ) : (
                      <>
                        <span>{t('auth.continueWithEmail', 'Continue with email')}</span>
                        <i className="bx bx-right-arrow-alt ml-2"></i>
                      </>
                    )}
                  </button>
                </form>

                {/* Google Sign Up */}
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
                    onClick={handleGoogleSignUp}
                    className="mt-4 w-full h-10 inline-flex items-center justify-center px-4 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors active:scale-[0.98]"
                  >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    <span>{t('auth.signUpWithGoogle', 'Sign up with Google')}</span>
                  </button>
                </div>
              </>
            )}

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('auth.alreadyHaveAccount', 'Already have an account?')}
                <Link href="/login" className="text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-medium ml-1 transition-colors">
                  {t('auth.signIn', 'Sign in')}
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
