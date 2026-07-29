import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import Toast from '@/components/Toast';
import Modal from '@/components/Modal';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import FilterBar, { type FilterValues } from '@/components/ui/FilterBar';
import { usePageSearch } from '@/store/searchStore';
import DataTable, { type DataTableColumn, type RowAction } from '@/components/ui/DataTable';
import { useTenantStore } from '@/store/globalStore';
import { term } from '@/lib/terminology';
import StockStatusBadge from '@/components/ui/StockStatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import BulkUploadWizard from '@/components/ui/BulkUploadWizard';
import CatalogListingModal, { type CatalogListing } from '@/components/network/CatalogListingModal';
import { useTableState } from '@/hooks/useTableState';
import { downloadCsv, itemImageSrc, onItemImageError } from '@/lib/format';

interface InventoryItem {
  id: string;
  name?: string;
  category?: string;
  subcategory?: string;
  categoryId?: string;
  currentStock?: number | string;
  minimumStock?: number | string;
  maximumStock?: number | string;
  salePrice?: number | string;
  barcode?: string;
  baseUom?: { name?: string; abbreviation?: string };
  uom?: { name?: string; abbreviation?: string };
  /** Warehouse row-rack-bin location, e.g. "A-03-2" (backend column lands in parallel). */
  binLocation?: string;
  /** Primary item image URL (see components/InventoryItemForm.tsx). May be absent on list payloads. */
  frontImage?: string;
  unitCost?: number | string;
  costPrice?: number | string;
  batchCount?: number;
  batches?: unknown[];
  /** Next upcoming batch expiry date (ISO) across this item's inflow batches. */
  earliestExpiry?: string | null;
  /** How many batches expire within 30 days. */
  expiringSoonCount?: number;
}

