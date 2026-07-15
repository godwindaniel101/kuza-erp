import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import Pagination from '@/components/Pagination';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import FormField from '@/components/ui/FormField';
import StatusBadge from '@/components/ui/StatusBadge';
import { handleBulkUploadResponse, logBulkUploadErrors, type BulkUploadResponse } from '@/utils/bulkUploadHandler';

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

  // Bulk upload states
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);

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

  // Bulk upload functions
  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get<{ success: boolean; data: string }>('/settings/branches/template/download');
      if (response.success) {
        // Create and download CSV file
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'branches_template.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        setToast({ message: t('templateDownloadedSuccessfully') || 'Template downloaded successfully', type: 'success' });
      }
    } catch (err: any) {
      console.error('Failed to download template:', err);
      setToast({ message: err.response?.data?.message || t('failedToDownloadTemplate') || 'Failed to download template', type: 'error' });
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    const csvFile = droppedFiles.find(file => file.type === 'text/csv' || file.name.endsWith('.csv'));
    
    if (csvFile) {
      setFile(csvFile);
    } else {
      setToast({ message: t('pleaseUploadOnlyCsvFiles') || 'Please upload only CSV files', type: 'error' });
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile);
      } else {
        setToast({ message: t('pleaseUploadOnlyCsvFiles') || 'Please upload only CSV files', type: 'error' });
      }
    }
  };

  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    try {
      const csvText = await file.text();
      
      const response = await api.post<BulkUploadResponse>('/settings/branches/bulk-upload', {
        csv: csvText,
      });

      // Use the global bulk upload handler
      const result = handleBulkUploadResponse(response, t, 'branches');
      
      // Log detailed errors to console for debugging
      logBulkUploadErrors(response, 'branches');
      
      // Show the result toast
      setToast({
        message: result.message,
        type: result.type === 'info' ? 'success' : result.type // Map 'info' to 'success' for Toast component
      });
      
      // Close modal and reset file if successful or if explicitly requested
      if (result.shouldCloseModal) {
        setShowBulkUpload(false);
        setFile(null);
        await loadBranches(); // Reload branches to show new data
      }
      
    } catch (err: any) {
      console.error('Failed to upload branches:', err);
      const errorMessage = err.response?.data?.message || err.message || t('failedToUploadBranches') || 'Failed to upload branches';
      setToast({ message: errorMessage, type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-5">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <PageHeader
        title={t('branches')}
        subtitle={t('manageBranches')}
        count={loading ? undefined : branches.length}
        breadcrumbs={[{ label: t('settings') || 'Settings' }, { label: t('branches') }]}
        actions={
          <PermissionGuard permission="branches.create">
            <Button variant="secondary" size="sm" onClick={() => setShowBulkUpload(true)}>
              <i className="bx bx-upload"></i>
              <span>{t('bulkUpload')}</span>
            </Button>
            <Button size="sm" onClick={handleOpenCreateModal}>
              <i className="bx bx-plus"></i>
              <span>{t('add')} {t('branch')}</span>
            </Button>
          </PermissionGuard>
        }
      />

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto"></div>
        </div>
      ) : branches.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 ring-1 ring-gray-200 dark:ring-gray-800 rounded-xl p-8 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
            <i className="bx bx-store text-gray-400 dark:text-gray-500 text-2xl"></i>
          </div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">{t('noBranchesYet') || 'No branches yet'}</h3>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-6">{t('addYourFirstBranch') || 'Add your first branch to get started'}</p>
          <PermissionGuard permission="branches.create">
            <Button size="sm" onClick={handleOpenCreateModal}>
              <i className="bx bx-plus"></i>
              <span>{t('add')} {t('branch')}</span>
            </Button>
          </PermissionGuard>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {branches.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((branch) => (
              <div
                key={branch.id}
                className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 p-5 hover:ring-brand-300 dark:hover:ring-brand-700 transition-shadow duration-150"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex flex-1 items-start gap-3 min-w-0">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
                      <i className="bx bx-store text-lg" aria-hidden="true"></i>
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {branch.name}
                        {branch.isDefault && (
                          <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">({t('default')})</span>
                        )}
                      </h3>
                      <div className="mt-2">
                        {branch.isActive ? (
                          <StatusBadge variant="success" label={t('active')} size="sm" />
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                            <i className="bx bx-minus-circle" aria-hidden="true"></i>
                            {t('inactive')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === branch.id ? null : branch.id);
                      }}
                      className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
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
                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-popover border border-gray-200 dark:border-gray-700 z-20 py-1">
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
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
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
            <FormField
              type="text"
              name="name"
              label={t('name')}
              required
              value={formData.name}
              onChange={(value) => setFormData({ ...formData, name: value })}
              placeholder={t('name') || 'Name'}
            />

            <FormField
              type="text"
              name="phone"
              label={t('contactNumber') || t('phone')}
              value={formData.phone}
              onChange={(value) => setFormData({ ...formData, phone: value })}
              placeholder={t('phone') || 'Phone'}
              inputProps={{ type: 'tel' }}
            />

            <FormField
              type="email"
              name="email"
              label={t('email')}
              value={formData.email}
              onChange={(value) => setFormData({ ...formData, email: value })}
              placeholder={t('email') || 'Email'}
            />
          </div>

          {/* Second Row: Address (full width) */}
          <FormField
            type="textarea"
            name="address"
            label={t('address')}
            rows={3}
            value={formData.address}
            onChange={(value) => setFormData({ ...formData, address: value })}
            placeholder={t('address') || 'Address'}
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

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="secondary"
              onClick={handleCloseModals}
              disabled={saving}
            >
              {t('cancel')}
            </Button>
            <Button type="submit" variant="primary" disabled={saving || !formData.name.trim()}>
              {saving ? (
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
            <FormField
              type="text"
              name="name"
              label={t('name')}
              required
              value={formData.name}
              onChange={(value) => setFormData({ ...formData, name: value })}
              placeholder={t('name') || 'Name'}
            />

            <FormField
              type="text"
              name="phone"
              label={t('contactNumber') || t('phone')}
              value={formData.phone}
              onChange={(value) => setFormData({ ...formData, phone: value })}
              placeholder={t('phone') || 'Phone'}
              inputProps={{ type: 'tel' }}
            />

            <FormField
              type="email"
              name="email"
              label={t('email')}
              value={formData.email}
              onChange={(value) => setFormData({ ...formData, email: value })}
              placeholder={t('email') || 'Email'}
            />
          </div>

          {/* Second Row: Address (full width) */}
          <FormField
            type="textarea"
            name="address"
            label={t('address')}
            rows={3}
            value={formData.address}
            onChange={(value) => setFormData({ ...formData, address: value })}
            placeholder={t('address') || 'Address'}
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

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="secondary"
              onClick={handleCloseModals}
              disabled={saving}
            >
              {t('cancel')}
            </Button>
            <Button type="submit" variant="primary" disabled={saving || !formData.name.trim()}>
              {saving ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {t('saving') || 'Saving...'}
                </span>
              ) : (
                t('update') || t('save')
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Bulk Upload Modal */}
      <Modal
        isOpen={showBulkUpload}
        onClose={() => {
          setShowBulkUpload(false);
          setFile(null);
        }}
        title={t('bulkUpload')}
        maxWidth="2xl"
      >
        <form onSubmit={handleBulkUpload} className="space-y-4">
          {/* Upload Area (1/3) and Instructions (2/3) Side by Side */}
          <div className="grid grid-cols-3 gap-6">
            {/* Upload Area - 1/3 */}
            <div className="col-span-1">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">{t('uploadCsvFile') || 'Upload CSV File'}</h3>
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  dragActive
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                } ${file ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                {file ? (
                  <div className="space-y-2">
                    <i className="bx bx-check-circle text-2xl text-green-600 dark:text-green-400"></i>
                    <div className="text-xs">
                      <p className="font-medium text-green-800 dark:text-green-200">{file.name}</p>
                      <p className="text-green-600 dark:text-green-400">
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                    >
                      {t('removeFile') || 'Remove file'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <i className="bx bx-cloud-upload text-2xl text-gray-400 dark:text-gray-500"></i>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-300 mb-2">
                        {t('dragAndDropCsvFile') || 'Drag and drop your CSV file here'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{t('or') || 'or'}</p>
                      <label
                        htmlFor="file-upload"
                        className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-brand-600 hover:bg-brand-700 cursor-pointer transition-colors"
                      >
                        <i className="bx bx-upload mr-1"></i>
                        {t('browseFiles') || 'Browse Files'}
                      </label>
                    </div>
                  </div>
                )}
                <input
                  id="file-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </div>
            </div>

            {/* Instructions - 2/3 */}
            <div className="col-span-2">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                {t('instructionsAndCsvFormat') || 'Instructions & CSV Format'}
              </h3>
              
              <div className="space-y-4">

                {/* Template Download */}
                <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-blue-800 dark:text-blue-200 mb-1">{t('getStarted') || 'Get Started'}</h4>
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        {t('downloadTemplateDescription') || 'Download our CSV template with sample data to get started quickly.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadTemplate}
                      className="ml-3 inline-flex items-center px-2 py-1 text-xs font-medium rounded-md text-blue-700 dark:text-blue-200 bg-blue-200 dark:bg-blue-800 hover:bg-blue-300 dark:hover:bg-brand-700 transition-colors"
                    >
                      <i className="bx bx-download mr-1"></i>
                      {t('downloadTemplate') || 'Download Template'}
                    </button>
                  </div>
                </div>

                {/* Upload Notes */}
                <div className="bg-yellow-50 dark:bg-yellow-900/30 rounded-lg p-4">
                  <div className="flex items-start">
                    <i className="bx bx-info-circle text-yellow-600 dark:text-yellow-400 mr-2 mt-0.5 flex-shrink-0"></i>
                    <div>
                      <h4 className="text-xs font-semibold text-yellow-800 dark:text-yellow-200 mb-2">{t('importantNotes') || 'Important Notes'}</h4>
                      <div className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1">
                        <div>• <strong>{t('branchName') || 'Branch Name'}</strong> {t('isRequired') || 'is required'} - {t('allOtherFieldsOptional') || 'all other fields are optional'}</div>
                        <div>• {t('duplicateBranchNamesSkipped') || 'Duplicate branch names will be skipped'}</div>
                        <div>• {t('invalidEmailSkipped') || 'Invalid email addresses will cause row to be skipped'}</div>
                        <div>• {t('emptyRowsIgnored') || 'Empty rows are automatically ignored'}</div>
                        <div>• {t('csvOnlyMaxSize') || 'CSV files only, Maximum file size: 10MB'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowBulkUpload(false);
                setFile(null);
              }}
            >
              {t('cancel') || 'Cancel'}
            </Button>

            <Button type="submit" variant="primary" disabled={!file || uploading}>
              {uploading ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {t('uploading') || 'Uploading...'}
                </span>
              ) : (
                file ?
                  `${t('upload') || 'Upload'} (${file.name})` :
                  `${t('upload') || 'Upload'} ${t('file') || 'File'}`
              )}
            </Button>
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

