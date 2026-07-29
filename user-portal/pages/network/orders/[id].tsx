import { useCallback, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { api } from '@/lib/api';
import PageHeader from '@/components/ui/PageHeader';

/**
 * Legacy buyer order-detail route. The buyer detail now lives at
 * `/purchases/orders/:id` (off the `/network` namespace). This page only
 * redirects, so old/deep links (notifications, bookmarks) still resolve:
 *   - supplier with a materialized sale → POS sale detail (`/rms/orders/:id`)
 *   - everyone else (buyer) → `/purchases/orders/:id`
 */
export default function LegacyOrderRedirect() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { id } = router.query;

  const redirect = useCallback(async () => {
    if (!id || typeof id !== 'string') return;
    try {
      const res = await api.get<{ success: boolean; data: { role: 'buyer' | 'supplier'; salesOrderId: string | null } }>(
        `/network/orders/${id}`,
      );
      // Supplier takes priority: an accepted order has materialized into a real
      // sale in their tenant, so send them to the POS sale detail.
      if (res.success && res.data.role === 'supplier' && res.data.salesOrderId) {
        void router.replace(`/rms/orders/${res.data.salesOrderId}`);
        return;
      }
    } catch {
      // Fall through to the buyer route; the detail page surfaces load errors.
    }
    void router.replace(`/purchases/orders/${id}`);
  }, [id, router]);

  useEffect(() => {
    redirect();
  }, [redirect]);

  return (
    <div>
      <PageHeader title={t('orders.title', 'Purchase orders')} />
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-brand-600" />
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => ({
  props: { ...(await serverSideTranslations(locale || 'en', ['common'])) },
});
