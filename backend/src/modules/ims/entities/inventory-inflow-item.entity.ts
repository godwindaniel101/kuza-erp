import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { InventoryInflow } from './inventory-inflow.entity';
import { InventoryItem } from './inventory-item.entity';
import { Uom } from './uom.entity';
import { Supplier } from '../../rms/entities/supplier.entity';
import { Branch } from '../../../common/entities/branch.entity';

@Entity('inventory_inflow_items')
export class InventoryInflowItem extends BaseEntity {
  @Column({ type: 'uuid', nullable: true })
  inflowId: string;

  @Column({ type: 'uuid', nullable: true })
  inventoryItemId: string;

  @Column({ type: 'uuid' })
  uomId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  baseQuantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unitCost: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalCost: number;

  @Column({ nullable: true })
  batchNumber: string;

  @Column({ type: 'date', nullable: true })
  expiryDate: Date;

  @Column({ type: 'uuid', nullable: true })
  supplierId: string;

  @Column({ type: 'uuid', nullable: true })
  branchId: string;

  @ManyToOne(() => InventoryInflow, (inflow) => inflow.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'inflowId' })
  inflow: InventoryInflow;

  @ManyToOne(() => InventoryItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'inventoryItemId' })
  inventoryItem: InventoryItem;

  @ManyToOne(() => Uom, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'uomId' })
  uom: Uom;

  @ManyToOne(() => Supplier, { nullable: true })
  @JoinColumn({ name: 'supplierId' })
  supplier: Supplier;

  @ManyToOne(() => Branch, { nullable: true })
  @JoinColumn({ name: 'branchId' })
  branch: Branch;
}