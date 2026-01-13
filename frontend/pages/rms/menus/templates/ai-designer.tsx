import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import Link from 'next/link';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import Toast from '@/components/Toast';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AiDesignerPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { menu_id } = router.query;
  const [menu, setMenu] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (menu_id) {
      loadMenu();
      // Initialize with welcome message
      setMessages([{
        role: 'assistant',
        content: t('aiDesignerWelcome') || 'Hello! I\'m your AI menu designer. Tell me how you\'d like your menu to look. For example, you can say "Make it modern with red colors" or "I want a classic elegant design".',
      }]);
    }
  }, [menu_id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMenu = async () => {
    try {
      if (menu_id) {
        const menuRes = await api.get<{ success: boolean; data: any }>(`/rms/menus/${menu_id}`);
        if (menuRes.success) {
          setMenu(menuRes.data);
        }
      }
    } catch (err: any) {
      console.error('Failed to load menu:', err);
      setToast({ message: err.response?.data?.message || t('failedToLoadData') || 'Failed to load menu', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || sending) return;

    const messageContent = inputMessage.trim();
    const userMessage: Message = { role: 'user', content: messageContent };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setSending(true);

    try {
      // Call AI design endpoint
      const response = await api.post<{ success: boolean; design_spec?: any; message?: string; error?: string }>('/rms/menus/ai/design', {
        menu_id: menu_id,
        prompt: messageContent,
        conversation_context: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
      });

      if (response.success && response.design_spec) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: response.message || t('aiDesignApplied') || 'I\'ve updated your menu design based on your request. How would you like to adjust it further?',
        };
        setMessages(prev => [...prev, assistantMessage]);
        
        // If design is complete, show success message
        if (response.design_spec.theme_settings) {
          setToast({ message: t('templateApplied') || 'Template applied successfully!', type: 'success' });
        }
      } else {
        const errorMessage: Message = {
          role: 'assistant',
          content: response.error || response.message || t('aiDesignError') || 'Sorry, I encountered an error. Please try again.',
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (err: any) {
      console.error('Failed to generate design:', err);
      const errorMessage: Message = {
        role: 'assistant',
        content: err.response?.data?.message || t('aiDesignError') || 'Sorry, I encountered an error. Please try again.',
      };
      setMessages(prev => [...prev, errorMessage]);
      setToast({ message: err.response?.data?.message || t('aiDesignError') || 'Failed to generate design', type: 'error' });
    } finally {
      setSending(false);
    }
  };

  const handleApplyAndPreview = () => {
    if (menu_id) {
      router.push(`/rms/menus/preview/${menu_id}`);
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
      <div className="p-6 max-w-4xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
        {toast && (
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        )}

        {/* Header */}
        <div className="mb-6 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-3">
            <Link href={`/rms/menus/templates?menu_id=${menu_id}`} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              <i className="bx bx-arrow-back text-xl"></i>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('aiDesigner') || 'AI Designer'}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {menu ? `${t('designing') || 'Designing'}: ${menu.name}` : t('designWithAi') || 'Design your menu template through conversation'}
              </p>
            </div>
          </div>
          <button
            onClick={handleApplyAndPreview}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-600 transition-colors"
          >
            {t('preview') || 'Preview'}
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6 mb-4">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-4 ${
                    message.role === 'user'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                    <span className="text-gray-600 dark:text-gray-400">{t('thinking') || 'Thinking...'}</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSendMessage} className="flex-shrink-0">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex space-x-3">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={t('describeYourMenuDesign') || 'Describe how you want your menu to look...'}
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-purple-500 focus-visible:border-transparent"
                disabled={sending}
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || sending}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <i className="bx bx-send text-lg"></i>
                <span>{t('send') || 'Send'}</span>
              </button>
            </div>
          </div>
        </form>
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
