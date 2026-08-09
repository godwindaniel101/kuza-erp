import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { api } from '@/lib/api';
import Toast from '@/components/Toast';
import PermissionGuard from '@/components/PermissionGuard';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import { resolveImageUrl } from '@/lib/format';
import {
  MenuSiteRecord,
  PublicMenuData,
  PublicVenue,
} from '@/lib/menu-public';
import {
  ARCHETYPES,
  ARCHETYPE_GROUPS,
  getArchetype,
  getTemplateComponent,
  resolveTheme,
  SAMPLE_MENU_DATA,
} from '@/components/menu-templates';
import type { ArchetypeGroup } from '@/components/menu-templates';
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
  | 'facebook'
  | 'tiktok'
  | 'twitter'
  | 'feedbackUrl'
  | 'wifiName'
  | 'wifiPassword'
  | 'currency'
  | 'showPrices'
  | 'menuIds'
>;

const inputClass =
  'h-9 w-full !max-w-none rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-accent-ring focus:border-accent';
const labelClass =
  'block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1';
const sectionClass =
  'rounded-2xl bg-white dark:bg-gray-900 ring-1 ring-gray-950/[0.04] dark:ring-gray-800 shadow-card p-6';

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
    facebook: site.facebook,
    tiktok: site.tiktok,
    twitter: site.twitter,
    feedbackUrl: site.feedbackUrl,
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
  const [templateGroup, setTemplateGroup] = useState<ArchetypeGroup>('Elegant');
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [downloadingQr, setDownloadingQr] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
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
          // Coming from menu create/edit: pre-include that menu in the QR site.
          const menuId =
            typeof window !== 'undefined'
              ? new URLSearchParams(window.location.search).get('menuId')
              : null;
          const base = toForm(siteRes.data);
          if (menuId && !(base.menuIds || []).includes(menuId)) {
            base.menuIds = [...(base.menuIds || []), menuId];
          }
          setForm(base);
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

  const handleLogoUpload = async (file: File | null | undefined) => {
    if (!file) return;
    setUploadingLogo(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      const res = await api.post<{ success: boolean; url: string }>(
        '/menu-sites/logo',
        { dataUrl },
      );
      set('logoUrl', res.url);
      setToast({ message: 'Logo uploaded', type: 'success' });
    } catch (err: any) {
      setToast({
        message: err?.response?.data?.message || 'Failed to upload logo',
        type: 'error',
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  // Keep the template-group tab in sync with the selected template.
  useEffect(() => {
    if (form?.templateKey) {
      setTemplateGroup(getArchetype(form.templateKey).group);
    }
  }, [form?.templateKey]);

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
    if (!site || !form) return;
    const goingLive = !site.isPublished;
    setPublishing(true);
    try {
      // Publishing must persist the current form FIRST — otherwise the edited
      // slug, template and included menus are dropped, so the slug never gets
      // routed (public page 404s → "not live") and the public template is stale.
      if (goingLive) {
        const saveRes = await api.patch<{ success: boolean; data: MenuSiteRecord }>('/menu-sites', {
          ...form,
          accentColor: form.accentColor || null,
        });
        if (saveRes.success) {
          setSite(saveRes.data);
          setForm(toForm(saveRes.data));
        }
      }
      const res = await api.post<{ success: boolean; data: MenuSiteRecord }>(
        goingLive ? '/menu-sites/publish' : '/menu-sites/unpublish',
      );
      if (res.success) {
        setSite(res.data);
        setForm(toForm(res.data));
        setToast({
          message: res.data.isPublished ? 'Your menu is live!' : 'Menu unpublished',
          type: 'success',
        });
      }
    } catch (err: any) {
      setToast({
        message:
          err?.response?.data?.message ||
          (err?.response?.status === 409
            ? 'That link is already taken — try another slug'
            : 'Failed to update'),
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
      facebook: form.facebook,
      tiktok: form.tiktok,
      twitter: form.twitter,
      feedbackUrl: form.feedbackUrl,
      wifiName: form.wifiName,
      wifiPassword: form.wifiPassword,
      currency: form.currency,
      showPrices: form.showPrices,
      templateKey: form.templateKey,
      themeKey: form.themeKey,
      accentColor: form.accentColor,
      slug: form.slug,
    };
    // Resolve backend-relative "/uploads/..." image paths to the API origin so
    // dish photos load in the phone preview (backend sends them relative).
    const menus = preview.menus.map((menu) => ({
      ...menu,
      categories: menu.categories.map((cat) => ({
        ...cat,
        items: cat.items.map((it) => ({
          ...it,
          imageUrl: it.imageUrl ? resolveImageUrl(it.imageUrl) : null,
        })),
      })),
    }));
    return { venue, menus };
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
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-accent" />
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
              <Button
                variant="primary"
                size="sm"
                onClick={handleSave}
                loading={saving}
              >
                {saving ? 'Saving…' : 'Save changes'}
              </Button>
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

            <Button
              variant="secondary"
              size="sm"
              onClick={handleDownloadQr}
              loading={downloadingQr}
            >
              {downloadingQr ? 'Generating…' : 'Download QR'}
            </Button>

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

      <div className="kz-stagger space-y-4">
      {!site?.isPublished && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          Your menu page isn&apos;t live yet — guests who scan the QR code will
          see &quot;This menu isn&apos;t live yet&quot;. Hit{' '}
          <span className="font-semibold">Publish</span> when you&apos;re
          ready.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr,430px]">
        {/* ── Left: settings ─────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Step nav — free navigation, any step clickable anytime */}
          <div className={sectionClass}>
            <div className="flex items-center">
              {([
                { n: 1, label: 'Template' },
                { n: 2, label: 'Venue Details' },
                { n: 3, label: 'Contact & Social' },
              ] as const).map((s, i) => {
                const active = step === s.n;
                const done = step > s.n;
                return (
                  <div key={s.n} className="flex flex-1 items-center">
                    <button
                      type="button"
                      onClick={() => setStep(s.n)}
                      className="flex items-center gap-2 text-left"
                    >
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums transition-colors ${
                          active
                            ? 'bg-accent text-accent-fg'
                            : done
                              ? 'bg-accent-soft text-accent'
                              : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                        }`}
                      >
                        {s.n}
                      </span>
                      <span
                        className={`hidden text-xs font-semibold sm:inline ${
                          active
                            ? 'text-gray-900 dark:text-gray-100'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {s.label}
                      </span>
                    </button>
                    {i < 2 && (
                      <span className="mx-2 h-px flex-1 bg-gray-200 dark:bg-gray-800" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 1 — Template */}
          {step === 1 && (
          <div className={sectionClass}>
            <h2 className="mb-1 font-display text-[15px] font-semibold tracking-tight text-gray-900 dark:text-gray-100">
              Template
            </h2>
            <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
              Ten layouts across five styles — each with curated looks
            </p>

            {/* Style tabs */}
            <div className="mb-3 flex gap-1 overflow-x-auto border-b border-gray-200 dark:border-gray-800">
              {ARCHETYPE_GROUPS.map((group) => {
                const on = templateGroup === group;
                return (
                  <button
                    key={group}
                    type="button"
                    onClick={() => setTemplateGroup(group)}
                    className={`-mb-px shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-xs font-semibold transition-colors ${
                      on
                        ? 'border-accent text-accent'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                  >
                    {group}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {ARCHETYPES.filter((a) => a.group === templateGroup).map((a) => {
                const selected = form.templateKey === a.key;
                const themeForThumb = selected ? form.themeKey : a.themes[0].key;
                return (
                  <button
                    key={a.key}
                    onClick={() => {
                      set('templateKey', a.key);
                      if (!a.themes.some((t) => t.key === form.themeKey)) {
                        set('themeKey', a.themes[0].key);
                      }
                    }}
                    className={`kz-lift rounded-xl p-1.5 text-left ring-1 transition-shadow ${
                      selected
                        ? 'ring-2 ring-accent'
                        : 'ring-gray-200 dark:ring-gray-800 hover:ring-gray-300 dark:hover:ring-gray-700'
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
                      className={`kz-lift rounded-lg p-2 text-left ring-1 transition-shadow ${
                        form.themeKey === t.key
                          ? 'ring-2 ring-accent'
                          : 'ring-gray-200 dark:ring-gray-800 hover:ring-gray-300 dark:hover:ring-gray-700'
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
          )}

          {/* Step 2 — Venue Details (+ public link) */}
          {step === 2 && (
          <>
          {/* Venue info */}
          <div className={sectionClass}>
            <h2 className="mb-3 font-display text-[15px] font-semibold tracking-tight text-gray-900 dark:text-gray-100">
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
                <label className={labelClass}>Logo</label>
                <div className="flex items-center gap-3">
                  {form.logoUrl ? (
                    <div className="flex items-center gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={resolveImageUrl(form.logoUrl) || ''}
                        alt="Logo preview"
                        className="h-12 w-12 rounded-md border border-gray-200 object-contain dark:border-gray-700"
                      />
                      <button
                        type="button"
                        className="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                        onClick={() => set('logoUrl', null)}
                      >
                        Remove
                      </button>
                    </div>
                  ) : null}
                  <label className="inline-flex cursor-pointer items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800">
                    {uploadingLogo ? 'Uploading…' : 'Upload logo'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingLogo}
                      onChange={(e) => {
                        handleLogoUpload(e.target.files?.[0]);
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>
                <input
                  className={`${inputClass} mt-2`}
                  placeholder="or paste a URL — https://…"
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
                  className="h-4 w-4 rounded border-gray-300 text-accent"
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
            <h2 className="mb-3 font-display text-[15px] font-semibold tracking-tight text-gray-900 dark:text-gray-100">
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
              <span className="font-semibold text-accent tabular-nums">
                {publicUrl}
              </span>
            </p>
          </div>
          </>
          )}

          {/* Menus to publish — hidden for now (empty = publish all active menus) */}
          {false && (
          <div className={sectionClass}>
            <h2 className="mb-1 font-display text-[15px] font-semibold tracking-tight text-gray-900 dark:text-gray-100">
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
                  className="font-semibold text-accent hover:underline"
                >
                  Create your first menu →
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {menus.map((m) => {
                  const checked = (form?.menuIds || []).includes(m.id);
                  return (
                    <label
                      key={m.id}
                      className="flex items-center gap-2.5 rounded-lg border border-gray-200 dark:border-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-gray-200"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const current = form?.menuIds || [];
                          set(
                            'menuIds',
                            e.target.checked
                              ? [...current, m.id]
                              : current.filter((id) => id !== m.id),
                          );
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-accent"
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
          )}

          {/* Step 3 — Contact & Social */}
          {step === 3 && (
          <div className={sectionClass}>
            <h2 className="mb-3 font-display text-[15px] font-semibold tracking-tight text-gray-900 dark:text-gray-100">
              Contact &amp; Social
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
              <div>
                <label className={labelClass}>Facebook</label>
                <input
                  className={inputClass}
                  placeholder="facebook.com/yourvenue"
                  value={form.facebook || ''}
                  onChange={(e) => set('facebook', e.target.value || null)}
                />
              </div>
              <div>
                <label className={labelClass}>TikTok</label>
                <input
                  className={inputClass}
                  placeholder="@yourvenue"
                  value={form.tiktok || ''}
                  onChange={(e) => set('tiktok', e.target.value || null)}
                />
              </div>
              <div>
                <label className={labelClass}>X (Twitter)</label>
                <input
                  className={inputClass}
                  placeholder="@yourvenue"
                  value={form.twitter || ''}
                  onChange={(e) => set('twitter', e.target.value || null)}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Feedback link</label>
                <input
                  className={inputClass}
                  placeholder="https://forms.gle/…  (review or feedback form)"
                  value={form.feedbackUrl || ''}
                  onChange={(e) => set('feedbackUrl', e.target.value || null)}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Powers the Escape template&apos;s “Feedback” tile.
                </p>
              </div>
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
          )}

          {/* Step Back / Next */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : s))}
              disabled={step === 1}
              className="h-9 rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Back
            </button>
            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s < 3 ? ((s + 1) as 1 | 2 | 3) : s))}
                className="h-9 rounded-lg bg-accent px-4 text-sm font-medium text-accent-fg hover:bg-accent-hover"
              >
                Next
              </button>
            ) : (
              dirty && (
                <Button variant="primary" size="sm" onClick={handleSave} loading={saving}>
                  {saving ? 'Saving…' : 'Save changes'}
                </Button>
              )
            )}
          </div>
        </div>

        {/* ── Right: phone preview ───────────────────────────────── */}
        <div className="xl:sticky xl:top-4 xl:self-start">
          <div className="mx-auto w-[350px] max-w-full">
            <div className="rounded-[2.6rem] border-[10px] border-gray-900 dark:border-gray-700 bg-gray-900 shadow-xl">
              <div className="relative h-[620px] overflow-hidden rounded-[2rem] bg-white">
                {/* notch */}
                <div className="absolute left-1/2 top-0 z-30 h-5 w-32 -translate-x-1/2 rounded-b-2xl bg-gray-900 dark:bg-gray-700" />
                {/* transform pins the template's position:fixed layers (preloader,
                    side-drawer, item sheet) to THIS phone frame, not the admin page */}
                <div className="h-full overflow-y-auto" style={{ transform: 'translateZ(0)' }}>
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
                          className="mt-4 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-accent-fg"
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
