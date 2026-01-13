import { useState, useMemo } from 'react';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import Toast from '@/components/Toast';
import Link from 'next/link';
import SearchableSelect from '@/components/SearchableSelect';
import { countries, getCountryStates, getCountryName } from '@/utils/countries';

export default function CreateLocationPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Country options
  const countryOptions = useMemo(() => 
    countries.map(country => ({ value: country.code, label: country.name })),
    []
  );

  // State options based on selected country
  const stateOptions = useMemo(() => {
    if (!formData.country) return [];
    const states = getCountryStates(formData.country);
    return states.map(state => ({ value: state, label: state }));
  }, [formData.country]);

  // Reset state when country changes
  const handleCountryChange = (countryCode: string) => {
    setFormData({ ...formData, country: countryCode, state: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await api.post('/hrms/locations', {
        name: formData.name,
        address: formData.address || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        postalCode: formData.postalCode || undefined,
        country: formData.country ? getCountryName(formData.country) : undefined,
      });
      if (response.success) {
        setToast({ message: t('locationCreated') || 'Location created successfully', type: 'success' });
        setTimeout(() => router.push('/hrms/locations'), 1500);
      }
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || t('failedToCreateLocation') || 'Failed to create location', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PermissionGuard permission="locations.create">
      <div className="p-6 max-w-2xl mx-auto">
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        <div className="mb-6">
          <Link href="/hrms/locations" className="text-gray-500 hover:text-gray-700 dark:text-gray-400">
            <i className="bx bx-arrow-back mr-2"></i>
            {t('back')}
          </Link>
        </div>
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">{t('createLocation') || 'Create Location'}</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('name')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full min-h-[48px] px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-transparent"
                placeholder={t('locationName') || 'Location name'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('address')}</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full min-h-[48px] px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-transparent"
                placeholder={t('streetAddress') || 'Street address'}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('city')}</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full min-h-[48px] px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-transparent"
                  placeholder={t('city') || 'City'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('state')}</label>
                {formData.country && stateOptions.length > 0 ? (
                  <SearchableSelect
                    focusColor="blue"
                    options={stateOptions}
                    value={formData.state}
                    onChange={(value) => setFormData({ ...formData, state: value })}
                    placeholder={t('state') || 'Select state/province'}
                    searchPlaceholder={t('search') || 'Search state...'}
                  />
                ) : (
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full min-h-[48px] px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-transparent"
                    placeholder={formData.country ? t('state') || 'State/Province (optional)' : t('selectCountryFirst') || 'Select country first'}
                    disabled={!formData.country}
                  />
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('postalCode')}</label>
                <input
                  type="text"
                  value={formData.postalCode}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                  className="w-full min-h-[48px] px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-transparent"
                  placeholder={t('postalCode') || 'Postal code'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('country')}</label>
                <SearchableSelect
                  focusColor="blue"
                  options={countryOptions}
                  value={formData.country}
                  onChange={handleCountryChange}
                  placeholder={t('country') || 'Select country'}
                  searchPlaceholder={t('searchCountry') || 'Search country...'}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <Link href="/hrms/locations" className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                {t('cancel')}
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? t('creating') : t('create')}
              </button>
            </div>
          </form>
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

