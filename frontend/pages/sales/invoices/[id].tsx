import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
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
import { formatMoney, formatDate, todayIso, useCurrency } from '@/lib/format';

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
  lines: InvoiceLine[];
  payments: Payment[];
}

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK_TRANSFER', label: 'Bank transfer' },
  { value: 'CARD', label: 'Card' },
  { value: 'MOBILE_MONEY', label: 'Mobile money' },
  { value: 'OTHER', label: 'Other' },
];

const methodLabel = (method: string) => PAYMENT_METHODS.find((m) => m.value === method)?.label || method;

interface PaymentForm {
  amount: string;
  method: string;
  reference: string;
  date: string;
}

export default function InvoiceDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const settingsCurrency = useCurrency();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
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
      setToast({ message: err.response?.data?.message || 'Failed to load invoice', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadInvoice();
  }, [loadInvoice]);

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
      setToast({ message: 'Enter a valid payment amount', type: 'error' });
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
      setToast({ message: 'Payment recorded', type: 'success' });
      setPaymentForm(null);
      await loadInvoice();
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || 'Failed to record payment', type: 'error' });
    } finally {
      setActing(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!invoice || !confirmAction) return;
    setActing(true);
    try {
      await api.post(`/invoices/${invoice.id}/${confirmAction}`);
      setToast({ message: confirmAction === 'send' ? 'Invoice sent' : 'Invoice voided', type: 'success' });
      setConfirmAction(null);
      await loadInvoice();
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || `Failed to ${confirmAction} invoice`, type: 'error' });
    } finally {
      setActing(false);
    }
  };

  const canRecordPayment = invoice && !['PAID', 'VOID', 'DRAFT'].includes(invoice.status) && Number(invoice.balance) > 0;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
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
          title={invoice ? `Invoice ${invoice.invoiceNumber}` : 'Invoice'}
          subtitle={invoice?.customer?.name}
          breadcrumbs={[
            { label: 'Sales' },
            { label: 'Invoices', href: '/sales/invoices' },
            { label: invoice?.invoiceNumber || 'Detail' },
          ]}
          actions={
            invoice ? (
              <>
                <Button variant="secondary" size="sm" onClick={() => window.print()}>
                  <i className="bx bx-printer"></i>
                  Print
                </Button>
                {invoice.status === 'DRAFT' && (
                  <Button size="sm" onClick={() => setConfirmAction('send')}>
                    <i className="bx bx-send"></i>
                    Send
                  </Button>
                )}
                {canRecordPayment && (
                  <Button size="sm" onClick={openPaymentModal}>
                    <i className="bx bx-money"></i>
                    Record Payment
                  </Button>
                )}
                {invoice.status !== 'VOID' && invoice.status !== 'PAID' && (
                  <Button variant="danger" size="sm" onClick={() => setConfirmAction('void')}>
                    <i className="bx bx-block"></i>
                    Void
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
          title="Invoice not found"
          description="It may have been removed, or the link is invalid"
          actions={
            <Button href="/sales/invoices" size="sm">
              Back to Invoices
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
            {/* Header */}
            <div className="flex items-start justify-between flex-wrap gap-4 pb-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">INVOICE</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-mono">{invoice.invoiceNumber}</p>
              </div>
              <div className="text-right">
                <InvoiceStatusBadge status={invoice.status} />
                <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  <p>Issued: {formatDate(invoice.issueDate)}</p>
                  <p>Due: {formatDate(invoice.dueDate)}</p>
                </div>
              </div>
            </div>

            {/* Bill to */}
            <div className="py-6 border-b border-gray-200 dark:border-gray-700">
              <p className="text-2xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase mb-1">Bill To</p>
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
                    <th className="py-2 text-left text-2xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase">Description</th>
                    <th className="py-2 text-right text-2xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase">Qty</th>
                    <th className="py-2 text-right text-2xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase">Unit Price</th>
                    <th className="py-2 text-right text-2xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase">Tax %</th>
                    <th className="py-2 text-right text-2xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase">Amount</th>
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
                  <span>Subtotal</span>
                  <span>{formatMoney(invoice.subtotal, currency)}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Tax</span>
                  <span>{formatMoney(invoice.taxTotal, currency)}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Discount</span>
                  <span>-{formatMoney(invoice.discountTotal, currency)}</span>
                </div>
                <div className="flex justify-between font-semibold text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-700 pt-2">
                  <span>Total</span>
                  <span>{formatMoney(invoice.total, currency)}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Amount Paid</span>
                  <span>{formatMoney(invoice.amountPaid, currency)}</span>
                </div>
                <div className="flex justify-between font-bold text-gray-900 dark:text-white text-base border-t border-gray-200 dark:border-gray-700 pt-2">
                  <span>Balance Due</span>
                  <span>{formatMoney(invoice.balance, currency)}</span>
                </div>
              </div>
            </div>

            {invoice.notes && (
              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-2xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase mb-1">Notes</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{invoice.notes}</p>
              </div>
            )}
          </div>

          {/* Payments history */}
          <div className="no-print max-w-4xl">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Payments</h2>
            {(invoice.payments || []).length === 0 ? (
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 p-6 text-sm text-gray-500 dark:text-gray-400">
                No payments recorded yet.
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">Date</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">Method</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">Reference</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">Amount</th>
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
      <Modal isOpen={!!paymentForm} onClose={() => setPaymentForm(null)} title="Record Payment" maxWidth="md">
        {paymentForm && (
          <div className="space-y-4">
            <FormField
              label={`Amount (${currency})`}
              name="payment-amount"
              type="number"
              required
              min={0}
              step={0.01}
              value={paymentForm.amount}
              onChange={(v) => setPaymentForm((f) => (f ? { ...f, amount: v } : f))}
              help={invoice ? `Outstanding balance: ${formatMoney(invoice.balance, currency)}` : undefined}
            />
            <FormField
              label="Method"
              name="payment-method"
              type="select"
              required
              value={paymentForm.method}
              onChange={(v) => setPaymentForm((f) => (f ? { ...f, method: v } : f))}
              options={PAYMENT_METHODS}
            />
            <FormField
              label="Reference"
              name="payment-reference"
              value={paymentForm.reference}
              onChange={(v) => setPaymentForm((f) => (f ? { ...f, reference: v } : f))}
              placeholder="Transaction reference (optional)"
            />
            <FormField
              label="Date"
              name="payment-date"
              type="date"
              required
              value={paymentForm.date}
              onChange={(v) => setPaymentForm((f) => (f ? { ...f, date: v } : f))}
            />
            <div className="flex justify-end space-x-3 pt-2">
              <Button variant="secondary" type="button" onClick={() => setPaymentForm(null)} disabled={acting}>
                Cancel
              </Button>
              <Button type="button" onClick={handleRecordPayment} disabled={acting}>
                {acting ? 'Saving...' : 'Record Payment'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Send / Void confirm */}
      <Modal
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        title={confirmAction === 'send' ? 'Send Invoice' : 'Void Invoice'}
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            {confirmAction === 'send'
              ? 'Mark this invoice as sent to the customer? It will no longer be editable as a draft.'
              : 'Voiding cancels this invoice permanently. It will no longer count toward receivables. This cannot be undone.'}
          </p>
          <div className="flex justify-end space-x-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setConfirmAction(null)} disabled={acting}>
              Cancel
            </Button>
            <Button variant="danger" type="button" onClick={handleConfirmAction} disabled={acting}>
              {acting ? 'Working...' : confirmAction === 'send' ? 'Send Invoice' : 'Void Invoice'}
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
