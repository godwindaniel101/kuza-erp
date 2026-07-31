import { useState, useEffect, ReactNode } from 'react';
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
    example: 'Add stock → it appears; sells out → it drops off automatically.',
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

/**
 * A section container matching the Apps settings cards: a padded header (title,
 * subtitle, optional right-side hint) over a divided body. Keeps every block on
 * this page visually consistent instead of mixing boxed and loose sections.
 */
function SectionCard({
  title,
  subtitle,
  hint,
  children,
}: {
  title: string;
  subtitle: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-gray-950/[0.04] dark:bg-gray-900 dark:ring-gray-800">
      <div className="flex items-start justify-between gap-3 px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
        </div>
        {hint && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            <i className="bx bx-check text-xs"></i> {hint}
          </span>
        )}
      </div>
      <div className="border-t border-gray-100 dark:border-gray-800">{children}</div>
    </section>
  );
}

/** A single "choose one" option, rendered as a light row inside a SectionCard. */
function OptionRow<T extends string>({
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
      className={`group relative flex cursor-pointer items-start gap-3.5 px-5 py-4 transition-colors ${
        selected ? 'bg-brand-50/60 dark:bg-brand-500/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'
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

      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg transition-colors ${
          selected
            ? 'bg-brand-gradient text-white'
            : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
        }`}
      >
        <i className={`bx ${option.icon}`}></i>
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{option.name}</span>
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
        <p className="mt-1 text-xs leading-5 text-gray-600 dark:text-gray-300">{option.description}</p>
        <p className="mt-1 flex items-start gap-1.5 text-xs text-gray-400 dark:text-gray-500">
          <i className="bx bx-right-arrow-alt mt-0.5 shrink-0"></i>
          <span>{option.example}</span>
        </p>
      </div>

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

/** On/off switch, matching the Apps settings page. */
function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
        checked ? 'bg-brand-600' : 'bg-gray-200 dark:bg-gray-700'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-150 ${
          checked ? 'translate-x-[18px]' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

/** A labelled row with a switch, used for the auto-saved storefront toggles. */
function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4">
      <span className="min-w-0">
        <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">{label}</span>
        <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">{description}</span>
      </span>
      <Switch checked={checked} onChange={onChange} label={label} />
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
      <div className="w-full max-w-2xl">
        <div className="py-12 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-brand-600"></div>
        </div>
      </div>
    );
  }

  return (
    <PermissionGuard permission="settings.view">
      <div className="w-full max-w-2xl space-y-6">
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

        <PageHeader
          title={tr('nav.marketSetup', 'Market Setup')}
          subtitle={tr('market.settingsSubtitle', 'Set once how your items reach the marketplace — no need to configure each item.')}
          breadcrumbs={[
            { label: tr('configuration', 'Configuration'), href: '/settings/branches' },
            { label: tr('nav.marketSetup', 'Market Setup') },
          ]}
        />

        {/* 1 — Your storefront (auto-saved switches) */}
        <SectionCard
          title={tr('market.storefront', 'Your storefront')}
          subtitle={tr('market.storefrontDesc', 'How your business appears on the marketplace')}
          hint={tr('market.autoSaved', 'Saved automatically')}
        >
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            <ToggleRow
              label={tr('market.listAsSupplier', 'List my business as a supplier')}
              description={tr('market.listAsSupplierDesc', 'Let other businesses discover and buy from you on the market.')}
              checked={isSupplier}
              onChange={(v) => toggleStorefront('isSupplier', v)}
            />
            <ToggleRow
              label={tr('market.publicCatalog', 'Show my catalog publicly')}
              description={tr('market.publicCatalogDesc', 'Anyone browsing the market can see your listed items.')}
              checked={publicCatalog}
              onChange={(v) => toggleStorefront('publicCatalog', v)}
            />
          </div>
        </SectionCard>

        {/* 2 — Listing availability */}
        <SectionCard
          title={tr('market.availabilityTitle', 'Listing availability')}
          subtitle={tr('market.availabilityDesc', 'When is an item offered on the market?')}
        >
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {AVAILABILITY_OPTIONS.map((o) => (
              <OptionRow
                key={o.value}
                option={o}
                name="availability"
                selected={availabilityMode === o.value}
                onSelect={setAvailabilityMode}
              />
            ))}
          </div>
        </SectionCard>

        {/* 3 — Listing visibility */}
        <SectionCard
          title={tr('market.visibilityTitle', 'Listing visibility')}
          subtitle={tr('market.visibilityDesc', 'Who can see your listings?')}
        >
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {VISIBILITY_OPTIONS.map((o) => (
              <OptionRow
                key={o.value}
                option={o}
                name="visibility"
                selected={visibilityMode === o.value}
                onSelect={setVisibilityMode}
              />
            ))}
          </div>
        </SectionCard>

        {/* Save — only availability & visibility need it (storefront auto-saves) */}
        <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-5 dark:border-gray-800">
          <span className={`text-sm text-amber-600 transition-opacity dark:text-amber-400 ${dirty ? 'opacity-100' : 'opacity-0'}`}>
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
