import { Entity, Column, OneToMany } from 'typeorm';
import { TenantEntity } from '../../../common/entities/base.entity';
import { InventorySubcategory } from './inventory-subcategory.entity';

@Entity('inventory_categories')
export class InventoryCategory extends TenantEntity {
  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @OneToMany(() => InventorySubcategory, (subcategory) => subcategory.category, { cascade: true })
  subcategories: InventorySubcategory[];
}
