import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { TenantEntity } from '../../../common/entities/base.entity';
import { Invoice } from './invoice.entity';

export type InvoicePaymentMethod =
  | 'CASH'
  | 'BANK_TRANSFER'
  | 'CARD'
  | 'MOBILE_MONEY'
  | 'OTHER';

export const INVOICE_PAYMENT_METHODS: InvoicePaymentMethod[] = [
  'CASH',
  'BANK_TRANSFER',
  'CARD',
  'MOBILE_MONEY',
  'OTHER',
];

@Entity('invoice_payments')
export class InvoicePayment extends TenantEntity {
  @Column({ type: 'uuid' })
  invoiceId: string;

  @ManyToOne(() => Invoice, (invoice) => invoice.payments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'invoice_id' })
  invoice: Invoice;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  amount: number;

  @Column({ type: 'varchar' })
  method: InvoicePaymentMethod;

  @Column({ nullable: true })
  reference: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'uuid', nullable: true })
  recordedById: string;
}
