import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { TenantEntity } from '../../../common/entities/base.entity';
import { InventoryItem } from './inventory-item.entity';

/**
 * One line of an item's "make-up" (bill of materials): the parent item is
 * assembled from `quantity` (in `uomId`) of the component item. Selling a parent
 * that has components depletes each component's own stock instead of the parent.
 * v1 rule: components are raw (non-composed) items — no nested make-up.
 */
@Entity('inventory_item_components')
@Index(['parentItemId'])
export class InventoryItemComponent extends TenantEntity {
  @Column({ type: 'uuid' })
  parentItemId: string;

  /** The raw item consumed for this make-up line. */
  @Column({ type: 'uuid' })
  componentItemId: string;

  /** How much of the component one parent uses (in `uomId`, or the component's base UoM). */
  @Column({ type: 'decimal', precision: 12, scale: 4, default: 1 })
  quantity: number;

  /** Unit the quantity is expressed in; null = the component item's base UoM. */
  @Column({ type: 'uuid', nullable: true })
  uomId: string | null;

  @ManyToOne(() => InventoryItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parentItemId' })
  parentItem: InventoryItem;
}
