import { ReactNode } from 'react';

interface CardProps {
  title?: string;
  subtitle?: string;
  headerAction?: ReactNode;
  footer?: ReactNode;
  padding?: boolean;
  children: ReactNode;
  className?: string;
}

export default function Card({ title, subtitle, headerAction, footer, padding = true, children, className = '' }: CardProps) {
  return (
    <div className={`bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 overflow-hidden ${className}`}>
      {(title || headerAction) && (
        <div className="border-b border-gray-100 dark:border-gray-800 px-5 py-3">
          <div className="flex items-center justify-between">
            <div>
              {title && <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>}
              {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
            </div>
            {headerAction && <div>{headerAction}</div>}
          </div>
        </div>
      )}
      <div className={padding ? 'p-5' : ''}>{children}</div>
      {footer && (
        <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 px-6 py-4">{footer}</div>
      )}
    </div>
  );
}

