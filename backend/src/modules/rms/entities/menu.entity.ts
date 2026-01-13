import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { TenantEntity } from '../../../common/entities/base.entity';
import { Restaurant } from '../../../common/entities/restaurant.entity';
import { Branch } from '../../../common/entities/branch.entity';
import { MenuCategory } from './menu-category.entity';

@Entity('menus')
export class Menu extends TenantEntity {
  @Column()
  name: string;

  @Column()
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  qrCode: string;

  @Column({ type: 'jsonb', nullable: true })
  themeSettings: any;

  @Column({ type: 'uuid', nullable: true })
  branchId: string;

  @ManyToOne(() => Restaurant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'businessId' })
  restaurant: Restaurant;

  @ManyToOne(() => Branch, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'branchId' })
  branch: Branch;

  @OneToMany(() => MenuCategory, (category) => category.menu, { cascade: true })
  categories: MenuCategory[];
}

