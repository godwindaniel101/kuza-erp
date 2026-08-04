import { useState, useEffect, useCallback, useRef } from 'react';
import { GetServerSideProps } from 'next';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { api } from '@/lib/api';
import { resolveImageUrl } from '@/lib/format';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/Card';
import Button from '@/components/ui/Button';
import Toast from '@/components/Toast';
import EmptyState from '@/components/ui/EmptyState';
import PermissionGuard from '@/components/PermissionGuard';
import { CardSkeleton } from '@/components/ui/Skeleton';
import {
  WebsiteSection,
  SectionType,
  SECTION_TYPES,
  newSection,
  starterSections,
  sectionLabel,
} from '@/lib/website-sections';

/**
 * Website overview + builder — the home of the `website` common app. Reads the
 * tenant's single site (GET /website, auto-created on first read), lets the owner
 * edit its brand/hero/about/contact (PUT /website), upload a logo + hero image,
 * publish/unpublish it, and share the public link (/site/:slug). A "Shop now"
 * link is driven by the `storefrontUrl` field, so the site points at their store.
 *
 * Phase 1 scope: single settings page (no section editor yet — that's Phase 2).
 */

const TEMPLATE_KEYS = ['classic', 'bold', 'minimal'] as const;

interface WebsiteSite {
  slug: string;
  isPublished: boolean;
  businessName: string;
  tagline: string | null;
  about: string | null;
  logoUrl: string | null;
  heroImageUrl: string | null;
  heroHeadline: string | null;
  heroSubtext: string | null;
  accentColor: string | null;
  templateKey: string;
  whatsapp: string | null;
  instagram: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  storefrontUrl: string | null;
  currency: string;
  sections?: WebsiteSection[] | null;
  publicUrl?: string;
}

interface SiteForm {
  businessName: string;
  slug: string;
  tagline: string;
  heroHeadline: string;
  heroSubtext: string;
  about: string;
  templateKey: string;
  accentColor: string;
  storefrontUrl: string;
  whatsapp: string;
  instagram: string;
  phone: string;
  email: string;
  address: string;
}

const emptyForm: SiteForm = {
  businessName: '',
  slug: '',
  tagline: '',
  heroHeadline: '',
  heroSubtext: '',
  about: '',
  templateKey: 'classic',
  accentColor: '',
  storefrontUrl: '',
  whatsapp: '',
  instagram: '',
  phone: '',
  email: '',
  address: '',
};

function toForm(site: WebsiteSite): SiteForm {
  return {
    businessName: site.businessName || '',
    slug: site.slug || '',
    tagline: site.tagline || '',
    heroHeadline: site.heroHeadline || '',
    heroSubtext: site.heroSubtext || '',
    about: site.about || '',
    templateKey: site.templateKey || 'classic',
    accentColor: site.accentColor || '',
    storefrontUrl: site.storefrontUrl || '',
    whatsapp: site.whatsapp || '',
    instagram: site.instagram || '',
    phone: site.phone || '',
    email: site.email || '',
    address: site.address || '',
  };
}

async function uploadWebsiteImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await api.post<{ success: boolean; data: { url: string } }>(
    '/website/upload-image',
    fd,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return res.data.url;
}

const inputClass =
  'h-10 w-full !max-w-none px-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-[13px] text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:border-transparent';
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5';

function ImageField({
  label,
  value,
  onUploaded,
  aspect,
}: {
  label: string;
  value: string | null;
  onUploaded: (url: string) => void;
  aspect: 'square' | 'wide';
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const pick = async (file: File) => {
    if (!file.type.startsWith('image/')) return setErr('Please choose an image');
    if (file.size > 5 * 1024 * 1024) return setErr('Image must be 5MB or smaller');
    setErr('');
    setBusy(true);
    try {
      onUploaded(await uploadWebsiteImage(file));
    } catch {
      setErr('Upload failed — try another image');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <span className={labelClass}>{label}</span>
      <div className="flex items-center gap-3">
        <div
          className={`relative overflow-hidden rounded-lg bg-gray-100 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700 ${
            aspect === 'square' ? 'h-16 w-16' : 'h-16 w-28'
          }`}
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={resolveImageUrl(value)} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-gray-300 dark:text-gray-600">
              <i className="bx bx-image text-2xl" aria-hidden="true" />
            </div>
          )}
        </div>
        <div>
          <Button type="button" variant="secondary" size="sm" loading={busy} onClick={() => inputRef.current?.click()}>
            <i className="bx bx-upload" aria-hidden="true" /> {value ? 'Replace' : 'Upload'}
          </Button>
          {err && <p className="mt-1 text-xs text-red-500">{err}</p>}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) pick(f);
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
}

