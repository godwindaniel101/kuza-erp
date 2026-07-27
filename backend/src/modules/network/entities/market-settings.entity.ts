import { Entity, Column } from 'typeorm';
import { TenantEntity } from '../../../common/entities/base.entity';

export type AvailabilityMode = 'auto_in_stock' | 'manual';
export type VisibilityMode = 'public' | 'connections' | 'manual';
export type StockMode = 'show_cap' | 'hide_allow';

/**
 * Per-tenant marketplace listing rules — set ONCE here instead of per-item.
 *
 * TENANT-scoped (lives in the tenant's schema, registered on the DEFAULT
 * connection). Singleton: one row per tenant. The CatalogListingModal and the
 * catalog service read these modes to decide whether the per-item `available` /
 * `isPublic` controls are shown or derived from the config default.
 */
@Entity('market_settings')
export class MarketSettings extends TenantEntity {
  /**
   * How an item's marketplace availability is decided:
   *  - `auto_in_stock`: offered whenever the item has stock in any branch.
   *  - `manual`: the supplier toggles each item on themselves.
   */
  @Column({ type: 'varchar', default: 'auto_in_stock' })
  availabilityMode: AvailabilityMode;

  /**
   * Who can see the tenant's listings:
   *  - `public`: everyone.
   *  - `connections`: connected trade partners only.
   *  - `manual`: decided per item.
   */
  @Column({ type: 'varchar', default: 'public' })
  visibilityMode: VisibilityMode;

  /**
   * Stock visibility + overselling policy:
   *  - `show_cap`: buyers see the available quantity and cannot order more.
   *  - `hide_allow`: quantity hidden; buyers may over-order — availability is
   *    checked and stock debited when the supplier accepts the order.
   */
  @Column({ type: 'varchar', default: 'show_cap' })
  stockMode: StockMode;
}
