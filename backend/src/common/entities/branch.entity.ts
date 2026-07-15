import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { TenantEntity } from './base.entity';
import { Business } from './business.entity';

@Entity('branches')
export class Branch extends TenantEntity {
  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column({ default: false })
  isDefault: boolean;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'uuid', nullable: true })
  businessId: string;

  @ManyToOne(() => Business, (business) => business.branches, { nullable: true })
  @JoinColumn({ name: 'businessId' })
  business: Business;
}

