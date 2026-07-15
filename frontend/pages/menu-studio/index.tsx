import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { api } from '@/lib/api';
import Toast from '@/components/Toast';
import PermissionGuard from '@/components/PermissionGuard';
import PageHeader from '@/components/ui/PageHeader';
import {
  MenuSiteRecord,
  PublicMenuData,
  PublicVenue,
} from '@/lib/menu-public';
import {
  ARCHETYPES,
  getArchetype,
  getTemplateComponent,
  resolveTheme,
  SAMPLE_MENU_DATA,
} from '@/components/menu-templates';
import {
  downloadDataUrl,
  downloadSvg,
  generateQrCardPng,
  generateQrCardSvg,
} from '@/lib/menu-qr';

interface RmsMenuSummary {
  id: string;
  name: string;
  isActive: boolean;
}

type SiteForm = Pick<
  MenuSiteRecord,
  | 'slug'
  | 'templateKey'
  | 'themeKey'
  | 'accentColor'
  | 'venueName'
  | 'tagline'
  | 'logoUrl'
  | 'address'
  | 'phone'
  | 'whatsapp'
  | 'instagram'
  | 'wifiName'
  | 'wifiPassword'
  | 'currency'
  | 'showPrices'
  | 'menuIds'
>;

const inputClass =
  'w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500';
const labelClass =
  'block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1';
const sectionClass =
  'rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4';

function toForm(site: MenuSiteRecord): SiteForm {
  return {
    slug: site.slug,
    templateKey: site.templateKey,
    themeKey: site.themeKey,
    accentColor: site.accentColor,
    venueName: site.venueName,
    tagline: site.tagline,
    logoUrl: site.logoUrl,
    address: site.address,
    phone: site.phone,
    whatsapp: site.whatsapp,
    instagram: site.instagram,
    wifiName: site.wifiName,
    wifiPassword: site.wifiPassword,
    currency: site.currency,
    showPrices: site.showPrices,
    menuIds: site.menuIds || [],
  };
}

/** Tiny live preview of an archetype rendered with sample data. */
function TemplateThumb({
  templateKey,
  themeKey,
  accentColor,
}: {
  templateKey: string;
  themeKey: string;
  accentColor: string | null;
}) {
  const theme = resolveTheme(templateKey, themeKey);
  const Template = getTemplateComponent(templateKey);
  const data: PublicMenuData = useMemo(
    () => ({
      ...SAMPLE_MENU_DATA,
      venue: {
        ...SAMPLE_MENU_DATA.venue,
        templateKey,
        themeKey,
        accentColor,
      },
    }),
    [templateKey, themeKey, accentColor],
  );
  return (
    <div
      className="pointer-events-none relative h-40 w-full overflow-hidden rounded-lg"
      style={{ backgroundColor: theme.bg }}
      aria-hidden="true"
    >
      <div
        className="absolute left-1/2 top-0"
        style={{
          width: 390,
          transform: 'translateX(-50%) scale(0.38)',
          transformOrigin: 'top center',
        }}
      >
        <Template data={data} theme={theme} />
      </div>
    </div>
  );
}

