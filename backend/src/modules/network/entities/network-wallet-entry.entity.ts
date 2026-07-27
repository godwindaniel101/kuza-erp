import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * Append-only ledger line for a Kuza Network wallet — LANDLORD-scoped. One row
 * per side of every movement (an internal transfer writes two: a debit on the
 * payer, a credit on the payee). `balanceAfter` snapshots the wallet balance
 * once the row is applied. `reference` carries the idempotency/source key
 * (e.g. `order:<uuid>`) so a retried payment never double-posts.
 */
@Entity('network_wallet_entries')
@Index(['tenantId'])
@Index(['reference'])
export class NetworkWalletEntry extends BaseEntity {
  @Column({ type: 'uuid' })
  tenantId: string;

  /** 'credit' (money in / owed to you) | 'debit' (money out / you owe). */
  @Column()
  direction: string;

  @Column({ type: 'decimal', precision: 16, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 16, scale: 2 })
  balanceAfter: number;

  /** 'transfer' | 'topup' | 'withdrawal' | 'adjustment' */
  @Column({ default: 'transfer' })
  type: string;

  @Column({ type: 'uuid', nullable: true })
  counterpartyTenantId: string | null;

  @Column({ type: 'varchar', nullable: true })
  counterpartyName: string | null;

  /** Source/idempotency key, e.g. `order:<uuid>`. */
  @Column({ type: 'varchar', nullable: true })
  reference: string | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;
}
