import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * Public-menu slug routing table — LANDLORD-scoped (lives in the landlord
 * database, shared across all tenants; registered on the 'landlord'
 * connection in landlord.module.ts, mirroring billing's Plan/
 * TenantSubscription pattern).
 *
 * Maps a public menu slug to the tenant that owns it, so the unauthenticated
 * GET /public/menu/:slug endpoint can resolve the tenant schema without a
 * JWT. Rows are written on MenuSite create/slug-change/publish and deleted
 * on unpublish. The row is a routing hint, not the publish gate — the public
 * read re-verifies MenuSite.isPublished inside the tenant schema.
 */
@Entity('menu_slug_routes')
export class MenuSlugRoute extends BaseEntity {
  @Column({ unique: true })
  slug: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId: string;

  /** PostgreSQL schema name of the owning tenant (from landlord tenants). */
  @Column()
  schemaName: string;
}
