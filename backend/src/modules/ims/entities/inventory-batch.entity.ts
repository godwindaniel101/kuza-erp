import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { TenantEntity } from '../../../common/entities/base.entity';
import { InventoryItem } from './inventory-item.entity';
import { Supplier } from '../../rms/entities/supplier.entity';
import { Uom } from './uom.entity';

@Entity('inventory_batches')
export class InventoryBatch extends TenantEntity {
  @Column({ type: 'uuid' })
  inventoryItemId: string;

  @Column({ type: 'uuid', nullable: true })
  supplierId: string;

  @Column({ type: 'uuid' })
  inputUomId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  remainingQuantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  costPerUnit: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  inputQuantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  inputCostPerUnit: number;

  @Column({ type: 'timestamp' })
  receivedAt: Date;

  @Column()
  batchNumber: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @ManyToOne(() => InventoryItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'inventoryItemId' })
  inventoryItem: InventoryItem;

  @ManyToOne(() => Supplier, { nullable: true })
  @JoinColumn({ name: 'supplierId' })
  supplier: Supplier;

  @ManyToOne(() => Uom, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'inputUomId' })
  inputUom: Uom;
}

