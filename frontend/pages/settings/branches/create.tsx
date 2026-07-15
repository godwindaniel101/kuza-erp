import { useState } from 'react';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import FormField from '@/components/ui/FormField';
import Toast from '@/components/Toast';

export default function CreateBranchPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    isDefault: false,
    isActive: true,
  });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setToast(null);

    try {
      // Clean payload - only send defined non-empty values for optional fields
      const payload: any = {
        name: formData.name.trim(),
        isDefault: formData.isDefault || false,
        isActive: formData.isActive !== undefined ? formData.isActive : true,
      };

      if (formData.address?.trim()) {
        payload.address = formData.address.trim();
      }
      if (formData.phone?.trim()) {
        payload.phone = formData.phone.trim();
      }
      if (formData.email?.trim()) {
        payload.email = formData.email.trim();
      }

      const response = await api.post<{ success: boolean; data: any; message?: string }>('/settings/branches', payload);
      if (response.success) {
        setToast({ message: response.message || t('branchCreated') || 'Branch created successfully', type: 'success' });
        setTimeout(() => {
          router.push('/settings/branches');
        }, 1000);
      } else {
        setToast({ message: response.message || t('failedToCreateBranch') || 'Failed to create branch', type: 'error' });
      }
    } catch (err: any) {
      console.error('Failed to create branch:', err);
      const errorMessage = err.response?.data?.message || err.message || t('failedToCreateBranch') || 'Failed to create branch';
      setToast({ message: errorMessage, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <PageHeader
        title={<>{t('create')} {t('branch')}</>}
        subtitle="Add a new business location"
        breadcrumbs={[
          { label: t('settings') || 'Settings', href: '/settings' },
          { label: t('branches') || 'Branches', href: '/settings/branches' },
          { label: t('create') || 'Create' },
        ]}
      />

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* First Row: Name | Contact Number | Email (1/3 each) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              type="text"
              name="name"
              label={t('name')}
              required
              value={formData.name}
              onChange={(value) => setFormData({ ...formData, name: value })}
            />

            <FormField
              type="text"
              name="phone"
              label={t('contactNumber') || t('phone')}
              value={formData.phone}
              onChange={(value) => setFormData({ ...formData, phone: value })}
              inputProps={{ type: 'tel' }}
            />

            <FormField
              type="email"
              name="email"
              label={t('email')}
              value={formData.email}
              onChange={(value) => setFormData({ ...formData, email: value })}
            />
          </div>

          {/* Second Row: Address (full width, 3/3) */}
          <FormField
            type="textarea"
            name="address"
            label={t('address')}
            rows={3}
            value={formData.address}
            onChange={(value) => setFormData({ ...formData, address: value })}
          />

          <div className="flex items-center space-x-4">
            <FormField
              type="checkbox"
              name="isDefault"
              checked={formData.isDefault}
              onChange={(checked) => setFormData({ ...formData, isDefault: checked })}
              checkboxLabel={t('default')}
            />
            <FormField
              type="checkbox"
              name="isActive"
              checked={formData.isActive}
              onChange={(checked) => setFormData({ ...formData, isActive: checked })}
              checkboxLabel={t('active')}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              {t('cancel')}
            </Button>
            <Button type="submit" variant="primary" disabled={loading || !formData.name.trim()}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {t('saving') || 'Saving...'}
                </span>
              ) : (
                t('save')
              )}
            </Button>
          </div>
        </form>
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

