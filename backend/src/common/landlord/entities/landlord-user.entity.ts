import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../entities/base.entity';
import { Tenant } from './tenant.entity';

/**
 * User entity stored in the landlord database
 * Contains only authentication information needed to identify tenant
 */
@Entity('landlord_users')
export class LandlordUser extends BaseEntity {
  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @Column({ nullable: true, unique: true })
  googleId: string;

  @Column({ type: 'timestamp', nullable: true })
  emailVerified: Date;

  @Column({ default: true })
  isActive: boolean;

  /**
   * Platform super-admin flag — landlord-scoped. A super-admin can act across
   * ALL tenants via the /admin back-office (guarded server-side by
   * SuperAdminGuard). Default false; seeded to true only for the user whose
   * email matches process.env.SUPER_ADMIN_EMAIL (see SuperAdminSeeder). This
   * is the source of truth for the isSuperAdmin JWT claim.
   */
  @Column({ default: false })
  isSuperAdmin: boolean;

  @ManyToOne(() => Tenant, (tenant) => tenant.users)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;
}
