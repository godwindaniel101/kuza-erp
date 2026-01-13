import { useState, useEffect } from 'react';
import Link from 'next/link';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import Toast from '@/components/Toast';
import Modal from '@/components/Modal';
import SearchableSelect from '@/components/SearchableSelect';

export default function InventoryPage() {
  const { t } = useTranslation('common');
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [currency, setCurrency] = useState<string>('NGN');
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; itemId: string | null; itemName: string }>({
    isOpen: false,
    itemId: null,
    itemName: '',
  });
  const [deleting, setDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    loadItems();
    loadCurrency();
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await api.get<{ success: boolean; data: any[] }>('/ims/categories');
      if (response.success) {
        setCategories(response.data);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  // Reset to page 1 when search or category filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategoryId]);

  const loadCurrency = async () => {
    try {
      const response = await api.get<{ success: boolean; data: { currency_code?: string; currency?: string } }>('/settings');
      if (response.success && response.data) {
        setCurrency(response.data.currency_code || response.data.currency || 'NGN');
      }
    } catch (err) {
      console.error('Failed to load currency:', err);
      // Default to NGN if failed
      setCurrency('NGN');
    }
  };

  const loadItems = async () => {
    try {
      const response = await api.get<{ success: boolean; data: any[] }>('/ims/inventory');
      if (response.success) {
        setItems(response.data);
      }
    } catch (err) {
      console.error('Failed to load items:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    const currencySymbols: { [key: string]: string } = {
      'NGN': '₦',
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
    };
    const symbol = currencySymbols[currency] || currency;
    return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatStock = (item: any): string => {
    const stock = Math.floor(Number(item.currentStock || 0));
    const uom = item.baseUom || item.uom;
    if (uom) {
      const uomName = uom.abbreviation || uom.name || '';
      return `${stock} ${uomName}`;
    }
    return stock.toString();
  };

  // Filter items based on search query and category
  const filteredItems = items.filter((item) => {
    // Category filter (by ID)
    if (selectedCategoryId && item.categoryId !== selectedCategoryId) {
      return false;
    }

    // Search query filter
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.name?.toLowerCase().includes(query) ||
      (item.category && item.category.toLowerCase().includes(query)) ||
      (item.subcategory && item.subcategory.toLowerCase().includes(query)) ||
      item.barcode?.toLowerCase().includes(query) ||
      (item.baseUom?.name || item.uom?.name)?.toLowerCase().includes(query) ||
      (item.baseUom?.abbreviation || item.uom?.abbreviation)?.toLowerCase().includes(query)
    );
  });

  // Sort items
  const sortedItems = [...filteredItems].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortField) {
      case 'name':
        aValue = a.name || '';
        bValue = b.name || '';
        break;
      case 'stock':
        aValue = Number(a.currentStock || 0);
        bValue = Number(b.currentStock || 0);
        break;
      case 'price':
        aValue = Number(a.salePrice || 0);
        bValue = Number(b.salePrice || 0);
        break;
      case 'category':
        aValue = a.category || '';
        bValue = b.category || '';
        break;
      case 'subcategory':
        aValue = a.subcategory || '';
        bValue = b.subcategory || '';
        break;
      default:
        aValue = a[sortField] || '';
        bValue = b[sortField] || '';
    }

    if (typeof aValue === 'string') {
      return sortDirection === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    } else {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }
  });

  // Paginate items
  const totalPages = Math.ceil(sortedItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = sortedItems.slice(startIndex, startIndex + itemsPerPage);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) {
      return <i className="bx bx-sort text-gray-400"></i>;
    }
    return sortDirection === 'asc' ? (
      <i className="bx bx-sort-up text-red-600"></i>
    ) : (
      <i className="bx bx-sort-down text-red-600"></i>
    );
  };

  const handleDeleteClick = (itemId: string, itemName: string) => {
    setDeleteConfirm({ isOpen: true, itemId, itemName });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.itemId) return;

    setDeleting(true);
    try {
      await api.delete(`/ims/inventory/${deleteConfirm.itemId}`);
      setToast({ message: t('deletedSuccessfully') || 'Item deleted successfully', type: 'success' });
      setDeleteConfirm({ isOpen: false, itemId: null, itemName: '' });
      await loadItems();
    } catch (err: any) {
      console.error('Failed to delete item:', err);
      const errorMessage = err.response?.data?.message || err.message || t('deleteFailed') || 'Failed to delete item';
      setToast({ message: errorMessage, type: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const response = await api.get<{ success: boolean; data: { csv: string } }>('/ims/inventory/template');
      if (response.success && response.data?.csv) {
        const blob = new Blob([response.data.csv], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'inventory_template.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        // Fallback: create template manually
        const headers = ['Name', 'Category', 'Subcategory', 'Unit', 'Track Stock', 'Minimum Stock', 'Maximum Stock', 'Sales Price', 'Barcode'];
        const csv = headers.join(',') + '\n';
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'inventory_template.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('Failed to download template:', err);
      setToast({ message: t('failedToDownloadTemplate') || 'Failed to download template', type: 'error' });
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
      // Read CSV file as text
      const csvText = await file.text();
      
      const response = await api.post<{ success: boolean; data: { success: number; errors: string[]; skipped: number } }>('/ims/inventory/bulk-upload', {
        csv: csvText,
      });

      if (response.success) {
        const { success, errors, skipped } = response.data;
        let message = `${success} items imported successfully.`;
        if (skipped > 0) {
          message += ` ${skipped} empty row(s) skipped.`;
        }
        if (errors.length > 0) {
          message += ` ${errors.length} error(s) occurred.`;
          // Show errors in a more detailed toast or modal
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
        await loadItems();
      }
    } catch (err: any) {
      console.error('Failed to upload:', err);
      const errorMessage = err.response?.data?.message || err.message || t('uploadFailed') || 'Failed to upload items';
      setToast({ message: errorMessage, type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-900 min-h-screen">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('inventory')}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('manageInventoryItems') || 'Manage your inventory items'}</p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={downloadTemplate}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <i className="bx bx-download mr-2"></i>
              {t('downloadTemplate')}
            </button>
            <PermissionGuard permission="inventory.create">
              <button
                onClick={() => setShowBulkUpload(true)}
                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <i className="bx bx-upload mr-2"></i>
                {t('bulkUpload')}
              </button>
              <Link href="/ims/inventory/create" className="px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-lg text-sm font-medium hover:bg-red-700 dark:hover:bg-red-600 flex items-center space-x-2 shadow-sm">
                {t('create')} {t('item')}
              </Link>
            </PermissionGuard>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      {!loading && items.length > 0 && (
        <div className="mb-4 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Input */}
            <div className="w-1/3 relative">
              <i className="bx bx-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10"></i>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1); // Reset to first page when searching
                }}
                placeholder={t('searchItems') || 'Search items...'}
                className="w-full min-h-[48px] pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-transparent"
              />
            </div>
            {/* Category Filter */}
            <div className="w-1/3">
              <SearchableSelect
                options={[
                  { value: '', label: t('allCategories') || 'All Categories' },
                  ...categories.map((cat) => ({ value: cat.id, label: cat.name })),
                ]}
                value={selectedCategoryId}
                onChange={(value) => {
                  setSelectedCategoryId(value);
                  setCurrentPage(1); // Reset to first page when filtering
                }}
                placeholder={t('allCategories') || 'All Categories'}
                className="w-full"
                focusColor="red"
              />
            </div>
          </div>
        </div>
      )}

      <Modal
        isOpen={showBulkUpload}
        onClose={() => setShowBulkUpload(false)}
        title={t('bulkUpload')}
        maxWidth="2xl"
      >
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
                      <div>• Name</div>
                      <div>• Category</div>
                      <div>• Subcategory</div>
                      <div>• Unit</div>
                      <div>• Track Stock</div>
                      <div>• Minimum Stock</div>
                      <div>• Maximum Stock</div>
                      <div>• Sales Price</div>
                      <div>• Barcode</div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-xs font-semibold text-blue-800 dark:text-blue-200 mb-2">File Limits & Notes</h4>
                    <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                      <div>• CSV files only, Maximum file size: 10MB</div>
                      <div>• Items with invalid UOMs will be skipped</div>
                      <div>• Duplicate items (by name or barcode) will be skipped</div>
                      <div>• Download template first to see correct format</div>
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
      </Modal>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 p-10 text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
            <i className="bx bx-box text-2xl text-blue-600 dark:text-blue-400"></i>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            {searchQuery ? (t('noItemsFound') || 'No items found') : (t('noItemsYet') || 'No items yet')}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {searchQuery 
              ? (t('tryDifferentSearch') || 'Try a different search term')
              : (t('addItemsToStartManaging') || 'Add items to start managing inventory')
            }
          </p>
          <div className="flex items-center justify-center gap-3">
            <PermissionGuard permission="inventory.create">
              <Link href="/ims/inventory/create" className="px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-lg text-sm font-medium hover:bg-red-700 dark:hover:bg-red-600 flex items-center space-x-2 shadow-sm">
                {t('create')} {t('item')}
              </Link>
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
          {/* Results Summary */}
          <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            {t('showing') || 'Showing'} {startIndex + 1}-{Math.min(startIndex + itemsPerPage, sortedItems.length)} {t('of') || 'of'} {sortedItems.length} {t('items') || 'items'}
            {searchQuery && (
              <span className="ml-2">
                ({t('filtered') || 'filtered'})
              </span>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>{t('name')}</span>
                        <SortIcon field="name" />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => handleSort('category')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>{t('category')}</span>
                        <SortIcon field="category" />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => handleSort('subcategory')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>{t('subcategory')}</span>
                        <SortIcon field="subcategory" />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => handleSort('stock')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>{t('currentStock')}</span>
                        <SortIcon field="stock" />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => handleSort('price')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>{t('unitPrice')}</span>
                        <SortIcon field="price" />
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">{t('status')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {paginatedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{item.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {item.category || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {item.subcategory || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatStock(item)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatCurrency(Number(item.salePrice || 0))}
                    </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        Number(item.currentStock) <= Number(item.minimumStock)
                          ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300'
                          : 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                      }`}
                    >
                      {Number(item.currentStock) <= Number(item.minimumStock) ? t('lowStock') : t('inStock')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-3">
                      <Link
                        href={`/ims/inventory/${item.id}`}
                        className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300"
                        title={t('view') || 'View'}
                      >
                        <i className="bx bx-show text-lg"></i>
                      </Link>
                      <PermissionGuard permission="inventory.edit">
                        <Link
                          href={`/ims/inventory/edit/${item.id}`}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                          title={t('edit') || 'Edit'}
                        >
                          <i className="bx bx-edit text-lg"></i>
                        </Link>
                      </PermissionGuard>
                      <PermissionGuard permission="inventory.delete">
                        <button
                          onClick={() => handleDeleteClick(item.id, item.name)}
                          className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                          title={t('delete') || 'Delete'}
                        >
                          <i className="bx bx-trash text-lg"></i>
                        </button>
                      </PermissionGuard>
                    </div>
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
                {t('showing') || 'Showing'} {startIndex + 1} {t('to') || 'to'} {Math.min(startIndex + itemsPerPage, sortedItems.length)} {t('of') || 'of'} {sortedItems.length} {t('items') || 'items'}
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

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, itemId: null, itemName: '' })}
        title={t('confirmDelete') || 'Confirm Delete'}
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            {t('areYouSureDelete') || 'Are you sure you want to delete'} <strong className="text-gray-900 dark:text-gray-100">{deleteConfirm.itemName}</strong>?
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            {t('deleteWarning') || 'This action cannot be undone.'}
          </p>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => setDeleteConfirm({ isOpen: false, itemId: null, itemName: '' })}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              disabled={deleting}
            >
              {t('cancel') || 'Cancel'}
            </button>
            <button
              type="button"
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-md hover:bg-red-700 dark:hover:bg-red-600 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {deleting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('deleting') || 'Deleting...'}
                </>
              ) : (
                <>
                  <i className="bx bx-trash mr-2"></i>
                  {t('delete') || 'Delete'}
                </>
              )}
            </button>
          </div>
        </div>
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
