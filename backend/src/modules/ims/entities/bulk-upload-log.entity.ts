import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { InventoryInflow } from './inventory-inflow.entity';

@Entity('bulk_upload_logs')
export class BulkUploadLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'business_id', type: 'uuid' })
  businessId: string;

  @Column({ name: 'upload_type', type: 'varchar', length: 50 })
  uploadType: string; // 'inflow', 'inventory', etc.

  @Column({ name: 'inflow_id', type: 'uuid', nullable: true })
  inflowId?: string;

  @ManyToOne(() => InventoryInflow, { nullable: true })
  @JoinColumn({ name: 'inflow_id' })
  inflow?: InventoryInflow;

  @Column({ name: 'line_number', type: 'integer' })
  lineNumber: number;

  @Column({ name: 'row_data', type: 'json' })
  rowData: Record<string, any>;

  @Column({ name: 'error_messages', type: 'json' })
  errorMessages: string[];

  @Column({ 
    name: 'status', 
    type: 'enum', 
    enum: ['failed', 'skipped', 'duplicate'],
    default: 'failed'
  })
  status: 'failed' | 'skipped' | 'duplicate';

  @Column({ name: 'upload_session_id', type: 'varchar', length: 255, nullable: true })
  uploadSessionId?: string; // Group related uploads

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
