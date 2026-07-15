import { useState, useEffect } from 'react';
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

interface Template {
  id: string;
  name: string;
  description: string;
  preview: string;
  theme_settings?: any;
}

export default function MenuTemplatesPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { menu_id, success } = router.query;
  const [menu, setMenu] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (success) {
      setToast({ message: success as string, type: 'success' });
    }
    loadData();
  }, [menu_id]);

  const loadData = async () => {
    try {
      if (menu_id) {
        const menuRes = await api.get<{ success: boolean; data: any }>(`/rms/menus/${menu_id}`);
        if (menuRes.success) {
          setMenu(menuRes.data);
        }
      }
      
      // TODO: Load templates from backend API
      // For now, using mock templates
      setTemplates([
        {
          id: 'modern',
          name: 'Modern',
          description: 'Clean and modern design with bold typography',
          preview: '/images/templates/modern-preview.png',
        },
        {
          id: 'classic',
          name: 'Classic',
          description: 'Traditional business menu style',
          preview: '/images/templates/classic-preview.png',
        },
        {
          id: 'minimal',
          name: 'Minimal',
          description: 'Simple and elegant minimalist design',
          preview: '/images/templates/minimal-preview.png',
        },
      ]);
    } catch (err: any) {
      console.error('Failed to load data:', err);
      setToast({ message: err.response?.data?.message || t('failedToLoadData') || 'Failed to load data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = (templateId: string) => {
    if (!menu_id) {
      setToast({ message: t('pleaseSelectMenu') || 'Please select a menu first', type: 'error' });
      return;
    }
    // Navigate to template designer/editor
    router.push(`/rms/menus/templates/design?menu_id=${menu_id}&template_id=${templateId}`);
  };

  const handleAiDesigner = () => {
    if (!menu_id) {
      setToast({ message: t('pleaseSelectMenu') || 'Please select a menu first', type: 'error' });
      return;
    }
    // Navigate to AI designer
    router.push(`/rms/menus/templates/ai-designer?menu_id=${menu_id}`);
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto"></div>
      </div>
    );
  }

  return (
    <PermissionGuard permission="menus.edit">
      <div className="max-w-7xl mx-auto space-y-5">
        {toast && (
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        )}

        <PageHeader
          title={t('selectTemplate') || 'Select Template'}
          subtitle={
            menu
              ? `${t('designing') || 'Designing'}: ${menu.name}`
              : t('chooseTemplateForMenu') || 'Choose a beautiful template for your menu'
          }
          breadcrumbs={[
            { label: t('menus') || 'Menus', href: '/rms/menus' },
            { label: t('selectTemplate') || 'Select Template' },
          ]}
        />

        {/* AI Designer Option */}
        <div>
          <button
            onClick={handleAiDesigner}
            className="w-full p-5 bg-brand-gradient hover:bg-brand-gradient-hover text-white rounded-xl transition-colors duration-150 flex items-center justify-between group focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950"
          >
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <i className="bx bx-brain text-xl"></i>
              </div>
              <div className="text-left">
                <h3 className="text-sm font-semibold">{t('aiDesigner') || 'AI Designer'}</h3>
                <p className="text-white/75 text-[13px]">{t('designWithAi') || 'Design your menu template through conversation with AI'}</p>
              </div>
            </div>
            <i className="bx bx-chevron-right text-xl group-hover:translate-x-1 transition-transform"></i>
          </button>
        </div>

        {/* Templates Grid */}
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('orChooseTemplate') || 'Or Choose a Template'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <div
                key={template.id}
                className="bg-white dark:bg-gray-900 rounded-xl ring-1 ring-gray-200 dark:ring-gray-800 hover:ring-brand-300 dark:hover:ring-brand-700 transition-colors duration-150 cursor-pointer overflow-hidden group"
                onClick={() => handleSelectTemplate(template.id)}
              >
                {/* Preview Image */}
                <div className="h-48 bg-gray-50 dark:bg-gray-800/60 flex items-center justify-center">
                  <i className="bx bx-food-menu text-6xl text-gray-300 dark:text-gray-600"></i>
                </div>

                {/* Template Info */}
                <div className="p-5">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">{template.name}</h3>
                  <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-4">{template.description}</p>
                  <Button size="sm" className="w-full">
                    <span>{t('select') || 'Select'}</span>
                    <i className="bx bx-chevron-right"></i>
                  </Button>
                </div>
              </div>
            ))}
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
