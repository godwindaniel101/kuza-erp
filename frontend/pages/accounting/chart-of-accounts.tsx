import { useState, useEffect, useMemo } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { api } from '@/lib/api';
import Toast from '@/components/Toast';
import Modal from '@/components/Modal';
import SearchableSelect from '@/components/SearchableSelect';
import PageHeader from '@/components/ui/PageHeader';
import FormField from '@/components/ui/FormField';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { downloadCsv } from '@/lib/format';

type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';

interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  parentId?: string | null;
  isSystem: boolean;
  isActive: boolean;
  description?: string;
}

const TYPE_ORDER: AccountType[] = ['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'];
const TYPE_LABELS: Record<AccountType, string> = {
  ASSET: 'Assets',
  LIABILITY: 'Liabilities',
  EQUITY: 'Equity',
  INCOME: 'Income',
  EXPENSE: 'Expenses',
};
const TYPE_META: Record<AccountType, { icon: string; tone: string }> = {
  ASSET: { icon: 'bx-wallet', tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' },
  LIABILITY: { icon: 'bx-credit-card', tone: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' },
  EQUITY: { icon: 'bx-pie-chart-alt-2', tone: 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300' },
  INCOME: { icon: 'bx-trending-up', tone: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300' },
  EXPENSE: { icon: 'bx-trending-down', tone: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300' },
};

interface AddForm {
  code: string;
  name: string;
  type: AccountType | '';
  parentId: string;
  description: string;
}

interface EditForm {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
}

const emptyAddForm: AddForm = { code: '', name: '', type: '', parentId: '', description: '' };

export default function ChartOfAccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<AddForm>(emptyAddForm);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const res = await api.get<{ success: boolean; data: Account[] }>('/accounting/accounts');
      if (res.success) setAccounts(res.data || []);
    } catch (err: any) {
      console.error('Failed to load accounts:', err);
      setToast({ message: err.response?.data?.message || 'Failed to load accounts', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Compute hierarchy depth for indentation and order children after their parents.
  const grouped = useMemo(() => {
    const byId = new Map(accounts.map((a) => [a.id, a]));
    const depthOf = (account: Account): number => {
      let depth = 0;
      let current = account;
      const seen = new Set<string>();
      while (current.parentId && byId.has(current.parentId) && !seen.has(current.parentId)) {
        seen.add(current.parentId);
        current = byId.get(current.parentId)!;
        depth += 1;
      }
      return depth;
    };

    const result: Record<AccountType, Array<Account & { depth: number }>> = {
      ASSET: [],
      LIABILITY: [],
      EQUITY: [],
      INCOME: [],
      EXPENSE: [],
    };

    // Depth-first ordering: roots sorted by code, then children under each parent.
    const childrenOf = new Map<string | null, Account[]>();
    for (const a of accounts) {
      const key = a.parentId && byId.has(a.parentId) ? a.parentId : null;
      if (!childrenOf.has(key)) childrenOf.set(key, []);
      childrenOf.get(key)!.push(a);
    }
    childrenOf.forEach((list) => list.sort((x, y) => x.code.localeCompare(y.code)));

    const visit = (parent: string | null, type: AccountType) => {
      for (const a of childrenOf.get(parent) || []) {
        if (a.type !== type) continue;
        result[a.type].push({ ...a, depth: depthOf(a) });
        visit(a.id, type);
      }
    };
    // Roots may include accounts whose parent belongs to another type; visit per type.
    TYPE_ORDER.forEach((type) => visit(null, type));

    return result;
  }, [accounts]);

  const parentOptions = useMemo(() => {
    const type = addForm.type;
    return accounts
      .filter((a) => (!type || a.type === type) && a.isActive)
      .sort((a, b) => a.code.localeCompare(b.code))
      .map((a) => ({ value: a.id, label: `${a.code} — ${a.name}` }));
  }, [accounts, addForm.type]);

  const handleAdd = async () => {
    if (!addForm.code.trim() || !addForm.name.trim() || !addForm.type) {
      setToast({ message: 'Code, name and type are required', type: 'error' });
      return;
    }
    setSaving(true);
    try {
      await api.post('/accounting/accounts', {
        code: addForm.code.trim(),
        name: addForm.name.trim(),
        type: addForm.type,
        parentId: addForm.parentId || undefined,
        description: addForm.description.trim() || undefined,
      });
      setToast({ message: 'Account created', type: 'success' });
      setShowAdd(false);
      setAddForm(emptyAddForm);
      await loadAccounts();
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || 'Failed to create account', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editForm) return;
    if (!editForm.name.trim()) {
      setToast({ message: 'Name is required', type: 'error' });
      return;
    }
    setSaving(true);
    try {
      await api.patch(`/accounting/accounts/${editForm.id}`, {
        name: editForm.name.trim(),
        description: editForm.description.trim() || undefined,
        isActive: editForm.isActive,
      });
      setToast({ message: 'Account updated', type: 'success' });
      setEditForm(null);
      await loadAccounts();
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || 'Failed to update account', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    if (accounts.length === 0) return;
    const rows = TYPE_ORDER.flatMap((type) =>
      grouped[type].map((a) => [a.code, a.name, TYPE_LABELS[type], a.isActive ? 'Active' : 'Inactive']),
    );
    downloadCsv(`chart-of-accounts-${new Date().toISOString().slice(0, 10)}.csv`, ['Code', 'Account', 'Type', 'Status'], rows);
  };

  const toggleActive = async (account: Account) => {
    try {
      await api.patch(`/accounting/accounts/${account.id}`, { isActive: !account.isActive });
      setToast({ message: account.isActive ? 'Account deactivated' : 'Account activated', type: 'success' });
      await loadAccounts();
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || 'Failed to update account', type: 'error' });
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Chart of Accounts"
        count={loading ? undefined : accounts.length}
        subtitle="Your account structure grouped by type"
        breadcrumbs={[{ label: 'Accounting', href: '/accounting' }, { label: 'Chart of Accounts' }]}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={handleExport} disabled={loading || accounts.length === 0}>
              <i className="bx bx-download"></i>
              Export CSV
            </Button>
            <Button size="sm" onClick={() => setShowAdd(true)}>
              <i className="bx bx-plus"></i>
              Add Account
            </Button>
          </>
        }
      />

      {loading ? (
        <TableSkeleton rows={8} columns={4} />
      ) : accounts.length === 0 ? (
        <EmptyState
          icon="bx-book"
          title="No accounts yet"
          description="Create your first account to build your chart of accounts"
          actions={
            <Button size="sm" onClick={() => setShowAdd(true)}>
              Add Account
            </Button>
          }
        />
      ) : (
        <div className="space-y-5">
          {TYPE_ORDER.map((type) => {
            const rows = grouped[type];
            if (rows.length === 0) return null;
            return (
              <div
                key={type}
                className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 overflow-hidden"
              >
                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide">
                    <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${TYPE_META[type].tone}`}>
                      <i className={`bx ${TYPE_META[type].icon} text-base`} aria-hidden="true"></i>
                    </span>
                    {TYPE_LABELS[type]}
                  </h2>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{rows.length} accounts</span>
                </div>
                <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {rows.map((account) => (
                      <tr key={account.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm w-32">
                          <span
                            className="font-mono text-gray-600 dark:text-gray-400"
                            style={{ paddingLeft: `${account.depth * 20}px` }}
                          >
                            {account.code}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-2" style={{ paddingLeft: `${account.depth * 20}px` }}>
                            <span className="font-medium text-gray-900 dark:text-white">{account.name}</span>
                            {account.isSystem && (
                              <span
                                title="System account (locked)"
                                className="inline-flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500"
                              >
                                <i className="bx bx-lock-alt" aria-hidden="true"></i>
                                System
                              </span>
                            )}
                          </div>
                          {account.description && (
                            <p
                              className="text-xs text-gray-500 dark:text-gray-400 mt-0.5"
                              style={{ paddingLeft: `${account.depth * 20}px` }}
                            >
                              {account.description}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm w-32">
                          <StatusBadge
                            variant={account.isActive ? 'success' : 'error'}
                            label={account.isActive ? 'Active' : 'Inactive'}
                            size="sm"
                          />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm w-32">
                          {!account.isSystem ? (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() =>
                                  setEditForm({
                                    id: account.id,
                                    name: account.name,
                                    description: account.description || '',
                                    isActive: account.isActive,
                                  })
                                }
                                title="Edit"
                                className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                <i className="bx bx-edit" aria-hidden="true"></i>
                              </button>
                              <button
                                onClick={() => toggleActive(account)}
                                title={account.isActive ? 'Deactivate' : 'Activate'}
                                className={`h-9 w-9 inline-flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 ${
                                  account.isActive ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                                }`}
                              >
                                <i className={`bx ${account.isActive ? 'bx-hide' : 'bx-show'}`} aria-hidden="true"></i>
                              </button>
                            </div>
                          ) : (
                            <i className="bx bx-lock-alt text-gray-300 dark:text-gray-600 p-2" aria-hidden="true" title="System account (locked)"></i>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}

      {/* Add account modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Account" maxWidth="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Code"
              name="account-code"
              required
              value={addForm.code}
              onChange={(v) => setAddForm((f) => ({ ...f, code: v }))}
              placeholder="e.g. 1200"
            />
            <FormField
              label="Type"
              name="account-type"
              type="select"
              required
              value={addForm.type}
              onChange={(v) => setAddForm((f) => ({ ...f, type: v as AccountType, parentId: '' }))}
              placeholder="Select type"
              options={TYPE_ORDER.map((t) => ({ value: t, label: TYPE_LABELS[t] }))}
            />
          </div>
          <FormField
            label="Name"
            name="account-name"
            required
            value={addForm.name}
            onChange={(v) => setAddForm((f) => ({ ...f, name: v }))}
            placeholder="e.g. Accounts Receivable"
          />
          <div className="space-y-1.5">
            <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300">Parent account</label>
            <SearchableSelect
              options={parentOptions}
              value={addForm.parentId}
              onChange={(v) => setAddForm((f) => ({ ...f, parentId: v }))}
              placeholder={addForm.type ? 'None (top level)' : 'Select a type first'}
              disabled={!addForm.type}
              focusColor="red"
            />
          </div>
          <FormField
            label="Description"
            name="account-description"
            type="textarea"
            value={addForm.description}
            onChange={(v) => setAddForm((f) => ({ ...f, description: v }))}
            placeholder="Optional description"
          />
          <div className="flex justify-end space-x-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowAdd(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" onClick={handleAdd} disabled={saving}>
              {saving ? 'Saving...' : 'Create Account'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit account modal */}
      <Modal isOpen={!!editForm} onClose={() => setEditForm(null)} title="Edit Account" maxWidth="lg">
        {editForm && (
          <div className="space-y-4">
            <FormField
              label="Name"
              name="edit-account-name"
              required
              value={editForm.name}
              onChange={(v) => setEditForm((f) => (f ? { ...f, name: v } : f))}
            />
            <FormField
              label="Description"
              name="edit-account-description"
              type="textarea"
              value={editForm.description}
              onChange={(v) => setEditForm((f) => (f ? { ...f, description: v } : f))}
            />
            <FormField
              name="edit-account-active"
              type="checkbox"
              checked={editForm.isActive}
              onChange={(checked) => setEditForm((f) => (f ? { ...f, isActive: checked } : f))}
              checkboxLabel="Active"
            />
            <div className="flex justify-end space-x-3 pt-2">
              <Button variant="secondary" type="button" onClick={() => setEditForm(null)} disabled={saving}>
                Cancel
              </Button>
              <Button type="button" onClick={handleEdit} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        )}
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
