import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { TenantEntity } from '../../../common/entities/base.entity';
import { Restaurant } from '../../../common/entities/restaurant.entity';
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

  @ManyToOne(() => Restaurant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'businessId' })
  restaurant: Restaurant;

  @OneToMany(() => InventoryBatch, (batch) => batch.supplier)
  batches: InventoryBatch[];
}

