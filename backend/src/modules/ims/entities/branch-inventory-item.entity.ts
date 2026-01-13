import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Branch } from '../../../common/entities/branch.entity';
import { InventoryItem } from './inventory-item.entity';

@Entity('branch_inventory_items')
@Index(['branchId', 'inventoryItemId'], { unique: true })
export class BranchInventoryItem extends BaseEntity {
  @Column({ type: 'uuid' })
  branchId: string;

  @Column({ type: 'uuid' })
  inventoryItemId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  currentStock: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  salePrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  minimumStock: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  maximumStock: number;

  @ManyToOne(() => Branch, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'branchId' })
  branch: Branch;

  @ManyToOne(() => InventoryItem, (item) => item.branches, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'inventoryItemId' })
  inventoryItem: InventoryItem;
}

