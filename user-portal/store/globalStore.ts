import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { api } from '@/lib/api';

// ==========================================
// TYPES & INTERFACES
// ==========================================

export interface Category {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Subcategory {
  id: string;
  name: string;
  description?: string;
  categoryId: string;
  createdAt: string;
  updatedAt: string;
  category?: Category;
}

export interface UOM {
  id: string;
  name: string;
  abbreviation: string;
  type: string;
  createdAt: string;
  updatedAt: string;
}

export interface Branch {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  categoryId?: string;
  subcategoryId?: string;
  baseUomId: string;
  minimumStock: number;
  maximumStock: number;
  currentStock: number;
  salePrice: number;
  barcode?: string;
  isTrackable: boolean;
  frontImage?: string;
  additionalImages?: string[];
  createdAt: string;
  updatedAt: string;
  // Relations
  category?: Category;
  subcategory?: Subcategory;
  baseUom?: UOM;
}

// ==========================================
// GLOBAL STATE STORE
// ==========================================

interface GlobalState {
  // Loading states
  isLoading: {
    categories: boolean;
    subcategories: boolean;
    uoms: boolean;
    branches: boolean;
    suppliers: boolean;
    inventoryItems: boolean;
  };

  // Data
  categories: Category[];
  subcategoriesMap: Record<string, Subcategory[]>; // categoryId -> subcategories
  uoms: UOM[];
  branches: Branch[];
  suppliers: Supplier[];
  inventoryItems: InventoryItem[];

  // Last updated timestamps for cache invalidation
  lastUpdated: {
    categories: number;
    subcategories: number;
    uoms: number;
    branches: number;
    suppliers: number;
    inventoryItems: number;
  };

