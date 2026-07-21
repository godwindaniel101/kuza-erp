import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { useAuthStore } from '@/store/authStore';
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

  useEffect(() => {
    // Only redirect if authenticated AND we're actually on the login page
    // Don't redirect if user just landed here from a refresh
    if (isAuthenticated && router.pathname === '/login' && !router.query.from) {
      const lastService = Cookies.get('service');
      // Use router.asPath to preserve any query params, or go to previous page
      const returnTo = router.query.returnTo as string;
      if (returnTo) {
        router.push(returnTo);
      } else if (lastService === 'hrms') {
        router.push('/hrms/dashboard');
      } else {
        router.push('/');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]); // Only depend on isAuthenticated

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      // Small delay to ensure state is set before redirect
      setTimeout(() => {
        const lastService = Cookies.get('service');
        if (lastService === 'hrms') {
          router.push('/hrms/dashboard');
        } else {
          router.push('/');
        }
      }, 100);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || t('loginFailed');
      setError(errorMessage);
      setLoading(false);
      // Don't redirect on error - stay on page
    }
  };

  const handleGoogleSignIn = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';
    window.location.href = `${apiUrl}/api/auth/google`;
  };

  return (
    <>
      <Head>
        <title>Sign in · Kuza</title>
      </Head>
      <div className="min-h-screen bg-canvas dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2.5 mb-3">
              <BrandMark size={40} className="rounded-xl shadow-card" />
              <span className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">Kuza</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Good to see you again</p>
          </div>

          {/* Login Card */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Sign in</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Pick up where your business left off.</p>

            {error && (
              <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 dark:border-red-600 rounded-lg shadow-sm animate-fade-in">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <i className="bx bx-error-circle text-red-500 dark:text-red-400 text-xl"></i>
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">Login Failed</h3>
                    <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setError('')}
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
                  Email address <span className="text-red-500">*</span>
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
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Password <span className="text-red-500">*</span>
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
                    placeholder="Enter your password"
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
                    Remember me
                  </label>
                </div>

                <div className="text-sm">
                  <Link href="/forgot-password" className="font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors duration-150">
                    Forgot password?
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
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign in</span>
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
                  <span className="px-2 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400">Or continue with</span>
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
                <span>Sign in with Google</span>
              </button>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Don&apos;t have an account?
                <Link href="/register" className="text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-medium ml-1 transition-colors duration-150">
                  Sign up
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
