import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { GetServerSideProps } from "next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import Link from "next/link";
import { api } from "@/lib/api";
import PermissionGuard from "@/components/PermissionGuard";
import Toast from "@/components/Toast";
import PageHeader from "@/components/ui/PageHeader";
import { formatMoney, useCurrency } from "@/lib/format";

interface BulkUploadLog {
  id: string;
  line: number;
  lineNumber?: number;
  data: string;
  rowData?: any;
  errors: string[];
  errorMessages?: string[];
}

interface InflowDetails {
  id: string;
  businessId: string;
  branchId: string;
  invoiceNumber?: string;
  inflowNumber?: string;
  reference?: string;
  receivedDate?: string;
  notes?: string;
  totalAmount?: number;
  currency?: string;
  supplier?: { id: string; name: string };
  receivedBy?: { name?: string; email?: string } | string;
  branch?: { id: string; name: string };
  items?: InflowItemWithDetails[];
  failedUploads?: BulkUploadLog[];
}

interface InflowItemWithDetails {
  id: string;
  quantity: number;
  unitCost: number;
  totalCost?: number;
  inventoryItemName?: string;
  name?: string;
  itemName?: string;
  unitName?: string;
  unit?: string;
  supplierId?: string;
  branchId?: string;
  inventoryItem?: {
    name: string;
    baseUom?: { name: string; abbreviation: string };
    category?: { name: string };
    subcategory?: { name: string };
  };
  uom?: { name: string; abbreviation: string };
  supplier?: { name: string };
  branch?: { name: string };
  batchNumber?: string;
  expiryDate?: string;
  salesData?: {
    totalSold: number;
    totalSalesAmount: number;
    totalCost: number;
    orderCount: number;
    remainingQuantity: number;
  };
  baseQuantity?: number;
  // Fields for when relations are not found (from backend entity changes)
  originalItemName?: string;
  originalUomName?: string;
}

