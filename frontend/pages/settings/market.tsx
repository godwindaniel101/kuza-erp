import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Toast from '@/components/Toast';

type AvailabilityMode = 'auto_in_stock' | 'manual';
type VisibilityMode = 'public' | 'connections' | 'manual';

interface Option<T extends string> {
  value: T;
  name: string;
  icon: string;
  tag: string;
  description: string;
  example: string;
}

const AVAILABILITY_OPTIONS: Option<AvailabilityMode>[] = [
  {
    value: 'auto_in_stock',
    name: 'Automatic — when in stock',
    icon: 'bx-cube',
    tag: 'Recommended',
    description: 'An item is offered on the market whenever it has stock in any branch. Nothing to toggle per item.',
    example: 'Add stock → it appears on the market; sells out → it drops off automatically.',
  },
  {
    value: 'manual',
    name: 'Manual',
    icon: 'bx-slider-alt',
    tag: 'Full control',
    description: 'You switch each item on yourself — the per-item availability control appears when listing.',
    example: 'Only items you explicitly list show on the market.',
  },
];

const VISIBILITY_OPTIONS: Option<VisibilityMode>[] = [
  {
    value: 'public',
    name: 'Public',
    icon: 'bx-globe',
    tag: 'Default',
    description: 'Visible to everyone on the marketplace.',
    example: 'Any business browsing the market can find your listings.',
  },
  {
    value: 'connections',
    name: 'Connections only',
    icon: 'bx-link',
    tag: 'Private',
    description: 'Visible only to businesses you are partnered with.',
    example: 'A buyer must be a connection to see your catalog.',
  },
  {
    value: 'manual',
    name: 'Manual per item',
    icon: 'bx-slider-alt',
    tag: 'Per item',
    description: 'Choose public or private on each item — the per-item control appears when listing.',
    example: 'Some items public, others private — your call each time.',
  },
];

/** A selectable card matching the Allocation Method page for consistency. */
function OptionCard<T extends string>({
  option,
  selected,
  name,
  onSelect,
}: {
  option: Option<T>;
  selected: boolean;
  name: string;
  onSelect: (v: T) => void;
}) {
  return (
    <label
      className={`group relative flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition-all ${
        selected
          ? 'border-brand-500 bg-brand-50/60 ring-1 ring-brand-500 dark:border-brand-500 dark:bg-brand-500/10'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600 dark:hover:bg-gray-800/50'
      }`}
    >
      <input
        type="radio"
        name={name}
        value={option.value}
        checked={selected}
        onChange={() => onSelect(option.value)}
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
        <i className={`bx ${option.icon}`}></i>
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-gray-900 dark:text-gray-100">{option.name}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
              selected
                ? 'bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
            }`}
          >
            {option.tag}
          </span>
        </div>
        <p className="mt-1 flex items-start gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <i className="bx bx-right-arrow-alt mt-0.5 shrink-0 text-sm"></i>
          <span className="italic">
            {option.description} {option.example}
          </span>
        </p>
      </div>

      {/* Selected check */}
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-all ${
          selected ? 'bg-brand-600 text-white' : 'border border-gray-300 text-transparent dark:border-gray-600'
        }`}
      >
        <i className="bx bx-check text-sm"></i>
      </span>
    </label>
  );
}

