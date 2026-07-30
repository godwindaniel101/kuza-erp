import { Entity, Column } from 'typeorm';
import { TenantEntity } from '../../../common/entities/base.entity';

/**
 * Kuza Storefront (shop vertical) — TENANT-scoped (one row per tenant for v1).
 * Holds the public storefront presentation settings (store info / template /
 * contact). The public URL is /s/:slug on the frontend, resolved to this tenant
 * via the landlord StorefrontSlugRoute table.
 *
 * Mirrors MenuSite exactly (RMS menu-site). The product list is NOT stored here
 * — it is derived live from the tenant's sellable, in-stock inventory items at
 * read time (see StorefrontService.buildPublicPayload), so stock and prices are
 * always current.
 */
@Entity('storefront_sites')
export class StorefrontSite extends TenantEntity {
  /** URL-safe public slug (globally unique via landlord storefront_slug_routes). */
  @Column({ unique: true })
  slug: string;

  @Column({ default: false })
  isPublished: boolean;

  @Column()
  storeName: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  logoUrl: string;

  @Column({ nullable: true })
  heroImageUrl: string;

  /** Optional accent color override (hex), e.g. '#C9A227'. */
  @Column({ nullable: true })
  accentColor: string;

  /** Layout archetype for the storefront (e.g. 'grid'). */
  @Column({ default: 'grid' })
  templateKey: string;

  @Column({ default: true })
  showPrices: boolean;

  @Column({ nullable: true })
  whatsapp: string;

  @Column({ nullable: true })
  instagram: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column({ default: 'NGN' })
  currency: string;
}
