import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import Icon from './ui/Icon';
import { formatDateTime } from '@/lib/format';

interface AppNotification {
  id: string;
  title: string;
  body: string | null;
  type: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

const iconButton =
  'relative flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';

const TYPE_ICON: Record<string, string> = {
  order: 'bx-receipt',
  partnership: 'bx-git-branch',
  payment: 'bx-wallet',
  invoice: 'bx-file',
  system: 'bx-info-circle',
  info: 'bx-bell',
};

/** In-portal notification bell: unread badge + dropdown inbox. Polls the count. */
export default function NotificationBell() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const loadCount = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; data: { count: number } }>('/notifications/inbox/unread-count');
      if (res.success) setUnread(res.data?.count || 0);
    } catch {
      /* non-critical */
    }
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: AppNotification[] }>('/notifications/inbox');
      if (res.success) setItems(res.data || []);
    } catch {
      /* non-critical */
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll the unread count.
  useEffect(() => {
    loadCount();
    const id = setInterval(loadCount, 60000);
    return () => clearInterval(id);
  }, [loadCount]);

  // Close on outside click.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) loadList();
  };

  const openItem = async (n: AppNotification) => {
    setOpen(false);
    if (!n.isRead) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
      setUnread((u) => Math.max(0, u - 1));
      api.post(`/notifications/inbox/${n.id}/read`).catch(() => undefined);
    }
    if (n.link) router.push(n.link);
  };

  const markAll = async () => {
    setItems((prev) => prev.map((x) => ({ ...x, isRead: true })));
    setUnread(0);
    try {
      await api.post('/notifications/inbox/read-all');
    } catch {
      /* non-critical */
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={toggle}
        className={iconButton}
        aria-label={t('notifications.title', 'Notifications')}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Icon name="bell" size={18} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-gray-900">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="fixed right-2 top-[calc(var(--header-height)+0.5rem)] sm:absolute sm:right-0 sm:top-auto sm:mt-2 z-50 w-80 max-w-[calc(100vw-1rem)] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-popover dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5 dark:border-gray-800">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('notifications.title', 'Notifications')}</p>
            {items.some((n) => !n.isRead) && (
              <button type="button" onClick={markAll} className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">
                {t('notifications.markAllRead', 'Mark all read')}
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-brand-600" />
              </div>
            ) : items.filter((n) => !n.isRead).length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                <i className="bx bx-bell-off mb-1 block text-2xl text-gray-300 dark:text-gray-600" aria-hidden="true" />
                {t('notifications.empty', "You're all caught up")}
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {items.filter((n) => !n.isRead).map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => openItem(n)}
                      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-gray-50 dark:hover:bg-gray-800/60 ${
                        n.isRead ? '' : 'bg-brand-50/50 dark:bg-brand-500/5'
                      }`}
                    >
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                        <i className={`bx ${TYPE_ICON[n.type] || TYPE_ICON.info}`} aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block text-sm ${n.isRead ? 'text-gray-700 dark:text-gray-300' : 'font-semibold text-gray-900 dark:text-gray-100'}`}>
                          {n.title}
                        </span>
                        {n.body && <span className="block truncate text-xs text-gray-500 dark:text-gray-400">{n.body}</span>}
                        <span className="mt-0.5 block text-[11px] text-gray-400">{formatDateTime(n.createdAt)}</span>
                      </span>
                      {!n.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" aria-hidden="true" />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
