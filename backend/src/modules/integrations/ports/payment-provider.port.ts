/**
 * Provider-agnostic contracts for payment integrations. Adapters translate
 * a specific provider's API/webhook shapes into these types; nothing
 * outside the adapters dir should know provider-specific field names.
 */

export interface ProviderConfig {
  /** Provider credentials/settings from IntegrationConnection.config. */
  [key: string]: any;
}

export interface CreateVirtualAccountInput {
  customerId: string;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  currency?: string;
}

export interface VirtualAccountInfo {
  provider: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  /** Provider-side reference for this account (customer code, accountReference...). */
  reference?: string;
  raw?: Record<string, any>;
}

export interface NormalizedPaymentEvent {
  /** Major currency units (e.g. naira, not kobo). */
  amount: number;
  currency: string;
  /** Payer-supplied or provider reference — matched against invoice numbers. */
  reference: string;
  paidAt: string;
  payerName: string | null;
  /** Provider event name, e.g. 'charge.success'. */
  eventType: string;
}

export interface PaymentProviderPort {
  readonly provider: string;

  /**
   * Create a dedicated/reserved virtual account for a customer.
   * Must throw BadRequestException when the connection has no API key.
   */
  createVirtualAccount(
    input: CreateVirtualAccountInput,
    config: ProviderConfig,
  ): Promise<VirtualAccountInfo>;

  /**
   * Validate + normalize an inbound webhook.
   * - Throws UnauthorizedException when a signature is present/expected and invalid.
   * - Returns null when the event type is not a successful payment (caller marks IGNORED).
   */
  parseWebhook(
    headers: Record<string, any>,
    rawBody: string,
    config: ProviderConfig,
    webhookSecret: string,
  ): NormalizedPaymentEvent | null;
}
