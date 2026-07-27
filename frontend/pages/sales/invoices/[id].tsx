import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { api } from '@/lib/api';
import Toast from '@/components/Toast';
import Modal from '@/components/Modal';
import PageHeader from '@/components/ui/PageHeader';
import FormField from '@/components/ui/FormField';
import Button from '@/components/ui/Button';
import InvoiceStatusBadge from '@/components/ui/InvoiceStatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import { Skeleton, TableSkeleton } from '@/components/ui/Skeleton';
import { formatMoney, formatDate, todayIso, useCurrency, resolveImageUrl } from '@/lib/format';
import { InvoiceSettingsShape } from '@/components/invoicing/InvoicePreview';

const DEFAULT_ACCENT = '#2e56d3';

interface InvoiceLine {
  id: string;
  itemId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  discount?: number;
  lineTotal: number;
}

interface Payment {
  id: string;
  amount: number;
  method: string;
  reference?: string;
  date: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customer?: { name: string; email?: string; address?: string };
  issueDate: string;
  dueDate: string;
  status: 'DRAFT' | 'SENT' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'VOID';
  currency?: string;
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  total: number;
  amountPaid: number;
  balance: number;
  notes?: string;
  networkOrderId?: string | null;
  lines: InvoiceLine[];
  payments: Payment[];
}

interface PaymentForm {
  amount: string;
  method: string;
  reference: string;
  date: string;
}

