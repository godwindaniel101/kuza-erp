import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * Storefront slug routing table — LANDLORD-scoped (lives in the landlord
 * database, shared across all tenants; registered on the 'landlord'
 * connection in landlord.module.ts, mirroring MenuSlugRoute).
 *
 * Maps a public store slug to the tenant that owns it, so the unauthenticated
 * GET /public/store/:slug endpoint can resolve the tenant schema without a JWT.
 * Rows are written on StorefrontSite create/slug-change/publish and deleted on
 * unpublish. The row is a routing hint, not the publish gate — the public read
 * re-verifies StorefrontSite.isPublished inside the tenant schema.
 */
@Entity('storefront_slug_routes')
export class StorefrontSlugRoute extends BaseEntity {
  @Column({ unique: true })
  slug: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId: string;

  /** PostgreSQL schema name of the owning tenant (from landlord tenants). */
  @Column()
  schemaName: string;
}
