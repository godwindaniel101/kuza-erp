import { useState, useEffect, useCallback, useRef, Fragment, DragEvent } from 'react';
import { GetServerSideProps } from 'next';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { api } from '@/lib/api';
import { resolveImageUrl } from '@/lib/format';
import Button from '@/components/ui/Button';
import Toast from '@/components/Toast';
import EmptyState from '@/components/ui/EmptyState';
import PermissionGuard from '@/components/PermissionGuard';
import {
  WebsiteSection,
  SectionType,
  SECTION_TYPES,
  newSection,
  sectionLabel,
} from '@/lib/website-sections';
import { SiteBlock, SiteContext } from '@/components/website/SiteBlocks';
import { WEBSITE_TEMPLATES, WebsiteTemplate } from '@/lib/website-templates';

interface WebsiteSite {
  slug: string;
  isPublished: boolean;
  businessName: string;
  tagline: string | null;
  logoUrl: string | null;
  accentColor: string | null;
  whatsapp: string | null;
  instagram: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  storefrontUrl: string | null;
  sections?: WebsiteSection[] | null;
  currency: string;
  publicUrl?: string;
}

async function uploadWebsiteImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await api.post<{ success: boolean; data: { url: string } }>('/website/upload-image', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.url;
}

const inputClass =
  'h-9 w-full !max-w-none px-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-[13px] text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';
const labelClass = 'block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1';

/* ── inline image upload button ── */
function ImageUpload({ value, onChange, label }: { value: string | null; onChange: (url: string | null) => void; label: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const pick = async (file: File) => {
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) return;
    setBusy(true);
    try { onChange(await uploadWebsiteImage(file)); } catch { /* retry */ } finally { setBusy(false); }
  };
  return (
    <div>
      <span className={labelClass}>{label}</span>
      <div className="flex items-center gap-2">
        {value && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={resolveImageUrl(value)} alt="" className="h-10 w-14 rounded object-cover ring-1 ring-gray-200" />
        )}
        <Button type="button" variant="secondary" size="sm" loading={busy} onClick={() => ref.current?.click()}>
          <i className="bx bx-upload" aria-hidden="true" /> {value ? 'Replace' : 'Upload'}
        </Button>
        {value && <button type="button" onClick={() => onChange(null)} className="text-xs text-gray-400 hover:text-red-500">Remove</button>}
        <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) pick(f); e.target.value = ''; }} />
      </div>
    </div>
  );
}

/** The first hero image in a template, for its gallery preview card. */
function templateHeroImage(tpl: (typeof WEBSITE_TEMPLATES)[number]): string | null {
  const hero = tpl.sections().find((s) => s.type === 'hero') as { imageUrl?: string | null } | undefined;
  return hero?.imageUrl ?? null;
}

