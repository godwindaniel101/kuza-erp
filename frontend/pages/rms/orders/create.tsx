import { useState, useEffect, useRef } from 'react';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import Toast from '@/components/Toast';
import Link from 'next/link';
import SearchableSelect from '@/components/SearchableSelect';

interface OrderItemRow {
  id: number;
  inventoryItemId: string;
  quantity: number;
  uomId: string;
  name?: string;
  unitPrice?: number;
  totalPrice?: number;
  availableUoms?: Array<{ id: string; name: string; abbreviation?: string }>;
  uomToBase?: Record<string, number>;
  uomPrices?: Record<string, number>;
  stock?: number;
  basePrice?: number;
}

export default function CreateOrderPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [branchId, setBranchId] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [showOrderSummary, setShowOrderSummary] = useState(false);
  const [formData, setFormData] = useState({
    tableId: '',
    type: 'dine_in',
    customerName: '',
    customerPhone: '',
    notes: '',
    applyVat: false,
    vatPercentage: 7.5,
  });
  const [orderItems, setOrderItems] = useState<OrderItemRow[]>([]);
  const [itemCounter, setItemCounter] = useState(0);
  const [selectedItem, setSelectedItem] = useState<{
    id: string;
    name: string;
    uomId: string;
    uoms?: Array<{ id: string; name: string; abbreviation?: string }>;
    price?: number;
    stock?: number;
    baseQuantity?: number;
    uomToBase?: Record<string, number>;
    uomPrices?: Record<string, number>;
    basePrice?: number;
  } | null>(null);
  const [selectedUomId, setSelectedUomId] = useState<string>('');
  const [itemQuantity, setItemQuantity] = useState(1);

  // Handle number input focus - select all if value is 0
  const handleNumberInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (
      e.target.value === '0' ||
      e.target.value === '0.00' ||
      e.target.value === '0.0'
    ) {
      e.target.select();
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (branchId) {
      // Reset everything when branch changes - clear all input fields
      setOrderItems([]);
      setSelectedItem(null);
      setSelectedUomId('');
      setItemQuantity(1);
      setItemCounter(0);
      // Reset form data (customer info, notes, VAT, etc.)
      setFormData({
        tableId: '',
        type: 'dine_in',
        customerName: '',
        customerPhone: '',
        notes: '',
        applyVat: false,
        vatPercentage: 7.5,
      });
      // Load inventory items for the new branch
      loadInventoryItems();
    } else {
      // If no branch selected, clear everything
      setOrderItems([]);
      setInventoryItems([]);
      setSelectedItem(null);
      setSelectedUomId('');
      setItemQuantity(1);
      setItemCounter(0);
    }
  }, [branchId]);

  const loadInitialData = async () => {
    try {
      const [branchesRes, tablesRes] = await Promise.all([
        api.get<{ success: boolean; data: any[] }>('/settings/branches'),
        api.get<{ success: boolean; data: any[] }>('/rms/tables').catch(() => ({ success: false, data: [] })),
      ]);

      if (branchesRes.success) {
        setBranches(branchesRes.data);
        if (branchesRes.data.length > 0) {
          setBranchId(branchesRes.data[0].id);
        }
      }
      if (tablesRes.success) setTables(tablesRes.data);
    } catch (err) {
      console.error('Failed to load data:', err);
      setToast({ message: t('failedToLoadData') || 'Failed to load data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadInventoryItems = async () => {
    if (!branchId) {
      setInventoryItems([]);
      return;
    }
    try {
      const res = await api.get<{ success: boolean; data: any[] }>(`/ims/inventory?forOrders=true&branchId=${branchId}`);
      if (res.success && res.data && Array.isArray(res.data)) {
        // Backend already filters items with stock > 0, so use directly
        // Items should already have stock > 0 from backend filter
        setInventoryItems(res.data);
        // Don't reset order items here - it's already handled in the branchId useEffect
        // The useEffect will create a default empty row when inventoryItems are loaded
      } else {
        setInventoryItems([]);
      }
    } catch (err: any) {
      console.error('Failed to load inventory items:', err);
      setToast({ message: err.response?.data?.message || t('failedToLoadData') || 'Failed to load inventory items', type: 'error' });
      setInventoryItems([]);
    }
  };

  const hasPendingItem = () => {
    return (
      selectedItem &&
      itemQuantity > 0 &&
      (selectedUomId || selectedItem?.uomId)
    );
  };

  const addOrderItem = () => {
    if (!branchId) {
      setToast({ message: t('pleaseSelectBranch') || 'Please select a branch first', type: 'error' });
      return;
    }

    if (!selectedItem) {
      setToast({ message: t('pleaseSelectItem') || 'Please select an item', type: 'error' });
      return;
    }

    if (!selectedUomId && !selectedItem.uomId) {
      setToast({ message: t('pleaseSelectUnit') || 'Please select a unit', type: 'error' });
      return;
    }

    // Check if item already exists in order
    const existingIndex = orderItems.findIndex(
      (item) => item.inventoryItemId === selectedItem.id
    );
    if (existingIndex >= 0) {
      setToast({ message: t('itemAlreadyAdded') || 'Item already added', type: 'error' });
      return;
    }

    const stockInBase = Number(selectedItem.stock || selectedItem.baseQuantity || 0);
    const availableUoms = getAvailableUomsForItem(selectedItem, stockInBase);
    const uomIdToUse = selectedUomId || selectedItem.uomId || '';
    const unitPrice = selectedItem.uomPrices?.[uomIdToUse] || selectedItem.price || selectedItem.basePrice || 0;
    const quantity = itemQuantity || 1;
    const totalPrice = unitPrice * quantity;

    const newId = itemCounter + 1;
    setItemCounter(newId);
    setOrderItems([
      ...orderItems,
      {
        id: newId,
        inventoryItemId: selectedItem.id,
        name: selectedItem.name,
        quantity,
        uomId: uomIdToUse,
        availableUoms: availableUoms,
        uomToBase: selectedItem.uomToBase || {},
        uomPrices: selectedItem.uomPrices || {},
        stock: stockInBase,
        basePrice: selectedItem.price || selectedItem.basePrice || 0,
        unitPrice,
        totalPrice,
      },
    ]);

    // Reset form (like inflow pattern)
    setSelectedItem(null);
    setSelectedUomId('');
    setItemQuantity(1);
  };

  const removeOrderItem = (id: number) => {
    setOrderItems(orderItems.filter((item) => item.id !== id));
  };

  // Filter UOMs based on available stock - smart UOM selection
  // Only show UOMs that can be fulfilled with available base quantity
  // Example: if we have 9 base units and crate = 20 base units, crate should NOT be available
  const getAvailableUomsForItem = (item: any, stockInBase: number): Array<{ id: string; name: string; abbreviation?: string }> => {
    if (!item?.uoms || !item?.uomToBase) {
      // If no UOMs or conversions, return base UOM if stock > 0
      if (stockInBase > 0 && item?.baseUomId) {
        return [{ id: item.baseUomId, name: item.unit || 'Unit', abbreviation: '' }];
      }
      return [];
    }
    
    return item.uoms.filter((uom: any) => {
      // Base UOM always available if stock > 0
      if (uom.id === item.baseUomId) {
        return stockInBase > 0;
      }
      
      // For other UOMs, check if we have enough base units to make at least 1 unit of this UOM
      // multiplier tells us how many base units = 1 unit of this UOM
      const multiplier = item.uomToBase?.[uom.id];
      if (!multiplier || multiplier <= 0) {
        return false;
      }
      
      // We need at least 'multiplier' base units to have 1 unit of this UOM
      // Example: if crate = 20 base units, we need at least 20 base units to show crate
      return stockInBase >= multiplier;
    });
  };

  const handleItemChange = (id: number, field: keyof OrderItemRow, value: any) => {
    const updated = orderItems.map((item) => {
      if (item.id !== id) return item;

      if (field === 'inventoryItemId') {
        const selectedItem = inventoryItems.find((i) => i.id === value);
        if (selectedItem) {
          const stockInBase = Number(selectedItem.stock || selectedItem.baseQuantity || 0);
          // Filter available UOMs based on stock - smart UOM selection
          const availableUoms = getAvailableUomsForItem(selectedItem, stockInBase);
          
          // Base unit should be selected by default - find it in available UOMs
          const baseUomId = selectedItem.baseUomId || '';
          const defaultUomId = availableUoms.find((uom: any) => uom.id === baseUomId)?.id || availableUoms[0]?.id || '';
          const defaultPrice = selectedItem.uomPrices?.[defaultUomId] || selectedItem.price || selectedItem.basePrice || 0;
          
          return {
            ...item,
            inventoryItemId: value,
            name: selectedItem.name,
            uomId: defaultUomId, // Base unit selected by default
            availableUoms: availableUoms,
            uomToBase: selectedItem.uomToBase || {},
            uomPrices: selectedItem.uomPrices || {},
            stock: stockInBase,
            basePrice: selectedItem.price || selectedItem.basePrice || 0,
            unitPrice: defaultPrice, // Auto-calculated based on selected UOM
            quantity: item.quantity || 1,
            totalPrice: defaultPrice * (item.quantity || 1),
          };
        }
      }

      if (field === 'uomId') {
        const inventoryItem = inventoryItems.find((i) => i.id === item.inventoryItemId);
        if (inventoryItem) {
          // Recalculate available UOMs and stock for the selected UOM
          const stockInBase = Number(item.stock || 0);
          const availableUoms = getAvailableUomsForItem(inventoryItem, stockInBase);
          
          // Get price for selected UOM
          const newPrice = inventoryItem.uomPrices?.[value] || inventoryItem.price || item.basePrice || 0;
          
          return {
            ...item,
            uomId: value,
            unitPrice: newPrice,
            availableUoms: availableUoms, // Update available UOMs
            uomToBase: inventoryItem.uomToBase || item.uomToBase || {},
            uomPrices: inventoryItem.uomPrices || item.uomPrices || {},
            totalPrice: newPrice * item.quantity,
          };
        }
        const newPrice = item.uomPrices?.[value] || item.basePrice || 0;
        return {
          ...item,
          uomId: value,
          unitPrice: newPrice,
          totalPrice: newPrice * item.quantity,
        };
      }

      if (field === 'quantity') {
        const qty = Number(value) || 0;
        return {
          ...item,
          quantity: qty,
          totalPrice: (item.unitPrice || 0) * qty,
        };
      }

      return { ...item, [field]: value };
    });

    setOrderItems(updated);
  };

  const getPendingItemTotal = () => {
    if (!hasPendingItem()) return 0;
    const unitPrice = selectedItem?.uomPrices?.[selectedUomId || selectedItem.uomId || ''] || selectedItem?.price || selectedItem?.basePrice || 0;
    return unitPrice * (itemQuantity || 0);
  };

  const calculateSubtotal = () => {
    const itemsTotal = orderItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    const pendingTotal = getPendingItemTotal();
    return itemsTotal + pendingTotal;
  };

  const calculateVat = () => {
    if (!formData.applyVat) return 0;
    return (calculateSubtotal() * formData.vatPercentage) / 100;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateVat();
  };

  // This function is no longer needed - React will re-render when orderItems state changes

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchId) {
      setToast({ message: t('pleaseSelectBranch') || 'Please select a branch', type: 'error' });
      return;
    }
    
    // Prepare items list - include pending item if exists
    let itemsToSubmit = [...orderItems];
    if (hasPendingItem() && selectedItem) {
      // Add pending item to the list
      const stockInBase = Number(selectedItem.stock || selectedItem.baseQuantity || 0);
      const availableUoms = getAvailableUomsForItem(selectedItem, stockInBase);
      const uomIdToUse = selectedUomId || selectedItem.uomId || '';
      const unitPrice = selectedItem.uomPrices?.[uomIdToUse] || selectedItem.price || selectedItem.basePrice || 0;
      const quantity = itemQuantity || 1;
      
      itemsToSubmit.push({
        id: itemCounter + 1,
        inventoryItemId: selectedItem.id,
        name: selectedItem.name,
        quantity,
        uomId: uomIdToUse,
        availableUoms: availableUoms,
        uomToBase: selectedItem.uomToBase || {},
        uomPrices: selectedItem.uomPrices || {},
        stock: stockInBase,
        basePrice: selectedItem.price || selectedItem.basePrice || 0,
        unitPrice,
        totalPrice: unitPrice * quantity,
      });
    }
    
    if (itemsToSubmit.length === 0 || itemsToSubmit.some((item) => !item.inventoryItemId || !item.uomId)) {
      setToast({ message: t('pleaseAddItems') || 'Please add at least one valid item', type: 'error' });
      return;
    }

    setSaving(true);
    try {
      const response = await api.post('/rms/orders', {
        branchId,
        tableId: formData.tableId || undefined,
        type: formData.type,
        customerName: formData.customerName || undefined,
        customerPhone: formData.customerPhone || undefined,
        notes: formData.notes || undefined,
        applyVat: formData.applyVat,
        vatPercentage: formData.applyVat ? formData.vatPercentage : undefined,
        items: itemsToSubmit
          .filter((item) => item.inventoryItemId && item.uomId)
          .map((item) => ({
            inventoryItemId: item.inventoryItemId,
            uomId: item.uomId,
            quantity: item.quantity,
          })),
      });

      if (response.success) {
        setToast({ message: t('orderCreated') || 'Order created successfully', type: 'success' });
        // Reset form to allow creating another order
        setOrderItems([]);
        setFormData({
          tableId: '',
          type: 'dine_in',
          customerName: '',
          customerPhone: '',
          notes: '',
          applyVat: false,
          vatPercentage: 7.5,
        });
        setSelectedItem(null);
        setItemCounter(0);
        setItemQuantity(1);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || t('failedToCreateOrder') || 'Failed to create order';
      setToast({ message: errorMessage, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
      </div>
    );
  }

  return (
    <PermissionGuard permission="orders.create">
      <div className="p-6">
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

        <div className="mb-6">
          <Link href="/rms/orders" className="text-red-600 dark:text-red-400 hover:underline mb-2 inline-block">
            ← {t('backToOrders') || 'Back to Orders'}
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('createOrder') || 'Create Order'}</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Order Items Card - includes Branch Selection */}
          <div className={`space-y-4 ${!branchId ? 'pointer-events-none opacity-50' : ''}`}>
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              {/* Branch Selection - Inside the same card */}
              <div className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('branch')} <span className="text-red-500">*</span>
            </label>
                <div className="w-1/3">
            <SearchableSelect
              options={branches.map(branch => ({ 
                value: branch.id, 
                label: `${branch.name}${branch.isDefault ? ' (Default)' : ''}` 
              }))}
              value={branchId}
              onChange={(value) => {
                setBranchId(value);
                // Clear items when branch changes - items will be reset in useEffect
                // Don't reset here as useEffect will handle it
              }}
              placeholder={t('selectBranch') || 'Select Branch'}
              required
              focusColor="red"
              searchPlaceholder={t('searchBranch') || 'Search branch...'}
            />
                </div>
            {!branchId && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('selectBranchFirst') || 'Please select a branch first'}</p>}
          </div>

              {/* Order Items Section - Following Inflow Pattern */}
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  {t('orderItems') || 'Order Items'} <span className="text-red-500">*</span>
              </h2>

              {/* Table Header */}
              <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {t('item')} <span className="text-red-500">*</span>
                </div>
                <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {t('unit')} <span className="text-red-500">*</span>
                </div>
                <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {t('quantity')} <span className="text-red-500">*</span>
                </div>
                <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {t('unitPrice') || 'Unit Price'}
                </div>
                <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {t('total')}
                </div>
                <div className="text-sm font-semibold text-gray-700 dark:text-gray-300"></div>
              </div>

              {/* Input Form Row - for adding new items (following inflow pattern) */}
              {/* Order: Item, Unit (UOM), Quantity, Unit Price, Total, Actions */}
              <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 mb-4">
                <div>
                  <SearchableSelect
                    options={inventoryItems
                      .filter(
                        (item) =>
                          !orderItems.some(
                            (addedItem) => addedItem.inventoryItemId === item.id
                          )
                      )
                      .map((item) => ({ 
                        value: item.id, 
                        label: item.name
                      }))}
                    value={selectedItem?.id || ''}
                    onChange={(value) => {
                      const item = inventoryItems.find((i) => i.id === value);
                      if (item) {
                        const stockInBase = Number(item.stock || item.baseQuantity || 0);
                        const availableUoms = getAvailableUomsForItem(item, stockInBase);
                        const baseUomId = item.baseUomId || '';
                        // Base unit should be selected by default - find it in available UOMs
                        const defaultUomId = availableUoms.find((uom: any) => uom.id === baseUomId)?.id || availableUoms[0]?.id || '';
                        const defaultPrice = item.uomPrices?.[defaultUomId] || item.price || item.basePrice || 0;
                        
                        setSelectedItem({
                          id: item.id,
                          name: item.name,
                          uomId: defaultUomId,
                          uoms: availableUoms,
                          price: defaultPrice,
                          stock: stockInBase,
                          baseQuantity: stockInBase,
                          uomToBase: item.uomToBase || {},
                          uomPrices: item.uomPrices || {},
                          basePrice: item.price || item.basePrice || 0,
                        });
                        // Set base unit as default
                        setSelectedUomId(defaultUomId);
                        setItemQuantity(1);
                      } else {
                        setSelectedItem(null);
                        setSelectedUomId('');
                        setItemQuantity(1);
                      }
                    }}
                    placeholder={t('selectItem') || 'Select Item'}
                    searchPlaceholder={t('searchItem') || 'Search item...'}
                    focusColor="red"
                    disabled={!branchId}
                  />
                </div>
                <div>
                  <SearchableSelect
                    options={
                      selectedItem?.uoms?.map((uom) => ({
                        value: uom.id,
                        label: uom.abbreviation
                          ? `${uom.name} (${uom.abbreviation})`
                          : uom.name,
                      })) || []
                    }
                    value={selectedUomId}
                    onChange={(value) => {
                      setSelectedUomId(value);
                      // Auto-calculate unit price when UOM changes
                      if (selectedItem && value) {
                        const newPrice = selectedItem.uomPrices?.[value] || selectedItem.price || selectedItem.basePrice || 0;
                        // Update selectedItem's price if needed (for display)
                        setSelectedItem({
                          ...selectedItem,
                          uomId: value,
                          price: newPrice,
                        });
                        // Reset quantity to 1 when UOM changes
                        setItemQuantity(1);
                      }
                    }}
                    placeholder={t('selectUnit') || 'Select Unit'}
                    disabled={!selectedItem || !selectedItem.uoms || selectedItem.uoms.length === 0}
                    required
                    focusColor="red"
                    searchPlaceholder={t('searchUnit') || 'Search unit...'}
                  />
                </div>
                <div>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={itemQuantity || ''}
                    onChange={(e) => setItemQuantity(Number(e.target.value) || 0)}
                    onFocus={handleNumberInputFocus}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-transparent"
                    placeholder={t('quantity')}
                    disabled={!selectedItem || !selectedUomId}
                  />
                  {selectedItem && selectedUomId && selectedItem.stock !== undefined && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {(() => {
                        const stockInBase = Number(selectedItem.stock || 0);
                        const multiplier = selectedItem.uomToBase?.[selectedUomId] || 1;
                        const availableInUom = Math.floor(stockInBase / multiplier);
                        const selectedUom = selectedItem.uoms?.find((u: any) => u.id === selectedUomId);
                        const uomName = selectedUom?.abbreviation || selectedUom?.name || t('unit') || 'unit';
                        return `${availableInUom} ${uomName} ${t('available') || 'available'}`;
                      })()}
                    </p>
                  )}
                </div>
                <div>
                  <div className="px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg text-sm font-medium text-gray-900 dark:text-gray-100 min-h-[48px] flex items-center">
                    {selectedItem && selectedUomId
                      ? `₦${Number(selectedItem.uomPrices?.[selectedUomId] || selectedItem.price || selectedItem.basePrice || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : '-'}
                  </div>
                </div>
                <div>
                  <div className="px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg text-sm font-medium text-gray-900 dark:text-gray-100 min-h-[48px] flex items-center">
                    {selectedItem && itemQuantity > 0 && selectedUomId
                      ? `₦${(Number(selectedItem.uomPrices?.[selectedUomId] || selectedItem.price || selectedItem.basePrice || 0) * itemQuantity).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : '-'}
                  </div>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={addOrderItem}
                    disabled={!selectedItem || !selectedUomId || itemQuantity <= 0 || !branchId}
                    className="w-full px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center min-h-[48px]"
                    title={t('add') || 'Add Item'}
                  >
                    <i className="bx bx-plus text-lg"></i>
                  </button>
                </div>
              </div>

              {/* Added Items Rows - following inflow pattern */}
              {orderItems.length > 0 && (
                <div className="mt-4 space-y-3">
                  {orderItems.map((item) => {
                      const inventoryItem = inventoryItems.find(
                        (i) => i.id === item.inventoryItemId
                      );
                      const availableUoms = item.availableUoms || [];
                      
                      return (
                        <div
                          key={item.id}
                          className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4"
                        >
                          <div>
                            {item.inventoryItemId ? (
                              <div className="px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg text-sm font-medium text-gray-900 dark:text-gray-100 min-h-[48px] flex items-center">
                                {item.name}
                              </div>
                            ) : (
                              <SearchableSelect
                                options={inventoryItems
                                  .filter(
                                    (invItem) =>
                                      !orderItems.some(
                                        (addedItem) => 
                                          addedItem.inventoryItemId === invItem.id && 
                                          addedItem.id !== item.id
                                      )
                                  )
                                  .map((invItem) => ({ 
                                    value: invItem.id, 
                                    label: invItem.name
                                  }))}
                                value={item.inventoryItemId || ''}
                                onChange={(value) => handleItemChange(item.id, 'inventoryItemId', value)}
                                placeholder={t('selectItem') || 'Select Item'}
                                searchPlaceholder={t('searchItem') || 'Search item...'}
                                focusColor="red"
                                disabled={!branchId}
                              />
                            )}
                          </div>
                          <div className="overflow-hidden">
                            <SearchableSelect
                              options={availableUoms.map((uom: any) => ({
                                value: uom.id,
                                label: uom.abbreviation
                                  ? `${uom.name} (${uom.abbreviation})`
                                  : uom.name,
                              }))}
                              value={item.uomId || ''}
                              onChange={(value) => {
                                handleItemChange(item.id, 'uomId', value);
                                // Reset quantity to 1 when UOM changes
                                handleItemChange(item.id, 'quantity', 1);
                              }}
                              placeholder={t('selectUnit') || 'Select Unit'}
                              focusColor="red"
                              searchPlaceholder={t('searchUnit') || 'Search unit...'}
                              disabled={!item.inventoryItemId}
                            />
                          </div>
                          <div>
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={item.quantity || ''}
                              onChange={(e) => handleItemChange(item.id, 'quantity', Number(e.target.value) || 0)}
                              onFocus={handleNumberInputFocus}
                              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-transparent"
                              disabled={!item.inventoryItemId || !item.uomId}
                            />
                            {item.stock !== undefined && item.inventoryItemId && item.uomId && (
                              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                {(() => {
                                  const stockInBase = Number(item.stock || 0);
                                  const multiplier = item.uomToBase?.[item.uomId] || 1;
                                  const availableInUom = Math.floor(stockInBase / multiplier);
                                  const selectedUom = item.availableUoms?.find((u: any) => u.id === item.uomId);
                                  const uomName = selectedUom?.abbreviation || selectedUom?.name || t('unit') || 'unit';
                                  return `${availableInUom} ${uomName} ${t('available') || 'available'}`;
                                })()}
                              </p>
                            )}
                          </div>
                          <div>
                            <div className="px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg text-sm font-medium text-gray-900 dark:text-gray-100 min-h-[48px] flex items-center">
                              {item.unitPrice ? `₦${Number(item.unitPrice || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                            </div>
                          </div>
                          <div>
                            <div className="px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg text-sm font-medium text-gray-900 dark:text-gray-100 min-h-[48px] flex items-center">
                              {item.totalPrice ? `₦${Number(item.totalPrice || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                        </div>
                      </div>
                      <div>
                          <button
                            type="button"
                            onClick={() => removeOrderItem(item.id)}
                              className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 transition-colors"
                              title={t('remove') || 'Remove'}
                          >
                              <i className="bx bx-trash text-sm"></i>
                          </button>
                          </div>
                        </div>
                      );
                    })}
                      </div>
              )}

              {/* Action Buttons Row - VAT and Add Details */}
              <div className="mt-4 flex items-center justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:underline"
                >
                  {t('addDetails') || 'Add Details'}
                </button>
                {/* VAT Option - beside Add Details */}
                <div className="flex items-center space-x-2">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.applyVat}
                      onChange={(e) => setFormData({ ...formData, applyVat: e.target.checked })}
                      className="w-4 h-4 text-red-600 border-gray-300 rounded focus-visible:ring-red-500"
                    />
                    <span className="ml-2 text-xs font-medium text-gray-700 dark:text-gray-300">{t('applyVat') || 'Apply VAT'}</span>
                  </label>
                  {formData.applyVat && (
                    <div className="flex items-center space-x-1">
                      <input
                        type="number"
                        value={formData.vatPercentage}
                        onChange={(e) => setFormData({ ...formData, vatPercentage: Number(e.target.value) })}
                        min="0"
                        max="100"
                        step="0.1"
                        className="w-16 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-transparent"
                      />
                      <span className="text-xs text-gray-500 dark:text-gray-400">%</span>
                    </div>
                  )}
                  </div>
              </div>
            </div>

            {/* Additional Details - Shown when Add Details is clicked */}
            {showDetails && (
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                  <i className="bx bx-cog mr-2"></i>
                  {t('additionalDetails') || 'Additional Details'}
                </h3>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Table */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('table')} <span className="text-gray-400 dark:text-gray-500 text-xs">({t('optional')})</span>
                      </label>
                      <select
                        value={formData.tableId}
                        onChange={(e) => setFormData({ ...formData, tableId: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-transparent"
                      >
                        <option value="">{t('selectTable') || 'Select a table (optional)'}</option>
                        {tables.map((table) => (
                          <option key={table.id} value={table.id}>
                            {table.name || `Table ${table.number}`}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Order Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('orderType')} <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        required
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-transparent"
                      >
                        <option value="dine_in">{t('dineIn') || 'Dine In'}</option>
                        <option value="takeaway">{t('takeaway') || 'Takeaway'}</option>
                        <option value="delivery">{t('delivery') || 'Delivery'}</option>
                      </select>
                    </div>

                    {/* Customer Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('customerName')} <span className="text-gray-400 dark:text-gray-500 text-xs">({t('optional')})</span>
                      </label>
                      <input
                        type="text"
                        value={formData.customerName}
                        onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-transparent"
                        placeholder={t('optional') || 'Optional'}
                      />
                    </div>

                    {/* Customer Phone */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('customerPhone')} <span className="text-gray-400 dark:text-gray-500 text-xs">({t('optional')})</span>
                      </label>
                      <input
                        type="tel"
                        value={formData.customerPhone}
                        onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-transparent"
                        placeholder={t('optional') || 'Optional'}
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('notes')} <span className="text-gray-400 dark:text-gray-500 text-xs">({t('optional')})</span>
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-transparent resize-none"
                      placeholder={t('orderNotes') || 'Any special instructions or notes...'}
                    />
                  </div>
                  </div>
                </div>
              )}


            {/* Order Summary - Collapsible, shows only Total by default */}
            <div className="flex justify-end">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 w-1/3">
                <button
                  type="button"
                  onClick={() => setShowOrderSummary(!showOrderSummary)}
                  className="w-full flex items-center justify-between mb-2"
                >
                  <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('orderSummary') || 'Order Summary'}</span>
                  <i className={`bx text-xl text-gray-500 dark:text-gray-400 transition-transform ${showOrderSummary ? 'bx-chevron-up' : 'bx-chevron-down'}`}></i>
                </button>
                {showOrderSummary && (
                  <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">{t('items')}:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {orderItems.reduce((sum, item) => sum + item.quantity, 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">{t('subtotal')}:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    ₦{calculateSubtotal().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                {formData.applyVat && formData.vatPercentage > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      {t('vat')} ({formData.vatPercentage}%):
                    </span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      ₦{calculateVat().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700 mt-2">
                  <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('total')}:</span>
                  <span className="text-xl font-bold text-red-600">
                    ₦{calculateTotal().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Link
                href="/rms/orders"
                className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {t('cancel')}
              </Link>
              <button
                type="submit"
                disabled={saving || !branchId || (orderItems.length === 0 && !hasPendingItem()) || (orderItems.length > 0 && orderItems.some((item) => !item.inventoryItemId || !item.uomId))}
                className="px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <i className="bx bx-check"></i>
                <span>{saving ? t('saving') || 'Saving...' : t('createOrder') || 'Create Order'}</span>
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
