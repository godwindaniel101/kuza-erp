import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { TenantEntity } from '../../../common/entities/base.entity';
import { Restaurant } from '../../../common/entities/restaurant.entity';
import { Branch } from '../../../common/entities/branch.entity';
import { Table } from './table.entity';
import { OrderItem } from './order-item.entity';
import { OrderPayment } from './order-payment.entity';

@Entity('orders')
export class Order extends TenantEntity {
  @Column({ type: 'uuid' })
  branchId: string;

  @Column({ type: 'uuid', nullable: true })
  tableId: string;

  @Column({ unique: true })
  orderNumber: string;

  @Column({ default: 'pending' })
  status: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  tax: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalCost: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  profit: number;

  @Column({ default: 'FIFO' })
  allocationMethod: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ nullable: true })
  customerName: string;

  @Column({ nullable: true })
  customerPhone: string;

  @Column({ default: 'dine_in' })
  orderType: string;

  @Column({ type: 'uuid', nullable: true })
  userId: string;

  @ManyToOne(() => Restaurant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'businessId' })
  restaurant: Restaurant;

  @ManyToOne(() => Branch, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'branchId' })
  branch: Branch;

  @ManyToOne(() => Table, { nullable: true })
  @JoinColumn({ name: 'tableId' })
  table: Table;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];

  @OneToMany(() => OrderPayment, (payment) => payment.order, { cascade: true })
  payments: OrderPayment[];
}

