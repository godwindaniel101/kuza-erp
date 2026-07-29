import { ReactNode } from 'react';
import { useSuperAdminGuard } from '@/hooks/useSuperAdminGuard';

/**
 * Renders its children only for a confirmed platform super-admin. Shows a
 * spinner while auth resolves and nothing while a non-admin is being redirected
 * to '/'. UX gate only — the server enforces access on every /admin endpoint.
 */
export default function AdminGuard({ children }: { children: ReactNode }) {
  const { checking, allowed } = useSuperAdminGuard();

  if (checking) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-brand-600" />
      </div>
    );
  }

  if (!allowed) return null;

  return <>{children}</>;
}
