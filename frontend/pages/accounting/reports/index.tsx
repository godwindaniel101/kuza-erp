import Link from 'next/link';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import PageHeader from '@/components/ui/PageHeader';

const reports = [
  {
    href: '/accounting/reports/trial-balance',
    title: 'Trial Balance',
    icon: 'bx-list-check',
    description: 'All accounts with debit and credit balances as of a date. Verifies the books are balanced.',
  },
  {
    href: '/accounting/reports/profit-loss',
    title: 'Profit & Loss',
    icon: 'bx-line-chart',
    description: 'Income and expenses over a period, with the resulting net profit or loss.',
  },
  {
    href: '/accounting/reports/balance-sheet',
    title: 'Balance Sheet',
    icon: 'bx-spreadsheet',
    description: 'Snapshot of assets, liabilities and equity at a point in time.',
  },
  {
    href: '/accounting/reports/general-ledger',
    title: 'General Ledger',
    icon: 'bx-book-open',
    description: 'Every transaction for a single account with a running balance.',
  },
];

export default function AccountingReportsPage() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <PageHeader
        title="Reports"
        subtitle="Financial statements and account activity"
        breadcrumbs={[{ label: 'Accounting', href: '/accounting' }, { label: 'Reports' }]}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-4xl">
        {reports.map((report) => (
          <Link
            key={report.href}
            href={report.href}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 p-6 hover:ring-brand-300 dark:hover:ring-brand-700 transition-colors group"
          >
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-lg bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center shrink-0">
                <i className={`bx ${report.icon} text-2xl text-brand-600 dark:text-brand-400`} aria-hidden="true"></i>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors flex items-center gap-1">
                  {report.title}
                  <i className="bx bx-chevron-right text-lg opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true"></i>
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{report.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
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
