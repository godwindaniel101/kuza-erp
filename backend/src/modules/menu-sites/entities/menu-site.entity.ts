import { Entity, Column } from 'typeorm';
import { TenantEntity } from '../../../common/entities/base.entity';

/**
 * Kuza Menu site — TENANT-scoped (one row per tenant for v1).
 * Holds the public-menu presentation settings (template/theme/venue info)
 * and which RMS menus are published. The public URL is /m/:slug on the
 * frontend, resolved to this tenant via the landlord MenuSlugRoute table.
 */
@Entity('menu_sites')
export class MenuSite extends TenantEntity {
  /** URL-safe public slug (globally unique via landlord menu_slug_routes). */
  @Column({ unique: true })
  slug: string;

  @Column({ default: false })
  isPublished: boolean;

  /** Layout archetype: elegant | minimal | noir | gallery | bistro | grand */
  @Column({ default: 'minimal' })
  templateKey: string;

  /** Curated theme within the archetype (e.g. 'midnight-gold'). */
  @Column({ default: 'cloud' })
  themeKey: string;

  /** Optional accent color override (hex), applied on top of the theme. */
  @Column({ nullable: true })
  accentColor: string;

  @Column()
  venueName: string;

  @Column({ nullable: true })
  tagline: string;

  @Column({ nullable: true })
  logoUrl: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  whatsapp: string;

  @Column({ nullable: true })
  instagram: string;

  @Column({ nullable: true })
  facebook: string;

  @Column({ nullable: true })
  tiktok: string;

  @Column({ nullable: true })
  twitter: string;

  /** Link the "Feedback" tile / action points at (review form, WhatsApp, etc.). */
  @Column({ nullable: true })
  feedbackUrl: string;

  @Column({ nullable: true })
  wifiName: string;

  @Column({ nullable: true })
  wifiPassword: string;

  @Column({ default: 'NGN' })
  currency: string;

  @Column({ default: true })
  showPrices: boolean;

  /**
   * Ordered array of RMS menu ids to publish. Null/empty = publish all
   * active menus.
   */
  @Column({ type: 'jsonb', nullable: true })
  menuIds: string[] | null;
}
