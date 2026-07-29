import { Entity, Column, Index } from 'typeorm';
import { TenantEntity } from '../../../common/entities/base.entity';

export type MessageDirection = 'inbound' | 'outbound';

/**
 * Who produced an outbound message: the agent (LLM) or a human operator who
 * took the conversation over. Inbound is always the customer.
 */
export type MessageAuthor = 'customer' | 'agent' | 'human';

/**
 * A single message in a conversation. Lives in the tenant schema.
 * `content` from an inbound message is UNTRUSTED customer text — the runtime
 * treats it as data, never as instructions (prompt-injection defense).
 */
@Entity('agent_messages')
export class Message extends TenantEntity {
  @Index()
  @Column({ type: 'uuid' })
  conversationId: string;

  @Column({ type: 'varchar' })
  direction: MessageDirection;

  @Column({ type: 'varchar', default: 'customer' })
  author: MessageAuthor;

  @Column({ type: 'text' })
  content: string;

  /** Channel metadata (message id, attachments, delivery status, …). */
  @Column({ type: 'jsonb', nullable: true })
  meta: Record<string, any>;
}
