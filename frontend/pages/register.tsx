import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { useAuthStore } from '@/store/authStore';
import Link from 'next/link';
import Head from 'next/head';
import Image from 'next/image';

export default function Register() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { register, isAuthenticated } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    passwordConfirmation: '',
    restaurantName: '',
    services: [] as string[],
    country: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [stepErrors, setStepErrors] = useState<{ [key: number]: string }>({});
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Detect dark mode
  useEffect(() => {
    const checkDarkMode = () => {
      if (typeof window !== 'undefined') {
        setIsDarkMode(document.documentElement.classList.contains('dark'));
      }
    };
    checkDarkMode();
    if (typeof window !== 'undefined') {
      const observer = new MutationObserver(checkDarkMode);
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class'],
      });
      return () => observer.disconnect();
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  const featuredCountries = [
    { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
    { code: 'GH', name: 'Ghana', flag: '🇬🇭' },
    { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
    { code: 'BJ', name: 'Benin', flag: '🇧🇯' },
    { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
    { code: 'US', name: 'United States', flag: '🇺🇸' },
    { code: 'FR', name: 'France', flag: '🇫🇷' },
  ];

  const handleServiceToggle = (service: string) => {
    setFormData((prev) => ({
      ...prev,
      services: prev.services.includes(service)
        ? prev.services.filter((s) => s !== service)
        : [...prev.services, service],
    }));
    setStepErrors((prev) => ({ ...prev, 1: '' }));
  };

  const handleCountrySelect = (country: string) => {
    setFormData((prev) => ({ ...prev, country }));
    setStepErrors((prev) => ({ ...prev, 2: '' }));
  };

  const validateStep = (step: number): boolean => {
    if (step === 1) {
      if (formData.services.length === 0) {
        setStepErrors((prev) => ({ ...prev, 1: 'Please select at least one service' }));
        return false;
      }
      return true;
    }
    if (step === 2) {
      if (!formData.country) {
        setStepErrors((prev) => ({ ...prev, 2: 'Please select a country' }));
        return false;
      }
      return true;
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 3));
    }
  };

  const previousStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        passwordConfirmation: formData.passwordConfirmation,
        restaurantName: formData.restaurantName,
      });
      router.push('/');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || t('registrationFailed');
      setError(errorMessage);
      setLoading(false);
      // Don't redirect on error - stay on page
    }
  };

  const handleGoogleSignUp = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';
    window.location.href = `${apiUrl}/api/auth/google`;
  };

  return (
    <>
      <Head>
        <title>Register - ERP Platform</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 mb-4">
              <Image
                src={isDarkMode ? '/images/logos/kuza_logo_word_dark_red.svg' : '/images/logos/kuza_logo_word_light_red.svg'}
                alt="Kuza"
                width={64}
                height={64}
                className="object-contain"
                priority
              />
            </div>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Create your account</p>
          </div>

          {/* Register Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Get started</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Create your ERP account</p>

            {/* Progress Steps */}
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full ${
                      currentStep >= 1 ? 'bg-red-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                    }`}
                  >
                    <span className="text-sm font-semibold">1</span>
                  </div>
                  <span
                    className={`ml-2 text-xs font-medium ${
                      currentStep >= 1 ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'
                    }`}
                  >
                    Services
                  </span>
                </div>
                <div className={`flex-1 h-0.5 mx-3 ${currentStep >= 2 ? 'bg-red-600' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
                <div className="flex items-center">
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full ${
                      currentStep >= 2 ? 'bg-red-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                    }`}
                  >
                    <span className="text-sm font-semibold">2</span>
                  </div>
                  <span
                    className={`ml-2 text-xs font-medium ${
                      currentStep >= 2 ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'
                    }`}
                  >
                    Country
                  </span>
                </div>
                <div className={`flex-1 h-0.5 mx-3 ${currentStep >= 3 ? 'bg-red-600' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
                <div className="flex items-center">
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full ${
                      currentStep >= 3 ? 'bg-red-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                    }`}
                  >
                    <span className="text-sm font-semibold">3</span>
                  </div>
                  <span
                    className={`ml-2 text-xs font-medium ${
                      currentStep >= 3 ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'
                    }`}
                  >
                    Details
                  </span>
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 dark:border-red-600 rounded-lg shadow-sm animate-fade-in">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <i className="bx bx-error-circle text-red-500 dark:text-red-400 text-xl"></i>
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">Registration Failed</h3>
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
              {/* Step 1: Services Selection */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Select Services <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <label
                        className={`flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          formData.services.includes('restaurant')
                            ? 'border-red-500 bg-red-50 dark:bg-red-900/20 dark:border-red-600'
                            : 'border-gray-200 dark:border-gray-600 hover:border-red-300 dark:hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={formData.services.includes('restaurant')}
                          onChange={() => handleServiceToggle('restaurant')}
                          className="mt-1 w-4 h-4 text-red-600 border-gray-300 dark:border-gray-600 rounded focus-visible:ring-red-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-red-600 dark:text-red-400 text-xl font-bold">K</span>
                            <span className="font-semibold text-gray-900 dark:text-gray-100">Restaurant</span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Menu, inventory, orders, and sales</p>
                        </div>
                      </label>

                      <label
                        className={`flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          formData.services.includes('hrms')
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-600'
                            : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={formData.services.includes('hrms')}
                          onChange={() => handleServiceToggle('hrms')}
                          className="mt-1 w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus-visible:ring-blue-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <i className="bx bx-group text-blue-600 dark:text-blue-400 text-xl"></i>
                            <span className="font-semibold text-gray-900 dark:text-gray-100">HRMS</span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">HR, payroll, attendance, and more</p>
                        </div>
                      </label>
                    </div>
                    {stepErrors[1] && (
                      <p className="mt-3 text-sm text-red-600 dark:text-red-400 flex items-center">
                        <i className="bx bx-error-circle mr-1"></i>
                        <span>{stepErrors[1]}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end mt-6">
                    <button
                      type="button"
                      onClick={nextStep}
                      className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center"
                    >
                      <span>Continue to Country Selection</span>
                      <i className="bx bx-right-arrow-alt ml-2"></i>
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Country Selection */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Select Your Country <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {featuredCountries.map((country) => (
                        <label
                          key={country.code}
                          className={`flex items-center space-x-2 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                            formData.country === country.code
                              ? 'border-red-500 bg-red-50 dark:bg-red-900/20 dark:border-red-600'
                              : 'border-gray-200 dark:border-gray-600 hover:border-red-300 dark:hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                          }`}
                        >
                          <input
                            type="radio"
                            name="country"
                            value={country.code}
                            checked={formData.country === country.code}
                            onChange={() => handleCountrySelect(country.code)}
                            className="text-red-600 border-gray-300 dark:border-gray-600 focus-visible:ring-red-500"
                          />
                          <span className="text-xl">{country.flag}</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">{country.name}</span>
                        </label>
                      ))}
                    </div>
                    {stepErrors[2] && (
                      <p className="mt-3 text-sm text-red-600 dark:text-red-400 flex items-center">
                        <i className="bx bx-error-circle mr-1"></i>
                        <span>{stepErrors[2]}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      type="button"
                      onClick={previousStep}
                      className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center"
                    >
                      <i className="bx bx-left-arrow-alt mr-1"></i>
                      <span>Back</span>
                    </button>
                    <button
                      type="button"
                      onClick={nextStep}
                      className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center"
                    >
                      <span>Continue</span>
                      <i className="bx bx-right-arrow-alt ml-2"></i>
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: User Details */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="restaurantName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Business Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <i className="bx bx-buildings absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500"></i>
                      <input
                        type="text"
                        id="restaurantName"
                        required
                        value={formData.restaurantName}
                        onChange={(e) => setFormData({ ...formData, restaurantName: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <i className="bx bx-user absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500"></i>
                        <input
                          type="text"
                          id="name"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-transparent"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Email address <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <i className="bx bx-envelope absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500"></i>
                        <input
                          type="email"
                          id="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <i className="bx bx-lock absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500"></i>
                        <input
                          type="password"
                          id="password"
                          required
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-transparent"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="passwordConfirmation" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Confirm Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <i className="bx bx-lock absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500"></i>
                        <input
                          type="password"
                          id="passwordConfirmation"
                          required
                          value={formData.passwordConfirmation}
                          onChange={(e) => setFormData({ ...formData, passwordConfirmation: e.target.value })}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      type="button"
                      onClick={previousStep}
                      className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center"
                    >
                      <i className="bx bx-left-arrow-alt mr-1"></i>
                      <span>Back</span>
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
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
                          <span>Creating account...</span>
                        </>
                      ) : (
                        <>
                          <span>Create account</span>
                          <i className="bx bx-right-arrow-alt ml-2"></i>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </form>

            {/* Google Sign Up */}
            {currentStep === 1 && (
              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">Or continue with</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignUp}
                  className="mt-4 w-full inline-flex items-center justify-center px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
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
                  <span>Sign up with Google</span>
                </button>
              </div>
            )}

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Already have an account?
                <Link href="/login" className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium ml-1">
                  Sign in
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
