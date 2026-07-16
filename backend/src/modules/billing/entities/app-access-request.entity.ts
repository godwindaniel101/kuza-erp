import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

export type AccessRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

/**
 * A tenant user's request to unlock an app that is not currently effective —
 * LANDLORD-scoped (lives in the landlord/public database alongside
 * TenantSubscription). Registered on the 'landlord' connection, so no
 * tenant-schema migration is needed. Approval flips the tenant's
 * Business.enabledApps via BillingService.setAppEnabled (respecting the plan).
 */
@Entity('app_access_requests')
@Index(['tenantId', 'appKey', 'status'])
export class AppAccessRequest extends BaseEntity {
  @Column({ type: 'uuid' })
  tenantId: string;

  @Column({ type: 'varchar' })
  appKey: string;

  @Column({ type: 'uuid', nullable: true })
  requestedByUserId: string | null;

  @Column({ type: 'varchar', nullable: true })
  requestedByEmail: string | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ type: 'varchar', default: 'PENDING' })
  status: AccessRequestStatus;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt: Date | null;

  @Column({ type: 'varchar', nullable: true })
  resolvedBy: string | null;
}
