import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { TenantEntity } from '../../../common/entities/base.entity';
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

  /** Channel this sale came through: 'pos' (direct) | 'marketplace' (materialized from a network order). */
  @Column({ default: 'pos' })
  source: string;

  /** SALES bridge: the landlord network_orders id this sale was materialized from (null for POS/direct). */
  @Column({ type: 'uuid', nullable: true })
  networkOrderId: string | null;

  @Column({ type: 'uuid', nullable: true })
  userId: string;

  // Audit: who placed / last changed this order. Name is denormalized so the UI
  // shows a creator without resolving across the landlord/tenant user split.
  @Column({ type: 'uuid', nullable: true })
  createdBy: string;

  @Column({ nullable: true })
  createdByName: string;

  @Column({ type: 'uuid', nullable: true })
  updatedBy: string;

  @Column({ nullable: true })
  updatedByName: string;

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