export default function WebsiteBuilderPage() {
  const { t } = useTranslation('common');

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [site, setSite] = useState<WebsiteSite | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [publicBase, setPublicBase] = useState('');

  const [sections, setSections] = useState<WebsiteSection[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<'desktop' | 'mobile'>('desktop');
  const [showEntry, setShowEntry] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [previewTpl, setPreviewTpl] = useState<WebsiteTemplate | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const dragId = useRef<string | null>(null);

  // Editable site-level fields
  const [businessName, setBusinessName] = useState('');
  const [slug, setSlug] = useState('');
  const [accentColor, setAccentColor] = useState('#2563eb');
  const [storefrontUrl, setStorefrontUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [tagline, setTagline] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [instagram, setInstagram] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    const configured = process.env.NEXT_PUBLIC_SITE_URL;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    setPublicBase((configured || origin).replace(/\/+$/, ''));
  }, []);

  const syncFrom = (s: WebsiteSite) => {
    setSite(s);
    setBusinessName(s.businessName || '');
    setSlug(s.slug || '');
    setAccentColor(s.accentColor || '#2563eb');
    setStorefrontUrl(s.storefrontUrl || '');
    setLogoUrl(s.logoUrl || null);
    setTagline(s.tagline || '');
    setWhatsapp(s.whatsapp || '');
    setInstagram(s.instagram || '');
    setPhone(s.phone || '');
    setEmail(s.email || '');
    setAddress(s.address || '');
    const secs = Array.isArray(s.sections) ? s.sections : [];
    setSections(secs);
    setShowEntry(secs.length === 0);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await api.get<{ success: boolean; data: WebsiteSite }>('/website');
      if (res.success && res.data) syncFrom(res.data);
      else setLoadError(true);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const siteCtx: SiteContext = { businessName: businessName || 'My Business', whatsapp, instagram, phone, email, address };

  // ── section ops ──
  const updateSection = (id: string, patch: any) =>
    setSections((list) => list.map((s) => (s.id === id ? ({ ...s, ...patch } as WebsiteSection) : s)));
  const removeSection = (id: string) => { setSections((l) => l.filter((s) => s.id !== id)); if (selectedId === id) setSelectedId(null); };
  const duplicateSection = (id: string) =>
    setSections((l) => {
      const i = l.findIndex((s) => s.id === id);
      if (i < 0) return l;
      const copy = { ...l[i], id: `sec_${l[i].type}_${Math.random().toString(36).slice(2, 9)}` } as WebsiteSection;
      return [...l.slice(0, i + 1), copy, ...l.slice(i + 1)];
    });
  const moveSection = (id: string, dir: -1 | 1) =>
    setSections((l) => { const i = l.findIndex((s) => s.id === id); const j = i + dir; if (i < 0 || j < 0 || j >= l.length) return l; const n = [...l]; [n[i], n[j]] = [n[j], n[i]]; return n; });
  const addSection = (type: SectionType, at?: number) =>
    setSections((l) => { const s = newSection(type); if (at === undefined || at >= l.length) return [...l, s]; return [...l.slice(0, at), s, ...l.slice(at)]; });

  // ── native DnD ──
  const onDrop = (e: DragEvent, index: number) => {
    e.preventDefault();
    setDragOver(null);
    let data: any = null;
    try { data = JSON.parse(e.dataTransfer.getData('application/json')); } catch { return; }
    if (data?.kind === 'new' && data.type) { addSection(data.type, index); return; }
    if (data?.kind === 'move' && data.id) {
      setSections((l) => {
        const from = l.findIndex((s) => s.id === data.id);
        if (from < 0) return l;
        const without = l.filter((s) => s.id !== data.id);
        const to = index > from ? index - 1 : index;
        return [...without.slice(0, to), l[from], ...without.slice(to)];
      });
    }
    dragId.current = null;
  };

  // Close the template preview modal on Escape.
  useEffect(() => {
    if (!previewTpl) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPreviewTpl(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [previewTpl]);

  const applyTemplate = (tplId: string) => {
    const tpl = WEBSITE_TEMPLATES.find((x) => x.id === tplId);
    if (!tpl) return;
    setSections(tpl.sections());
    setAccentColor(tpl.accentColor);
    setShowEntry(false);
    setShowGallery(false);
    setPreviewTpl(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        businessName: businessName.trim() || 'My Business',
        slug: slug.trim(),
        tagline: tagline.trim() || null,
        accentColor: accentColor.trim() || null,
        storefrontUrl: storefrontUrl.trim() || null,
        logoUrl: logoUrl || null,
        whatsapp: whatsapp.trim() || null,
        instagram: instagram.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        sections,
      };
      const res = await api.put<{ success: boolean; data: WebsiteSite }>('/website', payload);
      if (res.success && res.data) { syncFrom(res.data); setToast({ message: 'Saved', type: 'success' }); }
    } catch (err: any) {
      setToast({ message: err?.response?.data?.message || 'Could not save', type: 'error' });
    } finally { setSaving(false); }
  };

  const handlePublishToggle = async () => {
    if (!site) return;
    const next = !site.isPublished;
    setPublishing(true);
    try {
      const res = await api.post<{ success: boolean; data: WebsiteSite }>(next ? '/website/publish' : '/website/unpublish');
      if (res.success && res.data) { syncFrom(res.data); setToast({ message: next ? 'Your website is live' : 'Website taken offline', type: 'success' }); }
    } catch (err: any) {
      setToast({ message: err?.response?.data?.message || 'Could not update publish status', type: 'error' });
    } finally { setPublishing(false); }
  };

  const publicLink = site?.slug ? `${publicBase}/site/${site.slug}` : '';
  const published = !!site?.isPublished;
  const selected = sections.find((s) => s.id === selectedId) || null;

  if (loading) {
    return <div className="flex items-center justify-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-brand-600" /></div>;
  }
  if (loadError || !site) {
    return (
      <div className="p-6">
        <EmptyState icon="bx-globe" title="Set up your website" description="We couldn't load your website. Refresh to try again." actions={<Button variant="primary" onClick={load}>Try again</Button>} />
      </div>
    );
  }

  /* ── Entry screen ── */
  if (showEntry || showGallery) {
    return (
      <div className="mx-auto max-w-4xl px-5 py-10">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Build your website</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Start from a template, or build your own with drag-and-drop.</p>

        <button onClick={() => { setSections([]); setShowEntry(false); setShowGallery(false); }} className="mt-6 flex w-full items-center gap-3 rounded-2xl border border-dashed border-gray-300 p-5 text-left transition hover:border-brand-500 dark:border-gray-700">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-gradient text-white"><i className="bx bx-plus text-2xl" /></span>
          <span>
            <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100">Build your own</span>
            <span className="block text-xs text-gray-500 dark:text-gray-400">Start blank and drag blocks onto the page</span>
          </span>
        </button>

        <h2 className="mt-8 mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Or start from a template</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {WEBSITE_TEMPLATES.map((tpl) => {
            const img = tpl.preview || templateHeroImage(tpl);
            // A card with a design mockup opens the Preview modal; others apply directly.
            const onCardClick = () => (tpl.preview ? setPreviewTpl(tpl) : applyTemplate(tpl.id));
            return (
              <div
                key={tpl.id}
                role="button"
                tabIndex={0}
                onClick={onCardClick}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onCardClick(); } }}
                aria-label={tpl.preview ? `Preview ${tpl.name} template` : `Use ${tpl.name} template`}
                className="group cursor-pointer overflow-hidden rounded-2xl bg-white text-left shadow-card ring-1 ring-gray-950/[0.04] transition hover:-translate-y-0.5 hover:ring-brand-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:bg-gray-900 dark:ring-gray-800"
              >
                <div className="relative h-40 overflow-hidden bg-gray-50 dark:bg-gray-800">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt={`${tpl.name} template preview`} className="h-full w-full object-cover object-top transition duration-300 group-hover:scale-105" />
                  ) : (
                    <div className="h-full w-full" style={{ background: `linear-gradient(160deg, ${tpl.accentColor}, ${tpl.accentColor}99)` }} />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
                  <span className="absolute left-3 top-3 h-4 w-4 rounded-full ring-2 ring-white/80" style={{ background: tpl.accentColor }} />
                  {tpl.preview && (
                    <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white opacity-0 transition group-hover:opacity-100">
                      <i className="bx bx-search-alt" /> Preview
                    </span>
                  )}
                </div>
                <div className="flex items-start justify-between gap-2 p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{tpl.name}</p>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{tpl.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); applyTemplate(tpl.id); }}
                    className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-gray-800"
                  >
                    Use
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {showGallery && sections.length > 0 && (
          <div className="mt-6"><Button variant="secondary" onClick={() => setShowGallery(false)}>← Back to editor</Button></div>
        )}

        {/* ── Template preview modal ── */}
        {previewTpl && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label={`${previewTpl.name} preview`}
            onClick={() => setPreviewTpl(null)}
          >
            <div
              className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 dark:border-gray-800">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ background: previewTpl.accentColor }} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{previewTpl.name}</p>
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">{previewTpl.description}</p>
                  </div>
                </div>
                <button type="button" onClick={() => setPreviewTpl(null)} className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800" aria-label="Close preview">
                  <i className="bx bx-x text-2xl" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto bg-gray-100 p-4 dark:bg-gray-950">
                {previewTpl.preview && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewTpl.preview} alt={`${previewTpl.name} full design`} className="mx-auto w-full max-w-2xl rounded-lg shadow-md" />
                )}
              </div>
              <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-4 py-3 dark:border-gray-800">
                <Button variant="secondary" onClick={() => setPreviewTpl(null)}>Close</Button>
                <Button variant="primary" onClick={() => applyTemplate(previewTpl.id)}>Use this template</Button>
              </div>
            </div>
          </div>
        )}

        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    );
  }

  /* ── Editor ── */
  const canvasWidth = view === 'mobile' ? 'max-w-[420px]' : 'max-w-4xl';

  return (
    <div className="flex h-[calc(100dvh_-_3.5rem)] flex-col">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-2.5 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="w-40 rounded-lg border border-transparent px-2 py-1 text-sm font-semibold text-gray-900 hover:border-gray-300 focus:border-brand-500 focus:outline-none dark:text-gray-100" placeholder="Business name" />
          <button onClick={() => setShowGallery(true)} className="rounded-lg px-2.5 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"><i className="bx bx-layout" /> Templates</button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-gray-100 p-0.5 dark:bg-gray-800">
            <button onClick={() => setView('desktop')} className={`rounded px-2 py-1 text-xs ${view === 'desktop' ? 'bg-white shadow-sm dark:bg-gray-700' : 'text-gray-500'}`} aria-label="Desktop"><i className="bx bx-desktop" /></button>
            <button onClick={() => setView('mobile')} className={`rounded px-2 py-1 text-xs ${view === 'mobile' ? 'bg-white shadow-sm dark:bg-gray-700' : 'text-gray-500'}`} aria-label="Mobile"><i className="bx bx-mobile" /></button>
          </div>
          {published && publicLink && (
            <a href={publicLink} target="_blank" rel="noopener noreferrer" className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-400"><i className="bx bx-link-external" /> Preview</a>
          )}
          <PermissionGuard permission="website.manage"><Button size="sm" variant="secondary" loading={saving} onClick={handleSave}>Save</Button></PermissionGuard>
          <PermissionGuard permission="website.publish"><Button size="sm" variant={published ? 'secondary' : 'primary'} loading={publishing} onClick={handlePublishToggle}>{published ? 'Unpublish' : 'Publish'}</Button></PermissionGuard>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Palette */}
        <aside className="hidden w-44 shrink-0 overflow-y-auto border-r border-gray-200 p-3 dark:border-gray-800 md:block">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Blocks</p>
          <div className="space-y-1.5">
            {SECTION_TYPES.map((st) => (
              <div
                key={st.type}
                draggable
                onDragStart={(e) => { e.dataTransfer.setData('application/json', JSON.stringify({ kind: 'new', type: st.type })); e.dataTransfer.effectAllowed = 'copy'; }}
                onClick={() => addSection(st.type)}
                className="flex cursor-grab items-center gap-2 rounded-lg border border-gray-200 px-2.5 py-2 text-xs font-medium text-gray-600 transition hover:border-brand-400 hover:bg-brand-50 active:cursor-grabbing dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <i className={`bx ${st.icon} text-base`} /> {st.label}
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] leading-4 text-gray-400">Drag onto the page, or click to add.</p>
        </aside>

        {/* Canvas */}
        <main className="min-w-0 flex-1 overflow-y-auto bg-gray-100 p-4 dark:bg-gray-950">
          <div className={`mx-auto ${canvasWidth} overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200`} onClick={() => setSelectedId(null)}>
            {sections.length === 0 ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(0); }}
                onDrop={(e) => onDrop(e, 0)}
                className={`m-6 flex h-48 items-center justify-center rounded-xl border-2 border-dashed text-sm text-gray-400 ${dragOver === 0 ? 'border-brand-500 bg-brand-50' : 'border-gray-300'}`}
              >
                Drag a block here to start, or pick one from the left.
              </div>
            ) : (
              sections.map((s, i) => (
                <Fragment key={s.id}>
                  <div onDragOver={(e) => { e.preventDefault(); setDragOver(i); }} onDrop={(e) => onDrop(e, i)} className={`h-1 ${dragOver === i ? 'bg-brand-500' : ''}`} />
                  <div
                    draggable
                    onDragStart={(e) => { dragId.current = s.id; e.dataTransfer.setData('application/json', JSON.stringify({ kind: 'move', id: s.id })); e.dataTransfer.effectAllowed = 'move'; }}
                    onClick={(e) => { e.stopPropagation(); setSelectedId(s.id); }}
                    className={`group relative ${selectedId === s.id ? 'ring-2 ring-brand-500 ring-inset' : ''} ${s.enabled ? '' : 'opacity-40'}`}
                  >
                    {/* toolbar */}
                    <div className="absolute right-2 top-2 z-10 hidden items-center gap-0.5 rounded-lg bg-gray-900/85 px-1 py-0.5 text-white group-hover:flex">
                      <span className="cursor-grab px-1"><i className="bx bx-move" /></span>
                      <button onClick={(e) => { e.stopPropagation(); moveSection(s.id, -1); }} disabled={i === 0} className="px-1 disabled:opacity-30" aria-label="Up"><i className="bx bx-chevron-up" /></button>
                      <button onClick={(e) => { e.stopPropagation(); moveSection(s.id, 1); }} disabled={i === sections.length - 1} className="px-1 disabled:opacity-30" aria-label="Down"><i className="bx bx-chevron-down" /></button>
                      <button onClick={(e) => { e.stopPropagation(); duplicateSection(s.id); }} className="px-1" aria-label="Duplicate"><i className="bx bx-copy" /></button>
                      <button onClick={(e) => { e.stopPropagation(); removeSection(s.id); }} className="px-1 hover:text-red-400" aria-label="Delete"><i className="bx bx-trash" /></button>
                    </div>
                    <div className="pointer-events-none select-none">
                      <SiteBlock section={s} accent={accentColor} site={siteCtx} />
                    </div>
                  </div>
                </Fragment>
              ))
            )}
            {sections.length > 0 && (
              <div onDragOver={(e) => { e.preventDefault(); setDragOver(sections.length); }} onDrop={(e) => onDrop(e, sections.length)} className={`h-6 ${dragOver === sections.length ? 'bg-brand-500/20' : ''}`} />
            )}
          </div>
        </main>

        {/* Properties */}
        <aside className="hidden w-72 shrink-0 overflow-y-auto border-l border-gray-200 p-4 dark:border-gray-800 lg:block">
          {selected ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{sectionLabel(selected.type)}</p>
                <label className="flex items-center gap-1 text-xs text-gray-500"><input type="checkbox" checked={selected.enabled} onChange={(e) => updateSection(selected.id, { enabled: e.target.checked })} className="h-3.5 w-3.5 rounded border-gray-300 text-brand-600" /> Visible</label>
              </div>
              <div>
                <span className={labelClass}>Background</span>
                <div className="grid grid-cols-4 gap-1">
                  {(['light', 'warm', 'dark', 'tint'] as const).map((bg) => (
                    <button
                      key={bg}
                      type="button"
                      onClick={() => updateSection(selected.id, { bg })}
                      className={`rounded-lg py-1.5 text-[11px] font-medium capitalize ring-1 transition ${((selected.bg || 'light') === bg) ? 'ring-brand-500 text-brand-600 dark:text-brand-400' : 'ring-gray-200 text-gray-500 hover:ring-gray-300 dark:ring-gray-700'}`}
                    >
                      {bg}
                    </button>
                  ))}
                </div>
              </div>
              <SectionFields section={selected} update={(patch) => updateSection(selected.id, patch)} />
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Page settings</p>
              <ImageUpload label="Logo" value={logoUrl} onChange={setLogoUrl} />
              <div><span className={labelClass}>Tagline</span><input className={inputClass} value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="What you do, in a line" /></div>
              <div><span className={labelClass}>Theme accent</span><input className={inputClass} value={accentColor} onChange={(e) => setAccentColor(e.target.value)} placeholder="#2563eb" /></div>
              <div><span className={labelClass}>Store link (Shop now)</span><input className={inputClass} value={storefrontUrl} onChange={(e) => setStorefrontUrl(e.target.value)} placeholder={`${publicBase}/s/your-store`} /></div>
              <div><span className={labelClass}>Website link</span><div className="flex items-center gap-1"><span className="text-[11px] text-gray-400">{publicBase}/site/</span><input className={inputClass} value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="my-business" /></div></div>
              <div className="grid grid-cols-2 gap-2">
                <div><span className={labelClass}>WhatsApp</span><input className={inputClass} value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+234…" /></div>
                <div><span className={labelClass}>Instagram</span><input className={inputClass} value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@you" /></div>
                <div><span className={labelClass}>Phone</span><input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234…" /></div>
                <div><span className={labelClass}>Email</span><input className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="hello@…" /></div>
              </div>
              <div><span className={labelClass}>Address</span><input className={inputClass} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, city" /></div>
              <p className="pt-1 text-[11px] text-gray-400">Click a block on the page to edit it.</p>
            </div>
          )}
        </aside>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