export default function MenuStudioPage() {
  const [site, setSite] = useState<MenuSiteRecord | null>(null);
  const [form, setForm] = useState<SiteForm | null>(null);
  const [menus, setMenus] = useState<RmsMenuSummary[]>([]);
  const [preview, setPreview] = useState<PublicMenuData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [downloadingQr, setDownloadingQr] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const loadPreview = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; data: PublicMenuData }>(
        '/menu-sites/preview',
      );
      if (res.success) setPreview(res.data);
    } catch {
      // preview is non-fatal
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [siteRes, menusRes] = await Promise.all([
          api.get<{ success: boolean; data: MenuSiteRecord }>('/menu-sites'),
          api.get<{ success: boolean; data: any[] }>('/rms/menus'),
        ]);
        if (siteRes.success) {
          setSite(siteRes.data);
          setForm(toForm(siteRes.data));
        }
        if (menusRes.success) {
          setMenus(
            (menusRes.data || []).map((m: any) => ({
              id: m.id,
              name: m.name,
              isActive: m.isActive !== false,
            })),
          );
        }
      } catch (err: any) {
        setToast({
          message:
            err?.response?.data?.message || 'Failed to load Menu Studio',
          type: 'error',
        });
      } finally {
        setLoading(false);
      }
      loadPreview();
    })();
  }, [loadPreview]);

  const set = <K extends keyof SiteForm>(key: K, value: SiteForm[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  const dirty = useMemo(() => {
    if (!site || !form) return false;
    return JSON.stringify(toForm(site)) !== JSON.stringify(form);
  }, [site, form]);

  const publicUrl = useMemo(() => {
    const slug = form?.slug || site?.slug || '';
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/m/${slug}`;
    }
    return `/m/${slug}`;
  }, [form?.slug, site?.slug]);

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const res = await api.patch<{
        success: boolean;
        data: MenuSiteRecord;
        message?: string;
      }>('/menu-sites', {
        ...form,
        // Send null-cleared optionals explicitly
        accentColor: form.accentColor || null,
      });
      if (res.success) {
        setSite(res.data);
        setForm(toForm(res.data));
        setToast({ message: 'Saved', type: 'success' });
        loadPreview();
      }
    } catch (err: any) {
      setToast({
        message:
          err?.response?.data?.message ||
          (err?.response?.status === 409
            ? 'That link is already taken — try another slug'
            : 'Failed to save'),
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePublishToggle = async () => {
    if (!site) return;
    setPublishing(true);
    try {
      const res = await api.post<{ success: boolean; data: MenuSiteRecord }>(
        site.isPublished ? '/menu-sites/unpublish' : '/menu-sites/publish',
      );
      if (res.success) {
        setSite(res.data);
        setForm((f) => f || toForm(res.data));
        setToast({
          message: res.data.isPublished
            ? 'Your menu is live!'
            : 'Menu unpublished',
          type: 'success',
        });
      }
    } catch (err: any) {
      setToast({
        message: err?.response?.data?.message || 'Failed to update',
        type: 'error',
      });
    } finally {
      setPublishing(false);
    }
  };

  const handleDownloadQr = async () => {
    if (!form) return;
    setDownloadingQr(true);
    try {
      const [png, svg] = await Promise.all([
        generateQrCardPng(publicUrl, form.venueName),
        generateQrCardSvg(publicUrl, form.venueName),
      ]);
      downloadDataUrl(png, `${form.slug}-menu-qr.png`);
      downloadSvg(svg, `${form.slug}-menu-qr.svg`);
      setToast({ message: 'QR card downloaded (PNG + SVG)', type: 'success' });
    } catch {
      setToast({ message: 'Failed to generate QR code', type: 'error' });
    } finally {
      setDownloadingQr(false);
    }
  };

  // Live preview data: server-assembled menus + local (unsaved) venue edits
  // so template/theme/text changes reflect instantly.
  const previewData: PublicMenuData | null = useMemo(() => {
    if (!preview || !form) return preview;
    const venue: PublicVenue = {
      ...preview.venue,
      name: form.venueName,
      tagline: form.tagline,
      logoUrl: form.logoUrl,
      address: form.address,
      phone: form.phone,
      whatsapp: form.whatsapp,
      instagram: form.instagram,
      wifiName: form.wifiName,
      wifiPassword: form.wifiPassword,
      currency: form.currency,
      showPrices: form.showPrices,
      templateKey: form.templateKey,
      themeKey: form.themeKey,
      accentColor: form.accentColor,
      slug: form.slug,
    };
    return { venue, menus: preview.menus };
  }, [preview, form]);

  const previewTheme = form
    ? resolveTheme(form.templateKey, form.themeKey)
    : null;
  const PreviewTemplate = form ? getTemplateComponent(form.templateKey) : null;
  const archetype = form ? getArchetype(form.templateKey) : null;
  const hasMenuContent = (previewData?.menus?.length ?? 0) > 0;

  if (loading || !form) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-brand-600" />
      </div>
    );
  }

  return (
    <div className="pb-10">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* ── Header ─────────────────────────────────────────────── */}
      <PageHeader
        title="Menu Studio"
        subtitle="Your menu, as a beautiful page guests open by scanning a QR code"
        breadcrumbs={[{ label: 'Menu Studio' }]}
        actions={
          <>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                site?.isPublished
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  site?.isPublished ? 'bg-green-500' : 'bg-gray-400'
                }`}
              />
              {site?.isPublished ? 'Live' : 'Draft'}
            </span>

            {dirty && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="h-8 px-3 rounded-lg bg-brand-600 text-[13px] font-medium text-white hover:bg-brand-700 disabled:opacity-50 flex items-center"
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            )}

            <PermissionGuard permission="settings.edit">
              <button
                onClick={handlePublishToggle}
                disabled={publishing}
                className={`h-8 px-3 rounded-lg text-[13px] font-medium disabled:opacity-50 flex items-center ${
                  site?.isPublished
                    ? 'border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                }`}
              >
                {publishing
                  ? 'Working…'
                  : site?.isPublished
                    ? 'Unpublish'
                    : 'Publish'}
              </button>
            </PermissionGuard>

            <button
              onClick={handleDownloadQr}
              disabled={downloadingQr}
              className="h-8 px-3 rounded-lg border border-gray-300 dark:border-gray-700 text-[13px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 flex items-center"
            >
              {downloadingQr ? 'Generating…' : 'Download QR'}
            </button>

            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="h-8 px-3 rounded-lg border border-gray-300 dark:border-gray-700 text-[13px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center"
            >
              Open public page ↗
            </a>
          </>
        }
      />

      {!site?.isPublished && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          Your menu page isn&apos;t live yet — guests who scan the QR code will
          see &quot;This menu isn&apos;t live yet&quot;. Hit{' '}
          <span className="font-semibold">Publish</span> when you&apos;re
          ready.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr,430px]">
        {/* ── Left: settings ─────────────────────────────────────── */}
        <div className="space-y-5">
          {/* Template picker */}
          <div className={sectionClass}>
            <h2 className="mb-1 text-sm font-bold text-gray-900 dark:text-gray-100">
              Template
            </h2>
            <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
              Six layouts, each with four curated looks
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {ARCHETYPES.map((a) => {
                const selected = form.templateKey === a.key;
                const themeForThumb = selected
                  ? form.themeKey
                  : a.themes[0].key;
                return (
                  <button
                    key={a.key}
                    onClick={() => {
                      set('templateKey', a.key);
                      if (!a.themes.some((t) => t.key === form.themeKey)) {
                        set('themeKey', a.themes[0].key);
                      }
                    }}
                    className={`rounded-xl border-2 p-1.5 text-left transition-colors ${
                      selected
                        ? 'border-brand-600'
                        : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                    }`}
                  >
                    <TemplateThumb
                      templateKey={a.key}
                      themeKey={themeForThumb}
                      accentColor={selected ? form.accentColor : null}
                    />
                    <div className="px-1 pt-1.5 pb-0.5">
                      <div className="text-xs font-bold text-gray-900 dark:text-gray-100">
                        {a.name}
                      </div>
                      <div className="text-[10px] leading-tight text-gray-500 dark:text-gray-400">
                        {a.tagline}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Theme picker for the selected archetype */}
            {archetype && (
              <div className="mt-4">
                <div className={labelClass}>Look</div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {archetype.themes.map((t) => (
                    <button
                      key={t.key}
                      onClick={() => set('themeKey', t.key)}
                      className={`rounded-lg border-2 p-2 text-left ${
                        form.themeKey === t.key
                          ? 'border-brand-600'
                          : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                      }`}
                    >
                      <div className="flex gap-1">
                        <span
                          className="h-5 w-5 rounded-full border border-black/10"
                          style={{ backgroundColor: t.bg }}
                        />
                        <span
                          className="h-5 w-5 rounded-full border border-black/10"
                          style={{ backgroundColor: t.surface }}
                        />
                        <span
                          className="h-5 w-5 rounded-full border border-black/10"
                          style={{ backgroundColor: t.accent }}
                        />
                      </div>
                      <div className="mt-1.5 text-[11px] font-semibold text-gray-800 dark:text-gray-200">
                        {t.name}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Accent override */}
            <div className="mt-4 flex items-end gap-3">
              <div>
                <label className={labelClass}>Accent color (optional)</label>
                <input
                  type="color"
                  value={form.accentColor || previewTheme?.accent || '#2563EB'}
                  onChange={(e) => set('accentColor', e.target.value)}
                  className="h-9 w-16 cursor-pointer rounded border border-gray-300 dark:border-gray-700 bg-transparent"
                />
              </div>
              {form.accentColor && (
                <button
                  onClick={() => set('accentColor', null)}
                  className="pb-1 text-xs font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  Reset to theme default
                </button>
              )}
            </div>
          </div>

          {/* Venue info */}
          <div className={sectionClass}>
            <h2 className="mb-3 text-sm font-bold text-gray-900 dark:text-gray-100">
              Venue
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Venue name</label>
                <input
                  className={inputClass}
                  value={form.venueName}
                  onChange={(e) => set('venueName', e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Tagline</label>
                <input
                  className={inputClass}
                  placeholder="Kitchen & cocktails"
                  value={form.tagline || ''}
                  onChange={(e) => set('tagline', e.target.value || null)}
                />
              </div>
              <div>
                <label className={labelClass}>Logo URL</label>
                <input
                  className={inputClass}
                  placeholder="https://…"
                  value={form.logoUrl || ''}
                  onChange={(e) => set('logoUrl', e.target.value || null)}
                />
              </div>
              <div>
                <label className={labelClass}>Address</label>
                <input
                  className={inputClass}
                  value={form.address || ''}
                  onChange={(e) => set('address', e.target.value || null)}
                />
              </div>
              <div>
                <label className={labelClass}>Currency</label>
                <input
                  className={inputClass}
                  maxLength={5}
                  value={form.currency}
                  onChange={(e) =>
                    set('currency', e.target.value.toUpperCase())
                  }
                />
              </div>
              <div className="flex items-center gap-2 pt-5">
                <input
                  id="showPrices"
                  type="checkbox"
                  checked={form.showPrices}
                  onChange={(e) => set('showPrices', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-brand-600"
                />
                <label
                  htmlFor="showPrices"
                  className="text-sm text-gray-700 dark:text-gray-300"
                >
                  Show prices
                </label>
              </div>
            </div>
          </div>

          {/* Link / slug */}
          <div className={sectionClass}>
            <h2 className="mb-3 text-sm font-bold text-gray-900 dark:text-gray-100">
              Public link
            </h2>
            <label className={labelClass}>Slug</label>
            <input
              className={inputClass}
              value={form.slug}
              onChange={(e) =>
                set(
                  'slug',
                  e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9-]/g, '-')
                    .replace(/-{2,}/g, '-'),
                )
              }
            />
            <p className="mt-2 break-all text-xs text-gray-500 dark:text-gray-400">
              Guests will open:{' '}
              <span className="font-mono font-semibold text-brand-600">
                {publicUrl}
              </span>
            </p>
          </div>

          {/* Menus to publish */}
          <div className={sectionClass}>
            <h2 className="mb-1 text-sm font-bold text-gray-900 dark:text-gray-100">
              Menus to publish
            </h2>
            <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
              Leave all unchecked to publish every active menu
            </p>
            {menus.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-4 text-center text-sm text-gray-500">
                No menus yet.{' '}
                <Link
                  href="/rms/menus"
                  className="font-semibold text-brand-600 hover:underline"
                >
                  Create your first menu →
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {menus.map((m) => {
                  const checked = (form.menuIds || []).includes(m.id);
                  return (
                    <label
                      key={m.id}
                      className="flex items-center gap-2.5 rounded-lg border border-gray-200 dark:border-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-gray-200"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const current = form.menuIds || [];
                          set(
                            'menuIds',
                            e.target.checked
                              ? [...current, m.id]
                              : current.filter((id) => id !== m.id),
                          );
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-brand-600"
                      />
                      <span className="font-medium">{m.name}</span>
                      {!m.isActive && (
                        <span className="ml-auto text-xs text-gray-400">
                          inactive
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Contact & WiFi */}
          <div className={sectionClass}>
            <h2 className="mb-3 text-sm font-bold text-gray-900 dark:text-gray-100">
              Contact & WiFi
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Phone</label>
                <input
                  className={inputClass}
                  placeholder="+234 801 234 5678"
                  value={form.phone || ''}
                  onChange={(e) => set('phone', e.target.value || null)}
                />
              </div>
              <div>
                <label className={labelClass}>WhatsApp</label>
                <input
                  className={inputClass}
                  placeholder="+234 801 234 5678"
                  value={form.whatsapp || ''}
                  onChange={(e) => set('whatsapp', e.target.value || null)}
                />
              </div>
              <div>
                <label className={labelClass}>Instagram</label>
                <input
                  className={inputClass}
                  placeholder="@yourvenue"
                  value={form.instagram || ''}
                  onChange={(e) => set('instagram', e.target.value || null)}
                />
              </div>
              <div />
              <div>
                <label className={labelClass}>WiFi network</label>
                <input
                  className={inputClass}
                  value={form.wifiName || ''}
                  onChange={(e) => set('wifiName', e.target.value || null)}
                />
              </div>
              <div>
                <label className={labelClass}>WiFi password</label>
                <input
                  className={inputClass}
                  value={form.wifiPassword || ''}
                  onChange={(e) => set('wifiPassword', e.target.value || null)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: phone preview ───────────────────────────────── */}
        <div className="xl:sticky xl:top-4 xl:self-start">
          <div className="mx-auto w-[400px] max-w-full">
            <div className="rounded-[2.6rem] border-[10px] border-gray-900 dark:border-gray-700 bg-gray-900 shadow-xl">
              <div className="relative h-[720px] overflow-hidden rounded-[2rem] bg-white">
                {/* notch */}
                <div className="absolute left-1/2 top-0 z-30 h-5 w-32 -translate-x-1/2 rounded-b-2xl bg-gray-900 dark:bg-gray-700" />
                <div className="h-full overflow-y-auto">
                  {previewData && previewTheme && PreviewTemplate ? (
                    hasMenuContent ? (
                      <PreviewTemplate
                        data={previewData}
                        theme={previewTheme}
                      />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center px-8 text-center">
                        <div className="text-4xl" aria-hidden="true">
                          🧾
                        </div>
                        <p className="mt-3 text-sm font-semibold text-gray-800">
                          Nothing to show yet
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          Add items to a menu in RMS and they&apos;ll appear
                          here instantly.
                        </p>
                        <Link
                          href="/rms/menus"
                          className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white"
                        >
                          Go to Menus
                        </Link>
                      </div>
                    )
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-400" />
                    </div>
                  )}
                </div>
              </div>
            </div>
            <p className="mt-3 text-center text-xs text-gray-500 dark:text-gray-400">
              Live preview — exactly what guests see after scanning
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale || 'en', ['common'])),
    },
  };
};
