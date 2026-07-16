import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

export type SubscriptionPaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

/**
 * A single plan-upgrade payment attempt — LANDLORD-scoped (lives in the
 * landlord/public database, like Plan and TenantSubscription).
 *
 * This is the idempotency ledger for the Paystack checkout money-path:
 *
 *  - `reference` is the idempotency key. It is generated once per checkout,
 *    sent to Paystack at transaction.initialize, and echoed back (inside the
 *    signed webhook body) on charge.success. A UNIQUE index guarantees a
 *    reference maps to exactly one attempt, and the row's `status` guarantees
 *    a verified charge.success is only ever ACTED ON once — a duplicate
 *    delivery (Paystack retries) finds status=SUCCESS and no-ops.
 *
 *  - The reference→{tenantId, planCode} mapping lives here (not derived from
 *    the payload) so the webhook, which has no tenant/JWT context, activates
 *    exactly the plan the tenant paid for. The stored `amount` lets the webhook
 *    reject an underpayment instead of trusting the provider blindly.
 */
@Entity('subscription_payments')
export class SubscriptionPayment extends BaseEntity {
  @Column({ type: 'uuid' })
  tenantId: string;

  @Column({ type: 'uuid' })
  planId: string;

  @Column()
  planCode: string;

  @Column({ default: 'paystack' })
  provider: string;

  /** Idempotency key — unique per checkout attempt. */
  @Index({ unique: true })
  @Column()
  reference: string;

  /** Expected amount in MAJOR currency units (e.g. naira, not kobo). */
  @Column({ type: 'decimal', precision: 14, scale: 2 })
  amount: number;

  @Column()
  currency: string;

  @Column({ type: 'varchar', default: 'PENDING' })
  status: SubscriptionPaymentStatus;

  /** Paystack checkout URL, returned to the client. */
  @Column({ type: 'text', nullable: true })
  authorizationUrl: string | null;

  /** Gateway-side reference confirmed on the successful webhook. */
  @Column({ nullable: true })
  providerRef: string | null;

  /** Set once the payment has been verified and the plan activated. */
  @Column({ type: 'timestamp', nullable: true })
  processedAt: Date | null;

  /** Populated when a webhook is rejected (bad amount, etc.). */
  @Column({ type: 'text', nullable: true })
  failureReason: string | null;
}
