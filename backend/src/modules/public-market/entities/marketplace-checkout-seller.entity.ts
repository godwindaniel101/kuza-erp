import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

export type MarketplaceCheckoutSellerStatus = 'awaiting' | 'failed';

/**
 * One seller's slice of a marketplace checkout — LANDLORD-scoped (registered on
 * the 'landlord' connection). Each row records the outcome of creating a pending
 * order + an awaiting bank-transfer payment inside ONE seller tenant's schema.
 *
 * `status === 'awaiting'` rows carry the linkage back to the seller's schema
 * (schemaName + orderId) plus the virtual-account payment instructions, so:
 *   - the checkout response / idempotent replay can be rebuilt from here, and
 *   - the guest status endpoint can live-read `orders.status` in that schema.
 * `status === 'failed'` rows keep only `failReason` (no order/payment created).
 */
@Entity('marketplace_checkout_sellers')
@Index(['checkoutId'])
export class MarketplaceCheckoutSeller extends BaseEntity {
  @Column({ type: 'uuid' })
  checkoutId: string;

  /** Null only for a `failed` row whose slug matched no landlord route. */
  @Column({ type: 'uuid', nullable: true })
  sellerTenantId: string | null;

  /** The seller tenant's Postgres schema (where the order + payment were written). */
  @Column({ nullable: true })
  schemaName: string | null;

  @Column()
  storeName: string;

  @Column()
  storeSlug: string;

  @Column({ type: 'uuid', nullable: true })
  branchId: string | null;

  @Column({ type: 'uuid', nullable: true })
  orderId: string | null;

  @Column({ nullable: true })
  orderNumber: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  amount: number;

  @Column({ default: 'NGN' })
  currency: string;

  @Column({ nullable: true })
  paymentReference: string | null;

  @Column({ nullable: true })
  accountNumber: string | null;

  @Column({ nullable: true })
  bankName: string | null;

  @Column({ nullable: true })
  accountName: string | null;

  @Column({ default: 'awaiting' })
  status: MarketplaceCheckoutSellerStatus;

  @Column({ nullable: true })
  failReason: string | null;
}
