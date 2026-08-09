import { useState, useEffect, useCallback } from 'react';
import { GetServerSideProps } from 'next';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/Card';
import Button from '@/components/ui/Button';
import Toast from '@/components/Toast';
import EmptyState from '@/components/ui/EmptyState';
import PermissionGuard from '@/components/PermissionGuard';
import { CardSkeleton } from '@/components/ui/Skeleton';

/**
 * Storefront overview + settings — the home of the `shop` (ecommerce) vertical.
 * An ecommerce tenant lands here after login. It reads the tenant's single
 * store (GET /storefront, auto-created on first read), lets the owner edit its
 * presentation (PUT /storefront), publish/unpublish it, share the public link,
 * and preview the sellable, in-stock products it will list.
 *
 * Phase 1 scope: no per-item listing toggles, no orders, no public store page —
 * those come in Phase 2/3. Catalog/stock is managed on the shared /ims pages.
 */

const TEMPLATE_KEYS = ['grid', 'list', 'showcase'] as const;

interface StorefrontSite {
  slug: string;
  isPublished: boolean;
  storeName: string;
  description: string | null;
  logoUrl: string | null;
  heroImageUrl: string | null;
  accentColor: string | null;
  templateKey: string;
  showPrices: boolean;
  whatsapp: string | null;
  instagram: string | null;
  phone: string | null;
  email: string | null;
  currency: string;
  publicUrl?: string;
}

interface StorefrontProduct {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  currentStock: number;
  category: string | null;
}

// The subset of the store the owner edits here (mirrors UpdateStorefrontDto).
interface StoreForm {
  storeName: string;
  slug: string;
  description: string;
  templateKey: string;
  accentColor: string;
  showPrices: boolean;
  whatsapp: string;
  instagram: string;
  phone: string;
  email: string;
}

const emptyForm: StoreForm = {
  storeName: '',
  slug: '',
  description: '',
  templateKey: 'grid',
  accentColor: '',
  showPrices: true,
  whatsapp: '',
  instagram: '',
  phone: '',
  email: '',
};

function toForm(site: StorefrontSite): StoreForm {
  return {
    storeName: site.storeName || '',
    slug: site.slug || '',
    description: site.description || '',
    templateKey: site.templateKey || 'grid',
    accentColor: site.accentColor || '',
    showPrices: site.showPrices !== false,
    whatsapp: site.whatsapp || '',
    instagram: site.instagram || '',
    phone: site.phone || '',
    email: site.email || '',
  };
}

const inputClass =
  'h-10 w-full !max-w-none px-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-[13px] text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:border-transparent';
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5';

