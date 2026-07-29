import { useCallback, useEffect, useMemo, useState } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import DataTable, { DataTableColumn } from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/Modal';
import FormField from '@/components/ui/FormField';
import Toast from '@/components/Toast';
import AdminGuard from '@/components/AdminGuard';
import { APP_REGISTRY, getApp } from '@/lib/apps';
import { formatNumber } from '@/lib/format';
import { adminApi, AdminPlan, AdminPlanInput } from '@/lib/admin';

/** A plan row always has a stable id (falls back to code). */
type PlanRow = AdminPlan & { id: string };

/** Human label for a module/app key, falling back to a de-slugged string. */
function appLabel(key: string): string {
  return (
    getApp(key)?.name ||
    key.replace(/[_-]/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

const limitText = (value: number | undefined) =>
  value === -1 ? 'Unlimited' : formatNumber(value ?? 0);

interface PlanForm {
  code: string;
  name: string;
  monthlyPriceUsd: string;
  description: string;
  maxUsers: string;
  maxBranches: string;
  maxItems: string;
  modules: string[];
  isActive: boolean;
}

const emptyForm: PlanForm = {
  code: '',
  name: '',
  monthlyPriceUsd: '0',
  description: '',
  maxUsers: '3',
  maxBranches: '1',
  maxItems: '100',
  modules: [],
  isActive: true,
};

function toForm(plan: AdminPlan): PlanForm {
  return {
    code: plan.code ?? '',
    name: plan.name ?? '',
    monthlyPriceUsd: String(plan.monthlyPriceUsd ?? 0),
    description: plan.description ?? '',
    maxUsers: String(plan.limits?.maxUsers ?? 0),
    maxBranches: String(plan.limits?.maxBranches ?? 0),
    maxItems: String(plan.limits?.maxItems ?? 0),
    modules: Array.isArray(plan.limits?.modules) ? [...(plan.limits!.modules)] : [],
    isActive: plan.isActive ?? true,
  };
}

/** Parse an integer, treating blank/NaN as 0 and preserving -1 (unlimited). */
function toInt(value: string): number {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : 0;
}

function AdminPlansInner() {
  const [plans, setPlans] = useState<AdminPlan[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(
    null,
  );

  // Create/edit modal
  const [editing, setEditing] = useState<AdminPlan | null>(null); // null when creating
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<PlanForm>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof PlanForm, string>>>({});
  const [saving, setSaving] = useState(false);

  // Deactivate confirm
  const [deactivateTarget, setDeactivateTarget] = useState<AdminPlan | null>(null);
  const [deactivating, setDeactivating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      setPlans(await adminApi.listPlans());
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rows: PlanRow[] = useMemo(
    () => (plans ?? []).map((p) => ({ ...p, id: p.id || p.code })),
    [plans],
  );

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (plan: AdminPlan) => {
    setEditing(plan);
    setForm(toForm(plan));
    setErrors({});
    setModalOpen(true);
  };

  const toggleModule = (key: string) => {
    setForm((f) => ({
      ...f,
      modules: f.modules.includes(key)
        ? f.modules.filter((k) => k !== key)
        : [...f.modules, key],
    }));
  };

  const validate = (): boolean => {
    const next: Partial<Record<keyof PlanForm, string>> = {};
    if (!editing && !form.code.trim()) next.code = 'Code is required';
    if (!form.name.trim()) next.name = 'Name is required';
    const price = parseFloat(form.monthlyPriceUsd);
    if (!Number.isFinite(price) || price < 0) next.monthlyPriceUsd = 'Enter a valid price';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = async () => {
    if (saving || !validate()) return;
    setSaving(true);
    const limits = {
      maxUsers: toInt(form.maxUsers),
      maxBranches: toInt(form.maxBranches),
      maxItems: toInt(form.maxItems),
      modules: form.modules,
    };
    try {
      if (editing) {
        // Code is immutable on edit.
        const patch: Partial<AdminPlanInput> = {
          name: form.name.trim(),
          monthlyPriceUsd: parseFloat(form.monthlyPriceUsd),
          description: form.description.trim() || undefined,
          limits,
          isActive: form.isActive,
        };
        await adminApi.updatePlan(editing.code, patch);
        setToast({ message: `${form.name.trim()} updated`, type: 'success' });
      } else {
        const input: AdminPlanInput = {
          code: form.code.trim().toUpperCase(),
          name: form.name.trim(),
          monthlyPriceUsd: parseFloat(form.monthlyPriceUsd),
          description: form.description.trim() || undefined,
          limits,
          isActive: form.isActive,
        };
        await adminApi.createPlan(input);
        setToast({ message: `${input.name} created`, type: 'success' });
      }
      setModalOpen(false);
      await load();
    } catch (err: any) {
      setToast({
        message: err?.response?.data?.message || 'Could not save the plan',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async () => {
    if (!deactivateTarget || deactivating) return;
    setDeactivating(true);
    try {
      await adminApi.deletePlan(deactivateTarget.code);
      setToast({ message: `${deactivateTarget.name} deactivated`, type: 'success' });
      setDeactivateTarget(null);
      await load();
    } catch (err: any) {
      setToast({
        message: err?.response?.data?.message || 'Could not deactivate the plan',
        type: 'error',
      });
    } finally {
      setDeactivating(false);
    }
  };

  const columns: DataTableColumn<PlanRow>[] = [
    {
      key: 'name',
      label: 'Plan',
      render: (p) => (
        <div className="min-w-0">
          <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{p.name || '—'}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{p.code}</p>
        </div>
      ),
    },
    {
      key: 'price',
      label: 'Price',
      align: 'right',
      render: (p) =>
        (p.monthlyPriceUsd ?? 0) > 0 ? (
          <span className="tabular-nums text-gray-900 dark:text-gray-100">
            ${formatNumber(p.monthlyPriceUsd ?? 0, 2)}
            <span className="text-gray-400 dark:text-gray-500">/mo</span>
          </span>
        ) : (
          <span className="text-gray-500 dark:text-gray-400">Free</span>
        ),
    },
    {
      key: 'apps',
      label: 'Apps',
      cellClassName: 'whitespace-normal',
      render: (p) => {
        const mods = p.limits?.modules ?? [];
        if (mods.length === 0) return <span className="text-gray-400 dark:text-gray-500">—</span>;
        return (
          <div className="flex max-w-xs flex-wrap gap-1">
            {mods.map((m) => (
              <span
                key={m}
                className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-2xs font-medium text-gray-600 dark:text-gray-300"
              >
                {appLabel(m)}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (p) => {
        const active = p.isActive ?? true;
        return (
          <StatusBadge
            variant={active ? 'success' : 'error'}
            label={active ? 'Active' : 'Inactive'}
            size="sm"
          />
        );
      },
    },
  ];

  return (
    <div className="w-full space-y-5">
      <PageHeader
        title="Plans"
        subtitle="Subscription plans available to every business on the platform."
        count={plans?.length}
        breadcrumbs={[{ label: 'Tenants', href: '/admin' }, { label: 'Plans' }]}
        actions={
          <Button size="sm" onClick={openCreate}>
            <i className="bx bx-plus text-base" aria-hidden="true" />
            New plan
          </Button>
        }
      />

      {loadError ? (
        <EmptyState
          icon="bx-package"
          title="Couldn't load plans"
          description="The admin service didn't respond. Try again in a moment."
          actions={
            <Button size="sm" onClick={load}>
              Retry
            </Button>
          }
        />
      ) : (
        <DataTable<PlanRow>
          columns={columns}
          data={rows}
          loading={loading}
          rowActions={[
            { label: 'Edit', icon: 'bx-edit', onClick: (p) => openEdit(p) },
            {
              label: 'Deactivate',
              icon: 'bx-x-circle',
              danger: true,
              hidden: (p) => !(p.isActive ?? true),
              onClick: (p) => setDeactivateTarget(p),
            },
          ]}
          emptyState={
            <EmptyState
              icon="bx-package"
              title="No plans yet"
              description="Create the first subscription plan to get started."
              actions={
                <Button size="sm" onClick={openCreate}>
                  New plan
                </Button>
              }
            />
          }
        />
      )}

      {/* Create / edit */}
      <Modal
        isOpen={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={editing ? `Edit ${editing.name}` : 'New plan'}
        maxWidth="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} loading={saving}>
              {editing ? 'Save changes' : 'Create plan'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              label="Code"
              name="code"
              required={!editing}
              value={form.code}
              onChange={(v) => setForm((f) => ({ ...f, code: v }))}
              placeholder="STARTER"
              error={errors.code}
              disabled={!!editing}
              help={editing ? 'Code cannot be changed.' : 'Unique, uppercase identifier.'}
            />
            <FormField
              label="Name"
              name="name"
              required
              value={form.name}
              onChange={(v) => setForm((f) => ({ ...f, name: v }))}
              placeholder="Starter"
              error={errors.name}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              type="number"
              label="Monthly price (USD)"
              name="monthlyPriceUsd"
              required
              value={form.monthlyPriceUsd}
              onChange={(v) => setForm((f) => ({ ...f, monthlyPriceUsd: v }))}
              min={0}
              step={1}
              error={errors.monthlyPriceUsd}
              help="0 = free plan."
            />
            <div className="flex items-end pb-1">
              <FormField
                type="checkbox"
                name="isActive"
                label="Active"
                checked={form.isActive}
                onChange={(c) => setForm((f) => ({ ...f, isActive: c }))}
                checkboxLabel="Plan is available for selection"
              />
            </div>
          </div>

          <FormField
            type="textarea"
            label="Description"
            name="description"
            rows={2}
            value={form.description}
            onChange={(v) => setForm((f) => ({ ...f, description: v }))}
            placeholder="What this plan includes"
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField
              type="number"
              label="Max users"
              name="maxUsers"
              value={form.maxUsers}
              onChange={(v) => setForm((f) => ({ ...f, maxUsers: v }))}
              min={-1}
              help="-1 = unlimited"
            />
            <FormField
              type="number"
              label="Max branches"
              name="maxBranches"
              value={form.maxBranches}
              onChange={(v) => setForm((f) => ({ ...f, maxBranches: v }))}
              min={-1}
              help="-1 = unlimited"
            />
            <FormField
              type="number"
              label="Max items"
              name="maxItems"
              value={form.maxItems}
              onChange={(v) => setForm((f) => ({ ...f, maxItems: v }))}
              min={-1}
              help="-1 = unlimited"
            />
          </div>

          <div>
            <p className="mb-2 block text-[13px] font-medium text-gray-700 dark:text-gray-300">
              Apps included
            </p>
            <div className="grid grid-cols-1 gap-2 rounded-lg border border-gray-200 dark:border-gray-800 p-3 sm:grid-cols-2">
              {APP_REGISTRY.map((app) => {
                const checked = form.modules.includes(app.key);
                return (
                  <label
                    key={app.key}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800/60"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleModule(app.key)}
                      className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-brand-600 focus:ring-brand-500"
                    />
                    <span className="text-gray-700 dark:text-gray-300">{app.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>

      {/* Deactivate confirm */}
      <Modal
        isOpen={!!deactivateTarget}
        onClose={() => !deactivating && setDeactivateTarget(null)}
        title="Deactivate plan"
        maxWidth="md"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setDeactivateTarget(null)}
              disabled={deactivating}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={deactivate} loading={deactivating}>
              Deactivate
            </Button>
          </>
        }
      >
        {deactivateTarget && (
          <div className="space-y-2">
            <p className="text-gray-600 dark:text-gray-400">
              Deactivate{' '}
              <strong className="text-gray-900 dark:text-gray-100">{deactivateTarget.name}</strong>?
              New businesses will no longer be able to select it. Existing subscriptions are
              unaffected.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Limits: {limitText(deactivateTarget.limits?.maxUsers)} users ·{' '}
              {limitText(deactivateTarget.limits?.maxBranches)} branches ·{' '}
              {limitText(deactivateTarget.limits?.maxItems)} items.
            </p>
          </div>
        )}
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

export default function AdminPlansPage() {
  return (
    <AdminGuard>
      <AdminPlansInner />
    </AdminGuard>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale || 'en', ['common'])),
    },
  };
};
