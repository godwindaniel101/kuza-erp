import { Entity, Column } from 'typeorm';
import { TenantEntity } from '../../../common/entities/base.entity';

@Entity('customers')
export class Customer extends TenantEntity {
  @Column()
  name: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ nullable: true })
  taxId: string;

  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
  creditLimit: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string;

  /**
   * Kuza Network: when this customer is a materialized reference to another
   * tenant on the platform (via an accepted trade partnership), this holds
   * that tenant's landlord id. Null for ordinary, manually-created customers.
   */
  @Column({ type: 'uuid', nullable: true })
  linkedTenantId?: string;
}
