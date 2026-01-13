import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import Link from 'next/link';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import Toast from '@/components/Toast';

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
          description: 'Traditional restaurant menu style',
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
      <div className="p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <PermissionGuard permission="menus.edit">
      <div className="p-6 max-w-7xl mx-auto">
        {toast && (
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        )}

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/rms/menus" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              <i className="bx bx-arrow-back text-xl"></i>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('selectTemplate') || 'Select Template'}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {menu ? `${t('designing') || 'Designing'}: ${menu.name}` : t('chooseTemplateForMenu') || 'Choose a beautiful template for your menu'}
              </p>
            </div>
          </div>
        </div>

        {/* AI Designer Option */}
        <div className="mb-8">
          <button
            onClick={handleAiDesigner}
            className="w-full p-6 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg shadow-lg transition-all flex items-center justify-between group"
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <i className="bx bx-brain text-2xl"></i>
              </div>
              <div className="text-left">
                <h3 className="text-xl font-bold">{t('aiDesigner') || 'AI Designer'}</h3>
                <p className="text-purple-100 text-sm">{t('designWithAi') || 'Design your menu template through conversation with AI'}</p>
              </div>
            </div>
            <i className="bx bx-chevron-right text-2xl group-hover:translate-x-1 transition-transform"></i>
          </button>
        </div>

        {/* Templates Grid */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('orChooseTemplate') || 'Or Choose a Template'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <div
                key={template.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow cursor-pointer overflow-hidden group"
                onClick={() => handleSelectTemplate(template.id)}
              >
                {/* Preview Image */}
                <div className="h-48 bg-gradient-to-br from-red-100 to-red-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
                  <i className="bx bx-food-menu text-6xl text-red-500 dark:text-red-400 opacity-50"></i>
                </div>
                
                {/* Template Info */}
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{template.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{template.description}</p>
                  <button className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 transition-colors flex items-center justify-center space-x-2">
                    <span>{t('select') || 'Select'}</span>
                    <i className="bx bx-chevron-right"></i>
                  </button>
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
