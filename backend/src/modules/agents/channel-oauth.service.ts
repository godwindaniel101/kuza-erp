import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ChannelConnection, ChannelType } from './entities/channel-connection.entity';
import { encryptSecret, encodeOAuthState, decodeOAuthState } from './crypto.util';

/** Tenant context threaded from the authenticated controller for initiate flows. */
export interface OAuthCtx {
  tenantId?: string;
  schemaName?: string;
}

/**
 * Real channel connect flows. Access tokens obtained here are CREDENTIALS:
 * they are encrypted at rest (crypto.util) before touching the DB, never
 * logged, and never returned to the client. Connecting a channel does NOT
 * widen the agent runtime — it stays read-only and money-path tools stay
 * allowlisted-out (see agent-runtime.service + plugin-registry).
 */
@Injectable()
export class ChannelOAuthService {
  private readonly logger = new Logger(ChannelOAuthService.name);

  private static readonly GRAPH = 'https://graph.facebook.com/v19.0';
  private static readonly DIALOG = 'https://www.facebook.com/v19.0/dialog/oauth';

  /** Meta channel → the exact permission scopes we request. */
  private static readonly META_SCOPES: Record<string, string[]> = {
    whatsapp: ['whatsapp_business_management', 'whatsapp_business_messaging'],
    instagram: ['instagram_basic', 'instagram_manage_messages', 'pages_show_list'],
    messenger: ['pages_messaging', 'pages_manage_metadata'],
  };

  static isMetaChannel(type: string): boolean {
    return type === 'whatsapp' || type === 'instagram' || type === 'messenger';
  }

