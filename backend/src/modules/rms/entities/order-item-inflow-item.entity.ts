import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { OrderItem } from './order-item.entity';
import { InventoryInflowItem } from '../../ims/entities/inventory-inflow-item.entity';

/**
 * Junction entity to track which inflow items were used for each order item
 * This allows us to:
 * - Track which specific inflow items (batches) were sold
 * - Display supplier breakdown in sales
 * - Support FIFO/LIFO/FEFO allocation methods properly
 * - Track exact cost per sale
 */
@Entity('order_item_inflow_items')
export class OrderItemInflowItem extends BaseEntity {
  @Column({ type: 'uuid' })
  orderItemId: string;

  @Column({ type: 'uuid' })
  inflowItemId: string;

  /**
   * Quantity from this inflow item that was used for the order
   * This is in base quantity units
   */
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  quantityUsed: number;

  /**
   * Cost per unit from this inflow item
   */
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  costPerUnit: number;

  /**
   * Total cost for the quantity used from this inflow item
   */
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalCost: number;

  @ManyToOne(() => OrderItem, (orderItem) => orderItem.inflowItems, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderItemId' })
  orderItem: OrderItem;

  @ManyToOne(() => InventoryInflowItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'inflowItemId' })
  inflowItem: InventoryInflowItem;
}