export default function StorefrontOverviewPage() {
  const { t } = useTranslation('common');

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [site, setSite] = useState<StorefrontSite | null>(null);
  const [form, setForm] = useState<StoreForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [products, setProducts] = useState<StorefrontProduct[]>([]);
  const [publicBase, setPublicBase] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Public link base: prefer the configured public origin, else the browser's.
  useEffect(() => {
    const configured = process.env.NEXT_PUBLIC_SITE_URL;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    setPublicBase((configured || origin).replace(/\/+$/, ''));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await api.get<{ success: boolean; data: StorefrontSite }>('/storefront');
      if (res.success && res.data) {
        setSite(res.data);
        setForm(toForm(res.data));
      } else {
        setLoadError(true);
      }
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
    // Products are best-effort — a store with no sellable stock is still valid.
    try {
      const res = await api.get<{ success: boolean; data: StorefrontProduct[] }>('/storefront/products');
      if (res.success && Array.isArray(res.data)) setProducts(res.data);
    } catch {
      /* ignore — the products summary just stays empty */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setField = <K extends keyof StoreForm>(key: K, value: StoreForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Send only the editable fields; empty optional strings become null so
      // the owner can clear a value.
      const payload = {
        storeName: form.storeName.trim(),
        slug: form.slug.trim(),
        description: form.description.trim() || null,
        templateKey: form.templateKey,
        accentColor: form.accentColor.trim() || null,
        showPrices: form.showPrices,
        whatsapp: form.whatsapp.trim() || null,
        instagram: form.instagram.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
      };
      const res = await api.put<{ success: boolean; data: StorefrontSite }>('/storefront', payload);
      if (res.success && res.data) {
        setSite(res.data);
        setForm(toForm(res.data));
        setToast({ message: t('storefront.saved', 'Storefront saved'), type: 'success' });
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setToast({
        message: typeof msg === 'string' ? msg : t('storefront.saveFailed', 'Could not save your storefront'),
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePublishToggle = async () => {
    if (!site) return;
    const next = !site.isPublished;
    setPublishing(true);
    try {
      const res = await api.post<{ success: boolean; data: StorefrontSite }>(
        next ? '/storefront/publish' : '/storefront/unpublish',
      );
      if (res.success && res.data) {
        setSite(res.data);
        setForm(toForm(res.data));
        setToast({
          message: next
            ? t('storefront.published', 'Your storefront is live')
            : t('storefront.unpublished', 'Your storefront is offline'),
          type: 'success',
        });
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setToast({
        message: typeof msg === 'string' ? msg : t('storefront.publishFailed', 'Could not update publish status'),
        type: 'error',
      });
    } finally {
      setPublishing(false);
    }
  };

  const publicLink = site?.slug ? `${publicBase}/s/${site.slug}` : '';

  const copyLink = async () => {
    if (!publicLink) return;
    try {
      await navigator.clipboard.writeText(publicLink);
      setToast({ message: t('storefront.linkCopied', 'Link copied'), type: 'success' });
    } catch {
      setToast({ message: t('storefront.copyFailed', 'Could not copy the link'), type: 'error' });
    }
  };

  const published = !!site?.isPublished;

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('storefront.title', 'Storefront')}
        subtitle={t('storefront.subtitle', 'Sell online on your live stock')}
        actions={
          site && (
            <PermissionGuard permission="storefront.publish">
              <Button
                variant={published ? 'secondary' : 'primary'}
                loading={publishing}
                onClick={handlePublishToggle}
              >
                <i className={`bx ${published ? 'bx-cloud-download' : 'bx-cloud-upload'}`} aria-hidden="true" />
                {published ? t('storefront.unpublish', 'Unpublish') : t('storefront.publish', 'Publish')}
              </Button>
            </PermissionGuard>
          )
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : loadError || !site ? (
        <EmptyState
          icon="bx-store"
          title={t('storefront.setupTitle', 'Set up your storefront')}
          description={t(
            'storefront.setupDescription',
            "We couldn't load your storefront just yet. Refresh to try again — your store is created automatically the first time it loads.",
          )}
          actions={
            <Button variant="primary" onClick={load}>
              <i className="bx bx-refresh" aria-hidden="true" /> {t('storefront.retry', 'Try again')}
            </Button>
          }
        />
      ) : (
        <>
          {/* Status + shareable link */}
          <Card>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    published
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${published ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                  {published ? t('storefront.statusLive', 'Published') : t('storefront.statusDraft', 'Draft')}
                </span>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {published
                    ? t('storefront.liveHint', 'Your store is live and shoppable.')
                    : t('storefront.draftHint', 'Publish to make your store shoppable.')}
                </p>
              </div>
            </div>

            {published && publicLink && (
              <div className="mt-4 flex flex-col gap-2 rounded-xl bg-gray-50 p-3 dark:bg-gray-800/60 sm:flex-row sm:items-center">
                <code className="min-w-0 flex-1 truncate text-[13px] text-gray-700 dark:text-gray-300">{publicLink}</code>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={copyLink}>
                    <i className="bx bx-copy" aria-hidden="true" /> {t('storefront.copyLink', 'Copy')}
                  </Button>
                  <a
                    href={publicLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10"
                  >
                    <i className="bx bx-link-external" aria-hidden="true" /> {t('storefront.visit', 'Visit')}
                  </a>
                </div>
              </div>
            )}
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Settings form */}
            <form onSubmit={handleSave} className="lg:col-span-2">
              <Card title={t('storefront.settings', 'Store settings')} subtitle={t('storefront.settingsHint', 'How your store looks and how buyers reach you')}>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="storeName" className={labelClass}>
                      {t('storefront.storeName', 'Store name')}
                    </label>
                    <input
                      id="storeName"
                      className={inputClass}
                      value={form.storeName}
                      onChange={(e) => setField('storeName', e.target.value)}
                      placeholder={t('storefront.storeNamePlaceholder', 'My Store')}
                    />
                  </div>

                  <div>
                    <label htmlFor="slug" className={labelClass}>
                      {t('storefront.slug', 'Store link')}
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 text-[13px] text-gray-400">{publicBase}/s/</span>
                      <input
                        id="slug"
                        className={inputClass}
                        value={form.slug}
                        onChange={(e) => setField('slug', e.target.value)}
                        placeholder="my-store"
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-400">
                      {t('storefront.slugHint', 'Lowercase letters, numbers and hyphens only.')}
                    </p>
                  </div>

                  <div>
                    <label htmlFor="description" className={labelClass}>
                      {t('storefront.description', 'Description')}
                    </label>
                    <textarea
                      id="description"
                      rows={3}
                      className={`${inputClass} h-auto py-2`}
                      value={form.description}
                      onChange={(e) => setField('description', e.target.value)}
                      placeholder={t('storefront.descriptionPlaceholder', 'Tell buyers what you sell')}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="templateKey" className={labelClass}>
                        {t('storefront.template', 'Layout')}
                      </label>
                      <select
                        id="templateKey"
                        className={inputClass}
                        value={form.templateKey}
                        onChange={(e) => setField('templateKey', e.target.value)}
                      >
                        {TEMPLATE_KEYS.map((k) => (
                          <option key={k} value={k}>
                            {t(`storefront.template.${k}`, k.charAt(0).toUpperCase() + k.slice(1))}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="accentColor" className={labelClass}>
                        {t('storefront.accentColor', 'Accent color')}
                      </label>
                      <input
                        id="accentColor"
                        className={inputClass}
                        value={form.accentColor}
                        onChange={(e) => setField('accentColor', e.target.value)}
                        placeholder="#C9A227"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="whatsapp" className={labelClass}>
                        {t('storefront.whatsapp', 'WhatsApp')}
                      </label>
                      <input id="whatsapp" className={inputClass} value={form.whatsapp} onChange={(e) => setField('whatsapp', e.target.value)} placeholder="+234…" />
                    </div>
                    <div>
                      <label htmlFor="instagram" className={labelClass}>
                        {t('storefront.instagram', 'Instagram')}
                      </label>
                      <input id="instagram" className={inputClass} value={form.instagram} onChange={(e) => setField('instagram', e.target.value)} placeholder="@yourstore" />
                    </div>
                    <div>
                      <label htmlFor="phone" className={labelClass}>
                        {t('storefront.phone', 'Phone')}
                      </label>
                      <input id="phone" className={inputClass} value={form.phone} onChange={(e) => setField('phone', e.target.value)} placeholder="+234…" />
                    </div>
                    <div>
                      <label htmlFor="email" className={labelClass}>
                        {t('storefront.email', 'Email')}
                      </label>
                      <input id="email" type="email" className={inputClass} value={form.email} onChange={(e) => setField('email', e.target.value)} placeholder="hello@store.com" />
                    </div>
                  </div>

                  <label className="flex items-center gap-2.5 pt-1">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-brand-600 focus-visible:ring-brand-500"
                      checked={form.showPrices}
                      onChange={(e) => setField('showPrices', e.target.checked)}
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {t('storefront.showPrices', 'Show prices on the storefront')}
                    </span>
                  </label>
                </div>

                <div className="mt-5 flex justify-end border-t border-gray-100 pt-4 dark:border-gray-800">
                  <PermissionGuard permission="storefront.manage">
                    <Button type="submit" variant="primary" loading={saving}>
                      {t('storefront.save', 'Save changes')}
                    </Button>
                  </PermissionGuard>
                </div>
              </Card>
            </form>

            {/* Products summary */}
            <Card
              title={t('storefront.products', 'Products')}
              subtitle={t('storefront.productsHint', 'Sellable, in-stock items your store lists')}
            >
              <div className="mb-3 flex items-baseline gap-2">
                <span className="font-display text-2xl font-bold tabular-nums tracking-tight text-gray-900 dark:text-gray-100">
                  {products.length}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {t('storefront.listed', 'listed')}
                </span>
              </div>

              {products.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('storefront.noProducts', 'No sellable, in-stock products yet. Add stock in Inventory and they appear here automatically.')}
                </p>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {products.slice(0, 5).map((p) => (
                    <div key={p.id} className="flex items-center gap-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{p.name}</p>
                        {p.category && <p className="truncate text-xs text-gray-500">{p.category}</p>}
                      </div>
                      <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                        {formatMoney(p.price, site.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <p className="mt-4 border-t border-gray-100 pt-3 text-xs text-gray-400 dark:border-gray-800">
                {t('storefront.togglesComingSoon', 'Per-item listing toggles are coming next.')}
              </p>
            </Card>
          </div>
        </>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => ({
  props: { ...(await serverSideTranslations(locale || 'en', ['common'])) },
});
