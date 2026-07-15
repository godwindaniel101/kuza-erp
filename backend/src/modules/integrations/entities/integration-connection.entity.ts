import { Entity, Column, Index } from 'typeorm';
import { TenantEntity } from '../../../common/entities/base.entity';

export type IntegrationType = 'PAYMENTS' | 'POS' | 'BANKING';
export type IntegrationStatus = 'ACTIVE' | 'DISABLED';

export const INTEGRATION_TYPES: IntegrationType[] = [
  'PAYMENTS',
  'POS',
  'BANKING',
];
export const INTEGRATION_STATUSES: IntegrationStatus[] = [
  'ACTIVE',
  'DISABLED',
];

/** Known providers; kept as a plain string column so new adapters need no migration. */
export const KNOWN_PROVIDERS = ['paystack', 'monnify', 'generic_pos'] as const;

/**
 * A configured link to an external provider (payment gateway, POS, bank).
 *
 * `config` holds provider credentials/settings (apiKey, secretKey,
 * contractCode, ...). Secret-ish values are NEVER returned by the API —
 * see ConnectionsService.redactConfig.
 */
@Entity('integration_connections')
export class IntegrationConnection extends TenantEntity {
  @Index()
  @Column()
  provider: string;

  @Column({ type: 'varchar', length: 20 })
  type: IntegrationType;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status: IntegrationStatus;

  @Column()
  label: string;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  config: Record<string, any>;

  /** Auto-generated at creation; shared with the provider dashboard where applicable. */
  @Column()
  webhookSecret: string;
}
