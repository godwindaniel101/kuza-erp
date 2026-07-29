import { Entity, Column, Index } from 'typeorm';
import { TenantEntity } from '../../../common/entities/base.entity';

/**
 * The social/web channels an agent can be reached on. Enum kept in sync with
 * the channel plugins in plugin-registry.ts.
 */
export type ChannelType =
  | 'whatsapp'
  | 'instagram'
  | 'tiktok'
  | 'messenger'
  | 'telegram'
  | 'webchat';

export type ChannelStatus = 'connected' | 'disconnected' | 'pending' | 'error';

/**
 * A connection between the business and one channel account (a WhatsApp number,
 * an Instagram page, …). Lives in the tenant schema.
 *
 * SECRET-SAFETY: this row stores only NON-SECRET config and *references* to
 * credentials held elsewhere (env / a future secret store). Raw OAuth tokens,
 * API keys or webhook signing secrets MUST NEVER be persisted here — `config`
 * carries a `secretRef` string (a lookup key), never the secret itself. Real
 * OAuth exchange is a Phase-1 stub (see channels.service.ts).
 */
@Entity('agent_channel_connections')
export class ChannelConnection extends TenantEntity {
  @Column({ type: 'varchar' })
  type: ChannelType;

  /** Owner-facing label, e.g. "Main WhatsApp line". */
  @Column({ nullable: true })
  displayName: string;

  @Column({ type: 'varchar', default: 'disconnected' })
  status: ChannelStatus;

  /**
   * The channel-side identifier this connection maps to (WhatsApp phone-number
   * id, IG page id, Telegram bot username, …). NOT a secret — safe to display.
   */
  @Column({ nullable: true })
  externalRef: string;

  /** The agent assigned to answer on this channel (nullable = unassigned). */
  @Index()
  @Column({ type: 'uuid', nullable: true })
  agentId: string;

  /**
   * Non-secret connection config + credential *references* only, e.g.
   * { secretRef: "wa:main", webhookVerified: false, scopes: [...] }.
   * See the secret-safety note above — never raw tokens.
   */
  @Column({ type: 'jsonb', nullable: true })
  config: Record<string, any>;
}
