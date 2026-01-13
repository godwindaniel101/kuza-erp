import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { TenantEntity } from '../../../common/entities/base.entity';
import { Branch } from '../../../common/entities/branch.entity';
import { InventoryTransferItem } from './inventory-transfer-item.entity';

@Entity('inventory_transfers')
export class InventoryTransfer extends TenantEntity {
  @Column({ type: 'uuid' })
  fromBranchId: string;

  @Column({ type: 'uuid' })
  toBranchId: string;

  @Column({ unique: true })
  transferNumber: string;

  @Column({ type: 'date' })
  transferDate: Date;

  @Column({ default: 'pending' })
  status: 'pending' | 'in_transit' | 'received' | 'cancelled';

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'uuid' })
  initiatedBy: string;

  @Column({ type: 'uuid', nullable: true })
  receivedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  receivedAt: Date;

  @ManyToOne(() => Branch, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fromBranchId' })
  fromBranch: Branch;

  @ManyToOne(() => Branch, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'toBranchId' })
  toBranch: Branch;

  @OneToMany(() => InventoryTransferItem, (item) => item.transfer, { cascade: true })
  items: InventoryTransferItem[];
}

