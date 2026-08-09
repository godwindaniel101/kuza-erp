import { useMemo } from 'react';
import { resolveImageUrl } from '@/lib/format';

/** Shape mirrors the backend InvoiceSettings entity (all optional in the form). */
export interface InvoiceSettingsShape {
  logoUrl?: string | null;
  accentColor?: string | null;
  template?: 'classic' | 'modern' | 'minimal' | string | null;
  showLogo?: boolean;
  displayName?: string | null;
  addressLine?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  taxId?: string | null;
  registrationNo?: string | null;
  currency?: string | null;
  taxLabel?: string | null;
  taxRatePct?: number | string | null;
  showTax?: boolean;
  paymentTermsDays?: number | string | null;
  numberPrefix?: string | null;
  footerNote?: string | null;
  terms?: string | null;
  showPaymentDetails?: boolean;
  bankName?: string | null;
  accountName?: string | null;
  accountNumber?: string | null;
  paymentInstructions?: string | null;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: '₦',
  GHS: 'GH₵',
  KES: 'KSh',
  XOF: 'CFA',
  USD: '$',
  GBP: '£',
  EUR: '€',
  ZAR: 'R',
};

/** A few fixed sample lines so the preview always looks like a real invoice. */
const SAMPLE_LINES = [
  { description: 'Consulting services', qty: 10, unit: 150 },
  { description: 'Design retainer', qty: 1, unit: 800 },
  { description: 'Hosting (annual)', qty: 1, unit: 240 },
];

