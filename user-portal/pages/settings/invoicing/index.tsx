import { useEffect, useMemo, useState } from 'react';
import { GetServerSideProps } from 'next';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { api } from '@/lib/api';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Toast from '@/components/Toast';
import PermissionGuard from '@/components/PermissionGuard';
import InvoicePreview, { InvoiceSettingsShape } from '@/components/invoicing/InvoicePreview';

type Template = 'classic' | 'modern' | 'minimal';

interface InvoiceSettings extends InvoiceSettingsShape {
  senderName?: string | null;
  replyToEmail?: string | null;
  ccEmails?: string | null;
  emailSubject?: string | null;
  emailBody?: string | null;
  attachPdf?: boolean;
  autoSend?: boolean;
}

const inputClass =
  'w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus-visible:ring-2 focus-visible:ring-brand-500 focus:outline-none';
const labelClass = 'block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1';

const TEMPLATES: { key: Template; label: string; hint: string }[] = [
  { key: 'classic', label: 'Classic', hint: 'Traditional, logo + details top-left' },
  { key: 'modern', label: 'Modern', hint: 'Bold accent header band' },
  { key: 'minimal', label: 'Minimal', hint: 'Clean hairline, lots of space' },
];

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
      <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">{title}</h2>
      {description && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{description}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-gray-300 text-brand-600 focus-visible:ring-brand-500 dark:border-gray-600 dark:bg-gray-700"
      />
      <span>
        <span className="block text-sm text-gray-800 dark:text-gray-200">{label}</span>
        {hint && <span className="block text-xs text-gray-500 dark:text-gray-400">{hint}</span>}
      </span>
    </label>
  );
}