export default function InflowDetailsPage() {
  const { t } = useTranslation("common");
  const router = useRouter();
  const { id } = router.query;
  const [inflow, setInflow] = useState<InflowDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const currency = useCurrency();
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [showFailedUploads, setShowFailedUploads] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "items">("details");

  useEffect(() => {
    if (id) {
      loadInflow();
    }
  }, [id]);

  const formatCurrency = (amount: number, inflowCurrency?: string): string =>
    formatMoney(amount, currency);

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "-";
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const loadInflow = async () => {
    try {
      const response = await api.get<{ success: boolean; data: InflowDetails }>(
        `/ims/inflows/${id}?withSales=true`,
      );
      if (response.success && response.data) {
        setInflow(response.data);
      }
    } catch (err: any) {
      console.error("Failed to load inflow:", err);
      setToast({
        message:
          err.response?.data?.message ||
          t("failedToLoadData") ||
          "Failed to load inflow details",
        type: "error",
      });
      setTimeout(() => router.push("/ims/inflows"), 2000);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            {t("loading") || "Loading..."}
          </p>
        </div>
      </div>
    );
  }

  if (!inflow) {
    return (
      <div>
        <div className="bg-white dark:bg-gray-900 rounded-lg p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            {t("inflowNotFound") || "Inflow not found"}
          </p>
          <Link
            href="/ims/inflows"
            className="mt-4 inline-block text-red-600 hover:text-red-700 dark:text-red-400"
          >
            {t("backToInflows") || "Back to Inflows"}
          </Link>
        </div>
      </div>
    );
  }

  const totalAmount =
    inflow.items?.reduce((sum: number, item: any) => {
      return sum + (item.quantity || 0) * (item.unitCost || 0);
    }, 0) ||
    inflow.totalAmount ||
    0;

  return (
    <PermissionGuard permission="inventory.view">
      <div className="w-full max-w-5xl space-y-6 kz-stagger">
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}

        <PageHeader
          title={t("inflowDetails") || "Inflow Details"}
          subtitle={t(
            "inflows.detailsSubtitle",
            "What came in, from whom, and at what cost"
          )}
          breadcrumbs={[
            { label: t("inflows") || "Inflows", href: "/ims/inflows" },
            {
              label: String(
                inflow.invoiceNumber || inflow.inflowNumber || inflow.reference || id
              ),
            },
          ]}
        />

        {/* Tab Navigation */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav
              className="flex space-x-8 px-6"
              aria-label={t("inflows.tabsAriaLabel", "Tabs")}
            >
              <button
                onClick={() => setActiveTab("details")}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "details"
                    ? "border-accent text-accent"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <i className="bx bx-info-circle"></i>
                  <span>{t("details") || "Details"}</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab("items")}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "items"
                    ? "border-accent text-accent"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <i className="bx bx-package"></i>
                  <span>
                    {t("items") || "Items"} ({inflow.items?.length || 0})
                  </span>
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "details" && (
          <div className="w-full max-w-5xl space-y-5">
            {/* Comprehensive Inflow Information */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 p-6">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center">
                <i className="bx bx-info-circle mr-2"></i>
                {t("inflowInformation") || "Inflow Information"}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-md font-medium text-gray-900 dark:text-gray-100 border-b pb-2 border-gray-200 dark:border-gray-700">
                    {t("basicInformation") || "Basic Information"}
                  </h3>

                  {inflow.inflowNumber && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        {t("inflowNumber") || "Inflow Number"}
                      </label>
                      <p className="text-gray-900 dark:text-gray-100 mt-1">
                        {inflow.inflowNumber}
                      </p>
                    </div>
                  )}

                  {inflow.reference && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        {t("reference") || "Reference"}
                      </label>
                      <p className="text-gray-900 dark:text-gray-100 mt-1">
                        {inflow.reference}
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      {t("receivedDate") || "Received Date"}
                    </label>
                    <p className="text-gray-900 dark:text-gray-100 mt-1">
                      {formatDate(inflow.receivedDate)}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      {t("currency") || "Currency"}
                    </label>
                    <p className="text-gray-900 dark:text-gray-100 mt-1">
                      {currency}
                    </p>
                  </div>
                </div>

                {/* Branch & Supplier Information */}
                <div className="space-y-4">
                  <h3 className="text-md font-medium text-gray-900 dark:text-gray-100 border-b pb-2 border-gray-200 dark:border-gray-700">
                    {t("locationInformation") || "Location Information"}
                  </h3>

                  {inflow.branch && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        {t("branchName") || "Branch Name"}
                      </label>
                      <p className="text-gray-900 dark:text-gray-100 mt-1">
                        {inflow.branch.name}
                      </p>
                    </div>
                  )}

                  {inflow.supplier && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        {t("supplierName") || "Supplier Name"}
                      </label>
                      <p className="text-gray-900 dark:text-gray-100 mt-1">
                        {inflow.supplier.name}
                      </p>
                    </div>
                  )}

                  {inflow.receivedBy && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        {t("receivedBy") || "Received By"}
                      </label>
                      <p className="text-gray-900 dark:text-gray-100 mt-1">
                        {typeof inflow.receivedBy === "string"
                          ? inflow.receivedBy
                          : inflow.receivedBy?.name ||
                            inflow.receivedBy?.email ||
                            "-"}
                      </p>
                    </div>
                  )}
                </div>

                {/* Financial Information */}
                <div className="space-y-4">
                  <h3 className="text-md font-medium text-gray-900 dark:text-gray-100 border-b pb-2 border-gray-200 dark:border-gray-700">
                    {t("financialInformation") || "Financial Information"}
                  </h3>

                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      {t("totalAmount") || "Total Amount"}
                    </label>
                    <p className="font-display text-[1.35rem] font-semibold tabular-nums tracking-tight text-red-600 dark:text-red-400 mt-1">
                      {formatCurrency(totalAmount, inflow.currency)}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      {t("totalItems") || "Total Items"}
                    </label>
                    <p className="text-gray-900 dark:text-gray-100 mt-1">
                      {inflow.items?.length || 0}&nbsp;|&nbsp;
                      {inflow.items?.reduce(
                        (sum, item) => sum + Number(item.quantity || 0),
                        0,
                      ) || 0}
                    </p>
                  </div>
                </div>
              </div>

              {inflow.notes && (
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">
                    {t("notes") || "Notes"}
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 max-h-32 overflow-y-auto">
                    <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                      {inflow.notes}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Failed Uploads Section - Show only if there are failed uploads */}
            {inflow.failedUploads && inflow.failedUploads.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 max-w-4xl">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                  <div>
                    <div className="flex items-center space-x-2">
                      <i className="bx bx-error-circle text-red-500 text-lg"></i>
                      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {t("failedUploads") || "Failed Uploads"} (
                        {inflow.failedUploads.length})
                      </h2>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {t("failedUploadsDescription") ||
                        "Items that could not be processed during bulk upload"}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowFailedUploads(!showFailedUploads)}
                    className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30 transition-colors"
                  >
                    {showFailedUploads
                      ? t("hideDetails") || "Hide Details"
                      : t("showDetails") || "Show Details"}
                  </button>
                </div>

                {showFailedUploads && (
                  <>
                    <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                      <table className="w-full divide-y divide-gray-100 dark:divide-gray-800">
                        <thead className="bg-red-50 dark:bg-red-900/10 sticky top-0 z-10">
                          <tr>
                            <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-16">
                              {t("lineNumber") || "Line #"}
                            </th>
                            <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-48">
                              {t("itemName") || "Item Name"}
                            </th>
                            <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">
                              {t("quantity") || "Quantity"}
                            </th>
                            <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-20">
                              {t("uom") || "UOM"}
                            </th>
                            <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              {t("errors") || "Errors"}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
                          {inflow.failedUploads.map(
                            (failedUpload: BulkUploadLog, index: number) => {
                              const rowData = failedUpload.rowData || {};
                              return (
                                <tr
                                  key={failedUpload.id || index}
                                  className="hover:bg-red-50 dark:hover:bg-red-900/5"
                                >
                                  <td className="px-4 py-4 text-sm font-medium text-red-600 dark:text-red-400 align-top">
                                    {failedUpload.lineNumber || "-"}
                                  </td>
                                  <td className="px-4 py-4 align-top">
                                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">
                                      {rowData.item_name ||
                                        rowData.itemName ||
                                        "-"}
                                    </div>
                                    {rowData.description && (
                                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">
                                        {rowData.description}
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-4 py-4 text-sm text-gray-900 dark:text-gray-100 align-top">
                                    {rowData.quantity || "-"}
                                  </td>
                                  <td className="px-4 py-4 text-sm text-gray-900 dark:text-gray-100 align-top">
                                    {rowData.uom || "-"}
                                  </td>
                                  <td className="px-4 py-4 align-top">
                                    <div className="space-y-2 max-w-md">
                                      {failedUpload.errorMessages &&
                                      failedUpload.errorMessages.length > 0 ? (
                                        failedUpload.errorMessages.map(
                                          (
                                            error: string,
                                            errorIndex: number,
                                          ) => (
                                            <div
                                              key={errorIndex}
                                              className="flex items-start space-x-2"
                                            >
                                              <i className="bx bx-error-circle text-red-500 text-xs mt-0.5 flex-shrink-0"></i>
                                              <span className="text-sm text-red-600 dark:text-red-400 break-words leading-relaxed">
                                                {error}
                                              </span>
                                            </div>
                                          ),
                                        )
                                      ) : (
                                        <span className="text-sm text-red-600 dark:text-red-400">
                                          {t("unknownError") || "Unknown error"}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            },
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="p-4 bg-red-50 dark:bg-red-900/10 border-t border-red-200 dark:border-red-800">
                      <div className="flex items-center space-x-2 text-sm text-red-700 dark:text-red-300">
                        <i className="bx bx-info-circle"></i>
                        <span>
                          {t("failedUploadsNote") ||
                            "These items were skipped during the bulk upload process and need to be corrected and re-uploaded."}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Items Tab Content */}
        {activeTab === "items" && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                <i className="bx bx-package mr-2"></i>
                {t("items") || "Items"} ({inflow.items?.length || 0})
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {t("itemsInThisInflow") ||
                  "All items included in this inflow transaction"}
              </p>
            </div>

            {inflow.items && inflow.items.length > 0 ? (
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full divide-y divide-gray-100 dark:divide-gray-800">
                  <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t("item") || "Item"}
                      </th>
                      <th className="px-6 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t("supplier") || "Supplier"}
                      </th>
                      <th className="px-6 py-2.5 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t("quantity") || "Quantity"}
                      </th>
                      <th className="px-6 py-2.5 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t("uom") || "UOM"}
                      </th>
                      <th className="px-6 py-2.5 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t("unitCost") || "Unit Cost"}
                      </th>
                      <th className="px-6 py-2.5 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t("soldQuantity") || "Sold Qty"}
                      </th>
                      <th className="px-6 py-2.5 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t("remaining") || "Remaining"}
                      </th>
                      <th className="px-6 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t("total") || "Total"}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
                    {inflow.items.map(
                      (item: InflowItemWithDetails, index: number) => {
                        const itemTotal =
                          (item.quantity || 0) * (item.unitCost || 0);
                        const inventoryItem = item.inventoryItem;
                        const uom = item.uom;
                        const itemSupplier = item.supplier || null;

                        // Better item name fallback logic - prioritize stored names over relation names
                        const itemName =
                          item.inventoryItemName ||
                          item.itemName ||
                          item.name ||
                          item.originalItemName ||
                          inventoryItem?.name ||
                          t("inflows.itemNumber", "Item {{number}}", {
                            number: index + 1,
                          });
                        const unitName =
                          uom?.abbreviation ||
                          uom?.name ||
                          item.unitName ||
                          item.unit ||
                          item.originalUomName ||
                          inventoryItem?.baseUom?.abbreviation ||
                          inventoryItem?.baseUom?.name ||
                          t("inventory.notAvailable", "N/A");
                        const supplierName =
                          itemSupplier?.name ||
                          (item.supplierId
                            ? t("inflows.unknownSupplier", "Unknown Supplier")
                            : inflow.supplier?.name ||
                              t("inventory.notAvailable", "N/A"));

                        const salesData = item.salesData || {
                          totalSold: 0,
                          totalSalesAmount: 0,
                          totalCost: 0,
                          orderCount: 0,
                          remainingQuantity: Number(
                            item.baseQuantity || item.quantity || 0,
                          ),
                        };

                        const baseQuantity = Number(
                          item.baseQuantity || item.quantity || 0,
                        );
                        const soldQuantity = Number(salesData.totalSold || 0);
                        const remainingQuantity = Number(
                          salesData.remainingQuantity || baseQuantity,
                        );

                        return (
                          <tr
                            key={item.id || index}
                            className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition duration-200"
                          >
                            <td className="px-6 py-3 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10">
                                  <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                                    <i className="bx bx-cube text-blue-600 dark:text-blue-300"></i>
                                  </div>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {itemName}
                                  </div>
                                  {(inventoryItem?.category?.name ||
                                    inventoryItem?.subcategory?.name) && (
                                    <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                      {inventoryItem.category?.name}
                                      {inventoryItem.category?.name &&
                                        inventoryItem.subcategory?.name &&
                                        " > "}
                                      {inventoryItem.subcategory?.name}
                                    </div>
                                  )}
                                  {item.batchNumber && (
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                      {t("inflows.batch", "Batch")}:{" "}
                                      {item.batchNumber}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap">
                              <div className="text-sm text-gray-900 dark:text-gray-100">
                                {supplierName}
                              </div>
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-center">
                              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {Number(item.quantity || 0).toLocaleString()}
                              </span>
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-center">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                                {unitName}
                              </span>
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-center">
                              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {formatCurrency(
                                  item.unitCost || 0,
                                  inflow.currency,
                                )}
                              </span>
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-center">
                              <div className="text-sm text-orange-600 dark:text-orange-400 font-medium">
                                {soldQuantity.toLocaleString()}
                              </div>
                              {salesData.orderCount > 0 && (
                                <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                  {salesData.orderCount}{" "}
                                  {salesData.orderCount !== 1
                                    ? t("inflows.orders", "orders")
                                    : t("inflows.order", "order")}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-center">
                              <span
                                className={`text-sm font-medium ${
                                  remainingQuantity > 0
                                    ? "text-green-600 dark:text-green-400"
                                    : "text-red-600 dark:text-red-400"
                                }`}
                              >
                                {remainingQuantity.toLocaleString()}
                              </span>
                              {remainingQuantity === 0 && baseQuantity > 0 && (
                                <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                                  {t("inflows.fullySold", "Fully sold")}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-right">
                              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                {formatCurrency(
                                  itemTotal || item.totalCost || 0,
                                  inflow.currency,
                                )}
                              </span>
                              {item.expiryDate && (
                                <div className="text-xs text-red-500 dark:text-red-400 mt-1">
                                  {t("inflows.expires", "Expires")}:{" "}
                                  {formatDate(item.expiryDate)}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      },
                    )}
                  </tbody>
                  <tfoot className="bg-gray-50 dark:bg-gray-700 sticky bottom-0">
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-4 text-right text-sm font-semibold text-gray-900 dark:text-gray-100"
                      >
                        {t("grandTotal") || "Grand Total"}:
                      </td>
                      <td className="px-4 py-4 text-right text-sm font-bold text-red-600 dark:text-red-400">
                        {formatCurrency(
                          totalAmount || inflow.totalAmount || 0,
                          inflow.currency,
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center">
                <div className="text-gray-400 text-6xl mb-4">
                  <i className="bx bx-package"></i>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  {t("noItems") || "No Items"}
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  {t("noItemsInInflow") ||
                    "This inflow does not contain any items."}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale || "en", ["common"])),
    },
  };
};