function AddSectionMenu({ onAdd }: { onAdd: (t: SectionType) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-gray-400">Add block:</span>
      {SECTION_TYPES.map((st) => (
        <button
          key={st.type}
          type="button"
          onClick={() => onAdd(st.type)}
          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <i className={`bx ${st.icon}`} aria-hidden="true" /> {st.label}
        </button>
      ))}
    </div>
  );
}

function GalleryEditor({
  section,
  set,
}: {
  section: { heading: string; images: string[] };
  set: (patch: any) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const images = section.images || [];
  const addImage = async (file: File) => {
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) return;
    setBusy(true);
    try {
      set({ images: [...images, await uploadWebsiteImage(file)] });
    } catch {
      /* ignore — user can retry */
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-3">
      <input className={inputClass} placeholder="Heading" value={section.heading} onChange={(e) => set({ heading: e.target.value })} />
      <div className="flex flex-wrap gap-2">
        {images.map((src, i) => (
          <div key={i} className="relative h-16 w-16 overflow-hidden rounded-lg ring-1 ring-gray-200 dark:ring-gray-700">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={resolveImageUrl(src)} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => set({ images: images.filter((_, k) => k !== i) })}
              className="absolute right-0.5 top-0.5 rounded bg-black/50 p-0.5 leading-none text-white"
              aria-label="Remove image"
            >
              <i className="bx bx-x text-sm" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-gray-300 text-gray-400 hover:border-gray-400 dark:border-gray-700"
          aria-label="Add image"
        >
          {busy ? <i className="bx bx-loader-alt bx-spin" /> : <i className="bx bx-plus text-xl" />}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) addImage(f);
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
}

function SectionEditor({
  section,
  index,
  total,
  onChange,
  onMove,
  onRemove,
}: {
  section: WebsiteSection;
  index: number;
  total: number;
  onChange: (id: string, patch: any) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  onRemove: (id: string) => void;
}) {
  const set = (patch: any) => onChange(section.id, patch);
  return (
    <div className={`rounded-xl border border-gray-200 p-4 dark:border-gray-700 ${section.enabled ? '' : 'opacity-60'}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            {sectionLabel(section.type)}
          </span>
          <label className="flex items-center gap-1.5 text-xs text-gray-500">
            <input type="checkbox" checked={section.enabled} onChange={(e) => set({ enabled: e.target.checked })} className="h-3.5 w-3.5 rounded border-gray-300 text-brand-600" />
            Visible
          </label>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" disabled={index === 0} onClick={() => onMove(section.id, -1)} className="rounded p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-800" aria-label="Move up"><i className="bx bx-chevron-up" /></button>
          <button type="button" disabled={index === total - 1} onClick={() => onMove(section.id, 1)} className="rounded p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-800" aria-label="Move down"><i className="bx bx-chevron-down" /></button>
          <button type="button" onClick={() => onRemove(section.id)} className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20" aria-label="Remove"><i className="bx bx-trash" /></button>
        </div>
      </div>

      {section.type === 'hero' && (
        <div className="space-y-3">
          <input className={inputClass} placeholder="Headline" value={section.headline} onChange={(e) => set({ headline: e.target.value })} />
          <input className={inputClass} placeholder="Subtext" value={section.subtext} onChange={(e) => set({ subtext: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <input className={inputClass} placeholder="Button label" value={section.ctaLabel} onChange={(e) => set({ ctaLabel: e.target.value })} />
            <input className={inputClass} placeholder="Button link" value={section.ctaHref} onChange={(e) => set({ ctaHref: e.target.value })} />
          </div>
          <ImageField label="Background image" value={section.imageUrl} aspect="wide" onUploaded={(url) => set({ imageUrl: url })} />
        </div>
      )}
      {section.type === 'text' && (
        <div className="space-y-3">
          <input className={inputClass} placeholder="Heading" value={section.heading} onChange={(e) => set({ heading: e.target.value })} />
          <textarea rows={3} className={`${inputClass} h-auto py-2`} placeholder="Body" value={section.body} onChange={(e) => set({ body: e.target.value })} />
          <ImageField label="Image (optional)" value={section.imageUrl} aspect="wide" onUploaded={(url) => set({ imageUrl: url })} />
        </div>
      )}
      {section.type === 'gallery' && <GalleryEditor section={section} set={set} />}
      {section.type === 'cta' && (
        <div className="space-y-3">
          <input className={inputClass} placeholder="Heading" value={section.heading} onChange={(e) => set({ heading: e.target.value })} />
          <input className={inputClass} placeholder="Subtext" value={section.subtext} onChange={(e) => set({ subtext: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <input className={inputClass} placeholder="Button label" value={section.buttonLabel} onChange={(e) => set({ buttonLabel: e.target.value })} />
            <input className={inputClass} placeholder="Button link" value={section.buttonHref} onChange={(e) => set({ buttonHref: e.target.value })} />
          </div>
        </div>
      )}
      {section.type === 'contact' && (
        <div className="space-y-2">
          <input className={inputClass} placeholder="Heading" value={section.heading} onChange={(e) => set({ heading: e.target.value })} />
          <p className="text-xs text-gray-400">Shows your WhatsApp, Instagram, phone, email and address from the Contact settings above.</p>
        </div>
      )}
    </div>
  );
}

export default function WebsiteBuilderPage() {
  const { t } = useTranslation('common');

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [site, setSite] = useState<WebsiteSite | null>(null);
  const [form, setForm] = useState<SiteForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publicBase, setPublicBase] = useState('');
  const [sections, setSections] = useState<WebsiteSection[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    const configured = process.env.NEXT_PUBLIC_SITE_URL;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    setPublicBase((configured || origin).replace(/\/+$/, ''));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await api.get<{ success: boolean; data: WebsiteSite }>('/website');
      if (res.success && res.data) {
        setSite(res.data);
        setForm(toForm(res.data));
        setSections(Array.isArray(res.data.sections) ? res.data.sections : []);
      } else {
        setLoadError(true);
      }
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setField = <K extends keyof SiteForm>(key: K, value: SiteForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  // ── Section editor helpers ──
  const updateSection = (id: string, patch: Partial<WebsiteSection>) =>
    setSections((list) => list.map((s) => (s.id === id ? ({ ...s, ...patch } as WebsiteSection) : s)));
  const removeSection = (id: string) => setSections((list) => list.filter((s) => s.id !== id));
  const addSection = (type: SectionType) => setSections((list) => [...list, newSection(type)]);
  const moveSection = (id: string, dir: -1 | 1) =>
    setSections((list) => {
      const i = list.findIndex((s) => s.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= list.length) return list;
      const next = [...list];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  // Image uploads persist immediately (they return a URL to save with the rest).
  const saveImage = async (field: 'logoUrl' | 'heroImageUrl', url: string) => {
    try {
      const res = await api.put<{ success: boolean; data: WebsiteSite }>('/website', { [field]: url });
      if (res.success && res.data) setSite(res.data);
    } catch {
      setToast({ message: t('website.imageSaveFailed', 'Uploaded, but could not save it'), type: 'error' });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        businessName: form.businessName.trim(),
        slug: form.slug.trim(),
        tagline: form.tagline.trim() || null,
        heroHeadline: form.heroHeadline.trim() || null,
        heroSubtext: form.heroSubtext.trim() || null,
        about: form.about.trim() || null,
        templateKey: form.templateKey,
        accentColor: form.accentColor.trim() || null,
        storefrontUrl: form.storefrontUrl.trim() || null,
        whatsapp: form.whatsapp.trim() || null,
        instagram: form.instagram.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        sections,
      };
      const res = await api.put<{ success: boolean; data: WebsiteSite }>('/website', payload);
      if (res.success && res.data) {
        setSite(res.data);
        setForm(toForm(res.data));
        setSections(Array.isArray(res.data.sections) ? res.data.sections : []);
        setToast({ message: t('website.saved', 'Website saved'), type: 'success' });
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setToast({
        message: typeof msg === 'string' ? msg : t('website.saveFailed', 'Could not save your website'),
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
      const res = await api.post<{ success: boolean; data: WebsiteSite }>(
        next ? '/website/publish' : '/website/unpublish',
      );
      if (res.success && res.data) {
        setSite(res.data);
        setForm(toForm(res.data));
        setToast({
          message: next ? t('website.published', 'Your website is live') : t('website.unpublished', 'Your website is offline'),
          type: 'success',
        });
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setToast({
        message: typeof msg === 'string' ? msg : t('website.publishFailed', 'Could not update publish status'),
        type: 'error',
      });
    } finally {
      setPublishing(false);
    }
  };

  const publicLink = site?.slug ? `${publicBase}/site/${site.slug}` : '';
  const published = !!site?.isPublished;

  const copyLink = async () => {
    if (!publicLink) return;
    try {
      await navigator.clipboard.writeText(publicLink);
      setToast({ message: t('website.linkCopied', 'Link copied'), type: 'success' });
    } catch {
      setToast({ message: t('website.copyFailed', 'Could not copy the link'), type: 'error' });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('website.title', 'Website')}
        subtitle={t('website.subtitle', 'A simple website for your business')}
        actions={
          site && (
            <PermissionGuard permission="website.publish">
              <Button variant={published ? 'secondary' : 'primary'} loading={publishing} onClick={handlePublishToggle}>
                <i className={`bx ${published ? 'bx-cloud-download' : 'bx-cloud-upload'}`} aria-hidden="true" />
                {published ? t('website.unpublish', 'Unpublish') : t('website.publish', 'Publish')}
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
          icon="bx-globe"
          title={t('website.setupTitle', 'Set up your website')}
          description={t(
            'website.setupDescription',
            "We couldn't load your website just yet. Refresh to try again — it's created automatically the first time it loads.",
          )}
          actions={
            <Button variant="primary" onClick={load}>
              <i className="bx bx-refresh" aria-hidden="true" /> {t('website.retry', 'Try again')}
            </Button>
          }
        />
      ) : (
        <>
          <Card>
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                  published
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${published ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                {published ? t('website.statusLive', 'Published') : t('website.statusDraft', 'Draft')}
              </span>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {published
                  ? t('website.liveHint', 'Your website is live.')
                  : t('website.draftHint', 'Publish to put your website online.')}
              </p>
            </div>

            {published && publicLink && (
              <div className="mt-4 flex flex-col gap-2 rounded-xl bg-gray-50 p-3 dark:bg-gray-800/60 sm:flex-row sm:items-center">
                <code className="min-w-0 flex-1 truncate text-[13px] text-gray-700 dark:text-gray-300">{publicLink}</code>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={copyLink}>
                    <i className="bx bx-copy" aria-hidden="true" /> {t('website.copyLink', 'Copy')}
                  </Button>
                  <a
                    href={publicLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10"
                  >
                    <i className="bx bx-link-external" aria-hidden="true" /> {t('website.visit', 'Visit')}
                  </a>
                </div>
              </div>
            )}
          </Card>

          <form onSubmit={handleSave} className="space-y-6">
            {/* Brand + hero */}
            <Card title={t('website.brand', 'Brand & hero')} subtitle={t('website.brandHint', 'The first thing visitors see')}>
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <ImageField label={t('website.logo', 'Logo')} value={site.logoUrl} aspect="square" onUploaded={(url) => saveImage('logoUrl', url)} />
                  <ImageField label={t('website.heroImage', 'Hero image')} value={site.heroImageUrl} aspect="wide" onUploaded={(url) => saveImage('heroImageUrl', url)} />
                </div>
                <div>
                  <label htmlFor="businessName" className={labelClass}>{t('website.businessName', 'Business name')}</label>
                  <input id="businessName" className={inputClass} value={form.businessName} onChange={(e) => setField('businessName', e.target.value)} placeholder="My Business" />
                </div>
                <div>
                  <label htmlFor="tagline" className={labelClass}>{t('website.tagline', 'Tagline')}</label>
                  <input id="tagline" className={inputClass} value={form.tagline} onChange={(e) => setField('tagline', e.target.value)} placeholder={t('website.taglinePlaceholder', 'A short line about what you do')} />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="heroHeadline" className={labelClass}>{t('website.heroHeadline', 'Hero headline')}</label>
                    <input id="heroHeadline" className={inputClass} value={form.heroHeadline} onChange={(e) => setField('heroHeadline', e.target.value)} placeholder={t('website.heroHeadlinePlaceholder', 'Welcome to …')} />
                  </div>
                  <div>
                    <label htmlFor="heroSubtext" className={labelClass}>{t('website.heroSubtext', 'Hero subtext')}</label>
                    <input id="heroSubtext" className={inputClass} value={form.heroSubtext} onChange={(e) => setField('heroSubtext', e.target.value)} placeholder={t('website.heroSubtextPlaceholder', 'One sentence that invites them in')} />
                  </div>
                </div>
              </div>
            </Card>

            {/* Link to store */}
            <Card title={t('website.store', 'Link to your store')} subtitle={t('website.storeHint', 'The "Shop now" button on your site points here')}>
              <div>
                <label htmlFor="storefrontUrl" className={labelClass}>{t('website.storefrontUrl', 'Storefront link')}</label>
                <input id="storefrontUrl" className={inputClass} value={form.storefrontUrl} onChange={(e) => setField('storefrontUrl', e.target.value)} placeholder={`${publicBase}/s/your-store`} />
                <p className="mt-1 text-xs text-gray-400">{t('website.storefrontUrlHint', 'Paste your Storefront link so visitors can shop. Leave blank to hide the button.')}</p>
              </div>
            </Card>

            {/* About + look */}
            <Card title={t('website.about', 'About')} subtitle={t('website.aboutHint', 'Tell your story')}>
              <div className="space-y-4">
                <textarea
                  rows={4}
                  className={`${inputClass} h-auto py-2`}
                  value={form.about}
                  onChange={(e) => setField('about', e.target.value)}
                  placeholder={t('website.aboutPlaceholder', 'Who you are, what you sell, why customers trust you')}
                />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="templateKey" className={labelClass}>{t('website.template', 'Theme')}</label>
                    <select id="templateKey" className={inputClass} value={form.templateKey} onChange={(e) => setField('templateKey', e.target.value)}>
                      {TEMPLATE_KEYS.map((k) => (
                        <option key={k} value={k}>{t(`website.template.${k}`, k.charAt(0).toUpperCase() + k.slice(1))}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="accentColor" className={labelClass}>{t('website.accentColor', 'Accent color')}</label>
                    <input id="accentColor" className={inputClass} value={form.accentColor} onChange={(e) => setField('accentColor', e.target.value)} placeholder="#2563eb" />
                  </div>
                </div>
              </div>
            </Card>

            {/* Contact + address + link */}
            <Card title={t('website.contact', 'Contact')} subtitle={t('website.contactHint', 'How visitors reach you')}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="slug" className={labelClass}>{t('website.slug', 'Website link')}</label>
                  <div className="flex items-center gap-2">
                    <span className="shrink-0 text-[13px] text-gray-400">{publicBase}/site/</span>
                    <input id="slug" className={inputClass} value={form.slug} onChange={(e) => setField('slug', e.target.value)} placeholder="my-business" />
                  </div>
                  <p className="mt-1 text-xs text-gray-400">{t('website.slugHint', 'Lowercase letters, numbers and hyphens only.')}</p>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="whatsapp" className={labelClass}>{t('website.whatsapp', 'WhatsApp')}</label>
                    <input id="whatsapp" className={inputClass} value={form.whatsapp} onChange={(e) => setField('whatsapp', e.target.value)} placeholder="+234…" />
                  </div>
                  <div>
                    <label htmlFor="instagram" className={labelClass}>{t('website.instagram', 'Instagram')}</label>
                    <input id="instagram" className={inputClass} value={form.instagram} onChange={(e) => setField('instagram', e.target.value)} placeholder="@yourbusiness" />
                  </div>
                  <div>
                    <label htmlFor="phone" className={labelClass}>{t('website.phone', 'Phone')}</label>
                    <input id="phone" className={inputClass} value={form.phone} onChange={(e) => setField('phone', e.target.value)} placeholder="+234…" />
                  </div>
                  <div>
                    <label htmlFor="email" className={labelClass}>{t('website.email', 'Email')}</label>
                    <input id="email" type="email" className={inputClass} value={form.email} onChange={(e) => setField('email', e.target.value)} placeholder="hello@business.com" />
                  </div>
                </div>
                <div>
                  <label htmlFor="address" className={labelClass}>{t('website.address', 'Address')}</label>
                  <input id="address" className={inputClass} value={form.address} onChange={(e) => setField('address', e.target.value)} placeholder={t('website.addressPlaceholder', 'Street, city')} />
                </div>
              </div>
            </Card>

            {/* Page sections (blocks) */}
            <Card title={t('website.sections', 'Page sections')} subtitle={t('website.sectionsHint', 'The blocks that make up your page, top to bottom')}>
              {sections.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 py-8 text-center dark:border-gray-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('website.noSections', 'No blocks yet.')}</p>
                  <div className="mt-3 flex flex-col items-center gap-3">
                    <Button type="button" variant="secondary" size="sm" onClick={() => setSections(starterSections())}>
                      <i className="bx bx-magic-wand" aria-hidden="true" /> {t('website.useStarter', 'Use starter layout')}
                    </Button>
                    <AddSectionMenu onAdd={addSection} />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {sections.map((s, i) => (
                    <SectionEditor
                      key={s.id}
                      section={s}
                      index={i}
                      total={sections.length}
                      onChange={updateSection}
                      onMove={moveSection}
                      onRemove={removeSection}
                    />
                  ))}
                  <div className="pt-1">
                    <AddSectionMenu onAdd={addSection} />
                  </div>
                </div>
              )}
            </Card>

            <div className="flex justify-end">
              <PermissionGuard permission="website.manage">
                <Button type="submit" variant="primary" loading={saving}>
                  {t('website.save', 'Save changes')}
                </Button>
              </PermissionGuard>
            </div>
          </form>
        </>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => ({
  props: { ...(await serverSideTranslations(locale || 'en', ['common'])) },
});
