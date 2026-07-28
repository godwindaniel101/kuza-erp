import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { useAuthStore } from '@/store/authStore';
import type { BusinessType } from '@/store/globalStore';
import { AppKey, getApp, presetFor, withDependencies } from '@/lib/apps';
import Icon, { IconName } from '@/components/ui/Icon';
import Head from 'next/head';

const BUSINESS_TYPES: { type: BusinessType; label: string; description: string; icon: IconName }[] = [
  { type: 'hospitality', label: 'Restaurant & Hospitality', description: 'Restaurants, hotels, lounges & bars', icon: 'menu-book' },
  { type: 'retail', label: 'Retail Shop', description: 'Products, checkout & sales', icon: 'building-storefront' },
  { type: 'accounts', label: 'Accounting & Invoicing', description: 'Books, invoicing & getting paid', icon: 'calculator' },
  { type: 'hr', label: 'People & Payroll', description: 'Employees, leave & attendance', icon: 'users' },
  { type: 'warehouse', label: 'Warehouse & Stock', description: 'Stock, receiving & locations', icon: 'cube' },
];

const FEATURED_COUNTRIES = [
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
  { code: 'BJ', name: 'Benin', flag: '🇧🇯' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
];

const joinNames = (keys: AppKey[]) => keys.map((k) => getApp(k)?.name ?? k).join(', ');

/**
 * First-run onboarding (step 3): collects the business type, country, and name
 * after email verification (or a new Google sign-in), then provisions the
 * tenant. The `token` proving the verified identity comes in via the query —
 * from /verify-email (email) or the Google callback (?provider=google&token=).
 */
export default function Onboarding() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { completeOnboarding, isAuthenticated } = useAuthStore();

  const [token, setToken] = useState<string | null>(null);
  const [tokenChecked, setTokenChecked] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [businessType, setBusinessType] = useState<BusinessType | ''>('');
  const [country, setCountry] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [stepError, setStepError] = useState('');
  const [loading, setLoading] = useState(false);

  // Grab the onboarding token from the URL. Missing token → send back to signup.
  useEffect(() => {
    if (!router.isReady) return;
    const qToken = typeof router.query.token === 'string' ? router.query.token : '';
    if (!qToken) {
      router.replace('/register');
      return;
    }
    setToken(qToken);
    setTokenChecked(true);
  }, [router]);

  useEffect(() => {
    if (isAuthenticated) router.push('/');
  }, [isAuthenticated, router]);

  const nextStep = () => {
    setStepError('');
    if (currentStep === 1 && !businessType) {
      setStepError(t('auth.selectBusinessTypeError', 'Please select your business type'));
      return;
    }
    if (currentStep === 2 && !country) {
      setStepError(t('auth.selectCountryError', 'Please select a country'));
      return;
    }
    setCurrentStep((s) => Math.min(s + 1, 3));
  };

  const previousStep = () => {
    setStepError('');
    setCurrentStep((s) => Math.max(s - 1, 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!token) return;
    setLoading(true);
    try {
      await completeOnboarding({
        token,
        businessName,
        name: name || undefined,
        businessType: businessType || 'retail',
        country,
        enabledApps: businessType ? withDependencies(presetFor(businessType)) : undefined,
      });
      router.push('/');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || t('auth.onboardingFailed', 'Could not finish setup'));
      setLoading(false);
    }
  };

  if (!tokenChecked) {
    return (
      <div className="min-h-screen bg-canvas dark:bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{t('auth.setUpYourBusiness', 'Set up your business · Kuza')}</title>
      </Head>
      <div className="min-h-screen bg-canvas dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2.5 mb-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gradient text-lg font-bold text-white shadow-card">K</span>
              <span className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">Kuza</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('auth.almostThere', "You're almost there — let's set up your business")}</p>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 p-8">
            {/* Progress */}
            <div className="mb-6 flex items-center justify-between">
              {[
                { n: 1, label: t('auth.stepBusiness', 'Business') },
                { n: 2, label: t('auth.stepCountry', 'Country') },
                { n: 3, label: t('auth.stepDetails', 'Details') },
              ].map((step, i) => (
                <div key={step.n} className="flex items-center min-w-0 flex-1 last:flex-none">
                  {i > 0 && (
                    <div className={`flex-1 h-0.5 mx-3 ${currentStep >= step.n ? 'bg-brand-600' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
                  )}
                  <div className="flex items-center shrink-0">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStep >= step.n ? 'bg-brand-gradient text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'}`}>
                      <span className="text-sm font-semibold">{step.n}</span>
                    </div>
                    <span className={`ml-2 text-xs font-medium ${currentStep >= step.n ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}`}>{step.label}</span>
                  </div>
                </div>
              ))}
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 dark:border-red-600 rounded-lg animate-fade-in">
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
              {/* Step 1: Business type */}
              {currentStep === 1 && (
                <div className="space-y-5">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    {t('auth.whatKindOfBusiness', 'What kind of business?')} <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {BUSINESS_TYPES.map((bt) => {
                      const selected = businessType === bt.type;
                      return (
                        <button
                          key={bt.type}
                          type="button"
                          onClick={() => { setBusinessType(bt.type); setStepError(''); }}
                          aria-pressed={selected}
                          className={`flex flex-col items-start gap-2 rounded-2xl p-4 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                            selected
                              ? 'ring-2 ring-brand-500 bg-brand-50 dark:bg-brand-500/10'
                              : 'ring-1 ring-gray-200 dark:ring-gray-700 hover:ring-brand-300 dark:hover:ring-brand-500 hover:bg-brand-50/50 dark:hover:bg-brand-500/5'
                          }`}
                        >
                          <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${selected ? 'bg-brand-gradient text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
                            <Icon name={bt.icon} size={18} />
                          </span>
                          <span className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 leading-tight">{t(`auth.businessType.${bt.type}.label`, bt.label)}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 leading-snug">{t(`auth.businessType.${bt.type}.description`, bt.description)}</span>
                        </button>
                      );
                    })}
                  </div>

                  {businessType && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t('auth.includesApps', 'Includes: {{apps}}. You can change apps any time in Settings.', { apps: joinNames(presetFor(businessType)) })}
                    </p>
                  )}
                  {stepError && (
                    <p className="text-sm text-red-600 dark:text-red-400 flex items-center"><i className="bx bx-error-circle mr-1"></i><span>{stepError}</span></p>
                  )}

                  <div className="flex justify-end mt-6">
                    <button type="button" onClick={nextStep} className="bg-brand-gradient hover:bg-brand-gradient-hover text-white h-10 px-5 rounded-lg text-sm font-semibold transition-all flex items-center">
                      <span>{t('auth.continue', 'Continue')}</span>
                      <i className="bx bx-right-arrow-alt ml-2"></i>
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Country */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    {t('auth.selectYourCountry', 'Select Your Country')} <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {FEATURED_COUNTRIES.map((c) => (
                      <label
                        key={c.code}
                        className={`flex items-center space-x-2 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                          country === c.code
                            ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10 dark:border-brand-500'
                            : 'border-gray-200 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-500 hover:bg-brand-50/50 dark:hover:bg-brand-500/5'
                        }`}
                      >
                        <input type="radio" name="country" value={c.code} checked={country === c.code} onChange={() => { setCountry(c.code); setStepError(''); }} className="text-brand-600 border-gray-300 dark:border-gray-600 focus-visible:ring-brand-500" />
                        <span className="text-xl">{c.flag}</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">{t(`auth.country.${c.code}`, c.name)}</span>
                      </label>
                    ))}
                  </div>
                  {stepError && (
                    <p className="mt-3 text-sm text-red-600 dark:text-red-400 flex items-center"><i className="bx bx-error-circle mr-1"></i><span>{stepError}</span></p>
                  )}
                  <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">{t('auth.countryCurrencyNote', 'Your country sets your currency — plans and prices are shown in it.')}</p>

                  <div className="flex justify-end gap-3 mt-6">
                    <button type="button" onClick={previousStep} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 h-10 px-4 rounded-lg text-sm font-semibold transition-all flex items-center">
                      <i className="bx bx-left-arrow-alt mr-1"></i><span>{t('auth.back', 'Back')}</span>
                    </button>
                    <button type="button" onClick={nextStep} className="bg-brand-gradient hover:bg-brand-gradient-hover text-white h-10 px-5 rounded-lg text-sm font-semibold transition-all flex items-center">
                      <span>{t('auth.continue', 'Continue')}</span><i className="bx bx-right-arrow-alt ml-2"></i>
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Details */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('auth.businessName', 'Business Name')} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <i className="bx bx-buildings absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"></i>
                      <input id="businessName" type="text" required value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="h-10 w-full pl-10 pr-4 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-[13px] text-gray-900 dark:text-gray-100 placeholder-gray-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:border-transparent" />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('auth.yourName', 'Your name')}
                    </label>
                    <div className="relative">
                      <i className="bx bx-user absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"></i>
                      <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('auth.optional', 'Optional')} className="h-10 w-full pl-10 pr-4 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-[13px] text-gray-900 dark:text-gray-100 placeholder-gray-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:border-transparent" />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 mt-6">
                    <button type="button" onClick={previousStep} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 h-10 px-4 rounded-lg text-sm font-semibold transition-all flex items-center">
                      <i className="bx bx-left-arrow-alt mr-1"></i><span>{t('auth.back', 'Back')}</span>
                    </button>
                    <button type="submit" disabled={loading || !businessName} className="bg-brand-gradient hover:bg-brand-gradient-hover text-white h-10 px-5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed">
                      {loading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>{t('auth.settingUp', 'Setting up…')}</span>
                        </>
                      ) : (
                        <>
                          <span>{t('auth.finishSetup', 'Finish setup')}</span>
                          <i className="bx bx-check ml-2"></i>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </form>
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