  // Actions for categories
  loadCategories: (force?: boolean) => Promise<void>;
  addCategory: (category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Category>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  // Actions for subcategories
  loadSubcategories: (categoryId: string, force?: boolean) => Promise<void>;
  addSubcategory: (subcategory: Omit<Subcategory, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Subcategory>;
  updateSubcategory: (id: string, updates: Partial<Subcategory>) => Promise<void>;
  deleteSubcategory: (id: string) => Promise<void>;

  // Actions for UOMs
  loadUOMs: (force?: boolean) => Promise<void>;
  addUOM: (uom: Omit<UOM, 'id' | 'createdAt' | 'updatedAt'>) => Promise<UOM>;
  updateUOM: (id: string, updates: Partial<UOM>) => Promise<void>;
  deleteUOM: (id: string) => Promise<void>;

  // Actions for branches
  loadBranches: (force?: boolean) => Promise<void>;
  addBranch: (branch: Omit<Branch, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Branch>;
  updateBranch: (id: string, updates: Partial<Branch>) => Promise<void>;
  deleteBranch: (id: string) => Promise<void>;

  // Actions for suppliers
  loadSuppliers: (force?: boolean) => Promise<void>;
  addSupplier: (supplier: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Supplier>;
  updateSupplier: (id: string, updates: Partial<Supplier>) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;

  // Actions for inventory items
  loadInventoryItems: (force?: boolean) => Promise<void>;
  addInventoryItem: (item: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<InventoryItem>;
  updateInventoryItem: (id: string, updates: Partial<InventoryItem>) => Promise<void>;
  deleteInventoryItem: (id: string) => Promise<void>;

  // Utility actions
  invalidateCache: (type?: keyof GlobalState['lastUpdated']) => void;
  reset: () => void;
}

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

export const useGlobalStore = create<GlobalState>()(
  devtools(
    (set, get) => ({
      // Initial loading states
      isLoading: {
        categories: false,
        subcategories: false,
        uoms: false,
        branches: false,
        suppliers: false,
        inventoryItems: false,
      },

      // Initial data
      categories: [],
      subcategoriesMap: {},
      uoms: [],
      branches: [],
      suppliers: [],
      inventoryItems: [],

      // Initial timestamps
      lastUpdated: {
        categories: 0,
        subcategories: 0,
        uoms: 0,
        branches: 0,
        suppliers: 0,
        inventoryItems: 0,
      },

      // ==========================================
      // CATEGORY ACTIONS
      // ==========================================

      loadCategories: async (force = false) => {
        const state = get();
        const now = Date.now();
        
        // Skip if recently loaded and not forced
        if (!force && state.categories.length > 0 && (now - state.lastUpdated.categories) < CACHE_DURATION) {
          return;
        }

        // Skip if already loading
        if (state.isLoading.categories) {
          return;
        }

        set((state) => ({
          isLoading: { ...state.isLoading, categories: true }
        }));

        try {
          const response = await api.get<{ success: boolean; data: Category[] }>('/ims/categories');
          if (response.success) {
            set((state) => ({
              categories: response.data,
              lastUpdated: { ...state.lastUpdated, categories: now },
              isLoading: { ...state.isLoading, categories: false }
            }));
          }
        } catch (error) {
          console.error('Failed to load categories:', error);
          set((state) => ({
            isLoading: { ...state.isLoading, categories: false }
          }));
        }
      },

      addCategory: async (categoryData) => {
        try {
          const response = await api.post<{ success: boolean; data: Category }>('/ims/categories', categoryData);
          if (response.success) {
            set((state) => ({
              categories: [...state.categories, response.data],
              lastUpdated: { ...state.lastUpdated, categories: Date.now() }
            }));
            return response.data;
          }
          throw new Error('Failed to create category');
        } catch (error) {
          console.error('Failed to add category:', error);
          throw error;
        }
      },

      updateCategory: async (id, updates) => {
        try {
          const response = await api.patch<{ success: boolean; data: Category }>(`/ims/categories/${id}`, updates);
          if (response.success) {
            set((state) => ({
              categories: state.categories.map(cat => cat.id === id ? { ...cat, ...updates } : cat),
              lastUpdated: { ...state.lastUpdated, categories: Date.now() }
            }));
          }
        } catch (error) {
          console.error('Failed to update category:', error);
          throw error;
        }
      },

      deleteCategory: async (id) => {
        try {
          await api.delete(`/ims/categories/${id}`);
          set((state) => ({
            categories: state.categories.filter(cat => cat.id !== id),
            // Also remove subcategories for this category
            subcategoriesMap: Object.fromEntries(
              Object.entries(state.subcategoriesMap).filter(([categoryId]) => categoryId !== id)
            ),
            lastUpdated: { 
              ...state.lastUpdated, 
              categories: Date.now(),
              subcategories: Date.now()
            }
          }));
        } catch (error) {
          console.error('Failed to delete category:', error);
          throw error;
        }
      },

      // ==========================================
      // SUBCATEGORY ACTIONS
      // ==========================================

      loadSubcategories: async (categoryId, force = false) => {
        const state = get();
        const now = Date.now();
        
        // Skip if recently loaded and not forced
        if (!force && state.subcategoriesMap[categoryId] && (now - state.lastUpdated.subcategories) < CACHE_DURATION) {
          return;
        }

        // Skip if already loading
        if (state.isLoading.subcategories) {
          return;
        }

        set((state) => ({
          isLoading: { ...state.isLoading, subcategories: true }
        }));

        try {
          const response = await api.get<{ success: boolean; data: Subcategory[] }>(`/ims/categories/${categoryId}/subcategories`);
          if (response.success) {
            set((state) => ({
              subcategoriesMap: {
                ...state.subcategoriesMap,
                [categoryId]: response.data
              },
              lastUpdated: { ...state.lastUpdated, subcategories: now },
              isLoading: { ...state.isLoading, subcategories: false }
            }));
          }
        } catch (error) {
          console.error('Failed to load subcategories:', error);
          set((state) => ({
            isLoading: { ...state.isLoading, subcategories: false }
          }));
        }
      },

      addSubcategory: async (subcategoryData) => {
        try {
          const response = await api.post<{ success: boolean; data: Subcategory }>('/ims/subcategories', subcategoryData);
          if (response.success) {
            const { categoryId } = subcategoryData;
            set((state) => ({
              subcategoriesMap: {
                ...state.subcategoriesMap,
                [categoryId]: [...(state.subcategoriesMap[categoryId] || []), response.data]
              },
              lastUpdated: { ...state.lastUpdated, subcategories: Date.now() }
            }));
            return response.data;
          }
          throw new Error('Failed to create subcategory');
        } catch (error) {
          console.error('Failed to add subcategory:', error);
          throw error;
        }
      },

      updateSubcategory: async (id, updates) => {
        try {
          const response = await api.patch<{ success: boolean; data: Subcategory }>(`/ims/subcategories/${id}`, updates);
          if (response.success) {
            set((state) => {
              const newSubcategoriesMap = { ...state.subcategoriesMap };
              Object.keys(newSubcategoriesMap).forEach(categoryId => {
                newSubcategoriesMap[categoryId] = newSubcategoriesMap[categoryId].map(sub => 
                  sub.id === id ? { ...sub, ...updates } : sub
                );
              });
              return {
                subcategoriesMap: newSubcategoriesMap,
                lastUpdated: { ...state.lastUpdated, subcategories: Date.now() }
              };
            });
          }
        } catch (error) {
          console.error('Failed to update subcategory:', error);
          throw error;
        }
      },

      deleteSubcategory: async (id) => {
        try {
          await api.delete(`/ims/subcategories/${id}`);
          set((state) => {
            const newSubcategoriesMap = { ...state.subcategoriesMap };
            Object.keys(newSubcategoriesMap).forEach(categoryId => {
              newSubcategoriesMap[categoryId] = newSubcategoriesMap[categoryId].filter(sub => sub.id !== id);
            });
            return {
              subcategoriesMap: newSubcategoriesMap,
              lastUpdated: { ...state.lastUpdated, subcategories: Date.now() }
            };
          });
        } catch (error) {
          console.error('Failed to delete subcategory:', error);
          throw error;
        }
      },

      // ==========================================
      // UOM ACTIONS
      // ==========================================

      loadUOMs: async (force = false) => {
        const state = get();
        const now = Date.now();
        
        if (!force && state.uoms.length > 0 && (now - state.lastUpdated.uoms) < CACHE_DURATION) {
          return;
        }

        if (state.isLoading.uoms) {
          return;
        }

        set((state) => ({
          isLoading: { ...state.isLoading, uoms: true }
        }));

        try {
          const response = await api.get<{ success: boolean; data: UOM[] }>('/ims/uoms');
          if (response.success) {
            set((state) => ({
              uoms: response.data,
              lastUpdated: { ...state.lastUpdated, uoms: now },
              isLoading: { ...state.isLoading, uoms: false }
            }));
          }
        } catch (error) {
          console.error('Failed to load UOMs:', error);
          set((state) => ({
            isLoading: { ...state.isLoading, uoms: false }
          }));
        }
      },

      addUOM: async (uomData) => {
        try {
          const response = await api.post<{ success: boolean; data: UOM }>('/ims/uoms', uomData);
          if (response.success) {
            set((state) => ({
              uoms: [...state.uoms, response.data],
              lastUpdated: { ...state.lastUpdated, uoms: Date.now() }
            }));
            return response.data;
          }
          throw new Error('Failed to create UOM');
        } catch (error) {
          console.error('Failed to add UOM:', error);
          throw error;
        }
      },

      updateUOM: async (id, updates) => {
        try {
          const response = await api.patch<{ success: boolean; data: UOM }>(`/ims/uoms/${id}`, updates);
          if (response.success) {
            set((state) => ({
              uoms: state.uoms.map(uom => uom.id === id ? { ...uom, ...updates } : uom),
              lastUpdated: { ...state.lastUpdated, uoms: Date.now() }
            }));
          }
        } catch (error) {
          console.error('Failed to update UOM:', error);
          throw error;
        }
      },

      deleteUOM: async (id) => {
        try {
          await api.delete(`/ims/uoms/${id}`);
          set((state) => ({
            uoms: state.uoms.filter(uom => uom.id !== id),
            lastUpdated: { ...state.lastUpdated, uoms: Date.now() }
          }));
        } catch (error) {
          console.error('Failed to delete UOM:', error);
          throw error;
        }
      },

      // ==========================================
      // BRANCH ACTIONS
      // ==========================================

      loadBranches: async (force = false) => {
        const state = get();
        const now = Date.now();
        
        if (!force && state.branches.length > 0 && (now - state.lastUpdated.branches) < CACHE_DURATION) {
          return;
        }

        if (state.isLoading.branches) {
          return;
        }

        set((state) => ({
          isLoading: { ...state.isLoading, branches: true }
        }));

        try {
          const response = await api.get<{ success: boolean; data: Branch[] }>('/settings/branches');
          if (response.success) {
            set((state) => ({
              branches: response.data,
              lastUpdated: { ...state.lastUpdated, branches: now },
              isLoading: { ...state.isLoading, branches: false }
            }));
          }
        } catch (error) {
          console.error('Failed to load branches:', error);
          set((state) => ({
            isLoading: { ...state.isLoading, branches: false }
          }));
        }
      },

      addBranch: async (branchData) => {
        try {
          const response = await api.post<{ success: boolean; data: Branch }>('/settings/branches', branchData);
          if (response.success) {
            set((state) => ({
              branches: [...state.branches, response.data],
              lastUpdated: { ...state.lastUpdated, branches: Date.now() }
            }));
            return response.data;
          }
          throw new Error('Failed to create branch');
        } catch (error) {
          console.error('Failed to add branch:', error);
          throw error;
        }
      },

      updateBranch: async (id, updates) => {
        try {
          const response = await api.patch<{ success: boolean; data: Branch }>(`/settings/branches/${id}`, updates);
          if (response.success) {
            set((state) => ({
              branches: state.branches.map(branch => branch.id === id ? { ...branch, ...updates } : branch),
              lastUpdated: { ...state.lastUpdated, branches: Date.now() }
            }));
          }
        } catch (error) {
          console.error('Failed to update branch:', error);
          throw error;
        }
      },

      deleteBranch: async (id) => {
        try {
          await api.delete(`/settings/branches/${id}`);
          set((state) => ({
            branches: state.branches.filter(branch => branch.id !== id),
            lastUpdated: { ...state.lastUpdated, branches: Date.now() }
          }));
        } catch (error) {
          console.error('Failed to delete branch:', error);
          throw error;
        }
      },

      // ==========================================
      // SUPPLIER ACTIONS
      // ==========================================

      loadSuppliers: async (force = false) => {
        const state = get();
        const now = Date.now();
        
        if (!force && state.suppliers.length > 0 && (now - state.lastUpdated.suppliers) < CACHE_DURATION) {
          return;
        }

        if (state.isLoading.suppliers) {
          return;
        }

        set((state) => ({
          isLoading: { ...state.isLoading, suppliers: true }
        }));

        try {
          const response = await api.get<{ success: boolean; data: Supplier[] }>('/rms/suppliers');
          if (response.success) {
            set((state) => ({
              suppliers: response.data,
              lastUpdated: { ...state.lastUpdated, suppliers: now },
              isLoading: { ...state.isLoading, suppliers: false }
            }));
          }
        } catch (error) {
          console.error('Failed to load suppliers:', error);
          set((state) => ({
            isLoading: { ...state.isLoading, suppliers: false }
          }));
        }
      },

      addSupplier: async (supplierData) => {
        try {
          const response = await api.post<{ success: boolean; data: Supplier }>('/rms/suppliers', supplierData);
          if (response.success) {
            set((state) => ({
              suppliers: [...state.suppliers, response.data],
              lastUpdated: { ...state.lastUpdated, suppliers: Date.now() }
            }));
            return response.data;
          }
          throw new Error('Failed to create supplier');
        } catch (error) {
          console.error('Failed to add supplier:', error);
          throw error;
        }
      },

      updateSupplier: async (id, updates) => {
        try {
          const response = await api.patch<{ success: boolean; data: Supplier }>(`/rms/suppliers/${id}`, updates);
          if (response.success) {
            set((state) => ({
              suppliers: state.suppliers.map(supplier => supplier.id === id ? { ...supplier, ...updates } : supplier),
              lastUpdated: { ...state.lastUpdated, suppliers: Date.now() }
            }));
          }
        } catch (error) {
          console.error('Failed to update supplier:', error);
          throw error;
        }
      },

      deleteSupplier: async (id) => {
        try {
          await api.delete(`/rms/suppliers/${id}`);
          set((state) => ({
            suppliers: state.suppliers.filter(supplier => supplier.id !== id),
            lastUpdated: { ...state.lastUpdated, suppliers: Date.now() }
          }));
        } catch (error) {
          console.error('Failed to delete supplier:', error);
          throw error;
        }
      },

      // ==========================================
      // INVENTORY ITEM ACTIONS
      // ==========================================

      loadInventoryItems: async (force = false) => {
        const state = get();
        const now = Date.now();
        
        if (!force && state.inventoryItems.length > 0 && (now - state.lastUpdated.inventoryItems) < CACHE_DURATION) {
          return;
        }

        if (state.isLoading.inventoryItems) {
          return;
        }

        set((state) => ({
          isLoading: { ...state.isLoading, inventoryItems: true }
        }));

        try {
          const response = await api.get<{ success: boolean; data: InventoryItem[] }>('/ims/inventory');
          if (response.success) {
            set((state) => ({
              inventoryItems: response.data,
              lastUpdated: { ...state.lastUpdated, inventoryItems: now },
              isLoading: { ...state.isLoading, inventoryItems: false }
            }));
          }
        } catch (error) {
          console.error('Failed to load inventory items:', error);
          set((state) => ({
            isLoading: { ...state.isLoading, inventoryItems: false }
          }));
        }
      },

      addInventoryItem: async (itemData) => {
        try {
          const response = await api.post<{ success: boolean; data: InventoryItem }>('/ims/inventory', itemData);
          if (response.success) {
            set((state) => ({
              inventoryItems: [...state.inventoryItems, response.data],
              lastUpdated: { ...state.lastUpdated, inventoryItems: Date.now() }
            }));
            return response.data;
          }
          throw new Error('Failed to create inventory item');
        } catch (error) {
          console.error('Failed to add inventory item:', error);
          throw error;
        }
      },

      updateInventoryItem: async (id, updates) => {
        try {
          const response = await api.patch<{ success: boolean; data: InventoryItem }>(`/ims/inventory/${id}`, updates);
          if (response.success) {
            set((state) => ({
              inventoryItems: state.inventoryItems.map(item => item.id === id ? { ...item, ...updates } : item),
              lastUpdated: { ...state.lastUpdated, inventoryItems: Date.now() }
            }));
          }
        } catch (error) {
          console.error('Failed to update inventory item:', error);
          throw error;
        }
      },

      deleteInventoryItem: async (id) => {
        try {
          await api.delete(`/ims/inventory/${id}`);
          set((state) => ({
            inventoryItems: state.inventoryItems.filter(item => item.id !== id),
            lastUpdated: { ...state.lastUpdated, inventoryItems: Date.now() }
          }));
        } catch (error) {
          console.error('Failed to delete inventory item:', error);
          throw error;
        }
      },

      // ==========================================
      // UTILITY ACTIONS
      // ==========================================

      invalidateCache: (type) => {
        if (type) {
          set((state) => ({
            lastUpdated: { ...state.lastUpdated, [type]: 0 }
          }));
        } else {
          set((state) => ({
            lastUpdated: {
              categories: 0,
              subcategories: 0,
              uoms: 0,
              branches: 0,
              suppliers: 0,
              inventoryItems: 0,
            }
          }));
        }
      },

      reset: () => {
        set({
          isLoading: {
            categories: false,
            subcategories: false,
            uoms: false,
            branches: false,
            suppliers: false,
            inventoryItems: false,
          },
          categories: [],
          subcategoriesMap: {},
          uoms: [],
          branches: [],
          suppliers: [],
          inventoryItems: [],
          lastUpdated: {
            categories: 0,
            subcategories: 0,
            uoms: 0,
            branches: 0,
            suppliers: 0,
            inventoryItems: 0,
          },
        });
      },
    }),
    {
      name: 'global-store',
    }
  )
);

// ==========================================
// HELPER HOOKS
// ==========================================

// Hook for categories
export const useCategories = () => {
  const { categories, isLoading, loadCategories, addCategory, updateCategory, deleteCategory } = useGlobalStore();
  
  return {
    categories,
    isLoading: isLoading.categories,
    loadCategories,
    addCategory,
    updateCategory,
    deleteCategory,
  };
};

// Hook for subcategories
export const useSubcategories = (categoryId?: string) => {
  const { subcategoriesMap, isLoading, loadSubcategories, addSubcategory, updateSubcategory, deleteSubcategory } = useGlobalStore();
  
  const subcategories = categoryId ? (subcategoriesMap[categoryId] || []) : [];
  
  return {
    subcategories,
    isLoading: isLoading.subcategories,
    loadSubcategories: (cId: string, force?: boolean) => loadSubcategories(cId, force),
    addSubcategory,
    updateSubcategory,
    deleteSubcategory,
  };
};

// Hook for UOMs
export const useUOMs = () => {
  const { uoms, isLoading, loadUOMs, addUOM, updateUOM, deleteUOM } = useGlobalStore();
  
  return {
    uoms,
    isLoading: isLoading.uoms,
    loadUOMs,
    addUOM,
    updateUOM,
    deleteUOM,
  };
};

// Hook for branches
export const useBranches = () => {
  const { branches, isLoading, loadBranches, addBranch, updateBranch, deleteBranch } = useGlobalStore();
  
  return {
    branches,
    isLoading: isLoading.branches,
    loadBranches,
    addBranch,
    updateBranch,
    deleteBranch,
  };
};

// Hook for suppliers
export const useSuppliers = () => {
  const { suppliers, isLoading, loadSuppliers, addSupplier, updateSupplier, deleteSupplier } = useGlobalStore();
  
  return {
    suppliers,
    isLoading: isLoading.suppliers,
    loadSuppliers,
    addSupplier,
    updateSupplier,
    deleteSupplier,
  };
};

// Hook for inventory items
export const useInventoryItems = () => {
  const { inventoryItems, isLoading, loadInventoryItems, addInventoryItem, updateInventoryItem, deleteInventoryItem } = useGlobalStore();
  
  return {
    inventoryItems,
    isLoading: isLoading.inventoryItems,
    loadInventoryItems,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
  };
};

// ==========================================
// TENANT CONTEXT (business type + plan modules)
// ==========================================

/**
 * Product editions. The five current editions are
 * hospitality | accounts | retail | hr | warehouse; the legacy values
 * (general | restaurant | services) still arrive from older tenants and are
 * handled everywhere via fallbacks.
 */
export type BusinessType =
  | 'general'
  | 'restaurant'
  | 'retail'
  | 'services'
  | 'hospitality'
  | 'accounts'
  | 'hr'
  | 'warehouse'
  | 'ecommerce';

interface TenantState {
  businessType: BusinessType | null;
  businessName: string | null;
  /** Modules enabled by the subscription plan. null = unknown (fetch failed) -> never hide anything. */
  planModules: string[] | null;
  /** Plan code from the subscription, e.g. FREE / STARTER. null = unknown. */
  planCode: string | null;
  /** Subscription status, e.g. TRIALING / ACTIVE. null = unknown. */
  subscriptionStatus: string | null;
  /**
   * Effective apps (enabledApps ∩ plan) from GET /settings — the apps-model
   * source of truth. null = old backend / fetch failed -> callers fall back
   * to the legacy businessType behavior.
   */
  effectiveApps: string[] | null;
  tenantLoaded: boolean;
  /**
   * Active workspace: 'all' or a sidebar group id (restaurant, menu-studio,
   * inventory, sales, money, accounting, hr). Filters the sidebar to
   * Home + that group + Settings. Persisted in localStorage.
   */
  activeWorkspace: string;
  /** Effective (tenant-visible) sidebar group ids, published by AppSidebar. */
  availableGroups: string[];
  setActiveWorkspace: (ws: string) => void;
  setAvailableGroups: (ids: string[]) => void;
  /** Read the persisted workspace once on mount. */
  hydrateWorkspace: () => void;
  /** Fetched once per session; pass force=true to refetch (e.g. after toggling apps). */
  fetchTenantContext: (force?: boolean) => Promise<void>;
}

const WORKSPACE_KEY = 'kuza.activeWorkspace';

/**
 * Fetched once per session (sidebar + dashboard share it). Progressive
 * disclosure: the sidebar/dashboard render only the modules relevant to this
 * tenant. Falls back to businessType defaults if /billing/subscription fails.
 */
export const useTenantStore = create<TenantState>()(
  devtools((set, get) => ({
    businessType: null,
    businessName: null,
    planModules: null,
    planCode: null,
    subscriptionStatus: null,
    effectiveApps: null,
    tenantLoaded: false,
    activeWorkspace: 'all',
    availableGroups: [],

    setActiveWorkspace: (ws: string) => {
      set({ activeWorkspace: ws });
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(WORKSPACE_KEY, ws);
        } catch {
          /* storage unavailable — session-only */
        }
      }
    },

    setAvailableGroups: (ids: string[]) => {
      const prev = get().availableGroups;
      if (prev.length === ids.length && prev.every((v, i) => v === ids[i])) return;
      set({ availableGroups: ids });
    },

    hydrateWorkspace: () => {
      if (typeof window === 'undefined') return;
      try {
        const stored = localStorage.getItem(WORKSPACE_KEY);
        if (stored && stored !== get().activeWorkspace) {
          set({ activeWorkspace: stored });
        }
      } catch {
        /* ignore */
      }
    },

    fetchTenantContext: async (force = false) => {
      if (get().tenantLoaded && !force) return;
      set({ tenantLoaded: true });
      const [settingsRes, subRes] = await Promise.allSettled([
        api.get<{
          success: boolean;
          data: { name?: string; businessType?: BusinessType; effectiveApps?: string[] };
        }>('/settings'),
        api.get<{
          success: boolean;
          data: { status?: string; plan?: { code?: string; limits?: { modules?: string[] } } };
        }>('/billing/subscription'),
      ]);

      if (settingsRes.status === 'fulfilled' && settingsRes.value.success) {
        const effectiveApps = settingsRes.value.data?.effectiveApps;
        set({
          businessType: settingsRes.value.data?.businessType ?? 'general',
          businessName: settingsRes.value.data?.name ?? null,
          // Old backend (no effectiveApps in /settings) -> stays null -> legacy fallback.
          effectiveApps: Array.isArray(effectiveApps) ? effectiveApps.map(String) : null,
        });
      }
      if (subRes.status === 'fulfilled' && subRes.value.success) {
        const modules = subRes.value.data?.plan?.limits?.modules;
        if (Array.isArray(modules) && modules.length > 0) {
          set({ planModules: modules.map((m) => String(m).toLowerCase()) });
        }
        set({
          planCode: subRes.value.data?.plan?.code ? String(subRes.value.data.plan.code).toUpperCase() : null,
          subscriptionStatus: subRes.value.data?.status ? String(subRes.value.data.status).toUpperCase() : null,
        });
      }
      // On failure planModules stays null -> businessType default set, never an empty sidebar.
    },
  })),
);
