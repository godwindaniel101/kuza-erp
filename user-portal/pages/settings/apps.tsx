import { useCallback, useEffect, useState } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import Link from 'next/link';
import { api } from '@/lib/api';
import { getApp } from '@/lib/apps';
import { useTenantStore } from '@/store/globalStore';
import { useAuthStore } from '@/store/authStore';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import { CardSkeleton } from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import Icon from '@/components/ui/Icon';
import StatusBadge from '@/components/ui/StatusBadge';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';

/** Per-app state from GET /billing/apps. */
interface AppState {
  key: string;
  name: string;
  description: string;
  /** vertical (fixed, can't switch) | common | assist. */
  group?: 'vertical' | 'common' | 'assist';
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

/** A pending app-access request from a non-admin teammate (landlord-scoped). */
interface AccessRequest {
  id: string;
  appKey: string;
  note?: string | null;
  status?: string;
  createdAt?: string;
  /** Backend may denormalize the requester in a few shapes — read defensively. */
  requesterName?: string;
  requesterEmail?: string;
  requester?: { name?: string; email?: string } | null;
  user?: { name?: string; email?: string } | null;
}

export default function AppsPage() {
  const { t } = useTranslation('common');
  const { fetchTenantContext } = useTenantStore();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const isAdmin = hasPermission('settings.edit');
  const [apps, setApps] = useState<AppState[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  /** Key of the app currently being toggled (disables its control). */
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [confirmDisable, setConfirmDisable] = useState<AppState | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  /** App keys the current user has already requested this session (locked cards). */
  const [requestedKeys, setRequestedKeys] = useState<string[]>([]);
  /** App key currently being requested (disables that card's button). */
  const [requestingKey, setRequestingKey] = useState<string | null>(null);
  /** Admin-only: pending access requests + the id currently being acted on. */
  const [accessRequests, setAccessRequests] = useState<AccessRequest[] | null>(null);
  const [decidingId, setDecidingId] = useState<string | null>(null);

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

  const loadAccessRequests = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; data: any }>(
        '/billing/access-requests?status=PENDING',
      );
      // Response shape may be data: AccessRequest[] or data: { requests: [...] }.
      const list: AccessRequest[] = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.data?.requests)
          ? res.data.requests
          : [];
      setAccessRequests(list);
    } catch {
      // Endpoint may not be live yet — hide the section rather than error the page.
      setAccessRequests([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (isAdmin) loadAccessRequests();
  }, [isAdmin, loadAccessRequests]);

  const appName = (key: string, list: AppState[] | null) =>
    list?.find((a) => a.key === key)?.name ?? getApp(key)?.name ?? key;

  const requestAccess = async (key: string) => {
    if (requestingKey) return;
    setRequestingKey(key);
    const name = appName(key, apps);
    try {
      await api.post('/billing/access-requests', { appKey: key });
      setRequestedKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));
      setToast({ message: t('settings.requestSentToAdmin', 'Request sent to your admin'), type: 'success' });
    } catch (err: any) {
      const status = err?.response?.status;
      const serverMsg = err?.response?.data?.message;
      // 409 already requested / 400 already have it — soft success.
      if (status === 409 || status === 400) {
        setRequestedKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));
        setToast({ message: serverMsg || t('settings.alreadyRequested', 'You already requested {{name}}', { name }), type: 'info' });
      } else {
        setToast({ message: serverMsg || t('settings.couldNotRequest', 'Could not request {{name}}', { name }), type: 'error' });
      }
    } finally {
      setRequestingKey(null);
    }
  };

  const decideAccessRequest = async (req: AccessRequest, action: 'approve' | 'reject') => {
    if (decidingId) return;
    setDecidingId(req.id);
    const name = appName(req.appKey, apps);
    try {
      await api.post(`/billing/access-requests/${req.id}/${action}`);
      setToast({
        message: action === 'approve'
          ? t('settings.accessApproved', 'Access to {{name}} approved', { name })
          : t('settings.requestRejected', 'Request for {{name}} rejected', { name }),
        type: 'success',
      });
      // Refresh both the pending list and the apps grid (approve may enable an app).
      await Promise.all([loadAccessRequests(), load()]);
      fetchTenantContext(true);
    } catch (err: any) {
      setToast({
        message: err?.response?.data?.message || t('settings.couldNotDecideRequest', 'Could not {{action}} the request', { action }),
        type: 'error',
      });
    } finally {
      setDecidingId(null);
    }
  };

  const requesterLabel = (req: AccessRequest) =>
    req.requesterName ||
    req.requester?.name ||
    req.user?.name ||
    req.requesterEmail ||
    req.requester?.email ||
    req.user?.email ||
    t('settings.aTeammate', 'A teammate');

  const formatDate = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString();
  };

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
            message: t('settings.enabledRequiredBy', 'Enabled {{apps}} — required by {{name}}', {
              apps: added.map((k) => appName(k, res.data.apps)).join(', '),
              name: app.name,
            }),
            type: 'success',
          });
        } else {
          setToast({
            message: enabled
              ? t('settings.appEnabled', '{{name}} enabled', { name: app.name })
              : t('settings.appDisabled', '{{name}} disabled', { name: app.name }),
            type: 'success',
          });
        }
        // Sidebar + launcher read effectiveApps from the tenant store — refresh it live.
        fetchTenantContext(true);
      } else {
        setToast({ message: t('settings.couldNotUpdateApp', 'Could not update {{name}}', { name: app.name }), type: 'error' });
      }
    } catch (err: any) {
      // 400 on blocked disable carries the server's explanation (dependents).
      setToast({
        message: err?.response?.data?.message || t('settings.couldNotUpdateApp', 'Could not update {{name}}', { name: app.name }),
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
    <div className="w-full max-w-5xl space-y-5">
      <PageHeader
        title={t('settings.apps', 'Apps')}
        subtitle={t('settings.appsSubtitle', 'Turn parts of Kuza on or off. Disabling an app hides it — your data is kept.')}
        breadcrumbs={[{ label: t('settings', 'Settings'), href: '/settings' }, { label: t('settings.apps', 'Apps') }]}
      />

      {isAdmin && accessRequests && accessRequests.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 p-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('settings.accessRequests', 'Access requests')}</h2>
              <p className="mt-0.5 text-[13px] text-gray-500 dark:text-gray-400">
                {t('settings.accessRequestsSubtitle', 'Teammates waiting on an app. Approving enables it for your business.')}
              </p>
            </div>
            <StatusBadge variant="pending" label={t('settings.pendingCount', '{{count}} pending', { count: accessRequests.length })} size="sm" />
          </div>

          <ul className="mt-4 divide-y divide-gray-100 dark:divide-gray-800">
            {accessRequests.map((req) => {
              const def = getApp(req.appKey);
              return (
                <li key={req.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500">
                    <Icon name={def?.icon ?? 'squares-2x2'} size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {appName(req.appKey, apps)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {requesterLabel(req)}
                      {formatDate(req.createdAt) && <span> · {formatDate(req.createdAt)}</span>}
                      {req.note && <span> · “{req.note}”</span>}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={decidingId === req.id}
                      onClick={() => decideAccessRequest(req, 'reject')}
                    >
                      {t('settings.reject', 'Reject')}
                    </Button>
                    <Button
                      size="sm"
                      loading={decidingId === req.id}
                      onClick={() => decideAccessRequest(req, 'approve')}
                    >
                      {t('settings.approve', 'Approve')}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <CardSkeleton count={6} />
        </div>
      )}

      {!loading && loadError && (
        <EmptyState
          icon="bx-grid-alt"
          title={t('settings.appsLoadErrorTitle', "Couldn't load your apps")}
          description={t('settings.appsLoadErrorDescription', "The apps service didn't respond. It may still be rolling out — try again in a moment.")}
          actions={<Button size="sm" onClick={load}>{t('settings.retry', 'Retry')}</Button>}
        />
      )}

      {!loading && !loadError && apps && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {apps
            /* Verticals are your primary, fixed surface (items ⊕ rms ⊕ shop) —
               you can't switch between them. Show only your active vertical
               (locked, always on); hide the other verticals entirely. */
            .filter((a) => a.group !== 'vertical' || a.enabled)
            .map((app) => {
            const def = getApp(app.key);
            const isVertical = app.group === 'vertical';
            const locked = !app.allowedByPlan;
            const active = (app.enabled && !locked) || isVertical;
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

                  {isVertical ? (
                    <span className="inline-flex items-center rounded-full bg-brand-500/10 px-2.5 py-0.5 text-xs font-semibold text-brand-700 dark:text-brand-400 ring-1 ring-inset ring-brand-600/20">
                      {t('settings.yourVertical', 'Included')}
                    </span>
                  ) : locked ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400 ring-1 ring-inset ring-amber-600/20">
                      <Icon name="lock" size={11} />
                      {t('settings.locked', 'Locked')}
                    </span>
                  ) : (
                    <button
                      type="button"
                      role="switch"
                      aria-checked={app.enabled}
                      aria-label={app.enabled ? t('settings.disableApp', 'Disable {{name}}', { name: app.name }) : t('settings.enableApp', 'Enable {{name}}', { name: app.name })}
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
                      t('settings.requires', 'Requires {{apps}}', { apps: app.dependencies.map((k) => appName(k, apps)).join(', ') })}
                  </span>
                  {locked && (
                    <span className="flex shrink-0 items-center gap-3">
                      <button
                        type="button"
                        disabled={requestingKey === app.key || requestedKeys.includes(app.key)}
                        onClick={() => requestAccess(app.key)}
                        className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {requestedKeys.includes(app.key)
                          ? t('settings.requested', 'Requested')
                          : requestingKey === app.key
                            ? t('settings.requesting', 'Requesting…')
                            : t('settings.requestAccess', 'Request access')}
                      </button>
                      <Link
                        href="/settings/billing"
                        className="text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors duration-150"
                      >
                        {t('settings.upgrade', 'Upgrade')}
                      </Link>
                    </span>
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
        title={confirmDisable ? t('settings.disableTitle', 'Disable {{name}}?', { name: confirmDisable.name }) : ''}
        maxWidth="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDisable(null)}>
              {t('cancel', 'Cancel')}
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
              {t('settings.disable', 'Disable')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('settings.disableBody', '{{name}} will disappear from your sidebar and launcher. Nothing is deleted — all its data is kept and comes back the moment you re-enable it.', { name: confirmDisable?.name })}
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
