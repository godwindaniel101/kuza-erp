import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../entities/base.entity';
import { Tenant } from './tenant.entity';

/**
 * User entity stored in the landlord database
 * Contains only authentication information needed to identify tenant
 */
@Entity('landlord_users')
export class LandlordUser extends BaseEntity {
  // Nullable: a freshly signed-up account has no display name yet (collected at
  // onboarding). Placeholder = email local-part until then.
  @Column({ nullable: true })
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  // Nullable: an account can exist (signed up + email-verified) BEFORE it has a
  // business. The tenant is provisioned at first-run onboarding, which sets this.
  @Column({ type: 'uuid', nullable: true })
  tenantId: string | null;

  @Column({ nullable: true, unique: true })
  googleId: string;

  @Column({ type: 'timestamp', nullable: true })
  emailVerified: Date;

  @Column({ default: true })
  isActive: boolean;

  /**
   * Platform super-admin flag — landlord-scoped. A super-admin can act across
   * ALL tenants via the /admin back-office (guarded server-side by
   * SuperAdminGuard). Default false; seeded to true only for the user whose
   * email matches process.env.SUPER_ADMIN_EMAIL (see SuperAdminSeeder). This
   * is the source of truth for the isSuperAdmin JWT claim.
   */
  @Column({ default: false })
  isSuperAdmin: boolean;

  /**
   * Programmatic API access (used by the Kuza MCP server) — a stable, revocable
   * per-user credential. We store ONLY the SHA-256 hash of the plaintext token;
   * the plaintext (prefixed `kuza_`) is shown to the user exactly once, at issue
   * time, and never persisted. One active token per user — rotating overwrites
   * the hash, revoking nulls these columns.
   *
   * The token itself carries no privilege: it is only exchanged (POST
   * /auth/api-token/exchange, @Public) for a normal, short-lived, tenant-scoped
   * JWT, so per-tenant isolation and the global guard chain are unchanged.
   */
  @Column({ type: 'varchar', nullable: true, unique: true })
  apiTokenHash: string | null;

  @Column({ type: 'varchar', nullable: true })
  apiTokenLabel: string | null;

  @Column({ type: 'timestamp', nullable: true })
  apiTokenCreatedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  apiTokenLastUsedAt: Date | null;

  @ManyToOne(() => Tenant, (tenant) => tenant.users)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;
}