export default function InventoryPage() {
  const { t } = useTranslation('common');
  const { businessType } = useTenantStore();
  const router = useRouter();
  // This page is re-used under /rms/items (Restaurant → Items). Keep navigation
  // on whichever base you entered from so the workspace doesn't switch. API
  // paths stay /ims/inventory regardless.
  const base = router.pathname.startsWith('/rms/items') ? '/rms/items' : '/ims/inventory';
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  // Marketplace listing: which item is being listed/edited, and a map of
  // inventoryItemId -> existing listing so rows can show "On market".
  const [listingModalItem, setListingModalItem] = useState<InventoryItem | null>(null);
  const [listingByItem, setListingByItem] = useState<Map<string, CatalogListing>>(new Map());
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [currency, setCurrency] = useState<string>('NGN');
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; itemId: string | null; itemName: string }>({
    isOpen: false,
    itemId: null,
    itemName: '',
  });
  const [deleting, setDeleting] = useState(false);

  // Filter state (config-driven via FilterBar). Text search now comes from the
  // top-nav search box (usePageSearch); category/location stay as page filters.
  const [filters, setFilters] = useState<FilterValues>({ category: '', location: '' });
  const searchQuery = usePageSearch(t('searchItems') || 'Search items…');
  const selectedCategoryId = (filters.category as string) || '';
  const locationQuery = (filters.location as string) || '';
  const isWarehouse = businessType === 'warehouse';

  useEffect(() => {
    loadItems();
    loadCurrency();
    loadCategories();
    loadListings();
  }, []);

  // Load this tenant's own marketplace listings, keyed by source inventory item,
  // so the table can show "On market" and the modal can edit an existing listing.
  const loadListings = async () => {
    try {
      const res = await api.get<{ success: boolean; data: CatalogListing[] }>('/network/catalog');
      if (res.success) {
        const map = new Map<string, CatalogListing>();
        (res.data || []).forEach((l) => {
          if (l.sourceInventoryItemId) map.set(l.sourceInventoryItemId, l);
        });
        setListingByItem(map);
      }
    } catch {
      // Non-fatal — the network module may be unavailable; rows just won't show "On market".
    }
  };

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

  const loadItems = async () => {
    try {
      const response = await api.get<{ success: boolean; data: InventoryItem[] }>('/ims/inventory');
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
      NGN: '₦',
      USD: '$',
      EUR: '€',
      GBP: '£',
    };
    const symbol = currencySymbols[currency] || currency;
    return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatStock = (item: InventoryItem): string => {
    const stock = Math.floor(Number(item.currentStock || 0));
    const uom = item.baseUom || item.uom;
    if (uom) {
      const uomName = uom.abbreviation || uom.name || '';
      return uomName ? `${stock} ${uomName}` : `${stock}`;
    }
    return stock.toString();
  };

  // Client-side filtering predicate (stable across renders via useCallback).
  const filterFn = useCallback(
    (item: InventoryItem) => {
      if (selectedCategoryId && item.categoryId !== selectedCategoryId) return false;
      if (locationQuery && !(item.binLocation || '').toLowerCase().includes(locationQuery.toLowerCase())) {
        return false;
      }
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return Boolean(
        item.name?.toLowerCase().includes(query) ||
          item.category?.toLowerCase().includes(query) ||
          item.subcategory?.toLowerCase().includes(query) ||
          item.barcode?.toLowerCase().includes(query) ||
          item.binLocation?.toLowerCase().includes(query) ||
          (item.baseUom?.name || item.uom?.name)?.toLowerCase().includes(query) ||
          (item.baseUom?.abbreviation || item.uom?.abbreviation)?.toLowerCase().includes(query),
      );
    },
    [searchQuery, selectedCategoryId, locationQuery],
  );

  // Sort accessor for fields that don't map 1:1 to top-level props.
  const sortAccessor = useCallback((item: InventoryItem, field: string) => {
    switch (field) {
      case 'currentStock':
        return Number(item.currentStock || 0);
      case 'salePrice':
        return Number(item.salePrice || 0);
      case 'binLocation':
        return item.binLocation || '';
      default:
        return (item as unknown as Record<string, unknown>)[field] ?? '';
    }
  }, []);

  const table = useTableState<InventoryItem>({
    data: items,
    initialSortField: 'name',
    pageSize: 10,
    filterFn,
    sortAccessor,
  });

  // Reset to first page when filters change.
  useEffect(() => {
    table.setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedCategoryId, locationQuery]);

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

  // All candidate columns; COLUMN_PRESETS picks the vertical's emphasis.
  const allColumns: Record<string, DataTableColumn<InventoryItem>> = {
    name: {
      key: 'name',
      label: t('name'),
      sortable: true,
      render: (item) => (
        <div className="flex items-center gap-2.5">
          <img
            src={itemImageSrc(item.frontImage)}
            alt=""
            onError={onItemImageError}
            className="h-9 w-9 flex-shrink-0 rounded-md bg-gray-50 object-cover ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700"
          />
          <span className="font-medium text-gray-900 dark:text-white">{item.name}</span>
          {listingByItem.has(item.id) && (
            <span className="ml-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
              {t('inventory.onMarket', 'On market')}
            </span>
          )}
        </div>
      ),
    },
    category: { key: 'category', label: t('category'), sortable: true, render: (item) => item.category || '-' },
    subcategory: { key: 'subcategory', label: t('subcategory'), sortable: true, render: (item) => item.subcategory || '-' },
    barcode: { key: 'barcode', label: t('barcode') === 'barcode' ? 'Barcode' : t('barcode'), render: (item) => item.barcode || '-' },
    uom: {
      key: 'uom',
      label: t('uoms') === 'uoms' ? 'UOM' : t('uoms'),
      align: 'center',
      render: (item) => item.baseUom?.abbreviation || item.baseUom?.name || item.uom?.abbreviation || item.uom?.name || '-',
    },
    currentStock: { key: 'currentStock', label: t('currentStock'), sortable: true, align: 'right', cellClassName: 'tabular-nums', render: (item) => formatStock(item) },
    binLocation: {
      key: 'binLocation',
      label: 'Location',
      sortable: true,
      render: (item) =>
        item.binLocation ? (
          <span className="font-mono text-gray-700 dark:text-gray-300">{item.binLocation}</span>
        ) : (
          <span className="text-gray-400 dark:text-gray-500">—</span>
        ),
    },
    batches: {
      key: 'batches',
      label: 'Batches',
      align: 'right',
      cellClassName: 'tabular-nums',
      render: (item) => {
        const count = item.batchCount ?? (Array.isArray(item.batches) ? item.batches.length : undefined);
        return count != null ? String(count) : <span className="text-gray-400 dark:text-gray-500">—</span>;
      },
    },
    expiring: {
      key: 'expiring',
      label: 'Expiring soon',
      render: (item) => {
        if (!item.earliestExpiry) return <span className="text-gray-400 dark:text-gray-500">—</span>;
        const d = new Date(item.earliestExpiry);
        const days = Math.ceil((d.getTime() - Date.now()) / 86400000);
        const soon = days <= 30;
        const dateLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const count = Number(item.expiringSoonCount || 0);
        return (
          <span className={`inline-flex items-center gap-1.5 text-[13px] ${soon ? 'text-amber-700 dark:text-amber-400' : 'text-gray-600 dark:text-gray-300'}`}>
            {soon && <i className="bx bxs-time-five text-amber-500" aria-hidden="true" />}
            <span>{dateLabel}</span>
            {count > 1 && (
              <span className="rounded bg-amber-100 px-1 text-[10px] font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                {count} batches
              </span>
            )}
          </span>
        );
      },
    },
    unitCost: {
      key: 'unitCost',
      label: 'Unit cost',
      align: 'right',
      cellClassName: 'tabular-nums',
      render: (item) => {
        const cost = item.unitCost ?? item.costPrice;
        return cost != null && cost !== '' ? (
          formatCurrency(Number(cost))
        ) : (
          <span className="text-gray-400 dark:text-gray-500">—</span>
        );
      },
    },
    salePrice: {
      key: 'salePrice',
      label: t('unitPrice'),
      sortable: true,
      align: 'right',
      cellClassName: 'tabular-nums',
      render: (item) => formatCurrency(Number(item.salePrice || 0)),
    },
    status: {
      key: 'status',
      label: t('status'),
      align: 'center',
      render: (item) => (
        <StockStatusBadge
          currentStock={Number(item.currentStock || 0)}
          minimumStock={Number(item.minimumStock || 0)}
          maximumStock={Number(item.maximumStock || 0)}
          labels={{ low: t('lowStock') || 'Low stock', optimal: t('inStock') || 'In stock' }}
          size="sm"
        />
      ),
    },
  };

  /**
   * Per-vertical column emphasis (docs/DESIGN.md §7). Unit cost / margin are
   * intentionally absent: the list API does not return a cost field.
   */
  const COLUMN_PRESETS: Record<string, string[]> = {
    hospitality: ['name', 'unitCost', 'currentStock', 'uom', 'status'],
    restaurant: ['name', 'category', 'currentStock', 'uom', 'status'],
    retail: ['name', 'barcode', 'salePrice', 'currentStock', 'expiring', 'status'],
    warehouse: ['name', 'currentStock', 'batches', 'expiring', 'status'],
    general: ['name', 'category', 'subcategory', 'currentStock', 'expiring', 'status'],
  };
  const presetKeys = COLUMN_PRESETS[businessType ?? 'general'] ?? COLUMN_PRESETS.general;
  const columns: DataTableColumn<InventoryItem>[] = presetKeys.map((k) => allColumns[k]).filter(Boolean);

  const handleExportCsv = () => {
    const headers = ['Name', 'Category', 'Subcategory', 'Barcode', 'UOM', 'Current stock', 'Location', 'Unit cost', 'Sale price'];
    const rows = table.sorted.map((item) => [
      item.name || '',
      item.category || '',
      item.subcategory || '',
      item.barcode || '',
      item.baseUom?.abbreviation || item.baseUom?.name || item.uom?.abbreviation || item.uom?.name || '',
      Math.floor(Number(item.currentStock || 0)),
      item.binLocation || '',
      item.unitCost != null && item.unitCost !== '' ? Number(item.unitCost) : item.costPrice != null && item.costPrice !== '' ? Number(item.costPrice) : '',
      Number(item.salePrice || 0),
    ]);
    downloadCsv(`inventory-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  // Row click opens the item; the kebab keeps only Edit + Delete.
  const rowActions: RowAction<InventoryItem>[] = [
    {
      label: t('edit'),
      icon: 'bx-edit',
      iconColor: 'text-accent',
      onClick: (item) => router.push(`${base}/edit/${item.id}`),
    },
    {
      label: t('inventory.listOnMarket', 'List on market'),
      icon: 'bx-store',
      iconColor: 'text-emerald-600',
      onClick: (item) => setListingModalItem(item),
    },
    {
      label: t('delete'),
      icon: 'bx-trash',
      iconColor: 'text-red-600',
      danger: true,
      onClick: (item) => setDeleteConfirm({ isOpen: true, itemId: item.id, itemName: item.name || '' }),
    },
  ];

  return (
    <div className="space-y-6 kz-stagger">
      <PageHeader
        title={term(businessType, 'items')}
        count={loading ? undefined : items.length}
        subtitle={term(businessType, 'itemsDescription')}
        breadcrumbs={[
          { label: term(businessType, 'inventorySection') },
          { label: term(businessType, 'items') },
        ]}
        actions={
          <>
            {!loading && items.length > 0 && (
              <Button variant="secondary" size="sm" onClick={handleExportCsv}>
                <i className="bx bx-download"></i>
                {t('exportCsv') || 'Export CSV'}
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => setShowBulkUpload(true)}>
              <i className="bx bx-upload"></i>
              {t('bulkUpload')}
            </Button>
            <PermissionGuard permission="inventory.create">
              <Button href={`${base}/create`} variant="primary" size="sm">
                {term(businessType, 'addItem')}
              </Button>
            </PermissionGuard>
          </>
        }
      />


      {/* Filters */}
      {!loading && items.length > 0 && (
        <FilterBar
          filters={[
            ...(isWarehouse
              ? [
                  {
                    key: 'location',
                    type: 'text' as const,
                    placeholder: 'Location (e.g. A-03)',
                    className: 'w-full sm:w-48',
                  },
                ]
              : []),
            {
              key: 'category',
              type: 'select',
              placeholder: t('allCategories') || 'All Categories',
              className: 'w-full sm:w-64',
              options: [
                { value: '', label: t('allCategories') || 'All Categories' },
                ...categories.map((cat) => ({ value: cat.id, label: cat.name })),
              ],
            },
          ]}
          values={filters}
          onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
          onClear={() => setFilters({ category: '', location: '' })}
        />
      )}

      {/* Bulk upload wizard */}
      <BulkUploadWizard
        isOpen={showBulkUpload}
        onClose={() => setShowBulkUpload(false)}
        templateUrl="/ims/inventory/template"
        uploadUrl="/ims/inventory/bulk-upload"
        entityName={t('items') || 'items'}
        requiredColumns={[
          'Name',
          'Category',
          'Subcategory',
          'UOM',
          'Track Stock',
          'Minimum Stock',
          'Maximum Stock',
          'Sales Price',
          'Barcode',
        ]}
        onComplete={async () => {
          await loadItems();
          await loadCategories();
        }}
      />

      {/* List on market / edit an existing marketplace listing for an item */}
      {listingModalItem && (
        <CatalogListingModal
          item={{
            id: listingModalItem.id,
            name: listingModalItem.name || '',
            unit:
              listingModalItem.baseUom?.abbreviation ||
              listingModalItem.baseUom?.name ||
              listingModalItem.uom?.abbreviation ||
              listingModalItem.uom?.name,
            currency,
            salePrice: listingModalItem.salePrice,
            imageUrl: listingModalItem.frontImage,
          }}
          existing={listingByItem.get(listingModalItem.id) ?? null}
          onClose={() => setListingModalItem(null)}
          onSaved={() => {
            setListingModalItem(null);
            loadListings();
            setToast({ message: t('catalog.listingSaved', 'Market listing updated'), type: 'success' });
          }}
          onError={(m) => setToast({ message: m, type: 'error' })}
        />
      )}

      {/* Table / empty state */}
      <DataTable<InventoryItem>
        columns={columns}
        data={table.paginated}
        loading={loading}
        sort={{ field: table.sortField, direction: table.sortDirection }}
        onSortChange={table.toggleSort}
        onRowClick={(item) => router.push(`${base}/${item.id}`)}
        rowActions={rowActions}
        actionsAlign="center"
        actionsLabel={t('moreActions') || 'More actions'}
        pagination={{
          page: table.page,
          totalPages: table.totalPages,
          startIndex: table.startIndex,
          endIndex: table.endIndex,
          totalItems: table.filteredCount,
          onPageChange: table.setPage,
        }}
        emptyState={
          <EmptyState
            icon="bx-box"
            title={searchQuery || selectedCategoryId ? (t('noItemsFound') || 'No items found') : (t('noItemsYet') || 'No items yet')}
            description={
              searchQuery || selectedCategoryId
                ? t('tryDifferentSearch') || 'Try a different search term'
                : term(businessType, 'emptyItems')
            }
            actions={
              <>
                <PermissionGuard permission="inventory.create">
                  <Button href={`${base}/create`} variant="primary" size="sm">
                    {term(businessType, 'addItem')}
                  </Button>
                </PermissionGuard>
                <Button variant="secondary" size="sm" onClick={() => setShowBulkUpload(true)}>
                  <i className="bx bx-upload"></i>
                  {t('bulkUpload')}
                </Button>
              </>
            }
          />
        }
      />

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, itemId: null, itemName: '' })}
        title={t('confirmDelete') || 'Confirm Delete'}
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            {t('areYouSureDelete') || 'Are you sure you want to delete'}{' '}
            <strong className="text-gray-900 dark:text-gray-100">{deleteConfirm.itemName}</strong>?
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">{t('deleteWarning') || 'This action cannot be undone.'}</p>
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDeleteConfirm({ isOpen: false, itemId: null, itemName: '' })}
              disabled={deleting}
            >
              {t('cancel') || 'Cancel'}
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleDeleteConfirm}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  {t('deleting') || 'Deleting...'}
                </>
              ) : (
                <>
                  <i className="bx bx-trash mr-2"></i>
                  {t('delete') || 'Delete'}
                </>
              )}
            </Button>
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
