import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

export type PlanCode = 'FREE' | 'STARTER' | 'GROWTH' | 'ENTERPRISE';

export interface PlanLimits {
  /** -1 means unlimited */
  maxUsers: number;
  maxBranches: number;
  maxItems: number;
  modules: string[];
}

/**
 * SaaS plan — LANDLORD-scoped (lives in the landlord/public database,
 * shared across all tenants). Registered on the 'landlord' connection.
 */
@Entity('plans')
export class Plan extends BaseEntity {
  @Column({ unique: true })
  code: PlanCode;

  @Column()
  name: string;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  monthlyPriceUsd: number;

  /**
   * Fixed monthly price per billing currency (local-first pricing — these
   * are deliberate local price points, not spot-FX conversions), e.g.
   * { NGN: 45000, GHS: 450, KES: 4500, USD: 29, GBP: 25, EUR: 27, XOF: 18000 }.
   * A tenant's price = prices[business.currency] ?? monthlyPriceUsd (USD).
   */
  @Column({ type: 'jsonb', nullable: true })
  prices: Record<string, number> | null;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb' })
  limits: PlanLimits;

  @Column({ default: true })
  isActive: boolean;
}
