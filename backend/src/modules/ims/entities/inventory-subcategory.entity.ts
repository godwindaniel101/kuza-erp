import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { TenantEntity } from '../../../common/entities/base.entity';
import { InventoryCategory } from './inventory-category.entity';

@Entity('inventory_subcategories')
export class InventorySubcategory extends TenantEntity {
  @Column()
  name: string;

  @Column({ type: 'uuid' })
  categoryId: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @ManyToOne(() => InventoryCategory, (category) => category.subcategories, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'categoryId' })
  category: InventoryCategory;
}
