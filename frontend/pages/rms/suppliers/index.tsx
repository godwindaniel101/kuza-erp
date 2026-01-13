import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import Toast from '@/components/Toast';
import Modal from '@/components/Modal';

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
      <div className="p-6 bg-white dark:bg-gray-900 min-h-screen">
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('suppliers')}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {t('manageSuppliers') || 'Manage your suppliers and vendors'}
            </p>
          </div>
          <PermissionGuard permission="suppliers.create">
            <button 
              onClick={() => setShowCreate(true)} 
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 transition-colors flex items-center gap-2"
            >
              <i className="bx bx-plus"></i>
              {t('add')} {t('supplier')}
            </button>
          </PermissionGuard>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
          </div>
        ) : suppliers.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-12 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
              <i className="bx bx-user-voice text-red-600 dark:text-red-400 text-3xl"></i>
            </div>
            <h3 className="text-gray-900 dark:text-gray-100 font-medium text-lg mb-2">{t('noSuppliersYet') || 'No suppliers yet'}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{t('addSuppliersToStart') || 'Add suppliers to start recording inflows'}</p>
            <PermissionGuard permission="suppliers.create">
              <button 
                onClick={() => setShowCreate(true)} 
                className="inline-flex items-center px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 transition-colors"
              >
                <i className="bx bx-plus mr-2"></i>
                {t('add')} {t('supplier')}
              </button>
            </PermissionGuard>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {suppliers.map((supplier) => {
              const letter = (supplier.name || '').trim().charAt(0).toUpperCase();
              return (
                <div 
                  key={supplier.id} 
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-red-700 dark:text-red-200 font-semibold text-lg">{letter || '?'}</span>
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
                        <button className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title={t('edit')}>
                          <i className="bx bx-edit text-lg"></i>
                        </button>
                      </PermissionGuard>
                      <PermissionGuard permission="suppliers.delete">
                        <button className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title={t('delete')}>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('name')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newSupplier.name}
                  onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                  placeholder={t('supplierName') || 'Supplier name'}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-transparent"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('contactPerson') || 'Contact Person'} <span className="text-gray-400 dark:text-gray-500 text-xs">({t('optional')})</span>
                </label>
                <input
                  type="text"
                  value={newSupplier.contactPerson}
                  onChange={(e) => setNewSupplier({ ...newSupplier, contactPerson: e.target.value })}
                  placeholder={t('contactPersonName') || 'Contact person name'}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('email')} <span className="text-gray-400 dark:text-gray-500 text-xs">({t('optional')})</span>
                </label>
                <input
                  type="email"
                  value={newSupplier.email}
                  onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
                  placeholder={t('emailAddress') || 'email@example.com'}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('phone')} <span className="text-gray-400 dark:text-gray-500 text-xs">({t('optional')})</span>
                </label>
                <input
                  type="tel"
                  value={newSupplier.phone}
                  onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                  placeholder={t('phoneNumber') || '+1234567890'}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('address')} <span className="text-gray-400 dark:text-gray-500 text-xs">({t('optional')})</span>
                </label>
                <textarea
                  value={newSupplier.address}
                  onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
                  placeholder={t('address') || 'Street address'}
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-transparent resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowCreate(false);
                  setNewSupplier({ name: '', email: '', phone: '', contactPerson: '', address: '' });
                }}
                className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                disabled={creating}
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={creating || !newSupplier.name.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors dark:bg-red-700 dark:hover:bg-red-600"
              >
                {creating ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    {t('creating') || 'Creating...'}
                  </span>
                ) : (
                  t('save')
                )}
              </button>
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

