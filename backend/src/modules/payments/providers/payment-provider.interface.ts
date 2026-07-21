/** Result of reserving/creating a virtual account with a provider. */
export interface ReservedAccountResult {
  accountReference: string;
  reservationReference?: string;
  accounts: Array<{
    accountNumber: string;
    accountName?: string;
    bankName?: string;
    bankCode?: string;
  }>;
}

export interface CreateReservedAccountInput {
  /** Our reference — echoed back on webhooks so we can map to the branch. */
  accountReference: string;
  accountName: string;
  customerEmail: string;
  customerName: string;
  /** Provider bank codes to reserve; empty ⇒ all available banks. */
  preferredBanks?: string[];
}

/** Normalized inbound payment event parsed from a provider webhook. */
export interface NormalizedPaymentEvent {
  eventType: string;
  isSuccessful: boolean;
  transactionReference?: string;
  paymentReference?: string;
  amountPaid: number;
  /** Reserved-account reference the money hit — maps back to the branch. */
  accountReference?: string;
  currency?: string;
  paidAt?: string;
  raw: any;
}

/**
 * A pluggable payment provider. Keeps the module multi-provider (Monnify today,
 * others later) behind one contract.
 */
export interface PaymentProvider {
  readonly name: string;
  /** True when platform credentials are configured (else config/live calls fail fast). */
  isConfigured(): boolean;
  createReservedAccount(input: CreateReservedAccountInput): Promise<ReservedAccountResult>;
  /** Constant-time verify of a raw webhook body against the provider signature header. */
  verifyWebhookSignature(rawBody: string, signature: string | undefined): boolean;
  parseWebhookEvent(body: any): NormalizedPaymentEvent;
}
