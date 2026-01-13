import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { TenantEntity } from './base.entity';
import { Restaurant } from './restaurant.entity';

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

  @ManyToOne(() => Restaurant, (restaurant) => restaurant.branches, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'businessId' })
  restaurant: Restaurant;
}