export default function MarketSettingsPage() {
  const { t } = useTranslation('common');
  const tr = (k: string, d: string) => {
    const v = t(k);
    return !v || v === k ? d : v;
  };

  const [availabilityMode, setAvailabilityMode] = useState<AvailabilityMode>('auto_in_stock');
  const [visibilityMode, setVisibilityMode] = useState<VisibilityMode>('public');
  const [initial, setInitial] = useState<{ a: AvailabilityMode; v: VisibilityMode }>({
    a: 'auto_in_stock',
    v: 'public',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Storefront toggles (instant-save to /network/me), moved here from the Market page.
  const [isSupplier, setIsSupplier] = useState(false);
  const [publicCatalog, setPublicCatalog] = useState(false);

  const dirty = availabilityMode !== initial.a || visibilityMode !== initial.v;

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<{ success: boolean; data: { availabilityMode?: AvailabilityMode; visibilityMode?: VisibilityMode } }>(
          '/network/market-settings',
        );
        if (res.success && res.data) {
          const a = res.data.availabilityMode || 'auto_in_stock';
          const v = res.data.visibilityMode || 'public';
          setAvailabilityMode(a);
          setVisibilityMode(v);
          setInitial({ a, v });
        }
      } catch {
        // Defaults stand if settings can't load.
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Storefront profile loads independently (JWT-only, non-critical).
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<{ success: boolean; data: { isSupplier?: boolean; publicCatalog?: boolean } }>(
          '/network/me',
        );
        if (res.success && res.data) {
          setIsSupplier(!!res.data.isSupplier);
          setPublicCatalog(!!res.data.publicCatalog);
        }
      } catch {
        /* non-critical */
      }
    })();
  }, []);

  // Each storefront toggle saves immediately (optimistic, reverts on failure).
  const toggleStorefront = async (key: 'isSupplier' | 'publicCatalog', value: boolean) => {
    const set = key === 'isSupplier' ? setIsSupplier : setPublicCatalog;
    set(value);
    try {
      await api.patch('/network/me', { [key]: value });
    } catch {
      set(!value);
      setToast({ message: tr('market.storefrontSaveFailed', 'Could not update storefront'), type: 'error' });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.patch<{ success: boolean; message?: string }>('/network/market-settings', {
        availabilityMode,
        visibilityMode,
      });
      if (res.success) {
        setInitial({ a: availabilityMode, v: visibilityMode });
        setToast({ message: res.message || tr('settingsUpdated', 'Settings updated successfully'), type: 'success' });
      } else {
        setToast({ message: tr('failedToUpdateSettings', 'Failed to update settings'), type: 'error' });
      }
    } catch (err: any) {
      setToast({ message: err?.response?.data?.message || tr('failedToUpdateSettings', 'Failed to update settings'), type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-2xl space-y-5">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <PermissionGuard permission="settings.view">
      <div className="w-full max-w-2xl space-y-5">
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

        <PageHeader
          title={tr('nav.marketSetup', 'Market Setup')}
          subtitle={tr('market.settingsSubtitle', 'Set once how your items reach the marketplace — no need to configure each item.')}
          breadcrumbs={[
            { label: tr('configuration', 'Configuration'), href: '/settings/branches' },
            { label: tr('nav.marketSetup', 'Market Setup') },
          ]}
        />

        {/* Your storefront — instant-save toggles (moved from the Market page) */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {tr('market.storefront', 'Your storefront')}
            <span className="ml-2 font-normal text-gray-500 dark:text-gray-400">
              · {tr('market.storefrontDesc', 'How your business appears on the marketplace')}
            </span>
          </legend>

          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600 dark:hover:bg-gray-800/50">
            <input
              type="checkbox"
              checked={isSupplier}
              onChange={(e) => toggleStorefront('isSupplier', e.target.checked)}
              className="mt-0.5 h-4 w-4 cursor-pointer rounded border-gray-300 text-brand-600 focus-visible:ring-brand-500 dark:border-gray-600 dark:bg-gray-700"
            />
            <span className="min-w-0">
              <span className="block font-medium text-gray-900 dark:text-gray-100">
                {tr('market.listAsSupplier', 'List my business as a supplier')}
              </span>
              <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
                {tr('market.listAsSupplierDesc', 'Let other businesses discover and buy from you on the market.')}
              </span>
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600 dark:hover:bg-gray-800/50">
            <input
              type="checkbox"
              checked={publicCatalog}
              onChange={(e) => toggleStorefront('publicCatalog', e.target.checked)}
              className="mt-0.5 h-4 w-4 cursor-pointer rounded border-gray-300 text-brand-600 focus-visible:ring-brand-500 dark:border-gray-600 dark:bg-gray-700"
            />
            <span className="min-w-0">
              <span className="block font-medium text-gray-900 dark:text-gray-100">
                {tr('market.publicCatalog', 'Show my catalog publicly')}
              </span>
              <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
                {tr('market.publicCatalogDesc', 'Anyone browsing the market can see your listed items.')}
              </span>
            </span>
          </label>
        </fieldset>

        {/* Availability */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {tr('market.availabilityTitle', 'Listing availability')}
            <span className="ml-2 font-normal text-gray-500 dark:text-gray-400">
              · {tr('market.availabilityDesc', 'When is an item offered on the market?')}
            </span>
          </legend>
          {AVAILABILITY_OPTIONS.map((o) => (
            <OptionCard
              key={o.value}
              option={o}
              name="availability"
              selected={availabilityMode === o.value}
              onSelect={setAvailabilityMode}
            />
          ))}
        </fieldset>

        {/* Visibility */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {tr('market.visibilityTitle', 'Listing visibility')}
            <span className="ml-2 font-normal text-gray-500 dark:text-gray-400">
              · {tr('market.visibilityDesc', 'Who can see your listings?')}
            </span>
          </legend>
          {VISIBILITY_OPTIONS.map((o) => (
            <OptionCard
              key={o.value}
              option={o}
              name="visibility"
              selected={visibilityMode === o.value}
              onSelect={setVisibilityMode}
            />
          ))}
        </fieldset>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3">
          <span className={`text-sm text-amber-600 dark:text-amber-400 transition-opacity ${dirty ? 'opacity-100' : 'opacity-0'}`}>
            <i className="bx bx-error-circle align-middle"></i> {tr('unsavedChanges', 'You have unsaved changes')}
          </span>
          <Button variant="primary" onClick={handleSave} disabled={saving || !dirty}>
            {saving ? (
              <>
                <i className="bx bx-loader-alt bx-spin text-lg"></i>
                <span>{tr('saving', 'Saving...')}</span>
              </>
            ) : (
              <>
                <i className="bx bx-save text-lg"></i>
                <span>{tr('save', 'Save')}</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </PermissionGuard>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => ({
  props: { ...(await serverSideTranslations(locale ?? 'en', ['common'])) },
});
