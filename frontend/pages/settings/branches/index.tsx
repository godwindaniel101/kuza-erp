import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import Pagination from '@/components/Pagination';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';

export default function BranchesPage() {
  const { t } = useTranslation('common');
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    isDefault: false,
    isActive: true,
  });
  const [saving, setSaving] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    loadBranches();
  }, []);

  const loadBranches = async () => {
    try {
      const response = await api.get<{ success: boolean; data: any[] }>('/settings/branches?includeStats=true');
      if (response.success) {
        setBranches(response.data);
      }
    } catch (err) {
      console.error('Failed to load branches:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      phone: '',
      email: '',
      isDefault: false,
      isActive: true,
    });
    setEditingBranch(null);
  };

  const handleOpenCreateModal = () => {
    resetForm();
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = async (branch: any) => {
    try {
      const response = await api.get<{ success: boolean; data: any }>(`/settings/branches/${branch.id}`);
      if (response.success) {
        setEditingBranch(response.data);
        setFormData({
          name: response.data.name || '',
          address: response.data.address || '',
          phone: response.data.phone || '',
          email: response.data.email || '',
          isDefault: response.data.isDefault || false,
          isActive: response.data.isActive !== undefined ? response.data.isActive : true,
        });
        setIsEditModalOpen(true);
      }
    } catch (err: any) {
      setToast({ 
        message: err.response?.data?.message || err.message || t('failedToLoadBranch') || 'Failed to load branch', 
        type: 'error' 
      });
    }
  };

  const handleCloseModals = () => {
    setIsCreateModalOpen(false);
    setIsEditModalOpen(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
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

      let response;
      if (editingBranch) {
        // Update
        response = await api.patch<{ success: boolean; data: any; message?: string }>(
          `/settings/branches/${editingBranch.id}`,
          payload
        );
      } else {
        // Create
        response = await api.post<{ success: boolean; data: any; message?: string }>(
          '/settings/branches',
          payload
        );
      }

      if (response.success) {
        setToast({ 
          message: response.message || (editingBranch ? t('branchUpdated') || 'Branch updated successfully' : t('branchCreated') || 'Branch created successfully'), 
          type: 'success' 
        });
        handleCloseModals();
        loadBranches();
      } else {
        setToast({ 
          message: response.message || (editingBranch ? t('failedToUpdateBranch') || 'Failed to update branch' : t('failedToCreateBranch') || 'Failed to create branch'), 
          type: 'error' 
        });
      }
    } catch (err: any) {
      console.error(`Failed to ${editingBranch ? 'update' : 'create'} branch:`, err);
      const errorMessage = err.response?.data?.message || err.message || 
        (editingBranch ? t('failedToUpdateBranch') || 'Failed to update branch' : t('failedToCreateBranch') || 'Failed to create branch');
      setToast({ message: errorMessage, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('branches')}</h1>
          <p className="text-gray-600 dark:text-gray-400">{t('manageBranches')}</p>
        </div>
        <PermissionGuard permission="branches.create">
          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-lg text-sm font-medium hover:bg-red-700 dark:hover:bg-red-600 flex items-center space-x-2 shadow-sm"
          >
            <i className="bx bx-plus"></i>
            <span>{t('add')} {t('branch')}</span>
          </button>
        </PermissionGuard>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : branches.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-3">
            <i className="bx bx-store text-gray-400 dark:text-gray-500 text-2xl"></i>
          </div>
          <h3 className="text-gray-900 dark:text-gray-100 font-medium text-lg mb-2">{t('noBranchesYet') || 'No branches yet'}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{t('addYourFirstBranch') || 'Add your first branch to get started'}</p>
          <PermissionGuard permission="branches.create">
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 transition-colors"
            >
              <i className="bx bx-plus mr-2"></i>
              <span>{t('add')} {t('branch')}</span>
            </button>
          </PermissionGuard>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {branches.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((branch) => (
              <div
                key={branch.id}
                className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {branch.name}
                      {branch.isDefault && (
                        <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">({t('default')})</span>
                      )}
                    </h3>
                    <span
                      className={`inline-block mt-2 px-2 py-1 text-xs rounded-full ${
                        branch.isActive
                          ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                      }`}
                    >
                      {branch.isActive ? t('active') : t('inactive')}
                    </span>
                  </div>
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === branch.id ? null : branch.id);
                      }}
                      className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      title={t('actions') || 'Actions'}
                    >
                      <i className="bx bx-dots-vertical-rounded text-xl"></i>
                    </button>
                    
                    {openMenuId === branch.id && (
                      <>
                        {/* Backdrop to close menu on outside click */}
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setOpenMenuId(null)}
                        ></div>
                        
                        {/* Dropdown menu */}
                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20 py-1">
                          <PermissionGuard permission="branches.edit">
                            <button
                              onClick={() => {
                                handleOpenEditModal(branch);
                                setOpenMenuId(null);
                              }}
                              className="w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 transition-colors"
                            >
                              <i className="bx bx-edit text-blue-600 dark:text-blue-400"></i>
                              <span>{t('edit')}</span>
                            </button>
                          </PermissionGuard>
                          <button
                            onClick={() => {
                              window.location.href = `/ims/inventory?branchId=${branch.id}&lowStock=true`;
                              setOpenMenuId(null);
                            }}
                            className="w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 transition-colors"
                          >
                            <i className="bx bx-error-circle text-red-600 dark:text-red-400"></i>
                            <span>{t('viewLowStocks') || 'View Low Stocks'}</span>
                          </button>
                          <button
                            onClick={() => {
                              window.location.href = `/rms/reports?branchId=${branch.id}`;
                              setOpenMenuId(null);
                            }}
                            className="w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 transition-colors"
                          >
                            <i className="bx bx-line-chart text-blue-600 dark:text-blue-400"></i>
                            <span>{t('analytics') || 'Analytics'}</span>
                          </button>
                          <button
                            onClick={() => {
                              window.location.href = `/ims/inflows?branchId=${branch.id}`;
                              setOpenMenuId(null);
                            }}
                            className="w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 transition-colors"
                          >
                            <i className="bx bx-history text-green-600 dark:text-green-400"></i>
                            <span>{t('inflowHistory') || 'History'}</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Address */}
                {branch.address && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 flex items-start">
                      <i className="bx bx-map mr-2 mt-0.5 text-gray-400"></i>
                      <span className="flex-1">{branch.address}</span>
                    </p>
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('lowStock') || 'Low Stock'}</p>
                    <p className="text-lg font-semibold text-red-600 dark:text-red-400">
                      {branch.stats?.lowStockCount || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('totalSales') || 'Total Sales'}</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      ₦{Number(branch.stats?.totalSales || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

              </div>
            ))}
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(branches.length / itemsPerPage)}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            totalItems={branches.length}
            startIndex={(currentPage - 1) * itemsPerPage}
            endIndex={Math.min(currentPage * itemsPerPage, branches.length)}
          />
        </>
      )}

      {/* Create Branch Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={handleCloseModals}
        title={`${t('create')} ${t('branch')}`}
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* First Row: Name | Contact Number | Email (1/3 each) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('name')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full min-h-[48px] px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-transparent"
                placeholder={t('name') || 'Name'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('contactNumber') || t('phone')}
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full min-h-[48px] px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-transparent"
                placeholder={t('phone') || 'Phone'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('email')}
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full min-h-[48px] px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-transparent"
                placeholder={t('email') || 'Email'}
              />
            </div>
          </div>

          {/* Second Row: Address (full width) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('address')}
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              rows={3}
              className="w-full min-h-[48px] px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-transparent"
              placeholder={t('address') || 'Address'}
            />
          </div>

          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isDefault}
                onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                className="rounded border-gray-300 dark:border-gray-700 text-red-600 focus-visible:ring-red-500"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{t('default')}</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded border-gray-300 dark:border-gray-700 text-red-600 focus-visible:ring-red-500"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{t('active')}</span>
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleCloseModals}
              className="px-4 py-3 border border-gray-300 dark:border-gray-600 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              disabled={saving}
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={saving || !formData.name.trim()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors dark:bg-red-700 dark:hover:bg-red-600"
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {t('saving') || 'Saving...'}
                </span>
              ) : (
                t('save')
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Branch Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={handleCloseModals}
        title={`${t('edit')} ${t('branch')}`}
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* First Row: Name | Contact Number | Email (1/3 each) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('name')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full min-h-[48px] px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-transparent"
                placeholder={t('name') || 'Name'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('contactNumber') || t('phone')}
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full min-h-[48px] px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-transparent"
                placeholder={t('phone') || 'Phone'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('email')}
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full min-h-[48px] px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-transparent"
                placeholder={t('email') || 'Email'}
              />
            </div>
          </div>

          {/* Second Row: Address (full width) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('address')}
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              rows={3}
              className="w-full min-h-[48px] px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-transparent"
              placeholder={t('address') || 'Address'}
            />
          </div>

          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isDefault}
                onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                className="rounded border-gray-300 dark:border-gray-700 text-red-600 focus-visible:ring-red-500"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{t('default')}</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded border-gray-300 dark:border-gray-700 text-red-600 focus-visible:ring-red-500"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{t('active')}</span>
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleCloseModals}
              className="px-4 py-3 border border-gray-300 dark:border-gray-600 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              disabled={saving}
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={saving || !formData.name.trim()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors dark:bg-red-700 dark:hover:bg-red-600"
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {t('saving') || 'Saving...'}
                </span>
              ) : (
                t('update') || t('save')
              )}
            </button>
          </div>
        </form>
      </Modal>
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

