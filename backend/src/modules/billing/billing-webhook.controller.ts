import {
  Controller,
  Post,
  Headers,
  Body,
  Req,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { BillingService } from './billing.service';

/**
 * Public (unauthenticated) receiver for the PLATFORM Paystack account's
 * subscription-checkout webhooks.
 *
 * This is intentionally separate from the tenant-collection webhook receiver
 * (integrations/webhooks/:connectionId): subscription payments are LANDLORD-
 * scoped (the platform charges the tenant for a plan) and carry no tenant
 * schema. @Public() makes the global JwtAuthGuard + TenantGuard skip, so no
 * tenant context is pinned — BillingService.handlePaystackWebhook works purely
 * against landlord tables. The signature is still verified (HMAC-SHA512) by
 * reusing the existing PaystackAdapter, so this endpoint is safe to expose.
 */
@ApiTags('Billing')
@Controller('billing/webhooks')
@Public()
export class BillingWebhookController {
  constructor(private readonly billingService: BillingService) {}

  @Post('paystack')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Paystack subscription webhook — no auth, signature-verified',
  })
  async paystack(
    @Headers() headers: Record<string, any>,
    @Body() body: any,
    @Req() req: any,
  ) {
    // HMAC is computed over the raw bytes. main.ts enables rawBody; fall back
    // to re-serializing the parsed body (byte-identical for Paystack's compact
    // JSON) — same approach as the integrations webhook receiver.
    const rawBody: string =
      req?.rawBody instanceof Buffer
        ? req.rawBody.toString('utf8')
        : typeof req?.rawBody === 'string'
          ? req.rawBody
          : JSON.stringify(body ?? {});

    const data = await this.billingService.handlePaystackWebhook(
      headers || {},
      rawBody,
    );
    return { success: true, data };
  }
}
