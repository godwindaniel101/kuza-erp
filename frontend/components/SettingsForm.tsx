import { useState, useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { api } from '@/lib/api';
import Cookies from 'js-cookie';
import Toast from '@/components/Toast';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import SearchableSelect from '@/components/SearchableSelect';
import PageHeader, { type Breadcrumb } from '@/components/ui/PageHeader';

interface SettingsFormProps {
  title?: string;
  /** One-line description rendered under the title. */
  subtitle?: string;
  breadcrumbs?: Breadcrumb[];
  organizationLabel?: string;
  currencyDescription?: string;
  languageDescription?: string;
  showAddress?: boolean;
  showPhone?: boolean;
  showEmail?: boolean;
}

export default function SettingsForm({
  title,
  subtitle,
  breadcrumbs,
  organizationLabel = 'businessName',
  currencyDescription,
  languageDescription,
  showAddress = true,
  showPhone = true,
  showEmail = true,
}: SettingsFormProps) {
  const { t } = useTranslation('common');
  const router = useRouter();
  const [business, setRestaurant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    currency: 'NGN',
    language: 'en',
    address: '',
    phone: '',
    email: '',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await api.get<{ success: boolean; data: any }>('/settings');
      if (response.success) {
        setRestaurant(response.data);
        setFormData({
          name: response.data.name || '',
          currency: response.data.currency_code || response.data.currency || 'NGN',
          language: response.data.language || 'en',
          address: response.data.address || '',
          phone: response.data.phone || '',
          email: response.data.email || '',
        });
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
      setToast({ message: t('failedToLoadSettings') || 'Failed to load settings', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Backend accepts only name, description, logo, primaryColor, secondaryColor, currency, language
      await api.put('/settings', {
        name: formData.name,
        currency: formData.currency,
        language: formData.language,
      });
      // Persist and apply language preference
      if (formData.language) {
        Cookies.set('lang', formData.language);
        router.replace(router.asPath, router.asPath, { locale: formData.language });
      }
      setToast({ message: t('settingsSaved') || 'Settings saved successfully', type: 'success' });
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      setToast({ message: err.response?.data?.message || t('saveFailed') || 'Failed to save settings', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 dark:border-brand-400 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <PageHeader
        title={title || t('restaurantSettings') || 'Business Settings'}
        subtitle={subtitle || 'Your business name, currency and language defaults'}
        breadcrumbs={breadcrumbs || [{ label: 'Settings', href: '/settings' }, { label: 'General' }]}
      />
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={showAddress || showPhone || showEmail ? 'md:col-span-1' : 'md:col-span-2'}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t(organizationLabel) || t('businessName') || 'Business Name'} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="h-9 w-full px-4 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-transparent text-[13px]"
              />
            </div>
            {showAddress && (
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('address')}</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="h-9 w-full px-4 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-transparent text-[13px]"
                />
              </div>
            )}
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('currency')} <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={[
                  { value: 'NGN', label: 'NGN - Nigerian Naira' },
                  { value: 'USD', label: 'USD - US Dollar' },
                  { value: 'EUR', label: 'EUR - Euro' },
                  { value: 'GBP', label: 'GBP - British Pound' },
                ]}
                value={formData.currency}
                onChange={(value) => setFormData({ ...formData, currency: value })}
                placeholder={t('selectCurrency') || 'Select Currency'}
                required
                searchPlaceholder={t('searchCurrency') || 'Search currency...'}
              />
              {currencyDescription && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{currencyDescription}</p>
              )}
            </div>
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('language')} <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center space-x-4">
                <LanguageSwitcher
                  value={formData.language}
                  onChange={(lang) => setFormData({ ...formData, language: lang })}
                />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  ({t('changeLanguage')})
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {languageDescription || t('thisLanguageWillBeUsed')}
              </p>
            </div>
            {showPhone && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('phone')}</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="h-9 w-full px-4 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-transparent text-[13px]"
                />
              </div>
            )}
            {showEmail && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('email')}</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="h-9 w-full px-4 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-transparent text-[13px]"
                />
              </div>
            )}
          </div>
          <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 flex items-center space-x-2"
            >
              <i className="bx bx-save"></i>
              <span>{saving ? t('saving') : t('saveSettings')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

