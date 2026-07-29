import { Entity, Column, Index } from 'typeorm';
import { TenantEntity } from '../../../common/entities/base.entity';

export type PaymentStatus = 'awaiting' | 'paid' | 'failed' | 'cancelled';

/**
 * A payment attempt against a sale. Created as `awaiting` when a cashier picks a
 * payment option; flipped to `paid` by the provider webhook (idempotent, keyed
 * on providerReference). Ties the payment to the order and the branch/business.
 */
@Entity('payment_transactions')
@Index(['branchId'])
@Index(['orderId'])
@Index(['status'])
// Postgres unique indexes treat NULLs as distinct, so many awaiting rows (null
// providerReference) coexist while each real provider reference stays unique —
// no fragile partial-index WHERE clause needed.
@Index(['providerReference'], { unique: true })
export class PaymentTransaction extends TenantEntity {
  @Column({ type: 'uuid' })
  branchId: string;

  @Column({ type: 'uuid', nullable: true })
  orderId: string;

  @Column({ type: 'uuid', nullable: true })
  paymentMethodId: string;

  @Column({ type: 'uuid', nullable: true })
  paymentAccountId: string;

  @Column({ default: 'monnify' })
  provider: string;

  /** Provider's transaction reference (Monnify transactionReference). Idempotency key. */
  @Column({ nullable: true })
  providerReference: string;

  /** Our unique reference for this payment attempt. */
  @Column()
  paymentReference: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  amount: number;

  @Column({ default: 'NGN' })
  currency: string;

  @Column({ default: 'awaiting' })
  status: PaymentStatus;

  @Column({ nullable: true })
  customerName: string;

  @Column({ nullable: true })
  customerPhone: string;

  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date;

  /** Raw provider payload for audit / reconciliation. */
  @Column({ type: 'jsonb', nullable: true })
  rawPayload: Record<string, any>;

  @Column({ type: 'uuid', nullable: true })
  createdBy: string;

  @Column({ nullable: true })
  createdByName: string;
}
