import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';

export interface Permission {
  id: string;
  name: string;
  displayName: string;
  group: string;
  app: string;
  description?: string;
}

type AppKey = 'items' | 'rms' | 'invoicing' | 'books' | 'payments' | 'people' | 'admin';

/** Friendly labels + icons for the owning-app sections. */
const APP_META: Record<string, { label: string; icon: string }> = {
  items: { label: 'Inventory', icon: 'bx-box' },
  rms: { label: 'Restaurant', icon: 'bx-restaurant' },
  invoicing: { label: 'Invoicing', icon: 'bx-receipt' },
  books: { label: 'Accounting', icon: 'bx-book' },
  payments: { label: 'Payments', icon: 'bx-credit-card' },
  people: { label: 'People', icon: 'bx-group' },
  admin: { label: 'Access & Settings', icon: 'bx-cog' },
};

/** Stable ordering for app sections. */
const APP_ORDER: AppKey[] = ['items', 'rms', 'invoicing', 'books', 'payments', 'people', 'admin'];

function appLabel(app: string): string {
  return APP_META[app]?.label || app;
}

function appIcon(app: string): string {
  return APP_META[app]?.icon || 'bx-shield';
}

interface PermissionPickerProps {
  value: string[];
  onChange: (ids: string[]) => void;
  /** Read-only browse mode: hides checkboxes/select-all, just lists what exists. */
  readOnly?: boolean;
}

