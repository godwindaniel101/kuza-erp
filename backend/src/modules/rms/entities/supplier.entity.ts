import { Entity, Column, OneToMany } from 'typeorm';
import { TenantEntity } from '../../../common/entities/base.entity';
import { InventoryBatch } from '../../ims/entities/inventory-batch.entity';

@Entity('suppliers')
export class Supplier extends TenantEntity {
  @Column()
  name: string;

  @Column({ nullable: true })
  contactPerson: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  // In multi-tenant database setup, business relation is not needed
  // Each database belongs to a specific tenant/business

  /**
   * Kuza Network: when this supplier is a materialized reference to another
   * tenant on the platform (via a trade partnership), this holds that
   * tenant's landlord id. Null for ordinary, manually-created suppliers.
   */
  @Column({ type: 'uuid', nullable: true })
  linkedTenantId?: string;

  @OneToMany(() => InventoryBatch, (batch) => batch.supplier)
  batches: InventoryBatch[];
}

