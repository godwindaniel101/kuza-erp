import { Entity, Column, Index } from 'typeorm';
import { TenantEntity } from '../../../common/entities/base.entity';

/**
 * A payment option a business has enabled for a branch, e.g. Bank Transfer via
 * Monnify. Selecting it in POS lets a cashier take payment through that channel.
 */
@Entity('payment_methods')
@Index(['branchId'])
export class PaymentMethod extends TenantEntity {
  @Column({ type: 'uuid' })
  branchId: string;

  /** Channel: bank_transfer | card | mobile_money. */
  @Column()
  type: string;

  /** Provider backing this channel, e.g. 'monnify'. */
  @Column({ default: 'monnify' })
  provider: string;

  /** Display label shown in POS (e.g. "Bank Transfer"). */
  @Column({ nullable: true })
  label: string;

  @Column({ default: 'active' })
  status: string;

  /** Channel-specific config (e.g. { preferredBanks: [...] }). */
  @Column({ type: 'jsonb', nullable: true })
  config: Record<string, any>;

  @Column({ type: 'uuid', nullable: true })
  createdBy: string;

  @Column({ nullable: true })
  createdByName: string;
}
