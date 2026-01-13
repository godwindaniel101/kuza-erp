import { Entity, Column, OneToMany } from 'typeorm';
import { TenantEntity } from '../../../common/entities/base.entity';
import { InventoryItem } from './inventory-item.entity';

@Entity('uoms')
export class Uom extends TenantEntity {
  @Column()
  name: string;

  @Column({ nullable: true })
  abbreviation: string;

  @Column({ default: false })
  isDefault: boolean;

  @OneToMany(() => InventoryItem, (item) => item.baseUom)
  inventoryItems: InventoryItem[];
}

