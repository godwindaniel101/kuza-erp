import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import Toast from '@/components/Toast';
import Modal from '@/components/Modal';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';
import FormField from '@/components/ui/FormField';
import { downloadCsv } from '@/lib/format';

export default function SuppliersPage() {
  const { t } = useTranslation('common');
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [newSupplier, setNewSupplier] = useState({ name: '', email: '', phone: '', contactPerson: '', address: '' });

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      const response = await api.get<{ success: boolean; data: any[] }>('/rms/suppliers');
      if (response.success) {
        setSuppliers(response.data);
      }
    } catch (err) {
      console.error('Failed to load suppliers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSupplier = async () => {
    if (!newSupplier.name.trim()) {
      setToast({ message: t('nameRequired') || 'Name is required', type: 'error' });
      return;
    }

    setCreating(true);
    try {
      const payload: any = {
        name: newSupplier.name.trim(),
      };

      if (newSupplier.contactPerson?.trim()) {
        payload.contactPerson = newSupplier.contactPerson.trim();
      }
      if (newSupplier.email?.trim()) {
        payload.email = newSupplier.email.trim();
      }
      if (newSupplier.phone?.trim()) {
        payload.phone = newSupplier.phone.trim();
      }
      if (newSupplier.address?.trim()) {
        payload.address = newSupplier.address.trim();
      }

      const res = await api.post<{ success: boolean; data: any; message?: string }>('/rms/suppliers', payload);
      if (res.success) {
        setToast({ message: res.message || t('createdSuccessfully') || 'Supplier created successfully', type: 'success' });
        setShowCreate(false);
        setNewSupplier({ name: '', email: '', phone: '', contactPerson: '', address: '' });
        await loadSuppliers();
      } else {
        setToast({ message: res.message || t('createFailed') || 'Failed to create supplier', type: 'error' });
      }
    } catch (err: any) {
      console.error('Failed to create supplier:', err);
      const errorMessage = err.response?.data?.message || err.message || t('createFailed') || 'Failed to create supplier';
      setToast({ message: errorMessage, type: 'error' });
    } finally {
      setCreating(false);
    }
  };

  return (
    <PermissionGuard permission="suppliers.view">
      <div className="space-y-5">
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        
        <PageHeader
          title={t('suppliers') || 'Suppliers'}
          count={loading ? undefined : suppliers.length}
          subtitle="Everyone you buy from, in one list"
          breadcrumbs={[{ label: 'Restaurant' }, { label: t('suppliers') || 'Suppliers' }]}
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  downloadCsv(
                    'suppliers.csv',
                    [t('name'), t('contactPerson') || 'Contact Person', t('email'), t('phone'), t('address')],
                    suppliers.map((s) => [s.name, s.contactPerson || '', s.email || '', s.phone || '', s.address || '']),
                  )
                }
                disabled={loading || suppliers.length === 0}
              >
                <i className="bx bx-download" aria-hidden="true"></i>
                {t('export') || 'Export'} CSV
              </Button>
              <PermissionGuard permission="suppliers.create">
                <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
                  <i className="bx bx-plus" aria-hidden="true"></i>
                  {t('add')} {t('supplier')}
                </Button>
              </PermissionGuard>
            </div>
          }
        />
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
          </div>
        ) : suppliers.length === 0 ? (
          <EmptyState
            icon="bx-user-voice"
            title={t('noSuppliersYet') || 'No suppliers yet'}
            description={t('addSuppliersToStart') || 'Add suppliers to start recording inflows'}
            actions={
              <PermissionGuard permission="suppliers.create">
                <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
                  <i className="bx bx-plus" aria-hidden="true"></i>
                  {t('add')} {t('supplier')}
                </Button>
              </PermissionGuard>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {suppliers.map((supplier) => {
              const letter = (supplier.name || '').trim().charAt(0).toUpperCase();
              return (
                <div 
                  key={supplier.id} 
                  className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 p-4 hover:ring-brand-300 dark:hover:ring-brand-700 transition-shadow duration-150"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="h-12 w-12 rounded-full bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-brand-700 dark:text-brand-300 font-semibold text-lg">{letter || '?'}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{supplier.name}</p>
                        {supplier.contactPerson && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{supplier.contactPerson}</p>
                        )}
                        {supplier.email && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{supplier.email}</p>
                        )}
                        {supplier.phone && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{supplier.phone}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 ml-2">
                      <PermissionGuard permission="suppliers.edit">
                        <button className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title={t('edit')}>
                          <i className="bx bx-edit text-lg"></i>
                        </button>
                      </PermissionGuard>
                      <PermissionGuard permission="suppliers.delete">
                        <button className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title={t('delete')}>
                          <i className="bx bx-trash text-lg"></i>
                        </button>
                      </PermissionGuard>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Modal
          isOpen={showCreate}
          onClose={() => {
            setShowCreate(false);
            setNewSupplier({ name: '', email: '', phone: '', contactPerson: '', address: '' });
          }}
          title={`${t('add')} ${t('supplier')}`}
          maxWidth="md"
        >
          <form onSubmit={(e) => { e.preventDefault(); handleCreateSupplier(); }}>
            <div className="space-y-4">
              <FormField
                name="name"
                type="text"
                label={t('name')}
                required
                value={newSupplier.name}
                onChange={(value) => setNewSupplier({ ...newSupplier, name: value })}
                placeholder={t('supplierName') || 'Supplier name'}
                inputProps={{ autoFocus: true }}
              />

              <div>
                <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('contactPerson') || 'Contact Person'} <span className="text-gray-400 dark:text-gray-500 text-xs">({t('optional')})</span>
                </label>
                <input
                  type="text"
                  value={newSupplier.contactPerson}
                  onChange={(e) => setNewSupplier({ ...newSupplier, contactPerson: e.target.value })}
                  placeholder={t('contactPersonName') || 'Contact person name'}
                  className="h-9 w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:border-transparent"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('email')} <span className="text-gray-400 dark:text-gray-500 text-xs">({t('optional')})</span>
                </label>
                <input
                  type="email"
                  value={newSupplier.email}
                  onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
                  placeholder={t('emailAddress') || 'email@example.com'}
                  className="h-9 w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:border-transparent"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('phone')} <span className="text-gray-400 dark:text-gray-500 text-xs">({t('optional')})</span>
                </label>
                <input
                  type="tel"
                  value={newSupplier.phone}
                  onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                  placeholder={t('phoneNumber') || '+1234567890'}
                  className="h-9 w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:border-transparent"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('address')} <span className="text-gray-400 dark:text-gray-500 text-xs">({t('optional')})</span>
                </label>
                <textarea
                  value={newSupplier.address}
                  onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
                  placeholder={t('address') || 'Street address'}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:border-transparent resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowCreate(false);
                  setNewSupplier({ name: '', email: '', phone: '', contactPerson: '', address: '' });
                }}
                disabled={creating}
              >
                {t('cancel')}
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={creating}
                disabled={!newSupplier.name.trim()}
              >
                {creating ? t('creating') || 'Creating...' : t('save')}
              </Button>
            </div>
          </form>
        </Modal>
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

