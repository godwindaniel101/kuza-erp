import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

export type MarketplaceCheckoutStatus =
  | 'creating'
  | 'awaiting_payment'
  | 'failed';

/**
 * A single guest marketplace checkout — LANDLORD-scoped (lives in the landlord
 * database, registered on the 'landlord' connection in landlord.module.ts,
 * mirroring StorefrontSlugRoute).
 *
 * One guest cart that spans multiple seller tenants produces exactly ONE row
 * here plus one child MarketplaceCheckoutSeller per seller. Storing the split
 * landlord-side lets the unauthenticated status endpoint live-read each seller's
 * order status from its own schema without any cross-schema sync.
 *
 * Idempotency: `idempotencyKey` is UNIQUE. A retry with the same key must return
 * the already-created result and never re-create orders/payments — the unique
 * constraint is the concurrency guard (only one writer wins the INSERT).
 */
@Entity('marketplace_checkouts')
export class MarketplaceCheckout extends BaseEntity {
  /** Client-supplied idempotency key — the no-double-charge guard. */
  @Index({ unique: true })
  @Column({ unique: true })
  idempotencyKey: string;

  /** Human-friendly public reference, e.g. `MKT-XXXX`. */
  @Column({ unique: true })
  reference: string;

  @Column()
  buyerName: string;

  @Column()
  buyerPhone: string;

  @Column({ nullable: true })
  buyerEmail: string | null;

  /** creating -> awaiting_payment (>=1 seller ok) | failed (0 sellers ok). */
  @Column({ default: 'creating' })
  status: MarketplaceCheckoutStatus;
}
