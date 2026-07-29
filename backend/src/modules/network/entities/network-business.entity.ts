import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * Kuza Network business directory entry — LANDLORD-scoped (lives in the
 * landlord database, shared across all tenants; registered on the 'landlord'
 * connection in landlord.module.ts, mirroring billing's Plan/
 * TenantSubscription and menu-sites' MenuSlugRoute pattern).
 *
 * One row per tenant that participates in the cross-tenant B2B network. It is
 * a public-facing profile (name/slug/logo/contact) used to power the network
 * directory search and to annotate trade partnerships. Rows are created
 * lazily (get-or-create) the first time a tenant touches the network. This is
 * contacts/partnerships only — no money moves through this table.
 */
@Entity('network_businesses')
export class NetworkBusiness extends BaseEntity {
  @Column({ type: 'uuid', unique: true })
  tenantId: string;

  @Column()
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ type: 'varchar', nullable: true })
  businessType: string | null;

  @Column({ nullable: true })
  logo: string;

  @Column({ type: 'varchar', nullable: true })
  country: string | null;

  @Column({ default: 'NGN' })
  currency: string;

  @Column({ type: 'varchar', nullable: true })
  contactEmail: string | null;

  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  @Column({ default: false })
  isSupplier: boolean;

  @Column({ default: false })
  publicCatalog: boolean;

  /**
   * Marketplace rules mirrored from the tenant's MarketSettings so the buyer-
   * facing browse can read them landlord-side without cross-schema lookups.
   * 'auto_in_stock' | 'manual'  and  'public' | 'connections' | 'manual'.
   */
  @Column({ default: 'auto_in_stock' })
  marketAvailabilityMode: string;

  @Column({ default: 'public' })
  marketVisibilityMode: string;

  /** 'show_cap' | 'hide_allow' — mirrored stock visibility/overselling policy. */
  @Column({ default: 'show_cap' })
  marketStockMode: string;

  /** active | suspended */
  @Column({ default: 'active' })
  status: string;
}
