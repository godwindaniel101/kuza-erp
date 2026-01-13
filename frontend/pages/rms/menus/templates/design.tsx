import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import Link from 'next/link';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import Toast from '@/components/Toast';

export default function TemplateDesignerPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { menu_id, template_id } = router.query;
  const [menu, setMenu] = useState<any>(null);
  const [template, setTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (menu_id) {
      loadData();
    }
  }, [menu_id, template_id]);

  const loadData = async () => {
    try {
      if (menu_id) {
        const menuRes = await api.get<{ success: boolean; data: any }>(`/rms/menus/${menu_id}`);
        if (menuRes.success) {
          setMenu(menuRes.data);
        }
      }
      
      // Load template details (for now using mock data, should come from backend)
      if (template_id) {
        const templates: { [key: string]: any } = {
          'modern': {
            id: 'modern',
            name: 'Modern',
            description: 'Clean and modern design with bold typography',
            theme_settings: {
              primaryColor: '#dc2626',
              fontFamily: 'Inter',
              layout: 'modern',
            },
          },
          'classic': {
            id: 'classic',
            name: 'Classic',
            description: 'Traditional restaurant menu style',
            theme_settings: {
              primaryColor: '#92400e',
              fontFamily: 'Times New Roman',
              layout: 'classic',
            },
          },
          'minimal': {
            id: 'minimal',
            name: 'Minimal',
            description: 'Simple and elegant minimalist design',
            theme_settings: {
              primaryColor: '#000000',
              fontFamily: 'Helvetica',
              layout: 'minimal',
            },
          },
        };
        setTemplate(templates[template_id as string] || templates['modern']);
      }
    } catch (err: any) {
      console.error('Failed to load data:', err);
      setToast({ message: err.response?.data?.message || t('failedToLoadData') || 'Failed to load data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleApplyTemplate = async () => {
    if (!menu_id || !template_id) {
      setToast({ message: t('pleaseSelectMenu') || 'Please select a menu first', type: 'error' });
      return;
    }

    setApplying(true);
    try {
      // Apply template to menu
      const response = await api.patch<{ success: boolean; message?: string }>(`/rms/menus/${menu_id}`, {
        themeSettings: template.theme_settings,
        templateId: template_id,
      });

      if (response.success) {
        setToast({ message: response.message || t('templateApplied') || 'Template applied successfully!', type: 'success' });
        setTimeout(() => {
          router.push(`/rms/menus/preview/${menu_id}`);
        }, 1500);
      } else {
        setToast({ message: response.message || t('failedToApplyTemplate') || 'Failed to apply template', type: 'error' });
      }
    } catch (err: any) {
      console.error('Failed to apply template:', err);
      setToast({ message: err.response?.data?.message || t('failedToApplyTemplate') || 'Failed to apply template', type: 'error' });
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <PermissionGuard permission="menus.edit">
      <div className="p-6 max-w-4xl mx-auto">
        {toast && (
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        )}

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href={`/rms/menus/templates?menu_id=${menu_id}`} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              <i className="bx bx-arrow-back text-xl"></i>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('templateDesigner') || 'Template Designer'}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {template ? template.name : t('loadingTemplate') || 'Loading template...'}
              </p>
            </div>
          </div>
        </div>

        {template && menu ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">{template.name}</h2>
              <p className="text-gray-600 dark:text-gray-400">{template.description}</p>
            </div>

            {/* Template Preview */}
            <div className="mb-6 p-6 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">{t('templatePreview') || 'Template Preview'}</h3>
              <div className="aspect-[3/4] bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border-2" style={{ borderColor: template.theme_settings?.primaryColor || '#dc2626' }}>
                <div className="text-center mb-4" style={{ color: template.theme_settings?.primaryColor || '#dc2626' }}>
                  <h4 className="text-2xl font-bold">{menu.name}</h4>
                  {menu.description && (
                    <p className="text-sm mt-2 text-gray-600 dark:text-gray-400">{menu.description}</p>
                  )}
                </div>
                <div className="space-y-3">
                  {menu.categories && menu.categories.slice(0, 2).map((category: any, idx: number) => (
                    <div key={idx}>
                      <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2" style={{ color: template.theme_settings?.primaryColor || '#dc2626' }}>
                        {category.name}
                      </h5>
                      {category.items && category.items.slice(0, 3).map((item: any, itemIdx: number) => (
                        <div key={itemIdx} className="flex justify-between py-1 text-sm">
                          <span className="text-gray-900 dark:text-gray-100">{item.name}</span>
                          <span className="font-semibold" style={{ color: template.theme_settings?.primaryColor || '#dc2626' }}>
                            ₦{Number(item.price || 0).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Apply Template Button */}
            <div className="flex justify-end space-x-3">
              <Link
                href={`/rms/menus/templates?menu_id=${menu_id}`}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {t('back') || 'Back'}
              </Link>
              <button
                onClick={handleApplyTemplate}
                disabled={applying}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {applying ? (
                  <>
                    <i className="bx bx-loader-alt bx-spin text-lg"></i>
                    <span>{t('applying') || 'Applying...'}</span>
                  </>
                ) : (
                  <>
                    <i className="bx bx-check text-lg"></i>
                    <span>{t('applyTemplate') || 'Apply Template'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">{t('templateNotFound') || 'Template not found'}</p>
            <Link href={`/rms/menus/templates?menu_id=${menu_id}`} className="mt-4 inline-block text-red-600 hover:text-red-700 dark:text-red-400">
              {t('backToTemplates') || 'Back to Templates'}
            </Link>
          </div>
        )}
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
