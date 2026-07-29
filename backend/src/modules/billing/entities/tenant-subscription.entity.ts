import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Plan } from './plan.entity';

export type SubscriptionStatus =
  | 'TRIALING'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'CANCELED'
  // Free trial elapsed with no paid subscription — the tenant is READ-ONLY
  // (writes blocked by TrialLockGuard) until they pay. There is no permanent
  // free tier; free = the trial window only (founder direction).
  | 'EXPIRED';

/**
 * A tenant's subscription to a plan — LANDLORD-scoped (lives in the
 * landlord/public database). Registered on the 'landlord' connection.
 *
 * paymentProvider / paymentProviderRef are provider-agnostic stubs so a
 * Stripe/Paystack integration can be attached later without a schema change.
 */
@Entity('tenant_subscriptions')
export class TenantSubscription extends BaseEntity {
  @Column({ type: 'uuid', unique: true })
  tenantId: string;

  @Column({ type: 'uuid' })
  planId: string;

  @ManyToOne(() => Plan, { eager: true })
  @JoinColumn({ name: 'plan_id' })
  plan: Plan;

  @Column({ type: 'varchar', default: 'TRIALING' })
  status: SubscriptionStatus;

  @Column({ type: 'timestamp', nullable: true })
  trialEndsAt: Date;

  @Column({ type: 'timestamp' })
  currentPeriodStart: Date;

  @Column({ type: 'timestamp' })
  currentPeriodEnd: Date;

  @Column({ nullable: true })
  paymentProvider: string;

  @Column({ nullable: true })
  paymentProviderRef: string;

  // ---- À-la-carte selection (the new pricing model) ------------------------
  // Populated when a tenant subscribes to a computed app+usage bundle rather
  // than a fixed tier. The selection is the source of truth for what they pay
  // for; planId is left pointing at the trial plan for legacy compatibility.

  /** Canonical app keys the tenant pays for (their vertical + commons). */
  @Column({ type: 'jsonb', nullable: true })
  selectedApps: string[] | null;

  /** Purchased branch allowance. */
  @Column({ type: 'int', nullable: true })
  branches: number | null;

  /** Purchased user/seat allowance. */
  @Column({ type: 'int', nullable: true })
  users: number | null;

  /** Computed monthly total, in MAJOR currency units. */
  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
  amountMajor: number | null;

  /** Billing currency for amountMajor. */
  @Column({ type: 'varchar', nullable: true })
  currency: string | null;
}
