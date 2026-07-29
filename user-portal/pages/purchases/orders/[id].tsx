import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import OrderDetailView from '@/components/network/OrderDetailView';

// Buyer's marketplace order detail. Canonical (non-`/network`) route, reached
// from the Purchases list. The shared view reads the id from router.query.
export default function PurchaseOrderDetailPage() {
  return <OrderDetailView />;
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => ({
  props: { ...(await serverSideTranslations(locale || 'en', ['common'])) },
});