export default function PermissionPicker({ value, onChange, readOnly = false }: PermissionPickerProps) {
  const { t } = useTranslation('common');
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  // App sections collapsed by default; a search auto-expands everything.
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set(APP_ORDER));
  const searching = search.trim().length > 0;
  const isOpen = (app: string) => searching || !collapsed.has(app);
  const toggleApp = (app: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(app) ? next.delete(app) : next.add(app);
      return next;
    });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await api.get<{ success: boolean; data: Permission[] }>('/settings/permissions');
        if (!cancelled && response.success) {
          setPermissions(response.data || []);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.response?.data?.message || err?.message || t('loadFailed') || 'Failed to load permissions');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const selectedSet = useMemo(() => new Set(value), [value]);

  // Apply the search filter.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return permissions;
    return permissions.filter(
      (p) =>
        p.displayName?.toLowerCase().includes(q) ||
        p.name?.toLowerCase().includes(q) ||
        p.group?.toLowerCase().includes(q) ||
        appLabel(p.app).toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q),
    );
  }, [permissions, search]);

  // Group by app, then by group within each app.
  const byApp = useMemo(() => {
    const map = new Map<string, Map<string, Permission[]>>();
    for (const p of filtered) {
      const app = p.app || 'admin';
      if (!map.has(app)) map.set(app, new Map());
      const groups = map.get(app)!;
      const group = p.group || 'General';
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group)!.push(p);
    }
    // Order apps: known order first, then any extras alphabetically.
    const orderedApps = [
      ...APP_ORDER.filter((a) => map.has(a)),
      ...Array.from(map.keys())
        .filter((a) => !APP_ORDER.includes(a as AppKey))
        .sort(),
    ];
    return orderedApps.map((app) => ({
      app,
      groups: Array.from(map.get(app)!.entries()).sort((a, b) => a[0].localeCompare(b[0])),
    }));
  }, [filtered]);

  const toggleOne = (id: string) => {
    if (readOnly) return;
    if (selectedSet.has(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  };

  const toggleMany = (ids: string[], select: boolean) => {
    if (readOnly) return;
    if (select) {
      const next = new Set(value);
      ids.forEach((id) => next.add(id));
      onChange(Array.from(next));
    } else {
      const remove = new Set(ids);
      onChange(value.filter((v) => !remove.has(v)));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (permissions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">{t('noPermissionsFound') || 'No permissions found'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search + expand/collapse all */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <i className="bx bx-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true"></i>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchPermissions') || 'Search permissions...'}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus-visible:ring-2 focus-visible:ring-brand-500 focus:outline-none"
          />
        </div>
        {!searching && byApp.length > 0 && (
          <button
            type="button"
            onClick={() =>
              setCollapsed((prev) =>
                prev.size === 0 ? new Set(byApp.map((a) => a.app)) : new Set(),
              )
            }
            className="shrink-0 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            {collapsed.size === 0 ? t('collapseAll') || 'Collapse all' : t('expandAll') || 'Expand all'}
          </button>
        )}
      </div>

      {byApp.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">{t('noResults') || 'No matching permissions'}</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
          {byApp.map(({ app, groups }) => {
            const appPerms = groups.flatMap(([, perms]) => perms);
            const appIds = appPerms.map((p) => p.id);
            const appSelectedCount = appPerms.filter((p) => selectedSet.has(p.id)).length;
            const appAll = appSelectedCount === appPerms.length && appPerms.length > 0;
            const appSome = appSelectedCount > 0 && !appAll;
            const open = isOpen(app);
            return (
              <section
                key={app}
                className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                {/* Collapsible app header */}
                <div className="flex items-center bg-gray-50 dark:bg-gray-800/60">
                  <button
                    type="button"
                    onClick={() => toggleApp(app)}
                    className="flex flex-1 items-center gap-2 px-3 py-2.5 text-left"
                    aria-expanded={open}
                  >
                    <i
                      className={`bx bx-chevron-right text-lg text-gray-400 transition-transform ${open ? 'rotate-90' : ''}`}
                      aria-hidden="true"
                    ></i>
                    <i className={`bx ${appIcon(app)} text-base text-brand-600 dark:text-brand-400`} aria-hidden="true"></i>
                    <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">{appLabel(app)}</h3>
                    <span className="ml-auto text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                      {appSelectedCount}/{appPerms.length}
                    </span>
                  </button>
                  {!readOnly && (
                    <label className="px-3 py-2.5" title={t('selectAll') || 'Select all'}>
                      <input
                        type="checkbox"
                        checked={appAll}
                        ref={(input) => {
                          if (input) input.indeterminate = appSome;
                        }}
                        onChange={(e) => toggleMany(appIds, e.target.checked)}
                        className="h-4 w-4 cursor-pointer rounded border-gray-300 text-brand-600 focus-visible:ring-brand-500 dark:border-gray-600 dark:bg-gray-700"
                      />
                    </label>
                  )}
                </div>

                {/* Body */}
                {open && (
                  <div className="space-y-3 p-3">
                    {groups.map(([group, groupPerms]) => {
                      const ids = groupPerms.map((p) => p.id);
                      const selectedInGroup = groupPerms.filter((p) => selectedSet.has(p.id)).length;
                      const allSelected = selectedInGroup === groupPerms.length && groupPerms.length > 0;
                      const someSelected = selectedInGroup > 0 && !allSelected;
                      return (
                        <div key={`${app}-${group}`}>
                          <div className="mb-1 flex items-center gap-2">
                            {!readOnly && (
                              <input
                                type="checkbox"
                                checked={allSelected}
                                ref={(input) => {
                                  if (input) input.indeterminate = someSelected;
                                }}
                                onChange={(e) => toggleMany(ids, e.target.checked)}
                                className="h-3.5 w-3.5 cursor-pointer rounded border-gray-300 text-brand-600 focus-visible:ring-brand-500 dark:border-gray-600 dark:bg-gray-700"
                              />
                            )}
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                              {group}
                            </span>
                            <span className="ml-auto text-[11px] text-gray-400 tabular-nums">
                              {selectedInGroup}/{groupPerms.length}
                            </span>
                          </div>
                          {/* Dense 2-col permission list */}
                          <div className="grid grid-cols-1 gap-x-4 gap-y-0.5 sm:grid-cols-3">
                            {groupPerms.map((permission) => (
                              <label
                                key={permission.id}
                                title={permission.name + (permission.description ? ` — ${permission.description}` : '')}
                                className={`flex items-center gap-2 rounded px-1.5 py-1 ${
                                  readOnly ? '' : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800'
                                }`}
                              >
                                {!readOnly && (
                                  <input
                                    type="checkbox"
                                    checked={selectedSet.has(permission.id)}
                                    onChange={() => toggleOne(permission.id)}
                                    className="h-4 w-4 shrink-0 cursor-pointer rounded border-gray-300 text-brand-600 focus-visible:ring-brand-500 dark:border-gray-600 dark:bg-gray-700"
                                  />
                                )}
                                <span className="truncate text-[13px] text-gray-800 dark:text-gray-200">
                                  {permission.displayName}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