function InvoicingSettingsPage() {
  const { t } = useTranslation('common');
  const [form, setForm] = useState<InvoiceSettings | null>(null);
  const [saved, setSaved] = useState<InvoiceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [step, setStep] = useState(0);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<{ success: boolean; data: InvoiceSettings }>('/invoicing/settings');
        if (!cancelled && res.success) {
          setForm(res.data);
          setSaved(res.data);
        }
      } catch (err: any) {
        if (!cancelled) setToast({ message: err?.response?.data?.message || 'Failed to load settings', type: 'error' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const set = <K extends keyof InvoiceSettings>(key: K, value: InvoiceSettings[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(saved), [form, saved]);

  const handleLogoUpload = async (file: File | null | undefined) => {
    if (!file) return;
    setUploadingLogo(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      const res = await api.post<{ success: boolean; url: string }>('/menu-sites/logo', { dataUrl });
      set('logoUrl', res.url);
      setToast({ message: 'Logo uploaded', type: 'success' });
    } catch (err: any) {
      setToast({ message: err?.response?.data?.message || 'Failed to upload logo', type: 'error' });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const res = await api.patch<{ success: boolean; data: InvoiceSettings }>('/invoicing/settings', form);
      if (res.success) {
        setForm(res.data);
        setSaved(res.data);
        setToast({ message: 'Invoice settings saved', type: 'success' });
      }
    } catch (err: any) {
      setToast({ message: err?.response?.data?.message || 'Failed to save settings', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const steps: { key: string; label: string }[] = [
    { key: 'setup', label: t('invoiceSetup.setupTemplate', 'Setup template') },
    { key: 'business', label: t('businessDetails') || 'Business details' },
    { key: 'defaults', label: t('defaultsTax') || 'Defaults & tax' },
    { key: 'payment', label: t('paymentDetails') || 'Payment details' },
    { key: 'email', label: t('emailSending') || 'Email & sending' },
  ];
  const totalSteps = steps.length;
  const isFirst = step === 0;
  const isLast = step === totalSteps - 1;

  if (loading || !form) {
    return (
      <div>
        <PageHeader title={t('invoicingSettings') || 'Invoicing settings'} />
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-brand-600" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={t('invoicingSettings') || 'Invoicing settings'}
        subtitle={t('invoicingSettingsSubtitle') || 'Customize how your invoices look and how they are sent'}
        actions={
          <Button onClick={handleSave} loading={saving} disabled={!dirty}>
            {t('saveChanges') || 'Save changes'}
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Left: horizontal step tabs on the setup card + current step's form */}
        <div className="space-y-4">
          {/* Horizontal step tabs (on the card) */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <nav className="flex flex-wrap items-center gap-1 p-2" aria-label={t('invoiceSetup.stepsNav', 'Setup steps')}>
              {steps.map((s, i) => {
                const active = i === step;
                const done = i < step;
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setStep(i)}
                    aria-current={active ? 'step' : undefined}
                    className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                      active
                        ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300'
                        : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                        active
                          ? 'bg-brand-600 text-white'
                          : done
                          ? 'bg-emerald-500 text-white'
                          : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {done ? <i className="bx bx-check" /> : i + 1}
                    </span>
                    <span className="hidden sm:inline">{s.label}</span>
                  </button>
                );
              })}
            </nav>
            {/* Progress bar */}
            <div className="h-1.5 w-full overflow-hidden rounded-b-xl bg-gray-100 dark:bg-gray-800">
              <div
                className="h-full bg-brand-600 transition-all"
                style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
              />
            </div>
          </div>

          {step === 0 && (
            <Section title={t('invoiceSetup.setupTemplate', 'Setup template')} description={t('brandingTemplateDesc') || 'Your logo, accent color and layout style.'}>
              {/* Logo */}
              <div>
                <label className={labelClass}>{t('logo') || 'Logo'}</label>
                <div className="flex items-center gap-4">
                  {form.logoUrl ? (
                    <img src={form.logoUrl} alt="Logo" className="h-12 w-auto max-w-[120px] rounded object-contain" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded bg-gray-100 text-gray-400 dark:bg-gray-800">
                      <i className="bx bx-image" />
                    </div>
                  )}
                  <label className="cursor-pointer rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800">
                    {uploadingLogo ? t('uploading') || 'Uploading…' : t('uploadLogo') || 'Upload logo'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleLogoUpload(e.target.files?.[0])}
                    />
                  </label>
                  {form.logoUrl && (
                    <button
                      type="button"
                      onClick={() => set('logoUrl', null)}
                      className="text-sm text-red-600 hover:underline"
                    >
                      {t('remove') || 'Remove'}
                    </button>
                  )}
                </div>
                <div className="mt-3">
                  <Toggle checked={form.showLogo !== false} onChange={(v) => set('showLogo', v)} label={t('showLogoOnInvoice') || 'Show logo on invoice'} />
                </div>
              </div>

              {/* Accent color */}
              <div>
                <label className={labelClass}>{t('accentColor') || 'Accent color'}</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.accentColor || '#2563EB'}
                    onChange={(e) => set('accentColor', e.target.value)}
                    className="h-10 w-14 cursor-pointer rounded border border-gray-300 bg-white p-1 dark:border-gray-600 dark:bg-gray-800"
                  />
                  <input
                    type="text"
                    value={form.accentColor || ''}
                    onChange={(e) => set('accentColor', e.target.value)}
                    placeholder="#2563EB"
                    className={`${inputClass} max-w-[140px]`}
                  />
                </div>
              </div>

              {/* Template picker */}
              <div>
                <label className={labelClass}>{t('template') || 'Template'}</label>
                <div className="grid grid-cols-3 gap-3">
                  {TEMPLATES.map((tpl) => {
                    const active = (form.template || 'classic') === tpl.key;
                    return (
                      <button
                        key={tpl.key}
                        type="button"
                        onClick={() => set('template', tpl.key)}
                        className={`rounded-lg border p-3 text-left transition ${
                          active
                            ? 'border-brand-500 ring-2 ring-brand-500/30'
                            : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                        }`}
                      >
                        <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100">{tpl.label}</span>
                        <span className="mt-0.5 block text-[11px] text-gray-500 dark:text-gray-400">{tpl.hint}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </Section>
          )}

          {step === 1 && (
            <Section title={t('businessDetails') || 'Business details'} description={t('businessDetailsDesc') || 'Appears in the invoice header.'}>
              <div>
                <label className={labelClass}>{t('displayName') || 'Business name'}</label>
                <input className={inputClass} value={form.displayName || ''} onChange={(e) => set('displayName', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>{t('address') || 'Address'}</label>
                <input className={inputClass} value={form.addressLine || ''} onChange={(e) => set('addressLine', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>{t('phone') || 'Phone'}</label>
                  <input className={inputClass} value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>{t('email') || 'Email'}</label>
                  <input className={inputClass} value={form.email || ''} onChange={(e) => set('email', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>{t('website') || 'Website'}</label>
                  <input className={inputClass} value={form.website || ''} onChange={(e) => set('website', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>{t('taxId') || 'Tax ID'}</label>
                  <input className={inputClass} value={form.taxId || ''} onChange={(e) => set('taxId', e.target.value)} />
                </div>
              </div>
              <div>
                <label className={labelClass}>{t('registrationNo') || 'Registration number'}</label>
                <input className={inputClass} value={form.registrationNo || ''} onChange={(e) => set('registrationNo', e.target.value)} />
              </div>
            </Section>
          )}

          {step === 2 && (
            <Section title={t('defaultsTax') || 'Defaults & tax'} description={t('defaultsTaxDesc') || 'Applied to new invoices.'}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>{t('currency') || 'Currency'}</label>
                  <input className={inputClass} value={form.currency || ''} onChange={(e) => set('currency', e.target.value.toUpperCase())} placeholder="NGN" />
                </div>
                <div>
                  <label className={labelClass}>{t('numberPrefix') || 'Invoice number prefix'}</label>
                  <input className={inputClass} value={form.numberPrefix || ''} onChange={(e) => set('numberPrefix', e.target.value)} placeholder="INV-" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>{t('taxLabel') || 'Tax label'}</label>
                  <input className={inputClass} value={form.taxLabel || ''} onChange={(e) => set('taxLabel', e.target.value)} placeholder="VAT" />
                </div>
                <div>
                  <label className={labelClass}>{t('taxRate') || 'Tax rate (%)'}</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    className={inputClass}
                    value={form.taxRatePct ?? 0}
                    onChange={(e) => set('taxRatePct', e.target.value === '' ? 0 : Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className={labelClass}>{t('paymentTermsDays') || 'Payment terms (days)'}</label>
                  <input
                    type="number"
                    min={0}
                    className={inputClass}
                    value={form.paymentTermsDays ?? 14}
                    onChange={(e) => set('paymentTermsDays', e.target.value === '' ? 0 : Number(e.target.value))}
                  />
                </div>
              </div>
              <Toggle checked={form.showTax !== false} onChange={(v) => set('showTax', v)} label={t('showTaxLine') || 'Show tax line on invoice'} />
              <div>
                <label className={labelClass}>{t('footerNote') || 'Footer note'}</label>
                <input className={inputClass} value={form.footerNote || ''} onChange={(e) => set('footerNote', e.target.value)} placeholder="Thank you for your business!" />
              </div>
              <div>
                <label className={labelClass}>{t('terms') || 'Terms & conditions'}</label>
                <textarea rows={3} className={inputClass} value={form.terms || ''} onChange={(e) => set('terms', e.target.value)} />
              </div>
            </Section>
          )}

          {step === 3 && (
            <Section title={t('paymentDetails') || 'Payment details'} description={t('paymentDetailsDesc') || 'Where customers send payment.'}>
              <Toggle checked={form.showPaymentDetails !== false} onChange={(v) => set('showPaymentDetails', v)} label={t('showPaymentDetailsOnInvoice') || 'Show payment details on invoice'} />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>{t('bankName') || 'Bank name'}</label>
                  <input className={inputClass} value={form.bankName || ''} onChange={(e) => set('bankName', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>{t('accountName') || 'Account name'}</label>
                  <input className={inputClass} value={form.accountName || ''} onChange={(e) => set('accountName', e.target.value)} />
                </div>
              </div>
              <div>
                <label className={labelClass}>{t('accountNumber') || 'Account number'}</label>
                <input className={inputClass} value={form.accountNumber || ''} onChange={(e) => set('accountNumber', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>{t('paymentInstructions') || 'Payment instructions'}</label>
                <textarea rows={2} className={inputClass} value={form.paymentInstructions || ''} onChange={(e) => set('paymentInstructions', e.target.value)} />
              </div>
            </Section>
          )}

          {step === 4 && (
            <Section title={t('emailSending') || 'Email & sending'} description={t('emailSendingDesc') || 'How invoices are emailed to customers.'}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>{t('senderName') || 'Sender name'}</label>
                  <input className={inputClass} value={form.senderName || ''} onChange={(e) => set('senderName', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>{t('replyToEmail') || 'Reply-to email'}</label>
                  <input className={inputClass} value={form.replyToEmail || ''} onChange={(e) => set('replyToEmail', e.target.value)} />
                </div>
              </div>
              <div>
                <label className={labelClass}>{t('ccEmails') || 'CC emails'}</label>
                <input className={inputClass} value={form.ccEmails || ''} onChange={(e) => set('ccEmails', e.target.value)} placeholder="finance@company.com, ops@company.com" />
              </div>
              <div>
                <label className={labelClass}>{t('emailSubject') || 'Email subject'}</label>
                <input className={inputClass} value={form.emailSubject || ''} onChange={(e) => set('emailSubject', e.target.value)} placeholder="Invoice {{invoiceNumber}} from {{business}}" />
                <p className="mt-1 text-[11px] text-gray-400">{t('emailTokensHint') || 'Tokens: {{invoiceNumber}}, {{business}}, {{customer}}, {{amount}}'}</p>
              </div>
              <div>
                <label className={labelClass}>{t('emailBody') || 'Email body'}</label>
                <textarea rows={4} className={inputClass} value={form.emailBody || ''} onChange={(e) => set('emailBody', e.target.value)} />
              </div>
              <Toggle checked={form.attachPdf !== false} onChange={(v) => set('attachPdf', v)} label={t('attachPdf') || 'Attach PDF copy'} hint={t('attachPdfHint') || 'Send the invoice as a PDF attachment.'} />
              <Toggle checked={!!form.autoSend} onChange={(v) => set('autoSend', v)} label={t('autoSend') || 'Auto-send on issue'} hint={t('autoSendHint') || 'Email the customer automatically when an invoice is issued.'} />
            </Section>
          )}

          {/* Wizard controls */}
          <div className="flex items-center justify-between">
            <Button variant="secondary" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={isFirst}>
              <i className="bx bx-chevron-left mr-1" />
              {t('invoiceSetup.back', 'Back')}
            </Button>
            {isLast ? (
              <Button onClick={handleSave} loading={saving} disabled={!dirty}>
                {t('saveChanges') || 'Save changes'}
              </Button>
            ) : (
              <Button onClick={() => setStep((s) => Math.min(totalSteps - 1, s + 1))}>
                {t('invoiceSetup.next', 'Next')}
                <i className="bx bx-chevron-right ml-1" />
              </Button>
            )}
          </div>
        </div>

        {/* Right: live preview */}
        <div>
          <div className="xl:sticky xl:top-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">{t('livePreview') || 'Live preview'}</p>
            <InvoicePreview settings={form} />
          </div>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

export default function InvoicingSettings() {
  return (
    <PermissionGuard permission="sales.manage">
      <InvoicingSettingsPage />
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