function money(symbol: string, n: number): string {
  return `${symbol}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface InvoicePreviewProps {
  settings: InvoiceSettingsShape;
}

/**
 * Live, print-friendly sample invoice that re-renders as the settings form
 * changes. Layout + accent treatment vary by settings.template.
 */
export default function InvoicePreview({ settings }: InvoicePreviewProps) {
  const accent = (settings.accentColor && /^#/.test(settings.accentColor) ? settings.accentColor : '#2563EB');
  const template = settings.template || 'classic';
  const symbol = CURRENCY_SYMBOLS[settings.currency || 'NGN'] || `${settings.currency || 'NGN'} `;
  const taxLabel = settings.taxLabel || 'VAT';
  const taxRate = Number(settings.taxRatePct || 0);
  const showTax = settings.showTax !== false;
  const showLogo = settings.showLogo !== false;
  const showPay = settings.showPaymentDetails !== false;
  const prefix = settings.numberPrefix || 'INV-';
  const businessName = settings.displayName || 'Your business name';

  const { subtotal, taxAmount, total } = useMemo(() => {
    const sub = SAMPLE_LINES.reduce((s, l) => s + l.qty * l.unit, 0);
    const tax = showTax ? (sub * taxRate) / 100 : 0;
    return { subtotal: sub, taxAmount: tax, total: sub + tax };
  }, [showTax, taxRate]);

  const logo =
    showLogo && settings.logoUrl ? (
      <img
        src={resolveImageUrl(settings.logoUrl)}
        alt="Logo"
        className="h-12 w-auto max-w-[160px] object-contain"
      />
    ) : null;

  const businessBlock = (
    <div className="text-[11px] leading-relaxed text-gray-600">
      <p className="text-sm font-semibold text-gray-900">{businessName}</p>
      {settings.addressLine && <p>{settings.addressLine}</p>}
      {settings.phone && <p>{settings.phone}</p>}
      {settings.email && <p>{settings.email}</p>}
      {settings.website && <p>{settings.website}</p>}
      {settings.taxId && <p>Tax ID: {settings.taxId}</p>}
      {settings.registrationNo && <p>Reg: {settings.registrationNo}</p>}
    </div>
  );

  const billTo = (
    <div className="text-[11px] leading-relaxed text-gray-600">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Bill to</p>
      <p className="text-sm font-semibold text-gray-900">Acme Trading Ltd</p>
      <p>14 Marina Road, Lagos</p>
      <p>accounts@acme.example</p>
    </div>
  );

  const linesTable = (
    <table className="w-full border-collapse text-[11px]">
      <thead>
        <tr
          style={template === 'modern' ? { backgroundColor: `${accent}14` } : undefined}
          className={template === 'minimal' ? 'border-b border-gray-300' : template === 'classic' ? 'border-y border-gray-200' : ''}
        >
          <th className="py-2 pl-2 text-left font-semibold text-gray-600">Description</th>
          <th className="py-2 text-right font-semibold text-gray-600">Qty</th>
          <th className="py-2 text-right font-semibold text-gray-600">Unit</th>
          <th className="py-2 pr-2 text-right font-semibold text-gray-600">Amount</th>
        </tr>
      </thead>
      <tbody>
        {SAMPLE_LINES.map((l, i) => (
          <tr key={i} className="border-b border-gray-100">
            <td className="py-1.5 pl-2 text-gray-800">{l.description}</td>
            <td className="py-1.5 text-right tabular-nums text-gray-600">{l.qty}</td>
            <td className="py-1.5 text-right tabular-nums text-gray-600">{money(symbol, l.unit)}</td>
            <td className="py-1.5 pr-2 text-right tabular-nums text-gray-800">{money(symbol, l.qty * l.unit)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const totals = (
    <div className="ml-auto w-48 space-y-1 text-[11px]">
      <div className="flex justify-between text-gray-600">
        <span>Subtotal</span>
        <span className="tabular-nums">{money(symbol, subtotal)}</span>
      </div>
      {showTax && (
        <div className="flex justify-between text-gray-600">
          <span>
            {taxLabel} ({taxRate}%)
          </span>
          <span className="tabular-nums">{money(symbol, taxAmount)}</span>
        </div>
      )}
      <div
        className="flex justify-between border-t pt-1 text-sm font-bold"
        style={{ borderColor: accent, color: accent }}
      >
        <span>Total</span>
        <span className="tabular-nums">{money(symbol, total)}</span>
      </div>
    </div>
  );

  const paymentBlock = showPay && (settings.bankName || settings.accountNumber || settings.paymentInstructions) ? (
    <div className="rounded-md bg-gray-50 p-3 text-[10px] leading-relaxed text-gray-600">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Payment details</p>
      {settings.bankName && <p>Bank: {settings.bankName}</p>}
      {settings.accountName && <p>Account name: {settings.accountName}</p>}
      {settings.accountNumber && <p>Account no: {settings.accountNumber}</p>}
      {settings.paymentInstructions && <p className="mt-1">{settings.paymentInstructions}</p>}
    </div>
  ) : null;

  const footer = (
    <div className="mt-4 space-y-2 border-t border-gray-100 pt-3 text-[10px] text-gray-500">
      {settings.terms && (
        <div>
          <p className="font-semibold uppercase tracking-wide text-gray-400">Terms</p>
          <p>{settings.terms}</p>
        </div>
      )}
      {settings.footerNote && <p className="text-center italic">{settings.footerNote}</p>}
    </div>
  );

  // --- Template-specific headers ---
  let header: JSX.Element;
  if (template === 'modern') {
    header = (
      <div className="mb-5 rounded-lg px-5 py-4 text-white" style={{ backgroundColor: accent }}>
        <div className="flex items-start justify-between">
          <div>
            {logo}
            <p className="mt-1 text-base font-bold">{businessName}</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-extrabold uppercase tracking-wider">Invoice</p>
            <p className="text-[11px] opacity-90">
              {prefix}0001 · {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </div>
    );
  } else if (template === 'minimal') {
    header = (
      <div className="mb-5 flex items-end justify-between border-b border-gray-900 pb-3">
        <div>
          {logo}
          <p className="mt-1 text-sm font-semibold text-gray-900">{businessName}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-gray-500">Invoice</p>
          <p className="text-[11px] text-gray-500">{prefix}0001</p>
        </div>
      </div>
    );
  } else {
    // classic
    header = (
      <div className="mb-5 flex items-start justify-between">
        <div className="space-y-2">
          {logo}
          {businessBlock}
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold" style={{ color: accent }}>
            INVOICE
          </p>
          <p className="text-[11px] text-gray-500">{prefix}0001</p>
          <p className="text-[11px] text-gray-500">Date: {new Date().toISOString().slice(0, 10)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[520px] rounded-lg border border-gray-200 bg-white p-6 text-gray-900 shadow-sm">
      {header}

      {/* Meta row: for modern/minimal, business + bill-to sit under the banner */}
      <div className="mb-5 flex justify-between gap-6">
        {template === 'classic' ? billTo : businessBlock}
        {template === 'classic' ? (
          <div className="text-right text-[11px] text-gray-600">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Bill to</p>
            <p className="text-sm font-semibold text-gray-900">Acme Trading Ltd</p>
            <p>14 Marina Road, Lagos</p>
          </div>
        ) : (
          billTo
        )}
      </div>

      <div className="mb-4">{linesTable}</div>
      <div className="mb-4">{totals}</div>
      {paymentBlock}
      {footer}
    </div>
  );
}
