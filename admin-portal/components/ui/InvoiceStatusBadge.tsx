export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'VOID';

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus | string;
  size?: 'sm' | 'md';
  className?: string;
}

const tokens: Record<InvoiceStatus, { label: string; icon: string; classes: string }> = {
  DRAFT: {
    label: 'Draft',
    icon: 'bx-edit-alt',
    classes: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
  },
  SENT: {
    label: 'Sent',
    icon: 'bx-send',
    classes: 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300',
  },
  PARTIALLY_PAID: {
    label: 'Partially paid',
    icon: 'bx-adjust',
    classes: 'bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300',
  },
  PAID: {
    label: 'Paid',
    icon: 'bx-check-circle',
    classes: 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300',
  },
  OVERDUE: {
    label: 'Overdue',
    icon: 'bx-time-five',
    classes: 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300',
  },
  VOID: {
    label: 'Void',
    icon: 'bx-block',
    classes: 'bg-slate-200 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300',
  },
};

const fallback = tokens.DRAFT;

/** Invoice status badge with a distinct color + icon per status (never color alone). */
export default function InvoiceStatusBadge({ status, size = 'md', className = '' }: InvoiceStatusBadgeProps) {
  const token = tokens[status as InvoiceStatus] ?? { ...fallback, label: String(status) };
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs gap-1' : 'px-2.5 py-1 text-xs gap-1.5';
  return (
    <span className={`inline-flex items-center font-medium rounded-full ${sizeClasses} ${token.classes} ${className}`}>
      <i className={`bx ${token.icon}`} aria-hidden="true"></i>
      <span>{token.label}</span>
    </span>
  );
}
