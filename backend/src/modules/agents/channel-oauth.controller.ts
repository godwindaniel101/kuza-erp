import { Controller, Get, Query, Res, Logger } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { ChannelOAuthService } from './channel-oauth.service';

/**
 * The Meta (Facebook Login) OAuth callback. Deliberately its OWN controller
 * with NO class-level guards so the @Public method is reachable without a JWT
 * or tenant header — Meta calls it directly, exactly like the Google OAuth
 * callback in auth.controller. Tenant + connection identity travels in the
 * encrypted `state` param (crypto.util), so no request context is needed.
 */
@ApiTags('AI Agents')
@Controller('ai/channels/oauth')
export class ChannelOAuthController {
  private readonly logger = new Logger(ChannelOAuthController.name);

  constructor(private readonly oauth: ChannelOAuthService) {}

  @Public()
  @Get('meta/callback')
  @ApiExcludeEndpoint()
  @ApiOperation({ summary: 'Meta OAuth callback (WhatsApp / Instagram / Messenger)' })
  async metaCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5001';
    if (error || !code || !state) {
      return res.redirect(`${frontendUrl}/ai/channels?error=oauth`);
    }
    try {
      const redirectTo = await this.oauth.handleMetaCallback(code, state);
      return res.redirect(redirectTo);
    } catch (e: any) {
      // Never surface token/exchange details to the browser.
      this.logger.warn(`Meta callback failed: ${e?.message}`);
      return res.redirect(`${frontendUrl}/ai/channels?error=oauth`);
    }
  }
}
