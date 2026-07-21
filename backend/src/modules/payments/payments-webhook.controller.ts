import { Controller, Post, Req, Headers, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';

/**
 * Provider webhooks. Deliberately NOT behind auth/app guards — the provider
 * calls these unauthenticated; authenticity is proven by the signature over the
 * RAW body (rawBody is enabled in main.ts). Keep this controller guard-free.
 */
@ApiTags('Payments - Webhooks')
@Controller('payments/webhook')
export class PaymentsWebhookController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('monnify')
  @HttpCode(200)
  @ApiOperation({ summary: 'Monnify transaction webhook' })
  async monnify(@Req() req: any, @Headers('monnify-signature') signature?: string) {
    const raw: Buffer | undefined = req.rawBody;
    const rawBody = raw ? raw.toString('utf8') : JSON.stringify(req.body || {});
    return this.paymentsService.handleMonnifyWebhook(rawBody, signature);
  }
}
