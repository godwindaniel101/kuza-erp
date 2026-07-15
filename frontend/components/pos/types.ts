/**
 * Shared types for the Point-of-Sale surface (`/pos`).
 *
 * These mirror the exact shapes returned by the existing backend endpoints so
 * the POS reuses the SAME API contract as the legacy order-create flow:
 *   - GET  /ims/inventory?forOrders=true&branchId=…  → PosProduct[]
 *   - GET  /settings/branches                         → PosBranch[]
 *   - GET  /rms/tables                                → PosTable[]
 *   - POST /rms/orders                                → { items:[{inventoryItemId,uomId,quantity}], … }
 */

export interface PosUom {
  id: string;
  name: string;
  abbreviation?: string;
}

/** Item as returned by inventory `findForOrders` (see inventory.service.ts). */
export interface PosProduct {
  id: string;
  name: string;
  category: string | null;
  subcategory: string | null;
  /** Sale price of ONE base unit. */
  price: number;
  /** Current stock, expressed in BASE units. */
  stock: number;
  /** Base unit display name. */
  unit: string;
  defaultUomId: string;
  baseUomId: string;
  uoms: PosUom[];
  /** uomId → how many base units one of this UOM equals. */
  uomToBase: Record<string, number>;
  /** uomId → price for one of this UOM. */
  uomPrices: Record<string, number>;
}

export interface PosBranch {
  id: string;
  name: string;
  isDefault?: boolean;
}

export interface PosTable {
  id: string;
  name?: string;
  number?: string | number;
}

/** A line in the running ticket. */
export interface CartLine {
  /** Stable key = the product id (one line per product, quantity aggregates). */
  productId: string;
  name: string;
  category: string | null;
  /** Currently selected unit of measure for this line. */
  uomId: string;
  uoms: PosUom[];
  uomToBase: Record<string, number>;
  uomPrices: Record<string, number>;
  /** Price of one unit at the selected UOM. */
  unitPrice: number;
  quantity: number;
  /** Stock available, in BASE units. */
  stockBase: number;
}

export type OrderType = 'dine_in' | 'takeaway' | 'delivery';

export interface OrderMeta {
  type: OrderType;
  tableId: string;
  customerName: string;
  customerPhone: string;
  notes: string;
  applyVat: boolean;
  vatPercentage: number;
}
