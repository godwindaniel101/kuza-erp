import { Entity, Column, Index } from 'typeorm';
import { TenantEntity } from '../../../common/entities/base.entity';

/**
 * Training material the agent may READ to answer customers:
 *  - faq       → a question/answer pair;
 *  - policy    → returns, hours, shipping — plain business rules;
 *  - catalog   → a synced catalog snapshot/summary (from the items app);
 *  - freeform  → any other reference text the owner pastes in.
 */
export type KnowledgeDocType = 'faq' | 'policy' | 'catalog' | 'freeform';

export type KnowledgeDocStatus = 'active' | 'archived';

/**
 * A knowledge/training document. Lives in the tenant schema. `agentId` null =
 * shared across all of the business's agents; set = scoped to one agent.
 *
 * READ-ONLY at runtime: the agent retrieves these to ground its answers; it
 * never writes them. Editing/curation is a human action in the Training UI.
 */
@Entity('agent_knowledge_docs')
export class AgentKnowledgeDoc extends TenantEntity {
  @Index()
  @Column({ type: 'uuid', nullable: true })
  agentId: string;

  @Column()
  title: string;

  @Column({ type: 'varchar', default: 'freeform' })
  type: KnowledgeDocType;

  @Column({ type: 'text', nullable: true })
  content: string;

  /** Optional source (e.g. a synced catalog ref or an uploaded doc name). */
  @Column({ nullable: true })
  sourceRef: string;

  @Column({ type: 'varchar', default: 'active' })
  status: KnowledgeDocStatus;

  @Column({ type: 'jsonb', nullable: true })
  meta: Record<string, any>;
}
