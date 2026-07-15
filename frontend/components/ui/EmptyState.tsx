import { ReactNode } from 'react';

interface EmptyStateProps {
  /** Boxicons name, e.g. "bx-box". Rendered inside a soft halo. */
  icon?: string;
  title: string;
  description?: string;
  /** @deprecated Legacy accent — empty states are neutral now. */
  accent?: 'red' | 'blue';
  /** Action buttons / links. */
  actions?: ReactNode;
  className?: string;
}

export default function EmptyState({
  icon = 'bx-box',
  title,
  description,
  actions,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 px-6 py-14 text-center ${className}`}
    >
      <div className="relative mx-auto mb-5 h-16 w-16">
        {/* Soft layered backdrop shapes */}
        <svg viewBox="0 0 64 64" className="absolute inset-0 h-full w-full" aria-hidden="true">
          <circle cx="32" cy="32" r="30" className="fill-gray-50 dark:fill-gray-800/60" />
          <circle cx="32" cy="32" r="21" className="fill-gray-100 dark:fill-gray-800" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <i className={`bx ${icon} text-2xl text-gray-400 dark:text-gray-500`} aria-hidden="true"></i>
        </div>
      </div>
      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">{title}</h3>
      {description && (
        <p className="mx-auto max-w-sm text-sm text-gray-500 dark:text-gray-400 mb-6">{description}</p>
      )}
      {actions && <div className="flex items-center justify-center gap-3">{actions}</div>}
    </div>
  );
}
