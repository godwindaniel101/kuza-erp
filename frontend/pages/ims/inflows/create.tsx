import { useState, useEffect } from "react";
import { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import { api } from "@/lib/api";
import PermissionGuard from "@/components/PermissionGuard";
import Toast from "@/components/Toast";
import Link from "next/link";
import SearchableSelect from "@/components/SearchableSelect";
import DatePicker from "@/components/DatePicker";
import Modal from "@/components/Modal";

interface InflowItem {
  inventoryItemId: string;
  quantity: number;
  unitCost: number;
  uomId?: string;
  name?: string;
  expiryDate?: string;
}

export default function CreateInflowPage() {
  const { t } = useTranslation("common");
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [formData, setFormData] = useState({
    branchId: "",
    supplierId: "",
    invoiceNumber: "",
    receivedDate: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [inflowItems, setInflowItems] = useState<InflowItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<{
    id: string;
    name: string;
    uomId: string;
    uoms?: Array<{ id: string; name: string; abbreviation?: string }>;
  } | null>(null);
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemUnitCost, setItemUnitCost] = useState(0);
  const [itemExpiryDate, setItemExpiryDate] = useState<string>("");

  // Handle number input focus - select all if value is 0
  const handleNumberInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (
      e.target.value === "0" ||
      e.target.value === "0.00" ||
      e.target.value === "0.0"
    ) {
      e.target.select();
    }
  };
  const [selectedUomId, setSelectedUomId] = useState<string>("");
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [creatingSupplier, setCreatingSupplier] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [currency, setCurrency] = useState<string>("NGN");
  const [newSupplier, setNewSupplier] = useState({
    name: "",
    email: "",
    phone: "",
    contactPerson: "",
    address: "",
  });

  useEffect(() => {
    loadData();
    loadCurrency();
  }, []);

  const loadCurrency = async () => {
    try {
      const response = await api.get<{
        success: boolean;
        data: { currency_code?: string; currency?: string };
      }>("/settings");
      if (response.success && response.data) {
        setCurrency(
          response.data.currency_code || response.data.currency || "NGN"
        );
      }
    } catch (err) {
      console.error("Failed to load currency:", err);
      setCurrency("NGN");
    }
  };

  const formatCurrency = (amount: number): string => {
    const currencySymbols: { [key: string]: string } = {
      NGN: "₦",
      USD: "$",
      EUR: "€",
      GBP: "£",
    };
    const symbol = currencySymbols[currency] || currency;
    return `${symbol}${amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const loadData = async () => {
    try {
      const [itemsRes, suppliersRes, branchesRes] = await Promise.all([
        api.get<{ success: boolean; data: any[] }>("/ims/inventory"),
        api
          .get<{ success: boolean; data: any[] }>("/rms/suppliers")
          .catch(() => ({ success: false, data: [] })),
        api.get<{ success: boolean; data: any[] }>("/settings/branches"),
      ]);

      if (itemsRes.success) {
        // Ensure all items have uoms array populated (should already be from backend BFS)
        const itemsWithUoms = itemsRes.data.map((item: any) => {
          // If uoms is missing or empty, at least include the base UOM
          if (!item.uoms || item.uoms.length === 0) {
            return {
              ...item,
              uoms: item.baseUom ? [{
                id: item.baseUomId,
                name: item.baseUom.name || 'Unknown',
                abbreviation: item.baseUom.abbreviation || '',
              }] : [],
            };
          }
          return item;
        });
        setInventoryItems(itemsWithUoms);
      }
      if (suppliersRes.success) setSuppliers(suppliersRes.data);
      if (branchesRes.success) {
        setBranches(branchesRes.data);
        if (branchesRes.data.length > 0 && !formData.branchId) {
          setFormData({ ...formData, branchId: branchesRes.data[0].id });
        }
      }
    } catch (err) {
      console.error("Failed to load data:", err);
      setToast({
        message: t("failedToLoadData") || "Failed to load data",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const addItemToInflow = () => {
    if (!selectedItem) {
      setToast({
        message: t("pleaseSelectItem") || "Please select an item",
        type: "error",
      });
      return;
    }

    if (!itemUnitCost || itemUnitCost <= 0) {
      setToast({
        message:
          t("pleaseEnterUnitCost") ||
          "Please enter unit cost greater than zero",
        type: "error",
      });
      return;
    }

    if (!selectedUomId && !selectedItem.uomId) {
      setToast({
        message: t("pleaseSelectUnit") || "Please select a unit",
        type: "error",
      });
      return;
    }

    const existingIndex = inflowItems.findIndex(
      (item) => item.inventoryItemId === selectedItem.id
    );
    if (existingIndex >= 0) {
      setToast({
        message: t("itemAlreadyAdded") || "Item already added",
        type: "error",
      });
      return;
    }

    // Add item with default values
    setInflowItems([
      ...inflowItems,
      {
        inventoryItemId: selectedItem.id,
        quantity: itemQuantity || 1,
        unitCost: itemUnitCost || 0,
        uomId: selectedUomId || selectedItem.uomId,
        name: selectedItem.name,
        expiryDate: itemExpiryDate || undefined,
      },
    ]);

    // Reset form
    setSelectedItem(null);
    setSelectedUomId("");
    setItemQuantity(1);
    setItemUnitCost(0);
    setItemExpiryDate("");
  };

  const updateItem = (index: number, field: keyof InflowItem, value: any) => {
    const updatedItems = [...inflowItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setInflowItems(updatedItems);
  };

  const removeItem = (index: number) => {
    setInflowItems(inflowItems.filter((_, i) => i !== index));
  };

  const calculateItemTotal = (item: InflowItem) => {
    return (item.quantity || 0) * (item.unitCost || 0);
  };

  const calculateGrandTotal = () => {
    return inflowItems.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  };

  const handleAddSupplier = async () => {
    if (!newSupplier.name.trim()) {
      setToast({
        message: t("nameRequired") || "Name is required",
        type: "error",
      });
      return;
    }

    setCreatingSupplier(true);
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

      const res = await api.post<{
        success: boolean;
        data: any;
        message?: string;
      }>("/rms/suppliers", payload);
      if (res.success) {
        setToast({
          message:
            res.message ||
            t("supplierCreated") ||
            "Supplier created successfully",
          type: "success",
        });
        setShowAddSupplier(false);
        setNewSupplier({
          name: "",
          email: "",
          phone: "",
          contactPerson: "",
          address: "",
        });

        // Reload suppliers and auto-select the new one
        const suppliersRes = await api.get<{ success: boolean; data: any[] }>(
          "/rms/suppliers"
        );
        if (suppliersRes.success) {
          setSuppliers(suppliersRes.data);
          // Auto-select the newly created supplier
          if (res.data?.id) {
            setFormData({ ...formData, supplierId: res.data.id });
          }
        }
      } else {
        setToast({
          message:
            res.message || t("createFailed") || "Failed to create supplier",
          type: "error",
        });
      }
    } catch (err: any) {
      console.error("Failed to create supplier:", err);
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        t("createFailed") ||
        "Failed to create supplier";
      setToast({ message: errorMessage, type: "error" });
    } finally {
      setCreatingSupplier(false);
    }
  };

  const hasPendingItem = () => {
    return (
      selectedItem &&
      itemQuantity > 0 &&
      itemUnitCost > 0 &&
      (selectedUomId || selectedItem.uomId)
    );
  };

  const getPendingItem = () => {
    if (!hasPendingItem()) return null;
    return {
      inventoryItemId: selectedItem!.id,
      quantity: itemQuantity || 1,
      unitCost: itemUnitCost || 0,
      uomId: selectedUomId || selectedItem!.uomId,
      name: selectedItem!.name,
      expiryDate: itemExpiryDate || undefined,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.branchId) {
      setToast({
        message: t("pleaseSelectBranch") || "Please select a branch",
        type: "error",
      });
      return;
    }

    if (!formData.supplierId) {
      setToast({
        message: t("pleaseSelectSupplier") || "Please select a supplier",
        type: "error",
      });
      return;
    }

    // Combine already added items with pending item if exists
    let itemsToSubmit = [...inflowItems];

    // If there's a pending item in the form fields, add it
    if (hasPendingItem()) {
      const pendingItem = getPendingItem();
      if (
        pendingItem &&
        !itemsToSubmit.some(
          (item) => item.inventoryItemId === pendingItem.inventoryItemId
        )
      ) {
        itemsToSubmit.push(pendingItem);
      }
    }

    if (itemsToSubmit.length === 0) {
      setToast({
        message: t("pleaseAddItems") || "Please add at least one item",
        type: "error",
      });
      return;
    }

    setSaving(true);
    try {
      // Ensure date is in ISO format (YYYY-MM-DD)
      const receivedDate =
        formData.receivedDate || new Date().toISOString().split("T")[0];

      const response = await api.post("/ims/inflows", {
        branchId: formData.branchId,
        supplierId: formData.supplierId || undefined,
        invoiceNumber: formData.invoiceNumber || undefined,
        receivedDate: receivedDate,
        notes: formData.notes || undefined,
        items: itemsToSubmit.map((item) => ({
          inventoryItemId: item.inventoryItemId,
          quantity: Number(item.quantity),
          unitCost: Number(item.unitCost),
          uomId: item.uomId,
          expiryDate: item.expiryDate || undefined,
        })),
      });

      if (response.success) {
        setToast({
          message: t("inflowCreated") || "Inflow created successfully",
          type: "success",
        });
        // Reset form to allow creating another inflow
        setInflowItems([]);
        setFormData({
          branchId: formData.branchId, // Keep branch
          supplierId: "",
          invoiceNumber: "",
          receivedDate: new Date().toISOString().split("T")[0],
          notes: "",
        });
        setSelectedItem(null);
        setItemQuantity(1);
        setItemUnitCost(0);
        setItemExpiryDate("");
        setSelectedUomId("");
      }
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        t("failedToCreateInflow") ||
        "Failed to create inflow";
      setToast({ message: errorMessage, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="mb-6">
        <Link
          href="/ims/inflows"
          className="text-blue-600 dark:text-blue-400 hover:underline mb-2 inline-block"
        >
          ← {t("backToInflows") || "Back to Inflows"}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {t("recordInflow") || "Record Inflow"}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t("inflowDetails")}
            </h2>
            <div className="w-48">
              <DatePicker
                value={formData.receivedDate}
                onChange={(value) =>
                  setFormData({ ...formData, receivedDate: value })
                }
                placeholder={t("receivedDate")}
                required
                focusColor="red"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("branch")} <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={branches.map((branch) => ({
                  value: branch.id,
                  label: branch.name,
                }))}
                value={formData.branchId}
                onChange={(value) =>
                  setFormData({ ...formData, branchId: value })
                }
                placeholder={t("selectBranch")}
                required
                searchPlaceholder={t("searchBranch") || "Search branch..."}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("supplier")} <span className="text-red-500">*</span>
                </label>
                <PermissionGuard permission="suppliers.create">
                  <button
                    type="button"
                    onClick={() => setShowAddSupplier(true)}
                    className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:underline whitespace-nowrap"
                  >
                    {t("addSupplier") || "Add Supplier"}
                  </button>
                </PermissionGuard>
              </div>
              <SearchableSelect
                options={suppliers.map((supplier) => ({
                  value: supplier.id,
                  label: supplier.name,
                }))}
                value={formData.supplierId}
                onChange={(value) =>
                  setFormData({ ...formData, supplierId: value })
                }
                placeholder={t("selectSupplier")}
                required
                searchPlaceholder={t("searchSupplier") || "Search supplier..."}
                focusColor="red"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("invoiceNumber")}
              </label>
              <input
                type="text"
                value={formData.invoiceNumber}
                onChange={(e) =>
                  setFormData({ ...formData, invoiceNumber: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-transparent"
              />
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowNotes(!showNotes)}
                  className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:underline"
                >
                  {t("addNote") || "Add Note"}
                </button>
              </div>
            </div>
          </div>
          {showNotes && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("Notes") || "Notes"}
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-transparent resize-none"
                placeholder={t("notes") || "Add any additional notes..."}
              />
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {t("addItems")}
          </h2>

          {/* Table Header */}
          <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] gap-4 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {t("item")}
            </div>
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {t("quantity")} <span className="text-red-500">*</span>
            </div>
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {t("unit")} <span className="text-red-500">*</span>
            </div>
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {t("unitCost")} <span className="text-red-500">*</span>
            </div>
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {t("expiryDate")}
              <span className="text-gray-400 text-xs">({t("optional")})</span>
            </div>
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {t("total")}
            </div>
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-300"></div>
          </div>

          {/* Input Form Row */}
          <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] gap-4 mb-4">
            <div>
              <SearchableSelect
                options={inventoryItems
                  .filter(
                    (item) =>
                      !inflowItems.some(
                        (addedItem) => addedItem.inventoryItemId === item.id
                      )
                  )
                  .map((item) => ({ value: item.id, label: item.name }))}
                value={selectedItem?.id || ""}
                onChange={(value) => {
                  const item = inventoryItems.find((i) => i.id === value);
                  if (item) {
                    // Get all convertible UOMs from the item (should include all via BFS)
                    const uoms = (item as any).uoms || [];
                    const baseUomId = item.baseUomId || "";
                    
                    // Debug: Log available UOMs for verification
                    if (uoms.length > 0) {
                      console.log(`Available UOMs for ${item.name}:`, uoms);
                    } else {
                      console.warn(`No UOMs found for item ${item.name}. Item data:`, item);
                    }
                    
                    setSelectedItem({
                      id: item.id,
                      name: item.name,
                      uomId: baseUomId,
                      uoms: uoms, // All convertible UOMs (direct and indirect via BFS)
                    });
                    // Set default UOM to base UOM (first in the list)
                    setSelectedUomId(baseUomId);
                  } else {
                    setSelectedItem(null);
                    setSelectedUomId("");
                  }
                }}
                placeholder={t("selectItem") || "Select Item"}
                searchPlaceholder={t("searchItem") || "Search item..."}
                focusColor="red"
              />
            </div>
            <div>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={itemQuantity || ""}
                onChange={(e) => setItemQuantity(Number(e.target.value) || 0)}
                onFocus={handleNumberInputFocus}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-transparent"
                placeholder={t("quantity")}
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
                onChange={(value) => setSelectedUomId(value)}
                placeholder={t("selectUnit") || "Select Unit"}
                disabled={
                  !selectedItem ||
                  !selectedItem.uoms ||
                  selectedItem.uoms.length === 0
                }
                required
                focusColor="red"
                searchPlaceholder={t("searchUnit") || "Search unit..."}
              />
            </div>
            <div>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={itemUnitCost || ""}
                onChange={(e) => setItemUnitCost(Number(e.target.value) || 0)}
                onFocus={handleNumberInputFocus}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-transparent"
                placeholder={t("unitCost")}
              />
            </div>
            <div>
              <DatePicker
                value={itemExpiryDate || ""}
                onChange={(value) => setItemExpiryDate(value)}
                placeholder={t("expiryDate") || "Expiry Date"}
                focusColor="red"
              />
            </div>
            <div>
              <div className="px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg text-sm font-medium text-gray-900 dark:text-gray-100 min-h-[48px] flex items-center">
                {selectedItem && itemQuantity > 0 && itemUnitCost > 0
                  ? formatCurrency(
                      calculateItemTotal({
                        quantity: itemQuantity,
                        unitCost: itemUnitCost,
                      } as any)
                    )
                  : "-"}
              </div>
            </div>
            <div>
              <button
                type="button"
                onClick={addItemToInflow}
                disabled={!selectedItem || !itemUnitCost || itemUnitCost <= 0}
                className="w-full px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center min-h-[48px]"
                title={t("add") || "Add Item"}
              >
                <i className="bx bx-plus text-lg"></i>
              </button>
            </div>
          </div>

          {inflowItems.length > 0 && (
            <div className="mt-4">
              {/* Items Rows */}
              <div className="space-y-3">
                {inflowItems.map((item, index) => {
                  const inventoryItem = inventoryItems.find(
                    (i) => i.id === item.inventoryItemId
                  );
                  const availableUoms =
                    inventoryItem && (inventoryItem as any).uoms
                      ? (inventoryItem as any).uoms
                      : [];
                  const itemTotal = calculateItemTotal(item);

                  return (
                    <div
                      key={index}
                      className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] gap-4"
                    >
                      <div>
                        <div className="px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg text-sm font-medium text-gray-900 dark:text-gray-100 min-h-[48px] flex items-center">
                          {item.name}
                        </div>
                      </div>
                      <div>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={item.quantity || ""}
                          onChange={(e) =>
                            updateItem(
                              index,
                              "quantity",
                              Number(e.target.value) || 0
                            )
                          }
                          onFocus={handleNumberInputFocus}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-transparent"
                        />
                      </div>
                      <div className="overflow-hidden">
                        <SearchableSelect
                          options={availableUoms.map((uom: any) => ({
                            value: uom.id,
                            label: uom.abbreviation
                              ? `${uom.name} (${uom.abbreviation})`
                              : uom.name,
                          }))}
                          value={item.uomId || ""}
                          onChange={(value) =>
                            updateItem(index, "uomId", value)
                          }
                          placeholder={t("selectUnit") || "Select Unit"}
                          focusColor="red"
                          searchPlaceholder={
                            t("searchUnit") || "Search unit..."
                          }
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={item.unitCost || ""}
                          onChange={(e) =>
                            updateItem(
                              index,
                              "unitCost",
                              Number(e.target.value) || 0
                            )
                          }
                          onFocus={handleNumberInputFocus}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-transparent"
                        />
                      </div>
                      <div>
                        <DatePicker
                          value={item.expiryDate || ""}
                          onChange={(value) =>
                            updateItem(index, "expiryDate", value)
                          }
                          placeholder={t("expiryDate") || "Expiry Date"}
                          focusColor="red"
                        />
                      </div>
                      <div>
                        <div className="px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg text-sm font-medium text-gray-900 dark:text-gray-100 min-h-[48px] flex items-center">
                          {formatCurrency(itemTotal)}
                        </div>
                      </div>
                      <div>
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 transition-colors"
                          title={t("remove") || "Remove"}
                        >
                          <i className="bx bx-trash text-sm"></i>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Grand Total Row */}
              <div className="mt-4 pt-4 border-t-2 border-gray-300 dark:border-gray-600">
                <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                  <div className="md:col-span-7 flex flex-row items-center justify-end">
                    <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 mr-4">
                      {t("grandTotal") || "Grand Total"}
                    </div>
                    <div className="px-4 py-3 border-2 border-red-500 dark:border-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg text-lg font-bold text-red-700 dark:text-red-400">
                      {formatCurrency(calculateGrandTotal())}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3">
          <Link
            href="/ims/inflows"
            className="px-4 py-3 border border-gray-300 dark:border-gray-600 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            {t("cancel")}
          </Link>
          <button
            type="submit"
            disabled={
              saving ||
              !formData.branchId ||
              !formData.supplierId ||
              (inflowItems.length === 0 && !hasPendingItem())
            }
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? t("saving") || "Saving..." : t("save")}
          </button>
        </div>
      </form>

      {/* Add Supplier Modal */}
      <Modal
        isOpen={showAddSupplier}
        onClose={() => {
          setShowAddSupplier(false);
          setNewSupplier({
            name: "",
            email: "",
            phone: "",
            contactPerson: "",
            address: "",
          });
        }}
        title={t("addSupplier") || "Add New Supplier"}
        maxWidth="md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAddSupplier();
          }}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("supplierName") || "Supplier Name"}{" "}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={newSupplier.name}
                onChange={(e) =>
                  setNewSupplier({ ...newSupplier, name: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-transparent"
                placeholder={t("supplierName") || "Supplier name"}
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("contactPerson") || "Contact Person"}{" "}
                <span className="text-gray-400 dark:text-gray-500 text-xs">
                  ({t("optional") || "Optional"})
                </span>
              </label>
              <input
                type="text"
                value={newSupplier.contactPerson}
                onChange={(e) =>
                  setNewSupplier({
                    ...newSupplier,
                    contactPerson: e.target.value,
                  })
                }
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-transparent"
                placeholder={t("contactPersonName") || "Contact person name"}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t("email")}{" "}
                  <span className="text-gray-400 dark:text-gray-500 text-xs">
                    ({t("optional") || "Optional"})
                  </span>
                </label>
                <input
                  type="email"
                  value={newSupplier.email}
                  onChange={(e) =>
                    setNewSupplier({ ...newSupplier, email: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-transparent"
                  placeholder={t("emailAddress") || "email@example.com"}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t("phone")}{" "}
                  <span className="text-gray-400 dark:text-gray-500 text-xs">
                    ({t("optional") || "Optional"})
                  </span>
                </label>
                <input
                  type="tel"
                  value={newSupplier.phone}
                  onChange={(e) =>
                    setNewSupplier({ ...newSupplier, phone: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-transparent"
                  placeholder={t("phoneNumber") || "+1234567890"}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("address")}{" "}
                <span className="text-gray-400 dark:text-gray-500 text-xs">
                  ({t("optional") || "Optional"})
                </span>
              </label>
              <textarea
                value={newSupplier.address}
                onChange={(e) =>
                  setNewSupplier({ ...newSupplier, address: e.target.value })
                }
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-transparent"
                placeholder={t("address") || "Address"}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={() => {
                setShowAddSupplier(false);
                setNewSupplier({
                  name: "",
                  email: "",
                  phone: "",
                  contactPerson: "",
                  address: "",
                });
              }}
              className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              disabled={creatingSupplier}
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              disabled={creatingSupplier || !newSupplier.name.trim()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors dark:bg-red-700 dark:hover:bg-red-600"
            >
              {creatingSupplier ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {t("creating") || "Creating..."}
                </span>
              ) : (
                t("save")
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
      ...(await serverSideTranslations(locale || "en", ["common"])),
    },
  };
};
