import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import Toast from '@/components/Toast';
import BulkUploadWizard from '@/components/ui/BulkUploadWizard';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import { useTenantStore } from '@/store/globalStore';
import { term } from '@/lib/terminology';

export default function InflowsPage() {
  const { t } = useTranslation('common');
  const { businessType } = useTenantStore();
  const router = useRouter();
  const { branchId, batchId } = router.query;
  const [inflows, setInflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
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
    <div className="space-y-5">
      <PageHeader
        title={currentBranch ? `${term(businessType, 'goodsIn')} — ${currentBranch.name}` : term(businessType, 'goodsIn')}
        count={loading ? undefined : filteredInflows.length}
        subtitle={
          currentBranch
            ? `${t('filteredByBranch')}${currentBranch.address ? ` • ${currentBranch.address}` : ''}`
            : branchId
            ? t('loadingBranch')
            : term(businessType, 'goodsInDescription')
        }
        breadcrumbs={[
          { label: term(businessType, 'inventorySection') },
          { label: term(businessType, 'goodsIn') },
        ]}
        actions={
          <>
            {currentBranch && (
              <Button
                size="sm"
                variant="secondary"
                onClick={async () => {
                  await router.push('/ims/inflows');
                  setCurrentBranch(null);
                  setLoading(true);
                  await loadInflows();
                }}
              >
                <i className="bx bx-x"></i>
                {t('clearFilter')}
              </Button>
            )}
            <PermissionGuard permission="inflows.create">
              <Button size="sm" variant="secondary" onClick={() => setShowBulkUpload(true)}>
                <i className="bx bx-upload"></i>
                {t('bulkUpload')}
              </Button>
              <Button
                size="sm"
                href={branchId && typeof branchId === 'string' ? `/ims/inflows/create?branchId=${branchId}` : '/ims/inflows/create'}
              >
                <i className="bx bx-plus"></i>
                {term(businessType, 'recordGoodsIn')}
              </Button>
            </PermissionGuard>
          </>
        }
      />

      {/* Search and Filters */}
      {!loading && inflows.length > 0 && (
        <div className="bg-white dark:bg-gray-900 ring-1 ring-gray-200 dark:ring-gray-800 rounded-xl p-3">
          <div className="flex flex-col md:flex-row items-center gap-3">
            <div className="w-full md:w-1/3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1); // Reset to first page when searching
                }}
                placeholder={t('searchInflows')}
                className="h-9 w-full px-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-transparent text-[13px]"
              />
            </div>
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
              >
                {t('clearSearch')}
              </Button>
            )}
          </div>
        </div>
      )}

      <BulkUploadWizard
        isOpen={showBulkUpload}
        onClose={() => setShowBulkUpload(false)}
        templateUrl="/ims/inflows/template"
        uploadUrl="/ims/inflows/bulk-upload"
        entityName={t('inflows') || 'inflows'}
        requiredColumns={[
          'Branch Name',
          'Supplier Name',
          'Inventory Item Name',
          'UOM',
          'Quantity',
          'Cost Per Unit',
          'Received At',
          'Batch Number',
          'Expiry Date',
          'Invoice Number',
          'Notes',
        ]}
        onComplete={async () => {
          await loadInflows();
        }}
      />
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto"></div>
        </div>
      ) : filteredInflows.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 ring-1 ring-gray-200 dark:ring-gray-800 rounded-xl px-6 py-14 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
            <i className="bx bx-transfer-alt text-xl text-gray-400 dark:text-gray-500"></i>
          </div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
            {searchQuery ? t('noInflowsFound') : t('noInflowsYet')}
          </h3>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-6">
            {searchQuery
              ? t('tryDifferentSearch')
              : t('recordFirstInflow')}
          </p>
          <div className="flex items-center justify-center gap-3">
            {searchQuery && (
              <Button size="sm" variant="secondary" onClick={() => setSearchQuery('')}>
                {t('clearSearch')}
              </Button>
            )}
            <PermissionGuard permission="inflows.create">
              <Button
                size="sm"
                href={branchId && typeof branchId === 'string' ? `/ims/inflows/create?branchId=${branchId}` : '/ims/inflows/create'}
              >
                {t('record')} {t('inflow')}
              </Button>
            </PermissionGuard>
            <Button size="sm" variant="secondary" onClick={() => setShowBulkUpload(true)}>
              <i className="bx bx-upload"></i>
              {t('bulkUpload')}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-gray-900 ring-1 ring-gray-200 dark:ring-gray-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                      {t('invoiceNumber')}
                    </th>
                    <th className="px-6 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                      {t('batch')}
                    </th>
                    <th className="px-6 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                      {t('branch')}
                    </th>
                    <th className="px-6 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                      {t('date')}
                    </th>
                    <th className="px-6 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                      {t('time')}
                    </th>
                    <th className="px-6 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                      {t('itemsCount')}
                    </th>
                    <th className="px-6 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                      {t('failedUploads')}
                    </th>
                    <th className="px-6 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                      {t('totalAmount')}
                    </th>
                    <th className="px-6 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                      {t('status')}
                    </th>
                    <th className="px-6 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                      {t('actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
                  {paginatedInflows.map((inflow) => (
                    <tr key={inflow.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer" onClick={() => router.push(`/ims/inflows/${inflow.id}`)}>
                      <td className="px-6 py-3 whitespace-nowrap text-[13px] font-medium text-brand-600 dark:text-brand-400 hover:underline">
                        {(inflow.invoiceNumber || inflow.inflowNumber || inflow.reference || inflow.id || '').substring(0, 8)}...
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-[13px] text-gray-500 dark:text-gray-400">
                        {inflow.batchId ? (
                          <Link
                            href={`/ims/inflows/batch/${inflow.batchId}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-brand-600 dark:text-brand-400 hover:underline"
                          >
                            {String(inflow.batchId).substring(0, 8)}…
                          </Link>
                        ) : (inflow.batch?.batchNumber || inflow.batchNumber) ? (
                          <Link
                            href={`/ims/inflows/batch/${inflow.batch?.id || inflow.batchId}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-brand-600 dark:text-brand-400 hover:underline"
                          >
                            {inflow.batch?.batchNumber || inflow.batchNumber}
                          </Link>
                        ) : (inflow.type === 'bulk' ? t('manual') : '-')}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-[13px] text-gray-500 dark:text-gray-400">
                        {inflow.branch?.name || '-'}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-[13px] text-gray-500 dark:text-gray-400">
                        {inflow.receivedDate ? new Date(inflow.receivedDate).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-[13px] text-gray-500 dark:text-gray-400">
                        {inflow.createdAt ? new Date(inflow.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-[13px] text-gray-500 dark:text-gray-400">
                        {inflow.items?.length || 0}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-[13px] text-gray-500 dark:text-gray-400">
                         <span className={`px-2 py-1 rounded-full text-xs ${inflow.failedUploadsCount > 0 ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                            {inflow.failedUploadsCount || 0}
                         </span>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-[13px] text-gray-500 dark:text-gray-400">
                        {formatCurrency(Number(inflow.totalAmount || 0), inflow.currency)}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
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
                      <td className="px-6 py-3 whitespace-nowrap text-[13px] font-medium" onClick={(e) => e.stopPropagation()}>
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
            <div className="mt-4 flex items-center justify-between bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 px-4 py-3">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                {t('showing') || 'Showing'} {startIndex + 1} {t('to') || 'to'} {Math.min(startIndex + itemsPerPage, filteredInflows.length)} {t('of') || 'of'} {filteredInflows.length} {t('items') || 'items'}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  {t('previous') || 'Previous'}
                </Button>
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  {t('page') || 'Page'} {currentPage} {t('of') || 'of'} {totalPages}
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  {t('next') || 'Next'}
                </Button>
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

