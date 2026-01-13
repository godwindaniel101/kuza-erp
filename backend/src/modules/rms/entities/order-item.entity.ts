import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Order } from './order.entity';
import { InventoryItem } from '../../ims/entities/inventory-item.entity';
import { Uom } from '../../ims/entities/uom.entity';
import { OrderItemInflowItem } from './order-item-inflow-item.entity';

@Entity('order_items')
export class OrderItem extends BaseEntity {
  @Column({ type: 'uuid' })
  orderId: string;

  @Column({ type: 'uuid' })
  inventoryItemId: string;

  @Column()
  name: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  quantityBase: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  costPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  costTotal: number;

  @Column({ type: 'uuid', nullable: true })
  uomId: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @ManyToOne(() => InventoryItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'inventoryItemId' })
  inventoryItem: InventoryItem;

  @ManyToOne(() => Uom, { nullable: true })
  @JoinColumn({ name: 'uomId' })
  uom: Uom;

  @OneToMany(() => OrderItemInflowItem, (inflowItem) => inflowItem.orderItem, { cascade: true })
  inflowItems: OrderItemInflowItem[];
}

