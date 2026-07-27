import { GetServerSideProps } from 'next';

/**
 * Retired route. The standalone network-orders list is superseded by:
 *  - Purchases (/ims/inflows) — unions in the buyer's purchase orders, and
 *  - Sales (/rms/orders) — unions in the supplier's incoming orders.
 * Order detail (/network/orders/[id]) and the new-request page
 * (/network/orders/new) remain in use; only this duplicate list is retired.
 */
export default function NetworkOrdersRedirect() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async () => ({
  redirect: { destination: '/ims/inflows', permanent: false },
});
