/**
 * Vertical terminology layer (docs/DESIGN.md §7).
 *
 * Same shared core, vertical-appropriate words. `term(businessType, key)`
 * resolves a businessType-specific label with graceful fallback to the
 * neutral term — a future vertical (e.g. 'warehouse') slots in by adding one
 * entry to OVERRIDES; nothing else changes.
 *
 * Usage with i18n: term() feeds the FALLBACK of existing t()/tr() calls, so
 * real translations still win:  tr('invetoryItems', term(bt, 'itemsNav'))
 */
import type { BusinessType } from '@/store/globalStore';

export type TermKey =
  | 'items' // page title for the catalog
  | 'itemsNav' // short sidebar label
  | 'itemSingular'
  | 'addItem' // primary CTA on the catalog list
  | 'itemsDescription' // one-line description under the catalog title
  | 'goodsIn' // receiving flow
  | 'recordGoodsIn' // primary CTA for receiving
  | 'goodsInDescription' // one-line description under the receiving title
  | 'pos' // the till surface (sidebar label + POS page title)
  | 'posSection' // sidebar SECTION label for the pos/orders group
  | 'inventorySection' // sidebar SECTION label for the items group
  | 'customers'
  | 'suppliers'
  | 'emptyItems'; // empty-state copy on the catalog list

const NEUTRAL: Record<TermKey, string> = {
  items: 'Items',
  itemsNav: 'Items',
  itemSingular: 'item',
  addItem: 'Add item',
  itemsDescription: 'Everything you sell, priced and tracked',
  goodsIn: 'Goods In',
  recordGoodsIn: 'Record goods in',
  goodsInDescription: 'What came in, from whom, and at what cost',
  pos: 'Shop',
  posSection: 'Point of Sale',
  inventorySection: 'Inventory',
  customers: 'Customers',
  suppliers: 'Suppliers',
  emptyItems: 'No items yet. Add your first item to get started.',
};

/** Hospitality vocabulary — shared by 'hospitality' and its legacy alias 'restaurant'. */
const HOSPITALITY_TERMS: Partial<Record<TermKey, string>> = {
  // Inventory = stock / ingredients, NOT dishes. Dishes are the sellable menu
  // items and live in the Menu module (/rms/menus) — keep the two distinct so
  // the Stock Items page never labels a row a "dish".
  items: 'Stock Items',
  itemsNav: 'Stock Items',
  itemSingular: 'stock item',
  addItem: 'Add stock item',
  itemsDescription: 'Ingredients and supplies, priced and tracked',
  goodsIn: 'Receive Stock',
  recordGoodsIn: 'Receive stock',
  goodsInDescription: 'Stock received, from whom, and at what cost',
  pos: 'New Sale',
  posSection: 'Restaurant',
  emptyItems: 'No stock items yet. Add your first ingredient or supply to get started.',
};

/** Keyed by string (not BusinessType) so future verticals slot in freely. */
const OVERRIDES: Record<string, Partial<Record<TermKey, string>>> = {
  hospitality: HOSPITALITY_TERMS,
  restaurant: HOSPITALITY_TERMS,
  retail: {
    items: 'Products',
    itemsNav: 'Products',
    itemSingular: 'product',
    addItem: 'Add product',
    itemsDescription: 'Everything you sell, priced and tracked',
    goodsIn: 'Purchases',
    recordGoodsIn: 'Record purchase',
    goodsInDescription: 'Purchases received, from whom, and at what cost',
    pos: 'Shop',
    posSection: 'Shop',
    emptyItems: 'No products yet. Add your first product to get started.',
  },
  services: {
    items: 'Services & Items',
    itemsNav: 'Services & Items',
    itemSingular: 'service',
    addItem: 'Add service or item',
    goodsIn: 'Purchases',
    recordGoodsIn: 'Record purchase',
  },
  // Warehouse MS edition — row/rack/bin locations, receiving-first
  warehouse: {
    items: 'Stock',
    itemsNav: 'Stock',
    addItem: 'Add stock item',
    itemsDescription: 'Every SKU, its location and its level',
    goodsIn: 'Receiving',
    recordGoodsIn: 'Record receiving',
    goodsInDescription: 'Goods received into the warehouse',
    inventorySection: 'Warehouse',
    emptyItems: 'No stock yet. Add your first stock item to get started.',
  },
  // 'accounts' and 'hr' editions use the neutral vocabulary.
};

export function term(businessType: BusinessType | string | null | undefined, key: TermKey): string {
  const bt = businessType ?? 'general';
  return OVERRIDES[bt]?.[key] ?? NEUTRAL[key];
}
