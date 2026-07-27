import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * A tenant's Kuza Network wallet — LANDLORD-scoped (one row per tenant).
 * Balance can NEVER go negative: a "pay a supplier" transfer requires the payer
 * to already hold sufficient funds (funded via top-up). Enforced in
 * NetworkWalletService.transfer AND by a DB CHECK constraint
 * (`chk_network_wallets_balance_nonneg`) applied at boot in
 * NetworkWalletService.onModuleInit — so no code path or bug can drive a wallet
 * below zero, even outside the app.
 *
 * `balance` is a stored running total kept in step with WalletEntry rows inside
 * one transaction (see NetworkWalletService) so reads are cheap and consistent.
 */
@Entity('network_wallets')
export class NetworkWallet extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'uuid' })
  tenantId: string;

  @Column({ type: 'decimal', precision: 16, scale: 2, default: 0 })
  balance: number;

  @Column({ default: 'NGN' })
  currency: string;
}
