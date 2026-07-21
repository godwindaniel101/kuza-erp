import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  CreateReservedAccountInput,
  NormalizedPaymentEvent,
  PaymentProvider,
  ReservedAccountResult,
} from './payment-provider.interface';

/**
 * Monnify (Moniepoint) provider. One platform Monnify account backs all tenants;
 * each reserved account carries our `accountReference` so webhooks map back to
 * the branch/business. Credentials come from env — never committed.
 *
 * Docs: https://developers.monnify.com/  (auth: Basic base64(apiKey:secretKey);
 * reserved accounts: POST /api/v2/bank-transfer/reserved-accounts; webhook signed
 * with HMAC-SHA512 of the raw body using the secret key, header monnify-signature).
 */
@Injectable()
export class MonnifyProvider implements PaymentProvider {
  readonly name = 'monnify';
  private readonly logger = new Logger(MonnifyProvider.name);

  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly secretKey: string;
  private readonly contractCode: string;
  /** Reserve a SINGLE account at this bank (Wema 035 by default) so each branch
   *  gets one virtual account, not one per bank. */
  private readonly defaultBankCode: string;

  private token: { value: string; expiresAt: number } | null = null;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = (
      this.config.get<string>('MONNIFY_BASE_URL') || 'https://sandbox.monnify.com'
    ).replace(/\/$/, '');
    this.apiKey = this.config.get<string>('MONNIFY_API_KEY') || '';
    this.secretKey = this.config.get<string>('MONNIFY_SECRET_KEY') || '';
    this.contractCode = this.config.get<string>('MONNIFY_CONTRACT_CODE') || '';
    this.defaultBankCode = this.config.get<string>('MONNIFY_DEFAULT_BANK_CODE') || '035';
  }

  isConfigured(): boolean {
    return !!(this.apiKey && this.secretKey && this.contractCode);
  }

  private assertConfigured(): void {
    if (!this.isConfigured()) {
      throw new BadRequestException(
        'Monnify is not configured. Set MONNIFY_API_KEY, MONNIFY_SECRET_KEY and MONNIFY_CONTRACT_CODE.',
      );
    }
  }

  /** Fetch (and cache) an access token via Basic auth. */
  private async getToken(): Promise<string> {
    this.assertConfigured();
    const now = Date.now();
    if (this.token && this.token.expiresAt > now + 60_000) return this.token.value;

    const basic = Buffer.from(`${this.apiKey}:${this.secretKey}`).toString('base64');
    const res = await fetch(`${this.baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/json' },
    });
    const body: any = await res.json().catch(() => ({}));
    const token = body?.responseBody?.accessToken;
    if (!res.ok || !token) {
      this.logger.error(`Monnify auth failed: ${res.status} ${JSON.stringify(body)}`);
      throw new BadRequestException('Could not authenticate with Monnify.');
    }
    // Monnify tokens last ~1h; store expiry defensively.
    const expiresIn = Number(body?.responseBody?.expiresIn) || 3000;
    this.token = { value: token, expiresAt: now + expiresIn * 1000 };
    return token;
  }

  async createReservedAccount(
    input: CreateReservedAccountInput,
  ): Promise<ReservedAccountResult> {
    const token = await this.getToken();
    const payload: Record<string, any> = {
      accountReference: input.accountReference,
      accountName: input.accountName,
      currencyCode: 'NGN',
      contractCode: this.contractCode,
      customerEmail: input.customerEmail,
      customerName: input.customerName,
    };
    // Reserve ONE account (a single preferred bank). Monnify requires
    // getAllAvailableBanks to be present (not null) — send it explicitly false.
    payload.getAllAvailableBanks = false;
    payload.preferredBanks =
      input.preferredBanks && input.preferredBanks.length > 0
        ? [input.preferredBanks[0]]
        : [this.defaultBankCode];

    const res = await fetch(`${this.baseUrl}/api/v2/bank-transfer/reserved-accounts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body: any = await res.json().catch(() => ({}));
    const rb = body?.responseBody;
    if (!res.ok || !rb) {
      this.logger.error(`Monnify reserved-account failed: ${res.status} ${JSON.stringify(body)}`);
      throw new BadRequestException(
        body?.responseMessage || 'Could not create a virtual account with Monnify.',
      );
    }
    const accounts = (rb.accounts || []).map((a: any) => ({
      accountNumber: a.accountNumber,
      accountName: a.accountName || rb.accountName,
      bankName: a.bankName,
      bankCode: a.bankCode,
    }));
    return {
      accountReference: rb.accountReference || input.accountReference,
      reservationReference: rb.reservationReference,
      accounts,
    };
  }

  verifyWebhookSignature(rawBody: string, signature: string | undefined): boolean {
    if (!signature || !this.secretKey) return false;
    const computed = crypto
      .createHmac('sha512', this.secretKey)
      .update(rawBody, 'utf8')
      .digest('hex');
    try {
      const a = Buffer.from(computed);
      const b = Buffer.from(signature);
      return a.length === b.length && crypto.timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }

  parseWebhookEvent(body: any): NormalizedPaymentEvent {
    // Monnify v2 webhook: { eventType, eventData: { ... } }
    const eventType = body?.eventType || body?.eventData?.paymentStatus || 'UNKNOWN';
    const data = body?.eventData || body || {};
    const status = (data.paymentStatus || '').toUpperCase();
    const isSuccessful =
      eventType === 'SUCCESSFUL_TRANSACTION' || status === 'PAID' || status === 'SUCCESS';
    return {
      eventType,
      isSuccessful,
      transactionReference: data.transactionReference,
      paymentReference: data.paymentReference,
      amountPaid: Number(data.amountPaid ?? data.amount ?? 0),
      accountReference:
        data.product?.reference || data.accountReference || data.destinationAccountInformation?.accountReference,
      currency: data.currencyCode || data.currency || 'NGN',
      paidAt: data.paidOn || data.completedOn,
      raw: body,
    };
  }
}
