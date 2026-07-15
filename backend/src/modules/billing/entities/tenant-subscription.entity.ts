import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Plan } from './plan.entity';

export type SubscriptionStatus =
  | 'TRIALING'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'CANCELED';

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
}
