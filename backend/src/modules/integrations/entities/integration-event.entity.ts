import { Entity, Column, Index } from 'typeorm';
import { TenantEntity } from '../../../common/entities/base.entity';

export type IntegrationEventStatus =
  | 'RECEIVED'
  | 'PROCESSED'
  | 'FAILED'
  | 'IGNORED';

export const INTEGRATION_EVENT_STATUSES: IntegrationEventStatus[] = [
  'RECEIVED',
  'PROCESSED',
  'FAILED',
  'IGNORED',
];

/**
 * Append-only inbox of everything a provider ever sent us. Events are
 * never mutated after reaching a terminal status; failures keep the raw
 * payload so they can be replayed/debugged.
 */
@Entity('integration_events')
export class IntegrationEvent extends TenantEntity {
  @Index()
  @Column({ type: 'uuid' })
  connectionId: string;

  @Column()
  provider: string;

  @Column()
  eventType: string;

  /** Normalized payment/sale reference when the payload carried one — used for dedup. */
  @Index()
  @Column({ type: 'varchar', nullable: true })
  reference: string | null;

  @Column({ type: 'jsonb' })
  payload: Record<string, any>;

  @Column({ type: 'varchar', length: 20, default: 'RECEIVED' })
  status: IntegrationEventStatus;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  processedAt: Date | null;
}
