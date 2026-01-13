import Link from 'next/link';
import { ReactNode } from 'react';

interface NavItemProps {
  href: string;
  active?: boolean;
  icon?: string;
  children: ReactNode;
  badge?: ReactNode;
  onClick?: () => void;
}

export default function NavItem({ href, active = false, icon, children, badge, onClick }: NavItemProps) {
  const classes = active
    ? 'flex items-center px-4 py-3 text-gray-900 dark:text-gray-100 bg-red-50 dark:bg-red-900/20 rounded-lg font-medium group touch-target transition-colors'
    : 'flex items-center px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg group transition-colors touch-target';

  return (
    <Link href={href} className={classes} onClick={onClick}>
      {icon && (
        <i
          className={`bx ${icon} text-xl ${
            active
              ? 'text-red-600 dark:text-red-400'
              : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'
          } flex-shrink-0`}
        ></i>
      )}
      <span className="ml-3 flex-1">{children}</span>
      {badge && <span className="ml-auto flex-shrink-0">{badge}</span>}
    </Link>
  );
}



