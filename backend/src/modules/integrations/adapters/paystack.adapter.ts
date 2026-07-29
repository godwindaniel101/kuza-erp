import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  PaymentProviderPort,
  ProviderConfig,
  CreateVirtualAccountInput,
  VirtualAccountInfo,
  NormalizedPaymentEvent,
} from '../ports/payment-provider.port';

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

/**
 * Paystack adapter.
 *
 * config shape: { secretKey: 'sk_test_...' | 'sk_live_...', preferredBank?: 'wema-bank' }
 *
 * Webhooks: Paystack signs the RAW request body with your secret API key
 * using HMAC-SHA512 and sends it as `x-paystack-signature`.
 */
@Injectable()
export class PaystackAdapter implements PaymentProviderPort {
  readonly provider = 'paystack';
  private readonly logger = new Logger(PaystackAdapter.name);

  parseWebhook(
    headers: Record<string, any>,
    rawBody: string,
    config: ProviderConfig,
    _webhookSecret: string,
  ): NormalizedPaymentEvent | null {
    const signature = String(headers['x-paystack-signature'] || '');

    // Paystack signs with the account's secret key. Only enforce when the
    // key is configured — a keyless dev connection still accepts events so
    // the flow can be exercised end-to-end (documented in INTEGRATIONS.md).
    if (config?.secretKey) {
      const expected = createHmac('sha512', String(config.secretKey))
        .update(rawBody)
        .digest('hex');
      if (!signature || !this.safeEqual(expected, signature)) {
        throw new UnauthorizedException('Invalid Paystack webhook signature');
      }
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return null;
    }

    if (payload?.event !== 'charge.success' || !payload?.data) {
      return null;
    }

    const data = payload.data;
    const customer = data.customer || {};
    const payerName =
      [customer.first_name, customer.last_name].filter(Boolean).join(' ') ||
      customer.email ||
      null;

    return {
      // Paystack amounts are in the currency subunit (kobo).
      amount: Math.round(Number(data.amount || 0)) / 100,
      currency: data.currency || 'NGN',
      reference: String(data.reference || ''),
      paidAt: data.paid_at || data.paidAt || new Date().toISOString(),
      payerName,
      eventType: 'charge.success',
    };
  }

  /**
   * Initialize a Paystack checkout transaction and return the hosted payment
   * URL. Used by the billing money-path for a paid plan upgrade.
   *
   * `amountSubunit` MUST already be in the currency subunit (kobo/pesewa) —
   * the caller converts, because it holds the plan's major-unit price. The
   * `reference` is the caller's idempotency key: Paystack echoes it back in the
   * signed webhook, and rejects a re-used reference, so retries are safe.
   *
   * Defensive parsing (partners lie): we require res.ok AND json.status AND an
   * authorization_url before trusting the response — never a status code alone.
   */
  async initializeTransaction(
    input: {
      email: string;
      amountSubunit: number;
      currency: string;
      reference: string;
      metadata?: Record<string, any>;
      callbackUrl?: string;
    },
    config: ProviderConfig,
  ): Promise<{ authorizationUrl: string; reference: string; accessCode: string }> {
    const secretKey = config?.secretKey;
    if (!secretKey) {
      throw new BadRequestException(
        'Paystack secret key not configured — set PAYSTACK_SECRET_KEY',
      );
    }

    const res = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: input.email,
        amount: Math.round(input.amountSubunit),
        currency: input.currency,
        reference: input.reference,
        metadata: input.metadata || {},
        callback_url: input.callbackUrl || undefined,
      }),
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok || !json?.status || !json?.data?.authorization_url) {
      this.logger.warn(
        `Paystack transaction.initialize failed: ${res.status} ${json?.message}`,
      );
      throw new BadRequestException(
        `Paystack rejected checkout: ${json?.message || res.status}`,
      );
    }

    return {
      authorizationUrl: json.data.authorization_url,
      reference: json.data.reference || input.reference,
      accessCode: json.data.access_code || '',
    };
  }

  async createVirtualAccount(
    input: CreateVirtualAccountInput,
    config: ProviderConfig,
  ): Promise<VirtualAccountInfo> {
    const secretKey = config?.secretKey;
    if (!secretKey) {
      throw new BadRequestException(
        'Provider API key not configured — add it in integration settings',
      );
    }

    const headers = {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    };

    // Step 1: Paystack dedicated accounts hang off a Paystack customer.
    const [firstName, ...rest] = (input.customerName || 'Customer').split(' ');
    const customerRes = await fetch(`${PAYSTACK_BASE_URL}/customer`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email: input.customerEmail || `${input.customerId}@customers.kuza.africa`,
        first_name: firstName,
        last_name: rest.join(' ') || firstName,
        phone: input.customerPhone || undefined,
      }),
    });
    const customerJson: any = await customerRes.json().catch(() => ({}));
    if (!customerRes.ok || !customerJson?.status) {
      this.logger.warn(
        `Paystack customer creation failed: ${customerRes.status} ${customerJson?.message}`,
      );
      throw new BadRequestException(
        `Paystack rejected customer creation: ${customerJson?.message || customerRes.status}`,
      );
    }

    // Step 2: create the dedicated (virtual) account.
    const dvaRes = await fetch(`${PAYSTACK_BASE_URL}/dedicated_account`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        customer: customerJson.data.customer_code,
        preferred_bank: config.preferredBank || 'wema-bank',
      }),
    });
    const dvaJson: any = await dvaRes.json().catch(() => ({}));
    if (!dvaRes.ok || !dvaJson?.status) {
      this.logger.warn(
        `Paystack dedicated account failed: ${dvaRes.status} ${dvaJson?.message}`,
      );
      throw new BadRequestException(
        `Paystack rejected virtual account creation: ${dvaJson?.message || dvaRes.status}`,
      );
    }

    const dva = dvaJson.data;
    return {
      provider: this.provider,
      bankName: dva?.bank?.name || '',
      accountNumber: dva?.account_number || '',
      accountName: dva?.account_name || input.customerName,
      reference: customerJson.data.customer_code,
      raw: dva,
    };
  }

  private safeEqual(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  }
}
