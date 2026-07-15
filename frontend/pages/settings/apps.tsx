import { useCallback, useEffect, useState } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Link from 'next/link';
import { api } from '@/lib/api';
import { getApp } from '@/lib/apps';
import { useTenantStore } from '@/store/globalStore';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import { CardSkeleton } from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import Icon from '@/components/ui/Icon';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';

/** Per-app state from GET /billing/apps. */
interface AppState {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  allowedByPlan: boolean;
  dependencies: string[];
  dependents: string[];
}

interface AppsPayload {
  apps: AppState[];
  effective: string[];
  /** Present on PATCH when enabling cascaded into dependencies. */
  addedDependencies?: string[];
}

export default function AppsPage() {
  const { fetchTenantContext } = useTenantStore();
  const [apps, setApps] = useState<AppState[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  /** Key of the app currently being toggled (disables its control). */
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [confirmDisable, setConfirmDisable] = useState<AppState | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await api.get<{ success: boolean; data: AppsPayload }>('/billing/apps');
      if (res.success && Array.isArray(res.data?.apps)) {
        setApps(res.data.apps);
      } else {
        setLoadError(true);
      }
    } catch {
      // Backend may not ship the apps endpoint yet (404) — show a friendly retry.
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const appName = (key: string, list: AppState[] | null) =>
    list?.find((a) => a.key === key)?.name ?? getApp(key)?.name ?? key;

  const patchApp = async (app: AppState, enabled: boolean) => {
    setBusyKey(app.key);
    try {
      const res = await api.patch<{ success: boolean; data: AppsPayload }>('/billing/apps', {
        key: app.key,
        enabled,
      });
      if (res.success && Array.isArray(res.data?.apps)) {
        setApps(res.data.apps);
        const added = res.data.addedDependencies ?? [];
        if (enabled && added.length > 0) {
          setToast({
            message: `Enabled ${added.map((k) => appName(k, res.data.apps)).join(', ')} — required by ${app.name}`,
            type: 'success',
          });
        } else {
          setToast({ message: `${app.name} ${enabled ? 'enabled' : 'disabled'}`, type: 'success' });
        }
        // Sidebar + launcher read effectiveApps from the tenant store — refresh it live.
        fetchTenantContext(true);
      } else {
        setToast({ message: `Could not update ${app.name}`, type: 'error' });
      }
    } catch (err: any) {
      // 400 on blocked disable carries the server's explanation (dependents).
      setToast({
        message: err?.response?.data?.message || `Could not update ${app.name}`,
        type: 'error',
      });
    } finally {
      setBusyKey(null);
    }
  };

  const handleToggle = (app: AppState) => {
    if (busyKey) return;
    if (app.enabled) {
      setConfirmDisable(app);
    } else {
      patchApp(app, true);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <PageHeader
        title="Apps"
        subtitle="Turn parts of Kuza on or off. Disabling an app hides it — your data is kept."
        breadcrumbs={[{ label: 'Settings', href: '/settings' }, { label: 'Apps' }]}
      />

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <CardSkeleton count={6} />
        </div>
      )}

      {!loading && loadError && (
        <EmptyState
          icon="bx-grid-alt"
          title="Couldn't load your apps"
          description="The apps service didn't respond. It may still be rolling out — try again in a moment."
          actions={<Button size="sm" onClick={load}>Retry</Button>}
        />
      )}

      {!loading && !loadError && apps && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {apps.map((app) => {
            const def = getApp(app.key);
            const locked = !app.allowedByPlan;
            const active = app.enabled && !locked;
            return (
              <div
                key={app.key}
                className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      active
                        ? 'bg-brand-gradient text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                    }`}
                  >
                    <Icon name={def?.icon ?? 'squares-2x2'} size={20} />
                  </span>

                  {locked ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400 ring-1 ring-inset ring-amber-600/20">
                      <Icon name="lock" size={11} />
                      Locked
                    </span>
                  ) : (
                    <button
                      type="button"
                      role="switch"
                      aria-checked={app.enabled}
                      aria-label={`${app.enabled ? 'Disable' : 'Enable'} ${app.name}`}
                      disabled={busyKey === app.key}
                      onClick={() => handleToggle(app)}
                      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-50 ${
                        app.enabled ? 'bg-brand-600' : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-150 ${
                          app.enabled ? 'translate-x-[18px]' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  )}
                </div>

                <h3 className="mt-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {app.name || def?.name || app.key}
                </h3>
                <p className="mt-0.5 text-[13px] leading-5 text-gray-500 dark:text-gray-400">
                  {app.description || def?.description || ''}
                </p>

                <div className="mt-3 flex items-center justify-between gap-2 min-h-[20px]">
                  <span className="text-xs text-gray-400 dark:text-gray-500 truncate">
                    {app.dependencies.length > 0 &&
                      `Requires ${app.dependencies.map((k) => appName(k, apps)).join(', ')}`}
                  </span>
                  {locked && (
                    <Link
                      href="/settings/billing"
                      className="shrink-0 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors duration-150"
                    >
                      Upgrade
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirm disable */}
      <Modal
        isOpen={!!confirmDisable}
        onClose={() => setConfirmDisable(null)}
        title={confirmDisable ? `Disable ${confirmDisable.name}?` : ''}
        maxWidth="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDisable(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={!!confirmDisable && busyKey === confirmDisable.key}
              onClick={() => {
                if (confirmDisable) {
                  const app = confirmDisable;
                  setConfirmDisable(null);
                  patchApp(app, false);
                }
              }}
            >
              Disable
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {confirmDisable?.name} will disappear from your sidebar and launcher. Nothing is deleted — all its
          data is kept and comes back the moment you re-enable it.
        </p>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale || 'en', ['common'])),
    },
  };
};
