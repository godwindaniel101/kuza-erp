import { Entity, Column, Index } from 'typeorm';
import { TenantEntity } from '../../../common/entities/base.entity';

/**
 * Outcome of a tool call:
 *  - ok               → a READ-ONLY tool ran and returned data;
 *  - blocked          → the runtime refused (tool not on the read-only
 *                       allowlist, guardrail hit, or prompt-injection attempt);
 *  - pending_approval → a money-path capability was requested; a GUARDED STUB
 *                       recorded the intent and is waiting for a HUMAN to
 *                       approve (no money moved) — see plugin-registry.ts;
 *  - error            → the tool errored.
 */
export type AgentActionStatus = 'ok' | 'blocked' | 'pending_approval' | 'error';

/**
 * Immutable audit log of EVERY tool call an agent makes — the spine of the
 * money-path safety model. Nothing an agent does touches business data without
 * a row here first. Lives in the tenant schema.
 *
 * `moneyPath = true` marks actions that could move money / fulfil an order;
 * these are NEVER executed autonomously — the runtime only ever records them as
 * `pending_approval` for a human to review and approve.
 */
@Entity('agent_actions')
export class AgentAction extends TenantEntity {
  @Index()
  @Column({ type: 'uuid', nullable: true })
  agentId: string;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  conversationId: string;

  /** The plugin/tool key invoked, e.g. "catalog.search", "orders.draft". */
  @Column()
  tool: string;

  @Column({ default: false })
  moneyPath: boolean;

  @Column({ type: 'varchar', default: 'ok' })
  status: AgentActionStatus;

  /** Arguments the tool was called with (sanitized — never secrets). */
  @Column({ type: 'jsonb', nullable: true })
  input: Record<string, any>;

  /** Tool result, or the reason it was blocked / needs approval. */
  @Column({ type: 'jsonb', nullable: true })
  output: Record<string, any>;

  /** Human-readable reason (why blocked / what needs approving). */
  @Column({ type: 'text', nullable: true })
  reason: string;

  /** The human who reviewed a money-path action (approve/reject). */
  @Column({ type: 'uuid', nullable: true })
  reviewedByUserId: string;

  @Column({ type: 'timestamptz', nullable: true })
  reviewedAt: Date;
}
