import { ProviderConfig } from './payment-provider.port';

export interface NormalizedSaleEvent {
  /** Major currency units. */
  amount: number;
  currency: string;
  /** POS terminal / till identifier when the provider sends one. */
  terminalId: string | null;
  reference: string;
  soldAt: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    /** Optional barcode/SKU for inventory matching. */
    sku?: string | null;
  }>;
  eventType: string;
}

/**
 * Port for point-of-sale providers pushing completed sales into Kuza
 * (e.g. a 'generic_pos' connection). Implementations follow the same
 * signature-validation rules as PaymentProviderPort.parseWebhook.
 */
export interface PosProviderPort {
  readonly provider: string;

  parseSaleWebhook(
    headers: Record<string, any>,
    rawBody: string,
    config: ProviderConfig,
    webhookSecret: string,
  ): NormalizedSaleEvent | null;
}
