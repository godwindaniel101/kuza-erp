import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { MenuCategory } from './menu-category.entity';

@Entity('menu_items')
export class MenuItem extends BaseEntity {
  @Column({ type: 'uuid' })
  menuId: string;

  @Column({ type: 'uuid', nullable: true })
  categoryId: string;

  @Column({ type: 'uuid', nullable: true })
  inventoryItemId: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ nullable: true })
  image: string;

  @Column({ default: true })
  isAvailable: boolean;

  @Column({ default: 0 })
  sortOrder: number;

  @ManyToOne(() => MenuCategory, (category) => category.items, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'categoryId' })
  category: MenuCategory;
}

