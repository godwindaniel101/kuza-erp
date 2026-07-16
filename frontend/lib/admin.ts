/**
 * Platform back-office (/admin) client — super-admin only.
 *
 * These wrap the server-side, super-admin-guarded endpoints under /admin. The
 * guard here is UX only: the frontend flag (`user.isSuperAdmin`) decides whether
 * to *show* the surface, but every /admin endpoint is enforced server-side. All
 * responses follow `{ success, data }`; readers below are deliberately defensive
 * about shape so a mildly different payload doesn't blank the page.
 */
import { api } from './api';

export interface AdminPlan {
  code: string;
  name: string;
  monthlyPriceUsd?: number;
}

export interface AdminPlanRef {
  code?: string;
  name?: string;
}

/** A tenant row/summary as returned by GET /admin/tenants. */
export interface AdminTenant {
  id: string;
  name: string;
  slug?: string;
  businessType?: string | null;
  /** Plan may arrive as an object or as a flat code — read via `tenantPlan()`. */
  plan?: AdminPlanRef | null;
  planCode?: string | null;
  planName?: string | null;
  /** Status may arrive as a string or via isActive — read via `tenantStatus()`. */
  status?: string | null;
  isActive?: boolean;
  /** App count may arrive directly or be derivable from enabledApps/effective. */
  appsCount?: number;
  enabledApps?: string[] | null;
  effective?: string[] | null;
  effectiveApps?: string[] | null;
  createdAt?: string;
}

/** Per-app state for a tenant (GET /admin/tenants/:id). */
export interface AdminAppState {
  key: string;
  name?: string;
  description?: string;
  enabled: boolean;
  /** Whether the app is actually active for the tenant (plan + toggle). */
  effective?: boolean;
  allowedByPlan?: boolean;
  dependencies?: string[];
  dependents?: string[];
}

/** A pending access request (GET /admin/access-requests, or nested in detail). */
export interface AdminAccessRequest {
  id: string;
  appKey: string;
  status?: string;
  note?: string | null;
  createdAt?: string;
  tenantId?: string;
  tenantName?: string;
  tenant?: { id?: string; name?: string } | null;
  requesterName?: string;
  requesterEmail?: string;
  requester?: { name?: string; email?: string } | null;
  user?: { name?: string; email?: string } | null;
}

/** Full tenant detail (GET /admin/tenants/:id). */
export interface AdminTenantDetail extends AdminTenant {
  apps?: AdminAppState[];
  accessRequests?: AdminAccessRequest[];
}

interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
}

/** Pull `.data` out of a `{ success, data }` envelope, tolerating raw payloads. */
function unwrap<T>(res: ApiEnvelope<T> | T | undefined): T | undefined {
  if (res && typeof res === 'object' && 'data' in (res as ApiEnvelope<T>)) {
    return (res as ApiEnvelope<T>).data;
  }
  return res as T | undefined;
}

/** Coerce an unknown list-ish payload into an array (handles {items}/{requests}/{tenants}). */
function asArray<T>(payload: any, ...keys: string[]): T[] {
  if (Array.isArray(payload)) return payload as T[];
  for (const k of keys) {
    if (Array.isArray(payload?.[k])) return payload[k] as T[];
  }
  return [];
}

/** Human plan label for a tenant regardless of payload shape. */
export function tenantPlan(t: AdminTenant): { code: string | null; name: string | null } {
  const code = t.plan?.code ?? t.planCode ?? null;
  const name = t.plan?.name ?? t.planName ?? code ?? null;
  return { code, name };
}

/** Normalised status string ('active' | 'inactive' | provided string). */
export function tenantStatus(t: AdminTenant): string {
  if (typeof t.status === 'string' && t.status) return t.status;
  if (typeof t.isActive === 'boolean') return t.isActive ? 'active' : 'inactive';
  return 'active';
}

/** Number of enabled apps for a tenant, best-effort across shapes. */
export function tenantAppsCount(t: AdminTenant): number {
  if (typeof t.appsCount === 'number') return t.appsCount;
  const list = t.effective ?? t.effectiveApps ?? t.enabledApps;
  return Array.isArray(list) ? list.length : 0;
}

export const adminApi = {
  async listTenants(): Promise<AdminTenant[]> {
    const res = await api.get<ApiEnvelope<any>>('/admin/tenants');
    return asArray<AdminTenant>(unwrap(res), 'tenants', 'items');
  },

  async getTenant(id: string): Promise<AdminTenantDetail | undefined> {
    const res = await api.get<ApiEnvelope<AdminTenantDetail>>(`/admin/tenants/${id}`);
    return unwrap<AdminTenantDetail>(res);
  },

  async setApp(id: string, appKey: string, enabled: boolean): Promise<AdminTenantDetail | undefined> {
    const res = await api.post<ApiEnvelope<AdminTenantDetail>>(`/admin/tenants/${id}/apps`, {
      appKey,
      enabled,
    });
    return unwrap<AdminTenantDetail>(res);
  },

  async changePlan(id: string, planCode: string): Promise<AdminTenantDetail | undefined> {
    const res = await api.post<ApiEnvelope<AdminTenantDetail>>(`/admin/tenants/${id}/plan`, {
      planCode,
    });
    return unwrap<AdminTenantDetail>(res);
  },

  async listAccessRequests(status = 'PENDING'): Promise<AdminAccessRequest[]> {
    const res = await api.get<ApiEnvelope<any>>(
      `/admin/access-requests?status=${encodeURIComponent(status)}`,
    );
    return asArray<AdminAccessRequest>(unwrap(res), 'requests', 'items');
  },

  async decideAccessRequest(id: string, action: 'approve' | 'reject'): Promise<void> {
    await api.post(`/admin/access-requests/${id}/${action}`);
  },

  async listPlans(): Promise<AdminPlan[]> {
    const res = await api.get<ApiEnvelope<any>>('/admin/plans');
    return asArray<AdminPlan>(unwrap(res), 'plans', 'items');
  },
};

/** Requester display label for an access request, across denormalised shapes. */
export function requesterLabel(req: AdminAccessRequest): string {
  return (
    req.requesterName ||
    req.requester?.name ||
    req.user?.name ||
    req.requesterEmail ||
    req.requester?.email ||
    req.user?.email ||
    'A teammate'
  );
}

/** Tenant name for an access request, across denormalised shapes. */
export function requestTenantName(req: AdminAccessRequest): string {
  return req.tenantName || req.tenant?.name || 'Unknown business';
}
