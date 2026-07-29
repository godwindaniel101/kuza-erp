import { ReactNode } from 'react';
import Link from 'next/link';

export interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: ReactNode;
  subtitle?: string;
  breadcrumbs?: Breadcrumb[];
  /** Optional count rendered as a subtle badge beside the title, e.g. "Inventory 70". */
  count?: number;
  /** Right-aligned action buttons. */
  actions?: ReactNode;
  className?: string;
}

export default function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  count,
  actions,
  className = '',
}: PageHeaderProps) {
  return (
    <div className={`mb-5 ${className}`}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="mb-2">
          <ol className="flex items-center flex-wrap gap-1 text-[13px] text-gray-500 dark:text-gray-400">
            {breadcrumbs.map((crumb, i) => {
              const isLast = i === breadcrumbs.length - 1;
              return (
                <li key={`${crumb.label}-${i}`} className="flex items-center gap-1">
                  {crumb.href && !isLast ? (
                    <Link
                      href={crumb.href}
                      className="hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className={isLast ? 'text-gray-700 dark:text-gray-300 font-medium' : ''}>
                      {crumb.label}
                    </span>
                  )}
                  {!isLast && <i className="bx bx-chevron-right text-base" aria-hidden="true"></i>}
                </li>
              );
            })}
          </ol>
        </nav>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-[1.35rem] font-semibold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <span>{title}</span>
            {count != null && (
              <span className="inline-flex items-center justify-center min-w-[1.5rem] h-5 px-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-xs font-medium text-gray-600 dark:text-gray-300">
                {count}
              </span>
            )}
          </h1>
          {subtitle && <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
