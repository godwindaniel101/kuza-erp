import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * Website slug routing table — LANDLORD-scoped (lives in the landlord database,
 * shared across all tenants; registered on the 'landlord' connection in
 * landlord.module.ts, mirroring StorefrontSlugRoute / MenuSlugRoute).
 *
 * Maps a public site slug to the tenant that owns it, so the unauthenticated
 * GET /public/site/:slug endpoint can resolve the tenant schema without a JWT.
 * Rows are written on WebsiteSite create/slug-change/publish and deleted on
 * unpublish. The row is a routing hint, not the publish gate — the public read
 * re-verifies WebsiteSite.isPublished inside the tenant schema.
 */
@Entity('website_slug_routes')
export class WebsiteSlugRoute extends BaseEntity {
  @Column({ unique: true })
  slug: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId: string;

  /** PostgreSQL schema name of the owning tenant (from landlord tenants). */
  @Column()
  schemaName: string;
}
