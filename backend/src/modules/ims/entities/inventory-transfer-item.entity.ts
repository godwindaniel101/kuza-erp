import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { InventoryTransfer } from './inventory-transfer.entity';
import { InventoryItem } from './inventory-item.entity';
import { Uom } from './uom.entity';

@Entity('inventory_transfer_items')
export class InventoryTransferItem extends BaseEntity {
  @Column({ type: 'uuid' })
  transferId: string;

  @Column({ type: 'uuid' })
  inventoryItemId: string;

  @Column({ type: 'uuid' })
  uomId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  receivedQuantity: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @ManyToOne(() => InventoryTransfer, (transfer) => transfer.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'transferId' })
  transfer: InventoryTransfer;

  @ManyToOne(() => InventoryItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'inventoryItemId' })
  inventoryItem: InventoryItem;

  @ManyToOne(() => Uom, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'uomId' })
  uom: Uom;
}

