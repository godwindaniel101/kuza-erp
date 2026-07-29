import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * Landlord-scoped (public database) lookup: maps an integration connection
 * id — the only thing an inbound webhook URL carries — to the tenant that
 * owns it.
 *
 * Why this exists: IntegrationConnection lives in the tenant schema, which
 * is unreachable until a tenant context is established, and webhooks carry
 * no JWT. This row is written on the landlord connection when a connection
 * is created, so WebhookTenantGuard can resolve the tenant BEFORE the
 * tenant transaction starts. Registered on the 'landlord' TypeORM
 * connection (see common/landlord/landlord.module.ts), same pattern as
 * billing's Plan / TenantSubscription.
 */
@Entity('integration_webhook_routes')
export class LandlordWebhookRoute extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'uuid' })
  connectionId: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId: string;

  @Column()
  schemaName: string;

  @Column()
  provider: string;
}