export default function InvoiceDetailPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { id } = router.query;
  const settingsCurrency = useCurrency();
  const PAYMENT_METHODS = [
    { value: 'CASH', label: t('invoices.methodCash', 'Cash') },
    { value: 'BANK_TRANSFER', label: t('invoices.methodBankTransfer', 'Bank transfer') },
    { value: 'CARD', label: t('invoices.methodCard', 'Card') },
    { value: 'MOBILE_MONEY', label: t('invoices.methodMobileMoney', 'Mobile money') },
    { value: 'OTHER', label: t('invoices.methodOther', 'Other') },
  ];
  const methodLabel = (method: string) => PAYMENT_METHODS.find((m) => m.value === method)?.label || method;
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [settings, setSettings] = useState<InvoiceSettingsShape | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [paymentForm, setPaymentForm] = useState<PaymentForm | null>(null);
  const [confirmAction, setConfirmAction] = useState<'send' | 'void' | null>(null);
  const [acting, setActing] = useState(false);

  const currency = invoice?.currency || settingsCurrency;

  const loadInvoice = useCallback(async () => {
    if (!id || typeof id !== 'string') return;
    setLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: Invoice }>(`/invoices/${id}`);
      if (res.success) setInvoice(res.data);
    } catch (err: any) {
      console.error('Failed to load invoice:', err);
      setNotFound(true);
      setToast({ message: err.response?.data?.message || t('invoices.failedToLoadInvoice', 'Failed to load invoice'), type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadInvoice();
  }, [loadInvoice]);

  // Load tenant invoice settings (branding, business/payment details, footer).
  // Best-effort: if it fails, the document falls back to the bare header.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<{ success: boolean; data: InvoiceSettingsShape }>('/invoicing/settings');
        if (!cancelled && res.success) setSettings(res.data);
      } catch (err) {
        console.error('Failed to load invoice settings:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openPaymentModal = () => {
    if (!invoice) return;
    setPaymentForm({
      amount: String(Number(invoice.balance) || 0),
      method: 'BANK_TRANSFER',
      reference: '',
      date: todayIso(),
    });
  };

  const handleRecordPayment = async () => {
    if (!invoice || !paymentForm) return;
    const amount = Number(paymentForm.amount);
    if (!amount || amount <= 0) {
      setToast({ message: t('invoices.enterValidPaymentAmount', 'Enter a valid payment amount'), type: 'error' });
      return;
    }
    setActing(true);
    try {
      await api.post(`/invoices/${invoice.id}/payments`, {
        amount,
        method: paymentForm.method,
        reference: paymentForm.reference.trim() || undefined,
        date: paymentForm.date,
      });
      setToast({ message: t('invoices.paymentRecorded', 'Payment recorded'), type: 'success' });
      setPaymentForm(null);
      await loadInvoice();
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || t('invoices.failedToRecordPayment', 'Failed to record payment'), type: 'error' });
    } finally {
      setActing(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!invoice || !confirmAction) return;
    setActing(true);
    try {
      await api.post(`/invoices/${invoice.id}/${confirmAction}`);
      setToast({ message: confirmAction === 'send' ? t('invoices.invoiceSent', 'Invoice sent') : t('invoices.invoiceVoided', 'Invoice voided'), type: 'success' });
      setConfirmAction(null);
      await loadInvoice();
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || t('invoices.failedToActInvoice', 'Failed to {{action}} invoice', { action: confirmAction }), type: 'error' });
    } finally {
      setActing(false);
    }
  };

  const canRecordPayment =
    invoice &&
    !invoice.networkOrderId &&
    !['PAID', 'VOID', 'DRAFT'].includes(invoice.status) &&
    Number(invoice.balance) > 0;

  const accent = settings?.accentColor && /^#/.test(settings.accentColor) ? settings.accentColor : DEFAULT_ACCENT;
  const showLogo = !!settings && settings.showLogo !== false && !!settings.logoUrl;
  const showPaymentDetails =
    !!settings &&
    settings.showPaymentDetails !== false &&
    !!(settings.bankName || settings.accountNumber || settings.paymentInstructions);

  return (
    <div className="w-full max-w-4xl space-y-5">
      {/* Print CSS: hide chrome, show only the invoice document */}
      <style jsx global>{`
        @media print {
          aside,
          header,
          nav,
          .no-print {
            display: none !important;
          }
          main {
            margin: 0 !important;
            padding: 0 !important;
          }
          body {
            background: white !important;
          }
          #invoice-document {
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>

      <div className="no-print">
        <PageHeader
          title={invoice ? t('invoices.invoiceTitle', 'Invoice {{number}}', { number: invoice.invoiceNumber }) : t('invoices.invoice', 'Invoice')}
          subtitle={invoice?.customer?.name}
          breadcrumbs={[
            { label: t('sales.sales', 'Sales') },
            { label: t('invoices.invoices', 'Invoices'), href: '/sales/invoices' },
            { label: invoice?.invoiceNumber || t('invoices.detail', 'Detail') },
          ]}
          actions={
            invoice ? (
              <>
                <Button variant="secondary" size="sm" onClick={() => window.print()}>
                  <i className="bx bx-printer"></i>
                  {t('invoices.print', 'Print')}
                </Button>
                {invoice.status === 'DRAFT' && (
                  <Button size="sm" onClick={() => setConfirmAction('send')}>
                    <i className="bx bx-send"></i>
                    {t('invoices.send', 'Send')}
                  </Button>
                )}
                {canRecordPayment && (
                  <Button size="sm" onClick={openPaymentModal}>
                    <i className="bx bx-money"></i>
                    {t('invoices.recordPayment', 'Record Payment')}
                  </Button>
                )}
                {invoice.networkOrderId && !['PAID', 'VOID'].includes(invoice.status) && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                    <i className="bx bx-info-circle text-sm" aria-hidden="true"></i>
                    {t('invoices.managedByOrder', 'Payment for this invoice is managed from the linked purchase order.')}
                  </span>
                )}
                {invoice.status !== 'VOID' && invoice.status !== 'PAID' && (
                  <Button variant="danger" size="sm" onClick={() => setConfirmAction('void')}>
                    <i className="bx bx-block"></i>
                    {t('invoices.void', 'Void')}
                  </Button>
                )}
              </>
            ) : undefined
          }
        />
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <TableSkeleton rows={4} columns={5} />
        </div>
      ) : notFound || !invoice ? (
        <EmptyState
          icon="bx-error-circle"
          title={t('invoices.invoiceNotFound', 'Invoice not found')}
          description={t('invoices.invoiceNotFoundDesc', 'It may have been removed, or the link is invalid')}
          actions={
            <Button href="/sales/invoices" size="sm">
              {t('invoices.backToInvoices', 'Back to Invoices')}
            </Button>
          }
        />
      ) : (
        <>
          {/* Print-friendly invoice document */}
          <div
            id="invoice-document"
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 p-8 mb-6 max-w-4xl"
          >
            {/* Header — business "From" block (from invoice settings) + invoice meta */}
            <div className="flex items-start justify-between flex-wrap gap-4 pb-6 border-b border-gray-200 dark:border-gray-700">
              <div className="min-w-0">
                {showLogo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={resolveImageUrl(settings?.logoUrl)}
                    alt=""
                    className="mb-2 h-12 w-auto max-w-[180px] object-contain"
                  />
                )}
                {settings?.displayName && (
                  <p className="text-base font-semibold text-gray-900 dark:text-white">{settings.displayName}</p>
                )}
                {settings?.addressLine && <p className="text-sm text-gray-500 dark:text-gray-400">{settings.addressLine}</p>}
                {settings?.phone && <p className="text-sm text-gray-500 dark:text-gray-400">{settings.phone}</p>}
                {settings?.email && <p className="text-sm text-gray-500 dark:text-gray-400">{settings.email}</p>}
                {settings?.website && <p className="text-sm text-gray-500 dark:text-gray-400">{settings.website}</p>}
                {settings?.taxId && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('invoices.taxIdLabel', 'Tax ID')}: {settings.taxId}</p>
                )}
              </div>
              <div className="text-right">
                <h2 className="text-2xl font-bold tracking-tight" style={{ color: accent }}>
                  {t('invoices.invoiceUpper', 'INVOICE')}
                </h2>
                <p className="mt-0.5 font-mono text-sm text-gray-500 dark:text-gray-400">{invoice.invoiceNumber}</p>
                <div className="mt-2 flex justify-end">
                  <InvoiceStatusBadge status={invoice.status} />
                </div>
                <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  <p>{t('invoices.issuedLabel', 'Issued: {{date}}', { date: formatDate(invoice.issueDate) })}</p>
                  <p>{t('invoices.dueLabel', 'Due: {{date}}', { date: formatDate(invoice.dueDate) })}</p>
                </div>
              </div>
            </div>

            {/* Bill to */}
            <div className="py-6 border-b border-gray-200 dark:border-gray-700">
              <p className="text-2xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase mb-1">{t('invoices.billTo', 'Bill To')}</p>
              <p className="font-semibold text-gray-900 dark:text-white">{invoice.customer?.name || '-'}</p>
              {invoice.customer?.email && <p className="text-sm text-gray-500 dark:text-gray-400">{invoice.customer.email}</p>}
              {invoice.customer?.address && (
                <p className="text-sm text-gray-500 dark:text-gray-400">{invoice.customer.address}</p>
              )}
            </div>

            {/* Lines */}
            <div className="py-6 overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="py-2 text-left text-2xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase">{t('description', 'Description')}</th>
                    <th className="py-2 text-right text-2xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase">{t('invoices.qty', 'Qty')}</th>
                    <th className="py-2 text-right text-2xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase">{t('invoices.unitPrice', 'Unit Price')}</th>
                    <th className="py-2 text-right text-2xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase">{t('invoices.taxPercent', 'Tax %')}</th>
                    <th className="py-2 text-right text-2xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase">{t('invoices.amount', 'Amount')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
                  {invoice.lines.map((line) => (
                    <tr key={line.id}>
                      <td className="py-3 text-sm text-gray-900 dark:text-white">{line.description}</td>
                      <td className="py-3 text-sm text-right text-gray-700 dark:text-gray-300">{line.quantity}</td>
                      <td className="py-3 text-sm text-right text-gray-700 dark:text-gray-300">
                        {formatMoney(line.unitPrice, currency)}
                      </td>
                      <td className="py-3 text-sm text-right text-gray-700 dark:text-gray-300">
                        {line.taxRate != null && Number(line.taxRate) !== 0 ? `${line.taxRate}%` : '-'}
                      </td>
                      <td className="py-3 text-sm text-right font-medium text-gray-900 dark:text-white">
                        {formatMoney(line.lineTotal, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="w-full sm:w-72 text-sm space-y-2">
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>{t('invoices.subtotal', 'Subtotal')}</span>
                  <span>{formatMoney(invoice.subtotal, currency)}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>{t('invoices.tax', 'Tax')}</span>
                  <span>{formatMoney(invoice.taxTotal, currency)}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>{t('invoices.discount', 'Discount')}</span>
                  <span>-{formatMoney(invoice.discountTotal, currency)}</span>
                </div>
                <div className="flex justify-between font-semibold text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-700 pt-2">
                  <span>{t('invoices.total', 'Total')}</span>
                  <span>{formatMoney(invoice.total, currency)}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>{t('invoices.amountPaid', 'Amount Paid')}</span>
                  <span>{formatMoney(invoice.amountPaid, currency)}</span>
                </div>
                <div className="flex justify-between font-bold text-gray-900 dark:text-white text-base border-t border-gray-200 dark:border-gray-700 pt-2">
                  <span>{t('invoices.balanceDue', 'Balance Due')}</span>
                  <span>{formatMoney(invoice.balance, currency)}</span>
                </div>
              </div>
            </div>

            {invoice.notes && (
              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-2xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase mb-1">{t('invoices.notes', 'Notes')}</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{invoice.notes}</p>
              </div>
            )}

            {/* Payment details (from invoice settings) */}
            {showPaymentDetails && (
              <div className="mt-6 rounded-lg bg-gray-50 p-4 dark:bg-gray-800/50">
                <p className="mb-1 text-2xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {t('invoices.paymentDetails', 'Payment details')}
                </p>
                {settings?.bankName && (
                  <p className="text-sm text-gray-700 dark:text-gray-300">{t('invoices.bank', 'Bank')}: {settings.bankName}</p>
                )}
                {settings?.accountName && (
                  <p className="text-sm text-gray-700 dark:text-gray-300">{t('invoices.accountName', 'Account name')}: {settings.accountName}</p>
                )}
                {settings?.accountNumber && (
                  <p className="text-sm text-gray-700 dark:text-gray-300">{t('invoices.accountNumber', 'Account no.')}: {settings.accountNumber}</p>
                )}
                {settings?.paymentInstructions && (
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line">{settings.paymentInstructions}</p>
                )}
              </div>
            )}

            {/* Footer note + terms (from invoice settings) */}
            {(settings?.terms || settings?.footerNote) && (
              <div className="mt-6 border-t border-gray-200 pt-4 dark:border-gray-700">
                {settings?.terms && (
                  <>
                    <p className="mb-1 text-2xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      {t('invoices.terms', 'Terms')}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-line">{settings.terms}</p>
                  </>
                )}
                {settings?.footerNote && (
                  <p className="mt-3 text-center text-xs italic text-gray-500 dark:text-gray-400">{settings.footerNote}</p>
                )}
              </div>
            )}
          </div>

          {/* Payments history */}
          <div className="no-print max-w-4xl">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">{t('invoices.payments', 'Payments')}</h2>
            {(invoice.payments || []).length === 0 ? (
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 p-6 text-sm text-gray-500 dark:text-gray-400">
                {t('invoices.noPaymentsYet', 'No payments recorded yet.')}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">{t('invoices.date', 'Date')}</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">{t('invoices.method', 'Method')}</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">{t('invoices.reference', 'Reference')}</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">{t('invoices.amount', 'Amount')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {invoice.payments.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{formatDate(p.date)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{methodLabel(p.method)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{p.reference || '-'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900 dark:text-white">
                          {formatMoney(p.amount, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Record payment modal */}
      <Modal isOpen={!!paymentForm} onClose={() => setPaymentForm(null)} title={t('invoices.recordPayment', 'Record Payment')} maxWidth="md">
        {paymentForm && (
          <div className="space-y-4">
            <FormField
              label={t('invoices.amountWithCurrency', 'Amount ({{currency}})', { currency })}
              name="payment-amount"
              type="number"
              required
              min={0}
              step={0.01}
              value={paymentForm.amount}
              onChange={(v) => setPaymentForm((f) => (f ? { ...f, amount: v } : f))}
              help={invoice ? t('invoices.outstandingBalance', 'Outstanding balance: {{amount}}', { amount: formatMoney(invoice.balance, currency) }) : undefined}
            />
            <FormField
              label={t('invoices.method', 'Method')}
              name="payment-method"
              type="select"
              required
              value={paymentForm.method}
              onChange={(v) => setPaymentForm((f) => (f ? { ...f, method: v } : f))}
              options={PAYMENT_METHODS}
            />
            <FormField
              label={t('invoices.reference', 'Reference')}
              name="payment-reference"
              value={paymentForm.reference}
              onChange={(v) => setPaymentForm((f) => (f ? { ...f, reference: v } : f))}
              placeholder={t('invoices.referencePlaceholder', 'Transaction reference (optional)')}
            />
            <FormField
              label={t('invoices.date', 'Date')}
              name="payment-date"
              type="date"
              required
              value={paymentForm.date}
              onChange={(v) => setPaymentForm((f) => (f ? { ...f, date: v } : f))}
            />
            <div className="flex justify-end space-x-3 pt-2">
              <Button variant="secondary" type="button" onClick={() => setPaymentForm(null)} disabled={acting}>
                {t('cancel', 'Cancel')}
              </Button>
              <Button type="button" onClick={handleRecordPayment} disabled={acting}>
                {acting ? t('invoices.saving', 'Saving...') : t('invoices.recordPayment', 'Record Payment')}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Send / Void confirm */}
      <Modal
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        title={confirmAction === 'send' ? t('invoices.sendInvoice', 'Send Invoice') : t('invoices.voidInvoice', 'Void Invoice')}
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            {confirmAction === 'send'
              ? t('invoices.sendConfirm', 'Mark this invoice as sent to the customer? It will no longer be editable as a draft.')
              : t('invoices.voidConfirm', 'Voiding cancels this invoice permanently. It will no longer count toward receivables. This cannot be undone.')}
          </p>
          <div className="flex justify-end space-x-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setConfirmAction(null)} disabled={acting}>
              {t('cancel', 'Cancel')}
            </Button>
            <Button variant="danger" type="button" onClick={handleConfirmAction} disabled={acting}>
              {acting ? t('invoices.working', 'Working...') : confirmAction === 'send' ? t('invoices.sendInvoice', 'Send Invoice') : t('invoices.voidInvoice', 'Void Invoice')}
            </Button>
          </div>
        </div>
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
