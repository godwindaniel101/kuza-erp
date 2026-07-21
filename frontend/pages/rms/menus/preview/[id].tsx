import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import Link from 'next/link';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import Toast from '@/components/Toast';
import Button from '@/components/ui/Button';
import PageHeader from '@/components/ui/PageHeader';
import { resolveImageUrl } from '@/lib/format';
import { getTemplateComponent, resolveTheme, ARCHETYPES } from '@/components/menu-templates';
import type { PublicMenuData } from '@/lib/menu-public';

type Device = 'mobile' | 'tablet' | 'desktop';
const DEVICE_W: Record<Device, string> = { mobile: '390px', tablet: '768px', desktop: '100%' };

export default function MenuPreviewPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { id } = router.query;
  const [menu, setMenu] = useState<any>(null);
  const [site, setSite] = useState<any>(null);
  const [currency, setCurrency] = useState('NGN');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [device, setDevice] = useState<Device>('mobile');
  const [templateKey, setTemplateKey] = useState<string>('');
  const [themeKey, setThemeKey] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [menuRes, siteRes, settingsRes] = await Promise.all([
        api.get<{ success: boolean; data: any }>(`/rms/menus/${id}`),
        api.get<{ success: boolean; data: any }>('/menu-sites').catch(() => ({ success: false, data: null })),
        api.get<{ success: boolean; data: any }>('/settings').catch(() => ({ success: false, data: null })),
      ]);
      if (menuRes.success) setMenu(menuRes.data);
      if (siteRes.success && siteRes.data) {
        setSite(siteRes.data);
        setTemplateKey(siteRes.data.templateKey || 'minimal');
        setThemeKey(siteRes.data.themeKey || '');
      } else {
        setTemplateKey('minimal');
      }
      if (settingsRes.success && settingsRes.data) {
        setCurrency(settingsRes.data.currency_code || settingsRes.data.currency || 'NGN');
      }
    } catch (err: any) {
      setToast({ message: err?.response?.data?.message || 'Failed to load menu', type: 'error' });
      setTimeout(() => router.push('/rms/menus'), 1800);
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    if (id) load();
  }, [id, load]);

  // Fixed to the site's saved template — used only for the toolbar label.
  const archetype = useMemo(
    () => ARCHETYPES.find((a) => a.key === templateKey) || ARCHETYPES[0],
    [templateKey],
  );

  const previewData: PublicMenuData | null = useMemo(() => {
    if (!menu) return null;
    const imagesOn = ['noir', 'roast', 'sakura'].includes(templateKey);
    return {
      venue: {
        name: site?.venueName || menu.name || 'Menu',
        tagline: site?.tagline || null,
        logoUrl: site?.logoUrl ? resolveImageUrl(site.logoUrl) : null,
        address: site?.address || null,
        phone: site?.phone || null,
        whatsapp: site?.whatsapp || null,
        instagram: site?.instagram || null,
        facebook: site?.facebook || null,
        tiktok: site?.tiktok || null,
        twitter: site?.twitter || null,
        feedbackUrl: site?.feedbackUrl || null,
        wifiName: site?.wifiName || null,
        wifiPassword: site?.wifiPassword || null,
        currency: site?.currency || currency || 'NGN',
        showPrices: site?.showPrices !== false,
        templateKey: templateKey || 'minimal',
        themeKey,
        accentColor: site?.accentColor || null,
        slug: site?.slug || 'preview',
      },
      menus: [
        {
          id: menu.id,
          name: menu.name,
          categories: (menu.categories || []).map((c: any) => ({
            id: c.id,
            name: c.name,
            items: (c.items || []).map((it: any) => ({
              id: it.id,
              name: it.name,
              description: it.description || null,
              price: Number(it.price ?? it.salePrice ?? 0),
              // Only Noir and Roast are image-forward; other templates render text-only.
              imageUrl:
                imagesOn && (it.image || it.imageUrl)
                  ? resolveImageUrl(it.image || it.imageUrl)
                  : null,
              subcategory: it.subcategory || null,
              isAvailable: it.isAvailable !== false,
            })),
          })),
        },
      ],
    };
  }, [menu, site, currency, templateKey, themeKey]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto"></div>
      </div>
    );
  }
  if (!menu || !previewData) {
    return (
      <div className="bg-white dark:bg-gray-900 ring-1 ring-gray-200 dark:ring-gray-800 rounded-xl p-8 text-center">
        <p className="text-[13px] text-gray-500 dark:text-gray-400">{t('menuNotFound') || 'Menu not found'}</p>
        <Link href="/rms/menus" className="mt-4 inline-block text-[13px] font-medium text-brand-600 dark:text-brand-400">
          {t('backToMenus') || 'Back to Menus'}
        </Link>
      </div>
    );
  }

  const Template = getTemplateComponent(previewData.venue.templateKey);
  const theme = resolveTheme(previewData.venue.templateKey, previewData.venue.themeKey);
  const isMobile = device === 'mobile';

  return (
    <PermissionGuard permission="menus.view">
      <div className="space-y-4">
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

        <PageHeader
          title={t('menuPreview') || 'Menu Preview'}
          subtitle="How guests see this menu — switch template, theme and screen size"
          breadcrumbs={[{ label: t('menus') || 'Menus', href: '/rms/menus' }, { label: t('menuPreview') || 'Preview' }]}
          actions={
            <Button href={`/rms/menus/edit/${id}`} variant="secondary">
              <i className="bx bx-edit" aria-hidden="true"></i>
              <span>{t('edit') || 'Edit'}</span>
            </Button>
          }
        />

        {/* Toolbar: screen-size only — the guest-facing template/theme are fixed */}
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
          <div className="inline-flex rounded-lg border border-gray-200 p-0.5 dark:border-gray-700">
            {(['mobile', 'tablet', 'desktop'] as Device[]).map((d) => (
              <button
                key={d}
                onClick={() => setDevice(d)}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium capitalize transition ${
                  device === d
                    ? 'bg-brand-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                }`}
              >
                <i className={`bx ${d === 'mobile' ? 'bx-mobile-alt' : d === 'tablet' ? 'bx-tab' : 'bx-desktop'}`}></i>
                {d}
              </button>
            ))}
          </div>

          <span className="ml-auto text-xs text-gray-400">
            {archetype.name}
            {previewData.venue.themeKey ? ` · ${previewData.venue.themeKey}` : ''}
          </span>
        </div>

        {/* Device frame */}
        <div className="flex justify-center overflow-x-auto pb-4">
          <div
            className="shrink-0 overflow-hidden bg-white shadow-2xl"
            style={{
              width: DEVICE_W[device],
              maxWidth: '100%',
              height: '78vh',
              borderRadius: isMobile ? '2.25rem' : '1rem',
              border: isMobile ? '10px solid #111827' : '1px solid rgba(0,0,0,0.1)',
            }}
          >
            {/* transform makes any position:fixed inside the template (cover,
                bottom-sheet) resolve to THIS frame instead of the viewport */}
            <div className="h-full w-full overflow-y-auto" style={{ transform: 'translateZ(0)' }}>
              <Template data={previewData} theme={theme} />
            </div>
          </div>
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
