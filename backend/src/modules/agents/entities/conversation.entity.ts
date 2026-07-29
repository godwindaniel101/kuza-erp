import { Entity, Column, Index } from 'typeorm';
import { TenantEntity } from '../../../common/entities/base.entity';
import { ChannelType } from './channel-connection.entity';

/**
 * Conversation lifecycle:
 *  - open        → the agent is handling it autonomously (CONVERSE + READ only);
 *  - needs_human → the agent escalated (money intent, guardrail hit, or a topic
 *                  it may not act on) and is waiting for a human;
 *  - human       → a human has taken over (agent stops auto-replying);
 *  - closed      → resolved / archived.
 */
export type ConversationStatus = 'open' | 'needs_human' | 'human' | 'closed';

/**
 * A thread with a single customer on a single channel. Lives in the tenant
 * schema. `customerExternalId` is the channel-side id (phone / IG user id) —
 * treated as UNTRUSTED input, never used to look up cross-tenant data.
 */
@Entity('agent_conversations')
export class Conversation extends TenantEntity {
  @Column({ type: 'varchar' })
  channel: ChannelType;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  channelConnectionId: string;

  /** Channel-side customer identifier (UNTRUSTED). */
  @Column()
  customerExternalId: string;

  /** Best-known display name for the customer (from the channel profile). */
  @Column({ nullable: true })
  customerName: string;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  agentId: string;

  @Column({ type: 'varchar', default: 'open' })
  status: ConversationStatus;

  /** Set when a human takes over (human-in-the-loop). */
  @Column({ type: 'uuid', nullable: true })
  assignedHumanUserId: string;

  @Column({ type: 'timestamptz', nullable: true })
  lastMessageAt: Date;
}
