import {
  Controller,
  Post,
  Param,
  Body,
  Headers,
  Req,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { WebhookTenantGuard } from './guards/webhook-tenant.guard';
import { WebhooksService } from './webhooks.service';

/**
 * Public (unauthenticated) webhook receiver.
 *
 * @Public() makes the global JwtAuthGuard and TenantGuard skip this route;
 * WebhookTenantGuard then resolves the tenant from the landlord-side
 * webhook route table and sets request.tenant, which the global
 * TenantTransactionInterceptor uses to pin the tenant schema — the same
 * mechanism authenticated requests use. See guards/webhook-tenant.guard.ts.
 */
@ApiTags('Integrations')
@Controller('integrations/webhooks')
@Public()
@UseGuards(WebhookTenantGuard)
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post(':connectionId')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Provider webhook receiver (Paystack, Monnify, ...) — no auth, signature-verified',
  })
  async handle(
    @Param('connectionId') connectionId: string,
    @Headers() headers: Record<string, any>,
    @Body() body: any,
    @Req() req: any,
  ) {
    // Signature verification wants the raw bytes. The global JSON body
    // parser (main.ts) consumes the stream, so when req.rawBody is absent
    // we fall back to re-serializing the parsed body — byte-identical for
    // the compact JSON Paystack/Monnify send. Enabling `rawBody: true` in
    // main.ts makes this exact (documented in docs/INTEGRATIONS.md).
    const rawBody: string =
      req?.rawBody instanceof Buffer
        ? req.rawBody.toString('utf8')
        : typeof req?.rawBody === 'string'
          ? req.rawBody
          : JSON.stringify(body ?? {});

    const data = await this.webhooksService.handleWebhook(
      connectionId,
      headers || {},
      body,
      rawBody,
    );
    return { success: true, data };
  }
}
