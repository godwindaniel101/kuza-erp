import { Entity, Column } from 'typeorm';
import { TenantEntity } from '../../../common/entities/base.entity';

/**
 * Kuza Website (website common app) — TENANT-scoped (one row per tenant for v1).
 * Holds a simple marketing website's presentation settings (brand, hero, about,
 * contact) for a business. The public URL is /site/:slug on the frontend,
 * resolved to this tenant via the landlord WebsiteSlugRoute table.
 *
 * Mirrors StorefrontSite. Unlike the storefront it does NOT list products — it
 * is a brand front that links out to the tenant's Storefront (storefrontUrl).
 * The `sections` jsonb column is reserved for the Phase-2 section editor.
 */
@Entity('website_sites')
export class WebsiteSite extends TenantEntity {
  /** URL-safe public slug (globally unique via landlord website_slug_routes). */
  @Column({ unique: true })
  slug: string;

  @Column({ default: false })
  isPublished: boolean;

  @Column()
  businessName: string;

  @Column({ nullable: true })
  tagline: string;

  @Column({ type: 'text', nullable: true })
  about: string;

  @Column({ nullable: true })
  logoUrl: string;

  @Column({ nullable: true })
  heroImageUrl: string;

  @Column({ nullable: true })
  heroHeadline: string;

  @Column({ nullable: true })
  heroSubtext: string;

  /** Optional accent color override (hex), e.g. '#C9A227'. */
  @Column({ nullable: true })
  accentColor: string;

  /** Layout archetype for the site (e.g. 'classic'). */
  @Column({ default: 'classic' })
  templateKey: string;

  /** Reserved for the Phase-2 section/block editor (ordered, typed content). */
  @Column({ type: 'jsonb', nullable: true })
  sections: unknown;

  @Column({ nullable: true })
  whatsapp: string;

  @Column({ nullable: true })
  instagram: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  address: string;

  /** The tenant's Storefront public URL — the "Shop now" CTA target. */
  @Column({ nullable: true })
  storefrontUrl: string;

  @Column({ default: 'NGN' })
  currency: string;
}
