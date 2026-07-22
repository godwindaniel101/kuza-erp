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
      {/* Search */}
      <div className="relative">
        <i className="bx bx-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true"></i>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('searchPermissions') || 'Search permissions...'}
          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus-visible:ring-2 focus-visible:ring-brand-500 focus:outline-none"
        />
      </div>

      {byApp.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">{t('noResults') || 'No matching permissions'}</p>
        </div>
      ) : (
        <div className="space-y-6 max-h-[600px] overflow-y-auto pr-1">
          {byApp.map(({ app, groups }) => {
            const appPerms = groups.flatMap(([, perms]) => perms);
            const appSelectedCount = appPerms.filter((p) => selectedSet.has(p.id)).length;
            return (
              <section key={app} className="space-y-3">
                {/* App section header */}
                <div className="flex items-center gap-2 sticky top-0 z-10 bg-white/95 dark:bg-gray-900/95 backdrop-blur py-1">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
                    <i className={`bx ${appIcon(app)} text-base`} aria-hidden="true"></i>
                  </span>
                  <h3 className="text-sm font-bold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                    {appLabel(app)}
                  </h3>
                  <span className="ml-auto text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                    {appSelectedCount} / {appPerms.length}
                  </span>
                </div>

                {/* Groups within the app */}
                {groups.map(([group, groupPerms]) => {
                  const ids = groupPerms.map((p) => p.id);
                  const selectedInGroup = groupPerms.filter((p) => selectedSet.has(p.id)).length;
                  const allSelected = selectedInGroup === groupPerms.length && groupPerms.length > 0;
                  const someSelected = selectedInGroup > 0 && !allSelected;

                  return (
                    <div
                      key={`${app}-${group}`}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                    >
                      <div className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {!readOnly && (
                            <input
                              type="checkbox"
                              checked={allSelected}
                              ref={(input) => {
                                if (input) input.indeterminate = someSelected;
                              }}
                              onChange={(e) => toggleMany(ids, e.target.checked)}
                              className="h-4 w-4 text-brand-600 focus-visible:ring-brand-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                            />
                          )}
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{group}</h4>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                          {selectedInGroup} / {groupPerms.length}
                        </span>
                      </div>

                      <div className="p-3 space-y-1">
                        {groupPerms.map((permission) => (
                          <label
                            key={permission.id}
                            className={`flex items-start gap-3 p-2.5 rounded-lg transition-colors ${
                              readOnly ? '' : 'hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer'
                            }`}
                          >
                            {!readOnly && (
                              <input
                                type="checkbox"
                                checked={selectedSet.has(permission.id)}
                                onChange={() => toggleOne(permission.id)}
                                className="mt-0.5 h-4 w-4 text-brand-600 focus-visible:ring-brand-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {permission.displayName}
                              </div>
                              {permission.description && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                  {permission.description}
                                </div>
                              )}
                              <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 font-mono">
                                {permission.name}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
