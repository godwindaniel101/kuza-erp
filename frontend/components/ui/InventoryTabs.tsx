import Link from 'next/link';
import { useRouter } from 'next/router';

export type InventoryTabKey = 'overview' | 'items' | 'branch' | 'inflows';

interface InventoryTabsProps {
  /** Which tab is active. */
  active: InventoryTabKey;
  /** Optional live counts keyed by tab; omit a key to hide its count. */
  counts?: Partial<Record<InventoryTabKey, number | undefined>>;
}

interface TabDef {
  key: InventoryTabKey;
  label: string;
  href: string;
  icon: string;
}

const TABS: TabDef[] = [
  { key: 'overview', label: 'Overview', href: '/ims', icon: 'bx-grid-alt' },
  { key: 'items', label: 'Items', href: '/ims/inventory', icon: 'bx-box' },
  { key: 'branch', label: 'Branch', href: '/ims/branch-items', icon: 'bx-store' },
  { key: 'inflows', label: 'Inflows', href: '/ims/inflows', icon: 'bx-transfer-alt' },
];

/**
 * Shared sub-navigation for the three inventory stock views. Highlights the
 * active tab with the brand underline and shows a live count when provided.
 */
export default function InventoryTabs({ active, counts }: InventoryTabsProps) {
  const router = useRouter();

  return (
    <div className="border-b border-gray-200 dark:border-gray-800">
      <nav className="-mb-px flex gap-6" aria-label="Inventory sections">
        {TABS.map((tab) => {
          const isActive = tab.key === active;
          const count = counts?.[tab.key];
          return (
            <Link
              key={tab.key}
              href={tab.href}
              aria-current={isActive ? 'page' : undefined}
              className={`group inline-flex items-center gap-2 whitespace-nowrap border-b-2 py-2.5 px-1 text-[13px] font-medium transition-colors ${
                isActive
                  ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-700 dark:hover:text-gray-200'
              }`}
              onMouseEnter={() => router.prefetch(tab.href)}
            >
              <i className={`bx ${tab.icon} text-base`} aria-hidden="true"></i>
              <span>{tab.label}</span>
              {typeof count === 'number' && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[11px] tabular-nums ${
                    isActive
                      ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                  }`}
                >
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
