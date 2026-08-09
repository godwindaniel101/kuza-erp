import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { api } from '@/lib/api';
import Toast from '@/components/Toast';
import SearchableSelect from '@/components/SearchableSelect';
import PageHeader from '@/components/ui/PageHeader';
import FormField from '@/components/ui/FormField';
import Button from '@/components/ui/Button';
import { formatMoney, todayIso, useCurrency } from '@/lib/format';

interface CustomerOption {
  id: string;
  name: string;
}

interface InventoryItem {
  id: string;
  name?: string;
  salePrice?: number | string;
}

interface LineDraft {
  key: number;
  itemId: string;
  description: string;
  quantity: string;
  unitPrice: string;
  taxRate: string;
  discount: string;
}

let lineKey = 0;
const newLine = (): LineDraft => ({
  key: ++lineKey,
  itemId: '',
  description: '',
  quantity: '1',
  unitPrice: '',
  taxRate: '',
  discount: '',
});

const CURRENCIES = ['NGN', 'USD', 'EUR', 'GBP', 'KES'];

export default function NewInvoicePage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const defaultCurrency = useCurrency();
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [issueDate, setIssueDate] = useState(todayIso());
  const [dueDate, setDueDate] = useState(todayIso());
  const [currency, setCurrency] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<LineDraft[]>([newLine()]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const effectiveCurrency = currency || defaultCurrency;

  useEffect(() => {
    const load = async () => {
      try {
        const [customersRes, itemsRes] = await Promise.all([
          api.get<{ success: boolean; data: { items: CustomerOption[] } }>('/customers?page=1&limit=100'),
          api.get<{ success: boolean; data: InventoryItem[] }>('/ims/inventory'),
        ]);
        if (customersRes.success) setCustomers(customersRes.data.items || []);
        if (itemsRes.success) setItems(itemsRes.data || []);
      } catch (err: any) {
        console.error('Failed to load form data:', err);
        setToast({ message: err.response?.data?.message || t('invoices.failedToLoadCustomersOrItems', 'Failed to load customers or items'), type: 'error' });
      }
    };
    load();
  }, []);

  const updateLine = (key: number, patch: Partial<LineDraft>) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  };

  const pickItem = (key: number, itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (item) {
      updateLine(key, {
        itemId,
        description: item.name || '',
        unitPrice: String(Number(item.salePrice || 0)),
        quantity: '1',
      });
    } else {
      updateLine(key, { itemId });
    }
  };

  const removeLine = (key: number) => {
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.key !== key) : prev));
  };

  const lineAmounts = (l: LineDraft) => {
    const qty = Number(l.quantity) || 0;
    const price = Number(l.unitPrice) || 0;
    const base = qty * price;
    const tax = base * ((Number(l.taxRate) || 0) / 100);
    const discount = Number(l.discount) || 0;
    return { base, tax, discount, total: base + tax - discount };
  };

  const subtotal = lines.reduce((s, l) => s + lineAmounts(l).base, 0);
  const taxTotal = lines.reduce((s, l) => s + lineAmounts(l).tax, 0);
  const discountTotal = lines.reduce((s, l) => s + lineAmounts(l).discount, 0);
  const grandTotal = subtotal + taxTotal - discountTotal;

  const validLines = lines.filter((l) => l.description.trim() && (Number(l.quantity) || 0) > 0);
  const canSave = !!customerId && !!issueDate && !!dueDate && validLines.length > 0 && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const res = await api.post<{ success: boolean; data: { id: string } }>('/invoices', {
        customerId,
        issueDate,
        dueDate,
        currency: defaultCurrency,
        notes: notes.trim() || undefined,
        lines: validLines.map((l) => ({
          itemId: l.itemId || undefined,
          description: l.description.trim(),
          quantity: Number(l.quantity),
          unitPrice: Number(l.unitPrice) || 0,
          taxRate: l.taxRate !== '' ? Number(l.taxRate) : undefined,
          discount: l.discount !== '' ? Number(l.discount) : undefined,
        })),
      });
      if (res.success && res.data?.id) {
        router.push(`/sales/invoices/${res.data.id}`);
      } else {
        router.push('/sales/invoices');
      }
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || t('invoices.failedToCreateInvoice', 'Failed to create invoice'), type: 'error' });
      setSaving(false);
    }
  };

  return (
    <div className="kz-stagger w-full max-w-3xl space-y-4">
      <PageHeader
        title={t('invoices.newInvoice', 'New Invoice')}
        subtitle={t('invoices.newSubtitle', 'Pick items from inventory or add free-text lines')}
        breadcrumbs={[{ label: t('sales.sales', 'Sales') }, { label: t('invoices.invoices', 'Invoices'), href: '/sales/invoices' }, { label: t('invoices.new', 'New') }]}
      />

      {/* Header fields */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 p-5 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-1.5">
          <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300">
            {t('sales.customer', 'Customer')}<span className="text-red-500 ml-0.5">*</span>
          </label>
          <SearchableSelect
            options={customers.map((c) => ({ value: c.id, label: c.name }))}
            value={customerId}
            onChange={setCustomerId}
            placeholder={t('invoices.selectCustomer', 'Select customer...')}
            focusColor="red"
            size="sm"
          />
        </div>
        <FormField label={t('invoices.issueDate', 'Issue Date')} name="invoice-issue" type="date" required value={issueDate} onChange={setIssueDate} />
        <FormField label={t('invoices.dueDate', 'Due Date')} name="invoice-due" type="date" required value={dueDate} onChange={setDueDate} />
        {/* Single-currency: invoices use the business currency (Settings > General). */}
      </div>

      {/* Line editor */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 overflow-visible mb-6">
        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 grid grid-cols-12 gap-3 text-2xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase">
          <div className="col-span-2">{t('invoices.item', 'Item')}</div>
          <div className="col-span-3">{t('description', 'Description')}</div>
          <div className="col-span-1 text-right">{t('invoices.qty', 'Qty')}</div>
          <div className="col-span-2 text-right">{t('invoices.unitPrice', 'Unit Price')}</div>
          <div className="col-span-1 text-right">{t('invoices.taxPercent', 'Tax %')}</div>
          <div className="col-span-1 text-right">{t('invoices.discount', 'Discount')}</div>
          <div className="col-span-1 text-right">{t('invoices.total', 'Total')}</div>
          <div className="col-span-1"></div>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {lines.map((line) => {
            const amounts = lineAmounts(line);
            return (
              <div key={line.key} className="px-6 py-3 grid grid-cols-12 gap-3 items-center">
                <div className="col-span-2">
                  <SearchableSelect
                    options={[{ value: '', label: t('invoices.freeText', 'Free text') }, ...items.map((i) => ({ value: i.id, label: i.name || i.id }))]}
                    value={line.itemId}
                    onChange={(v) => pickItem(line.key, v)}
                    placeholder={t('invoices.itemPlaceholder', 'Item...')}
                    focusColor="red"
                    size="sm"
                  />
                </div>
                <div className="col-span-3">
                  <input
                    type="text"
                    value={line.description}
                    onChange={(e) => updateLine(line.key, { description: e.target.value })}
                    placeholder={t('invoices.lineDescription', 'Line description')}
                    className="h-9 w-full px-3 text-[13px] border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-accent-ring"
                  />
                </div>
                <div className="col-span-1">
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={line.quantity}
                    onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
                    aria-label={t('invoices.quantity', 'Quantity')}
                    className="h-9 w-full px-2 text-[13px] text-right border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-accent-ring"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={line.unitPrice}
                    onChange={(e) => updateLine(line.key, { unitPrice: e.target.value })}
                    placeholder="0.00"
                    aria-label={t('invoices.unitPrice', 'Unit Price')}
                    className="h-9 w-full px-3 text-[13px] text-right border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-accent-ring"
                  />
                </div>
                <div className="col-span-1">
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={line.taxRate}
                    onChange={(e) => updateLine(line.key, { taxRate: e.target.value })}
                    placeholder="0"
                    aria-label={t('invoices.taxRate', 'Tax rate')}
                    className="h-9 w-full px-2 text-[13px] text-right border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-accent-ring"
                  />
                </div>
                <div className="col-span-1">
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={line.discount}
                    onChange={(e) => updateLine(line.key, { discount: e.target.value })}
                    placeholder="0.00"
                    aria-label={t('invoices.discount', 'Discount')}
                    className="h-9 w-full px-2 text-[13px] text-right border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-accent-ring"
                  />
                </div>
                <div className="col-span-1 text-right text-sm font-medium tabular-nums text-gray-900 dark:text-white whitespace-nowrap">
                  {formatMoney(amounts.total, effectiveCurrency)}
                </div>
                <div className="col-span-1 text-right">
                  <button
                    type="button"
                    onClick={() => removeLine(line.key)}
                    disabled={lines.length <= 1}
                    title={t('invoices.removeLine', 'Remove line')}
                    className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <i className="bx bx-trash" aria-hidden="true"></i>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex items-start justify-between flex-wrap gap-4">
          <Button variant="ghost" size="sm" type="button" onClick={() => setLines((prev) => [...prev, newLine()])}>
            <i className="bx bx-plus"></i>
            {t('invoices.addLine', 'Add line')}
          </Button>
          {/* Totals footer */}
          <div className="text-sm space-y-1 min-w-[240px]">
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>{t('invoices.subtotal', 'Subtotal')}</span>
              <span className="tabular-nums">{formatMoney(subtotal, effectiveCurrency)}</span>
            </div>
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>{t('invoices.tax', 'Tax')}</span>
              <span className="tabular-nums">{formatMoney(taxTotal, effectiveCurrency)}</span>
            </div>
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>{t('invoices.discount', 'Discount')}</span>
              <span className="tabular-nums">-{formatMoney(discountTotal, effectiveCurrency)}</span>
            </div>
            <div className="flex justify-between font-semibold text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-700 pt-1">
              <span>{t('invoices.total', 'Total')}</span>
              <span className="tabular-nums">{formatMoney(grandTotal, effectiveCurrency)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 p-5 mb-6">
        <FormField
          label={t('invoices.notes', 'Notes')}
          name="invoice-notes"
          type="textarea"
          value={notes}
          onChange={setNotes}
          placeholder={t('invoices.notesPlaceholder', 'Payment terms, thank-you note, etc.')}
        />
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="secondary" type="button" onClick={() => router.push('/sales/invoices')}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button type="button" onClick={handleSave} disabled={!canSave}>
          {saving ? t('invoices.creating', 'Creating...') : t('invoices.createInvoice', 'Create Invoice')}
        </Button>
      </div>

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
