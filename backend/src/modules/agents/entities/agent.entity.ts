import { Entity, Column } from 'typeorm';
import { TenantEntity } from '../../../common/entities/base.entity';

/**
 * A Kuza Agent — an AI persona a business creates to converse with customers
 * across social channels (WhatsApp, Instagram, …). Lives in the tenant schema.
 *
 * PHASE 1 (foundation) scope: an agent may CONVERSE and READ (catalog, FAQ,
 * business info). It must NEVER autonomously move money — order/payment/
 * delivery capabilities are framework + guarded stubs behind human approval
 * (see AgentAction + plugin-registry.ts). `enabledCapabilities` lists the
 * capability-plugin keys the owner has switched on for this agent; enabling a
 * money-path capability only unlocks the HUMAN-IN-THE-LOOP flow, never
 * autonomous execution.
 */
export type AgentStatus = 'active' | 'paused';

@Entity('agents')
export class Agent extends TenantEntity {
  @Column()
  name: string;

  @Column({ nullable: true })
  avatarUrl: string;

  /** Persona tone, e.g. "friendly", "professional", "playful". */
  @Column({ nullable: true })
  tone: string;

  /** Persona voice/character description (free text). */
  @Column({ type: 'text', nullable: true })
  voice: string;

  /** BCP-47-ish language tags the agent may speak, e.g. ["en","pcm","yo"]. */
  @Column({ type: 'jsonb', nullable: true })
  languages: string[];

  /**
   * Working-hours config, e.g. { timezone, days: {mon:{from,to}}, alwaysOn }.
   * Outside hours the agent can still auto-reply "we're closed" — never a money
   * action. Free-form JSON to stay flexible for Phase 4 persona tuning.
   */
  @Column({ type: 'jsonb', nullable: true })
  workingHours: Record<string, any>;

  /** LLM model id override; null → the platform default (AI_MODEL env). */
  @Column({ nullable: true })
  model: string;

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  temperature: number;

  /** Owner-authored additions to the system prompt (persona instructions). */
  @Column({ type: 'text', nullable: true })
  systemPromptExtras: string;

  /**
   * Guardrails as JSON, e.g. { maxDiscountPct: 0, allowRefunds: false,
   * bannedTopics: [...], escalateKeywords: [...] }. The runtime treats these as
   * hard limits and ALWAYS enforces the platform money-path rules on top —
   * guardrails can only tighten, never loosen, the safety model.
   */
  @Column({ type: 'jsonb', nullable: true })
  guardrails: Record<string, any>;

  @Column({ type: 'varchar', default: 'active' })
  status: AgentStatus;

  /**
   * Capability-plugin keys enabled for this agent (see plugin-registry.ts):
   * e.g. ["catalog","knowledge","orders"]. Money-path capabilities
   * (orders/payments/delivery) only unlock the human-approval flow.
   */
  @Column({ type: 'jsonb', nullable: true })
  enabledCapabilities: string[];
}
