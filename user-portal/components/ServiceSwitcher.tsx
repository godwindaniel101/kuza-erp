import { useState, useEffect, useRef } from 'react';
import { useTenantStore } from '@/store/globalStore';
import Icon, { IconName } from './ui/Icon';

/**
 * Workspace switcher — the business block at the top of the sidebar.
 *
 * Lists the tenant's effective APP GROUPINGS (the sidebar's section groups),
 * not pages. Picking a group filters the sidebar to Home + that group +
 * Settings, so a single-app business (only accounting, only the QR menu)
 * experiences the product as THAT app. "All apps" restores every effective
 * group. Selection persists (localStorage via the tenant store); tenants with
 * a single group are auto-locked to it (no dropdown noise).
 */

export interface WorkspaceGroup {
  id: string;
  name: string;
}

/** Icons per sidebar group id (mirrors the section catalog). */
const GROUP_ICONS: Record<string, IconName> = {
  restaurant: 'building-storefront',
  'menu-studio': 'sparkles',
  inventory: 'cube',
  sales: 'banknotes',
  money: 'banknotes',
  accounting: 'calculator',
  hr: 'users',
};

interface ServiceSwitcherProps {
  businessName?: string | null;
  /** Edition chip, e.g. "Hospitality" for restaurant tenants. */
  edition?: string | null;
  /** The tenant's effective app groups (from AppSidebar's section catalog). */
  groups: WorkspaceGroup[];
  /** Resolved active workspace: 'all' or a group id. */
  activeWorkspace: string;
}

export default function ServiceSwitcher({
  businessName,
  edition,
  groups,
  activeWorkspace,
}: ServiceSwitcherProps) {
  const { setActiveWorkspace } = useTenantStore();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Single-group tenants are locked to that group — no dropdown.
  const locked = groups.length <= 1;

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const activeGroup = groups.find((g) => g.id === activeWorkspace);
  const workspaceName = activeGroup ? activeGroup.name : 'All apps';

  const handleSelect = (id: string) => {
    setOpen(false);
    setActiveWorkspace(id);
  };

  const initial = (businessName || 'K').charAt(0).toUpperCase();

  const blockInner = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-gradient text-sm font-semibold text-white">
        {initial}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 min-w-0">
          <span className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
            {businessName || 'Kuza'}
          </span>
          {edition && (
            <span className="shrink-0 rounded-full bg-brand-50 dark:bg-brand-500/10 px-1.5 py-px text-2xs font-medium text-brand-700 dark:text-brand-300 ring-1 ring-inset ring-brand-600/20 dark:ring-brand-400/20">
              {edition}
            </span>
          )}
        </span>
        <span className="block truncate text-xs text-gray-400 dark:text-gray-500">{workspaceName}</span>
      </span>
    </>
  );

  if (locked) {
    return <div className="flex w-full items-center gap-2.5 rounded-lg p-2 text-left">{blockInner}</div>;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="w-full flex items-center gap-2.5 rounded-lg p-2 text-left transition-colors duration-150 hover:bg-gray-100 dark:hover:bg-gray-800/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        {blockInner}
        <Icon name="chevron-up-down" size={16} className="text-gray-400 dark:text-gray-500" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 right-0 top-full z-50 mt-1.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-1.5 shadow-popover"
        >
          <p className="px-2.5 pb-1 pt-1.5 text-2xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Workspace
          </p>
          {[{ id: 'all', name: 'All apps' }, ...groups].map((group) => {
            const isActive = group.id === activeWorkspace || (group.id === 'all' && !activeGroup);
            const icon: IconName = group.id === 'all' ? 'squares-2x2' : GROUP_ICONS[group.id] ?? 'folder';
            return (
              <button
                key={group.id}
                type="button"
                role="menuitem"
                onClick={() => handleSelect(group.id)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors duration-150 ${
                  isActive
                    ? 'bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300 font-medium'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/70'
                }`}
              >
                <Icon
                  name={icon}
                  size={18}
                  className={isActive ? 'text-brand-600 dark:text-brand-400' : 'text-gray-400 dark:text-gray-500'}
                />
                <span className="flex-1">{group.name}</span>
                {isActive && <Icon name="check" size={14} className="text-brand-600 dark:text-brand-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
