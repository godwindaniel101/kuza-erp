import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * Platform-wide à-la-carte pricing configuration — LANDLORD-scoped (lives in
 * the landlord/public database, shared across all tenants). Registered on the
 * 'landlord' connection.
 *
 * There is exactly ONE row (unique `key` = 'global'): pricing is platform-wide,
 * not per-tenant. It is seeded from the code defaults in pricing.ts on first
 * use (BillingService.ensurePricingSeeded) and edited by the super-admin
 * back-office. The pricing engine (computeQuote/pricingConfig) still falls back
 * to the code defaults if this row is somehow absent, so nothing breaks when
 * unseeded.
 */
@Entity('pricing_configs')
export class PricingConfig extends BaseEntity {
  /** Stable singleton key — always 'global'. Enforces a single config row. */
  @Column({ unique: true, default: 'global' })
  key: string;

  /**
   * Monthly price per app, per currency:
   *   { items: { NGN: 15000, USD: 10, ... }, ai: { NGN: 0, ... }, ... }
   * Assists (ai, market) are always 0 across every currency.
   */
  @Column({ type: 'jsonb' })
  appPrices: Record<string, Record<string, number>>;

  /**
   * Monthly price per usage add-on unit, per currency:
   *   { branch: { NGN: 9000, ... }, user: { NGN: 3000, ... } }
   */
  @Column({ type: 'jsonb' })
  usagePrices: { branch: Record<string, number>; user: Record<string, number> };

  /** Branches included before per-branch usage add-ons apply. */
  @Column({ type: 'int', default: 1 })
  includedBranches: number;

  /** Users included before per-user usage add-ons apply. */
  @Column({ type: 'int', default: 3 })
  includedUsers: number;
}
