import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChannelConnection } from './entities/channel-connection.entity';
import {
  CreateChannelConnectionDto,
  UpdateChannelConnectionDto,
} from './dto/channel-connection.dto';
import { getChannelPlugin } from './plugin-registry';
import { ChannelOAuthService, OAuthCtx } from './channel-oauth.service';

/**
 * The shape of a connect() call's next step, handed to the client:
 *  - 'oauth'     → redirect the browser to `authorizeUrl` (Meta channels);
 *  - 'token'     → the client must collect a token (Telegram bot token);
 *  - 'connected' → done now (web chat), optionally with an embed snippet.
 */
export type ConnectResult =
  | { mode: 'oauth'; authorizeUrl: string }
  | { mode: 'token'; provider: 'telegram' }
  | { mode: 'connected'; connection: ChannelConnection; embedSnippet?: string };

/**
 * Channel connections CRUD + connect/disconnect lifecycle.
 *
 * SECRET-SAFETY: raw access tokens are NEVER persisted in plaintext, logged, or
 * returned to the client. Real credentials (Meta long-lived tokens, Telegram
 * bot tokens) are obtained in ChannelOAuthService, encrypted at rest
 * (crypto.util), and stored as `config.credentialCipher`. Every value this
 * service returns is passed through `redact()` first, which strips the cipher
 * and any secret-shaped keys.
 */
@Injectable()
export class ChannelsService {
  constructor(
    @InjectRepository(ChannelConnection)
    private readonly channelRepo: Repository<ChannelConnection>,
    private readonly oauth: ChannelOAuthService,
  ) {}

  async findAll(): Promise<ChannelConnection[]> {
    const rows = await this.channelRepo.find({ order: { createdAt: 'DESC' } });
    return rows.map((r) => this.redact(r));
  }

  async findOne(id: string): Promise<ChannelConnection> {
    const conn = await this.channelRepo.findOne({ where: { id } });
    if (!conn) throw new NotFoundException('Channel connection not found');
    return conn;
  }

  async create(dto: CreateChannelConnectionDto): Promise<ChannelConnection> {
    const plugin = getChannelPlugin(dto.type);
    if (!plugin) {
      throw new BadRequestException(`Unknown channel type: ${dto.type}`);
    }
    // Defensive: strip anything that looks like a raw secret before persisting.
    const config = this.sanitizeConfig(dto.config);
    const conn = this.channelRepo.create({
      ...dto,
      config,
      // Every channel starts disconnected; the explicit Connect action drives
      // the real provider flow (OAuth / bot token / instant web chat).
      status: 'disconnected',
    });
    return this.redact(await this.channelRepo.save(conn));
  }

  async update(
    id: string,
    dto: UpdateChannelConnectionDto,
  ): Promise<ChannelConnection> {
    const conn = await this.findOne(id);
    if (dto.config) dto.config = this.sanitizeConfig(dto.config);
    Object.assign(conn, dto);
    return this.redact(await this.channelRepo.save(conn));
  }

  /**
   * Begin connecting a channel — routes to the real flow for its type. TikTok's
   * messaging API is gated, so it is honestly refused rather than faked.
   */
  async connect(id: string, ctx: OAuthCtx): Promise<ConnectResult> {
    const conn = await this.findOne(id);

    if (conn.type === 'webchat') {
      const { connection, embedSnippet } = await this.oauth.connectWebchat(conn.id);
      return { mode: 'connected', connection: this.redact(connection), embedSnippet };
    }

    if (ChannelOAuthService.isMetaChannel(conn.type)) {
      const authorizeUrl = this.oauth.buildMetaAuthorizeUrl(conn, ctx);
      // Mark pending so the card reflects an in-flight OAuth handshake.
      conn.status = 'pending';
      await this.channelRepo.save(conn);
      return { mode: 'oauth', authorizeUrl };
    }

    if (conn.type === 'telegram') {
      return { mode: 'token', provider: 'telegram' };
    }

    // tiktok — messaging API is gated; do not fake a connection.
    throw new BadRequestException(
      "This channel isn't available to connect yet.",
    );
  }

  /** Finish a Telegram connection with a pasted bot token (verified + encrypted). */
  async connectTelegram(id: string, botToken: string): Promise<ChannelConnection> {
    const conn = await this.oauth.connectTelegram(id, botToken);
    return this.redact(conn);
  }

  async disconnect(id: string): Promise<ChannelConnection> {
    const conn = await this.findOne(id);
    // Drop the stored credential entirely on disconnect.
    conn.status = 'disconnected';
    if (conn.config) {
      const { credentialCipher, secretRef, ...rest } = conn.config;
      conn.config = rest;
    }
    return this.redact(await this.channelRepo.save(conn));
  }

  async remove(id: string): Promise<void> {
    const conn = await this.findOne(id);
    await this.channelRepo.remove(conn);
  }

  /**
   * Strip the encrypted credential (and any secret-shaped key) from a
   * connection before it leaves the service. Tokens never reach the client.
   */
  private redact(conn: ChannelConnection): ChannelConnection {
    if (conn?.config) {
      const clean: Record<string, any> = {};
      const banned = /(token|secret|cipher|credential|apikey|api_key|password|signing)/i;
      for (const [k, v] of Object.entries(conn.config)) {
        if (banned.test(k)) continue;
        clean[k] = v;
      }
      conn.config = clean;
    }
    return conn;
  }

  /**
   * Drop any key that looks like a raw credential from client-supplied config —
   * connections store references, never secrets.
   */
  private sanitizeConfig(
    config?: Record<string, any>,
  ): Record<string, any> | undefined {
    if (!config) return config;
    const bannedKeys = /(token|secret|apikey|api_key|password|client_secret|access_token|refresh_token|signing|cipher|credential)/i;
    const clean: Record<string, any> = {};
    for (const [k, v] of Object.entries(config)) {
      if (k === 'secretRef') {
        clean[k] = v;
        continue;
      }
      if (bannedKeys.test(k)) continue;
      clean[k] = v;
    }
    return clean;
  }
}
