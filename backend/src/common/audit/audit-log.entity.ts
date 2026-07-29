import { Entity, Column, Index } from 'typeorm';
import { TenantEntity } from '../entities/base.entity';

/**
 * Tenant-scoped audit trail of mutating requests. Lives in each tenant's
 * schema like any other TenantEntity (synchronize creates it in public;
 * tenant provisioning clones it into tenant schemas).
 */
@Entity('audit_logs')
export class AuditLog extends TenantEntity {
  /** Landlord user id of the actor (request.user.sub). */
  @Index()
  @Column({ type: 'uuid', nullable: true })
  userId: string;

  @Column({ nullable: true })
  userEmail: string;

  /** e.g. 'POST /invoices' */
  @Column()
  action: string;

  @Column()
  method: string;

  /** Top-level resource, e.g. 'invoices'. */
  @Index()
  @Column()
  resource: string;

  @Column({ nullable: true })
  resourceId: string;

  @Column({ type: 'int' })
  statusCode: number;

  /** Sanitized request body (password/token/secret fields stripped). */
  @Column({ type: 'jsonb', nullable: true })
  changes: Record<string, any>;

  @Column({ nullable: true })
  ip: string;
}
