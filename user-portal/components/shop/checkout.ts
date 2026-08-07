/**
 * Shared types + constants for the public marketplace guest checkout (Phase 2).
 * The frontend only DISPLAYS payment instructions returned by the backend —
 * there is NO payment logic here. Money still moves off-platform: the buyer
 * transfers the exact amount to each store's virtual account.
 */

/** sessionStorage key holding the last checkout response for instant render on the order page. */
export const CHECKOUT_STASH_KEY = 'kuza-shop-checkout';

export interface CheckoutVirtualAccount {
  accountNumber: string;
  bankName: string;
  accountName: string;
}

/** A seller line in the POST /checkout response (has the virtual account to pay). */
export interface CheckoutSeller {
  storeName: string;
  storeSlug: string;
  orderNumber: string;
  amount: number;
  currency: string;
  virtualAccount: CheckoutVirtualAccount;
  paymentReference: string;
}

/** A seller that could not be checked out (e.g. no payout account configured). */
export interface CheckoutFailed {
  storeName: string;
  reason: string;
}

/** Shape stashed in sessionStorage (the `data` of POST /checkout). */
export interface CheckoutStash {
  reference: string;
  sellers: CheckoutSeller[];
  failed: CheckoutFailed[];
}

export type OrderStatus = 'awaiting' | 'paid' | 'completed' | 'failed';

/** A seller line in the GET /checkout/:reference response (authoritative status). */
export interface OrderSeller {
  storeName: string;
  orderNumber: string;
  amount: number;
  currency: string;
  status: OrderStatus;
  /** Present so the payment page works from the reference alone (new device / cleared tab). */
  virtualAccount: CheckoutVirtualAccount | null;
  paymentReference: string | null;
}

export interface OrderTracking {
  reference: string;
  buyerName: string;
  sellers: OrderSeller[];
}

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';