/* ── per-type field editors for the properties panel ── */
function SectionFields({ section, update }: { section: WebsiteSection; update: (patch: any) => void }) {
  if (section.type === 'hero') {
    return (
      <>
        <div><span className={labelClass}>Eyebrow (small label)</span><input className={inputClass} value={section.eyebrow || ''} onChange={(e) => update({ eyebrow: e.target.value })} placeholder="New collection" /></div>
        <div><span className={labelClass}>Headline</span><input className={inputClass} value={section.headline} onChange={(e) => update({ headline: e.target.value })} /></div>
        <div><span className={labelClass}>Subtext</span><input className={inputClass} value={section.subtext} onChange={(e) => update({ subtext: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><span className={labelClass}>Button label</span><input className={inputClass} value={section.ctaLabel} onChange={(e) => update({ ctaLabel: e.target.value })} /></div>
          <div><span className={labelClass}>Button link</span><input className={inputClass} value={section.ctaHref} onChange={(e) => update({ ctaHref: e.target.value })} /></div>
        </div>
        <ImageUpload label="Background image" value={section.imageUrl} onChange={(url) => update({ imageUrl: url })} />
      </>
    );
  }
  if (section.type === 'text') {
    return (
      <>
        <div><span className={labelClass}>Heading</span><input className={inputClass} value={section.heading} onChange={(e) => update({ heading: e.target.value })} /></div>
        <div><span className={labelClass}>Body</span><textarea rows={4} className={`${inputClass} h-auto py-2`} value={section.body} onChange={(e) => update({ body: e.target.value })} /></div>
        <ImageUpload label="Image (optional)" value={section.imageUrl} onChange={(url) => update({ imageUrl: url })} />
      </>
    );
  }
  if (section.type === 'features') {
    const items = section.items || [];
    const patchItem = (i: number, p: Partial<{ title: string; body: string; icon: string }>) =>
      update({ items: items.map((it, k) => (k === i ? { ...it, ...p } : it)) });
    return (
      <>
        <div><span className={labelClass}>Heading</span><input className={inputClass} value={section.heading} onChange={(e) => update({ heading: e.target.value })} /></div>
        <div><span className={labelClass}>Subtext</span><input className={inputClass} value={section.subtext} onChange={(e) => update({ subtext: e.target.value })} /></div>
        <div>
          <span className={labelClass}>Layout</span>
          <select className={inputClass} value={section.layout || 'cards'} onChange={(e) => update({ layout: e.target.value })}>
            <option value="cards">Cards</option>
            <option value="numbered">Numbered rows</option>
            <option value="icons">Icon grid</option>
          </select>
        </div>
        <div className="space-y-2">
          {items.map((it, i) => (
            <div key={i} className="rounded-lg border border-gray-200 p-2 dark:border-gray-700">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[11px] font-medium text-gray-400">Item {i + 1}</span>
                <button type="button" onClick={() => update({ items: items.filter((_, k) => k !== i) })} className="text-[11px] text-red-500 hover:underline">Remove</button>
              </div>
              <input className={`${inputClass} mb-1`} placeholder="Title" value={it.title} onChange={(e) => patchItem(i, { title: e.target.value })} />
              <input className={`${inputClass} mb-1`} placeholder="Body" value={it.body} onChange={(e) => patchItem(i, { body: e.target.value })} />
              <input className={inputClass} placeholder="Icon (e.g. bx-bolt)" value={it.icon || ''} onChange={(e) => patchItem(i, { icon: e.target.value })} />
            </div>
          ))}
          <button type="button" onClick={() => update({ items: [...items, { title: 'New feature', body: '', icon: 'bx-check' }] })} className="w-full rounded-lg border border-dashed border-gray-300 py-1.5 text-[11px] font-medium text-gray-500 hover:border-brand-500 dark:border-gray-700">+ Add item</button>
        </div>
      </>
    );
  }
  if (section.type === 'products') {
    return (
      <>
        <div><span className={labelClass}>Heading</span><input className={inputClass} value={section.heading} onChange={(e) => update({ heading: e.target.value })} /></div>
        <div><span className={labelClass}>How many products</span><input type="number" min={1} max={12} className={inputClass} value={section.limit} onChange={(e) => update({ limit: Math.max(1, Math.min(12, Number(e.target.value) || 6)) })} /></div>
        <p className="text-[11px] text-gray-400">Pulls live from your Storefront — set the store link in Page settings.</p>
      </>
    );
  }
  if (section.type === 'gallery') {
    const images = section.images || [];
    return (
      <>
        <div><span className={labelClass}>Heading</span><input className={inputClass} value={section.heading} onChange={(e) => update({ heading: e.target.value })} /></div>
        <div className="flex flex-wrap gap-1.5">
          {images.map((src, i) => (
            <div key={i} className="relative h-12 w-12 overflow-hidden rounded ring-1 ring-gray-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={resolveImageUrl(src)} alt="" className="h-full w-full object-cover" />
              <button type="button" onClick={() => update({ images: images.filter((_, k) => k !== i) })} className="absolute right-0 top-0 rounded bg-black/50 px-0.5 text-white" aria-label="Remove"><i className="bx bx-x text-xs" /></button>
            </div>
          ))}
        </div>
        <ImageUpload label="Add image" value={null} onChange={(url) => { if (url) update({ images: [...images, url] }); }} />
      </>
    );
  }
  if (section.type === 'cta') {
    return (
      <>
        <div><span className={labelClass}>Heading</span><input className={inputClass} value={section.heading} onChange={(e) => update({ heading: e.target.value })} /></div>
        <div><span className={labelClass}>Subtext</span><input className={inputClass} value={section.subtext} onChange={(e) => update({ subtext: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><span className={labelClass}>Button label</span><input className={inputClass} value={section.buttonLabel} onChange={(e) => update({ buttonLabel: e.target.value })} /></div>
          <div><span className={labelClass}>Button link</span><input className={inputClass} value={section.buttonHref} onChange={(e) => update({ buttonHref: e.target.value })} /></div>
        </div>
      </>
    );
  }
  if (section.type === 'contact') {
    return (
      <>
        <div><span className={labelClass}>Heading</span><input className={inputClass} value={section.heading} onChange={(e) => update({ heading: e.target.value })} /></div>
        <p className="text-[11px] text-gray-400">Shows your contact details from Page settings.</p>
      </>
    );
  }
  return null;
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => ({
  props: { ...(await serverSideTranslations(locale || 'en', ['common'])) },
});
