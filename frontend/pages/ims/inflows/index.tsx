import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import Toast from '@/components/Toast';
import Pagination from '@/components/Pagination';

export default function InflowsPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { branchId, batchId } = router.query;
  const [inflows, setInflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [currency, setCurrency] = useState<string>('NGN');
  const [currentBranch, setCurrentBranch] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (branchId && typeof branchId === 'string') {
      loadBranch(branchId);
    } else {
      setCurrentBranch(null);
    }
    loadInflows();
    loadCurrency();
  }, [branchId, batchId]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const loadCurrency = async () => {
    try {
      const response = await api.get<{ success: boolean; data: { currency_code?: string; currency?: string } }>('/settings');
      if (response.success && response.data) {
        setCurrency(response.data.currency_code || response.data.currency || 'NGN');
      }
    } catch (err) {
      console.error('Failed to load currency:', err);
      setCurrency('NGN');
    }
  };

  const formatCurrency = (amount: number, inflowCurrency?: string): string => {
    const currencySymbols: { [key: string]: string } = {
      'NGN': '₦',
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'GHS': '₵',
      'KES': 'KSh',
      'ZAR': 'R',
    };
    const currencyCode = inflowCurrency || currency;
    const symbol = currencySymbols[currencyCode] || currencyCode;
    return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const loadBranch = async (id: string) => {
    try {
      const response = await api.get<{ success: boolean; data: any }>(`/settings/branches/${id}`);
      if (response.success && response.data) {
        setCurrentBranch(response.data);
      }
    } catch (err) {
      console.error('Failed to load branch:', err);
    }
  };

  const loadInflows = async () => {
    try {
      let url = '/ims/inflows';
      const params = new URLSearchParams();
      if (branchId && typeof branchId === 'string') params.append('branchId', branchId);
      if (batchId && typeof batchId === 'string') params.append('batchId', batchId);
      
      if (params.toString()) url += `?${params.toString()}`;

      const response = await api.get<{ success: boolean; data: any[] }>(url);
      if (response.success) {
        setInflows(response.data);
      }
    } catch (err) {
      console.error('Failed to load inflows:', err);
    } finally {
      setLoading(false);
    }
  };

  const approveInflow = async (id: string) => {
    try {
      await api.post(`/ims/inflows/${id}/approve`);
      await loadInflows();
    } catch (err) {
      console.error('Failed to approve inflow:', err);
    }
  };

  const downloadTemplate = async () => {
    try {
      const response = await api.get<{ success: boolean; data: { csv: string } }>('/ims/inflows/template');
      if (response.success && response.data?.csv) {
        const csvContent = response.data.csv;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'inflow_template.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setToast({ message: t('templateDownloaded') || 'Template downloaded successfully', type: 'success' });
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err: any) {
      console.error('Failed to download template:', err);
      const errorMessage = err.response?.data?.message || err.message || t('downloadFailed') || 'Failed to download template';
      setToast({ message: errorMessage, type: 'error' });
    }
  };

  // Handle drag events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Handle drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const selectedFile = files[0];
      if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile);
      } else {
        setToast({ message: 'Please upload only CSV files', type: 'error' });
      }
    }
  };

  // Handle file input
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile);
      } else {
        setToast({ message: 'Please upload only CSV files', type: 'error' });
      }
    }
  };

  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    try {
      // Read CSV file as text (same as inventory)
      const csvText = await file.text();
      
      const response = await api.post<{ success: boolean; data: { success: number; errors: string[]; failedUploads?: any[] } }>('/ims/inflows/bulk-upload', {
        csv: csvText,
      });

      if (response.success) {
        const { success, errors, failedUploads } = response.data;
        let message = `${success} inflow(s) imported successfully.`;
        if (errors && errors.length > 0) {
          message += ` ${errors.length} error(s) occurred.`;
          // Show errors in a more detailed toast
          const errorList = errors.slice(0, 5).join('; '); // Show first 5 errors
          const moreErrors = errors.length > 5 ? ` and ${errors.length - 5} more...` : '';
          setToast({ 
            message: `${message} Errors: ${errorList}${moreErrors}`, 
            type: errors.length > 0 && success === 0 ? 'error' : 'info' 
          });
        } else {
          setToast({ message, type: 'success' });
        }
        setShowBulkUpload(false);
        setFile(null);
        await loadInflows();
      }
    } catch (err: any) {
      console.error('Failed to upload:', err);
      const errorMessage = err.response?.data?.message || err.message || t('uploadFailed') || 'Failed to upload inflows';
      setToast({ message: errorMessage, type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  // Filter inflows based on search query
  const filteredInflows = inflows.filter((inflow) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (inflow.invoiceNumber && inflow.invoiceNumber.toLowerCase().includes(query)) ||
      (inflow.inflowNumber && inflow.inflowNumber.toLowerCase().includes(query)) ||
      (inflow.reference && inflow.reference.toLowerCase().includes(query)) ||
      (inflow.branchName && inflow.branchName.toLowerCase().includes(query)) ||
      (inflow.supplier?.name && inflow.supplier.name.toLowerCase().includes(query))
    );
  });

  // Paginate filtered inflows
  const totalPages = Math.ceil(filteredInflows.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedInflows = filteredInflows.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="p-6 bg-white dark:bg-gray-900 min-h-screen">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('inventoryInflow')}
              {currentBranch && (
                <span className="ml-3 text-lg font-normal text-gray-500 dark:text-gray-400">
                  - {currentBranch.name}
                </span>
              )}
            </h1>
            {currentBranch && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {t('filteredByBranch') || 'Filtered by branch'}
                {currentBranch.address && ` • ${currentBranch.address}`}
              </p>
            )}
            {branchId && !currentBranch && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {t('loadingBranch') || 'Loading branch...'}
              </p>
            )}
            {!currentBranch && !branchId && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('viewAllInflows') || 'View all inventory inflows'}</p>
            )}
          </div>
          <div className="flex space-x-2">
            {currentBranch && (
              <button
                onClick={async () => {
                  await router.push('/ims/inflows');
                  setCurrentBranch(null);
                  setLoading(true);
                  await loadInflows();
                }}
                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center"
              >
                <i className="bx bx-x mr-2"></i>
                {t('clearFilter') || 'Clear Filter'}
              </button>
            )}
            <button
              onClick={downloadTemplate}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <i className="bx bx-download mr-2"></i>
              {t('downloadTemplate')}
            </button>
              <PermissionGuard permission="inflows.create">
              <button
                onClick={() => setShowBulkUpload(true)}
                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <i className="bx bx-upload mr-2"></i>
                {t('bulkUpload')}
              </button>
              <Link
                href={branchId && typeof branchId === 'string' ? `/ims/inflows/create?branchId=${branchId}` : "/ims/inflows/create"}
                className="px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-lg text-sm font-medium hover:bg-red-700 dark:hover:bg-red-600 flex items-center space-x-2 shadow-sm inline-block"
              >
                {t('record')} {t('inflow')}
              </Link>
            </PermissionGuard>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      {!loading && inflows.length > 0 && (
        <div className="mb-4 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="w-1/3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1); // Reset to first page when searching
                }}
                placeholder={t('searchInflows') || 'Search by invoice number, reference, supplier...'}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-transparent"
              />
            </div>
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                {t('clearSearch') || 'Clear Search'}
              </button>
            )}
          </div>
        </div>
      )}

      {showBulkUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-3xl w-full m-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('bulkUpload')}</h2>
              <button
                onClick={() => setShowBulkUpload(false)}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <i className="bx bx-x text-2xl"></i>
              </button>
            </div>

            <form onSubmit={handleBulkUpload} className="space-y-4">
              {/* Upload Area (1/3) and Instructions (2/3) Side by Side */}
              <div className="grid grid-cols-3 gap-6">
                {/* Upload Area - 1/3 */}
                <div className="col-span-1">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Upload CSV File</h3>
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
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileInput}
                      className="hidden"
                      id="file-upload"
                    />
                    
                    {file ? (
                      <div className="space-y-2">
                        <i className="bx bx-check-circle text-2xl text-green-500"></i>
                        <div>
                          <p className="text-xs font-medium text-green-700 dark:text-green-300">{file.name}</p>
                          <p className="text-xs text-green-600 dark:text-green-400">
                            {(file.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFile(null)}
                          className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                        >
                          Remove file
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <i className="bx bx-cloud-upload text-2xl text-gray-400 dark:text-gray-500"></i>
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-300 mb-2">
                            Drag and drop your CSV file here
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">or</p>
                          <label
                            htmlFor="file-upload"
                            className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600 cursor-pointer transition-colors"
                          >
                            <i className="bx bx-upload mr-1"></i>
                            Browse Files
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Instructions - 2/3 */}
                <div className="col-span-2">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">File Requirements</h3>
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 h-full">
                    <div className="space-y-3">
                      <div>
                        <h4 className="text-xs font-semibold text-blue-800 dark:text-blue-200 mb-2">Required Columns</h4>
                        <div className="grid grid-cols-2 gap-2 text-xs text-blue-700 dark:text-blue-300">
                          <div>• Branch Name</div>
                          <div>• Supplier Name</div>
                          <div>• Inventory Item Name</div>
                          <div>• UOM</div>
                          <div>• Quantity</div>
                          <div>• Cost Per Unit</div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-xs font-semibold text-blue-800 dark:text-blue-200 mb-2">Optional Columns</h4>
                        <div className="grid grid-cols-2 gap-2 text-xs text-blue-700 dark:text-blue-300">
                          <div>• Received At</div>
                          <div>• Batch Number</div>
                          <div>• Expiry Date</div>
                          <div>• Invoice Number</div>
                          <div>• Notes</div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-xs font-semibold text-blue-800 dark:text-blue-200 mb-2">File Limits</h4>
                        <div className="text-xs text-blue-700 dark:text-blue-300">
                          <div>• CSV files only</div>
                          <div>• Maximum file size: 10MB</div>
                          <div>• Each row represents a new inflow transaction</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowBulkUpload(false);
                    setFile(null);
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
                >
                  Cancel
                </button>
                
                <button
                  type="submit"
                  disabled={!file || uploading}
                  className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors flex items-center text-sm font-medium"
                >
                  {uploading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <i className="bx bx-upload mr-2"></i>
                      Upload
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : filteredInflows.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 p-10 text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
            <i className="bx bx-transfer-alt text-2xl text-blue-600 dark:text-blue-400"></i>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            {searchQuery ? (t('noInflowsFound') || 'No inflows found') : (t('noInflowsYet') || 'No inflows yet')}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {searchQuery 
              ? (t('tryDifferentSearch') || 'Try a different search term') 
              : (t('recordFirstInflow') || 'Record your first inflow to get started')}
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {t('clearSearch') || 'Clear Search'}
            </button>
          )}
          <div className="flex items-center justify-center gap-3">
            <PermissionGuard permission="inflows.create">
              <button className="px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-lg text-sm font-medium hover:bg-red-700 dark:hover:bg-red-600 flex items-center space-x-2 shadow-sm">
                {t('record')} {t('inflow')}
              </button>
            </PermissionGuard>
            <button
              onClick={() => setShowBulkUpload(true)}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <i className="bx bx-upload mr-2"></i>
              {t('bulkUpload')}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      {t('invoiceNumber')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      {t('batch') || 'Batch'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      {t('branch')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      {t('date')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      {t('time') || 'Time'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      {t('itemsCount') || 'Items'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      {t('failedUploads') || 'Failed Uploads'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      {t('totalAmount')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      {t('status')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      {t('actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {paginatedInflows.map((inflow) => (
                    <tr key={inflow.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer" onClick={() => router.push(`/ims/inflows/${inflow.id}`)}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
                        {(inflow.invoiceNumber || inflow.inflowNumber || inflow.reference || inflow.id || '').substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {inflow.batchId ? (
                          <Link 
                            href={`/ims/inflows?batchId=${inflow.batchId}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            {inflow.batchId}
                          </Link>
                        ) : (inflow.batch?.batchNumber || inflow.batchNumber) ? (
                          <Link 
                            href={`/ims/inflows?batchId=${inflow.batch?.id || inflow.batchId}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            {inflow.batch?.batchNumber || inflow.batchNumber}
                          </Link>
                        ) : (inflow.type === 'bulk' ? 'Manual' : '-')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {inflow.branch?.name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {inflow.receivedDate ? new Date(inflow.receivedDate).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {inflow.createdAt ? new Date(inflow.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {inflow.items?.length || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                         <span className={`px-2 py-1 rounded-full text-xs ${inflow.failedUploadsCount > 0 ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                            {inflow.failedUploadsCount || 0}
                         </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatCurrency(Number(inflow.totalAmount || 0), inflow.currency)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            inflow.status === 'approved'
                              ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                              : inflow.status === 'rejected'
                              ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300'
                              : 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300'
                          }`}
                        >
                          {inflow.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                        {inflow.status === 'pending' && (
                          <PermissionGuard permission="inflows.approve">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                approveInflow(inflow.id);
                              }}
                              className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300"
                            >
                              {t('approve')}
                            </button>
                          </PermissionGuard>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg shadow px-4 py-3">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                {t('showing') || 'Showing'} {startIndex + 1} {t('to') || 'to'} {Math.min(startIndex + itemsPerPage, filteredInflows.length)} {t('of') || 'of'} {filteredInflows.length} {t('items') || 'items'}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('previous') || 'Previous'}
                </button>
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  {t('page') || 'Page'} {currentPage} {t('of') || 'of'} {totalPages}
                </div>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('next') || 'Next'}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
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

