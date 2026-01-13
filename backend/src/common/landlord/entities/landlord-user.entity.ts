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

  @ManyToOne(() => Tenant, (tenant) => tenant.users)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;
}
