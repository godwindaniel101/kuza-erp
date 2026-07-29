import { ReactNode } from 'react';
import { useAuthStore } from '@/store/authStore';

interface PermissionGuardProps {
  permission?: string;
  permissions?: string[];
  children: ReactNode;
}

export default function PermissionGuard({ permission, permissions, children }: PermissionGuardProps) {
  const { hasPermission, hasAnyPermission, user } = useAuthStore();

  // If no user, don't show (waiting for auth)
  if (!user) {
    return null;
  }

  // If user is admin, always show
  if (user.roles?.includes('admin') || user.roles?.includes('super_admin')) {
    return <>{children}</>;
  }

  // Check specific permission
  if (permission && !hasPermission(permission)) {
    return null;
  }

  // Check any of the permissions
  if (permissions && !hasAnyPermission(permissions)) {
    return null;
  }

  return <>{children}</>;
}

