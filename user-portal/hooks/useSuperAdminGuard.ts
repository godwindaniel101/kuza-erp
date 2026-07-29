import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/store/authStore';

/**
 * Client-side gate for the /admin back-office. Redirects anyone who is not a
 * platform super-admin to '/'. This is UX only — every /admin API is enforced
 * server-side by a super-admin guard; this just avoids rendering the surface to
 * users who can't use it.
 *
 * Returns `checking` while auth is still resolving (show a spinner) and
 * `allowed` once a super-admin is confirmed.
 */
export function useSuperAdminGuard(): { checking: boolean; allowed: boolean } {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuthStore();

  // Only decide once auth has resolved (Layout drives fetchUser on mount).
  const checking = isLoading || (isAuthenticated && !user);
  const allowed = !!user?.isSuperAdmin;

  useEffect(() => {
    if (checking) return;
    if (!allowed) {
      router.replace('/');
    }
  }, [checking, allowed, router]);

  return { checking, allowed };
}
