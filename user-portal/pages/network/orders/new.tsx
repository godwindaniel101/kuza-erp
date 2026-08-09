import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { api } from '@/lib/api';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Toast from '@/components/Toast';
import { formatMoney } from '@/lib/format';

interface Partnership {
  status: string;
  role: 'buyer' | 'supplier';
  counterpart: { tenantId: string; name: string; slug: string } | null;
}

interface LineItem {
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
}

const emptyLine = (): LineItem => ({ description: '', quantity: '1', unit: '', unitPrice: '' });

const inputClass =
  'w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus-visible:ring-2 focus-visible:ring-brand-500 focus:outline-none';
const labelClass = 'block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1';

export default function NewOrderPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<{ tenantId: string; name: string }[]>([]);
  const [supplierTenantId, setSupplierTenantId] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [note, setNote] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [items, setItems] = useState<LineItem[]>([emptyLine()]);
  const [saving, setSaving] = useState<false | 'draft' | 'send'>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const loadSuppliers = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; data: Partnership[] }>('/network/partnerships');
      if (res.success) {
        const active = (res.data || [])
          .filter((p) => p.role === 'buyer' && p.status === 'active' && p.counterpart)
          .map((p) => ({ tenantId: p.counterpart!.tenantId, name: p.counterpart!.name }));
        setSuppliers(active);
      }
    } catch {
      /* non-critical — buyer can still type a supplier name */
    }
  }, []);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  // Prefill from Market "Order" links (e.g. /network/orders/new?supplierTenantId=…&itemName=…).
  // Applied once, after the router is ready, so it never clobbers the user's edits.
  const prefilledRef = useRef(false);
  useEffect(() => {
    if (prefilledRef.current || !router.isReady) return;
    prefilledRef.current = true;
    const q = router.query;
    const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || '';
    const qSupplierTenantId = str(q.supplierTenantId);
    const qSupplierName = str(q.supplierName);
    const qItemName = str(q.itemName);
    const qUnitPrice = str(q.unitPrice);
    const qUnit = str(q.unit);

    if (qSupplierTenantId && qSupplierName) {
      setSupplierTenantId(qSupplierTenantId);
      setSupplierName(qSupplierName);
    }
    if (qItemName) {
      setItems([{ description: qItemName, quantity: '1', unit: qUnit, unitPrice: qUnitPrice }]);
    }
  }, [router.isReady, router.query]);

  const setItem = (i: number, key: keyof LineItem, value: string) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, [key]: value } : it)));
  const addItem = () => setItems((prev) => [...prev, emptyLine()]);
  const removeItem = (i: number) => setItems((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));

  const total = useMemo(
    () => items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0),
    [items],
  );

  const onPickSupplier = (tenantId: string) => {
    setSupplierTenantId(tenantId);
    const s = suppliers.find((x) => x.tenantId === tenantId);
    if (s) setSupplierName(s.name);
  };

  const validItems = items.filter((it) => it.description.trim() && Number(it.quantity) > 0);

  const submit = async (mode: 'draft' | 'send') => {
    if (!supplierName.trim()) {
      setToast({ message: t('orders.supplierRequired', 'Choose or name a supplier'), type: 'error' });
      return;
    }
    if (validItems.length === 0) {
      setToast({ message: t('orders.itemsRequired', 'Add at least one item with a quantity'), type: 'error' });
      return;
    }
    setSaving(mode);
    try {
      const res = await api.post<{ success: boolean; data: { id: string } }>('/network/orders', {
        supplierTenantId: supplierTenantId || undefined,
        supplierName: supplierName.trim(),
        note: note.trim() || undefined,
        expectedDate: expectedDate || undefined,
        submit: mode === 'send',
        items: validItems.map((it) => ({
          description: it.description.trim(),
          quantity: Number(it.quantity),
          unit: it.unit.trim() || undefined,
          unitPrice: it.unitPrice === '' ? undefined : Number(it.unitPrice),
        })),
      });
      if (res.success) {
        setToast({
          message: mode === 'send' ? t('orders.sent', 'Request sent') : t('orders.draftSaved', 'Draft saved'),
          type: 'success',
        });
        router.push(`/network/orders/${res.data.id}`);
      }
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setToast({ message: e?.response?.data?.message || t('orders.createFailed', 'Failed to create order'), type: 'error' });
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <PageHeader
        title={t('orders.newTitle', 'New purchase request')}
        subtitle={t('orders.newSubtitle', 'Request items from a supplier.')}
        breadcrumbs={[{ label: t('orders.title', 'Purchase orders'), href: '/network/orders' }, { label: t('orders.newRequest', 'New request') }]}
      />

      <div className="mx-auto w-full max-w-3xl space-y-4">
        {/* Supplier + meta */}
        <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>{t('supplier', 'Supplier')}</label>
              {suppliers.length > 0 ? (
                <select className={inputClass} value={supplierTenantId} onChange={(e) => onPickSupplier(e.target.value)}>
                  <option value="">{t('orders.selectSupplier', 'Select a connected supplier…')}</option>
                  {suppliers.map((s) => (
                    <option key={s.tenantId} value={s.tenantId}>
                      {s.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className={inputClass}
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder={t('orders.supplierName', 'Supplier name')}
                />
              )}
              {suppliers.length > 0 && (
                <p className="mt-1 text-[11px] text-gray-400">
                  {t('orders.connectedOnly', 'Only your connected suppliers are shown.')}
                </p>
              )}
            </div>
            <div>
              <label className={labelClass}>{t('orders.expectedDate', 'Expected delivery')}</label>
              <input type="date" className={inputClass} value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
            </div>
          </div>
          <div className="mt-4">
            <label className={labelClass}>{t('orders.note', 'Note to supplier')}</label>
            <textarea rows={2} className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </section>

        {/* Line items */}
        <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">{t('orders.items', 'Items')}</h2>
            <Button variant="secondary" size="sm" onClick={addItem}>
              <i className="bx bx-plus" aria-hidden="true"></i>
              {t('orders.addItem', 'Add item')}
            </Button>
          </div>
          <div className="space-y-2">
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-12 items-center gap-2">
                <input
                  className={`${inputClass} col-span-12 sm:col-span-5`}
                  value={it.description}
                  onChange={(e) => setItem(i, 'description', e.target.value)}
                  placeholder={t('orders.itemDescription', 'Item description')}
                />
                <input
                  type="number"
                  min={0}
                  step="any"
                  className={`${inputClass} col-span-4 sm:col-span-2`}
                  value={it.quantity}
                  onChange={(e) => setItem(i, 'quantity', e.target.value)}
                  placeholder={t('orders.qty', 'Qty')}
                />
                <input
                  className={`${inputClass} col-span-4 sm:col-span-2`}
                  value={it.unit}
                  onChange={(e) => setItem(i, 'unit', e.target.value)}
                  placeholder={t('orders.unit', 'Unit')}
                />
                <input
                  type="number"
                  min={0}
                  step="any"
                  className={`${inputClass} col-span-3 sm:col-span-2`}
                  value={it.unitPrice}
                  onChange={(e) => setItem(i, 'unitPrice', e.target.value)}
                  placeholder={t('orders.price', 'Price')}
                />
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  className="col-span-1 flex h-9 items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  aria-label={t('remove', 'Remove')}
                >
                  <i className="bx bx-trash text-lg" aria-hidden="true"></i>
                </button>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-end border-t border-gray-100 dark:border-gray-800 pt-3 text-sm">
            <span className="text-gray-500 dark:text-gray-400">{t('orders.estTotal', 'Estimated total')}:&nbsp;</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">{formatMoney(total)}</span>
          </div>
        </section>

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => submit('draft')} loading={saving === 'draft'} disabled={!!saving}>
            {t('orders.saveDraft', 'Save draft')}
          </Button>
          <Button variant="primary" onClick={() => submit('send')} loading={saving === 'send'} disabled={!!saving}>
            {t('orders.sendRequest', 'Send request')}
          </Button>
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => ({
  props: { ...(await serverSideTranslations(locale || 'en', ['common'])) },
});
