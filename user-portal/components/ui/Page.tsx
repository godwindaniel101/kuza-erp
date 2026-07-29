import { ReactNode } from 'react';

/**
 * Page-width tier system (see docs/DESIGN.md §0 for the page → tier table).
 *
 *  - full:   dense data pages (lists, ledgers, audit tables). No extra cap —
 *            Layout already caps content at 1440px.
 *  - wide:   dashboards & reports (~75%), max-w-5xl centered.
 *  - narrow: create/edit forms & single-form settings, max-w-3xl centered.
 */
export type PageWidth = 'full' | 'wide' | 'narrow';

export const pageWidthClasses: Record<PageWidth, string> = {
  full: 'max-w-none',
  wide: 'w-full max-w-5xl',
  narrow: 'mx-auto w-full max-w-3xl',
};

interface PageProps {
  width?: PageWidth;
  className?: string;
  children: ReactNode;
}

export default function Page({ width = 'full', className = '', children }: PageProps) {
  return <div className={`${pageWidthClasses[width]} space-y-5 ${className}`}>{children}</div>;
}
