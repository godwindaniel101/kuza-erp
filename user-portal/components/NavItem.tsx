import Link from 'next/link';
import { ReactNode } from 'react';
import Icon, { IconName } from './ui/Icon';

interface NavItemProps {
  href: string;
  active?: boolean;
  icon?: IconName;
  children: ReactNode;
  badge?: ReactNode;
  onClick?: () => void;
}

/**
 * Sidebar navigation item. Active state = navy gradient pill with white
 * text + icon (reference "Overview" treatment).
 */
export default function NavItem({ href, active = false, icon, children, badge, onClick }: NavItemProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`group relative flex items-center gap-2.5 rounded-lg px-3 h-9 text-sm transition-colors duration-150 ${
        active
          ? 'bg-brand-gradient text-white font-medium shadow-sm'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/70 hover:text-gray-900 dark:hover:text-gray-200'
      }`}
    >
      {icon && (
        <Icon
          name={icon}
          size={18}
          className={
            active
              ? 'text-white'
              : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'
          }
        />
      )}
      <span className="flex-1 truncate">{children}</span>
      {badge && <span className="ml-auto shrink-0">{badge}</span>}
    </Link>
  );
}
