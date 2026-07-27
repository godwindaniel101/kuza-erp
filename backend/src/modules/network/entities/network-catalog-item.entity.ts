import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * A supplier's published marketplace listing — LANDLORD-scoped (lives in the
 * landlord database alongside NetworkBusiness / TradePartnership, so buyers in
 * other tenants can browse it). One row per listed item.
 *
 * Visibility to a buyer: the buyer has an ACTIVE TradePartnership with this
 * supplier (private catalog), OR `isPublic` is true AND the supplier's
 * NetworkBusiness.publicCatalog is on (public marketplace). Enforced in
 * NetworkCatalogService.browse — this table is data, not the gate.
 */
@Entity('network_catalog_items')
@Index(['supplierTenantId'])
export class NetworkCatalogItem extends BaseEntity {
  @Column({ type: 'uuid' })
  supplierTenantId: string;

  @Column()
  supplierName: string;

  /** Optional link to the supplier's own inventory item (in their schema). */
  @Column({ type: 'uuid', nullable: true })
  sourceInventoryItemId: string | null;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', nullable: true })
  unit: string | null;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  price: number;

  @Column({ default: 'NGN' })
  currency: string;

  /** Minimum order quantity. */
  @Column({ type: 'decimal', precision: 14, scale: 2, default: 1 })
  moq: number;

  @Column({ default: true })
  available: boolean;

  /** Whether this item may appear in the PUBLIC marketplace (gated further by
   * the supplier's NetworkBusiness.publicCatalog flag). */
  @Column({ default: false })
  isPublic: boolean;

  @Column({ type: 'varchar', nullable: true })
  imageUrl: string | null;

  @Column({ default: 'active' })
  status: string;

  /**
   * Whether a buyer may propose a different price for this item (bargaining).
   * Config-only for now — the full offer/counter flow is not built yet.
   */
  @Column({ default: false })
  bargainAllowed: boolean;
}
