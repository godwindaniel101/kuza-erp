import { useState, useEffect, useCallback, useMemo } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import Toast from '@/components/Toast';
import Modal from '@/components/Modal';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import FormField from '@/components/ui/FormField';
import DataTable, { DataTableColumn, RowAction } from '@/components/ui/DataTable';
import { useAuthStore } from '@/store/authStore';
import { downloadCsv } from '@/lib/format';
import { usePageSearch } from '@/store/searchStore';

interface Supplier {
  id: string;
  name: string;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  linkedTenantId?: string | null;
}

interface Partnership {
  id: string;
  status: 'pending' | 'active' | 'rejected' | 'revoked';
  role: 'buyer' | 'supplier';
  counterpart: { tenantId: string; name: string; slug: string } | null;
}

type ConnStatus = 'connected' | 'invited' | 'none';

export default function SuppliersPage() {
  const { t } = useTranslation('common');
  const { user, hasPermission } = useAuthStore();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [newSupplier, setNewSupplier] = useState({ name: '', email: '', phone: '', contactPerson: '', address: '' });
  // Kuza Network — invite an existing supplier onto the platform on create.
  const [inviteOnCreate, setInviteOnCreate] = useState(false);
  // Connection lookups derived from partnerships where role === 'buyer'.
  const [connByTenant, setConnByTenant] = useState<Record<string, ConnStatus>>({});
  const [connByName, setConnByName] = useState<Record<string, ConnStatus>>({});
  // Re-invite / invite modal target.
  const [inviteTarget, setInviteTarget] = useState<{ name: string; email: string; note: string } | null>(null);
  const [inviting, setInviting] = useState(false);
  // Filters — everything is filter-driven (no separate pages/tabs).
  const search = usePageSearch(t('suppliers.searchPlaceholder', 'Search suppliers…'));
  const [statusFilter, setStatusFilter] = useState<'all' | ConnStatus>('all');

  const loadSuppliers = useCallback(async () => {
    try {
      const response = await api.get<{ success: boolean; data: Supplier[] }>('/rms/suppliers');
      if (response.success) {
        setSuppliers(response.data);
      }
    } catch (err) {
      console.error('Failed to load suppliers:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch partnerships once and build a lookup of connection status for the
  // buy-side (role === 'buyer'). Active wins over pending when both exist.
  const loadPartnerships = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; data: Partnership[] }>('/network/partnerships');
      if (!res.success) return;
      const byTenant: Record<string, ConnStatus> = {};
      const byName: Record<string, ConnStatus> = {};
      const rank: Record<ConnStatus, number> = { connected: 2, invited: 1, none: 0 };
      const put = (map: Record<string, ConnStatus>, key: string, status: ConnStatus) => {
        if (!key) return;
        if (!map[key] || rank[status] > rank[map[key]]) map[key] = status;
      };
      for (const p of res.data || []) {
        if (p.role !== 'buyer' || !p.counterpart) continue;
        const status: ConnStatus =
          p.status === 'active' ? 'connected' : p.status === 'pending' ? 'invited' : 'none';
        if (status === 'none') continue;
        put(byTenant, p.counterpart.tenantId, status);
        put(byName, (p.counterpart.name || '').trim().toLowerCase(), status);
      }
      setConnByTenant(byTenant);
      setConnByName(byName);
    } catch (err) {
      // Network is JWT-only but non-critical here — pills just fall back to "Not invited".
      console.error('Failed to load partnerships:', err);
    }
  }, []);

  useEffect(() => {
    loadSuppliers();
    loadPartnerships();
  }, [loadSuppliers, loadPartnerships]);

  const connStatusFor = useCallback(
    (s: Supplier): ConnStatus => {
      if (s.linkedTenantId && connByTenant[s.linkedTenantId]) return connByTenant[s.linkedTenantId];
      const byName = connByName[(s.name || '').trim().toLowerCase()];
      return byName || 'none';
    },
    [connByTenant, connByName],
  );

  // Filter-driven list: free-text search + connection-status filter.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return suppliers.filter((s) => {
      if (statusFilter !== 'all' && connStatusFor(s) !== statusFilter) return false;
      if (!q) return true;
      return (
        s.name?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.contactPerson?.toLowerCase().includes(q) ||
        s.phone?.toLowerCase().includes(q)
      );
    });
  }, [suppliers, search, statusFilter, connStatusFor]);

  const statusFilters: { key: 'all' | ConnStatus; label: string }[] = [
    { key: 'all', label: t('all', 'All') },
    { key: 'connected', label: t('suppliers.statusConnected', 'Connected') },
    { key: 'invited', label: t('suppliers.statusInvited', 'Invited') },
    { key: 'none', label: t('suppliers.statusNotInvited', 'Not invited') },
  ];

  const handleCreateSupplier = async () => {
    if (!newSupplier.name.trim()) {
      setToast({ message: t('nameRequired') || 'Name is required', type: 'error' });
      return;
    }

    setCreating(true);
    try {
      const payload: Record<string, string> = {
        name: newSupplier.name.trim(),
      };

      if (newSupplier.contactPerson?.trim()) payload.contactPerson = newSupplier.contactPerson.trim();
      if (newSupplier.email?.trim()) payload.email = newSupplier.email.trim();
      if (newSupplier.phone?.trim()) payload.phone = newSupplier.phone.trim();
      if (newSupplier.address?.trim()) payload.address = newSupplier.address.trim();

      const res = await api.post<{ success: boolean; data: Supplier; message?: string }>('/rms/suppliers', payload);
      if (res.success) {
        const email = newSupplier.email?.trim();
        const name = newSupplier.name.trim();
        // Optionally invite them onto Kuza Network in the same flow.
        if (inviteOnCreate && email) {
          try {
            const inv = await api.post<{ success: boolean; data: { alreadyOnPlatform: boolean } }>(
              '/network/invite',
              { email, name },
            );
            setToast({
              message: inv.data.alreadyOnPlatform
                ? t('suppliers.connectedOnKuza', "They're already on Kuza — connected")
                : t('suppliers.invitationSent', 'Invitation sent'),
              type: 'success',
            });
            await loadPartnerships();
          } catch {
            setToast({ message: res.message || t('createdSuccessfully') || 'Supplier created successfully', type: 'success' });
          }
        } else {
          setToast({ message: res.message || t('createdSuccessfully') || 'Supplier created successfully', type: 'success' });
        }
        setShowCreate(false);
        setNewSupplier({ name: '', email: '', phone: '', contactPerson: '', address: '' });
        setInviteOnCreate(false);
        await loadSuppliers();
      } else {
        setToast({ message: res.message || t('createFailed') || 'Failed to create supplier', type: 'error' });
      }
    } catch (err) {
      console.error('Failed to create supplier:', err);
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      const errorMessage = e.response?.data?.message || e.message || t('createFailed') || 'Failed to create supplier';
      setToast({ message: errorMessage, type: 'error' });
    } finally {
      setCreating(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteTarget) return;
    const email = inviteTarget.email.trim();
    if (!email) {
      setToast({ message: t('emailRequired') || 'Email is required', type: 'error' });
      return;
    }
    setInviting(true);
    try {
      const res = await api.post<{ success: boolean; data: { alreadyOnPlatform: boolean } }>('/network/invite', {
        email,
        name: inviteTarget.name.trim() || undefined,
        note: inviteTarget.note.trim() || undefined,
      });
      if (res.success) {
        setToast({
          message: res.data.alreadyOnPlatform
            ? t('suppliers.connectedOnKuza', "They're already on Kuza — connected")
            : t('suppliers.invitationSent', 'Invitation sent'),
          type: 'success',
        });
        setInviteTarget(null);
        await loadPartnerships();
      }
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setToast({ message: e?.response?.data?.message || 'Failed to send invitation', type: 'error' });
    } finally {
      setInviting(false);
    }
  };

  const handleDelete = async (supplier: Supplier) => {
    if (typeof window !== 'undefined' && !window.confirm(t('suppliers.confirmDelete', 'Delete this supplier?'))) return;
    try {
      await api.delete(`/rms/suppliers/${supplier.id}`);
      setToast({ message: t('deletedSuccessfully') || 'Deleted', type: 'success' });
      await loadSuppliers();
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setToast({ message: e?.response?.data?.message || t('deleteFailed') || 'Failed to delete', type: 'error' });
    }
  };

  const renderStatusPill = (status: ConnStatus) => {
    if (status === 'connected')
      return <StatusBadge variant="success" label={t('suppliers.statusConnected', 'Connected')} size="sm" />;
    if (status === 'invited')
      return <StatusBadge variant="pending" label={t('suppliers.statusInvited', 'Invited')} size="sm" />;
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs font-medium text-gray-500 dark:text-gray-400">
        <i className="bx bx-minus-circle text-xs" aria-hidden="true"></i>
        {t('suppliers.statusNotInvited', 'Not invited')}
      </span>
    );
  };

  const canDelete =
    !!user &&
    (user.roles?.includes('admin') || user.roles?.includes('super_admin') || hasPermission('suppliers.delete'));

  const columns: DataTableColumn<Supplier>[] = [
    {
      key: 'name',
      label: t('name'),
      render: (s) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-accent-soft">
            <span className="text-sm font-semibold tabular-nums text-accent">
              {(s.name || '').trim().charAt(0).toUpperCase() || '?'}
            </span>
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-gray-900 dark:text-gray-100">{s.name}</p>
            {s.contactPerson && <p className="truncate text-xs text-gray-500 dark:text-gray-400">{s.contactPerson}</p>}
          </div>
        </div>
      ),
    },
    { key: 'email', label: t('email'), render: (s) => s.email || '—' },
    { key: 'phone', label: t('phone'), render: (s) => s.phone || '—' },
    {
      key: 'status',
      label: t('status') || 'Status',
      render: (s) => renderStatusPill(connStatusFor(s)),
    },
  ];

  const rowActions: RowAction<Supplier>[] = [
    {
      label: t('suppliers.invite', 'Invite'),
      icon: 'bx-user-plus',
      hidden: (s) => connStatusFor(s) !== 'none',
      onClick: (s) => setInviteTarget({ name: s.name || '', email: s.email || '', note: '' }),
    },
    {
      label: t('suppliers.reinvite', 'Re-invite'),
      icon: 'bx-mail-send',
      hidden: (s) => connStatusFor(s) !== 'invited',
      onClick: (s) => setInviteTarget({ name: s.name || '', email: s.email || '', note: '' }),
    },
    ...(canDelete
      ? [
          {
            label: t('delete'),
            icon: 'bx-trash',
            danger: true,
            onClick: handleDelete,
          } as RowAction<Supplier>,
        ]
      : []),
  ];

  return (
    <PermissionGuard permission="suppliers.view">
      <div className="kz-stagger space-y-6">
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

        <PageHeader
          title={t('suppliers') || 'Suppliers'}
          count={loading ? undefined : suppliers.length}
          subtitle="Everyone you buy from, in one list"
          breadcrumbs={[{ label: t('nav.purchasing', 'Purchasing') }, { label: t('suppliers') || 'Suppliers' }]}
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  downloadCsv(
                    'suppliers.csv',
                    [t('name'), t('contactPerson') || 'Contact Person', t('email'), t('phone'), t('address')],
                    suppliers.map((s) => [s.name, s.contactPerson || '', s.email || '', s.phone || '', s.address || '']),
                  )
                }
                disabled={loading || suppliers.length === 0}
              >
                <i className="bx bx-download" aria-hidden="true"></i>
                {t('export') || 'Export'} CSV
              </Button>
              <PermissionGuard permission="suppliers.create">
                <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
                  <i className="bx bx-plus" aria-hidden="true"></i>
                  {t('add')} {t('supplier')}
                </Button>
              </PermissionGuard>
            </div>
          }
        />
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
          </div>
        ) : suppliers.length === 0 ? (
          <EmptyState
            icon="bx-user-voice"
            title={t('noSuppliersYet') || 'No suppliers yet'}
            description={t('addSuppliersToStart') || 'Add suppliers to start recording inflows'}
            actions={
              <PermissionGuard permission="suppliers.create">
                <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
                  <i className="bx bx-plus" aria-hidden="true"></i>
                  {t('add')} {t('supplier')}
                </Button>
              </PermissionGuard>
            }
          />
        ) : (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-0.5">
                {statusFilters.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setStatusFilter(f.key)}
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                      statusFilter === f.key
                        ? 'bg-accent text-accent-fg'
                        : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <DataTable
              columns={columns}
              data={filtered}
              rowActions={rowActions}
              emptyState={
                <p className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                  {t('suppliers.noMatches', 'No suppliers match your filters')}
                </p>
              }
            />
          </>
        )}

        <Modal
          isOpen={showCreate}
          onClose={() => {
            setShowCreate(false);
            setNewSupplier({ name: '', email: '', phone: '', contactPerson: '', address: '' });
            setInviteOnCreate(false);
          }}
          title={`${t('add')} ${t('supplier')}`}
          maxWidth="md"
        >
          <form onSubmit={(e) => { e.preventDefault(); handleCreateSupplier(); }}>
            <div className="space-y-4">
              <FormField
                name="name"
                type="text"
                label={t('name')}
                required
                value={newSupplier.name}
                onChange={(value) => setNewSupplier({ ...newSupplier, name: value })}
                placeholder={t('supplierName') || 'Supplier name'}
                inputProps={{ autoFocus: true }}
              />

              <div>
                <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('contactPerson') || 'Contact Person'} <span className="text-gray-400 dark:text-gray-500 text-xs">({t('optional')})</span>
                </label>
                <input
                  type="text"
                  value={newSupplier.contactPerson}
                  onChange={(e) => setNewSupplier({ ...newSupplier, contactPerson: e.target.value })}
                  placeholder={t('contactPersonName') || 'Contact person name'}
                  className="h-9 w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring focus-visible:border-transparent"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('email')} <span className="text-gray-400 dark:text-gray-500 text-xs">({t('optional')})</span>
                  </label>
                  <input
                    type="email"
                    value={newSupplier.email}
                    onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
                    placeholder={t('emailAddress') || 'email@example.com'}
                    className="h-9 w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring focus-visible:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('phone')} <span className="text-gray-400 dark:text-gray-500 text-xs">({t('optional')})</span>
                  </label>
                  <input
                    type="tel"
                    value={newSupplier.phone}
                    onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                    placeholder={t('phoneNumber') || '+1234567890'}
                    className="h-9 w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring focus-visible:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('address')} <span className="text-gray-400 dark:text-gray-500 text-xs">({t('optional')})</span>
                </label>
                <textarea
                  value={newSupplier.address}
                  onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
                  placeholder={t('address') || 'Street address'}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring focus-visible:border-transparent resize-none"
                />
              </div>

              {/* Kuza Network — optionally invite this supplier onto the platform. */}
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 p-3">
                <input
                  type="checkbox"
                  checked={inviteOnCreate}
                  onChange={(e) => setInviteOnCreate(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-gray-300 text-accent focus-visible:ring-accent-ring dark:border-gray-600 dark:bg-gray-700"
                />
                <span>
                  <span className="block text-sm text-gray-800 dark:text-gray-200">
                    {t('suppliers.inviteToNetwork', 'Invite')}
                  </span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">
                    {t(
                      'suppliers.inviteToNetworkHint',
                      "We'll connect if they're already on Kuza, or email them an invite. Requires an email.",
                    )}
                  </span>
                </span>
              </label>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowCreate(false);
                  setNewSupplier({ name: '', email: '', phone: '', contactPerson: '', address: '' });
                  setInviteOnCreate(false);
                }}
                disabled={creating}
              >
                {t('cancel')}
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={creating}
                disabled={!newSupplier.name.trim()}
              >
                {creating ? t('creating') || 'Creating...' : t('save')}
              </Button>
            </div>
          </form>
        </Modal>

        <Modal
          isOpen={!!inviteTarget}
          onClose={() => setInviteTarget(null)}
          title={t('inviteToPlatform') || 'Invite'}
          maxWidth="md"
        >
          {inviteTarget && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleInvite();
              }}
            >
              <div className="space-y-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('inviteToPlatformDesc') ||
                    "If they're already on Kuza we'll connect you; otherwise we'll email them an invitation to join."}
                </p>
                <div>
                  <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('email')}
                  </label>
                  <input
                    type="email"
                    required
                    autoFocus
                    value={inviteTarget.email}
                    onChange={(e) => setInviteTarget((s) => (s ? { ...s, email: e.target.value } : s))}
                    placeholder={t('emailAddress') || 'email@example.com'}
                    className="h-9 w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring focus-visible:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('note') || 'Note'}{' '}
                    <span className="text-gray-400 dark:text-gray-500 text-xs">({t('optional')})</span>
                  </label>
                  <textarea
                    value={inviteTarget.note}
                    onChange={(e) => setInviteTarget((s) => (s ? { ...s, note: e.target.value } : s))}
                    placeholder={t('inviteNotePlaceholder') || 'Add a short message…'}
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring focus-visible:border-transparent resize-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button type="button" variant="secondary" onClick={() => setInviteTarget(null)} disabled={inviting}>
                  {t('cancel')}
                </Button>
                <Button type="submit" variant="primary" loading={inviting} disabled={!inviteTarget.email.trim()}>
                  {t('sendInvite') || 'Send invite'}
                </Button>
              </div>
            </form>
          )}
        </Modal>
      </div>
    </PermissionGuard>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale || 'en', ['common'])),
    },
  };
};
