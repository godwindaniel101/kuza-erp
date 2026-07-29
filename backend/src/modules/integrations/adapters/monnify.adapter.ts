import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto';
import {
  PaymentProviderPort,
  ProviderConfig,
  CreateVirtualAccountInput,
  VirtualAccountInfo,
  NormalizedPaymentEvent,
} from '../ports/payment-provider.port';

const MONNIFY_SANDBOX_URL = 'https://sandbox.monnify.com';

/**
 * Monnify adapter.
 *
 * config shape: {
 *   apiKey: 'MK_...', secretKey: '...', contractCode: '...',
 *   baseUrl?: 'https://api.monnify.com' (defaults to sandbox)
 * }
 *
 * Webhooks: Monnify signs the RAW request body with your client secret key
 * using HMAC-SHA512 and sends it as `monnify-signature`.
 */
@Injectable()
export class MonnifyAdapter implements PaymentProviderPort {
  readonly provider = 'monnify';
  private readonly logger = new Logger(MonnifyAdapter.name);

  parseWebhook(
    headers: Record<string, any>,
    rawBody: string,
    config: ProviderConfig,
    _webhookSecret: string,
  ): NormalizedPaymentEvent | null {
    const signature = String(headers['monnify-signature'] || '');

    if (config?.secretKey) {
      const expected = createHmac('sha512', String(config.secretKey))
        .update(rawBody)
        .digest('hex');
      if (!signature || !this.safeEqual(expected, signature)) {
        throw new UnauthorizedException('Invalid Monnify webhook signature');
      }
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return null;
    }

    // Current shape: { eventType: 'SUCCESSFUL_TRANSACTION', eventData: {...} }
    if (payload?.eventType === 'SUCCESSFUL_TRANSACTION' && payload?.eventData) {
      const data = payload.eventData;
      return {
        amount: Number(data.amountPaid ?? data.totalPayable ?? 0),
        currency: data.currency || data.currencyCode || 'NGN',
        reference: String(data.paymentReference || data.transactionReference || ''),
        paidAt: data.paidOn || new Date().toISOString(),
        payerName: data.customer?.name || data.customer?.email || null,
        eventType: 'SUCCESSFUL_TRANSACTION',
      };
    }

    // Legacy flat shape: { paymentStatus: 'PAID', amountPaid, paymentReference, ... }
    if (payload?.paymentStatus === 'PAID' && payload?.paymentReference) {
      return {
        amount: Number(payload.amountPaid ?? 0),
        currency: payload.currency || payload.currencyCode || 'NGN',
        reference: String(payload.paymentReference),
        paidAt: payload.paidOn || new Date().toISOString(),
        payerName: payload.customer?.name || payload.customerName || null,
        eventType: 'SUCCESSFUL_TRANSACTION',
      };
    }

    return null;
  }

  async createVirtualAccount(
    input: CreateVirtualAccountInput,
    config: ProviderConfig,
  ): Promise<VirtualAccountInfo> {
    if (!config?.apiKey || !config?.secretKey || !config?.contractCode) {
      throw new BadRequestException(
        'Provider API key not configured — add it in integration settings',
      );
    }

    const baseUrl = (config.baseUrl || MONNIFY_SANDBOX_URL).replace(/\/$/, '');

    // Step 1: exchange apiKey:secretKey for a bearer token.
    const basic = Buffer.from(`${config.apiKey}:${config.secretKey}`).toString(
      'base64',
    );
    const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { Authorization: `Basic ${basic}` },
    });
    const loginJson: any = await loginRes.json().catch(() => ({}));
    const accessToken = loginJson?.responseBody?.accessToken;
    if (!loginRes.ok || !accessToken) {
      this.logger.warn(
        `Monnify auth failed: ${loginRes.status} ${loginJson?.responseMessage}`,
      );
      throw new BadRequestException(
        `Monnify authentication failed: ${loginJson?.responseMessage || loginRes.status}`,
      );
    }

    // Step 2: create the reserved account.
    const accountReference = `kuza-${input.customerId}-${randomUUID().slice(0, 8)}`;
    const reservedRes = await fetch(
      `${baseUrl}/api/v2/bank-transfer/reserved-accounts`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountReference,
          accountName: input.customerName,
          currencyCode: input.currency || 'NGN',
          contractCode: config.contractCode,
          customerEmail:
            input.customerEmail || `${input.customerId}@customers.kuza.africa`,
          customerName: input.customerName,
          getAllAvailableBanks: true,
        }),
      },
    );
    const reservedJson: any = await reservedRes.json().catch(() => ({}));
    if (!reservedRes.ok || reservedJson?.requestSuccessful !== true) {
      this.logger.warn(
        `Monnify reserved account failed: ${reservedRes.status} ${reservedJson?.responseMessage}`,
      );
      throw new BadRequestException(
        `Monnify rejected virtual account creation: ${reservedJson?.responseMessage || reservedRes.status}`,
      );
    }

    const body = reservedJson.responseBody || {};
    const account = Array.isArray(body.accounts) ? body.accounts[0] : body;
    return {
      provider: this.provider,
      bankName: account?.bankName || '',
      accountNumber: account?.accountNumber || '',
      accountName: account?.accountName || input.customerName,
      reference: body.accountReference || accountReference,
      raw: body,
    };
  }

  private safeEqual(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  }
}
