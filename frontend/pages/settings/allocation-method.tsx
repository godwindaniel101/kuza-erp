import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Toast from '@/components/Toast';

type AllocationMethod = 'FIFO' | 'LIFO' | 'FEFO';

interface MethodOption {
  value: AllocationMethod;
  name: string;
  full: string;
  icon: string;
  tag: string;
  description: string;
  example: string;
}

const METHODS: MethodOption[] = [
  {
    value: 'FIFO',
    name: 'FIFO',
    full: 'First In, First Out',
    icon: 'bx-sort-down',
    tag: 'Most common',
    description: 'The oldest stock is sold first. A safe default for most catalogs.',
    example: 'Stock received Jan 3 is used before stock received Jan 10.',
  },
  {
    value: 'LIFO',
    name: 'LIFO',
    full: 'Last In, First Out',
    icon: 'bx-sort-up',
    tag: 'Accounting',
    description: 'The newest stock is sold first. Used for specific tax or accounting treatments.',
    example: 'Stock received Jan 10 is used before stock received Jan 3.',
  },
  {
    value: 'FEFO',
    name: 'FEFO',
    full: 'First Expiry, First Out',
    icon: 'bx-calendar-exclamation',
    tag: 'Perishables',
    description: 'The stock expiring soonest is sold first. Best for perishable goods.',
    example: 'A batch expiring Feb 1 is used before one expiring Mar 1.',
  },
];

export default function AllocationMethodSettingsPage() {
  const { t } = useTranslation('common');
  const [allocationMethod, setAllocationMethod] = useState<AllocationMethod>('FIFO');
  const [initialMethod, setInitialMethod] = useState<AllocationMethod>('FIFO');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const dirty = allocationMethod !== initialMethod;

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await api.get<{ success: boolean; data: { allocationMethod?: AllocationMethod } }>('/settings');
      if (response.success && response.data?.allocationMethod) {
        setAllocationMethod(response.data.allocationMethod);
        setInitialMethod(response.data.allocationMethod);
      }
    } catch (err) {
      console.error('Failed to load allocation method:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await api.patch<{ success: boolean; message?: string }>('/settings', {
        allocationMethod,
      });

      if (response.success) {
        setInitialMethod(allocationMethod);
        setToast({ message: response.message || t('settingsUpdated') || 'Settings updated successfully', type: 'success' });
      } else {
        setToast({ message: t('failedToUpdateSettings') || 'Failed to update settings', type: 'error' });
      }
    } catch (err: any) {
      console.error('Failed to save allocation method:', err);
      setToast({ message: err.response?.data?.message || t('failedToUpdateSettings') || 'Failed to update settings', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-3xl space-y-5">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <PermissionGuard permission="settings.view">
      <div className="w-full max-w-3xl space-y-5">
        {toast && (
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        )}

        <PageHeader
          title={t('allocationMethod') || 'Allocation Method'}
          subtitle={t('allocationMethodDescription') || 'Choose how stock costs are applied when items go out'}
          breadcrumbs={[{ label: t('configuration') || 'Configuration', href: '/settings/branches' }, { label: t('allocationMethod') || 'Allocation Method' }]}
        />

        {/* Impact note — makes the abstract setting concrete. */}
        <div className="flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-200">
          <i className="bx bx-info-circle mt-0.5 text-lg text-brand-600 dark:text-brand-400"></i>
          <p>
            This decides which stock batch a sale draws from — directly affecting the{' '}
            <span className="font-semibold">cost of goods sold</span> and{' '}
            <span className="font-semibold">profit</span> on every outflow.
          </p>
        </div>

        <fieldset className="space-y-3">
          <legend className="sr-only">{t('selectAllocationMethod') || 'Select allocation method'}</legend>
          {METHODS.map((m) => {
            const selected = allocationMethod === m.value;
            return (
              <label
                key={m.value}
                className={`group relative flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition-all ${
                  selected
                    ? 'border-brand-500 bg-brand-50/60 ring-1 ring-brand-500 dark:border-brand-500 dark:bg-brand-500/10'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600 dark:hover:bg-gray-800/50'
                }`}
              >
                <input
                  type="radio"
                  name="allocationMethod"
                  value={m.value}
                  checked={selected}
                  onChange={(e) => setAllocationMethod(e.target.value as AllocationMethod)}
                  className="sr-only"
                />

                {/* Icon tile */}
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl transition-colors ${
                    selected
                      ? 'bg-brand-gradient text-white'
                      : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
                  }`}
                >
                  <i className={`bx ${m.icon}`}></i>
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{m.name}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">· {m.full}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        selected
                          ? 'bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      }`}
                    >
                      {m.tag}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{m.description}</p>
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-500">
                    <i className="bx bx-right-arrow-alt text-sm"></i>
                    <span className="italic">{m.example}</span>
                  </p>
                </div>

                {/* Selected check */}
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-all ${
                    selected
                      ? 'bg-brand-600 text-white'
                      : 'border border-gray-300 text-transparent dark:border-gray-600'
                  }`}
                >
                  <i className="bx bx-check text-sm"></i>
                </span>
              </label>
            );
          })}
        </fieldset>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3">
          <span className={`text-sm text-amber-600 dark:text-amber-400 transition-opacity ${dirty ? 'opacity-100' : 'opacity-0'}`}>
            <i className="bx bx-error-circle align-middle"></i> {t('unsavedChanges') || 'You have unsaved changes'}
          </span>
          <Button variant="primary" onClick={handleSave} disabled={saving || !dirty}>
            {saving ? (
              <>
                <i className="bx bx-loader-alt bx-spin text-lg"></i>
                <span>{t('saving') || 'Saving...'}</span>
              </>
            ) : (
              <>
                <i className="bx bx-save text-lg"></i>
                <span>{t('save') || 'Save'}</span>
              </>
            )}
          </Button>
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
