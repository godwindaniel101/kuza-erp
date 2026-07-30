import { AppKey } from './app-registry';

/**
 * Canonical, APP-ORGANIZED permission catalog — the single source of truth for
 * every permission an admin can assign to a role. Each permission is tagged
 * with the app it belongs to so the Access-Control UI can group permissions by
 * app and show only those for apps the tenant actually has enabled.
 *
 * `app: 'admin'` = cross-cutting platform permissions (users, roles, settings)
 * that are always available regardless of which business apps are enabled.
 */
export type PermissionAppScope = AppKey | 'admin';

export interface PermissionDef {
  /** Canonical `resource.action` name checked by @RequirePermissions. */
  name: string;
  /** Human label shown in the picker. */
  displayName: string;
  /** Display sub-group within the app (e.g. "Inventory", "Payroll"). */
  group: string;
  /** The app this permission belongs to (drives app-scoped visibility). */
  app: PermissionAppScope;
}

const crud = (
  resource: string,
  label: string,
  app: PermissionAppScope,
  group: string,
  actions: string[] = ['view', 'create', 'edit', 'delete'],
): PermissionDef[] =>
  actions.map((action) => ({
    name: `${resource}.${action}`,
    displayName: `${action[0].toUpperCase()}${action.slice(1)} ${label}`,
    group,
    app,
  }));

export const PERMISSION_CATALOG: PermissionDef[] = [
  // ── Inventory (items) ───────────────────────────────────────────────
  ...crud('inventory', 'inventory items', 'items', 'Inventory', ['view', 'create', 'edit', 'delete', 'approve']),
  ...crud('inflows', 'stock inflows', 'items', 'Inventory', ['view', 'create', 'edit', 'delete', 'approve']),
  ...crud('categories', 'categories', 'items', 'Inventory'),
  ...crud('uoms', 'units of measure', 'items', 'Inventory'),
  ...crud('suppliers', 'suppliers', 'items', 'Inventory'),
  { name: 'stock.view', displayName: 'View stock movements & adjustments', group: 'Inventory', app: 'items' },

  // ── Restaurant (rms) ────────────────────────────────────────────────
  { name: 'pos.use', displayName: 'Use the POS', group: 'Restaurant', app: 'rms' },
  ...crud('orders', 'orders', 'rms', 'Restaurant'),
  ...crud('tables', 'tables', 'rms', 'Restaurant'),
  ...crud('menus', 'menus', 'rms', 'Restaurant'),
  ...crud('reservations', 'reservations', 'rms', 'Restaurant'),

  // ── Storefront (shop) ───────────────────────────────────────────────
  // Storefront reuses the shared stock-core (inventory.*) and order-engine
  // (orders.*) permissions by name; these are the storefront-only ones.
  { name: 'storefront.view', displayName: 'View the storefront', group: 'Storefront', app: 'shop' },
  { name: 'storefront.manage', displayName: 'Manage storefront settings & products', group: 'Storefront', app: 'shop' },
  { name: 'storefront.publish', displayName: 'Publish / unpublish the storefront', group: 'Storefront', app: 'shop' },
  { name: 'storefront.orders', displayName: 'View & fulfil storefront orders', group: 'Storefront', app: 'shop' },

  // ── Invoicing ───────────────────────────────────────────────────────
  { name: 'sales.view', displayName: 'View customers & invoices', group: 'Invoicing', app: 'invoicing' },
  { name: 'sales.manage', displayName: 'Manage customers & invoices', group: 'Invoicing', app: 'invoicing' },
  { name: 'reports.view', displayName: 'View reports', group: 'Invoicing', app: 'invoicing' },

  // ── Accounting (books) ──────────────────────────────────────────────
  { name: 'accounting.view', displayName: 'View accounting', group: 'Accounting', app: 'books' },
  { name: 'accounting.manage', displayName: 'Manage accounting', group: 'Accounting', app: 'books' },

  // ── Payments ────────────────────────────────────────────────────────
  { name: 'payments.view', displayName: 'View payments', group: 'Payments', app: 'payments' },
  { name: 'payments.manage', displayName: 'Manage payments & settlement', group: 'Payments', app: 'payments' },

  // ── People (HRMS) ───────────────────────────────────────────────────
  ...crud('employees', 'employees', 'people', 'People'),
  ...crud('departments', 'departments', 'people', 'People'),
  ...crud('positions', 'positions', 'people', 'People'),
  ...crud('locations', 'locations', 'people', 'People'),
  { name: 'attendance.view', displayName: 'View attendance', group: 'Attendance', app: 'people' },
  { name: 'attendance.clock-in', displayName: 'Clock in', group: 'Attendance', app: 'people' },
  { name: 'attendance.clock-out', displayName: 'Clock out', group: 'Attendance', app: 'people' },
  { name: 'attendance.approve', displayName: 'Approve attendance', group: 'Attendance', app: 'people' },
  { name: 'leaves.view', displayName: 'View leave', group: 'Leave', app: 'people' },
  { name: 'leaves.create', displayName: 'Request leave', group: 'Leave', app: 'people' },
  { name: 'leaves.approve', displayName: 'Approve leave', group: 'Leave', app: 'people' },
  ...crud('leaveTypes', 'leave types', 'people', 'Leave'),
  ...crud('payroll', 'payroll', 'people', 'Payroll', ['view', 'create', 'edit', 'delete', 'approve', 'process']),
  ...crud('compensation', 'compensation', 'people', 'Payroll'),
  ...crud('benefits', 'benefits', 'people', 'People'),
  ...crud('performance', 'performance reviews', 'people', 'People'),
  ...crud('recruitment', 'recruitment', 'people', 'People'),
  ...crud('learning', 'learning', 'people', 'People'),

  // ── Access & platform (admin, always available) ─────────────────────
  ...crud('users', 'users', 'admin', 'Access control'),
  ...crud('roles', 'roles', 'admin', 'Access control'),
  { name: 'invitations.view', displayName: 'View invitations', group: 'Access control', app: 'admin' },
  { name: 'invitations.create', displayName: 'Send invitations', group: 'Access control', app: 'admin' },
  { name: 'invitations.delete', displayName: 'Cancel invitations', group: 'Access control', app: 'admin' },
  ...crud('branches', 'branches', 'admin', 'Settings'),
  { name: 'settings.view', displayName: 'View settings', group: 'Settings', app: 'admin' },
  { name: 'settings.edit', displayName: 'Edit settings', group: 'Settings', app: 'admin' },
];

/** name → app scope, for fast lookup / scoping. */
export const PERMISSION_APP_BY_NAME: Record<string, PermissionAppScope> =
  Object.fromEntries(PERMISSION_CATALOG.map((p) => [p.name, p.app]));
