import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { TenantEntity } from '../../../common/entities/base.entity';
import { Supplier } from '../../rms/entities/supplier.entity';
import { Branch } from '../../../common/entities/branch.entity';
import { InventoryInflowItem } from './inventory-inflow-item.entity';

@Entity('inventory_inflows')
export class InventoryInflow extends TenantEntity {
  @Column({ type: 'uuid' })
  branchId: string;

  @Column({ type: 'uuid', nullable: true })
  supplierId: string;

  @Column({ nullable: true })
  invoiceNumber: string;

  @Column({ type: 'date' })
  receivedDate: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ nullable: true })
  currency: string;

  @Column({ default: 'pending' })
  status: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'uuid', nullable: true })
  receivedBy: string;

  @Column({ type: 'uuid', nullable: true })
  approvedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  batchId: string;

  @Column({ default: 'manual' })
  type: string;

  @ManyToOne(() => Branch, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'branchId' })
  branch: Branch;

  @ManyToOne(() => Supplier, { nullable: true })
  @JoinColumn({ name: 'supplierId' })
  supplier: Supplier;

  @OneToMany(() => InventoryInflowItem, (item) => item.inflow, { cascade: true })
  items: InventoryInflowItem[];
}

