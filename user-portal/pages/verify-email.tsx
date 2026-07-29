import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { authService } from '@/lib/auth';
import Link from 'next/link';
import Head from 'next/head';

/**
 * Email verification link handler (step 2). Reads ?token=, verifies it, then:
 *   - business-less account  → forward to /onboarding with the returned token
 *   - already has a business → forward to /login (email confirmed)
 * On an invalid/expired link, offers a path back to sign up again.
 */
export default function VerifyEmail() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const [status, setStatus] = useState<'verifying' | 'error'>('verifying');
  const [message, setMessage] = useState('');
  const ran = useRef(false);

  useEffect(() => {
    if (!router.isReady || ran.current) return;
    ran.current = true;

    const token = typeof router.query.token === 'string' ? router.query.token : '';
    if (!token) {
      setStatus('error');
      setMessage(t('auth.invalidVerifyLink', 'This verification link is missing or invalid.'));
      return;
    }

    (async () => {
      try {
        const result = await authService.verifyEmail(token);
        if (result.needsOnboarding && result.onboardingToken) {
          router.replace(`/onboarding?token=${encodeURIComponent(result.onboardingToken)}`);
        } else {
          // Email confirmed for an account that already has a business.
          router.replace('/login?verified=1');
        }
      } catch (err: any) {
        setStatus('error');
        setMessage(
          err.response?.data?.message ||
            t('auth.verifyLinkExpired', 'This verification link is invalid or has expired.'),
        );
      }
    })();
  }, [router, t]);

  return (
    <>
      <Head>
        <title>{t('auth.verifyingEmail', 'Verifying your email · Kuza')}</title>
      </Head>
      <div className="min-h-screen bg-canvas dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="inline-flex items-center gap-2.5 mb-8">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gradient text-lg font-bold text-white shadow-card">K</span>
            <span className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">Kuza</span>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 p-8">
            {status === 'verifying' ? (
              <>
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 dark:bg-brand-500/10">
                  <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-brand-600"></div>
                </div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">{t('auth.verifyingEmailTitle', 'Verifying your email')}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('auth.oneMoment', 'One moment…')}</p>
              </>
            ) : (
              <>
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400">
                  <i className="bx bx-error-circle text-3xl" aria-hidden="true"></i>
                </div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">{t('auth.verificationFailed', 'Verification failed')}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{message}</p>
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center h-10 px-5 rounded-lg bg-brand-gradient hover:bg-brand-gradient-hover text-white text-sm font-semibold transition-all active:scale-[0.98]"
                >
                  {t('auth.backToSignUp', 'Back to sign up')}
                </Link>
              </>
            )}
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
