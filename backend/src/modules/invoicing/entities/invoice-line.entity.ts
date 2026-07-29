import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { TenantEntity } from '../../../common/entities/base.entity';
import { Invoice } from './invoice.entity';

@Entity('invoice_lines')
export class InvoiceLine extends TenantEntity {
  @Column({ type: 'uuid' })
  invoiceId: string;

  @ManyToOne(() => Invoice, (invoice) => invoice.lines, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'invoice_id' })
  invoice: Invoice;

  /** Optional link to an inventory item (inventory_items.id). */
  @Column({ type: 'uuid', nullable: true })
  itemId: string;

  @Column()
  description: string;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  quantity: number;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  unitPrice: number;

  /** Tax rate as a percentage, e.g. 7.50 for 7.5%. */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  taxRate: number;

  /** Absolute discount amount applied to the line. */
  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  discount: number;

  /** quantity * unitPrice - discount (server-computed). */
  @Column({ type: 'decimal', precision: 14, scale: 2 })
  lineTotal: number;
}
