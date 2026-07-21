import { Entity, Column, Index } from 'typeorm';
import { TenantEntity } from '../../../common/entities/base.entity';

/**
 * A provider virtual/reserved account generated for a branch. Incoming transfers
 * to this account are matched back to the branch (→ business) via accountReference.
 */
@Entity('payment_accounts')
@Index(['branchId'])
@Index(['accountReference'])
export class PaymentAccount extends TenantEntity {
  @Column({ type: 'uuid' })
  paymentMethodId: string;

  @Column({ type: 'uuid' })
  branchId: string;

  @Column({ default: 'monnify' })
  provider: string;

  /** Our reference passed to the provider — how webhooks map back to the branch. */
  @Column()
  accountReference: string;

  /** Provider's reservation reference (Monnify reservationReference). */
  @Column({ nullable: true })
  reservationReference: string;

  @Column()
  accountNumber: string;

  @Column({ nullable: true })
  accountName: string;

  @Column({ nullable: true })
  bankName: string;

  @Column({ nullable: true })
  bankCode: string;

  @Column({ default: 'active' })
  status: string;
}
