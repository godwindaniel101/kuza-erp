import { api } from '@/lib/api';

/**
 * Typed client for the à-la-carte billing surface.
 *
 * Backend contract (see /settings/billing builder):
 *  - GET  /billing/pricing                      -> catalogue + tenant usage
 *  - POST /billing/pricing/quote                -> itemised live quote
 *  - GET  /billing/subscription                 -> current subscription
 *  - POST /billing/subscription/checkout-quote  -> free-activate OR Paystack handoff
 */

export type AppGroup = 'vertical' | 'common' | 'assist';

export interface PricingApp {
  key: string;
  name: string;
  group: AppGroup;
  description?: string;
  /** Apps sharing a non-null exclusiveGroup are mutually exclusive (e.g. items ⊕ rms). */
  exclusiveGroup: string | null;
  /** Monthly price in the tenant currency (major units). Assists are 0. */
  price: number;
}

export interface Pricing {
  currency: string;
  includedBranches: number;
  includedUsers: number;
  apps: PricingApp[];
  usage: { branch: number; user: number };
}

export interface QuoteLine {
  key: string;
  label: string;
  kind: 'app' | 'usage';
  qty: number;
  unit: number;
  amount: number;
}

export interface Quote {
  currency: string;
  lines: QuoteLine[];
  total: number;
  includedBranches: number;
  includedUsers: number;
}

export interface QuoteInput {
  apps: string[];
  branches?: number;
  users?: number;
}

export type SubscriptionStatus =
  | 'TRIALING'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'PAST_DUE'
  | 'CANCELED'
  | string;

export interface Subscription {
  status: SubscriptionStatus;
  selectedApps?: string[];
  branches?: number;
  users?: number;
  amountMajor?: number;
  currency?: string;
  plan?: string;
  trialEndsAt?: string;
}

/** Free activation (total resolved to 0 — no payment needed). */
export interface CheckoutFree {
  free: true;
  subscription: Subscription;
}

/** Paid: hand off to Paystack. */
export interface CheckoutPaid {
  free: false;
  authorizationUrl: string;
  reference: string;
  quote: Quote;
}

export type CheckoutQuoteResult = CheckoutFree | CheckoutPaid;

interface Envelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

export async function getPricing(): Promise<Pricing> {
  const res = await api.get<Envelope<Pricing>>('/billing/pricing');
  return res.data;
}

export async function quote(input: QuoteInput): Promise<Quote> {
  const res = await api.post<Envelope<Quote>>('/billing/pricing/quote', input);
  return res.data;
}

export async function getSubscription(): Promise<Subscription> {
  const res = await api.get<Envelope<Subscription>>('/billing/subscription');
  return res.data;
}

export async function checkoutQuote(input: QuoteInput): Promise<CheckoutQuoteResult> {
  const res = await api.post<Envelope<CheckoutQuoteResult>>(
    '/billing/subscription/checkout-quote',
    input,
  );
  return res.data;
}