  constructor(
    @InjectRepository(ChannelConnection)
    private readonly channelRepo: Repository<ChannelConnection>,
    // The @Public OAuth callback has no tenant-pinned connection, so it writes
    // to the tenant schema explicitly (schema-qualified) via the root DataSource.
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  // ── Meta (Facebook Login) ──────────────────────────────────────────────────

  /**
   * Build the Meta OAuth dialog URL for a connection. The tenant + connection
   * identity is carried in an ENCRYPTED, expiring `state` param (crypto.util) —
   * so the @Public callback can resolve which tenant/connection to write to
   * without exposing identifiers in the URL.
   */
  buildMetaAuthorizeUrl(conn: ChannelConnection, ctx: OAuthCtx): string {
    const appId = process.env.META_APP_ID;
    const callbackUrl = process.env.META_OAUTH_CALLBACK_URL;
    if (!appId || !callbackUrl) {
      throw new BadRequestException(
        'Meta OAuth is not configured (META_APP_ID / META_OAUTH_CALLBACK_URL).',
      );
    }
    if (!ctx.schemaName || !ctx.tenantId) {
      throw new BadRequestException('Missing tenant context for OAuth.');
    }
    const scopes = ChannelOAuthService.META_SCOPES[conn.type] ?? [];
    const state = encodeOAuthState({
      tenantId: ctx.tenantId,
      schemaName: ctx.schemaName,
      connectionId: conn.id,
      type: conn.type,
    });
    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: callbackUrl,
      state,
      response_type: 'code',
      scope: scopes.join(','),
    });
    return `${ChannelOAuthService.DIALOG}?${params.toString()}`;
  }

  /**
   * Meta OAuth callback: exchange `code` → short-lived token → LONG-LIVED token,
   * encrypt it, and store it on the tenant's ChannelConnection (status →
   * connected). Returns the frontend URL to redirect the browser back to.
   * Throws are handled by the controller which redirects with an error flag.
   */
  async handleMetaCallback(code: string, rawState: string): Promise<string> {
    const state = decodeOAuthState(rawState); // throws if tampered/expired
    if (!/^[A-Za-z0-9_]+$/.test(state.schemaName)) {
      throw new BadRequestException('Invalid tenant schema in state');
    }

    const appId = process.env.META_APP_ID!;
    const appSecret = process.env.META_APP_SECRET!;
    const callbackUrl = process.env.META_OAUTH_CALLBACK_URL!;

    // 1) code → short-lived token
    const shortLived = await this.metaTokenExchange({
      client_id: appId,
      client_secret: appSecret,
      redirect_uri: callbackUrl,
      code,
    });

    // 2) short-lived → long-lived token
    const longLived = await this.metaTokenExchange({
      grant_type: 'fb_exchange_token',
      client_id: appId,
      client_secret: appSecret,
      fb_exchange_token: shortLived,
    });

    // Encrypt BEFORE it touches the DB; never store/log the plaintext.
    const credentialCipher = encryptSecret(longLived);
    const config = {
      provider: 'meta',
      scopes: ChannelOAuthService.META_SCOPES[state.type] ?? [],
      connectedAt: new Date().toISOString(),
      credentialCipher,
    };

    await this.dataSource.query(
      `UPDATE "${state.schemaName}"."agent_channel_connections"
          SET status = 'connected', config = $1::jsonb, updated_at = now()
        WHERE id = $2`,
      [JSON.stringify(config), state.connectionId],
    );

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5001';
    return `${frontendUrl}/ai/channels?connected=${state.type}`;
  }

  /** POST graph oauth/access_token and return the access_token, or throw. */
  private async metaTokenExchange(params: Record<string, string>): Promise<string> {
    const qs = new URLSearchParams(params).toString();
    const url = `${ChannelOAuthService.GRAPH}/oauth/access_token?${qs}`;
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) {
      // Do not include the response body — it can echo sensitive params.
      this.logger.warn(`Meta token exchange failed: HTTP ${res.status}`);
      throw new BadRequestException('Meta token exchange failed');
    }
    const data: any = await res.json();
    if (!data?.access_token) {
      throw new BadRequestException('Meta did not return an access token');
    }
    return data.access_token as string;
  }

  // ── Telegram (bot token, no OAuth) ──────────────────────────────────────────

  /**
   * Connect a Telegram bot by its BotFather token. We verify the token with
   * getMe, then store it ENCRYPTED. The plaintext token is never persisted,
   * logged, or returned.
   */
  async connectTelegram(
    connectionId: string,
    botToken: string,
  ): Promise<ChannelConnection> {
    const conn = await this.channelRepo.findOne({ where: { id: connectionId } });
    if (!conn) throw new NotFoundException('Channel connection not found');
    if (conn.type !== 'telegram') {
      throw new BadRequestException('Not a Telegram channel');
    }
    const token = (botToken || '').trim();
    if (!token) throw new BadRequestException('A bot token is required');

    // Verify with getMe (does not expose the token in our logs).
    let username: string | undefined;
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const data: any = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error('invalid');
      }
      username = data.result?.username;
    } catch {
      throw new BadRequestException('Could not verify the bot token with Telegram');
    }

    conn.status = 'connected';
    conn.externalRef = username ?? conn.externalRef;
    conn.config = {
      provider: 'telegram',
      botUsername: username,
      connectedAt: new Date().toISOString(),
      credentialCipher: encryptSecret(token),
    };
    return this.channelRepo.save(conn);
  }

  // ── Web chat (instant, no external) ─────────────────────────────────────────

  /**
   * Web chat needs no external provider: mark connected and return an embed
   * snippet the owner drops on their site. The snippet carries only the public
   * connection id — no secret.
   */
  async connectWebchat(
    connectionId: string,
  ): Promise<{ connection: ChannelConnection; embedSnippet: string }> {
    const conn = await this.channelRepo.findOne({ where: { id: connectionId } });
    if (!conn) throw new NotFoundException('Channel connection not found');
    conn.status = 'connected';
    conn.config = {
      ...(conn.config ?? {}),
      provider: 'webchat',
      connectedAt: new Date().toISOString(),
    };
    const saved = await this.channelRepo.save(conn);
    const base = process.env.FRONTEND_URL || 'http://localhost:5001';
    const embedSnippet =
      `<script src="${base}/widget/kuza-chat.js" ` +
      `data-kuza-channel="${saved.id}" async></script>`;
    return { connection: saved, embedSnippet };
  }
}
